require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../api/models/Notification');
const Report = require('../api/models/Report');
const User = require('../api/models/User');
const notificationService = require('../api/utils/notificationService');
const mailer = require('../api/utils/mailer');

async function testFase4() {
  console.log('--- INICIANDO VERIFICACIÓN DE FASE 4: NOTIFICACIONES Y ALERTAS ---');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-arvic';
  await mongoose.connect(mongoUri);
  console.log('✓ Conectado a MongoDB');

  // 1. Validar funciones de mailer exportadas
  console.log('\n[1/5] Verificando funciones de email...');
  const expectedMailerFuncs = [
    'sendReportStatusEmail',
    'sendContractPendingSignEmail',
    'sendContractSignedNotificationToAdmin'
  ];
  for (const fn of expectedMailerFuncs) {
    if (typeof mailer[fn] !== 'function') {
      throw new Error(`Función de mailer faltante: ${fn}`);
    }
    console.log(`✓ mailer.${fn} está definida correctamente`);
  }

  // 2. Probar creación de notificación in-app para consultor
  console.log('\n[2/5] Probando creación de notificación in-app...');
  const testUserId = 'test_consultor_fase4';
  const testNotif = await notificationService.createAndEmitNotification({
    userId: testUserId,
    type: 'contract_assigned',
    title: 'Nuevo Convenio de Asignación',
    message: 'Has sido asignado a Proyecto Alfa. Tu convenio está listo para firma.',
    relatedId: 'PROJ-ALFA',
    actionUrl: 'expedientes'
  });

  if (!testNotif || !testNotif.notificationId) {
    throw new Error('Fallo al crear notificación in-app');
  }
  console.log(`✓ Notificación creada con éxito: ${testNotif.notificationId} (${testNotif.type})`);
  console.log(`  ActionUrl: ${testNotif.actionUrl} | Icono: ${testNotif.icon}`);

  // 3. Probar conteo y marcado como leída
  console.log('\n[3/5] Probando conteo y marcado como leída...');
  const unreadCount = await Notification.countDocuments({ userId: testUserId, read: false });
  console.log(`✓ Notificaciones no leídas para ${testUserId}: ${unreadCount}`);
  if (unreadCount < 1) throw new Error('El conteo de no leídas debería ser al menos 1');

  await Notification.updateOne({ notificationId: testNotif.notificationId }, { $set: { read: true } });
  const updatedCount = await Notification.countDocuments({ userId: testUserId, read: false });
  console.log(`✓ Conteo tras marcar como leída: ${updatedCount}`);
  if (updatedCount !== unreadCount - 1) throw new Error('El conteo no decreció correctamente');

  // 4. Probar notificación para cliente de empresa
  console.log('\n[4/5] Probando notificación para usuarios cliente...');
  const testCompanyId = 'comp_test_fase4';
  const dummyClient = await User.findOneAndUpdate(
    { userId: 'client_dummy_fase4' },
    {
      userId: 'client_dummy_fase4',
      name: 'Cliente Prueba Fase4',
      email: 'cliente_fase4@test.com',
      password: 'hash_test_dummy',
      role: 'cliente',
      companyId: testCompanyId,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const clientNotifs = await notificationService.notifyCompanyClients(testCompanyId, {
    type: 'report_created',
    title: 'Horas reportadas',
    message: 'Se registraron 8 horas de servicio para validación.',
    actionUrl: 'horas'
  });

  console.log(`✓ Notificaciones enviadas a clientes de la empresa: ${clientNotifs.length}`);
  if (!clientNotifs.length) throw new Error('No se notificó al usuario cliente de la empresa');
  console.log(`  Notificación enviada a: ${clientNotifs[0].userId}`);

  // 5. Probar notificación a administradores
  console.log('\n[5/5] Probando notificación para administradores...');
  const adminNotifs = await notificationService.notifyAdmins({
    type: 'contract_signed',
    title: 'Documento Firmado',
    message: 'Cliente Prueba ha formalizado el SOW del proyecto.',
    actionUrl: 'expedientes'
  });
  console.log(`✓ Notificaciones enviadas a administradores: ${adminNotifs.length}`);
  if (!adminNotifs.length) throw new Error('No se generaron notificaciones para administradores');

  // Limpieza de datos de prueba
  await Notification.deleteMany({ userId: { $in: [testUserId, 'client_dummy_fase4'] } });
  await Notification.deleteMany({ notificationId: { $in: adminNotifs.map(n => n?.notificationId).filter(Boolean) } });
  await User.deleteOne({ userId: 'client_dummy_fase4' });
  console.log('✓ Limpieza de datos de prueba completada');

  await mongoose.disconnect();
  console.log('\n======================================================');
  console.log('🎉 ¡TODAS LAS PRUEBAS DE FASE 4 PASARON EXITOSAMENTE!');
  console.log('======================================================');
}

testFase4().catch(err => {
  console.error('❌ Error en prueba de Fase 4:', err);
  process.exit(1);
});
