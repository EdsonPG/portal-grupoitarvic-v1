const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const jwt = require('jsonwebtoken');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function visibleEventsFilter(req) {
  if (isAdmin(req)) return {};
  return {
    $or: [
      { createdBy: req.user.userId },
      { 'attendees.userId': req.user.userId }
    ]
  };
}

function mergeWithAnd(...filters) {
  const cleanFilters = filters.filter(filter => filter && Object.keys(filter).length > 0);
  if (cleanFilters.length === 0) return {};
  if (cleanFilters.length === 1) return cleanFilters[0];
  return { $and: cleanFilters };
}

function canViewEvent(req, event) {
  return isAdmin(req) ||
    event.createdBy === req.user.userId ||
    event.attendees.some(attendee => attendee.userId === req.user.userId);
}

function canManageEvent(req, event) {
  return isAdmin(req) || event.createdBy === req.user.userId;
}

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// ==========================================
// GET /api/calendar/events
// Query params: start, end (ISO dates), userId (optional)
// ==========================================
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { start, end, userId } = req.query;
    const dateQuery = {};

    if (start && end) {
      dateQuery.$or = [
        { startDate: { $gte: new Date(start), $lte: new Date(end) } },
        { endDate: { $gte: new Date(start), $lte: new Date(end) } },
        { startDate: { $lte: new Date(start) }, endDate: { $gte: new Date(end) } }
      ];
    }

    let userFilter = {};
    if (userId) {
      if (!isAdmin(req) && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'No tienes permisos para consultar eventos de este usuario' });
      }
      userFilter = {
        $or: [
          { createdBy: userId },
          { 'attendees.userId': userId }
        ]
      };
    }

    const query = mergeWithAnd(dateQuery, visibleEventsFilter(req), userFilter);
    const events = await CalendarEvent.find(query).sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET /api/calendar/events/:id
// ==========================================
router.get('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ eventId: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    if (!canViewEvent(req, event)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para consultar este evento' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/calendar/events
// ==========================================
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, startDate, endDate, allDay, type, attendees, meetingLink, color, location, relatedProjectId, relatedCompanyId, notes } = req.body;
    
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos: title, startDate, endDate' });
    }

    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newEvent = new CalendarEvent({
      eventId,
      title,
      description: description || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: allDay || false,
      type: type || 'meeting',
      createdBy: req.user.userId,
      attendees: attendees || [],
      meetingLink: meetingLink || '',
      color: color || '#0ea5e9',
      location: location || '',
      relatedProjectId,
      relatedCompanyId,
      notes: notes || ''
    });

    await newEvent.save();
    res.json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PUT /api/calendar/events/:id
