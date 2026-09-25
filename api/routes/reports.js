const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const { createAndEmitNotification, notifyAdmins, notifyCompanyClients } = require('../utils/notificationService');
const { sendReportStatusEmail } = require('../utils/mailer');
const ADMIN_STATUSES = ['Aprobado', 'Rechazado'];
const CONSULTOR_EDITABLE_STATUSES = ['Borrador', 'Pendiente', 'Resubmitted'];

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function isCliente(req) {
  return req.user?.role === 'cliente';
}

function ownsReport(req, report) {
  if (isCliente(req)) {
    return report?.companyId === req.user?.companyId;
  }
  return report?.userId === req.user?.userId;
}

function applyReportFilters(req, query, options = {}) {
  const allowedFilters = options.allowUserFilter
    ? ['userId', 'companyId', 'assignmentId', 'assignmentType', 'status']
    : ['companyId', 'assignmentId', 'assignmentType', 'status'];

  allowedFilters.forEach(filter => {
    if (req.query[filter]) {
      query[filter] = req.query[filter];
    }
  });
  return query;
}

async function findScopedReport(req, reportId) {
  const report = await Report.findOne({ reportId });
  if (!report) return null;

  if (!isAdmin(req) && !ownsReport(req, report)) {
    const error = new Error('No tienes permisos para acceder a este reporte');
    error.statusCode = 403;
    throw error;
  }

  return report;
}

