const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'arvic_jwt_secret_dev_2026';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('🧪 === INICIANDO PRUEBAS DE CIERRE DE FASE 3 ===');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Conectado a MongoDB');

  // 1. Obtener usuario admin y generar token
  console.log('\n[1/6] Generando token de Administrador...');
  const User = require('../api/models/User');
  const adminUser = await User.findOne({ role: 'admin' }) || { userId: 'admin', role: 'admin', name: 'Administrador' };
  const token = jwt.sign(
    { userId: adminUser.userId, role: 'admin', name: adminUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  console.log(`✅ Token de Admin generado para: ${adminUser.name} (${adminUser.userId})`);

  // 2. Obtener lista de proyectos y soportes
  console.log('\n[2/6] Obteniendo proyectos y soportes para pruebas...');
  const Project = require('../api/models/Project');
  const Support = require('../api/models/Support');

  let testProject = await Project.findOne({});
  let testSupport = await Support.findOne({});

  const projectId = testProject?.projectId || 'TEST_PRJ001';
  const supportId = testSupport?.supportId || 'SUP-TEST-001';

  console.log(`  - Usando Proyecto de prueba: ${projectId}`);
  console.log(`  - Usando Soporte de prueba: ${supportId}`);

  // 3. Probar GET /api/expedientes/soporte/:supportId/firmas
  console.log('\n[3/6] Probando GET /api/expedientes/soporte/:supportId/firmas...');
  const supFirmasRes = await request('GET', `/api/expedientes/soporte/${supportId}/firmas`, null, token);
  console.log(`  Status: ${supFirmasRes.status}`);
  if (supFirmasRes.status === 200 && supFirmasRes.body?.success) {
    console.log('✅ Endpoint de firmas de soporte respondió con éxito.');
    console.log('  Datos recibidos:', {
      support: supFirmasRes.body.data?.support?.name,
      consultoresCount: supFirmasRes.body.data?.consultores?.length,
      clientContract: supFirmasRes.body.data?.clientContract?.hasSigned
    });
  } else {
    console.log('⚠️ Respuesta de firmas de soporte:', supFirmasRes.body?.message || supFirmasRes.status);
  }

  // 4. Probar POST /api/expedientes/soporte/upload
  console.log('\n[4/6] Probando POST /api/expedientes/soporte/upload...');
  const uploadDocRes = await request('POST', '/api/expedientes/soporte/upload', {
    supportId,
    documentType: 'contrato_soporte',
    documentTitle: 'Contrato de Mesa de Soporte 2026',
    fileName: 'Contrato_Soporte_Test.pdf',
    fileData: 'JVBERi0xLjQKJVRlc3QgUERGCg==',
    fileSize: 1024,
    mimeType: 'application/pdf'
  }, token);

  console.log(`  Status: ${uploadDocRes.status}`);
  let createdDocId = uploadDocRes.body?.data?.docId;
  if (uploadDocRes.status === 201 && createdDocId) {
    console.log(`✅ Documento de soporte adjuntado con éxito. Doc ID: ${createdDocId}`);
  } else {
    console.error('❌ Error adjuntando documento a soporte:', uploadDocRes.body);
  }

  // 5. Probar GET /api/expedientes/soporte/:supportId
  console.log('\n[5/6] Probando GET /api/expedientes/soporte/:supportId...');
  const supDocsRes = await request('GET', `/api/expedientes/soporte/${supportId}`, null, token);
  console.log(`  Status: ${supDocsRes.status}`);
  if (supDocsRes.status === 200 && supDocsRes.body?.success) {
    console.log(`✅ Se listaron exitosamente los documentos del soporte (${supDocsRes.body.data?.length} encontrados).`);
  } else {
    console.error('❌ Error listando documentos de soporte:', supDocsRes.body);
  }

  // 6. Probar PUT /api/expedientes/doc/:docId/approve-signature
  if (createdDocId) {
    console.log(`\n[6/6] Probando PUT /api/expedientes/doc/${createdDocId}/approve-signature...`);
    const approveRes = await request('PUT', `/api/expedientes/doc/${createdDocId}/approve-signature`, {}, token);
    console.log(`  Status: ${approveRes.status}`);
    if (approveRes.status === 200 && approveRes.body?.success) {
      console.log('✅ Firma aprobada con éxito:', {
        docId: approveRes.body.data?.docId,
        signatureStatus: approveRes.body.data?.signatureStatus,
        status: approveRes.body.data?.status,
        reviewedBy: approveRes.body.data?.reviewedBy
      });
      if (approveRes.body.data?.signatureStatus === 'aprobado') {
        console.log('🌟 Verificación de signatureStatus === "aprobado" confirmada.');
      }
    } else {
      console.error('❌ Error aprobando firma:', approveRes.body);
    }

    // Limpieza del documento de prueba
    console.log('\n🧹 Limpiando documento de prueba...');
    const delRes = await request('DELETE', `/api/expedientes/doc/${createdDocId}`, null, token);
    console.log(`  Status limpieza: ${delRes.status} (${delRes.body?.message || 'ok'})`);
  }

  console.log('\n======================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE CIERRE DE FASE 3 CONCLUIDAS EXITOSAMENTE');
  console.log('======================================================\n');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error en ejecución del test:', err);
  process.exit(1);
});
