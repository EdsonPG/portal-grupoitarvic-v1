const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const jwt = require('jsonwebtoken');

// ==========================================
// SSE (Server-Sent Events) Infrastructure
// ==========================================
// Map of userId -> Set of SSE response objects
const sseClients = new Map();
// Map of `senderId:receiverId` -> timestamp for typing indicators
const typingStates = new Map();

/**
 * Send an SSE event to a specific user (all their open tabs/connections)
 */
function sendSSEToUser(userId, eventType, data) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return false;
  
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const deadClients = [];
  
  clients.forEach(client => {
    try {
      if (!client.destroyed && !client.writableEnded) {
        client.write(payload);
      } else {
        deadClients.push(client);
      }
    } catch (e) {
      deadClients.push(client);
    }
  });
  
  // Cleanup dead connections
  deadClients.forEach(c => clients.delete(c));
  if (clients.size === 0) sseClients.delete(userId);
  
  return true;
}

/**
 * Broadcast an event to all connected SSE clients
 */
function broadcastSSE(eventType, data) {
  sseClients.forEach((clients, userId) => {
    sendSSEToUser(userId, eventType, data);
  });
}

// Export SSE helpers so index.js can also use them
router.sseClients = sseClients;
router.sendSSEToUser = sendSSEToUser;
router.broadcastSSE = broadcastSSE;

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
// GET /api/chat/stream — SSE Connection
// Real-time event stream for chat messages,
// typing indicators, and user status updates
// ==========================================
router.get('/stream', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`);
  
  // Register this client
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);
  
  console.log(`📡 SSE conectado: ${userId} (${sseClients.get(userId).size} conexiones)`);
  
  // Send online status to all users
  broadcastSSE('user_status', { userId, status: 'online' });
  
  // Send current online users list to the newly connected user
  const onlineUsers = [];
  sseClients.forEach((clients, uid) => {
    if (clients.size > 0) {
      onlineUsers.push({ userId: uid, status: 'online' });
    }
  });
  res.write(`event: active_users\ndata: ${JSON.stringify({ users: onlineUsers })}\n\n`);
  
  // Keep-alive ping every 25 seconds (prevents timeout on proxies)
  const keepAlive = setInterval(() => {
    try {
      if (!res.destroyed && !res.writableEnded) {
        res.write(`: ping\n\n`);
      } else {
        clearInterval(keepAlive);
      }
    } catch (e) {
      clearInterval(keepAlive);
    }
  }, 25000);
  
  // Cleanup on disconnect 
  req.on('close', () => {
    clearInterval(keepAlive);
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(userId);
        // User fully disconnected — notify others
        broadcastSSE('user_status', { userId, status: 'offline' });
      }
    }
    console.log(`📡 SSE desconectado: ${userId}`);
  });
});

// ==========================================
// POST /api/chat/typing — Report typing status
// ==========================================
router.post('/typing', authenticateToken, (req, res) => {
  const { receiverId, isTyping } = req.body;
  const senderId = req.user.userId;
  
  if (!receiverId) {
    return res.status(400).json({ success: false, message: 'Falta receiverId' });
  }
  
  const key = `${senderId}:${receiverId}`;
  
  if (isTyping) {
    typingStates.set(key, Date.now());
    // Auto-expire typing state after 4 seconds
    setTimeout(() => {
      if (typingStates.get(key) && Date.now() - typingStates.get(key) >= 3500) {
        typingStates.delete(key);
        sendSSEToUser(receiverId, 'typing_stop', { senderId });
      }
    }, 4000);
  } else {
    typingStates.delete(key);
  }
  
  // Send typing event via SSE to receiver
  const eventType = isTyping ? 'typing_start' : 'typing_stop';
  sendSSEToUser(receiverId, eventType, { senderId });
  
  res.json({ success: true });
});

// ==========================================
// GET /api/chat/typing-status/:contactId 
// Poll typing status (fallback if SSE fails)
// ==========================================
router.get('/typing-status/:contactId', authenticateToken, (req, res) => {
  const { contactId } = req.params;
  const myUserId = req.user.userId;
  const key = `${contactId}:${myUserId}`;
  
  const typingTs = typingStates.get(key);
  const isTyping = typingTs && (Date.now() - typingTs < 4000);
  
  res.json({ success: true, isTyping: !!isTyping });
});

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

    // Notify the sender via SSE that their messages were read
    sendSSEToUser(senderId, 'messages_read', { readBy: myUserId });

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

// POST /api/chat/send — Send message + broadcast via SSE
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, message, attachment, fileName, reportId, tempId } = req.body;
    
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
    
    // Broadcast new message via SSE to both sender and receiver
    const messagePayload = { 
      ...newMsg.toObject(), 
      tempId // Include tempId so sender can match optimistic msg
    };
    
    sendSSEToUser(receiverId, 'new_message', messagePayload);
    sendSSEToUser(req.user.userId, 'new_message', messagePayload);
    
    // If receiver is not connected via SSE, create a notification
    const receiverClients = sseClients.get(receiverId);
    if (!receiverClients || receiverClients.size === 0) {
      try {
        const Notification = require('../models/Notification');
        const notif = new Notification({
          notificationId: `CHAT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          userId: receiverId,
          type: 'system',
          title: 'Mensaje de Chat Nuevo',
          message: `Tienes un nuevo mensaje de ${req.user.userId}`,
          icon: 'fa-solid fa-comments'
        });
        await notif.save();
      } catch (err) { console.error('Error creating notification:', err); }
    }
    
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

    const receiverId = msg.receiverId;
    await ChatMessage.findByIdAndDelete(messageId);
    
    // Notify both parties via SSE
    sendSSEToUser(req.user.userId, 'message_deleted', { messageId });
    sendSSEToUser(receiverId, 'message_deleted', { messageId });
    
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
