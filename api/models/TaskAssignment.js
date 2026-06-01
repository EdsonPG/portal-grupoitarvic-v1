const mongoose = require('mongoose');

const taskAssignmentSchema = new mongoose.Schema({
  taskAssignmentId: {
    type: String,
    required: true,
    unique: true
  },
  consultorId: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true
  },
  linkedSupportId: {
    type: String,
    required: false,
    default: null  // null para tareas independientes
  },
  moduleId: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  tarifaConsultor: {
    type: Number,
    default: 0
  },
  tarifaCliente: {
    type: Number,
    default: 0
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

// Indexes for fast queries
taskAssignmentSchema.index({ consultorId: 1, isActive: 1 });

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);