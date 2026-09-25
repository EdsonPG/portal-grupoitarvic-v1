const mongoose = require('mongoose');

const billingItemSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  consultorId: {
    type: String,
    required: true
  },
  consultorNombre: {
    type: String,
    required: true
  },
  assignmentType: {
    type: String,
    enum: ['support', 'project', 'task'],
    required: true
  },
  supportId: { type: String, default: null },
  supportName: { type: String, default: null },
  projectId: { type: String, default: null },
  projectName: { type: String, default: null },
  moduleId: { type: String, default: null },
  moduleName: { type: String, default: null },
  ticket: { type: String, default: '' },
  description: { type: String, default: '' },
  hours: {
    type: Number,
    required: true,
    min: 0
  },
  rateClient: {
    type: Number,
    required: true,
    default: 0
  },
  rateConsultant: {
    type: Number,
    required: true,
    default: 0
  },
  amountClient: {
    type: Number,
    required: true,
    default: 0
  },
  amountConsultant: {
    type: Number,
    required: true,
    default: 0
  },
  margin: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

const billingPeriodSchema = new mongoose.Schema({
  periodId: {
    type: String,
    required: true,
    unique: true
  },
  companyId: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  rfc: {
    type: String,
    default: ''
  },
  periodType: {
    type: String,
    enum: ['quincenal', 'mensual', 'custom', 'q1', 'q2', 'month', 'Quincenal', 'Mensual', 'Personalizado'],
    default: 'quincenal'
  },
  periodName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Borrador', 'Conciliado', 'Facturado', 'Cerrado'],
    default: 'Borrador'
  },
  totalHours: {
    type: Number,
    required: true,
    default: 0
  },
  totalClient: {
    type: Number,
    required: true,
    default: 0
  },
  totalConsultant: {
    type: Number,
    required: true,
    default: 0
  },
  grossMargin: {
    type: Number,
    required: true,
    default: 0
  },
  marginPercentage: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'MXN'
  },
  reportIds: [{
    type: String
  }],
  items: [billingItemSchema],
  invoiceFolio: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  closedBy: {
    type: String,
    default: null
  },
  closedAt: {
    type: Date,
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

billingPeriodSchema.index({ companyId: 1, startDate: -1 });
billingPeriodSchema.index({ status: 1 });

module.exports = mongoose.model('BillingPeriod', billingPeriodSchema);
