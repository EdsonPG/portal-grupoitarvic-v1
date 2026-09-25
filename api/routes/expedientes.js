const express = require('express');
const router = express.Router();
const Expediente = require('../models/Expediente');
const User = require('../models/User');
const Project = require('../models/Project');
const Company = require('../models/Company');
const ProjectAssignment = require('../models/ProjectAssignment');
const Assignment = require('../models/Assignment');
const Support = require('../models/Support');
const Module = require('../models/Module');
const { generateContractDoc, generateContractPdfBuffer, generateMachotePdfBuffer } = require('../utils/contractGenerator');
const { createAndEmitNotification, notifyAdmins, notifyCompanyClients } = require('../utils/notificationService');
const { sendContractPendingSignEmail, sendContractSignedNotificationToAdmin } = require('../utils/mailer');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

// Lista estándar de tipos de documentos por rol/entidad
const REQUIRED_DOCS_CONSULTOR = [
  { type: 'ine', title: 'INE / Identificación Oficial' },
  { type: 'curp', title: 'CURP Oficial' },
  { type: 'csf', title: 'Constancia de Situación Fiscal (SAT)' },
  { type: 'domicilio', title: 'Comprobante de Domicilio' },
  { type: 'cv', title: 'Currículum Vitae y Certificaciones' },
  { type: 'caratula_bancaria', title: 'Carátula Bancaria (Estado de Cuenta)' },
  { type: 'opinion_32d', title: 'Opinión de Cumplimiento 32-D (SAT)' },
  { type: 'contrato_arvic', title: 'Contrato Marco Arvic' },
  { type: 'contrato_proyecto', title: 'Convenio / Anexo de Proyecto' }
];

const REQUIRED_DOCS_CLIENTE = [
  { type: 'csf', title: 'Constancia de Situación Fiscal (Empresa)' },
  { type: 'contrato_marco_cliente', title: 'Contrato Marco de Servicios Arvic' },
  { type: 'anexo_sow', title: 'Anexos / SOW de Soporte y Proyectos' },
  { type: 'opinion_32d', title: 'Opinión de Cumplimiento 32-D' },
  { type: 'domicilio', title: 'Comprobante de Domicilio Fiscal' }
];

// Helper para calcular estado dinámico con semáforo
function calculateDocStatus(doc) {
  const now = new Date();
  let status = doc.status || 'en_revision';
  let isNearExpiry = false;
  let daysUntilExpiry = null;

  if (doc.validUntil) {
    const expiry = new Date(doc.validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime < 0) {
      status = 'vencido';
    } else if (daysUntilExpiry <= 30 && status === 'vigente') {
      status = 'por_vencer';
      isNearExpiry = true;
    }
  }

  return {
    ...doc.toObject ? doc.toObject() : doc,
    status,
    isNearExpiry,
    daysUntilExpiry
  };
}

// ============================================
// REPOSITORIO DE MACHOTES Y PLANTILLAS OFICIALES
// ============================================
const { DEFAULT_MACHOTES } = require('../utils/machotesData');

// Helper para inicializar/asegurar los machotes en BD
async function ensureMachotesInDB() {
  for (const item of DEFAULT_MACHOTES) {
    const exists = await Expediente.findOne({ entityType: 'machote', entityId: item.id });
    if (!exists) {
      await Expediente.create({
        docId: `machote_${item.id.toLowerCase()}`,
        entityType: 'machote',
        entityId: item.id,
        documentType: item.documentType,
        documentTitle: item.title,
        category: item.category,
        description: item.description,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileData: Buffer.from(item.htmlContent, 'utf-8').toString('base64'),
        fileSize: Buffer.byteLength(item.htmlContent, 'utf-8'),
        status: 'vigente',
        isDraft: true,
        notes: 'Plantilla base generada automáticamente. Puede ser sustituida por el Administrador con el archivo definitivo.'
      });
    }
  }
}

