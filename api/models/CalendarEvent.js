const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['meeting', 'task', 'reminder', 'conference'],
    default: 'meeting'
  },
  createdBy: {
    type: String,
    required: true
  },
  attendees: [{
    userId: String,
    name: String,
    email: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  meetingLink: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#0ea5e9'
  },
  location: {
    type: String,
    default: ''
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  relatedProjectId: {
    type: String
  },
  relatedCompanyId: {
    type: String
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ createdBy: 1 });
calendarEventSchema.index({ 'attendees.userId': 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
