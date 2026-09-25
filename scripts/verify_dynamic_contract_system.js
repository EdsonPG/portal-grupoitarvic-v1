/**
 * Comprehensive Integration Verification:
 * Dynamic Contract Generator, SOW, Consultant Convenios, and Multi-Role Signing Workflow
 */
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'arvic_jwt_secret_dev_2026';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf-8'),
          raw: buffer
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- TEST DE INTEGRACIÓN: GENERADOR DINÁMICO Y FLUJO DE FIRMAS ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Conectado a MongoDB');

  const User = require('../api/models/User');
  const adminUser = await User.findOne({ role: 'admin' }) || { userId: 'USR0001', role: 'admin', name: 'Admin Arvic' };
  const consultorUser = await User.findOne({ userId: 'USR6095' }) || await User.findOne({ role: 'consultor' });

  const adminToken = jwt.sign({ userId: adminUser.userId, role: 'admin', name: adminUser.name }, JWT_SECRET, { expiresIn: '1h' });
  const consultorToken = jwt.sign({ userId: consultorUser.userId, role: 'consultor', name: consultorUser.name }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Endpoint: Generar SOW Cliente (.doc)
  console.log('\n[1] Probando GET /api/expedientes/proyecto/TEST_PRJ001/generar-contrato?tipo=cliente...');
  const resSow = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/expedientes/proyecto/TEST_PRJ001/generar-contrato?tipo=cliente',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (resSow.statusCode !== 200) {
    throw new Error(`Error en SOW Cliente: HTTP ${resSow.statusCode} - ${resSow.body}`);
  }
  if (!resSow.headers['content-type'].includes('msword')) {
    throw new Error('El Content-Type del SOW no es application/msword');
  }
  if (!resSow.body.includes('Tech Solutions') && !resSow.body.includes('Migración SAP')) {
    throw new Error('El cuerpo del SOW no contiene los datos del proyecto');
  }
  console.log(' SOW Cliente (.doc) generado con éxito y cabeceras msword válidas.');

  // 2. Endpoint: Generar Convenio Consultor (.doc)
  console.log(`\n[2] Probando GET /api/expedientes/proyecto/TEST_PRJ001/generar-contrato?tipo=consultor&consultorId=${consultorUser.userId}...`);
  const resConv = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/expedientes/proyecto/TEST_PRJ001/generar-contrato?tipo=consultor&consultorId=${consultorUser.userId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (resConv.statusCode !== 200) {
    throw new Error(`Error en Convenio Consultor: HTTP ${resConv.statusCode} - ${resConv.body}`);
  }
  if (!resConv.body.includes(consultorUser.name)) {
    throw new Error(`El convenio generado no incluye el nombre del consultor: ${consultorUser.name}`);
  }
  console.log(` Convenio de Asignación (.doc) generado con éxito para ${consultorUser.name}.`);

  // 3. Endpoint: Consulta de Firmas del Proyecto
  console.log('\n[3] Probando GET /api/expedientes/proyecto/TEST_PRJ001/firmas...');
  const resFirmas = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/expedientes/proyecto/TEST_PRJ001/firmas',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (resFirmas.statusCode !== 200) {
    throw new Error(`Error en firmas del proyecto: HTTP ${resFirmas.statusCode}`);
  }
  const jsonFirmas = JSON.parse(resFirmas.body);
  if (!jsonFirmas.success || !Array.isArray(jsonFirmas.data.consultores)) {
    throw new Error('La respuesta de firmas no tiene la estructura esperada');
  }
  console.log(` Estado de firmas obtenido: ${jsonFirmas.data.consultores.length} consultor(es) asignados.`);

  // 4. Endpoint: Mis Contratos del Consultor
  console.log(`\n[4] Probando GET /api/expedientes/mis-contratos con token de consultor...`);
  const resMisContratos = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/expedientes/mis-contratos',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${consultorToken}` }
  });

  if (resMisContratos.statusCode !== 200) {
    throw new Error(`Error en mis-contratos: HTTP ${resMisContratos.statusCode}`);
  }
  const jsonMisContratos = JSON.parse(resMisContratos.body);
  if (!jsonMisContratos.success || !jsonMisContratos.data.contratoMarco) {
    throw new Error('Estructura de mis-contratos inválida');
  }
  console.log(` Mis Contratos consultado con éxito (${jsonMisContratos.data.proyectos.length} proyectos asignados).`);

  // 5. Endpoint: Subir Documento Firmado (POST /api/expedientes/firmar)
  console.log(`\n[5] Probando POST /api/expedientes/firmar (subida de convenio firmado)...`);
  const resUploadFirmado = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/expedientes/firmar',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consultorToken}`
    }
  }, {
    entityType: 'proyecto',
    targetId: 'TEST_PRJ001',
    documentType: 'convenio_asignacion_proyecto',
    documentTitle: 'Convenio Firmado Roberto Test.pdf',
    fileName: 'Convenio_Firmado_Roberto_Test.pdf',
    fileData: Buffer.from('PDF FIRMADO DIGITALMENTE POR CONSULTOR').toString('base64'),
    fileSize: 38,
    mimeType: 'application/pdf'
  });

  if (resUploadFirmado.statusCode !== 201) {
    throw new Error(`Error al subir firmado: HTTP ${resUploadFirmado.statusCode} - ${resUploadFirmado.body}`);
  }
  const jsonUpload = JSON.parse(resUploadFirmado.body);
  if (!jsonUpload.success || jsonUpload.data.signatureStatus !== 'firmado') {
    throw new Error('El estado de firma no quedó registrado como firmado');
  }
  console.log(' Convenio firmado registrado con éxito en Expediente con signatureStatus=firmado.');

  // Limpiar documento de prueba creado
  const Expediente = require('../api/models/Expediente');
  await Expediente.deleteOne({ docId: jsonUpload.data.docId });
  console.log(' Documento firmado de prueba limpiado correctamente.');

  console.log('\n======================================================');
  console.log(' TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE (5/5)');
  console.log('======================================================');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Error en ejecución de pruebas:', err);
  process.exit(1);
});
