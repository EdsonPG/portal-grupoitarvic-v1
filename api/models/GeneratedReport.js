const mongoose = require('mongoose');

const generatedReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  fileName: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    required: true
  },
  generatedBy: {
    type: String,
    default: 'Hector Perez'
  },
  dateRange: {
    type: String,
    required: true
  },
  recordCount: {
    type: Number,
    default: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownload: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GeneratedReport', generatedReportSchema);