// ==========================================
router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ eventId: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    if (!canManageEvent(req, event)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para modificar este evento' });
    }

    const allowedFields = ['title', 'description', 'startDate', 'endDate', 'allDay', 'type', 'attendees', 'meetingLink', 'color', 'location', 'relatedProjectId', 'relatedCompanyId', 'notes'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate') {
          event[field] = new Date(req.body[field]);
        } else {
          event[field] = req.body[field];
        }
      }
    });

    await event.save();
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DELETE /api/calendar/events/:id
// ==========================================
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ eventId: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    if (!canManageEvent(req, event)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar este evento' });
    }

    await CalendarEvent.deleteOne({ eventId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/calendar/events/:id/rsvp
// Update attendance status for the authenticated user
// ==========================================
router.post('/events/:id/rsvp', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'declined'
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status inválido' });
    }

    const event = await CalendarEvent.findOne({ eventId: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    if (!canViewEvent(req, event)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para responder a este evento' });
    }

    const attendee = event.attendees.find(a => a.userId === req.user.userId);
    if (attendee) {
      attendee.status = status;
    } else {
      return res.status(403).json({ success: false, message: 'Solo los invitados pueden responder asistencia' });
    }

    await event.save();
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GET /api/calendar/day-summary/:date
// Get daily summary: events + reports/timesheets for that day
// ==========================================
router.get('/day-summary/:date', authenticateToken, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get events for that day
    const dateEventsQuery = {
      $or: [
        { startDate: { $gte: startOfDay, $lte: endOfDay } },
        { endDate: { $gte: startOfDay, $lte: endOfDay } },
        { startDate: { $lte: startOfDay }, endDate: { $gte: endOfDay } }
      ]
    };

    const events = await CalendarEvent.find(mergeWithAnd(dateEventsQuery, visibleEventsFilter(req))).sort({ startDate: 1 });

    // Get reports/timesheets for that day
    let reports = [];
    try {
      const Report = require('../models/Report');
      const reportDateQuery = {
        $or: [
          { date: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } }
        ]
      };
      const reportScope = isAdmin(req) ? {} : { userId: req.user.userId };
      reports = await Report.find(mergeWithAnd(reportDateQuery, reportScope)).sort({ createdAt: 1 });
    } catch (e) {
      // Report model might not have fecha field, fallback silently
    }

    // Calculate total hours from reports
    let totalHours = 0;
    const consultorSummary = {};
    
    reports.forEach(r => {
      const hours = parseFloat(r.horasTrabajadas || r.hours || 0);
      totalHours += hours;
      
      const consultorId = r.consultorId || r.userId;
      if (consultorId) {
        if (!consultorSummary[consultorId]) {
          consultorSummary[consultorId] = {
            userId: consultorId,
            name: r.consultorNombre || consultorId,
            totalHours: 0,
            tasks: []
          };
        }
        consultorSummary[consultorId].totalHours += hours;
        consultorSummary[consultorId].tasks.push({
          description: r.descripcion || r.description || 'Sin descripción',
          hours: hours,
          status: r.estado || 'Pendiente',
          project: r.projectName || r.proyectoNombre || ''
        });
      }
    });

    res.json({
      success: true,
      data: {
        date: req.params.date,
        events,
        reports,
        totalHours,
        consultorSummary: Object.values(consultorSummary)
      }
    });
  } catch (error) {
    console.error('Error fetching day summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/calendar/events/:id/invite
// Send email invitations to attendees
// ==========================================
router.post('/events/:id/invite', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ eventId: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    if (!canManageEvent(req, event)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para enviar invitaciones de este evento' });
    }

    // Create notifications for each attendee
    const Notification = require('../models/Notification');
    const notifications = [];

    for (const attendee of event.attendees) {
      if (attendee.userId !== req.user.userId) {
        const notif = new Notification({
          notificationId: `CAL-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          userId: attendee.userId,
          type: 'system',
          title: 'Invitación a Reunión',
          message: `${req.user.name || req.user.userId} te ha invitado a: ${event.title}`,
          icon: 'fa-solid fa-calendar-check'
        });
        notifications.push(notif.save());
      }
    }

    await Promise.all(notifications);

    // Try to send email invitations if mailer is available
    try {
      const nodemailer = require('nodemailer');
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const startStr = new Date(event.startDate).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
        const endStr = new Date(event.endDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        for (const attendee of event.attendees) {
          if (attendee.email && attendee.userId !== req.user.userId) {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: attendee.email,
              subject: `📅 Invitación: ${event.title}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;color:white;">
                    <h2 style="margin:0 0 4px 0;">📅 ${event.title}</h2>
                    <p style="margin:0;opacity:0.8;font-size:14px;">${event.type === 'conference' ? 'Conferencia' : 'Reunión'}</p>
                  </div>
                  <div style="padding:24px;">
                    <p><strong>📆 Fecha:</strong> ${startStr} — ${endStr}</p>
                    ${event.location ? `<p><strong>📍 Lugar:</strong> ${event.location}</p>` : ''}
                    ${event.description ? `<p><strong>📝 Descripción:</strong> ${event.description}</p>` : ''}
                    ${event.meetingLink ? `<p><a href="${event.meetingLink}" style="display:inline-block;background:#0ea5e9;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">🔗 Unirse a la reunión</a></p>` : ''}
                    <p style="color:#64748b;font-size:13px;">Organizado por: ${req.user.name || req.user.userId}</p>
                  </div>
                </div>
              `
            });
          }
        }
      }
    } catch(emailErr) {
      console.warn('Email invitations could not be sent:', emailErr.message);
    }

    res.json({ success: true, message: `${event.attendees.length} invitaciones enviadas` });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
