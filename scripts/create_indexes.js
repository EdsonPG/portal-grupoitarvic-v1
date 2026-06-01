const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Report = require('../api/models/Report');
const Assignment = require('../api/models/Assignment');
const ProjectAssignment = require('../api/models/ProjectAssignment');
const TaskAssignment = require('../api/models/TaskAssignment');
const ChatMessage = require('../api/models/ChatMessage');
const Notification = require('../api/models/Notification');

async function createIndexes() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI no está definido en el archivo .env');
      process.exit(1);
    }

    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB conectado.');

    console.log('⚙️ Creando índices en base de datos...');

    // 1. Report Indexes
    console.log('📊 Creando índices para Reports...');
    await Report.collection.createIndex({ userId: 1, date: -1 });
    await Report.collection.createIndex({ companyId: 1, date: -1 });
    await Report.collection.createIndex({ assignmentId: 1 });
    
    // 2. Assignment Indexes
    console.log('📊 Creando índices para Assignments...');
    await Assignment.collection.createIndex({ userId: 1, isActive: 1 });
    
    // 3. ProjectAssignment Indexes
    console.log('📊 Creando índices para ProjectAssignments...');
    await ProjectAssignment.collection.createIndex({ consultorId: 1, isActive: 1 });
    
    // 4. TaskAssignment Indexes
    console.log('📊 Creando índices para TaskAssignments...');
    await TaskAssignment.collection.createIndex({ consultorId: 1, isActive: 1 });

    // 5. ChatMessage Indexes
    console.log('📊 Asegurando índices para ChatMessages...');
    await ChatMessage.collection.createIndex({ senderId: 1, receiverId: 1, timestamp: 1 });
    await ChatMessage.collection.createIndex({ receiverId: 1, read: 1, reportId: 1 });
    await ChatMessage.collection.createIndex({ timestamp: -1 });

    // 6. Notification Indexes
    console.log('📊 Asegurando índices para Notifications...');
    await Notification.collection.createIndex({ userId: 1, read: 1, createdAt: -1 });

    console.log('🎉 ¡Todos los índices se crearon o aseguraron correctamente en producción!');
    
  } catch (error) {
    console.error('❌ Error creando los índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexión a MongoDB cerrada.');
  }
}

createIndexes();