// GET /api/expedientes/machotes — Lista de machotes disponibles
router.get('/machotes', async (req, res) => {
  try {
    await ensureMachotesInDB();
    const docs = await Expediente.find({ entityType: 'machote' }).sort({ createdAt: 1 });
    
    const machotes = docs.map(d => {
      const def = DEFAULT_MACHOTES.find(m => m.id === d.entityId) || {};
      return {
        id: d.entityId,
        docId: d.docId,
        title: d.documentTitle || def.title,
        category: d.category || def.category,
        targetRole: def.targetRole || 'ambos',
        description: d.description || def.description,
        fileName: d.fileName || def.fileName,
        mimeType: d.mimeType || def.mimeType,
        fileSize: d.fileSize || 0,
        isDraft: d.isDraft !== false,
        hasCustomUpload: !!(d.fileData && !d.isDraft),
        updatedAt: d.updatedAt || d.createdAt
      };
    });

    res.json({ success: true, data: machotes });
  } catch (error) {
    console.error('Error al listar machotes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/machotes/:id/download — Descargar plantilla en Word (.doc) o PDF
router.get(['/machotes/:id/download', '/machote/:id/download'], async (req, res) => {
  try {
    await ensureMachotesInDB();
    const { id } = req.params;
    const { format } = req.query; // 'pdf' | 'doc'
    const doc = await Expediente.findOne({ entityType: 'machote', entityId: id });
    const def = DEFAULT_MACHOTES.find(m => m.id === id);

    if (!doc && !def) {
      return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });
    }

    const wantPdf = format === 'pdf' || (!format && (doc?.fileName?.endsWith('.pdf') || doc?.isDraft || !doc));

    // Si pide PDF (o default en visor web):
    if (wantPdf && format !== 'doc') {
      if (doc?.fileData && !doc.isDraft && (doc.mimeType === 'application/pdf' || doc.fileName?.endsWith('.pdf'))) {
        const fileBuffer = Buffer.from(doc.fileData, 'base64');
        // Validar que no sea un archivo corrupto / mock text
        if (fileBuffer.length > 200 && fileBuffer.slice(0, 5).toString() === '%PDF-') {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
          return res.send(fileBuffer);
        }
      }

      // Generar PDF nativo ejecutivo con pdfmake
      const title = doc?.documentTitle || def?.title || 'Documento Oficial';
      const desc = doc?.description || def?.description || '';
      const cat = doc?.category || def?.category || 'General';
      const content = def?.htmlContent || (doc?.fileData ? Buffer.from(doc.fileData, 'base64').toString('utf-8') : '');

      const pdfBuffer = await generateMachotePdfBuffer(title, desc, cat, content);
      const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeTitle}.pdf"`);
      return res.send(pdfBuffer);
    }

    // Formato Word (.doc)
    let fileName = doc?.fileName || def?.fileName || 'plantilla_arvic.doc';
    let mimeType = 'application/msword; charset=utf-8';
    let fileBuffer;

    if (doc?.fileData && !doc.isDraft && !doc.fileName?.endsWith('.pdf')) {
      fileBuffer = Buffer.from(doc.fileData, 'base64');
      mimeType = doc.mimeType || 'application/msword';
    } else if (def?.htmlContent) {
      fileBuffer = Buffer.from(def.htmlContent, 'utf-8');
      fileName = `${(doc?.documentTitle || def?.title || 'plantilla_arvic').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    } else if (doc?.fileData) {
      fileBuffer = Buffer.from(doc.fileData, 'base64');
    } else {
      return res.status(404).json({ success: false, message: 'Contenido no disponible' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error al descargar machote:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expedientes/machotes/:id/upload — Subir/Reemplazar archivo de machote (Admin)
router.post('/machotes/:id/upload', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const { id } = req.params;
    const { fileName, fileData, fileSize, mimeType, notes } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, message: 'Se requiere archivo (fileName y fileData) para actualizar la plantilla' });
    }

    let doc = await Expediente.findOne({ entityType: 'machote', entityId: id });
    const def = DEFAULT_MACHOTES.find(m => m.id === id);

    if (!doc) {
      doc = new Expediente({
        docId: `machote_${id.toLowerCase()}`,
        entityType: 'machote',
        entityId: id,
        documentType: def?.documentType || 'otro',
        documentTitle: def?.title || fileName,
        category: def?.category || 'General'
      });
    }

    doc.fileName = fileName;
    doc.fileData = fileData;
    doc.fileSize = fileSize || Buffer.byteLength(fileData, 'base64');
    doc.mimeType = mimeType || 'application/pdf';
    doc.isDraft = false;
    doc.notes = notes || 'Plantilla actualizada con documento oficial por el Administrador';
    doc.updatedAt = new Date();
    await doc.save();

    res.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: {
        id: doc.entityId,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        isDraft: doc.isDraft,
        updatedAt: doc.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al actualizar machote:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expedientes/machotes/:id/reset — Restaurar plantilla base predeterminada (Admin)
router.post('/machotes/:id/reset', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const { id } = req.params;
    const def = DEFAULT_MACHOTES.find(m => m.id === id);
    if (!def) {
      return res.status(404).json({ success: false, message: 'Plantilla base no encontrada' });
    }

    let doc = await Expediente.findOne({ entityType: 'machote', entityId: id });
    if (!doc) {
      doc = new Expediente({
        docId: `machote_${id.toLowerCase()}`,
        entityType: 'machote',
        entityId: id,
        documentType: def.documentType,
        category: def.category
      });
    }

    doc.fileName = def.fileName;
    doc.documentTitle = def.title;
    doc.mimeType = def.mimeType;
    doc.fileData = Buffer.from(def.htmlContent, 'utf-8').toString('base64');
    doc.fileSize = Buffer.byteLength(def.htmlContent, 'utf-8');
    doc.isDraft = true;
    doc.notes = 'Plantilla base restablecida por el Administrador';
    doc.updatedAt = new Date();
    await doc.save();

    res.json({
      success: true,
      message: 'Plantilla restablecida a su versión base original (.doc)',
      data: {
        id: doc.entityId,
        fileName: doc.fileName,
        isDraft: true
      }
    });
  } catch (error) {
    console.error('Error al restaurar machote:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// EXPEDIENTES POR PROYECTO
// ============================================

// GET /api/expedientes/proyecto/:projectId — Listar contratos y anexos del proyecto
router.get('/proyecto/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verificar permisos:
    if (!isAdmin(req)) {
      if (req.user?.role === 'cliente') {
        const ProjectAssignment = require('../models/ProjectAssignment');
        const hasAssignment = await ProjectAssignment.findOne({
          projectId,
          companyId: req.user.companyId,
          isActive: { $ne: false }
        });
        const hasCompanyDoc = await Expediente.findOne({
          projectId,
          companyId: req.user.companyId
        });
        if (!hasAssignment && !hasCompanyDoc) {
          return res.status(403).json({ success: false, message: 'Acceso denegado a los expedientes de este proyecto' });
        }
      } else {
        const ProjectAssignment = require('../models/ProjectAssignment');
        const hasAssignment = await ProjectAssignment.findOne({
          projectId,
          $or: [{ consultorId: req.user.userId }, { userId: req.user.userId }],
          isActive: { $ne: false }
        });
        if (!hasAssignment) {
          return res.status(403).json({ success: false, message: 'Acceso denegado a este proyecto' });
        }
      }
    }

    const docs = await Expediente.find({
      entityType: 'proyecto',
      $or: [{ projectId }, { entityId: projectId }]
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: docs.map(d => calculateDocStatus(d))
    });
  } catch (error) {
    console.error('Error al obtener documentos del proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expedientes/proyecto/upload — Subir contrato o anexo al proyecto (Admin)
router.post('/proyecto/upload', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo el administrador puede subir contratos a proyectos' });
  }

  try {
    const {
      projectId,
      companyId,
      documentType,
      documentTitle,
      fileName,
      fileData,
      fileSize,
      mimeType,
      validUntil,
      notes
    } = req.body;

    if (!projectId || !fileName) {
      return res.status(400).json({ success: false, message: 'Se requiere projectId y fileName para adjuntar al expediente del proyecto' });
    }

    const Project = require('../models/Project');
    const project = await Project.findOne({ projectId });
    const projectName = project ? project.name : projectId;

    const docId = `proj_doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDoc = new Expediente({
      docId,
      entityType: 'proyecto',
      entityId: projectId,
      entityName: projectName,
      projectId,
      companyId: companyId || null,
      documentType: documentType || 'contrato_proyecto',
      documentTitle: documentTitle || fileName,
      fileName,
      fileData: fileData || null,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      status: 'vigente',
      validUntil: validUntil ? new Date(validUntil) : null,
      uploadedAt: new Date(),
      notes: notes || null
    });

    await newDoc.save();

    res.status(201).json({
      success: true,
      message: 'Documento adjuntado exitosamente al proyecto',
      data: calculateDocStatus(newDoc)
    });
  } catch (error) {
    console.error('Error al subir documento de proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/soporte/:supportId — Listar contratos y anexos del soporte
router.get('/soporte/:supportId', async (req, res) => {
  try {
    const { supportId } = req.params;
    
    // Verificar permisos:
    if (!isAdmin(req)) {
      if (req.user?.role === 'cliente') {
        const hasAssignment = await Assignment.findOne({
          supportId,
          companyId: req.user.companyId,
          isActive: { $ne: false }
        });
        const hasCompanyDoc = await Expediente.findOne({
          supportId,
          companyId: req.user.companyId
        });
        if (!hasAssignment && !hasCompanyDoc) {
          return res.status(403).json({ success: false, message: 'Acceso denegado a los expedientes de este soporte' });
        }
      } else {
        const hasAssignment = await Assignment.findOne({
          supportId,
          $or: [{ consultorId: req.user.userId }, { userId: req.user.userId }],
          isActive: { $ne: false }
        });
        if (!hasAssignment) {
          return res.status(403).json({ success: false, message: 'Acceso denegado a este soporte' });
        }
      }
    }

    const docs = await Expediente.find({
      entityType: 'soporte',
      $or: [{ supportId }, { entityId: supportId }]
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: docs.map(d => calculateDocStatus(d))
    });
  } catch (error) {
    console.error('Error al obtener documentos del soporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expedientes/soporte/upload — Subir contrato o anexo a la cuenta de soporte (Admin)
router.post('/soporte/upload', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo el administrador puede subir contratos a soportes' });
  }

  try {
    const {
      supportId,
      companyId,
      documentType,
      documentTitle,
      fileName,
      fileData,
      fileSize,
      mimeType,
      validUntil,
      notes
    } = req.body;

    if (!supportId || !fileName) {
      return res.status(400).json({ success: false, message: 'Se requiere supportId y fileName para adjuntar al expediente del soporte' });
    }

    const support = await Support.findOne({ supportId });
    const supportName = support ? support.name : supportId;

    const docId = `sup_doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDoc = new Expediente({
      docId,
      entityType: 'soporte',
      entityId: supportId,
      entityName: supportName,
      supportId,
      companyId: companyId || null,
      documentType: documentType || 'contrato_soporte',
      documentTitle: documentTitle || fileName,
      fileName,
      fileData: fileData || null,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      status: 'vigente',
      validUntil: validUntil ? new Date(validUntil) : null,
      uploadedAt: new Date(),
      notes: notes || null
    });

    await newDoc.save();

    res.status(201).json({
      success: true,
      message: 'Documento adjuntado exitosamente al soporte',
      data: calculateDocStatus(newDoc)
    });
  } catch (error) {
    console.error('Error al subir documento de soporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/expedientes/doc/:docId/approve-signature — Aprobar formalmente documento firmado (Admin)
router.put('/doc/:docId/approve-signature', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const { docId } = req.params;
    const doc = await Expediente.findOne({ docId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    doc.signatureStatus = 'aprobado';
    doc.status = 'vigente';
    doc.reviewedBy = req.user?.userId || 'admin';
    doc.reviewedAt = new Date();
    doc.updatedAt = new Date();

    await doc.save();

    // Notificar in-app al usuario si aplica (consultor o cliente)
    try {
      const targetUserId = doc.consultorId || (doc.entityType === 'consultor' ? doc.entityId : null);
      if (targetUserId) {
        await createAndEmitNotification({
          userId: targetUserId,
          type: 'contract_signed',
          title: 'Convenio Aprobado',
          message: `Tu documento "${doc.documentTitle || doc.fileName}" ha sido aprobado por Administración.`,
          actionUrl: 'expedientes',
          relatedId: doc.docId
        });
      }
    } catch (notifErr) {
      console.warn('No se pudo enviar notificación de aprobación de firma:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Firma y documento aprobados formalmente',
      data: calculateDocStatus(doc)
    });
  } catch (error) {
    console.error('Error al aprobar firma de documento:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/expedientes/doc/:docId — Eliminar documento de expediente (Admin)
router.delete('/doc/:docId', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo el administrador puede eliminar documentos' });
  }

  try {
    const { docId } = req.params;
    const deleted = await Expediente.findOneAndDelete({ docId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    res.json({
      success: true,
      message: 'Documento eliminado correctamente del expediente'
    });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/doc/:docId/download — Descargar/Visualizar documento de expediente
router.get('/doc/:docId/download', async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await Expediente.findOne({ docId });
    if (!doc || !doc.fileData) {
      return res.status(404).json({ success: false, message: 'Archivo o documento no encontrado' });
    }

    const fileBuffer = Buffer.from(doc.fileData, 'base64');
    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// GENERACIÓN DINÁMICA DE CONTRATOS Y CONVENIOS
// ============================================

// GET /api/expedientes/proyecto/:projectId/generar-contrato — Generar SOW o Convenio de Proyecto (.pdf o .doc)
router.get('/proyecto/:projectId/generar-contrato', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tipo, consultorId, format } = req.query; // tipo: 'cliente' | 'consultor', format: 'pdf' | 'doc'
    
    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    const assignments = await ProjectAssignment.find({ projectId, isActive: { $ne: false } });
    const companyId = assignments[0]?.companyId || project.companyId || null;
    const company = companyId ? await Company.findOne({ companyId }) : null;

    if (tipo === 'consultor') {
      const targetConsultorId = consultorId || (req.user?.role === 'consultor' ? req.user.userId : null);
      if (!targetConsultorId) {
        return res.status(400).json({ success: false, message: 'Se requiere el parámetro consultorId' });
      }
      
      if (!isAdmin(req) && req.user?.userId !== targetConsultorId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado a este convenio' });
      }

      const asig = assignments.find(a => (a.consultorId === targetConsultorId || a.userId === targetConsultorId));
      const consultorUser = await User.findOne({ userId: targetConsultorId });
      const mod = asig ? await Module.findOne({ moduleId: asig.moduleId }) : null;

      const payload = {
        idProyecto: project.projectId,
        nombreProyecto: project.name,
        idAsignacion: asig?.projectAssignmentId || 'ASIG-PRJ',
        empresaCliente: company?.name || company?.razonSocial || 'Cliente Confidencial',
        nombreConsultor: consultorUser?.name || 'Consultor Especialista',
        rfcConsultor: consultorUser?.rfc || 'CONS010101XXX',
        emailConsultor: consultorUser?.email || '',
        rolModulo: mod?.name || 'Consultoría Especializada',
        horasAsignadas: project.maxHours || 80,
        tarifaHora: asig?.tarifaConsultor || 0,
        fechaInicio: project.createdAt || new Date(),
        fechaFin: null
      };

      const safePrj = (project.name || 'Proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCons = (consultorUser?.name || 'Consultor').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'doc') {
        const docContent = generateContractDoc('convenio_consultor_proyecto', payload);
        res.setHeader('Content-Type', 'application/msword; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Convenio_Asignacion_${safePrj}_${safeCons}.doc"`);
        return res.send(docContent);
      }

      // Default: PDF nativo
      const pdfBuffer = await generateContractPdfBuffer('convenio_consultor_proyecto', payload);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Convenio_Asignacion_${safePrj}_${safeCons}.pdf"`);
      return res.send(pdfBuffer);
    } else {
      // tipo === 'cliente'
      if (!isAdmin(req) && req.user?.role === 'cliente' && companyId && req.user.companyId !== companyId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado a este contrato' });
      }

      const modulos = await Module.find({ moduleId: { $in: assignments.map(a => a.moduleId) } });
      const modNames = modulos.map(m => m.name).join(', ') || 'Consultoría y Desarrollo Especializado';
      const avgTarifaCliente = assignments.length > 0 
        ? Math.round(assignments.reduce((sum, a) => sum + (a.tarifaCliente || 0), 0) / assignments.length)
        : 0;

      const payload = {
        idProyecto: project.projectId,
        nombreProyecto: project.name,
        empresaCliente: company?.name || company?.razonSocial || 'Cliente Corporativo',
        rfcEmpresa: company?.rfc || 'XAXX010101000',
        contactoCliente: company?.contactName || 'Representante Autorizado',
        emailCliente: company?.contactEmail || '',
        horasTotales: project.maxHours || 120,
        tarifaHora: avgTarifaCliente,
        modulosProyecto: modNames,
        fechaInicio: project.createdAt || new Date(),
        fechaFin: null
      };

      const safePrj = (project.name || 'Proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'doc') {
        const docContent = generateContractDoc('sow_cliente_proyecto', payload);
        res.setHeader('Content-Type', 'application/msword; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="SOW_Cliente_${safePrj}.doc"`);
        return res.send(docContent);
      }

      // Default: PDF nativo
      const pdfBuffer = await generateContractPdfBuffer('sow_cliente_proyecto', payload);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="SOW_Cliente_${safePrj}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Error al generar contrato dinámico de proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/soporte/:supportId/generar-contrato — Generar SOW o Convenio de Soporte (.pdf o .doc)
router.get('/soporte/:supportId/generar-contrato', async (req, res) => {
  try {
    const { supportId } = req.params;
    const { tipo, consultorId, format } = req.query;

    const support = await Support.findOne({ supportId });
    if (!support) {
      return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    }

    const assignments = await Assignment.find({ supportId, isActive: { $ne: false } });
    const companyId = assignments[0]?.companyId || null;
    const company = companyId ? await Company.findOne({ companyId }) : null;

    if (tipo === 'consultor') {
      const targetConsultorId = consultorId || (req.user?.role === 'consultor' ? req.user.userId : null);
      if (!targetConsultorId) {
        return res.status(400).json({ success: false, message: 'Se requiere consultorId' });
      }

      if (!isAdmin(req) && req.user?.userId !== targetConsultorId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      const asig = assignments.find(a => a.userId === targetConsultorId);
      const consultorUser = await User.findOne({ userId: targetConsultorId });
      const mod = asig ? await Module.findOne({ moduleId: asig.moduleId }) : null;

      const payload = {
        idSoporte: support.supportId,
        nombreSoporte: support.name,
        idAsignacion: asig?.assignmentId || 'ASIG-SUP',
        empresaCliente: company?.name || company?.razonSocial || 'Cuenta de Soporte',
        nombreConsultor: consultorUser?.name || 'Consultor Soporte',
        rfcConsultor: consultorUser?.rfc || 'CONS010101XXX',
        emailConsultor: consultorUser?.email || '',
        rolModulo: mod?.name || 'Módulo Asignado',
        tarifaHora: asig?.tarifaConsultor || 0
      };

      const safeSup = (support.name || 'Soporte').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCons = (consultorUser?.name || 'Consultor').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'doc') {
        const docContent = generateContractDoc('convenio_consultor_soporte', payload);
        res.setHeader('Content-Type', 'application/msword; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Convenio_Soporte_${safeSup}_${safeCons}.doc"`);
        return res.send(docContent);
      }

      // Default: PDF nativo
      const pdfBuffer = await generateContractPdfBuffer('convenio_consultor_soporte', payload);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Convenio_Soporte_${safeSup}_${safeCons}.pdf"`);
      return res.send(pdfBuffer);
    } else {
      // tipo === 'cliente'
      if (!isAdmin(req) && req.user?.role === 'cliente' && companyId && req.user.companyId !== companyId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      const avgTarifa = assignments.length > 0
        ? Math.round(assignments.reduce((sum, a) => sum + (a.tarifaCliente || 0), 0) / assignments.length)
        : 0;

      const payload = {
        idSoporte: support.supportId,
        nombreSoporte: support.name,
        empresaCliente: company?.name || company?.razonSocial || 'Cliente Corporativo',
        rfcEmpresa: company?.rfc || 'XAXX010101000',
        bolsaHoras: 40,
        tarifaHora: avgTarifa,
        totalEstimado: 40 * avgTarifa
      };

      const safeSup = (support.name || 'Soporte').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'doc') {
        const docContent = generateContractDoc('sow_cliente_soporte', payload);
        res.setHeader('Content-Type', 'application/msword; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="SOW_Soporte_${safeSup}.doc"`);
        return res.send(docContent);
      }

      // Default: PDF nativo
      const pdfBuffer = await generateContractPdfBuffer('sow_cliente_soporte', payload);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="SOW_Soporte_${safeSup}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Error al generar contrato dinámico de soporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/proyecto/:projectId/firmas — Obtener estado de firmas de proyecto (Admin / Gestión)
router.get('/proyecto/:projectId/firmas', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    }

    const assignments = await ProjectAssignment.find({ projectId, isActive: { $ne: false } });
    const companyId = assignments[0]?.companyId || project.companyId || null;
    const company = companyId ? await Company.findOne({ companyId }) : null;

    // Buscar si el cliente ya subió su contrato firmado
    const clientDoc = await Expediente.findOne({
      entityType: 'proyecto',
      projectId,
      documentType: { $in: ['contrato_proyecto', 'anexo_sow'] },
      isDraft: false
    }).sort({ uploadedAt: -1 });

    // Consultores asignados y su estado de firma
    const consultores = [];
    for (const a of assignments) {
      const cId = a.consultorId || a.userId;
      const u = await User.findOne({ userId: cId });
      const mod = await Module.findOne({ moduleId: a.moduleId });
      
      // Buscar si el consultor ya subió su convenio firmado para este proyecto
      const signedDoc = await Expediente.findOne({
        projectId,
        $or: [{ consultorId: cId }, { entityId: cId }],
        documentType: 'convenio_asignacion_proyecto',
        signatureStatus: { $in: ['firmado', 'aprobado'] }
      }).sort({ uploadedAt: -1 });

      consultores.push({
        consultorId: cId,
        name: u?.name || cId,
        email: u?.email || '',
        moduleName: mod?.name || a.moduleId,
        tarifaConsultor: a.tarifaConsultor || 0,
        hasSigned: !!signedDoc,
        signatureStatus: signedDoc ? (signedDoc.signatureStatus || 'firmado') : 'pendiente',
        signedAt: signedDoc?.signedAt || signedDoc?.uploadedAt || null,
        signedDocId: signedDoc?.docId || null,
        signedFileName: signedDoc?.fileName || null
      });
    }

    res.json({
      success: true,
      data: {
        project: {
          projectId: project.projectId,
          name: project.name,
          maxHours: project.maxHours
        },
        company: company ? {
          companyId: company.companyId,
          name: company.name
        } : null,
        clientContract: {
          hasSigned: !!clientDoc,
          signatureStatus: clientDoc ? (clientDoc.signatureStatus || 'firmado') : 'pendiente',
          docId: clientDoc?.docId || null,
          fileName: clientDoc?.fileName || null,
          uploadedAt: clientDoc?.uploadedAt || null
        },
        consultores
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de firmas del proyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/soporte/:supportId/firmas — Obtener estado de firmas de soporte (Admin / Gestión)
router.get('/soporte/:supportId/firmas', async (req, res) => {
  try {
    const { supportId } = req.params;
    const support = await Support.findOne({ supportId });
    if (!support) {
      return res.status(404).json({ success: false, message: 'Soporte no encontrado' });
    }

    const assignments = await Assignment.find({ supportId, isActive: { $ne: false } });
    const companyId = assignments[0]?.companyId || support.companyId || null;
    const company = companyId ? await Company.findOne({ companyId }) : null;

    // Buscar si el cliente ya subió su contrato o SOW firmado
    const clientDoc = await Expediente.findOne({
      entityType: 'soporte',
      supportId,
      documentType: { $in: ['contrato_soporte', 'anexo_sow', 'sow_soporte'] },
      isDraft: false
    }).sort({ uploadedAt: -1 });

    // Consultores asignados y su estado de firma
    const consultores = [];
    for (const a of assignments) {
      const cId = a.userId || a.consultorId;
      const u = await User.findOne({ userId: cId });
      const mod = await Module.findOne({ moduleId: a.moduleId });

      const signedDoc = await Expediente.findOne({
        supportId,
        $or: [{ consultorId: cId }, { entityId: cId }],
        documentType: 'convenio_asignacion_soporte',
        signatureStatus: { $in: ['firmado', 'aprobado'] }
      }).sort({ uploadedAt: -1 });

      consultores.push({
        consultorId: cId,
        name: u?.name || cId,
        email: u?.email || '',
        moduleName: mod?.name || a.moduleId,
        tarifaConsultor: a.tarifaConsultor || 0,
        hasSigned: !!signedDoc,
        signatureStatus: signedDoc ? (signedDoc.signatureStatus || 'firmado') : 'pendiente',
        signedAt: signedDoc?.signedAt || signedDoc?.uploadedAt || null,
        signedDocId: signedDoc?.docId || null,
        signedFileName: signedDoc?.fileName || null
      });
    }

    res.json({
      success: true,
      data: {
        support: {
          supportId: support.supportId,
          name: support.name,
          description: support.description
        },
        company: company ? {
          companyId: company.companyId,
          name: company.name
        } : null,
        clientContract: {
          hasSigned: !!clientDoc,
          signatureStatus: clientDoc ? (clientDoc.signatureStatus || 'firmado') : 'pendiente',
          docId: clientDoc?.docId || null,
          fileName: clientDoc?.fileName || null,
          uploadedAt: clientDoc?.uploadedAt || null
        },
        consultores
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de firmas del soporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/mis-contratos — Obtener contratos y asignaciones del Consultor logueado
router.get('/mis-contratos', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // 1. Contrato Marco Arvic General del Consultor
    const marcoDoc = await Expediente.findOne({
      entityType: 'consultor',
      entityId: userId,
      documentType: 'contrato_arvic'
    }).sort({ uploadedAt: -1 });

    const contratoMarco = {
      tipo: 'marco',
      id: 'marco_arvic',
      title: 'Contrato Marco de Prestación de Servicios ARVIC',
      hasSigned: !!(marcoDoc && ['firmado', 'aprobado'].includes(marcoDoc.signatureStatus)),
      signatureStatus: marcoDoc ? (marcoDoc.signatureStatus || 'firmado') : 'pendiente',
      signedAt: marcoDoc?.signedAt || marcoDoc?.uploadedAt || null,
      docId: marcoDoc?.docId || null,
      fileName: marcoDoc?.fileName || null
    };

    // 2. Proyectos asignados al consultor
    const pAssignments = await ProjectAssignment.find({
      $or: [{ consultorId: userId }, { userId }],
      isActive: { $ne: false }
    });

    const proyectos = [];
    for (const pa of pAssignments) {
      const prj = await Project.findOne({ projectId: pa.projectId });
      const comp = await Company.findOne({ companyId: pa.companyId });
      const mod = await Module.findOne({ moduleId: pa.moduleId });

      const signedDoc = await Expediente.findOne({
        projectId: pa.projectId,
        $or: [{ consultorId: userId }, { entityId: userId }],
        documentType: 'convenio_asignacion_proyecto',
        signatureStatus: { $in: ['firmado', 'aprobado'] }
      }).sort({ uploadedAt: -1 });

      proyectos.push({
        tipo: 'proyecto',
        projectId: pa.projectId,
        nombreProyecto: prj?.name || pa.projectId,
        empresaCliente: comp?.name || 'Cliente',
        modulo: mod?.name || pa.moduleId,
        tarifaConsultor: pa.tarifaConsultor || 0,
        horasEstimadas: prj?.maxHours || 80,
        hasSigned: !!signedDoc,
        signatureStatus: signedDoc ? (signedDoc.signatureStatus || 'firmado') : 'pendiente',
        signedAt: signedDoc?.signedAt || signedDoc?.uploadedAt || null,
        docId: signedDoc?.docId || null,
        fileName: signedDoc?.fileName || null
      });
    }

    // 3. Soportes asignados al consultor
    const sAssignments = await Assignment.find({
      userId,
      isActive: { $ne: false }
    });

    const soportes = [];
    for (const sa of sAssignments) {
      const sup = await Support.findOne({ supportId: sa.supportId });
      const comp = await Company.findOne({ companyId: sa.companyId });
      const mod = await Module.findOne({ moduleId: sa.moduleId });

      const signedDoc = await Expediente.findOne({
        supportId: sa.supportId,
        $or: [{ consultorId: userId }, { entityId: userId }],
        documentType: 'convenio_asignacion_soporte',
        signatureStatus: { $in: ['firmado', 'aprobado'] }
      }).sort({ uploadedAt: -1 });

      soportes.push({
        tipo: 'soporte',
        supportId: sa.supportId,
        nombreSoporte: sup?.name || sa.supportId,
        empresaCliente: comp?.name || 'Cliente',
        modulo: mod?.name || sa.moduleId,
        tarifaConsultor: sa.tarifaConsultor || 0,
        hasSigned: !!signedDoc,
        signatureStatus: signedDoc ? (signedDoc.signatureStatus || 'firmado') : 'pendiente',
        signedAt: signedDoc?.signedAt || signedDoc?.uploadedAt || null,
        docId: signedDoc?.docId || null,
        fileName: signedDoc?.fileName || null
      });
    }

    res.json({
      success: true,
      data: {
        contratoMarco,
        proyectos,
        soportes
      }
    });
  } catch (error) {
    console.error('Error al obtener contratos del consultor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expedientes/firmar — Subir documento firmado (Consultor o Cliente)
router.post('/firmar', async (req, res) => {
  try {
    const {
      entityType,      // 'consultor' | 'cliente' | 'proyecto' | 'soporte'
      targetId,        // projectId | supportId | userId | companyId
      documentType,    // 'convenio_asignacion_proyecto' | 'convenio_asignacion_soporte' | 'contrato_arvic' | 'contrato_proyecto'
      documentTitle,
      fileName,
      fileData,
      fileSize,
      mimeType
    } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, message: 'Se requiere el archivo firmado (fileName y fileData)' });
    }

    const userId = req.user?.userId;
    const userName = req.user?.name || req.user?.email || 'Usuario';
    const docId = `signed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let projectId = null;
    let supportId = null;
    let consultorId = null;
    let companyId = null;

    if (entityType === 'proyecto' || documentType === 'convenio_asignacion_proyecto' || documentType === 'contrato_proyecto') {
      projectId = targetId;
      if (req.user?.role === 'consultor') consultorId = userId;
      if (req.user?.role === 'cliente') companyId = req.user.companyId;
    } else if (entityType === 'soporte' || documentType === 'convenio_asignacion_soporte' || documentType === 'sow_soporte_cliente') {
      supportId = targetId;
      if (req.user?.role === 'consultor') consultorId = userId;
      if (req.user?.role === 'cliente') companyId = req.user.companyId;
    } else if (entityType === 'consultor' || documentType === 'contrato_arvic') {
      consultorId = userId;
    } else if (entityType === 'cliente' || documentType === 'contrato_marco_cliente') {
      companyId = req.user.companyId;
    }

    const newDoc = new Expediente({
      docId,
      entityType: entityType || (projectId ? 'proyecto' : supportId ? 'soporte' : 'consultor'),
      entityId: targetId || userId,
      projectId,
      supportId,
      consultorId,
      companyId,
      documentType: documentType || 'otro',
      documentTitle: documentTitle || fileName,
      fileName,
      fileData,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      status: 'vigente',
      signatureStatus: 'firmado',
      signedAt: new Date(),
      signedBy: userName,
      isDraft: false,
      uploadedAt: new Date(),
      notes: `Documento firmado cargado digitalmente por ${userName} el ${new Date().toLocaleString('es-MX')}`
    });

    await newDoc.save();

    // Disparar alertas automáticas al Administrador (in-app y correo)
    (async () => {
      try {
        const userRole = req.user?.role === 'cliente' ? 'Cliente' : req.user?.role === 'consultor' ? 'Consultor' : 'Usuario';
        let associatedProjectName = 'General';
        if (projectId) {
          const p = await Project.findOne({ projectId }, 'name');
          if (p) associatedProjectName = p.name;
        } else if (supportId) {
          const s = await Support.findOne({ supportId }, 'name');
          if (s) associatedProjectName = s.name;
        }

        await notifyAdmins({
          type: 'contract_signed',
          title: 'Documento Firmado',
          message: `${userName} (${userRole}) ha formalizado el documento: "${newDoc.documentTitle}".`,
          relatedId: newDoc.docId,
          actionUrl: 'expedientes'
        });

        await sendContractSignedNotificationToAdmin({
          signerName: userName,
          signerRole: userRole,
          documentTitle: newDoc.documentTitle,
          projectName: associatedProjectName
        });
      } catch (errNotif) {
        console.error('Error disparando alertas de contrato firmado:', errNotif.message);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Documento firmado subido y registrado exitosamente',
      data: calculateDocStatus(newDoc)
    });
  } catch (error) {
    console.error('Error al subir documento firmado:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/expedientes/:entityType/:entityId — Obtener expediente completo
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const canAccess = isAdmin(req) || req.user?.userId === entityId || req.user?.companyId === entityId;

    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Acceso denegado a este expediente' });
    }

    const docs = await Expediente.find({ entityType, entityId }).sort({ uploadedAt: -1 });
    const docsList = docs.map(d => calculateDocStatus(d));

    // Determinar documentos requeridos según entidad
    const requiredDefs = entityType === 'cliente' ? REQUIRED_DOCS_CLIENTE : REQUIRED_DOCS_CONSULTOR;

    // Mapear cada requerimiento con su documento subido (si existe)
    const checklist = requiredDefs.map(def => {
      const existing = docsList.find(d => d.documentType === def.type);
      if (existing) {
        return {
          documentType: def.type,
          documentTitle: def.title,
          isUploaded: true,
          doc: existing
        };
      }
      return {
        documentType: def.type,
        documentTitle: def.title,
        isUploaded: false,
        doc: {
          docId: null,
          documentType: def.type,
          documentTitle: def.title,
          status: 'faltante',
          fileName: null,
          validUntil: null
        }
      };
    });

    // Calcular estatus general del expediente
    const totalRequired = requiredDefs.length;
    const vigentesCount = checklist.filter(c => c.isUploaded && (c.doc.status === 'vigente' || c.doc.status === 'por_vencer')).length;
    const enRevisionCount = checklist.filter(c => c.isUploaded && c.doc.status === 'en_revision').length;
    const vencidosCount = checklist.filter(c => c.isUploaded && c.doc.status === 'vencido').length;
    const rechazadosCount = checklist.filter(c => c.isUploaded && c.doc.status === 'rechazado').length;
    const faltantesCount = checklist.filter(c => !c.isUploaded).length;

    let overallStatus = 'incompleto';
    let canInvoice = false;

    if (vencidosCount > 0) {
      overallStatus = 'con_vencidos';
    } else if (rechazadosCount > 0) {
      overallStatus = 'con_rechazados';
    } else if (faltantesCount === 0 && enRevisionCount === 0 && vencidosCount === 0 && vigentesCount === totalRequired) {
      overallStatus = 'vigente_completo';
      canInvoice = true;
    } else if (enRevisionCount > 0) {
      overallStatus = 'en_revision';
    }

    res.json({
      success: true,
      data: {
        entityType,
        entityId,
        checklist,
        rawDocs: docsList,
        summary: {
          totalRequired,
          vigentesCount,
          enRevisionCount,
          vencidosCount,
          rechazadosCount,
          faltantesCount,
          overallStatus,
          canInvoice
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener expediente' });
  }
});

// POST /api/expedientes/upload — Subir o actualizar documento
router.post('/upload', async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      documentType,
      documentTitle,
      fileName,
      fileData,
      fileSize,
      mimeType,
      notes
    } = req.body;

    const canUpload = isAdmin(req) || req.user?.userId === entityId || req.user?.companyId === entityId;
    if (!canUpload) {
      return res.status(403).json({ success: false, message: 'Acceso denegado para subir documentos a este expediente' });
    }

    if (!entityType || !entityId || !documentType || !fileName) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para subir el documento' });
    }

    // Buscar si ya existe documento de este tipo para reemplazar o versionar
    let existingDoc = await Expediente.findOne({ entityType, entityId, documentType });

    if (existingDoc) {
      existingDoc.fileName = fileName;
      if (fileData) existingDoc.fileData = fileData;
      existingDoc.fileSize = fileSize || existingDoc.fileSize;
      existingDoc.mimeType = mimeType || existingDoc.mimeType;
      existingDoc.status = 'en_revision';
      existingDoc.rejectionReason = null;
      existingDoc.uploadedAt = new Date();
      existingDoc.notes = notes || existingDoc.notes;
      existingDoc.updatedAt = new Date();
      await existingDoc.save();

      return res.json({
        success: true,
        message: 'Documento actualizado y enviado a revisión',
        data: calculateDocStatus(existingDoc)
      });
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDoc = new Expediente({
      docId,
      entityType,
      entityId,
      documentType,
      documentTitle: documentTitle || fileName,
      fileName,
      fileData: fileData || null,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/pdf',
      status: 'en_revision',
      uploadedAt: new Date(),
      notes: notes || null
    });

    await newDoc.save();

    res.status(201).json({
      success: true,
      message: 'Documento cargado exitosamente y enviado a revisión',
      data: calculateDocStatus(newDoc)
    });
  } catch (error) {
    console.error('Error al subir documento de expediente:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al cargar documento' });
  }
});

// PUT /api/expedientes/:docId/review — Revisar documento (Aprobar/Rechazar/Vigencia) (Admin)
router.put('/:docId/review', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const { docId } = req.params;
    const { status, validUntil, rejectionReason, notes } = req.body;

    const doc = await Expediente.findOne({ docId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    if (status) doc.status = status;
    
    // Si se aprueba y no se envía fecha de vigencia, asignar por defecto 1 año (365 días)
    if (status === 'vigente') {
      if (validUntil) {
        doc.validUntil = new Date(validUntil);
      } else if (!doc.validUntil) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        doc.validUntil = nextYear;
      }
      doc.rejectionReason = null;
    } else if (status === 'rechazado') {
      doc.rejectionReason = rejectionReason || 'Documento no cumple con los requisitos';
      doc.validUntil = null;
    } else if (validUntil !== undefined) {
      doc.validUntil = validUntil ? new Date(validUntil) : null;
    }

    if (notes !== undefined) doc.notes = notes;
    doc.reviewedBy = req.user.userId;
    doc.reviewedAt = new Date();
    doc.updatedAt = new Date();

    await doc.save();

    res.json({
      success: true,
      message: `Documento ${status === 'vigente' ? 'aprobado' : status === 'rechazado' ? 'rechazado' : 'actualizado'} correctamente`,
      data: calculateDocStatus(doc)
    });
  } catch (error) {
    console.error('Error al revisar documento:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al procesar revisión' });
  }
});

// GET /api/expedientes/matrix/overview — Matriz de semáforos para Admin
router.get('/matrix/overview', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const consultores = await User.find({ role: 'consultor', isActive: true }).select('userId name email');
    const allDocs = await Expediente.find({ entityType: 'consultor' });

    const matrix = consultores.map(cons => {
      const userDocs = allDocs.filter(d => d.entityId === cons.userId).map(d => calculateDocStatus(d));
      
      const docStatusMap = {};
      let totalVigentes = 0;
      let totalVencidos = 0;
      let totalEnRevision = 0;

      REQUIRED_DOCS_CONSULTOR.forEach(reqDoc => {
        const found = userDocs.find(d => d.documentType === reqDoc.type);
        if (found) {
          docStatusMap[reqDoc.type] = {
            docId: found.docId,
            status: found.status,
            validUntil: found.validUntil,
            daysUntilExpiry: found.daysUntilExpiry
          };
          if (found.status === 'vigente' || found.status === 'por_vencer') totalVigentes++;
          if (found.status === 'vencido') totalVencidos++;
          if (found.status === 'en_revision') totalEnRevision++;
        } else {
          docStatusMap[reqDoc.type] = {
            docId: null,
            status: 'faltante',
            validUntil: null
          };
        }
      });

      const canInvoice = totalVigentes === REQUIRED_DOCS_CONSULTOR.length && totalVencidos === 0;

      return {
        consultorId: cons.userId,
        consultorName: cons.name,
        email: cons.email,
        documents: docStatusMap,
        canInvoice,
        counts: {
          total: REQUIRED_DOCS_CONSULTOR.length,
          vigentes: totalVigentes,
          vencidos: totalVencidos,
          enRevision: totalEnRevision,
          faltantes: REQUIRED_DOCS_CONSULTOR.length - Object.values(docStatusMap).filter(d => d.docId).length
        }
      };
    });

    res.json({
      success: true,
      data: {
        requiredDocs: REQUIRED_DOCS_CONSULTOR,
        matrix
      }
    });
  } catch (error) {
    console.error('Error al generar matriz de expedientes:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener matriz de expedientes' });
  }
});

// POST /api/expedientes/parse-csf — Autolectura de Constancia de Situación Fiscal
router.post('/parse-csf', async (req, res) => {
  try {
    const { text, base64 } = req.body;

    if (!text && !base64) {
      return res.status(400).json({ success: false, message: 'Se requiere texto o archivo base64 para analizar la constancia' });
    }

    const content = String(text || '');
    const data = parseCSFText(content);

    res.json({
      success: true,
      message: 'Constancia analizada exitosamente',
      data
    });
  } catch (error) {
    console.error('Error al procesar CSF:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al procesar constancia fiscal' });
  }
});

function parseCSFText(text) {
  const content = String(text || '');

  // 1. RFC
  const rfcMatch = content.match(/RFC\s*:?\s*([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})/i) || content.match(/\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\b/i);
  const rfc = rfcMatch ? rfcMatch[1].toUpperCase() : null;

  // 2. Nombre / Razón Social
  let razonSocial = null;
  const nombreMatch = content.match(/Nombre\s*\(\s*s\s*\)\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Primer\s*Apellido|CURP|RFC|Fecha|\r?\n|$))/i);
  const ap1Match = content.match(/Primer\s*Apellido\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Segundo\s*Apellido|Fecha|Estatus|\r?\n|$))/i);
  const ap2Match = content.match(/Segundo\s*Apellido\s*:?\s*([A-ZÀ-ÿ\s]+?)(?=(?:Fecha|Estatus|CURP|\r?\n|$))/i);

  if (nombreMatch && ap1Match) {
    const nom = nombreMatch[1].trim();
    const ap1 = ap1Match[1].trim();
    const ap2 = ap2Match ? ap2Match[1].trim() : '';
    razonSocial = `${nom} ${ap1} ${ap2}`.replace(/\s+/g, ' ').trim();
  } else {
    const moralMatch = content.match(/(?:Denominaci[óo]n\s*\/\s*Raz[óo]n\s*Social|Denominaci[óo]n\s*o\s*Raz[óo]n\s*Social|Raz[óo]n\s*Social)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:R[ée]gimen|Capital|Fecha|Estatus|IdCIF|\r?\n|$))/i);
    if (moralMatch && !moralMatch[1].toLowerCase().includes('idcif')) {
      razonSocial = moralMatch[1].trim().replace(/\s+/g, ' ');
    }
  }

  // 3. Código Postal
  const cpMatch = content.match(/(?:C[óo]digo\s*Postal|C\.?P\.?)\s*:?\s*(\d{5})/i) || content.match(/\b(\d{5})\b/);
  const codigoPostal = cpMatch ? cpMatch[1] : null;

  // 4. Régimen Fiscal
  let regimenFiscal = null;
  const satRegimes = [
    'Régimen de las Personas Físicas con Actividades Empresariales y Profesionales',
    'Personas Físicas con Actividades Empresariales y Profesionales',
    'Régimen Simplificado de Confianza',
    'Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios',
    'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    'Régimen de Arrendamiento',
    'Régimen de Incorporación Fiscal',
    'Régimen General de Ley Personas Morales',
    'Personas Morales con Fines no Lucrativos',
    'Régimen de Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
    'Régimen de los ingresos por Dividendos',
    'Régimen de los ingresos por intereses',
    'Régimen de los ingresos por obtención de premios'
  ];

  for (const reg of satRegimes) {
    if (new RegExp(reg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)) {
      regimenFiscal = reg;
      break;
    }
  }

  if (!regimenFiscal) {
    const regSection = content.match(/(?:Reg[íi]menes\s*:?|R[ée]gimen\s*:?)(?:[\s\S]*?)(?:Fecha\s*Inicio\s*Fecha\s*Fin\s*)?([A-ZÀ-ÿ0-9\s\-–,.]+?)(?:\s+\d{2}\/\d{2}\/\d{4}|\r?\n|$)/i);
    if (regSection) {
      let candidate = regSection[1].replace(/Fecha\s*Inicio|Fecha\s*Fin/gi, '').trim();
      candidate = candidate.replace(/\s+/g, ' ');
      if (candidate.length > 5 && candidate.length < 100) {
        regimenFiscal = candidate;
      }
    }
  }

  // 5. Vialidad / Calle
  let calleFiscal = null;
  const calleMatch = content.match(/Nombre\s*de\s*(?:la\s*)?Vialidad\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:N[úu]mero|Tipo|Entre|Y\s*Calle|\r?\n|$))/i) ||
                     content.match(/(?:Calle|Vialidad)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:N[úu]mero|Num|\r?\n|$))/i);
  if (calleMatch) {
    calleFiscal = calleMatch[1].trim().replace(/\s+/g, ' ');
  }

  // 6. Número Exterior
  let numExtFiscal = null;
  const numExtMatch = content.match(/N[úu]mero\s*(?:y\/o\s*letra\s*)?Exterior\s*:?\s*([A-Z0-9\s\-/]+?)(?=(?:N[úu]mero\s*Interior|Nombre|Entre|\r?\n|$))/i) ||
                      content.match(/(?:Num\.?\s*Ext\.?|No\.\s*Ext\.?)\s*:?\s*([A-Z0-9\s\-/]{1,20}?)(?:\r?\n|$)/i);
  if (numExtMatch) numExtFiscal = numExtMatch[1].trim();

  // 7. Número Interior
  let numIntFiscal = null;
  const numIntMatch = content.match(/N[úu]mero\s*(?:y\/o\s*letra\s*)?Interior\s*:?\s*([A-Z0-9\s\-/]+?)(?=(?:Nombre\s*de\s*la\s*Colonia|Nombre|Entre|\r?\n|$))/i) ||
                      content.match(/(?:Num\.?\s*Int\.?|No\.\s*Int\.?)\s*:?\s*([A-Z0-9\s\-/]{1,20}?)(?:\r?\n|$)/i);
  if (numIntMatch && !numIntMatch[1].toLowerCase().includes('nombre')) {
    numIntFiscal = numIntMatch[1].trim();
  }

  // 8. Colonia
  let coloniaFiscal = null;
  const colMatch = content.match(/Nombre\s*de\s*la\s*Colonia\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Nombre\s*de\s*la\s*Localidad|Nombre\s*del\s*Municipio|Entre|\r?\n|$))/i) ||
                   content.match(/Colonia\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Municipio|Localidad|\r?\n|$))/i);
  if (colMatch) coloniaFiscal = colMatch[1].trim().replace(/\s+/g, ' ');

  // 9. Municipio / Alcaldía
  let municipioFiscal = null;
  const munMatch = content.match(/Nombre\s*del\s*Municipio\s*o\s*Demarcaci[óo]n\s*Territorial\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Nombre\s*de\s*la\s*Entidad|Nombre|Entre|\r?\n|$))/i) ||
                   content.match(/(?:Municipio|Alcald[íi]a)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Entidad|Estado|\r?\n|$))/i);
  if (munMatch) municipioFiscal = munMatch[1].trim().replace(/\s+/g, ' ');

  // 10. Estado / Entidad Federativa
  let estadoFiscal = null;
  const edoMatch = content.match(/Nombre\s*de\s*la\s*Entidad\s*Federativa\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]+?)(?=(?:Entre|Y\s*Calle|Reg[íi]menes|\r?\n|$))/i) ||
                   content.match(/(?:Entidad\s*Federativa|Estado)\s*:?\s*([A-ZÀ-ÿ0-9\s,.\-&]{2,80}?)(?=(?:Entre|Y\s*Calle|\r?\n|$))/i);
  if (edoMatch) estadoFiscal = edoMatch[1].trim().replace(/\s+/g, ' ');

  return {
    rfc,
    razonSocial,
    regimenFiscal,
    codigoPostalFiscal: codigoPostal,
    calleFiscal,
    numExtFiscal,
    numIntFiscal,
    coloniaFiscal,
    municipioFiscal,
    estadoFiscal
  };
}

router.parseCSFText = parseCSFText;
router.calculateDocStatus = calculateDocStatus;
router.REQUIRED_DOCS_CONSULTOR = REQUIRED_DOCS_CONSULTOR;
router.REQUIRED_DOCS_CLIENTE = REQUIRED_DOCS_CLIENTE;

module.exports = router;
module.exports.parseCSFText = parseCSFText;
module.exports.calculateDocStatus = calculateDocStatus;
module.exports.REQUIRED_DOCS_CONSULTOR = REQUIRED_DOCS_CONSULTOR;
module.exports.REQUIRED_DOCS_CLIENTE = REQUIRED_DOCS_CLIENTE;
