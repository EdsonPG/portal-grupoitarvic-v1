const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
// Configurar dotenv para buscar el .env en la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('./models/User');

const app = express();

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman) y todos los dominios de Vercel
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://tsmjosem.github.io'
    ];
    
    // Permitir cualquier dominio .vercel.app
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 👇 NUEVO: Servir archivos estáticos (CSS, JS, imágenes)
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/consultor', express.static(path.join(__dirname, '..', 'consultor')));

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB conectado'))
.catch(err => console.error('❌ Error de conexión MongoDB:', err));

// 👇 AGREGA ESTE ENDPOINT TEMPORAL en api/index.js
app.post('/api/setup/reset-admin-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere nueva contraseña' 
      });
    }

    // Buscar el usuario admin
    const adminUser = await User.findOne({ id: 'admin' });
    
    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario admin no encontrado' 
      });
    }

    // Actualizar contraseña (se hasheará automáticamente)
    adminUser.password = newPassword;
    await adminUser.save();

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente',
      newPassword: newPassword // Solo para referencia, eliminar en producción
    });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando contraseña' 
    });
  }
});

// Importar rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const companiesRoutes = require('./routes/companies');
const projectsRoutes = require('./routes/projects');
const supportsRoutes = require('./routes/supports');
const modulesRoutes = require('./routes/modules');
const assignmentsRoutes = require('./routes/assignments'); 
const projectAssignmentsRoutes = require('./routes/projectAssignments');
const taskAssignmentsRoutes = require('./routes/taskAssignments');  // ✅ NUEVO
const reportsRoutes = require('./routes/reports');
const tarifarioRoutes = require('./routes/tarifario');
const notificationsRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');  // ✅ NUEVO

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/supports', supportsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/assignments', assignmentsRoutes); // Maneja /assignments, /assignments/projects, /assignments/tasks
app.use('/api/projectAssignments', projectAssignmentsRoutes);  // ✅ NUEVO
app.use('/api/taskAssignments', taskAssignmentsRoutes);  // ✅ NUEVO
app.use('/api/reports', reportsRoutes);
app.use('/api/tarifario', tarifarioRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes); // ✅ NUEVO

// Ruta de prueba
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const dbName = mongoose.connection.name || 'N/A';
  
  res.json({ 
    status: 'OK', 
    message: 'API Portal ARVIC funcionando',
    mongodb: {
      status: dbStatus,
      database: dbName
    },
    timestamp: new Date().toISOString()
  });
});

// 👇 NUEVO: Rutas para servir páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

app.get('/consultor/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'consultor', 'dashboard.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'reset-password.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Configurar WebSockets
const wss = new WebSocket.Server({ server });

// Map para guardar las conexiones activas por userId y estados
const clients = new Map();
const userStatuses = new Map();

wss.on('connection', (ws) => {
  let authenticatedUserId = null;

  ws.on('message', async (messageData) => {
    try {
      const data = JSON.parse(messageData);
      
      if (data.type === 'auth') {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
        authenticatedUserId = decoded.userId;
        clients.set(authenticatedUserId, ws);
        userStatuses.set(authenticatedUserId, 'online');
        
        console.log(`✅ WebSocket autenticado para usuario: ${authenticatedUserId}`);
        ws.send(JSON.stringify({ type: 'auth_success' }));
        
        // Notificar a todos el nuevo estado
        broadcastStatus(authenticatedUserId, 'online');
        
        // Enviar lista de usuarios activos al recién conectado
        const activeList = [];
        userStatuses.forEach((status, userId) => {
            activeList.push({ userId, status });
        });
        ws.send(JSON.stringify({ type: 'active_users_list', users: activeList }));
        return;
      }

      if (data.type === 'status_change') {
        if (authenticatedUserId) {
            userStatuses.set(authenticatedUserId, data.status);
            broadcastStatus(authenticatedUserId, data.status);
        }
        return;
      }
      
      if (data.type === 'chat_message') {
        if (!authenticatedUserId) return;

        const ChatMessage = require('./models/ChatMessage');
        const Notification = require('./models/Notification');
        
        const newMsg = new ChatMessage({
          senderId: authenticatedUserId,
          receiverId: data.payload.receiverId,
          message: data.payload.message || '',
          attachment: data.payload.attachment,
          fileName: data.payload.fileName,
          reportId: data.payload.reportId || undefined
        });
        
        await newMsg.save();

        const messagePayload = {
          type: 'new_message',
          payload: newMsg
        };

        // Enviar al receptor
        const receiverWs = clients.get(data.payload.receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(JSON.stringify(messagePayload));
        } else {
            // Si el receptor no está conectado, crear notificación persistente
            try {
                const notif = new Notification({
                    notificationId: `CHAT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    userId: data.payload.receiverId,
                    type: 'system',
                    title: 'Mensaje de Chat Nuevo',
                    message: `Tienes un nuevo mensaje de ${authenticatedUserId}`,
                    icon: 'fa-solid fa-comments'
                });
                await notif.save();
            } catch (err) { console.error('Error notif:', err); }
        }

        // Eco al emisor
        ws.send(JSON.stringify(messagePayload));
      }

      // Typing indicators
      if (data.type === 'typing_start' || data.type === 'typing_stop') {
        if (!authenticatedUserId) return;
        const targetWs = clients.get(data.receiverId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: data.type,
            senderId: authenticatedUserId
          }));
        }
      }

      // Mark messages as read via WebSocket
      if (data.type === 'mark_read') {
        if (!authenticatedUserId) return;
        const ChatMessage = require('./models/ChatMessage');
        
        await ChatMessage.updateMany(
          { senderId: data.senderId, receiverId: authenticatedUserId, read: { $ne: true }, reportId: { $exists: false } },
          { $set: { read: true } }
        );

        // Notify the sender that their messages were read
        const senderWs = clients.get(data.senderId);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
          senderWs.send(JSON.stringify({
            type: 'messages_read',
            readBy: authenticatedUserId
          }));
        }
      }

      // Delete message via WebSocket
      if (data.type === 'delete_message') {
        if (!authenticatedUserId) return;
        const ChatMessage = require('./models/ChatMessage');
        const msg = await ChatMessage.findById(data.messageId);
        
        if (msg && msg.senderId === authenticatedUserId) {
          const receiverId = msg.receiverId;
          await ChatMessage.findByIdAndDelete(data.messageId);
          
          // Notify both parties
          const payload = JSON.stringify({ type: 'message_deleted', messageId: data.messageId });
          ws.send(payload);
          const receiverWs = clients.get(receiverId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(payload);
          }
        }
      }
    } catch (error) {
      console.error('Error WS:', error);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId && clients.get(authenticatedUserId) === ws) {
      clients.delete(authenticatedUserId);
      userStatuses.set(authenticatedUserId, 'offline');
      broadcastStatus(authenticatedUserId, 'offline');
      console.log(`❌ WebSocket desconectado: ${authenticatedUserId}`);
    }
  });
});

function broadcastStatus(userId, status) {
    const data = JSON.stringify({ type: 'user_status_update', userId, status });
    clients.forEach((clientWs) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
        }
    });
}

// Solo exportar para Vercel, sino iniciar servidor local
if (require.main === module) {
  // Modo desarrollo local
  server.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP/WS corriendo en puerto ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
} else {
  // Exportar para Vercel
  module.exports = app;
}

//Cambio para hacer commit a la nueva base de datos