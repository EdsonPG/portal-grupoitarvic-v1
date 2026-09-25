const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../api/models/Company');
const Project = require('../api/models/Project');
const Support = require('../api/models/Support');
const Module = require('../api/models/Module');
const ProjectAssignment = require('../api/models/ProjectAssignment');
const Assignment = require('../api/models/Assignment');
const Tarifario = require('../api/models/Tarifario');
const Report = require('../api/models/Report');
const User = require('../api/models/User');

async function seedBillingData() {
  console.log('🚀 Iniciando inyección de datos de prueba para Facturación y Conciliación...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB Atlas');

  // 1. Obtener usuario consultor Héctor
  const hector = await User.findOne({ userId: 'USR1399' });
  if (!hector) {
    console.error('❌ No se encontró el consultor USR1399');
    process.exit(1);
  }
  console.log(`👤 Consultor localizado: ${hector.name} (${hector.userId})`);

  // 2. Localizar o actualizar Empresa PEGE-S Truncking (EMP3882)
  let pegeCompany = await Company.findOne({ companyId: 'EMP3882' });
  if (!pegeCompany) {
    pegeCompany = new Company({
      companyId: 'EMP3882',
      name: 'PEGE-S Truncking',
      rfc: 'PEGE040420IB4',
      razonSocial: 'EDSON EMMANUEL PEREZ GALLARDO',
      contactName: 'Edson Emmanuel Perez Gallardo',
      contactEmail: 'edsonemmanuelperezgallardgo2@gmail.com',
      isActive: true
    });
    await pegeCompany.save();
  }
  console.log(`🏢 Empresa localizada: ${pegeCompany.name} (${pegeCompany.companyId})`);

  // 3. Crear o asegurar Proyecto y Módulo
  const projectId = 'PRJ_PEGE_LOG';
  let project = await Project.findOne({ projectId });
  if (!project) {
    project = new Project({
      projectId,
      name: 'Sistema de Monitoreo Logístico y Tracking',
      description: 'Plataforma de rastreo y despacho de flotillas',
      companyId: pegeCompany.companyId,
      status: 'Activo'
    });
    await project.save();
    console.log('📦 Proyecto creado:', project.name);
  }

  const moduleId = 'MOD_TRACKING';
  let mod = await Module.findOne({ moduleId });
  if (!mod) {
    mod = new Module({
      moduleId,
      name: 'TRK - Telemetría y Despacho',
      description: 'Módulo especializado de telemetría'
    });
    await mod.save();
    console.log('🧩 Módulo creado:', mod.name);
  }

  // 4. Asignación de Proyecto
  const projectAssignmentId = 'PASG_PEGE_HECTOR';
  let prjAsg = await ProjectAssignment.findOne({ projectAssignmentId });
  if (!prjAsg) {
    prjAsg = new ProjectAssignment({
      projectAssignmentId,
      consultorId: hector.userId,
      companyId: pegeCompany.companyId,
      projectId: project.projectId,
      moduleId: mod.moduleId,
      status: 'Activo'
    });
    await prjAsg.save();
    console.log('🔗 Asignación de proyecto creada:', projectAssignmentId);
  }

  // 5. Tarifario para esta asignación
  const tarifarioId = 'TARIFA_PEGE_HECTOR';
  await Tarifario.deleteOne({ tarifarioId });
  const tarifa = new Tarifario({
    tarifarioId,
    assignmentId: projectAssignmentId,
    consultorId: hector.userId,
    consultorNombre: hector.name,
    companyId: pegeCompany.companyId,
    companyName: pegeCompany.name,
    projectId: project.projectId,
    projectName: project.name,
    moduleId: mod.moduleId,
    moduleName: mod.name,
    costoCliente: 1250,      // Tarifa facturable al cliente: $1,250 MXN/hr
    costoConsultor: 450,     // Honorarios del consultor: $450 MXN/hr
    margen: 800,             // Margen ARVIC: $800 MXN/hr
    margenPorcentaje: 64,    // 64% de rentabilidad
    tipo: 'project',
    isActive: true
  });
  await tarifa.save();
  console.log('💲 Tarifario registrado:', {
    costoCliente: tarifa.costoCliente,
    costoConsultor: tarifa.costoConsultor,
    margen: tarifa.margen,
    margenPorcentaje: `${tarifa.margenPorcentaje}%`
  });

  // 6. Eliminar reportes antiguos de prueba de PEGE-S Truncking en septiembre 2026 para reinyectar limpios
  await Report.deleteMany({
    companyId: pegeCompany.companyId,
    reportId: { $regex: /^REP_PEGE_2026/ }
  });

  // 7. Inyectar 9 reportes aprobados distribuidos en septiembre 2026
  const sampleReports = [
    // 1ª Quincena (1 al 15 de Septiembre 2026)
    {
      day: 2,
      hours: 8,
      title: 'Configuración de rutas de despacho y geocercas',
      desc: 'Levantamiento de requerimientos y parametrización de geocercas para la flotilla norte.'
    },
    {
      day: 4,
      hours: 6,
      title: 'Integración de telemetría y pruebas de carga',
      desc: 'Conexión de sensores GPS de unidades pesadas con el gateway de datos.'
    },
    {
      day: 8,
      hours: 7.5,
      title: 'Optimización de API de rastreo satelital',
      desc: 'Ajuste de queries en MongoDB para reducir latencia de mapas en vivo.'
    },
    {
      day: 11,
      hours: 8,
      title: 'Capacitación operativa a coordinadores de tráfico',
      desc: 'Sesión remota con personal de tráfico para uso del módulo de alertas.'
    },
    {
      day: 14,
      hours: 5.5,
      title: 'Reporte de rendimiento y consumo de diesel',
      desc: 'Generación de algoritmo para cruce de odómetro y tickets de combustible.'
    },
    // 2ª Quincena (16 al 30 de Septiembre 2026)
    {
      day: 17,
      hours: 8,
      title: 'Pase a producción de alertas de desviación',
      desc: 'Monitoreo preventivo ante salidas no autorizadas de cuadrantes de entrega.'
    },
    {
      day: 21,
      hours: 7,
      title: 'Auditoría de sincronización offline de choferes',
      desc: 'Pruebas en zonas con baja cobertura celular y persistencia en almacenamiento local.'
    },
    {
      day: 24,
      hours: 6.5,
      title: 'Cálculo de tiempos estimados de llegada (ETA)',
      desc: 'Implementación de modelo predictivo basado en tráfico y velocidad promedio.'
    },
    {
      day: 28,
      hours: 8,
      title: 'Revisión final de entregables y cierre de sprint',
      desc: 'Validación técnica con el cliente y firma de actas de aceptación.'
    }
  ];

  let totalHoras = 0;
  for (const item of sampleReports) {
    const reportDate = new Date(2026, 8, item.day, 10, 0, 0); // Mes 8 = Septiembre (0-indexed)
    const reportId = `REP_PEGE_202609_${String(item.day).padStart(2, '0')}`;
    totalHoras += item.hours;

    const rep = new Report({
      reportId,
      userId: hector.userId,
      assignmentId: projectAssignmentId,
      assignmentType: 'project',
      companyId: pegeCompany.companyId,
      projectId: project.projectId,
      moduleId: mod.moduleId,
      title: item.title,
      description: item.desc,
      hours: item.hours,
      date: reportDate,
      status: 'Aprobado',
      periodLocked: false,
      billingStatus: 'Sin Facturar'
    });

    await rep.save();
  }

  console.log(`✅ ${sampleReports.length} reportes de horas aprobadas inyectados para PEGE-S Truncking.`);
  console.log(`⏱️ Total de horas inyectadas: ${totalHoras} hrs`);
  console.log(`💵 Total Facturable estimado: $ ${(totalHoras * 1250).toLocaleString()} MXN`);
  console.log(`💼 Costo Consultor estimado: $ ${(totalHoras * 450).toLocaleString()} MXN`);
  console.log(`📈 Margen Bruto estimado: $ ${(totalHoras * 800).toLocaleString()} MXN (64%)`);

  await mongoose.disconnect();
  console.log('🎉 Inyección completada exitosamente.');
  process.exit(0);
}

seedBillingData().catch(err => {
  console.error('❌ Error inyectando datos:', err);
  process.exit(1);
});