// GET todos los reportes
router.get('/', async (req, res) => {
  try {
    let query;
    if (isAdmin(req)) {
      query = applyReportFilters(req, {}, { allowUserFilter: true });
    } else if (isCliente(req)) {
      query = applyReportFilters(req, { companyId: req.user.companyId, status: { $ne: 'Borrador' } });
    } else {
      query = applyReportFilters(req, { userId: req.user.userId });
    }

    const reports = await Report.find(query).sort({ date: -1 });

    if (isCliente(req)) {
      // Regla de privacidad: Ocultar ID de consultores para proteger privacidad interna
      const sanitized = reports.map(r => {
        const doc = r.toObject();
        delete doc.userId;
        return doc;
      });
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('❌ Error obteniendo reportes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// GET reporte por ID
router.get('/:id', async (req, res) => {
  try {
    const report = await findScopedReport(req, req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('❌ Error obteniendo reporte:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// GET reportes por usuario
router.get('/user/:userId', async (req, res) => {
  try {
    if (!isAdmin(req) && req.user.userId !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para consultar reportes de este usuario' });
    }

    const reports = await Report.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('❌ Error obteniendo reportes del usuario:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET reportes por compañía
router.get('/company/:companyId', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    }

    const reports = await Report.find({ companyId: req.params.companyId }).sort({ date: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('❌ Error obteniendo reportes de la compañía:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear reporte
router.post('/', async (req, res) => {
  if (isCliente(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Los clientes tienen acceso de solo lectura' });
  }

  try {
    const reportData = req.body;

    if (!isAdmin(req)) {
      if (reportData.userId && reportData.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'No puedes crear reportes para otro usuario' });
      }

      if (reportData.status && ADMIN_STATUSES.includes(reportData.status)) {
        return res.status(403).json({ success: false, message: 'No puedes crear reportes con estado administrativo' });
      }

      reportData.userId = req.user.userId;
    }
    
    console.log('📥 Datos recibidos para crear reporte:', reportData);
    
    if (!reportData.reportId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El campo reportId es requerido' 
      });
    }

    const existingReport = await Report.findOne({ reportId: reportData.reportId });
    
    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe un reporte con ese ID' 
      });
    }

    // Prevención de duplicidad de reportes (Doble clic o duplicado idéntico)
    if (reportData.date && reportData.hours) {
      const targetDate = new Date(reportData.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Detectar doble clic inmediato (mismo usuario, asignación y horas en los últimos 6 segundos)
      const sixSecondsAgo = new Date(Date.now() - 6000);
      const recentSubmission = await Report.findOne({
        userId: reportData.userId,
        assignmentId: reportData.assignmentId,
        hours: Number(reportData.hours),
        createdAt: { $gte: sixSecondsAgo }
      });

      if (recentSubmission) {
        return res.status(409).json({
          success: false,
          message: 'Solicitud duplicada detectada. Tu reporte ya fue registrado exitosamente hace un instante.',
          reportId: recentSubmission.reportId
        });
      }

      // 2. Detectar reporte idéntico preexistente en la misma fecha (no rechazado)
      const duplicateFilter = {
        userId: reportData.userId,
        assignmentId: reportData.assignmentId,
        date: { $gte: startOfDay, $lte: endOfDay },
        hours: Number(reportData.hours),
        status: { $ne: 'Rechazado' }
      };

      if (reportData.description && reportData.description.trim()) {
        duplicateFilter.description = reportData.description.trim();
      }

      const duplicateReport = await Report.findOne(duplicateFilter);
      if (duplicateReport) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un reporte registrado de ${reportData.hours}h para esta asignación en la fecha indicada. Si necesitas ajustar las horas, puedes editar el reporte existente.`,
          reportId: duplicateReport.reportId
        });
      }

      // 3. Validar límite físico de 24 horas diarias por consultor
      const dayReports = await Report.find({
        userId: reportData.userId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'Rechazado' }
      });
      const totalDayHours = dayReports.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
      if (totalDayHours + Number(reportData.hours) > 24) {
        return res.status(400).json({
          success: false,
          message: `El total de horas acumuladas para esta fecha (${totalDayHours}h registradas + ${reportData.hours}h nuevas = ${totalDayHours + Number(reportData.hours)}h) excede el límite máximo de 24 horas diarias.`
        });
      }
    }

    const report = new Report(reportData);
    await report.save();

    console.log('✅ Reporte creado:', report.reportId);

    // Trigger SSE real-time broadcast
    try {
      const chatRouter = require('./chat');
      if (chatRouter && typeof chatRouter.broadcastSSE === 'function') {
        chatRouter.broadcastSSE('timesheet_updated', {
          userId: report.userId,
          reportId: report.reportId,
          status: report.status,
          action: 'create'
        });
      }
    } catch (sseErr) {
      console.error('Error sending SSE for create report:', sseErr);
    }

    // Disparar notificaciones in-app
    (async () => {
      try {
        if (report.status !== 'Borrador') {
          const creator = await User.findOne({ userId: report.userId }, 'name');
          const creatorName = creator?.name || report.userId;
          const serviceName = report.title || 'Servicio/Proyecto';

          await notifyAdmins({
            type: 'report_created',
            title: 'Nuevo reporte de horas',
            message: `${creatorName} registró ${report.hours}h en "${serviceName}" para revisión.`,
            relatedId: report.reportId,
            actionUrl: 'reportes'
          });

          if (report.companyId) {
            await notifyCompanyClients(report.companyId, {
              type: 'report_created',
              title: 'Nuevas horas reportadas',
              message: `Se han registrado ${report.hours}h de servicio en "${serviceName}" para validación.`,
              relatedId: report.reportId,
              actionUrl: 'horas'
            });
          }
        }
      } catch (notifErr) {
        console.error('Error disparando notificaciones al crear reporte:', notifErr.message);
      }
    })();

    res.status(201).json({ 
      success: true, 
      message: 'Reporte creado exitosamente',
      data: report 
    });
  } catch (error) {
    console.error('❌ Error creando reporte:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Error al crear reporte' 
    });
  }
});

// PUT actualizar múltiples reportes
router.put('/mass-update', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
  }

  try {
    const { reportIds, status } = req.body;
    
    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Arreglo de reportIds es requerido' });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: 'El estado es requerido' });
    }

    console.log(`📝 Actualización masiva de reportes. IDs: ${reportIds.length}, Estado: ${status}`);

    const affectedReports = await Report.find({ reportId: { $in: reportIds } });

    const lockedReports = affectedReports.filter(r => r.periodLocked || r.billingStatus === 'Cerrado');
    if (lockedReports.length > 0) {
      return res.status(403).json({
        success: false,
        message: `No se pueden modificar ${lockedReports.length} reporte(s) porque pertenecen a periodos cerrados y congelados.`
      });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'Resubmitted') {
      updateData.resubmittedAt = new Date();
    }

    const result = await Report.updateMany(
      { reportId: { $in: reportIds } },
      { $set: updateData }
    );

    console.log(`✅ Reportes actualizados: ${result.modifiedCount}`);

    // Trigger SSE real-time broadcast
    try {
      const chatRouter = require('./chat');
      if (chatRouter && typeof chatRouter.broadcastSSE === 'function') {
        chatRouter.broadcastSSE('timesheet_updated', {
          reportIds,
          status,
          action: 'mass-update'
        });
      }
    } catch (sseErr) {
      console.error('Error sending SSE for mass update:', sseErr);
    }

    // Disparar notificaciones y correos a consultores afectados
    (async () => {
      try {
        if (!affectedReports.length) return;

        const userGroups = {};
        affectedReports.forEach(r => {
          if (!userGroups[r.userId]) {
            userGroups[r.userId] = { hours: 0, count: 0 };
          }
          userGroups[r.userId].hours += (r.hours || 0);
          userGroups[r.userId].count += 1;
        });

        for (const [uId, group] of Object.entries(userGroups)) {
          const userDoc = await User.findOne({ userId: uId }, 'name email');
          const uName = userDoc?.name || uId;
          const uEmail = userDoc?.email;

          const notifType = status === 'Aprobado' ? 'report_approved' : status === 'Rechazado' ? 'report_rejected' : 'system';
          const notifTitle = status === 'Aprobado' ? 'Horas Aprobadas' : 'Reporte con Observaciones';
          const notifMsg = `Se han ${status.toLowerCase()} ${group.hours} hora(s) correspondientes a ${group.count} reporte(s).`;

          await createAndEmitNotification({
            userId: uId,
            type: notifType,
            title: notifTitle,
            message: notifMsg,
            actionUrl: 'horas'
          });

          if (uEmail && (status === 'Aprobado' || status === 'Rechazado')) {
            await sendReportStatusEmail({
              toEmail: uEmail,
              userName: uName,
              status,
              hours: group.hours,
              projectName: `${group.count} reporte(s) evaluados`,
              feedback: null
            });
          }
        }
      } catch (errMassNotif) {
        console.error('Error enviando notificaciones en mass-update:', errMassNotif.message);
      }
    })();

    res.json({
      success: true,
      message: `${result.modifiedCount} reportes actualizados exitosamente`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error en actualización masiva:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error en actualización masiva'
    });
  }
});

// PUT actualizar reporte
router.put('/:id', async (req, res) => {
  if (isCliente(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Los clientes tienen acceso de solo lectura' });
  }

  try {
    const existingReport = await findScopedReport(req, req.params.id);
    if (!existingReport) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }

    if (existingReport.periodLocked || existingReport.billingStatus === 'Cerrado') {
      return res.status(403).json({
        success: false,
        message: 'No es posible modificar este reporte porque pertenece a un periodo de facturación cerrado y congelado.'
      });
    }

    const updates = { ...req.body };

    if (!isAdmin(req)) {
      delete updates.userId;
      delete updates.feedback;

      if (updates.status && !CONSULTOR_EDITABLE_STATUSES.includes(updates.status)) {
        return res.status(403).json({ success: false, message: 'No puedes asignar ese estado al reporte' });
      }
    }

    updates.updatedAt = new Date();
    
    // Si el reporte se está resubmitiendo, actualizar fecha
    if (updates.status === 'Resubmitted') {
      updates.resubmittedAt = new Date();
    }
    
    console.log('📝 Actualizando reporte:', req.params.id, updates);
    
    const report = await Report.findOneAndUpdate(
      { reportId: req.params.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }

    console.log('✅ Reporte actualizado');

    // Trigger SSE real-time broadcast
    try {
      const chatRouter = require('./chat');
      if (chatRouter && typeof chatRouter.broadcastSSE === 'function') {
        chatRouter.broadcastSSE('timesheet_updated', {
          userId: report.userId,
          reportId: report.reportId,
          status: report.status,
          action: 'update'
        });
      }
    } catch (sseErr) {
      console.error('Error sending SSE for update report:', sseErr);
    }

    // Disparar notificaciones y correos según cambio de estado
    (async () => {
      try {
        const previousStatus = existingReport.status;
        const newStatus = report.status;

        if (previousStatus !== newStatus) {
          const userDoc = await User.findOne({ userId: report.userId }, 'name email');
          const uName = userDoc?.name || report.userId;
          const uEmail = userDoc?.email;
          const serviceName = report.title || 'Servicio';

          if (newStatus === 'Aprobado' || newStatus === 'Rechazado') {
            const notifType = newStatus === 'Aprobado' ? 'report_approved' : 'report_rejected';
            const notifTitle = newStatus === 'Aprobado' ? 'Horas Aprobadas' : 'Reporte con Observaciones';
            const notifMsg = newStatus === 'Aprobado'
              ? `Tu reporte de ${report.hours}h en "${serviceName}" ha sido aprobado.`
              : `Tu reporte de ${report.hours}h en "${serviceName}" fue rechazado. Motivo: ${report.feedback || 'Sin observaciones especificadas.'}`;

            await createAndEmitNotification({
              userId: report.userId,
              type: notifType,
              title: notifTitle,
              message: notifMsg,
              relatedId: report.reportId,
              actionUrl: 'horas'
            });

            if (uEmail) {
              await sendReportStatusEmail({
                toEmail: uEmail,
                userName: uName,
                status: newStatus,
                hours: report.hours,
                projectName: serviceName,
                feedback: report.feedback,
                date: report.date
              });
            }
          } else if (newStatus === 'Resubmitted') {
            await notifyAdmins({
              type: 'report_resubmitted',
              title: 'Reporte Reenviado',
              message: `${uName} reenvió su reporte de ${report.hours}h en "${serviceName}" para revisión.`,
              relatedId: report.reportId,
              actionUrl: 'reportes'
            });
          }
        }
      } catch (notifSingleErr) {
        console.error('Error disparando notificación en PUT /:id:', notifSingleErr.message);
      }
    })();

    res.json({ 
      success: true, 
      message: 'Reporte actualizado exitosamente',
      data: report 
    });
  } catch (error) {
    console.error('❌ Error actualizando reporte:', error);
    res.status(error.statusCode || 400).json({ 
      success: false, 
      message: error.message || 'Error al actualizar reporte' 
    });
  }
});

// DELETE eliminar reporte
router.delete('/:id', async (req, res) => {
  if (isCliente(req)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Los clientes tienen acceso de solo lectura' });
  }

  try {
    console.log('🗑️ Eliminando reporte:', req.params.id);
    
    const existingReport = await findScopedReport(req, req.params.id);
    if (!existingReport) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }

    if (existingReport.periodLocked || existingReport.billingStatus === 'Cerrado') {
      return res.status(403).json({
        success: false,
        message: 'No es posible eliminar este reporte porque pertenece a un periodo de facturación cerrado y congelado.'
      });
    }

    if (!isAdmin(req) && existingReport.status === 'Aprobado') {
      return res.status(403).json({ success: false, message: 'No puedes eliminar reportes aprobados' });
    }

    const report = await Report.findOneAndDelete({ reportId: req.params.id });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
    }
    
    console.log('✅ Reporte eliminado');

    // Trigger SSE real-time broadcast
    try {
      const chatRouter = require('./chat');
      if (chatRouter && typeof chatRouter.broadcastSSE === 'function') {
        chatRouter.broadcastSSE('timesheet_updated', {
          userId: report.userId,
          reportId: report.reportId,
          action: 'delete'
        });
      }
    } catch (sseErr) {
      console.error('Error sending SSE for delete report:', sseErr);
    }
    
    res.json({ 
      success: true, 
      message: 'Reporte eliminado exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error eliminando reporte:', error);
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar reporte' 
    });
  }
});

module.exports = router;
