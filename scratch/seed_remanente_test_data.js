const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI no está definido en el archivo .env");
  process.exit(1);
}

// Cargar modelos
const User = require('../api/models/User');
const Company = require('../api/models/Company');
const Support = require('../api/models/Support');
const Project = require('../api/models/Project');
const Module = require('../api/models/Module');
const Assignment = require('../api/models/Assignment');
const ProjectAssignment = require('../api/models/ProjectAssignment');
const Report = require('../api/models/Report');

async function seed() {
  console.log("🌱 Conectando a MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Conectado con éxito.");

  // 1. Obtener consultores existentes y crear los de prueba si no existen
  const userJoel = await User.findOne({ userId: 'USR1804' });
  const userAlan = await User.findOne({ userId: 'USR8527' });
  
  let userAna = await User.findOne({ userId: 'TEST_USR001' });
  if (!userAna) {
    userAna = await User.create({
      userId: 'TEST_USR001',
      name: 'Ana García López',
      email: 'ana.garcia@arvic.com',
      password: 'consultor123',
      role: 'consultor',
      isActive: true
    });
    console.log("👤 Consultor Ana creado.");
  }
  
  let userCarlos = await User.findOne({ userId: 'TEST_USR002' });
  if (!userCarlos) {
    userCarlos = await User.create({
      userId: 'TEST_USR002',
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@arvic.com',
      password: 'consultor123',
      role: 'consultor',
      isActive: true
    });
    console.log("👤 Consultor Carlos creado.");
  }

  if (!userJoel || !userAlan) {
    console.error("❌ Error: No se encontraron los consultores principales en la base de datos.");
    process.exit(1);
  }
  console.log(`👤 Consultores listos: Joel, Alan, Ana, Carlos`);

  // 2. Crear Cliente DOAL
  const companyId = 'co_test_remanente';
  let company = await Company.findOne({ companyId });
  if (!company) {
    company = await Company.create({
      companyId,
      name: 'DOAL',
      description: 'Cliente DOAL - Remanente y Proyectos'
    });
    console.log("🏢 Cliente DOAL creado.");
  } else {
    company.name = 'DOAL';
    company.description = 'Cliente DOAL - Remanente y Proyectos';
    await company.save();
    console.log("🏢 Cliente DOAL actualizado.");
  }

  // 3. Crear Soportes
  const supportsToCreate = [
    {
      supportId: 'sup_test_remanente',
      name: 'Soporte General Arvic',
      description: 'Soporte mensual general DOAL (> 150 horas)'
    },
    {
      supportId: 'sup_sap_remanente',
      name: 'Soporte Especial SAP',
      description: 'Soporte mensual especial SAP DOAL (<= 150 horas)'
    },
    {
      supportId: 'sup_mesa_remanente',
      name: 'Soporte Mesa de Ayuda',
      description: 'Soporte de Mesa de Ayuda DOAL (> 150 horas)'
    }
  ];

  const supports = {};
  for (const item of supportsToCreate) {
    let support = await Support.findOne({ supportId: item.supportId });
    if (!support) {
      support = await Support.create(item);
    } else {
      await Support.updateOne({ supportId: item.supportId }, item);
    }
    supports[item.supportId] = support;
  }
  console.log("📞 Soportes creados/actualizados para DOAL.");

  // 4. Crear Proyecto
  const projectId = 'prj_test_remanente';
  let project = await Project.findOne({ projectId });
  if (!project) {
    project = await Project.create({
      projectId,
      name: 'Proyecto Migración SAP',
      description: 'Proyecto SAP para DOAL'
    });
    console.log("📁 Proyecto de prueba creado.");
  } else {
    console.log("📁 Proyecto de prueba ya existe.");
  }

  // 5. Crear Módulos
  const modulesToCreate = [
    { moduleId: 'mod_mm_test', name: 'MM - Gestión de Materiales', description: 'Módulo SAP MM' },
    { moduleId: 'mod_abap_test', name: 'ABAP - Desarrollo', description: 'Módulo SAP ABAP' },
    { moduleId: 'mod_fi_test', name: 'FI - Contabilidad Financiera', description: 'Módulo SAP FI' },
    { moduleId: 'mod_sd_test', name: 'SD - Ventas y Distribución', description: 'Módulo SAP SD' }
  ];

  const modules = {};
  for (const item of modulesToCreate) {
    let mod = await Module.findOne({ moduleId: item.moduleId });
    if (!mod) {
      mod = await Module.create(item);
    }
    modules[item.moduleId] = mod;
  }
  console.log("✅ Módulos de SAP creados/actualizados.");

  // 6. Crear Asignaciones de Soporte para DOAL
  const supportAssignments = [
    // Soporte General Arvic
    { assignmentId: 'asg_sup_joel', userId: userJoel.userId, companyId: company.companyId, supportId: 'sup_test_remanente', moduleId: modules['mod_mm_test'].moduleId, tarifaConsultor: 350, tarifaCliente: 550, isActive: true },
    { assignmentId: 'asg_sup_alan', userId: userAlan.userId, companyId: company.companyId, supportId: 'sup_test_remanente', moduleId: modules['mod_abap_test'].moduleId, tarifaConsultor: 400, tarifaCliente: 600, isActive: true },
    { assignmentId: 'asg_sup_ana', userId: userAna.userId, companyId: company.companyId, supportId: 'sup_test_remanente', moduleId: modules['mod_fi_test'].moduleId, tarifaConsultor: 320, tarifaCliente: 520, isActive: true },
    { assignmentId: 'asg_sup_carlos', userId: userCarlos.userId, companyId: company.companyId, supportId: 'sup_test_remanente', moduleId: modules['mod_sd_test'].moduleId, tarifaConsultor: 300, tarifaCliente: 500, isActive: true },
    
    // Soporte Especial SAP
    { assignmentId: 'asg_sap_joel', userId: userJoel.userId, companyId: company.companyId, supportId: 'sup_sap_remanente', moduleId: modules['mod_mm_test'].moduleId, tarifaConsultor: 450, tarifaCliente: 650, isActive: true },
    { assignmentId: 'asg_sap_alan', userId: userAlan.userId, companyId: company.companyId, supportId: 'sup_sap_remanente', moduleId: modules['mod_abap_test'].moduleId, tarifaConsultor: 500, tarifaCliente: 700, isActive: true },
    
    // Soporte Mesa de Ayuda
    { assignmentId: 'asg_mesa_joel', userId: userJoel.userId, companyId: company.companyId, supportId: 'sup_mesa_remanente', moduleId: modules['mod_mm_test'].moduleId, tarifaConsultor: 300, tarifaCliente: 500, isActive: true },
    { assignmentId: 'asg_mesa_alan', userId: userAlan.userId, companyId: company.companyId, supportId: 'sup_mesa_remanente', moduleId: modules['mod_abap_test'].moduleId, tarifaConsultor: 350, tarifaCliente: 550, isActive: true }
  ];

  for (const asg of supportAssignments) {
    let exist = await Assignment.findOne({ assignmentId: asg.assignmentId });
    if (!exist) {
      await Assignment.create(asg);
    } else {
      await Assignment.updateOne({ assignmentId: asg.assignmentId }, asg);
    }
  }
  console.log("🔗 Asignaciones de Soporte creadas/actualizadas para DOAL.");

  // 7. Crear Asignaciones de Proyecto
  const projectAssignments = [
    { projectAssignmentId: 'asg_prj_joel', consultorId: userJoel.userId, companyId: company.companyId, projectId: project.projectId, moduleId: modules['mod_mm_test'].moduleId, tarifaConsultor: 450, tarifaCliente: 700, isActive: true },
    { projectAssignmentId: 'asg_prj_alan', consultorId: userAlan.userId, companyId: company.companyId, projectId: project.projectId, moduleId: modules['mod_abap_test'].moduleId, tarifaConsultor: 500, tarifaCliente: 800, isActive: true },
    { projectAssignmentId: 'asg_prj_ana', consultorId: userAna.userId, companyId: company.companyId, projectId: project.projectId, moduleId: modules['mod_fi_test'].moduleId, tarifaConsultor: 420, tarifaCliente: 750, isActive: true },
    { projectAssignmentId: 'asg_prj_carlos', consultorId: userCarlos.userId, companyId: company.companyId, projectId: project.projectId, moduleId: modules['mod_sd_test'].moduleId, tarifaConsultor: 400, tarifaCliente: 720, isActive: true }
  ];

  for (const asg of projectAssignments) {
    let exist = await ProjectAssignment.findOne({ projectAssignmentId: asg.projectAssignmentId });
    if (!exist) {
      await ProjectAssignment.create(asg);
    } else {
      await ProjectAssignment.updateOne({ projectAssignmentId: asg.projectAssignmentId }, asg);
    }
  }
  console.log("🔗 Asignaciones de Proyecto creadas/actualizadas para DOAL.");

  // 8. Limpiar reportes de Mayo 2026
  const startMonth = new Date('2026-05-01T00:00:00Z');
  const endMonth = new Date('2026-05-31T23:59:59Z');

  const deleteResult = await Report.deleteMany({
    companyId: company.companyId,
    date: { $gte: startMonth, $lte: endMonth }
  });
  console.log(`🧹 Limpiados ${deleteResult.deletedCount} reportes previos de Mayo 2026.`);

  let repCounter = 1;

  // 9. Crear Reportes de Soporte Aprobados para Mayo 2026 (Todas las semanas tienen horas)
  
  // === SOPORTE 1: General Arvic (Joel, Alan, Ana, Carlos) ===
  const support1Reports = [
    // Semana 1 (May 1 al May 7)
    { date: '2026-05-03', hours: 12, user: 'USR1804', asg: 'asg_sup_joel', mod: 'mod_mm_test', desc: 'Soporte MM - Cierre inventario W1' },
    { date: '2026-05-04', hours: 15, user: 'USR8527', asg: 'asg_sup_alan', mod: 'mod_abap_test', desc: 'Desarrollo ABAP - Ajuste de ALV W1' },
    { date: '2026-05-05', hours: 10, user: 'TEST_USR001', asg: 'asg_sup_ana', mod: 'mod_fi_test', desc: 'Soporte FI - Cierre contable W1' },
    { date: '2026-05-06', hours: 14, user: 'TEST_USR002', asg: 'asg_sup_carlos', mod: 'mod_sd_test', desc: 'Soporte SD - Configuración ventas W1' },

    // Semana 2 (May 8 al May 14)
    { date: '2026-05-10', hours: 20, user: 'USR1804', asg: 'asg_sup_joel', mod: 'mod_mm_test', desc: 'Soporte MM - Parametrización W2' },
    { date: '2026-05-11', hours: 18, user: 'USR8527', asg: 'asg_sup_alan', mod: 'mod_abap_test', desc: 'Desarrollo ABAP - BADI liberación W2' },
    { date: '2026-05-12', hours: 15, user: 'TEST_USR001', asg: 'asg_sup_ana', mod: 'mod_fi_test', desc: 'Soporte FI - Cuentas por cobrar W2' },
    { date: '2026-05-13', hours: 16, user: 'TEST_USR002', asg: 'asg_sup_carlos', mod: 'mod_sd_test', desc: 'Soporte SD - Facturación W2' },

    // Semana 3 (May 15 al May 21)
    { date: '2026-05-17', hours: 25, user: 'USR1804', asg: 'asg_sup_joel', mod: 'mod_mm_test', desc: 'Soporte MM - Liberación pedidos W3' },
    { date: '2026-05-18', hours: 22, user: 'USR8527', asg: 'asg_sup_alan', mod: 'mod_abap_test', desc: 'Desarrollo ABAP - SmartForm compras W3' },
    { date: '2026-05-19', hours: 20, user: 'TEST_USR001', asg: 'asg_sup_ana', mod: 'mod_fi_test', desc: 'Soporte FI - Activos fijos W3' },
    { date: '2026-05-20', hours: 18, user: 'TEST_USR002', asg: 'asg_sup_carlos', mod: 'mod_sd_test', desc: 'Soporte SD - Logística W3' },

    // Semana 4 (May 22 al May 28)
    { date: '2026-05-24', hours: 15, user: 'USR1804', asg: 'asg_sup_joel', mod: 'mod_mm_test', desc: 'Soporte MM - Inventarios W4' },
    { date: '2026-05-25', hours: 12, user: 'USR8527', asg: 'asg_sup_alan', mod: 'mod_abap_test', desc: 'Desarrollo ABAP - Ajuste de ALV W4' },
    { date: '2026-05-26', hours: 14, user: 'TEST_USR001', asg: 'asg_sup_ana', mod: 'mod_fi_test', desc: 'Soporte FI - Cierre W4' },
    { date: '2026-05-27', hours: 10, user: 'TEST_USR002', asg: 'asg_sup_carlos', mod: 'mod_sd_test', desc: 'Soporte SD - Envíos W4' },

    // Semana 5 (May 29 al May 31)
    { date: '2026-05-29', hours: 8, user: 'USR1804', asg: 'asg_sup_joel', mod: 'mod_mm_test', desc: 'Soporte MM - Cierre final W5' },
    { date: '2026-05-30', hours: 10, user: 'USR8527', asg: 'asg_sup_alan', mod: 'mod_abap_test', desc: 'Desarrollo ABAP - ALV final W5' },
    { date: '2026-05-31', hours: 5, user: 'TEST_USR001', asg: 'asg_sup_ana', mod: 'mod_fi_test', desc: 'Soporte FI - Ajustes W5' },
    { date: '2026-05-31', hours: 6, user: 'TEST_USR002', asg: 'asg_sup_carlos', mod: 'mod_sd_test', desc: 'Soporte SD - Reportes W5' }
  ];

  for (const r of support1Reports) {
    const reportDate = new Date(`${r.date}T12:00:00Z`);
    await Report.create({
      reportId: `rep_seed_sup1_${repCounter++}_${Date.now().toString().slice(-4)}`,
      userId: r.user,
      assignmentId: r.asg,
      assignmentType: 'support',
      companyId: company.companyId,
      supportId: 'sup_test_remanente',
      moduleId: modules[r.mod].moduleId,
      description: r.desc,
      hours: r.hours,
      date: reportDate,
      title: `Reporte Soporte General - ${r.date}`,
      status: 'Aprobado',
      createdAt: reportDate
    });
  }

  // === SOPORTE 2: Especial SAP (Joel, Alan) ===
  const support2Reports = [
    { date: '2026-05-03', hours: 20, user: 'USR1804', asg: 'asg_sap_joel', mod: 'mod_mm_test', desc: 'Soporte Especial MM W1' },
    { date: '2026-05-05', hours: 20, user: 'USR8527', asg: 'asg_sap_alan', mod: 'mod_abap_test', desc: 'Desarrollo Especial ABAP W1' }
  ];

  for (const r of support2Reports) {
    const reportDate = new Date(`${r.date}T12:00:00Z`);
    await Report.create({
      reportId: `rep_seed_sup2_${repCounter++}_${Date.now().toString().slice(-4)}`,
      userId: r.user,
      assignmentId: r.asg,
      assignmentType: 'support',
      companyId: company.companyId,
      supportId: 'sup_sap_remanente',
      moduleId: modules[r.mod].moduleId,
      description: r.desc,
      hours: r.hours,
      date: reportDate,
      title: `Reporte Soporte Especial - ${r.date}`,
      status: 'Aprobado',
      createdAt: reportDate
    });
  }

  // === SOPORTE 3: Mesa de Ayuda (Joel, Alan) ===
  const support3Reports = [
    { date: '2026-05-03', hours: 80, user: 'USR1804', asg: 'asg_mesa_joel', mod: 'mod_mm_test', desc: 'Mesa de Ayuda MM W1' },
    { date: '2026-05-05', hours: 80, user: 'USR8527', asg: 'asg_mesa_alan', mod: 'mod_abap_test', desc: 'Mesa de Ayuda ABAP W1' }
  ];

  for (const r of support3Reports) {
    const reportDate = new Date(`${r.date}T12:00:00Z`);
    await Report.create({
      reportId: `rep_seed_sup3_${repCounter++}_${Date.now().toString().slice(-4)}`,
      userId: r.user,
      assignmentId: r.asg,
      assignmentType: 'support',
      companyId: company.companyId,
      supportId: 'sup_mesa_remanente',
      moduleId: modules[r.mod].moduleId,
      description: r.desc,
      hours: r.hours,
      date: reportDate,
      title: `Reporte Mesa de Ayuda - ${r.date}`,
      status: 'Aprobado',
      createdAt: reportDate
    });
  }

  // 10. Crear Reportes de Proyecto Aprobados
  const projectReports = [
    { date: '2026-05-15', user: 'USR1804', asg: 'asg_prj_joel', mod: 'mod_mm_test', hours: 20, desc: 'Implementación SAP DOAL - Configuración MM' },
    { date: '2026-05-16', user: 'USR8527', asg: 'asg_prj_alan', mod: 'mod_abap_test', hours: 25, desc: 'Implementación SAP DOAL - Desarrollos Z' },
    { date: '2026-05-17', user: 'TEST_USR001', asg: 'asg_prj_ana', mod: 'mod_fi_test', hours: 18, desc: 'Implementación SAP DOAL - Configuración FI' },
    { date: '2026-05-18', user: 'TEST_USR002', asg: 'asg_prj_carlos', mod: 'mod_sd_test', hours: 15, desc: 'Implementación SAP DOAL - Configuración SD' }
  ];

  for (const r of projectReports) {
    const reportDate = new Date(`${r.date}T12:00:00Z`);
    await Report.create({
      reportId: `rep_seed_prj_${repCounter++}_${Date.now().toString().slice(-4)}`,
      userId: r.user,
      assignmentId: r.asg,
      assignmentType: 'project',
      companyId: company.companyId,
      projectId: project.projectId,
      moduleId: modules[r.mod].moduleId,
      description: r.desc,
      hours: r.hours,
      date: reportDate,
      title: `Reporte Proyecto DOAL - ${r.date}`,
      status: 'Aprobado',
      createdAt: reportDate
    });
  }

  console.log("\n🎉 ¡Seeding exitoso!");
  console.log("-----------------------------------------");
  console.log("Filtros para probar en el portal:");
  console.log(`- Tipo de reporte: Reporte Remanente`);
  console.log(`- Cliente: DOAL`);
  console.log(`- Mes de Análisis: Mayo de 2026`);
  console.log("-----------------------------------------");
  
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Error de seeding:", err);
  process.exit(1);
});
