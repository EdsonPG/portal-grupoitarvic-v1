const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: String, // String like 'user123' or 'admin' 
    required: true
  },
  receiverId: {
    type: String, // 'admin' if sent by consultant, or specific userId if sent by admin
    required: true
  },
  message: {
    type: String,
    required: false // Optional if there's only an attachment
  },
  attachment: {
    type: String, // Base64 or URL
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  reportId: {
    type: String, // Referencia opcional a un Timesheet (Report)
    required: false
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for fast chat queries
chatMessageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });
chatMessageSchema.index({ receiverId: 1, read: 1, reportId: 1 });
chatMessageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
