const mongoose = require('mongoose');

const projectAssignmentSchema = new mongoose.Schema({
  projectAssignmentId: {
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
  projectId: {
    type: String,
    required: true
  },
  moduleId: {
    type: String,
    required: true
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
  }
});

// Indexes for fast queries
projectAssignmentSchema.index({ consultorId: 1, isActive: 1 });

module.exports = mongoose.model('ProjectAssignment', projectAssignmentSchema);