const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  // Datos Fiscales SAT
  rfc: {
    type: String,
    default: null
  },
  razonSocial: {
    type: String,
    default: null
  },
  regimenFiscal: {
    type: String,
    default: null
  },
  codigoPostalFiscal: {
    type: String,
    default: null
  },
  calleFiscal: {
    type: String,
    default: null
  },
  numExtFiscal: {
    type: String,
    default: null
  },
  numIntFiscal: {
    type: String,
    default: null
  },
  coloniaFiscal: {
    type: String,
    default: null
  },
  municipioFiscal: {
    type: String,
    default: null
  },
  estadoFiscal: {
    type: String,
    default: null
  },
  paisFiscal: {
    type: String,
    default: 'México'
  },
  // Contacto Autorizado Principal
  contactName: {
    type: String,
    default: null
  },
  contactEmail: {
    type: String,
    default: null
  },
  contactPhone: {
    type: String,
    default: null
  },
  contactPosition: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Company', companySchema);