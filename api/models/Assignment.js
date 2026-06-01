const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true
  },
  supportId: {
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
assignmentSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);