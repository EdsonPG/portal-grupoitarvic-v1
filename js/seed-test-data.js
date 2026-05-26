/**
 * ============================================================
 * SCRIPT DE DATOS DE PRUEBA — PORTAL ARVIC
 * Ejecutar desde la consola del navegador: seedTestData()
 * ============================================================
 */

async function seedTestData() {
    console.log('🌱 Iniciando seeding de datos de prueba...');
    const db = window.PortalDB;
    if (!db) { console.error('❌ PortalDB no disponible'); return; }

    // ──────────────────────────────────────────────
    //  1) CONSULTORES
    // ──────────────────────────────────────────────
    const consultores = [
        { userId: 'admin', name: 'Administrador', email: 'admin@arvic.com', password: 'hperez1402.', role: 'admin', isActive: true },
        { userId: 'USR1804', name: 'Joel Corral', email: 'joel.corral@arvic.com', password: 'consultor123', role: 'consultor', isActive: true },
        { userId: 'USR8527', name: 'Héctor Pérez', email: 'hector.perez@arvic.com', password: 'consultor123', role: 'consultor', isActive: true },
        { userId: 'TEST_USR001', name: 'Ana García López', email: 'ana.garcia@arvic.com', password: 'consultor123', role: 'consultor', isActive: true },
        { userId: 'TEST_USR002', name: 'Carlos Mendoza', email: 'carlos.mendoza@arvic.com', password: 'consultor123', role: 'consultor', isActive: true }
    ];
    const userIds = [];
    for (const c of consultores) {
        try {
            const result = await db.createUser(c);
            const uid = result?.data?.userId || result?.user?.userId || result?.userId || c.name.split(' ')[0].toLowerCase() + '_' + Date.now();
            userIds.push(uid);
            console.log(`✅ Consultor creado: ${c.name} → ${uid}`);
        } catch (e) { console.warn('⚠️ Consultor ya existe o error:', c.name, e.message); userIds.push(null); }
    }
    // Get actual user IDs from DB
    const allUsers = await db.getUsers();
    const consultorUsers = Object.values(allUsers).filter(u => u.role === 'consultor');
    console.log(`📊 Consultores en DB: ${consultorUsers.length}`, consultorUsers.map(u => u.userId || u.id));

    // ──────────────────────────────────────────────
    //  2) EMPRESAS
    // ──────────────────────────────────────────────
    const empresas = [
        { name: 'Grupo Doal', description: 'Empresa de manufactura y distribución', companyId: 'doal_' + Date.now() },
        { name: 'FEMSA', description: 'Empresa líder en la industria de bebidas', companyId: 'femsa_' + Date.now() },
        { name: 'Liverpool', description: 'Cadena de tiendas departamentales', companyId: 'liverpool_' + Date.now() }
    ];
    const companyIds = [];
    for (const e of empresas) {
        try {
            const result = await db.createCompany(e);
            const cid = result?.company?.companyId || result?.data?.companyId || e.companyId;
            companyIds.push(cid);
            console.log(`✅ Empresa creada: ${e.name} → ${cid}`);
        } catch (err) { console.warn('⚠️ Empresa error:', e.name, err.message); companyIds.push(null); }
    }

    // ──────────────────────────────────────────────
    //  3) SOPORTES
    // ──────────────────────────────────────────────
    const soportes = [
        { name: 'Soporte DOAL', description: 'Soporte técnico para Grupo Doal', supportId: 'sop_doal_' + Date.now() },
        { name: 'Soporte FEMSA', description: 'Soporte técnico para FEMSA', supportId: 'sop_femsa_' + Date.now() },
        { name: 'Soporte Liverpool', description: 'Soporte técnico para Liverpool', supportId: 'sop_liverpool_' + Date.now() }
    ];
    const supportIds = [];
    for (const s of soportes) {
        try {
            const result = await db.createSupport(s);
            const sid = result?.support?.supportId || result?.data?.supportId || s.supportId;
            supportIds.push(sid);
            console.log(`✅ Soporte creado: ${s.name} → ${sid}`);
        } catch (err) { console.warn('⚠️ Soporte error:', s.name, err.message); supportIds.push(null); }
    }

    // ──────────────────────────────────────────────
    //  4) MÓDULOS
    // ──────────────────────────────────────────────
    const modulos = [
        { name: 'MM - Gestión de Materiales', description: 'Módulo SAP MM', code: 'MM', moduleId: 'mod_mm_' + Date.now() },
        { name: 'FI - Finanzas', description: 'Módulo SAP FI', code: 'FI', moduleId: 'mod_fi_' + Date.now() },
        { name: 'SD - Ventas y Distribución', description: 'Módulo SAP SD', code: 'SD', moduleId: 'mod_sd_' + Date.now() },
        { name: 'ABAP - Desarrollo', description: 'Desarrollo ABAP', code: 'ABAP', moduleId: 'mod_abap_' + Date.now() },
        { name: 'PP - Planificación', description: 'Módulo SAP PP', code: 'PP', moduleId: 'mod_pp_' + Date.now() }
    ];
    const moduleIds = [];
    for (const m of modulos) {
        try {
            const result = await db.createModule(m);
            const mid = result?.module?.moduleId || result?.data?.moduleId || m.moduleId;
            moduleIds.push(mid);
            console.log(`✅ Módulo creado: ${m.name} → ${mid}`);
        } catch (err) { console.warn('⚠️ Módulo error:', m.name, err.message); moduleIds.push(null); }
    }

    // ──────────────────────────────────────────────
    //  5) PROYECTOS (con límite de horas)
    // ──────────────────────────────────────────────
    const proyectos = [
        { name: 'Implementación SAP S/4HANA', description: 'Migración a S/4HANA para Grupo Doal', projectId: 'prj_s4_' + Date.now(), maxHours: 500 },
        { name: 'Rollout FEMSA', description: 'Extensión de funcionalidades SAP', projectId: 'prj_femsa_' + Date.now(), maxHours: 300 }
    ];
    const projectIds = [];
    for (const p of proyectos) {
        try {
            const result = await db.createProject(p);
            const pid = result?.project?.projectId || result?.data?.projectId || p.projectId;
            projectIds.push(pid);
            console.log(`✅ Proyecto creado: ${p.name} → ${pid} (max: ${p.maxHours}h)`);
        } catch (err) { console.warn('⚠️ Proyecto error:', p.name, err.message); projectIds.push(null); }
    }

    // Re-read all entities from DB to get actual IDs
    const freshUsers = Object.values(await db.getUsers()).filter(u => u.role === 'consultor');
    const freshCompanies = Object.values(await db.getCompanies());
    const freshSupports = Object.values(await db.getSupports());
    const freshModules = Object.values(await db.getModules());
    const freshProjects = Object.values(await db.getProjects());

    console.log('📦 Datos frescos:', {
        users: freshUsers.length,
        companies: freshCompanies.length,
        supports: freshSupports.length,
        modules: freshModules.length,
        projects: freshProjects.length
    });

    if (freshUsers.length < 2 || freshCompanies.length < 1 || freshSupports.length < 1 || freshModules.length < 1) {
        console.error('❌ No hay suficientes datos maestros. Verifica que se crearon correctamente.');
        return;
    }

    // ──────────────────────────────────────────────
    //  6) ASIGNACIONES DE SOPORTE
    // ──────────────────────────────────────────────
    const assignmentConfigs = [];
    // User 0 (Joel) → Soporte DOAL, módulo ABAP
    if (freshUsers[0] && freshCompanies[0] && freshSupports[0] && freshModules[3]) {
        assignmentConfigs.push({
            assignmentId: 'asg_seed_' + Math.random().toString(36).substr(2, 9),
            userId: freshUsers[0].userId || freshUsers[0].id,
            consultorId: freshUsers[0].userId || freshUsers[0].id,
            companyId: freshCompanies[0].companyId || freshCompanies[0].id,
            supportId: freshSupports[0].supportId || freshSupports[0].id,
            moduleId: freshModules[3].moduleId || freshModules[3].id,
            tarifaConsultor: 350, tarifaCliente: 550, isActive: true
        });
    }
    // User 1 (Héctor) → Soporte DOAL, módulo MM
    if (freshUsers[1] && freshCompanies[0] && freshSupports[0] && freshModules[0]) {
        assignmentConfigs.push({
            assignmentId: 'asg_seed_' + Math.random().toString(36).substr(2, 9),
            userId: freshUsers[1].userId || freshUsers[1].id,
            consultorId: freshUsers[1].userId || freshUsers[1].id,
            companyId: freshCompanies[0].companyId || freshCompanies[0].id,
            supportId: freshSupports[0].supportId || freshSupports[0].id,
            moduleId: freshModules[0].moduleId || freshModules[0].id,
            tarifaConsultor: 400, tarifaCliente: 600, isActive: true
        });
    }
    // User 2 (Ana) → Soporte FEMSA, módulo FI
    if (freshUsers[2] && freshCompanies[1] && freshSupports[1] && freshModules[1]) {
        assignmentConfigs.push({
            assignmentId: 'asg_seed_' + Math.random().toString(36).substr(2, 9),
            userId: freshUsers[2].userId || freshUsers[2].id,
            consultorId: freshUsers[2].userId || freshUsers[2].id,
            companyId: freshCompanies[1].companyId || freshCompanies[1].id,
            supportId: freshSupports[1].supportId || freshSupports[1].id,
            moduleId: freshModules[1].moduleId || freshModules[1].id,
            tarifaConsultor: 380, tarifaCliente: 580, isActive: true
        });
    }
    // User 3 (Carlos) → Soporte Liverpool, módulo SD
    if (freshUsers[3] && freshCompanies[2] && freshSupports[2] && freshModules[2]) {
        assignmentConfigs.push({
            assignmentId: 'asg_seed_' + Math.random().toString(36).substr(2, 9),
            userId: freshUsers[3].userId || freshUsers[3].id,
            consultorId: freshUsers[3].userId || freshUsers[3].id,
            companyId: freshCompanies[2].companyId || freshCompanies[2].id,
            supportId: freshSupports[2].supportId || freshSupports[2].id,
            moduleId: freshModules[2].moduleId || freshModules[2].id,
            tarifaConsultor: 320, tarifaCliente: 520, isActive: true
        });
    }

    const createdAssignmentIds = [];
    for (const ac of assignmentConfigs) {
        try {
            const result = await db.createAssignment(ac);
            const aid = result?.assignment?.assignmentId || result?.data?.assignmentId || result?.assignmentId;
            createdAssignmentIds.push(aid);
            console.log(`✅ Asignación soporte creada: ${ac.consultorId} → ${aid}`);
        } catch (err) { console.warn('⚠️ Asignación error:', err.message); createdAssignmentIds.push(null); }
    }

    // ──────────────────────────────────────────────
    //  6.5) ASIGNACIONES DE PROYECTO
    // ──────────────────────────────────────────────
    const projectAssignConfigs = [];
    // User 0 (Joel) → S/4HANA, módulo ABAP
    if (freshUsers[0] && freshCompanies[0] && freshProjects[0] && freshModules[3]) {
        projectAssignConfigs.push({
            projectAssignmentId: 'pa_seed_' + Math.random().toString(36).substr(2, 9),
            consultorId: freshUsers[0].userId || freshUsers[0].id,
            companyId: freshCompanies[0].companyId || freshCompanies[0].id,
            projectId: freshProjects[0].projectId || freshProjects[0].id,
            moduleId: freshModules[3].moduleId || freshModules[3].id,
            tarifaConsultor: 450, tarifaCliente: 700, isActive: true
        });
    }
    // User 1 (Héctor) → S/4HANA, módulo MM
    if (freshUsers[1] && freshCompanies[0] && freshProjects[0] && freshModules[0]) {
        projectAssignConfigs.push({
            projectAssignmentId: 'pa_seed_' + Math.random().toString(36).substr(2, 9),
            consultorId: freshUsers[1].userId || freshUsers[1].id,
            companyId: freshCompanies[0].companyId || freshCompanies[0].id,
            projectId: freshProjects[0].projectId || freshProjects[0].id,
            moduleId: freshModules[0].moduleId || freshModules[0].id,
            tarifaConsultor: 480, tarifaCliente: 750, isActive: true
        });
    }
    // User 2 (Ana) → Rollout FEMSA, módulo FI
    if (freshUsers[2] && freshCompanies[1] && freshProjects[1] && freshModules[1]) {
        projectAssignConfigs.push({
            projectAssignmentId: 'pa_seed_' + Math.random().toString(36).substr(2, 9),
            consultorId: freshUsers[2].userId || freshUsers[2].id,
            companyId: freshCompanies[1].companyId || freshCompanies[1].id,
            projectId: freshProjects[1].projectId || freshProjects[1].id,
            moduleId: freshModules[1].moduleId || freshModules[1].id,
            tarifaConsultor: 460, tarifaCliente: 720, isActive: true
        });
    }

    for (const pac of projectAssignConfigs) {
        try {
            const result = await db.createProjectAssignment(pac);
            const paid = result?.projectAssignment?.projectAssignmentId || result?.data?.projectAssignmentId || result?.projectAssignmentId;
            createdAssignmentIds.push(paid);
            console.log(`✅ Asignación proyecto creada: ${pac.consultorId} → ${paid}`);
        } catch (err) { console.warn('⚠️ Asignación proyecto error:', err.message); }
    }


    // ──────────────────────────────────────────────
    //  7) TIMESHEETS DE PRUEBA
    // ──────────────────────────────────────────────
    console.log('📊 Creando timesheets de prueba...');

    // Activities pool for realistic detail text
    const actividades = {
        ABAP: [
            'Desarrollo de reporte de IVA trasladado Z_FI_IVA_T01',
            'Corrección de programa ABAP Z_MM_REP01 para movimientos de material',
            'Nuevo desarrollo de interfaz IDOC para integración con WMS',
            'Debug y corrección de SmartForm de facturación',
            'Desarrollo de mejora a user exit EXIT_SAPMM06E_001',
            'Creación de Web Dynpro ABAP para portal de aprobaciones',
            'Optimización de programa de carga masiva de datos maestros'
        ],
        MM: [
            'Configuración de Indicador de Impuestos para nuevos materiales',
            'Revisión de proceso de compras: pedidos de compra ME21N',
            'Ajuste de estrategia de liberación de pedidos',
            'Parametrización de tipo de movimiento 561 para inventario inicial',
            'Configuración de valoración de materiales - precio medio móvil',
            'Soporte en proceso de entrada de mercancías MIGO',
            'Resolución de diferencias en inventario físico MI07'
        ],
        FI: [
            'Configuración de plan de cuentas para nueva sociedad',
            'Ajuste de reglas de determinación de cuentas automáticas',
            'Parametrización de impuestos IVA 16% y retenciones',
            'Soporte en proceso de cierre contable mensual',
            'Configuración de bancos propios para pagos automáticos F110',
            'Revisión de conciliación bancaria FF67',
            'Creación de variantes de reporting financiero'
        ],
        SD: [
            'Configuración de proceso de facturación VF01',
            'Ajuste de condiciones de precio para lista de precios',
            'Parametrización de texto de documentos de venta',
            'Soporte en proceso de entrega y picking VL01N',
            'Configuración de determinación de almacén por tipo de pedido',
            'Resolución de bloqueos de facturación',
            'Ajuste de esquema de cálculo de precios'
        ],
        PP: [
            'Configuración de listas de materiales BOM CS01',
            'Parametrización de hojas de ruta CA01',
            'Ajuste de planificación de necesidades MRP MD01',
            'Soporte en proceso de órdenes de fabricación CO01',
            'Configuración de notificaciones de producción CO11N'
        ]
    };

    // Helper: get random activity for a module
    function getActivity(moduleCode) {
        const pool = actividades[moduleCode] || actividades.ABAP;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Helper: get Monday of a given week offset from today
    function getMondayOffset(weeksBack) {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setDate(monday.getDate() - (weeksBack * 7));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    function toISODate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getSunday(monday) {
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        return sunday;
    }

    // Re-read assignments
    const allAssignments = Object.values(await db.getAssignments());
    console.log('📦 Asignaciones totales:', allAssignments.length);

    // Map users to their assignments
    const userAssignmentMap = {};
    const moduleCodes = ['MM', 'FI', 'SD', 'ABAP', 'PP'];

    for (const user of freshUsers) {
        const uid = user.userId || user.id;
        const userAssigns = allAssignments.filter(a => 
            (a.consultorId === uid || a.userId === uid) && a.isActive !== false
        );
        if (userAssigns.length > 0) {
            // Determine module code from module name
            let modCode = 'ABAP';
            if (userAssigns[0].moduleId) {
                const mod = await db.getModule(userAssigns[0].moduleId);
                if (mod?.name) {
                    const found = moduleCodes.find(mc => mod.name.toUpperCase().includes(mc));
                    if (found) modCode = found;
                } else if (mod?.code) {
                    modCode = mod.code;
                }
            }
            userAssignmentMap[uid] = {
                user, 
                assignments: userAssigns, 
                moduleCode: modCode
            };
        }
    }

    console.log('📦 Mapa usuario-asignaciones:', Object.keys(userAssignmentMap).length);

    // Create timesheets for last 6 weeks for each user with assignments
    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const statuses = ['Aprobado', 'Aprobado', 'Aprobado', 'Pendiente', 'Pendiente', 'Borrador'];
    let tsCreated = 0;

    for (const uid of Object.keys(userAssignmentMap)) {
        const { user, assignments, moduleCode } = userAssignmentMap[uid];
        const userName = user.name;

        for (let week = 1; week <= 6; week++) {
            const monday = getMondayOffset(week);
            const sunday = getSunday(monday);
            const weekStart = toISODate(monday);
            const weekEnd = toISODate(sunday);

            // Check if timesheet already exists
            const existing = db.getTimesheetByWeek(uid, weekStart);
            if (existing) { console.log(`⏭️ Timesheet ya existe: ${userName} semana ${weekStart}`); continue; }

            // Build entries for each assignment
            const entries = [];
            let totalWeekHours = 0;

            for (const assign of assignments) {
                const aId = assign.assignmentId || assign.id;
                const days = {};
                let entryTotal = 0;

                // Get entity names for label
                const company = assign.companyId ? await db.getCompany(assign.companyId) : null;
                const support = assign.supportId ? await db.getSupport(assign.supportId) : null;
                const project = assign.projectId ? await db.getProject(assign.projectId) : null;
                const entityName = project?.name || support?.name || 'Asignación';
                const companyName = company?.name || '';

                for (let d = 0; d < 7; d++) {
                    const dk = DAY_KEYS[d];
                    if (d <= 4) { // Mon-Fri
                        const hours = [4, 5, 6, 7, 8][Math.floor(Math.random() * 5)];
                        const detail = getActivity(moduleCode);
                        days[dk] = { hours, detail };
                        entryTotal += hours;
                    } else { // Sat-Sun: sometimes work
                        const workWeekend = Math.random() > 0.7;
                        if (workWeekend) {
                            const hours = [2, 3, 4][Math.floor(Math.random() * 3)];
                            days[dk] = { hours, detail: getActivity(moduleCode) };
                            entryTotal += hours;
                        } else {
                            days[dk] = { hours: 0, detail: '' };
                        }
                    }
                }

                entries.push({
                    assignmentId: aId,
                    assignmentType: assign.supportId ? 'support' : 'project',
                    assignmentLabel: `${entityName} — ${companyName}`,
                    companyId: assign.companyId,
                    moduleId: assign.moduleId,
                    supportId: assign.supportId || null,
                    projectId: assign.projectId || null,
                    days,
                    totalHours: entryTotal
                });
                totalWeekHours += entryTotal;
            }

            const status = statuses[week - 1] || 'Aprobado';
            const tsResult = db.createTimesheet({
                userId: uid,
                userName: userName,
                weekStart,
                weekEnd,
                entries,
                totalWeekHours,
                status
            });

            if (tsResult.success) {
                tsCreated++;
                console.log(`✅ Timesheet: ${userName} | ${weekStart} | ${totalWeekHours}h | ${status}`);

                // If status is Pendiente or Aprobado, also generate individual reports
                if (status !== 'Borrador') {
                    const tsId = tsResult.timesheet.timesheetId;
                    const reportIds = [];
                    for (const entry of entries) {
                        for (let d = 0; d < 7; d++) {
                            const dk = DAY_KEYS[d];
                            const dayData = entry.days[dk];
                            if (dayData.hours > 0) {
                                const cellDate = new Date(monday);
                                cellDate.setDate(cellDate.getDate() + d);
                                try {
                                    const reportResult = await db.createReport({
                                        reportId: 'rep_seed_' + Math.random().toString(36).substr(2, 9),
                                        userId: uid,
                                        assignmentId: entry.assignmentId,
                                        assignmentType: entry.assignmentType,
                                        companyId: entry.companyId,
                                        moduleId: entry.moduleId,
                                        supportId: entry.supportId,
                                        projectId: entry.projectId,
                                        title: `Timesheet ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d]} ${toISODate(cellDate)} — ${entry.assignmentLabel}`,
                                        description: dayData.detail || `Horas registradas: ${dayData.hours}h`,
                                        hours: dayData.hours,
                                        date: toISODate(cellDate),
                                        status: status === 'Aprobado' ? 'Aprobado' : 'Pendiente'
                                    });
                                    if (reportResult?.success) {
                                        const rId = reportResult.report?.id || reportResult.report?.reportId;
                                        if (rId) reportIds.push(rId);
                                    }
                                } catch (e) { /* ignore report creation errors */ }
                            }
                        }
                    }
                    // Update timesheet with report IDs
                    if (reportIds.length > 0) {
                        db.updateTimesheet(tsId, {
                            generatedReportIds: reportIds,
                            submittedAt: new Date(monday.getTime() + 5 * 86400000).toISOString()
                        });
                    }
                }
            }
        }
    }

    console.log(`\n🎉 ¡Seeding completado!`);
    console.log(`   📊 ${tsCreated} timesheets creados`);
    console.log(`   👤 ${freshUsers.length} consultores`);
    console.log(`   🏢 ${freshCompanies.length} empresas`);
    console.log(`   📦 ${freshModules.length} módulos`);
    console.log(`   📋 ${allAssignments.length} asignaciones`);
    console.log(`\n💡 Recarga la página para ver los datos.`);
}

// Export globally
window.seedTestData = seedTestData;
console.log('🌱 Script de seeding cargado. Ejecuta seedTestData() en la consola.');
