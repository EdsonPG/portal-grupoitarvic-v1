const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET notificaciones por usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET contar no leídas
router.get('/user/:userId/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      userId: req.params.userId, 
      read: false 
    });
    res.json({ success: true, count });
  } catch (error) {
    console.error('❌ Error contando notificaciones:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST crear notificación
router.post('/', async (req, res) => {
  try {
    const notifData = req.body;
    
    if (!notifData.notificationId) {
      notifData.notificationId = 'NOTIF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    const notification = new Notification(notifData);
    await notification.save();

    res.status(201).json({ 
      success: true, 
      message: 'Notificación creada',
      data: notification 
    });
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT marcar una como leída
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { notificationId: req.params.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('❌ Error marcando notificación:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT marcar todas como leídas para un usuario
router.put('/user/:userId/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.params.userId, read: false },
      { read: true }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} notificaciones marcadas como leídas` 
    });
  } catch (error) {
    console.error('❌ Error marcando notificaciones:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE eliminar notificación
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ notificationId: req.params.id });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }
    
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    console.error('❌ Error eliminando notificación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
