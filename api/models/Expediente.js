const mongoose = require('mongoose');

const expedienteSchema = new mongoose.Schema({
  docId: {
    type: String,
    required: true,
    unique: true
  },
  entityType: {
    type: String,
    enum: ['consultor', 'cliente', 'proyecto', 'soporte', 'machote'],
    required: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  entityName: {
    type: String,
    default: ''
  },
  projectId: {
    type: String,
    default: null,
    index: true
  },
  supportId: {
    type: String,
    default: null,
    index: true
  },
  consultorId: {
    type: String,
    default: null,
    index: true
  },
  companyId: {
    type: String,
    default: null,
    index: true
  },
  category: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  signatureStatus: {
    type: String,
    enum: ['no_requiere', 'pendiente', 'firmado', 'aprobado'],
    default: 'pendiente'
  },
  signedAt: {
    type: Date,
    default: null
  },
  signedBy: {
    type: String,
    default: null
  },
  documentType: {
    type: String,
    enum: [
      'ine',
      'curp',
      'csf',
      'domicilio',
      'cv',
      'caratula_bancaria',
      'opinion_32d',
      'contrato_arvic',
      'contrato_proyecto',
      'contrato_soporte',
      'contrato_marco_cliente',
      'anexo_sow',
      'convenio_asignacion_proyecto',
      'convenio_asignacion_soporte',
      'sow_soporte_cliente',
      'especificacion_tecnica',
      'nda',
      'acta_entrega',
      'plantilla_contrato_consultor',
      'plantilla_convenio_proyecto',
      'plantilla_convenio_soporte',
      'plantilla_nda',
      'plantilla_contrato_cliente',
      'plantilla_sow_cliente',
      'plantilla_sow_soporte',
      'otro'
    ],
    required: true
  },
  documentTitle: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileData: {
    type: String, // Base64 encoding for embedded storage
    default: null
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['faltante', 'en_revision', 'vigente', 'por_vencer', 'vencido', 'rechazado'],
    default: 'en_revision'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Expediente', expedienteSchema);
