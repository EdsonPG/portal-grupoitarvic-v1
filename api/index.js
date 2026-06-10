const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
// Configurar dotenv para buscar el .env en la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');

const compression = require('compression');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return origin ? origin.replace(/\/$/, '') : origin;
}

function readPositiveInt(value, fallback, min = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

const configuredOrigins = [
  process.env.APP_URL,
  ...parseList(process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS)
]
  .map(normalizeOrigin)
  .filter(Boolean);

const developmentOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://tsmjosem.github.io'
];

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(!isProduction ? developmentOrigins : [])
].map(normalizeOrigin));

const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '10mb';

// Middlewares
app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction ? undefined : false
}));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, !isProduction || process.env.CORS_ALLOW_NO_ORIGIN === 'true');
    }

    const normalizedOrigin = normalizeOrigin(origin);
    let hostname = '';
    try {
      hostname = new URL(normalizedOrigin).hostname;
    } catch (error) {
      return callback(null, false);
    }

    if (
      allowedOrigins.has(normalizedOrigin) ||
      (allowVercelPreviews && hostname.endsWith('.vercel.app'))
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: readPositiveInt(process.env.API_RATE_LIMIT_MAX, 600),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: readPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 25),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta nuevamente en unos minutos.'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api', apiLimiter);

app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// Sanitizar operadores NoSQL para evitar inyecciones de queries
function sanitizeNoSQL(obj) {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeNoSQL(obj[key]);
      }
    }
  }
}

app.use((req, res, next) => {
  sanitizeNoSQL(req.body);
  sanitizeNoSQL(req.query);
  sanitizeNoSQL(req.params);
  next();
});

// 👇 NUEVO: Servir archivos estáticos (CSS, JS, imágenes)
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/consultor', express.static(path.join(__dirname, '..', 'consultor')));

const bcrypt = require('bcryptjs');

// Función para migrar contraseñas de texto plano a encriptado bcrypt
async function migratePlaintextPasswords() {
  try {
    console.log('🔄 Iniciando verificación de seguridad de contraseñas...');
    const users = await User.find({});
    let migratedCount = 0;

    for (const user of users) {
      // Si la contraseña no está encriptada con bcrypt (no empieza con $2a$ o $2b$)
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`🔑 Encriptando contraseña en texto plano para el usuario: ${user.name} (${user.userId})`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        // Actualizar directamente en la base de datos para evitar activar triggers de guardado
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`✅ Migración finalizada: ${migratedCount} contraseñas fueron encriptadas de forma segura.`);
    } else {
      console.log('✅ Verificación completada: Todas las contraseñas ya se encuentran encriptadas.');
    }
  } catch (error) {
    console.error('❌ Error durante la migración de contraseñas:', error);
  }
}

// Desactivar la creación de índices automática en producción para mejorar rendimiento de arranque
mongoose.set('autoIndex', process.env.NODE_ENV === 'development');

let cachedConnection = null;
let isMigrationRun = false;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    // Ya se está conectando, esperar a que termine la conexión existente
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return mongoose.connection;
  }

  if (!cachedConnection) {
    console.log('📡 [DB] Conectando a MongoDB Atlas...');
    const mongoOptions = {
      maxPoolSize: readPositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10),
      minPoolSize: readPositiveInt(process.env.MONGODB_MIN_POOL_SIZE, 0, 0),
      maxIdleTimeMS: readPositiveInt(process.env.MONGODB_MAX_IDLE_TIME_MS, 30000),
      serverSelectionTimeoutMS: readPositiveInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 8000),
      socketTimeoutMS: readPositiveInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45000)
    };

    cachedConnection = mongoose.connect(process.env.MONGODB_URI, {
      ...mongoOptions,
    });
  }

  try {
    await cachedConnection;
    console.log('✅ [DB] MongoDB conectado exitosamente');
    
    // Ejecutar migración de contraseñas en segundo plano sin bloquear la solicitud actual
    if (!isMigrationRun) {
      isMigrationRun = true;
      migratePlaintextPasswords().catch(err => console.error('❌ Error en migración:', err));
    }
  } catch (error) {
    cachedConnection = null; // Resetear la promesa fallida en caso de error para permitir reintentos
    throw error;
  }

  return mongoose.connection;
}

