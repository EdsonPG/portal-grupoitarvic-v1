const Notification = require('../models/Notification');
const User = require('../models/User');

const DEFAULT_ICONS = {
  report_created: 'fa-solid fa-file-circle-plus',
  report_approved: 'fa-solid fa-circle-check',
  report_rejected: 'fa-solid fa-circle-xmark',
  report_resubmitted: 'fa-solid fa-rotate',
  assignment_new: 'fa-solid fa-clipboard-list',
  contract_assigned: 'fa-solid fa-file-signature',
  contract_signed: 'fa-solid fa-stamp',
  user_registered: 'fa-solid fa-user-plus',
  system: 'fa-solid fa-gear'
};

/**
 * Crea una notificación en la base de datos y emite evento en tiempo real vía SSE si el usuario está conectado.
 */
async function createAndEmitNotification({ userId, type, title, message, icon = null, relatedId = null, actionUrl = null }) {
  try {
    if (!userId || !type || !title || !message) {
      console.warn('⚠️ Parámetros incompletos para crear notificación:', { userId, type, title });
      return null;
    }

    const notificationId = 'NOTIF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const resolvedIcon = icon || DEFAULT_ICONS[type] || 'fa-solid fa-bell';

    const notification = new Notification({
      notificationId,
      userId,
      type,
      title,
      message,
      icon: resolvedIcon,
      relatedId,
      actionUrl,
      read: false,
      createdAt: new Date()
    });

    await notification.save();

    // Intentar emitir en tiempo real vía SSE
    try {
      const chatRouter = require('../routes/chat');
      if (chatRouter && typeof chatRouter.sendSSEToUser === 'function') {
        chatRouter.sendSSEToUser(userId, 'notification_new', notification);
      }
    } catch (sseErr) {
      // No bloqueante
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creando notificación:', error.message);
    return null;
  }
}

/**
 * Notifica a todos los administradores del sistema
 */
async function notifyAdmins({ type, title, message, icon = null, relatedId = null, actionUrl = null }) {
  try {
    const adminUsers = await User.find({ role: 'admin', isActive: true }, 'userId');
    const targetIds = new Set(adminUsers.map(u => u.userId));
    targetIds.add('admin'); // asegurar compatibilidad con cuenta admin genérica

    const promises = Array.from(targetIds).map(userId =>
      createAndEmitNotification({ userId, type, title, message, icon, relatedId, actionUrl })
    );

    return await Promise.all(promises);
  } catch (err) {
    console.error('❌ Error notificando a administradores:', err.message);
    return [];
  }
}

/**
 * Notifica a todos los usuarios clientes de una empresa específica
 */
async function notifyCompanyClients(companyId, { type, title, message, icon = null, relatedId = null, actionUrl = null }) {
  try {
    if (!companyId) return [];
    const clientUsers = await User.find({ role: 'cliente', companyId, isActive: true }, 'userId');
    if (!clientUsers.length) return [];

    const promises = clientUsers.map(u =>
      createAndEmitNotification({ userId: u.userId, type, title, message, icon, relatedId, actionUrl })
    );

    return await Promise.all(promises);
  } catch (err) {
    console.error('❌ Error notificando a clientes de la empresa:', err.message);
    return [];
  }
}

module.exports = {
  createAndEmitNotification,
  notifyAdmins,
  notifyCompanyClients,
  DEFAULT_ICONS
};
