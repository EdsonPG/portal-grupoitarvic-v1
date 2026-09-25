/**
 * scripts/setup_test_project_assignment.js
 * Asigna formalmente el proyecto TEST_PRJ001 a la empresa EMP_TEST_CLIENTE
 * y le vincula un contrato/SOW en su expediente para las pruebas visuales y funcionales.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ProjectAssignment = require('../api/models/ProjectAssignment');
const Project = require('../api/models/Project');
const Expediente = require('../api/models/Expediente');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://portalarvic:Portal123456@portal-arvic-cluster.nljgq6k.mongodb.net/arvic-preview?retryWrites=true&w=majority';

async function setup() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado a MongoDB Atlas');

  const companyId = 'EMP_TEST_CLIENTE';
  const projectId = 'TEST_PRJ001';

  // 1. Asegurar el proyecto con límite de horas
  let project = await Project.findOne({ projectId });
  if (project) {
    project.maxHours = 120;
    project.isActive = true;
    await project.save();
    console.log('✅ Proyecto TEST_PRJ001 actualizado con 120 hrs contratadas');
  }

  // 2. Crear asignación de proyecto
  let pa = await ProjectAssignment.findOne({ projectId, companyId });
  if (!pa) {
    pa = await ProjectAssignment.create({
      projectAssignmentId: `PA_${Date.now()}`,
      consultorId: 'USR_SECRET_CONSULTOR',
      companyId: companyId,
      projectId: projectId,
      moduleId: 'MOD_TEST_1',
      tarifaConsultor: 350,
      tarifaCliente: 750,
      isActive: true
    });
    console.log('✅ ProjectAssignment creado para Tech Solutions:', pa.projectAssignmentId);
  } else {
    pa.isActive = true;
    await pa.save();
    console.log('✅ ProjectAssignment ya existente y activo:', pa.projectAssignmentId);
  }

  // 3. Crear documento de contrato en el expediente del proyecto
  const docId = `proj_doc_sow_${projectId.toLowerCase()}`;
  let doc = await Expediente.findOne({ docId });
  const samplePdfBase64 = Buffer.from('%PDF-1.4 Oficial Contract Grupo IT ARVIC & Tech Solutions Mexico').toString('base64');

  if (!doc) {
    doc = await Expediente.create({
      docId: docId,
      entityType: 'proyecto',
      entityId: projectId,
      entityName: 'Migración SAP S/4HANA',
      projectId: projectId,
      companyId: companyId,
      documentType: 'anexo_sow',
      documentTitle: 'Anexo de Alcance de Servicios (SOW) - Migración SAP',
      fileName: 'ARVIC_SOW_TechSolutions_2026.pdf',
      fileData: samplePdfBase64,
      fileSize: 1024 * 45, // 45 KB
      mimeType: 'application/pdf',
      status: 'vigente',
      validUntil: new Date('2027-12-31'),
      uploadedAt: new Date(),
      notes: 'Contrato y Anexo de Alcance formalizado y validado por Dirección de Operaciones.'
    });
    console.log('✅ Documento SOW adjuntado al expediente del proyecto:', doc.docId);
  } else {
    doc.companyId = companyId;
    doc.fileData = samplePdfBase64;
    doc.status = 'vigente';
    await doc.save();
    console.log('✅ Documento SOW actualizado en expediente:', doc.docId);
  }

  await mongoose.disconnect();
  console.log('🎉 Setup completado con éxito.');
}

setup().catch(err => {
  console.error('❌ Error en setup:', err);
  process.exit(1);
});