// Middleware para asegurar que la base de datos esté conectada antes de procesar cualquier endpoint de la API
app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('❌ Error de conexión a la base de datos en middleware /api:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error de conexión con la base de datos' 
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
const generatedReportsRoutes = require('./routes/generatedReports');
const tarifarioRoutes = require('./routes/tarifario');
const notificationsRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');  // ✅ NUEVO
const calendarRoutes = require('./routes/calendar');  // ✅ CALENDARIO
const videoRoutes = require('./routes/video');        // ✅ VIDEO/VOICE CALLS
const { sendSSEToUser, broadcastSSE: broadcastSSEChat } = chatRoutes;

// Usar rutas
app.use('/api/auth', authRoutes); // Público para Login y Recuperación
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/companies', authenticateToken, companiesRoutes);
app.use('/api/projects', authenticateToken, projectsRoutes);
app.use('/api/supports', authenticateToken, supportsRoutes);
app.use('/api/modules', authenticateToken, modulesRoutes);
app.use('/api/assignments', authenticateToken, assignmentsRoutes); // Maneja /assignments, /assignments/projects, /assignments/tasks
app.use('/api/projectAssignments', authenticateToken, projectAssignmentsRoutes);  // ✅ NUEVO
app.use('/api/taskAssignments', authenticateToken, taskAssignmentsRoutes);  // ✅ NUEVO
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/generatedReports', authenticateToken, generatedReportsRoutes);
app.use('/api/tarifario', authenticateToken, tarifarioRoutes);
app.use('/api/notifications', authenticateToken, notificationsRoutes);
app.use('/api/chat', authenticateToken, chatRoutes); // ✅ NUEVO
app.use('/api/calendar', authenticateToken, calendarRoutes); // ✅ CALENDARIO
app.use('/api/video', authenticateToken, videoRoutes); // ✅ VIDEO/VOICE CALLS

// 👇 NUEVO: Endpoints consolidados para carga inicial ultra-rápida (Producción)
app.get('/api/all-data/admin', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de administrador' });
    }

    const User = require('./models/User');
    const Company = require('./models/Company');
    const Project = require('./models/Project');
    const Assignment = require('./models/Assignment');
    const Support = require('./models/Support');
    const Module = require('./models/Module');
    const Report = require('./models/Report');
    const ProjectAssignment = require('./models/ProjectAssignment');
    const TaskAssignment = require('./models/TaskAssignment');
    const Tarifario = require('./models/Tarifario');

    const [
      users,
      companies,
      projects,
      assignments,
      supports,
      modules,
      reports,
      projectAssignments,
      taskAssignments,
      tarifario
    ] = await Promise.all([
      User.find().select('-password'),
      Company.find(),
      Project.find(),
      Assignment.find(),
      Support.find(),
      Module.find(),
      Report.find().sort({ createdAt: -1 }),
      ProjectAssignment.find(),
      TaskAssignment.find(),
      Tarifario.find()
    ]);

    res.json({
      success: true,
      data: {
        users,
        companies,
        projects,
        assignments,
        supports,
        modules,
        reports,
        projectAssignments,
        taskAssignments,
        tarifario
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo datos admin consolidados:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

app.get('/api/all-data/consultor', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'consultor') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de consultor' });
    }

    const userId = req.user.userId;

    const Company = require('./models/Company');
    const Support = require('./models/Support');
    const Module = require('./models/Module');
    const Project = require('./models/Project');
    const Assignment = require('./models/Assignment');
    const ProjectAssignment = require('./models/ProjectAssignment');
    const TaskAssignment = require('./models/TaskAssignment');
    const Report = require('./models/Report');

    const [
      companies,
      supports,
      modules,
      projects,
      assignments,
      projectAssignments,
      taskAssignments,
      reports
    ] = await Promise.all([
      Company.find(),
      Support.find(),
      Module.find(),
      Project.find(),
      Assignment.find({ userId: userId, isActive: { $ne: false } }),
      ProjectAssignment.find({ $or: [{ consultorId: userId }, { userId: userId }], isActive: { $ne: false } }),
      TaskAssignment.find({ $or: [{ consultorId: userId }, { userId: userId }], isActive: { $ne: false } }),
      Report.find({ userId: userId }).sort({ date: -1 })
    ]);

    res.json({
      success: true,
      data: {
        companies,
        supports,
        modules,
        projects,
        assignments,
        projectAssignments,
        taskAssignments,
        reports
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo datos consultor consolidados:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

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

// 👇 NUEVO: Rutas para servir páginas HTML con prevención de caché
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Fail-safe para navegadores que tienen el viejo auth.js cacheado y piden /index.html explicitly
app.get('/index.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

app.get('/consultor/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'consultor', 'dashboard.html'));
});

app.get('/reset-password', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

chatRoutes.sendWebSocketToUser = (userId, messageType, payload) => {
  const wsClient = clients.get(userId);
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({ type: messageType, ...payload }));
  }
};

chatRoutes.broadcastWSStatus = (userId, status) => {
  broadcastStatus(userId, status);
};

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
          reportId: data.payload.reportId || undefined,
          tempId: data.tempId
        });
        
        await newMsg.save();

        const messagePayload = {
          type: 'new_message',
          payload: {
            ...newMsg.toObject(),
            tempId: data.tempId
          }
        };

        // Enviar al receptor via WS
        const receiverWs = clients.get(data.payload.receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(JSON.stringify(messagePayload));
        }
        
        // Also broadcast via SSE for production compatibility
        const ssePayload = { ...newMsg.toObject(), tempId: data.tempId };
        sendSSEToUser(data.payload.receiverId, 'new_message', ssePayload);
        sendSSEToUser(authenticatedUserId, 'new_message', ssePayload);

        // Eco al emisor via WS
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
          msg.deleted = true;
          msg.message = "Este mensaje fue eliminado";
          msg.attachment = undefined;
          msg.fileName = undefined;
          await msg.save();
          
          // Notify both parties
          const payload = JSON.stringify({ type: 'message_deleted', messageId: data.messageId });
          ws.send(payload);
          const receiverWs = clients.get(msg.receiverId);
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
