const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const jwt = require('jsonwebtoken');

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

// GET /api/chat/history/:contextId
router.get('/history/:contextId', authenticateToken, async (req, res) => {
  try {
    const { contextId } = req.params;
    const { isReport } = req.query;
    
    let query = {};
    if (isReport === 'true') {
      query.reportId = contextId;
    } else {
      const myUserId = req.user.userId;
      const otherUserId = contextId;
      query = {
        $or: [
          { senderId: myUserId, receiverId: otherUserId, reportId: { $exists: false } },
          { senderId: otherUserId, receiverId: myUserId, reportId: { $exists: false } }
        ]
      };
    }

    const messages = await ChatMessage.find(query).sort({ timestamp: 1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/unread-count/:userId — Conteo de mensajes no leídos agrupados por sender
router.get('/unread-count/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Aggregate: count unread messages grouped by senderId
    const unreadCounts = await ChatMessage.aggregate([
      { 
        $match: { 
          receiverId: userId, 
          read: { $ne: true },
          reportId: { $exists: false }
        } 
      },
      { 
        $group: { 
          _id: '$senderId', 
          count: { $sum: 1 },
          lastMessage: { $last: '$message' },
          lastTimestamp: { $last: '$timestamp' }
        } 
      }
    ]);

    // Also get total unread count
    const totalUnread = unreadCounts.reduce((sum, item) => sum + item.count, 0);

    res.json({ 
      success: true, 
      totalUnread,
      bySender: unreadCounts.map(item => ({
        senderId: item._id,
        count: item.count,
        lastMessage: item.lastMessage,
        lastTimestamp: item.lastTimestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/chat/mark-read/:senderId — Marcar como leídos mensajes de un sender
router.put('/mark-read/:senderId', authenticateToken, async (req, res) => {
  try {
    const myUserId = req.user.userId;
    const { senderId } = req.params;

    const result = await ChatMessage.updateMany(
      { 
        senderId: senderId, 
        receiverId: myUserId, 
        read: { $ne: true },
        reportId: { $exists: false }
      },
      { $set: { read: true } }
    );

    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/last-messages/:userId — Último mensaje de cada conversación
router.get('/last-messages/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get last message per conversation partner
    const lastMessages = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId, reportId: { $exists: false } },
            { receiverId: userId, reportId: { $exists: false } }
          ]
        }
      },
      {
        $addFields: {
          partnerId: {
            $cond: { if: { $eq: ['$senderId', userId] }, then: '$receiverId', else: '$senderId' }
          }
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$message' },
          lastTimestamp: { $first: '$timestamp' },
          lastSenderId: { $first: '$senderId' }
        }
      }
    ]);

    res.json({
      success: true,
      data: lastMessages.map(item => ({
        partnerId: item._id,
        lastMessage: item.lastMessage,
        lastTimestamp: item.lastTimestamp,
        lastSenderId: item.lastSenderId
      }))
    });
  } catch (error) {
    console.error('Error fetching last messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chat/send
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, message, attachment, fileName, reportId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Falta receiverId' });
    }

    const newMsg = new ChatMessage({
      senderId: req.user.userId,
      receiverId,
      message,
      attachment,
      fileName,
      reportId: reportId ? reportId : undefined
    });

    await newMsg.save();
    res.json({ success: true, data: newMsg });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// DELETE /api/chat/message/:messageId — Eliminar un mensaje propio
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await ChatMessage.findById(messageId);
    
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
    }
    
    if (msg.senderId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Solo puedes eliminar tus propios mensajes' });
    }

    await ChatMessage.findByIdAndDelete(messageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// POST /api/chat/support-email
// Enviar email de soporte (escalación del chatbot)
// ==========================================
const { sendSupportEmail } = require('../utils/mailer');

router.post('/support-email', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'El mensaje es requerido' });
    }

    const { userId, name, email } = req.user;
    const userName = name || userId;
    const userEmail = email || 'Sin correo registrado';

    await sendSupportEmail(userName, userEmail, message);

    res.json({
      success: true,
      message: 'Correo de soporte enviado exitosamente'
    });
  } catch (error) {
    console.error('Error enviando email de soporte:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
