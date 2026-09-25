/**
 * scripts/verify_fase3_expedientes.js
 * Verificación automatizada integral de la Fase 3:
 * Machotes institucionales, expedientes por proyecto y consulta/descarga desde portal cliente.
 */

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 INICIANDO VERIFICACIÓN AUTOMATIZADA: FASE 3');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Login Admin
    console.log('1. Autenticación Administrador...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'hperez1402.' })
    });
    const adminLoginData = await adminLoginRes.json();

    assert(adminLoginRes.status === 200 && adminLoginData.token, 'Login de Admin exitoso con JWT');
    const adminToken = adminLoginData.token;

    // 2. Consultar Machotes
    console.log('\n2. Consulta de Machotes y Plantillas Base...');
    const machotesRes = await fetch(`${BASE_URL}/api/expedientes/machotes`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const machotesData = await machotesRes.json();

    assert(machotesRes.status === 200, 'GET /api/expedientes/machotes retorna 200');
    assert(Array.isArray(machotesData.data) && machotesData.data.length >= 5, `Se listan ${machotesData.data?.length} machotes base institucionales`);
    
    const marcoConsultor = machotesData.data?.find(m => m.id === 'MACHOTE_CONTRATO_CONSULTOR');
    assert(marcoConsultor && marcoConsultor.isDraft === true, 'Machote Contrato Marco Consultor disponible como borrador base');

    // 3. Descarga de Machote en Formato Word/Doc (probando token en query string)
    console.log('\n3. Descarga de Machote Base con token en query string...');
    const downloadRes = await fetch(`${BASE_URL}/api/expedientes/machotes/MACHOTE_CONTRATO_CONSULTOR/download?token=${encodeURIComponent(adminToken)}`);
    const downloadText = await downloadRes.text();
    const disposition = downloadRes.headers.get('content-disposition') || '';

    assert(downloadRes.status === 200, 'Descarga de machote retorna HTTP 200');
    assert(disposition.includes('ARVIC_Contrato_Marco_Consultor_Borrador.doc'), 'Header Content-Disposition correcto para .doc');
    assert(downloadText.includes('GRUPO IT ARVIC'), 'Contenido del machote incluye membrete oficial');

    // 4. Sustitución de Machote con Archivo Oficial (Admin)
    console.log('\n4. Sustitución de Machote con Documento Oficial (Admin)...');
    const testPdfBase64 = Buffer.from('%PDF-1.4 Mock Official NDA Document').toString('base64');
    const replaceRes = await fetch(`${BASE_URL}/api/expedientes/machotes/MACHOTE_NDA/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fileName: 'NDA_Oficial_Legal_Arvic_2026.pdf',
        fileData: testPdfBase64,
        fileSize: 34,
        mimeType: 'application/pdf',
        notes: 'Documento formalizado por el departamento legal'
      })
    });
    const replaceData = await replaceRes.json();

    assert(replaceRes.status === 200 && replaceData.success, 'POST /machotes/:id/upload sustituye borrador con archivo oficial');
    assert(replaceData.data?.isDraft === false, 'El machote ahora marca isDraft: false');

    // 5. Vincular Contrato / Anexo a un Proyecto (Admin)
    console.log('\n5. Carga de Documento/Contrato a un Proyecto...');
    const projDocRes = await fetch(`${BASE_URL}/api/expedientes/proyecto/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        projectId: 'TEST_PRJ001',
        companyId: 'EMP_TEST_CLIENTE',
        documentType: 'anexo_sow',
        documentTitle: 'Anexo Técnico SOW - Proyecto Migración SAP',
        fileName: 'Anexo_SOW_PROJ001_v1.pdf',
        fileData: testPdfBase64,
        fileSize: 34,
        mimeType: 'application/pdf',
        validUntil: '2027-12-31',
        notes: 'Anexo inicial de entregables y cronograma'
      })
    });
    const projDocData = await projDocRes.json();

    assert(projDocRes.status === 201 && projDocData.success, 'POST /proyecto/upload adjunta contrato exitosamente');
    const createdDocId = projDocData.data?.docId;
    assert(createdDocId && createdDocId.startsWith('proj_doc_'), `Documento creado con ID único: ${createdDocId}`);

    // 6. Login Cliente y Validación de Datos Consolidados
    console.log('\n6. Login de Cliente y Verificación de Documentos de Proyecto...');
    const clientLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'mariana.torres@techsolutions.com', password: 'Tech2026!Client' })
    });
    const clientLoginData = await clientLoginRes.json();

    assert(clientLoginRes.status === 200 && clientLoginData.token, 'Login exitoso de cuenta cliente');
    const clientToken = clientLoginData.token;

    // 7. Consulta Consolidada /api/all-data/cliente
    console.log('\n7. Consulta de datos consolidados para Cliente...');
    const allDataRes = await fetch(`${BASE_URL}/api/all-data/cliente`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const allData = await allDataRes.json();

    assert(allDataRes.status === 200 && allData.success, 'GET /api/all-data/cliente retorna 200');
    assert(Array.isArray(allData.data?.projectDocs), 'projectDocs se incluye en la respuesta consolidada');
    const foundInAllData = allData.data?.projectDocs?.find(d => d.docId === createdDocId);
    assert(foundInAllData, 'El documento adjunto al proyecto está presente en el payload del cliente');

    // 8. Consulta Directa de Expediente de Proyecto como Cliente
    console.log('\n8. Consulta de Expediente de Proyecto desde Portal Cliente...');
    const clientProjDocsRes = await fetch(`${BASE_URL}/api/expedientes/proyecto/TEST_PRJ001`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const clientProjDocsData = await clientProjDocsRes.json();

    assert(clientProjDocsRes.status === 200 && clientProjDocsData.success, 'Cliente tiene acceso autorizado al expediente de su proyecto');
    const foundDoc = clientProjDocsData.data?.find(d => d.docId === createdDocId);
    assert(foundDoc && foundDoc.documentTitle === 'Anexo Técnico SOW - Proyecto Migración SAP', 'Título del documento coincide exactamente');

    // 9. Descarga de Documento por docId usando token en query param
    console.log('\n9. Descarga de Archivo de Proyecto...');
    const docDownloadRes = await fetch(`${BASE_URL}/api/expedientes/doc/${createdDocId}/download?token=${encodeURIComponent(clientToken)}`);

    assert(docDownloadRes.status === 200, 'GET /doc/:docId/download?token=... retorna HTTP 200');
    assert(docDownloadRes.headers.get('content-type')?.includes('application/pdf'), 'Content-Type es application/pdf');

    // 10. Eliminación del documento de prueba por Admin
    console.log('\n10. Limpieza: Eliminación del documento de prueba (Admin)...');
    const deleteDocRes = await fetch(`${BASE_URL}/api/expedientes/doc/${createdDocId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteDocData = await deleteDocRes.json();

    assert(deleteDocRes.status === 200 && deleteDocData.success, 'DELETE /doc/:docId elimina documento de prueba');

  } catch (err) {
    console.error('❌ Error no controlado durante la verificación:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 RESUMEN FINAL FASE 3: ${passed} PASADOS | ${failed} FALLIDOS`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('🎉 ¡TODAS LAS PRUEBAS DE LA FASE 3 PASARON SATISFACTORIAMENTE!');
    process.exit(0);
  } else {
    console.error('💥 SE ENCONTRARON FALLOS EN LA VERIFICACIÓN.');
    process.exit(1);
  }
}

runVerification();
