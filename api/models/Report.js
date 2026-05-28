const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  assignmentId: {
    type: String,
    required: true
  },
  assignmentType: {
    type: String,
    enum: ['support', 'project', 'task'],
    required: true
  },
  companyId: {
    type: String,
    required: true
  },
  supportId: {
    type: String,
    required: false,
    default: null
  },
  projectId: {
    type: String,
    required: false,
    default: null
  },
  moduleId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  title: { 
    type: String 
  },
  status: {
    type: String,
    enum: ['Borrador', 'Pendiente', 'Aprobado', 'Rechazado', 'Resubmitted'],
    default: 'Pendiente'
  },
  feedback: {
    type: String,
    required: false,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resubmittedAt: {
    type: Date,
    required: false,
    default: null
  }
});

module.exports = mongoose.model('Report', reportSchema);