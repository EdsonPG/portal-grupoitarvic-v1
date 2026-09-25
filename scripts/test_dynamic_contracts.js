/**
 * Automated Verification Script: Dynamic Contract & Signing System
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function runTests() {
  console.log('--- INICIANDO VERIFICACIÓN DEL SISTEMA DE CONTRATOS DINÁMICOS ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Conectado a MongoDB');

  const { generateContractDoc } = require('../api/utils/contractGenerator');
  const Project = require('../api/models/Project');
  const Company = require('../api/models/Company');
  const ProjectAssignment = require('../api/models/ProjectAssignment');
  const User = require('../api/models/User');
  const Expediente = require('../api/models/Expediente');

  // Test 1: Generación de SOW Cliente
  console.log('\n[Test 1] Generación de SOW de Proyecto para Cliente...');
  const testProject = await Project.findOne({ projectId: 'TEST_PRJ001' });
  const testCompany = await Company.findOne({ companyId: 'EMP_TEST_CLIENTE' });

  if (!testProject || !testCompany) {
    throw new Error('No se encontró el proyecto o cliente de prueba TEST_PRJ001 / EMP_TEST_CLIENTE');
  }

  const sowDoc = generateContractDoc('sow_cliente_proyecto', {
    idProyecto: testProject.projectId,
    nombreProyecto: testProject.name,
    empresaCliente: testCompany.name,
    rfcEmpresa: testCompany.rfc || 'XAXX010101000',
    contactoCliente: testCompany.contactName || 'Mariana Torres',
    emailCliente: testCompany.contactEmail || 'mariana.torres@techsolutions.com',
    horasTotales: testProject.maxHours || 120,
    tarifaHora: 850
  });

  if (!sowDoc.includes(testProject.name) || !sowDoc.includes(testCompany.name) || !sowDoc.includes('120 horas')) {
    throw new Error('El SOW generado no contiene las variables esperadas');
  }
  console.log(' SOW Cliente generado exitosamente con datos dinámicos.');

  // Test 2: Generación de Convenio Individual de Consultor
  console.log('\n[Test 2] Generación de Convenio Individual de Consultor...');
  let testUser = await User.findOne({ userId: 'USR6095' });
  if (!testUser) {
    testUser = { userId: 'USR_TEST', name: 'Consultor Especialista Test', email: 'consultor@test.com', rfc: 'CONS010101XXX' };
  }

  // Asegurar que exista una asignación con este consultor
  let testAsig = await ProjectAssignment.findOne({ projectId: 'TEST_PRJ001', consultorId: testUser.userId });
  if (!testAsig) {
    testAsig = await ProjectAssignment.create({
      projectAssignmentId: `PA_TEST_${Date.now()}`,
      consultorId: testUser.userId,
      companyId: testCompany.companyId,
      projectId: testProject.projectId,
      moduleId: 'MOD_SAP_FI',
      tarifaConsultor: 450,
      tarifaCliente: 850,
      isActive: true
    });
  }

  const convenioDoc = generateContractDoc('convenio_consultor_proyecto', {
    idProyecto: testProject.projectId,
    nombreProyecto: testProject.name,
    idAsignacion: testAsig.projectAssignmentId,
    empresaCliente: testCompany.name,
    nombreConsultor: testUser.name,
    rfcConsultor: testUser.rfc || 'TESTCONS123',
    rolModulo: 'SAP S/4HANA Core',
    horasAsignadas: 120,
    tarifaHora: testAsig.tarifaConsultor || 450
  });

  if (!convenioDoc.includes(testUser.name) || !convenioDoc.includes(testProject.name)) {
    throw new Error('El convenio no contiene los datos del consultor');
  }
  console.log(` Convenio Consultor generado exitosamente para ${testUser.name} con tarifa $${testAsig.tarifaConsultor}/hr.`);

  // Test 3: Registro de firma de prueba en Expediente
  console.log('\n[Test 3] Registro y consulta de documento firmado...');
  const testDocId = `test_signed_${Date.now()}`;
  const signedExpediente = new Expediente({
    docId: testDocId,
    entityType: 'proyecto',
    entityId: testProject.projectId,
    projectId: testProject.projectId,
    consultorId: testUser.userId,
    documentType: 'convenio_asignacion_proyecto',
    documentTitle: 'Convenio Firmado Test',
    fileName: 'Convenio_Firmado_Test.pdf',
    fileData: Buffer.from('TEST FIRMA DIGITAL ARVIC').toString('base64'),
    fileSize: 25,
    mimeType: 'application/pdf',
    signatureStatus: 'firmado',
    signedAt: new Date(),
    signedBy: testUser.name,
    status: 'vigente'
  });
  await signedExpediente.save();

  const foundSigned = await Expediente.findOne({ docId: testDocId });
  if (!foundSigned || foundSigned.signatureStatus !== 'firmado') {
    throw new Error('Fallo al guardar o recuperar el documento firmado');
  }
  console.log(' Documento firmado guardado y verificado en BD.');

  // Limpieza del registro de prueba
  await Expediente.deleteOne({ docId: testDocId });
  console.log(' Registro de prueba limpiado correctamente.');

  console.log('\n=========================================');
  console.log(' TODAS LAS PRUEBAS BACKEND PASARON (3/3)');
  console.log('=========================================');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
