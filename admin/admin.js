// Asegurar convertModuleToAcronym para evitar errores si no se carga el script o se carga fuera de orden
if (typeof window.convertModuleToAcronym !== 'function') {
    window.convertModuleToAcronym = function(moduleName) {
        if (!moduleName || moduleName === 'N/A') return 'N/A';
        // Limpiar y separar por espacios
        const words = moduleName.trim().split(/\s+/).filter(word => word.length > 0);
        // Excluir conectores
        const wordsToIgnore = ['a', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'en', 'con', 'sin', 'por', 'para', 'al'];
        const acronym = words
            .filter(word => !wordsToIgnore.includes(word.toLowerCase()))
            .map(word => {
                const cleaned = word.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '');
                return cleaned.charAt(0).toUpperCase();
            })
            .filter(char => char.length > 0)
            .join('');
        return acronym.length > 0 ? acronym : moduleName.charAt(0).toUpperCase();
    };
}

// === PANEL DE AYUDA ===
function toggleHelpPanel() {
    const panel = document.getElementById('helpPanel');
    const btn = document.querySelector('.nav-action-btn[title="Ayuda"]');
    if (!panel) return;

    const isOpen = panel.classList.contains('active');
    
    if (isOpen) {
        panel.classList.remove('active');
        if (btn) btn.classList.remove('active');
        document.removeEventListener('click', closeHelpOnOutsideClick);
    } else {
        panel.classList.add('active');
        if (btn) btn.classList.add('active');
        // Cerrar al hacer click fuera (con delay para evitar cierre inmediato)
        setTimeout(() => {
            document.addEventListener('click', closeHelpOnOutsideClick);
        }, 100);
    }
}

function closeHelpOnOutsideClick(e) {
    const panel = document.getElementById('helpPanel');
    const btn = document.querySelector('.nav-action-btn[title="Ayuda"]');
    if (!panel) return;
    
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('active');
        if (btn) btn.classList.remove('active');
        document.removeEventListener('click', closeHelpOnOutsideClick);
    }
}

function toggleFaq(questionElement) {
    const faqItem = questionElement.closest('.help-faq-item');
    if (!faqItem) return;
    faqItem.classList.toggle('open');
}

function filterHelpItems(query) {
    const items = document.querySelectorAll('.help-faq-item');
    const normalizedQuery = query.toLowerCase().trim();
    
    items.forEach(item => {
        if (!normalizedQuery) {
            item.classList.remove('hidden');
            return;
        }
        const searchData = (item.getAttribute('data-search') || '') + ' ' + (item.textContent || '');
        if (searchData.toLowerCase().includes(normalizedQuery)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

function navigateFromHelp(sectionName) {
    // Cerrar panel de ayuda
    toggleHelpPanel();
    // Navegar a la sección
    const menuItem = document.querySelector(`.sidebar-menu-item[data-section="${sectionName}"]`);
    if (menuItem) {
        menuItem.click();
    }
}

// === PANEL DE NOTIFICACIONES ===
let notifCurrentUserId = null;

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.querySelector('.nav-action-btn[title="Notificaciones"]');
    if (!panel) return;

    // Close help panel if open
    const helpPanel = document.getElementById('helpPanel');
    if (helpPanel && helpPanel.classList.contains('active')) {
        toggleHelpPanel();
    }

    const isOpen = panel.classList.contains('active');
    
    if (isOpen) {
        panel.classList.remove('active');
        if (btn) btn.classList.remove('active');
        document.removeEventListener('click', closeNotifOnOutsideClick);
    } else {
        panel.classList.add('active');
        if (btn) btn.classList.add('active');
        loadNotifications();
        setTimeout(() => {
            document.addEventListener('click', closeNotifOnOutsideClick);
        }, 100);
    }
}

function closeNotifOnOutsideClick(e) {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.querySelector('.nav-action-btn[title="Notificaciones"]');
    if (!panel) return;
    
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('active');
        if (btn) btn.classList.remove('active');
        document.removeEventListener('click', closeNotifOnOutsideClick);
    }
}

async function loadNotifications() {
    const userId = notifCurrentUserId || 'admin';
    try {
        const notifications = await window.PortalDB.getNotifications(userId);
        renderNotifications(notifications);
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="notif-empty">
                <i class="fa-solid fa-bell-slash"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }

    const iconMap = {
        'report_created': 'fa-solid fa-file-circle-plus',
        'report_approved': 'fa-solid fa-circle-check',
        'report_rejected': 'fa-solid fa-circle-xmark',
        'report_resubmitted': 'fa-solid fa-rotate',
        'assignment_new': 'fa-solid fa-clipboard-list',
        'user_registered': 'fa-solid fa-user-plus',
        'system': 'fa-solid fa-gear'
    };

    container.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.notificationId}', this)">
            <div class="notif-icon type-${n.type}">
                <i class="${iconMap[n.type] || 'fa-solid fa-bell'}"></i>
            </div>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">
                    <i class="fa-solid fa-clock"></i>
                    ${timeAgo(n.createdAt)}
                </div>
            </div>
            ${!n.read ? '<span class="notif-unread-dot"></span>' : ''}
        </div>
    `).join('');
}

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr} hr${diffHr > 1 ? 's' : ''}`;
    if (diffDay < 7) return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

async function markNotificationRead(notifId, element) {
    try {
        await window.PortalDB.markNotificationAsRead(notifId);
        if (element) {
            element.classList.remove('unread');
            const dot = element.querySelector('.notif-unread-dot');
            if (dot) dot.remove();
        }
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marcando notificación:', error);
    }
}

async function markAllNotificationsRead() {
    const userId = notifCurrentUserId || 'admin';
    try {
        await window.PortalDB.markAllNotificationsAsRead(userId);
        loadNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marcando todas:', error);
    }
}

async function updateNotificationBadge() {
    const userId = notifCurrentUserId || 'admin';
    try {
        const count = await window.PortalDB.getUnreadNotificationCount(userId);
        const badge = document.getElementById('notifyBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error actualizando badge:', error);
    }
}

// Auto-actualizar badge cada 30 segundos
setInterval(() => {
    if (window.PortalDB) {
        updateNotificationBadge();
    }
}, 30000);

// Iniciar badge al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Detectar userId del admin
        const user = window.AuthSys?.getCurrentUser?.();
        if (user) {
            notifCurrentUserId = user.userId;
        }
        updateNotificationBadge();
    }, 2000);
});

// Función helper para crear notificaciones desde otros flujos
async function sendNotification(userId, type, title, message, relatedId = null) {
    try {
        const iconMap = {
            'report_created': 'fa-solid fa-file-circle-plus',
            'report_approved': 'fa-solid fa-circle-check',
            'report_rejected': 'fa-solid fa-circle-xmark',
            'report_resubmitted': 'fa-solid fa-rotate',
            'assignment_new': 'fa-solid fa-clipboard-list',
            'user_registered': 'fa-solid fa-user-plus',
            'system': 'fa-solid fa-gear'
        };

        await window.PortalDB.createNotification({
            userId,
            type,
            title,
            message,
            icon: iconMap[type] || 'fa-solid fa-bell',
            relatedId
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}

let dataCacheTimestamp = null;
let currentReportFilter = 'all';
let currentApprovedReportFilter = 'all';
const CACHE_DURATION = 5 * 60 * 1000;

// Aquí se configuran la sección de reportes de Arvic
const ARVIC_REPORTS = {
    'pago-consultor-general': { 
        name: 'Pago Consultor Soporte (General)',
        icon: '<i class="fa-solid fa-money-bill"></i>',
        description: 'Información general de todos los soportes con cálculo de pagos para consultores',
        audience: '<i class="fa-solid fa-crown"></i> Administradores y Gerentes',
        filters: ['time', 'support'],
        structure: ['ID EMPRESA', 'CONSULTOR', 'SOPORTE', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  
        excelTitle: 'RESUMEN DE PAGO A CONSULTOR'
    },
    'pago-consultor-especifico': {
        name: 'Pago Consultor Soporte (Consultor)',
        icon: '<i class="fa-solid fa-user"></i>',
        description: 'Datos de soportes de un consultor específico con filtros flexibles',
        audience: '<i class="fa-solid fa-user"></i> Consultores y Supervisores',
        filters: ['consultant', 'support', 'time'],
        structure: ['ID EMPRESA', 'CONSULTOR', 'SOPORTE', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'PAGO A CONSULTOR'
    },
    'cliente-soporte': {
        name: 'Cliente Soporte (Cliente)',
        icon: '<i class="fa-solid fa-headset"></i>',
        description: 'Soportes brindados a un cliente específico para transparencia de servicios',
        audience: '<i class="fa-solid fa-building"></i> Clientes y Atención al Cliente',
        filters: ['client', 'support', 'time'],
        structure: ['SOPORTE', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'Cliente: [Nombre]'
    },
    'remanente': {
        name: 'Reporte Remanente',
        icon: '<i class="fa-solid fa-chart-pie"></i>',
        description: 'Información acumulada de reportes aprobados dividida por semanas del mes',
        audience: '<i class="fa-solid fa-crown"></i> Administradores - Seguimiento',
        filters: ['client', 'supportType', 'month', 'project'],
        structure: ['Total de Horas', 'SEMANA 1', 'SEMANA 2', 'SEMANA 3', 'SEMANA 4'],
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'REPORTE REMANENTE',
        specialFormat: 'weekly'
    },
    'proyecto-general': {
        name: 'Proyecto (General)',
        icon: '<i class="fa-solid fa-folder-open"></i>',
        description: 'Información general de todos los proyectos con recursos asignados',
        audience: '<i class="fa-solid fa-crown"></i> Administradores y Gerentes',
        filters: ['time', 'project'],
        structure: ['ID EMPRESA', 'CONSULTOR', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'Proyecto: [Nombre]'
    },
    'proyecto-cliente': {
        name: 'Proyecto (Cliente)',
        icon: '<i class="fa-solid fa-building"></i>',
        description: 'Proyectos de un cliente específico con vista simplificada para presentación externa',
        audience: '<i class="fa-solid fa-building"></i> Clientes',
        filters: ['client', 'project', 'time'],
        structure: ['ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'Proyecto: [Nombre]'
    },
    'proyecto-consultor': {
        name: 'Proyecto (Consultor)',
        icon: '<i class="fa-solid fa-user"></i>',
        description: 'Proyectos asignados a un consultor específico para seguimiento personal',
        audience: '<i class="fa-solid fa-user"></i> Consultores',
        filters: ['consultant', 'project', 'time'],
        structure: ['ID EMPRESA', 'CONSULTOR', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL'],  // ✅ MODIFICADO
        editableFields: ['TIEMPO', 'TARIFA'],  // ✅ MODIFICADO
        excelTitle: 'Proyecto: [Nombre]'
    },
    'reporte-actividades': {
        name: 'Reporte de Actividades',
        icon: '<i class="fa-solid fa-file-lines"></i>',
        description: 'Reporte semanal de actividades con formato corporativo (2 hojas: Reporte + Detalle)',
        audience: '<i class="fa-solid fa-users"></i> Consultores y Administradores',
        filters: ['consultant', 'timesheetWeek'],
        structure: ['CLIENTE', 'MÓDULO', 'TICKET', 'FECHA', 'ACTIVIDAD', 'DIAS', 'HORAS', 'LIDER'],
        editableFields: [],
        excelTitle: 'REPORTE DE ACTIVIDADES',
        specialFormat: 'activity-report'
    }
};

// Variables globales para el nuevo sistema de reportes
let currentReportType = null;
let currentReportData = null;
let currentReportConfig = null;
let editablePreviewData = {};



function diagnosticCompleteAdmin() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO ===');
    
    // Verificar que estamos en la página correcta
    console.log('📄 URL actual:', window.location.href);
    console.log('📄 Título:', document.title);
    
    // Verificar todas las secciones
    const allSections = document.querySelectorAll('[id$="-section"]');
    console.log('📝 Secciones encontradas:');
    allSections.forEach(section => {
        console.log(`  - ${section.id} (display: ${getComputedStyle(section).display})`);
    });
    
    // Verificar la sección específica
    const createSection = document.getElementById('crear-asignacion-section');
    if (createSection) {
        console.log('✅ crear-asignacion-section encontrada');
        console.log('  - Display:', getComputedStyle(createSection).display);
        console.log('  - Clases:', createSection.className);
        
        // Buscar todos los selects dentro de esta sección
        const selectsInSection = createSection.querySelectorAll('select');
        console.log(`  - Selects encontrados: ${selectsInSection.length}`);
        selectsInSection.forEach((select, index) => {
            console.log(`    ${index + 1}. ID: "${select.id}" Name: "${select.name}"`);
        });
    } else {
        console.error('❌ crear-asignacion-section NO encontrada');
    }
    
    // Verificar cada elemento específico
    const targetElements = ['assignUser', 'assignCompany', 'assignSupport', 'assignModule'];
    targetElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: Encontrado (${element.tagName})`);
            console.log(`    - Parent: ${element.parentElement?.className || 'unknown'}`);
            console.log(`    - Visible: ${getComputedStyle(element).display !== 'none'}`);
        } else {
            console.error(`❌ ${id}: NO ENCONTRADO`);
        }
    });
    
    // Buscar elementos similares por nombre
    const allSelects = document.querySelectorAll('select');
    console.log('🔍 Todos los selects en la página:');
    allSelects.forEach((select, index) => {
        console.log(`  ${index + 1}. ID: "${select.id}" Name: "${select.name}" Class: "${select.className}"`);
    });
}

function debugDropdowns() {
    console.log('🔍 Diagnosticando elementos del DOM...');
    
    const elements = [
        'assignUser',
        'assignCompany', 
        'assignSupport',
        'assignModule'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Element ${id}:`, element ? '✅ Exists' : '❌ NOT FOUND');
        if (element) {
            console.log(`  - Type: ${element.tagName}`);
            console.log(`  - Parent: ${element.parentElement?.id || 'unknown'}`);
        }
    });
    
    // Verificar si la sección está visible
    const section = document.getElementById('crear-asignacion-section');
    console.log('Crear asignación section:', section ? '✅ Exists' : '❌ NOT FOUND');
    if (section) {
        console.log('  - Display:', getComputedStyle(section).display);
        console.log('  - Has active class:', section.classList.contains('active'));
    }
}

/// === GESTIÓN DE ASIGNACIONES ===
async function createAssignment() {
    // Capturar valores básicos
    const userId = document.getElementById('assignUser').value;
    const companyId = document.getElementById('assignCompany').value;
    const supportId = document.getElementById('assignSupport').value;
    const moduleId = document.getElementById('assignModule').value;
    
    // Capturar tarifas - CRÍTICO
    const tarifaConsultorInput = document.getElementById('assignTarifaConsultor');
    const tarifaClienteInput = document.getElementById('assignTarifaCliente');
    
    const tarifaConsultor = tarifaConsultorInput ? parseFloat(tarifaConsultorInput.value) || 0 : 0;
    const tarifaCliente = tarifaClienteInput ? parseFloat(tarifaClienteInput.value) || 0 : 0;
    
    console.log('DEBUG TARIFAS - Valores capturados:', {
        tarifaConsultor: tarifaConsultor,
        tarifaCliente: tarifaCliente,
        inputConsultorExiste: !!tarifaConsultorInput,
        inputClienteExiste: !!tarifaClienteInput
    });
    
    // Validar campos básicos
    if (!userId || !companyId || !supportId || !moduleId) {
        window.NotificationUtils.error('Todos los campos son requeridos');
        return;
    }
    
    // Validar tarifas
    if (tarifaConsultor <= 0 || tarifaCliente <= 0) {
        window.NotificationUtils.error('Las tarifas deben ser mayores a 0');
        return;
    }
    
    const timestamp = Date.now().toString().slice(-4);
    const assignmentId = `ASG${timestamp}`;

    // Crear objeto de datos
    const assignmentData = {
        assignmentId: assignmentId,
        userId: userId,
        companyId: companyId,
        supportId: supportId,
        moduleId: moduleId, 
        tarifaConsultor: tarifaConsultor,
        tarifaCliente: tarifaCliente
    };
    
    console.log('ENVIANDO A DATABASE:', assignmentData);
    
    // Crear asignación
    const result = await window.PortalDB.createAssignment(assignmentData);
    
    if (result.success) {
        window.NotificationUtils.success('Asignación creada exitosamente');
        await loadCurrentData(true);
        updateUI();

        // Limpiar formulario
        document.getElementById('assignUser').value = '';
        document.getElementById('assignCompany').value = '';
        document.getElementById('assignSupport').value = '';
        document.getElementById('assignModule').value = '';
        if (tarifaConsultorInput) tarifaConsultorInput.value = '';
        if (tarifaClienteInput) tarifaClienteInput.value = '';
        
        // Resetear margen
        if (typeof updateAssignMargen === 'function') {
            updateAssignMargen();
        }
    } else {
        window.NotificationUtils.error('Error: ' + result.message);
    }
}

async function deleteProjectAssignment(assignmentId) {
    if (!confirm('¿Está seguro de eliminar esta asignación de proyecto?')) {
        return;
    }
    
    const result = await window.PortalDB.deleteProjectAssignment(assignmentId);
    
    if (result.success) {
        window.NotificationUtils.success('Asignación de proyecto eliminada');
        loadAllData();
    } else {
        window.NotificationUtils.error('Error: ' + result.message);
    }
}

async function deleteAssignment(assignmentId) {
    if (!confirm('¿Está seguro de eliminar esta asignación?')) {
        return;
    }

    const result = await window.PortalDB.deleteAssignment(assignmentId);

    if (result.success) {
        window.NotificationUtils.success('Asignación eliminada correctamente');
        loadAllData();
    } else {
        window.NotificationUtils.error('Error al eliminar asignación: ' + result.message);
    }
}

// === CARGA Y ACTUALIZACIÓN DE DATOS ===
async function loadAllData() {
    console.log('Cargando todos los datos...');
    
    try {
        currentData.users = await window.PortalDB.getUsers() || {};
        currentData.companies = await window.PortalDB.getCompanies() || {};
        currentData.projects = await window.PortalDB.getProjects() || {};
        currentData.assignments = await window.PortalDB.getAssignments() || {};
        currentData.supports = await window.PortalDB.getSupports() || {};
        currentData.modules = await window.PortalDB.getModules() || {};
        currentData.reports = await window.PortalDB.getReports() || {};
        currentData.projectAssignments = await window.PortalDB.getProjectAssignments() || {};
        currentData.taskAssignments = await window.PortalDB.getTaskAssignments() || {};
        
        // Set cache timestamp so loadCurrentData() won't re-fetch immediately
        dataCacheTimestamp = Date.now();
        
        console.log('Datos cargados:', {
            users: Object.keys(currentData.users).length,
            companies: Object.keys(currentData.companies).length,
            supports: Object.keys(currentData.supports).length,
            modules: Object.keys(currentData.modules).length
        });
        
        await updateUI();
        
        if (currentSection === 'crear-asignacion') {
            console.log('Actualizando dropdowns después de cargar datos...');
            updateDropdowns();
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

async function updateUI() {
    console.log('=== ACTUALIZANDO UI ===');
    
    try {
        await updateSidebarCounts();
        await updateCurrentSectionData();
        
        console.log('UI actualizada correctamente');
    } catch (error) {
        console.error('Error actualizando UI:', error);
    }
}

async function updateCurrentSectionData() {
    if (!currentSection) {
        console.log('currentSection no definida');
        return;
    }

    console.log(`Actualizando datos para sección actual: ${currentSection}`);
    await loadSectionData(currentSection);
}

function updateStats() {
    /*
    const stats = window.PortalDB.getStats();

    document.getElementById('usersCount').textContent = stats.totalUsers;
    document.getElementById('companiesCount').textContent = stats.totalCompanies;
    document.getElementById('projectsCount').textContent = stats.totalProjects;
    document.getElementById('assignmentsCount').textContent = stats.totalAssignments;
    */
}

async function updateSidebarCounts() {
    await loadCurrentData();
    
    try {
        const users = currentData.users || {};
        const companies = currentData.companies || {};
        const projects = currentData.projects || {};
        const supports = currentData.supports || {};
        const modules = currentData.modules || {};
        const assignments = currentData.assignments || {};
        const reports = currentData.reports || {};
        const tarifario = currentData.tarifario || {};
        const projectAssignments = currentData.projectAssignments || {};
        const taskAssignments = currentData.taskAssignments || {};

        // Contar consultores activos (excluyendo admin)
        const consultorCount = Object.values(users).filter(u => u.role === 'consultor' && u.isActive !== false).length;
        const empresaCount = Object.values(companies).filter(c => c.isActive !== false).length;
        const proyectoCount = Object.values(projects).filter(p => p.isActive !== false).length;
        const soporteCount = Object.values(supports).filter(s => s.isActive !== false).length;
        const moduloCount = Object.values(modules).filter(m => m.isActive !== false).length;
        const tarifarioCount = Object.keys(tarifario).length;
        const assignCount = Object.keys(assignments).length;
        const projectAssignCount = Object.keys(projectAssignments).length;
        const taskCount = Object.values(taskAssignments).filter(t => t.isActive !== false).length;
        const pendingReports = Object.values(reports).filter(r => r.status === 'Pendiente').length;
        const timesheets = currentData.timesheets || {};
        const pendingTimesheets = Object.values(timesheets).filter(t => t.status === 'Pendiente').length;

        // Obtener contadores del historial de reportes generados desde MongoDB
        let generatedReportsCount = 0;
        try {
            const generatedReports = await window.PortalDB.getGeneratedReports();
            generatedReportsCount = Object.values(generatedReports || {}).length;
        } catch (e) {
            console.error('Error al actualizar contador del historial de reportes:', e);
        }

        // Sidebar badges
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('sidebarConsultoresCount', consultorCount);
        setEl('sidebarEmpresasCount', empresaCount);
        setEl('sidebarProyectosCount', proyectoCount);
        setEl('sidebarSoportesCount', soporteCount);
        setEl('sidebarModulosCount', moduloCount);
        setEl('sidebarTarifarioCount', tarifarioCount);
        setEl('sidebarAssignmentsCount', assignCount);
        setEl('sidebarProjectAssignmentsCount', projectAssignCount);
        setEl('sidebarTaskCount', taskCount);
        setEl('sidebarReportsCount', pendingReports);
        setEl('sidebarTimesheetsCount', pendingTimesheets || Object.keys(timesheets).length);
        
        const approvedCount = Object.values(reports).filter(r => r.status === 'Aprobado').length;
        setEl('sidebarApprovedReportsCount', approvedCount);
        setEl('sidebarGeneratedReportsCount', generatedReportsCount);

        console.log('Contadores de sidebar actualizados (unificado):', {
            consultorCount, empresaCount, proyectoCount, soporteCount, moduloCount,
            tarifarioCount, assignCount, projectAssignCount, taskCount, pendingReports,
            pendingTimesheets, approvedCount, generatedReportsCount
        });
    } catch (error) {
        console.error('Error updateSidebarCounts:', error);
    }
}

async function updateSupportsList() {
    await loadCurrentData();
    // Intentar obtener el contenedor original o el de Gestión Maestra
    const container = document.getElementById('supportsList') || document.getElementById('supportsMasterList');
    
    if (!container) {
        console.warn('Contenedor para lista de soportes no encontrado');
        return;
    }

    if (!currentData.supports) {
        console.warn('currentData.supports es undefined');
        currentData.supports = {};
    }

    const supports = Object.values(currentData.supports);

    if (supports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-headset"></i></div>
                <div class="empty-state-title">No hay soportes</div>
                <div class="empty-state-desc">Cree el primer soporte</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    supports.forEach(support => {
        const supportDiv = document.createElement('div');
        supportDiv.className = 'item hover-lift';

        const assignedConsultors = Object.values(currentData.assignments || {}).filter(a =>
            a.supportId === support.supportId && a.isActive !== false
        );

        supportDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding-bottom: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-id">${support.supportId}</span>
                        <strong style="font-size: 1rem;">${support.name}</strong>
                        ${assignedConsultors.length > 0
                            ? `<span class="custom-badge badge-info">ACTIVO</span>`
                            : `<span class="custom-badge badge-warning">SIN ASIGNAR</span>`}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="editSupport('${support.supportId}')" title="Editar soporte">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSupport('${support.supportId}')" title="Eliminar soporte">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px 0 -20px;
                            border-top: 1px solid var(--gray-200); background: var(--gray-50);">
                    <small style="color: var(--gray-600); font-weight: 500; font-size: 0.8rem;">
                        Consultores asignados: <strong>${assignedConsultors.length}</strong>
                    </small>
                    <small style="color: var(--gray-600); font-weight: 500; font-size: 0.8rem;">
                        ${support.description ? `<i class="fa-solid fa-file-alt" style="color:var(--gray-500);"></i> ${window.TextUtils.truncate(support.description, 50)}` : '<span style="color:var(--gray-400);">Sin descripción</span>'}
                    </small>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px -20px -20px;
                            border-top: 1px solid var(--gray-200); background: var(--gray-0, #ffffff);">
                    <small style="color: var(--gray-500); font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-calendar" style="color: var(--success-color);"></i>
                        ${window.DateUtils.formatDate(support.createdAt)}
                    </small>
                    <small style="color: transparent; font-size: 0.75rem;">—</small>
                </div>
            </div>
        `;
        container.appendChild(supportDiv);
    });
}

async function updateApprovedReportsList() {
    const approvedReportsTableBody = document.getElementById('approvedReportsTableBody');
    const timeFilter = document.getElementById('timeFilter');
    const customDateRange = document.getElementById('customDateRange');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const filterInfo = document.getElementById('filterInfo');
    
    if (!approvedReportsTableBody) {
        console.warn('⚠️ No se encontró approvedReportsTableBody');
        return;
    }
    
    // Aseguramos de que se cargan los datos antes de usarlos
    await loadCurrentData();
    
    // Mostrar/ocultar rango personalizado
    if (timeFilter && customDateRange) {
        if (timeFilter.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
        }
    }
    
    const reports = Object.values(currentData.reports || {});
    const approvedReports = reports.filter(r => r.status === 'Aprobado');
    
    console.log('📊 Total reportes aprobados:', approvedReports.length);
    
    // Filtrar reportes por fecha
    let filteredReports = [];
    const now = new Date();
    let filterText = '';
    
    if (timeFilter) {
        switch(timeFilter.value) {
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                filteredReports = approvedReports.filter(report => {
                    const reportDate = new Date(report.createdAt);
                    return reportDate >= startOfWeek && reportDate <= endOfWeek;
                });
                
                filterText = `Esta semana (${window.DateUtils.formatDate(startOfWeek)} - ${window.DateUtils.formatDate(endOfWeek)})`;
                break;
                
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                
                filteredReports = approvedReports.filter(report => {
                    const reportDate = new Date(report.createdAt);
                    return reportDate >= startOfMonth && reportDate <= endOfMonth;
                });
                
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                filterText = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                break;
                
            case 'custom':
                if (startDate && endDate && startDate.value && endDate.value) {
                    const customStart = new Date(startDate.value);
                    customStart.setHours(0, 0, 0, 0);
                    
                    const customEnd = new Date(endDate.value);
                    customEnd.setHours(23, 59, 59, 999);
                    
                    filteredReports = approvedReports.filter(report => {
                        const reportDate = new Date(report.createdAt);
                        return reportDate >= customStart && reportDate <= customEnd;
                    });
                    
                    filterText = `${window.DateUtils.formatDate(customStart)} - ${window.DateUtils.formatDate(customEnd)}`;
                } else {
                    filteredReports = approvedReports;
                    filterText = 'Rango personalizado (seleccione fechas)';
                }
                break;
                
            default:
                filteredReports = approvedReports;
                filterText = 'Todas las fechas';
                break;
        }
    } else {
        filteredReports = approvedReports;
        filterText = 'Esta semana';
    }
    
    // Filtrar por categoría si existe
    let categoryFilteredReports = filteredReports;
    if (typeof currentApprovedReportFilter !== 'undefined' && currentApprovedReportFilter !== 'all') {
        categoryFilteredReports = filteredReports.filter(report => {
            const category = getReportCategory(report);
            return category === currentApprovedReportFilter;
        });
    }
    
    // Actualizar contadores si existe la función
    if (typeof updateApprovedReportCategoryCounts === 'function') {
        updateApprovedReportCategoryCounts(filteredReports);
    }

    // Actualizar texto informativo
    if (filterInfo) {
        filterInfo.textContent = `Mostrando: ${filterText}`;
    }
    
    if (categoryFilteredReports.length === 0) {
        approvedReportsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-message">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-chart-pie"></i></div>
                        <div class="empty-state-title">No hay reportes aprobados</div>
                        <div class="empty-state-desc">Intenta ajustar los filtros de fecha o categoría</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const assignmentSummary = {};
    const reportCounts = {};
    
    categoryFilteredReports.forEach(report => {
        const assignmentId = report.assignmentId;
        
        if (!assignmentId) {
            console.warn('⚠️ Reporte sin assignmentId:', report.id);
            return;
        }
        
        let assignment = null;
        let user = null;
        let company = null;
        let module = null;
        let workName = 'No asignado';
        
        if (report.assignmentType === 'task') {
            assignment = currentData.taskAssignments?.[assignmentId];
            if (assignment) {
                user = currentData.users[assignment.consultorId];
                company = currentData.companies[assignment.companyId];
                module = currentData.modules[assignment.moduleId];
                const support = currentData.supports[assignment.linkedSupportId];
                workName = support ? `${support.name} (Tarea)` : 'Tarea sin soporte';
            }
        } else if (report.assignmentType === 'project') {
            assignment = currentData.projectAssignments?.[assignmentId];
            if (assignment) {
                user = currentData.users[assignment.consultorId || assignment.userId];
                company = currentData.companies[assignment.companyId];
                module = currentData.modules[assignment.moduleId];
                const project = currentData.projects[assignment.projectId];
                workName = project ? project.name : 'Proyecto no encontrado';
            }
        } else {
            assignment = currentData.assignments?.[assignmentId];
            if (assignment) {
                user = currentData.users[assignment.userId];
                company = currentData.companies[assignment.companyId];
                module = currentData.modules[assignment.moduleId];
                const support = currentData.supports[assignment.supportId];
                workName = support ? support.name : 'Soporte no encontrado';
            }
        }
        
        if (!assignment || !user || !company || !module) {
            console.warn('⚠️ Datos incompletos para reporte:', report.id);
            return;
        }
        
        const key = assignmentId;
        
        if (!reportCounts[key]) {
            reportCounts[key] = 0;
        }
        reportCounts[key]++;
        
        if (!assignmentSummary[key]) {
            assignmentSummary[key] = {
                assignmentId: assignmentId,
                consultantId: user.userId,
                consultantName: user.name,
                companyId: company.companyId,
                companyName: company.name,
                workName: workName,
                moduleName: module.name,
                totalHours: 0
            };
        }
        
        assignmentSummary[key].totalHours += parseFloat(report.hours || 0);
    });
    
    console.log('📊 Resumen de asignaciones:', Object.keys(assignmentSummary).length);
    
    // Generar tabla
    approvedReportsTableBody.innerHTML = '';
    Object.values(assignmentSummary).forEach(summary => {
        const reportCount = reportCounts[summary.assignmentId];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><span class="consultant-id">${summary.consultantId}</span></td>
            <td><span class="consultant-name">${summary.consultantName}</span></td>
            <td><span class="consultant-id">${summary.companyId}</span></td>
            <td><span class="company-name">${summary.companyName}</span></td>
            <td><span class="project-name">${summary.workName}</span></td>
            <td>${summary.moduleName}</td>
            <td>
                <span class="hours-reported">${summary.totalHours.toFixed(1)} hrs</span>
                <small style="color: #666; display: block; font-size: 0.8em;">
                    <i class="fa-solid fa-chart-pie"></i> ${reportCount} reporte${reportCount > 1 ? 's' : ''} agrupado${reportCount > 1 ? 's' : ''}
                </small>
            </td>
        `;
        approvedReportsTableBody.appendChild(row);
    });
    
    console.log('✅ Tabla de reportes aprobados actualizada');
}


// === SOLUCIÓN SIMPLE: HEADERS Y COLUMNAS DINÁMICAS ===

/**
 * 1. NUEVA FUNCIÓN: Actualiza headers dinámicamente según filtro
 */
function updateTableHeaders() {
    const thead = document.querySelector('#reportsTable thead tr');
    if (!thead) return;
    
    if (currentReportFilter === 'proyecto') {
        // Headers para PROYECTO (9 columnas - sin "Tipo Soporte")
        thead.innerHTML = `
            <th>ID Consultor</th>
            <th>Nombre Consultor</th>
            <th>Cliente (Empresa)</th>
            <th>Proyecto</th>
            <th>Módulo</th>
            <th>Horas Reportadas</th>
            <th>Fecha Reporte</th>
            <th>Estado</th>
            <th>Acciones</th>
        `;
    } else {
        // Headers para SOPORTE y TODOS (10 columnas - con "Tipo Soporte")
        const soporteLabel = currentReportFilter === 'all' ? 'Asignación' : 'Soporte';
        
        thead.innerHTML = `
            <th>ID Consultor</th>
            <th>Nombre Consultor</th>
            <th>Cliente (Empresa)</th>
            <th>${soporteLabel}</th>
            <th>Módulo</th>
            <th>Horas Reportadas</th>
            <th>Fecha Reporte</th>
            <th>Estado</th>
            <th>Acciones</th>
        `;
    }
}

async function updateCompaniesList() {
    await loadCurrentData();
    const container = document.getElementById('companiesList');
    const companies = Object.values(currentData.companies);

    const validCompanies = companies.filter(company =>
        company.companyId &&
        company.companyId !== 'undefined'
    );

    if (validCompanies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-building"></i></div>
                <div class="empty-state-title">No hay empresas</div>
                <div class="empty-state-desc">Registre la primera empresa cliente</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    validCompanies.forEach(company => {
        const companyDiv = document.createElement('div');
        companyDiv.className = 'item hover-lift';

        const assignedCount = Object.values(currentData.assignments || {}).filter(a =>
            a.companyId === company.companyId && a.isActive !== false
        ).length + Object.values(currentData.projectAssignments || {}).filter(a =>
            a.companyId === company.companyId && a.isActive !== false
        ).length;

        companyDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding-bottom: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-id">${company.companyId}</span>
                        <strong style="font-size: 1rem;">${company.name}</strong>
                        ${assignedCount > 0
                            ? `<span class="custom-badge badge-info">CLIENTE ACTIVO</span><span class="custom-badge badge-primary">${assignedCount}</span>`
                            : `<span class="custom-badge badge-warning">SIN ASIGNACIONES</span>`}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="editCompany('${company.companyId}')" title="Editar empresa">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCompany('${company.companyId}')" title="Eliminar empresa">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px 0 -20px;
                            border-top: 1px solid #e5e7eb; background: #f9fafb;">
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        Asignaciones activas: <strong>${assignedCount}</strong>
                    </small>
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        ${company.description ? `<i class="fa-solid fa-file-alt" style="color:#6b7280;"></i> ${window.TextUtils.truncate(company.description, 50)}` : '<span style="color:#9ca3af;">Sin descripción</span>'}
                    </small>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px -20px -20px;
                            border-top: 1px solid #e5e7eb; background: #ffffff;">
                    <small style="color: #666; font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-calendar" style="color: #10b981;"></i>
                        ${window.DateUtils.formatDate(company.createdAt)}
                    </small>
                    <small style="color: transparent; font-size: 0.75rem;">—</small>
                </div>
            </div>
        `;
        container.appendChild(companyDiv);
    });
}

async function updateProjectsList() {
    await loadCurrentData();
    const container = document.getElementById('projectsList');
    const projects = Object.values(currentData.projects);

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
                <div class="empty-state-title">No hay proyectos</div>
                <div class="empty-state-desc">Cree el primer proyecto</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    for (const project of projects) {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'item hover-lift';

        const assignedConsultors = Object.values(currentData.projectAssignments || {}).filter(a =>
            a.projectId === project.projectId && a.isActive !== false
        );

        // Calculate consumed hours for this project
        const hoursInfo = getProjectHoursConsumed(project.projectId);
        const maxH = project.maxHours || 0;
        const pct = maxH > 0 ? Math.round((hoursInfo.total / maxH) * 100) : 0;
        const barClass = pct >= 100 ? 'exceeded' : pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : '';

        let hoursHTML = '';
        if (maxH > 0) {
            hoursHTML = `
                <div style="padding:8px 20px; margin:0 -20px; border-top:1px solid #e5e7eb; background:#f0fdf4;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <small style="font-weight:600; color:#374151; font-size:0.8rem;">
                            <i class="fa-solid fa-clock" style="color:${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'}"></i>
                            ${hoursInfo.total.toFixed(1)} / ${maxH} hrs (${pct}%)
                        </small>
                        <small style="color:#6b7280; font-size:0.72rem;">${hoursInfo.consultors} consultor(es)</small>
                    </div>
                    <div class="project-hours-bar ${barClass}" style="height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden;">
                        <div style="height:100%; width:${Math.min(pct,100)}%; border-radius:3px; transition:width 0.3s;
                            background:${pct >= 100 ? '#ef4444' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'};"></div>
                    </div>
                </div>`;
        }

        projectDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding-bottom: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-id">${project.projectId}</span>
                        <strong style="font-size: 1rem;">${project.name}</strong>
                        ${assignedConsultors.length > 1
                            ? `<span class="custom-badge badge-info">MÚLTIPLE</span><span class="custom-badge badge-primary">${assignedConsultors.length}</span>`
                            : assignedConsultors.length === 1
                            ? `<span class="custom-badge badge-success">EN CURSO</span><span class="custom-badge badge-primary">1</span>`
                            : `<span class="custom-badge badge-warning">SIN ASIGNAR</span>`}
                        ${maxH > 0 ? `<span class="custom-badge" style="background:${pct >= 90 ? '#fef2f2' : '#f0fdf4'}; color:${pct >= 90 ? '#ef4444' : '#059669'}; font-size:0.7rem;">${maxH}h límite</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="editProject('${project.projectId}')" title="Editar proyecto">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProject('${project.projectId}')" title="Eliminar proyecto">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                ${hoursHTML}

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px 0 -20px;
                            border-top: 1px solid #e5e7eb; background: #f9fafb;">
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        Consultores: <strong>${assignedConsultors.length}</strong>
                    </small>
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        ${project.description ? `<i class="fa-solid fa-file-alt" style="color:#6b7280;"></i> ${window.TextUtils.truncate(project.description, 50)}` : '<span style="color:#9ca3af;">Sin descripción</span>'}
                    </small>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px -20px -20px;
                            border-top: 1px solid #e5e7eb; background: #ffffff;">
                    <small style="color: #666; font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-calendar" style="color: #10b981;"></i>
                        ${window.DateUtils.formatDate(project.createdAt)}
                    </small>
                    <small style="color: transparent; font-size: 0.75rem;">—</small>
                </div>
            </div>
        `;
        container.appendChild(projectDiv);
    }
}

/**
 * Calculate total hours consumed for a project across all consultors and timesheets
 */
function getProjectHoursConsumed(projectId) {
    let total = 0;
    const consultorSet = new Set();
    const timesheets = window.PortalDB.getTimesheets();
    const projectAssignments = Object.values(currentData.projectAssignments || {}).filter(a =>
        a.projectId === projectId && a.isActive !== false
    );
    const paIds = new Set(projectAssignments.map(a => a.projectAssignmentId || a.id));

    Object.values(timesheets).forEach(ts => {
        if (!ts.entries) return;
        ts.entries.forEach(entry => {
            if (paIds.has(entry.assignmentId)) {
                total += entry.totalHours || 0;
                if (ts.userId) consultorSet.add(ts.userId);
            }
        });
    });
    return { total, consultors: consultorSet.size };
}

/**
 * Get a detailed breakdown of hours consumed by each consultor in a project
 */
function getProjectHoursBreakdown(projectId) {
    const breakdown = {};
    const timesheets = window.PortalDB.getTimesheets();
    const users = window.PortalDB.getUsers();
    const projectAssignments = Object.values(currentData.projectAssignments || {}).filter(a =>
        a.projectId === projectId && a.isActive !== false
    );
    const paIds = new Set(projectAssignments.map(a => a.projectAssignmentId || a.id));

    Object.values(timesheets).forEach(ts => {
        if (!ts.entries) return;
        ts.entries.forEach(entry => {
            if (paIds.has(entry.assignmentId)) {
                const uid = ts.userId;
                if (!breakdown[uid]) {
                    const usr = users[uid];
                    breakdown[uid] = {
                        name: usr ? usr.name : 'Desconocido',
                        hours: 0
                    };
                }
                breakdown[uid].hours += entry.totalHours || 0;
            }
        });
    });

    return Object.values(breakdown);
}


function updateTasksList() {
    const container = document.getElementById('tasksList');
    const tasks = Object.values(currentData.tasks);
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-check"></i></div>
                <div class="empty-state-title">No hay tareas</div>
                <div class="empty-state-desc">Cree la primera tarea</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'item hover-lift';
        
        // Determinar colores según estado y prioridad
        const statusColors = {
            'Pendiente': '#f39c12',
            'En Progreso': '#3498db',
            'Completada': '#27ae60'
        };
        
        const priorityColors = {
            'Baja': '#95a5a6',
            'Media': '#f39c12',
            'Alta': '#e74c3c'
        };
        
        taskDiv.innerHTML = `
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <span class="item-id">${task.taskAssignmentId}</span>
                    <strong>${task.name}</strong>
                    <span class="custom-badge" style="background: ${statusColors[task.status]}20; color: ${statusColors[task.status]}; border: 1px solid ${statusColors[task.status]};">
                        ${task.status}
                    </span>
                    ${task.priority ? `
                        <span class="custom-badge" style="background: ${priorityColors[task.priority]}20; color: ${priorityColors[task.priority]}; border: 1px solid ${priorityColors[task.priority]}; font-size: 11px;">
                            ${task.priority}
                        </span>
                    ` : ''}
                </div>
                <small style="color: #666;">
                    <i class="fa-solid fa-calendar"></i> Creada: ${window.DateUtils.formatDate(task.createdAt)}
                    ${task.description ? `<br><i class="fa-solid fa-file-alt"></i> ${window.TextUtils.truncate(task.description, 60)}` : ''}
                </small>
            </div>
            <button class="delete-btn" onclick="deleteTask('${task.taskAssignmentId}')" title="Eliminar tarea">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(taskDiv);
    });
}

async function updateModulesList() {
    await loadCurrentData();
    // Intentar obtener el contenedor original o el de Gestión Maestra
    const container = document.getElementById('modulesList') || document.getElementById('modulesMasterList');

    if (!container) {
        console.warn('Contenedor para lista de módulos no encontrado');
        return;
    }

    if (!currentData.modules) {
        console.warn('currentData.modules es undefined');
        currentData.modules = {};
    }

    const modules = Object.values(currentData.modules);

    if (modules.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-puzzle-piece"></i></div>
                <div class="empty-state-title">No hay módulos</div>
                <div class="empty-state-desc">Cree el primer módulo</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    modules.forEach(module => {
        const moduleDiv = document.createElement('div');
        moduleDiv.className = 'item hover-lift';

        const usageCount = Object.values(currentData.assignments || {}).filter(a =>
            a.moduleId === module.moduleId && a.isActive !== false
        ).length + Object.values(currentData.projectAssignments || {}).filter(a =>
            a.moduleId === module.moduleId && a.isActive !== false
        ).length;

        moduleDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding-bottom: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-id">${module.moduleId}</span>
                        <strong style="font-size: 1rem;">${module.name}</strong>
                        ${usageCount > 0
                            ? `<span class="custom-badge badge-info">EN USO</span><span class="custom-badge badge-primary">${usageCount}</span>`
                            : `<span class="custom-badge badge-warning">SIN USAR</span>`}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="editModule('${module.moduleId}')" title="Editar módulo">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteModule('${module.moduleId}')" title="Eliminar módulo">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px 0 -20px;
                            border-top: 1px solid #e5e7eb; background: #f9fafb;">
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        Asignaciones activas: <strong>${usageCount}</strong>
                    </small>
                    <small style="color: #555; font-weight: 500; font-size: 0.8rem;">
                        ${module.description ? `<i class="fa-solid fa-file-alt" style="color:#6b7280;"></i> ${window.TextUtils.truncate(module.description, 50)}` : '<span style="color:#9ca3af;">Sin descripción</span>'}
                    </small>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px -20px -20px;
                            border-top: 1px solid #e5e7eb; background: #ffffff;">
                    <small style="color: #666; font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-calendar" style="color: #10b981;"></i>
                        ${window.DateUtils.formatDate(module.createdAt)}
                    </small>
                    <small style="color: transparent; font-size: 0.75rem;">—</small>
                </div>
            </div>
        `;
        container.appendChild(moduleDiv);
    });
}

async function updateProjectAssignmentDropdowns() {
    console.log('🔄 Actualizando dropdowns de asignación de proyectos...');
    await loadCurrentData();
    
    // Verificar datos básicos
    if (!currentData || !currentData.users || !currentData.companies || !currentData.projects || !currentData.modules) {
        console.error('❌ Datos no disponibles para asignación de proyectos');
        return;
    }
    
    // Configuración con los campos ID correctos
    const elementsConfig = [
        {
            id: 'assignProjectConsultor',
            defaultOption: 'Seleccionar consultor',
            data: Object.values(currentData.users).filter(user => 
                user.role === 'consultor' && user.isActive !== false
            ),
            getLabel: (user) => `${user.name} (${user.userId})`,
            valueField: 'userId'  // ✅ ESPECIFICAR EL CAMPO ID
        },
        {
            id: 'assignProjectProject',
            defaultOption: 'Seleccionar proyecto',
            data: Object.values(currentData.projects),
            getLabel: (project) => `${project.name}`,
            valueField: 'projectId'  // ✅ ESPECIFICAR EL CAMPO ID
        },
        {
            id: 'assignProjectCompany',
            defaultOption: 'Seleccionar empresa cliente',
            data: Object.values(currentData.companies),
            getLabel: (company) => `${company.name} (${company.companyId})`,
            valueField: 'companyId'  // ✅ ESPECIFICAR EL CAMPO ID
        },
        {
            id: 'assignProjectModule',
            defaultOption: 'Seleccionar módulo',
            data: Object.values(currentData.modules),
            getLabel: (module) => `${module.name} (${module.moduleId})`,
            valueField: 'moduleId'  // ✅ ESPECIFICAR EL CAMPO ID
        }
    ];
    
    // Actualizar cada dropdown
    elementsConfig.forEach(config => {
        try {
            const element = document.getElementById(config.id);
            if (!element) {
                console.error(`❌ ${config.id} no encontrado`);
                return;
            }
            
            // Limpiar y agregar opción por defecto
            element.innerHTML = `<option value="">${config.defaultOption}</option>`;
            
            // Agregar opciones de datos
            if (config.data && config.data.length > 0) {
                config.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item[config.valueField];  // ✅ USAR EL CAMPO CORRECTO
                    option.textContent = config.getLabel(item);
                    element.appendChild(option);
                });
                console.log(`✅ ${config.id} actualizado con ${config.data.length} opciones`);
            }
        } catch (error) {
            console.error(`❌ Error actualizando ${config.id}:`, error);
        }
    });
}

function updateConsultorsList() {
    const container = document.getElementById('consultorsListContainer');
    if (!container) return;
    
    const consultors = Object.values(currentData.users).filter(user => 
        user.role === 'consultor' && user.isActive !== false
    );
    
    if (consultors.length === 0) {
        container.innerHTML = '<p>No hay consultores disponibles</p>';
        return;
    }
    
    container.innerHTML = '';
    consultors.forEach(consultor => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'consultor-checkbox-item';
        checkboxDiv.innerHTML = `
            <label class="consultor-checkbox-label">
                <input type="checkbox" 
                       name="selectedConsultors" 
                       value="${consultor.id}" 
                       class="consultor-checkbox">
                <span class="checkbox-text">${consultor.name} (${consultor.id})</span>
            </label>
        `;
        container.appendChild(checkboxDiv);
    });
}

async function updateProjectAssignmentsList() {
    console.log('🔄 Actualizando lista de proyectos asignados...');
    await loadCurrentData(); 
    const container = document.getElementById('projectAssignmentsList');
    
    if (!container) {
        console.error('❌ Container projectAssignmentsList no encontrado');
        return;
    }
    
    // Obtener todas las asignaciones de proyecto
    const assignments = Object.values(currentData.projectAssignments || {});
    
    console.log('📊 Proyectos asignados:', assignments.length);
    
    // Si no hay asignaciones
    if (assignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">No hay proyectos asignados</div>
                <div class="empty-state-desc">Los proyectos asignados aparecerán aquí</div>
            </div>
        `;
        return;
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Renderizar cada asignación de proyecto
    assignments.forEach(assignment => {
        // ✅ FIX: Usar projectAssignmentId (NO assignmentId)
        const projectAssignmentId = assignment.projectAssignmentId;
        const displayId = projectAssignmentId ? projectAssignmentId.slice(-6) : 'N/A';
        
        // Obtener datos relacionados
        const project = currentData.projects[assignment.projectId];
        const company = currentData.companies[assignment.companyId];
        const module = currentData.modules[assignment.moduleId];
        const consultor = currentData.users[assignment.consultorId];
        
        // Crear tarjeta de asignación
        const assignmentDiv = document.createElement('div');
        assignmentDiv.className = 'project-assignment-card';
        
        assignmentDiv.innerHTML = `
            <div class="assignment-header">
                <h3><i class="fa-solid fa-bullseye"></i> ${project?.name || 'Proyecto no encontrado'}</h3>
                <span class="assignment-id">${displayId}</span>
            </div>
            
            <div class="assignment-details">
                <p><strong><i class="fa-solid fa-user"></i> Consultor:</strong> ${consultor?.name || 'No asignado'} (${assignment.consultorId || 'N/A'})</p>
                <p><strong><i class="fa-solid fa-building"></i> Cliente:</strong> ${company?.name || 'No asignado'}</p>
                <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'No asignado'}</p>
                <p><strong><i class="fa-solid fa-dollar-sign"></i> Tarifas:</strong> 
                    Consultor: $${assignment.tarifaConsultor || 0}/hr | 
                    Cliente: $${assignment.tarifaCliente || 0}/hr
                </p>
                <p><strong><i class="fa-solid fa-calendar"></i> Fecha de Asignación:</strong> ${window.DateUtils?.formatDate(assignment.createdAt) || 'N/A'}</p>
            </div>
            
            <div class="assignment-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteProjectAssignment('${projectAssignmentId}')">
                    <i class="fa-solid fa-trash"></i> Eliminar Asignación
                </button>
            </div>
        `;
        
        container.appendChild(assignmentDiv);
    });
    
    console.log('✅ Lista de proyectos asignados actualizada');
}

async function updateAssignmentsList() {
    console.log('🔄 Actualizando lista de asignaciones...');
    await loadCurrentData();
    const container = document.getElementById('assignmentsList');
    const recentContainer = document.getElementById('recentAssignments');
    
    if (!container) {
        console.error('❌ Container assignmentsList no encontrado');
        return;
    }
    
    // 🔄 COMBINAR asignaciones de soporte, proyecto Y tareas
    const supportAssignments = Object.values(currentData.assignments || {}).map(a => ({
        ...a,
        assignmentType: 'support'
    }));
    
    const projectAssignments = Object.values(currentData.projectAssignments || {}).map(a => ({
        ...a,
        assignmentType: 'project'
    }));
    
    const taskAssignments = Object.values(currentData.taskAssignments || {}).map(a => ({
        ...a,
        assignmentType: 'task'
    }));
    
    const allAssignments = [...supportAssignments, ...projectAssignments, ...taskAssignments]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    console.log('📊 Total asignaciones:', {
        soporte: supportAssignments.length,
        proyecto: projectAssignments.length,
        tareas: taskAssignments.length,
        total: allAssignments.length
    });
    
    // ============================================================
    // LISTA COMPLETA
    // ============================================================
    updateAssignmentsFilterCounts(allAssignments);

    if (allAssignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">No hay asignaciones</div>
                <div class="empty-state-desc">Las asignaciones creadas aparecerán aquí</div>
            </div>
        `;
        const pagination = document.getElementById('assignmentsPagination');
        if (pagination) pagination.style.display = 'none';
    } else {
        container.innerHTML = '';

        allAssignments.forEach(assignment => {
            container.appendChild(createAssignmentListCard(assignment));
        });
        assignmentsListPage = 1;
        applyAssignmentsListView();
    }
    
    // ============================================================
    // ASIGNACIONES RECIENTES (últimas 5)
    // ============================================================
    if (recentContainer) {
        const recentAssignments = allAssignments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        if (recentAssignments.length === 0) {
            recentContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">Sin asignaciones</div>
                    <div class="empty-state-desc">Las asignaciones recientes aparecerán aquí</div>
                </div>
            `;
        } else {
            recentContainer.innerHTML = '';
            
            recentAssignments.forEach(assignment => {
                const assignmentDiv = document.createElement('div');
                assignmentDiv.className = 'item hover-lift';
                
                if (assignment.assignmentType === 'support') {
                    const user = currentData.users[assignment.userId];
                    const company = currentData.companies[assignment.companyId];
                    const support = currentData.supports[assignment.supportId];
                    const module = currentData.modules[assignment.moduleId];
                    
                    if (user && company && support && module) {
                        assignmentDiv.innerHTML = `
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                    <strong>${user.name}</strong>
                                    <span class="custom-badge" style="background: #3498db20; color: #3498db; border: 1px solid #3498db;">
                                        <i class="fa-solid fa-phone"></i> SOPORTE
                                    </span>
                                    <span class="custom-badge badge-success">
                                        ${window.DateUtils?.formatRelativeTime(assignment.createdAt) || 'Reciente'}
                                    </span>
                                </div>
                                <small style="color: #666;">
                                    <i class="fa-solid fa-building"></i> ${company.name} | 
                                    <i class="fa-solid fa-phone"></i> ${support.name} | 
                                    <i class="fa-solid fa-puzzle-piece"></i> ${module.name}
                                </small>
                            </div>
                        `;
                        recentContainer.appendChild(assignmentDiv);
                    }
                    
                } else if (assignment.assignmentType === 'project') {
                    const consultor = currentData.users[assignment.consultorId];
                    const company = currentData.companies[assignment.companyId];
                    const project = currentData.projects[assignment.projectId];
                    const module = currentData.modules[assignment.moduleId];
                    
                    if (consultor && company && project && module) {
                        assignmentDiv.innerHTML = `
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                    <strong>${consultor.name}</strong>
                                    <span class="custom-badge" style="background: #e74c3c20; color: #e74c3c; border: 1px solid #e74c3c;">
                                        <i class="fa-solid fa-clipboard"></i> PROYECTO
                                    </span>
                                    <span class="custom-badge badge-success">
                                        ${window.DateUtils?.formatRelativeTime(assignment.createdAt) || 'Reciente'}
                                    </span>
                                </div>
                                <small style="color: #666;">
                                    <i class="fa-solid fa-building"></i> ${company.name} | 
                                    <i class="fa-solid fa-clipboard"></i> ${project.name} | 
                                    <i class="fa-solid fa-puzzle-piece"></i> ${module.name}
                                </small>
                            </div>
                        `;
                        recentContainer.appendChild(assignmentDiv);
                    }
                    
                } else if (assignment.assignmentType === 'task') {
                    const consultor = currentData.users[assignment.consultorId];
                    const company = currentData.companies[assignment.companyId];
                    const support = currentData.supports[assignment.linkedSupportId];
                    const module = currentData.modules[assignment.moduleId];
                    
                    if (consultor && company && module) {
                        assignmentDiv.innerHTML = `
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                    <strong>${consultor.name}</strong>
                                    <span class="custom-badge" style="background: #9b59b620; color: #9b59b6; border: 1px solid #9b59b6;">
                                        <i class="fa-solid fa-tasks"></i> TAREA
                                    </span>
                                    <span class="custom-badge badge-success">
                                        ${window.DateUtils?.formatRelativeTime(assignment.createdAt) || 'Reciente'}
                                    </span>
                                </div>
                                <small style="color: #666;">
                                    <i class="fa-solid fa-building"></i> ${company.name} | 
                                    ${support ? `<i class="fa-solid fa-headset"></i> ${support.name} | ` : ''}
                                    <i class="fa-solid fa-puzzle-piece"></i> ${module.name}
                                </small>
                            </div>
                        `;
                        recentContainer.appendChild(assignmentDiv);
                    }
                }
            });
        }
    }
    
    console.log('✅ Lista de asignaciones actualizada');
}

function resolveAssignmentListModel(assignment) {
    let assignmentId = 'N/A';
    let consultor = null;
    let company = null;
    let workName = 'No encontrado';
    let moduleName = 'No asignado';
    let typeLabel = 'Asignación';
    let typeIcon = 'fa-link';
    let typeClass = 'support';
    let deleteHandler = '';
    let editHandler = '';

    if (assignment.assignmentType === 'support') {
        assignmentId = assignment.assignmentId;
        consultor = currentData.users?.[assignment.userId];
        company = currentData.companies?.[assignment.companyId];
        const support = currentData.supports?.[assignment.supportId];
        const mod = currentData.modules?.[assignment.moduleId];
        workName = support?.name || 'Soporte no encontrado';
        moduleName = mod?.name || 'No asignado';
        typeLabel = 'Soporte';
        typeIcon = 'fa-headset';
        typeClass = 'support';
        deleteHandler = `deleteAssignment('${assignmentId}')`;
    } else if (assignment.assignmentType === 'project') {
        assignmentId = assignment.projectAssignmentId;
        consultor = currentData.users?.[assignment.consultorId];
        company = currentData.companies?.[assignment.companyId];
        const project = currentData.projects?.[assignment.projectId];
        const mod = currentData.modules?.[assignment.moduleId];
        workName = project?.name || 'Proyecto no encontrado';
        moduleName = mod?.name || 'No asignado';
        typeLabel = 'Proyecto';
        typeIcon = 'fa-folder-open';
        typeClass = 'project';
        deleteHandler = `deleteProjectAssignment('${assignmentId}')`;
    } else if (assignment.assignmentType === 'task') {
        assignmentId = assignment.taskAssignmentId;
        consultor = currentData.users?.[assignment.consultorId];
        company = currentData.companies?.[assignment.companyId];
        const mod = currentData.modules?.[assignment.moduleId];
        workName = assignment.descripcion ? window.TextUtils.truncate(assignment.descripcion, 72) : 'Tarea sin descripción';
        moduleName = mod?.name || 'No asignado';
        typeLabel = 'Tarea';
        typeIcon = 'fa-list-check';
        typeClass = 'task';
        deleteHandler = `deactivateTask('${assignmentId}')`;
        editHandler = `editTask('${assignmentId}')`;
    }

    const consultorRate = Number(assignment.tarifaConsultor || assignment.costoConsultor || 0);
    const clientRate = Number(assignment.tarifaCliente || assignment.costoCliente || 0);
    const margin = clientRate - consultorRate;
    const displayId = assignmentId && assignmentId !== 'N/A' ? assignmentId.slice(-6).toUpperCase() : 'N/A';
    const consultorId = assignment.userId || assignment.consultorId || 'N/A';
    const searchable = normalizeAssignmentSearchText([
        assignmentId,
        displayId,
        typeLabel,
        workName,
        consultor?.name,
        consultorId,
        company?.name,
        moduleName,
        consultorRate,
        clientRate,
        margin
    ].filter(Boolean).join(' '));

    return {
        assignmentId,
        displayId,
        type: assignment.assignmentType,
        typeLabel,
        typeIcon,
        typeClass,
        workName,
        consultorName: consultor?.name || 'No asignado',
        consultorId,
        companyName: company?.name || 'No asignado',
        moduleName,
        consultorRate,
        clientRate,
        margin,
        deleteHandler,
        editHandler,
        searchable
    };
}

function createAssignmentListCard(assignment) {
    const model = resolveAssignmentListModel(assignment);
    const card = document.createElement('article');
    card.className = `assignment-list-card assignment-list-card--${model.typeClass}`;
    card.dataset.assignmentType = model.type;
    card.dataset.searchable = model.searchable;
    card.dataset.filteredOut = 'false';
    card.title = `${model.typeLabel}: ${model.workName} | ${model.consultorName} (${model.consultorId}) | ${model.companyName} | ${model.moduleName}`;

    card.innerHTML = `
        <div class="assignment-list-main">
            <div class="assignment-list-title-row">
                <span class="assignment-type-pill assignment-type-pill--${model.typeClass}">
                    <i class="fa-solid ${model.typeIcon}"></i> ${model.typeLabel}
                </span>
                <h3>${model.workName}</h3>
                <span class="assignment-id-pill">${model.displayId}</span>
            </div>
            <div class="assignment-list-meta">
                <span><i class="fa-solid fa-user"></i> ${model.consultorName} <em>(${model.consultorId})</em></span>
                <span><i class="fa-solid fa-building"></i> ${model.companyName}</span>
                <span><i class="fa-solid fa-puzzle-piece"></i> ${model.moduleName}</span>
            </div>
        </div>
        <div class="assignment-list-money">
            <span><small>Consultor</small><strong>$${model.consultorRate.toFixed(2)}/hr</strong></span>
            <span><small>Cliente</small><strong>$${model.clientRate.toFixed(2)}/hr</strong></span>
            <span><small>Margen</small><strong class="${model.margin >= 0 ? 'positive' : 'negative'}">$${model.margin.toFixed(2)}/hr</strong></span>
        </div>
        <div class="assignment-list-actions">
            ${model.editHandler ? `<button type="button" class="crud-action-btn edit" onclick="${model.editHandler}" title="Editar" aria-label="Editar asignación ${model.displayId}"><i class="fa-solid fa-pen"></i></button>` : ''}
            <button type="button" class="crud-action-btn delete" onclick="${model.deleteHandler}" title="Eliminar" aria-label="Eliminar asignación ${model.displayId}"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;

    return card;
}

function normalizeAssignmentSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function updateAssignmentsFilterCounts(assignments) {
    const counts = {
        all: assignments.length,
        support: assignments.filter(a => a.assignmentType === 'support').length,
        project: assignments.filter(a => a.assignmentType === 'project').length,
        task: assignments.filter(a => a.assignmentType === 'task').length
    };

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('assignmentsFilterAll', counts.all);
    setText('assignmentsFilterSupport', counts.support);
    setText('assignmentsFilterProject', counts.project);
    setText('assignmentsFilterTask', counts.task);
}

function setAssignmentsFilter(type) {
    assignmentsListFilter = type;
    assignmentsListPage = 1;
    document.querySelectorAll('.assignment-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.assignmentFilter === type);
    });
    applyAssignmentsListView();
}

function setAssignmentsPageSize(size) {
    assignmentsListPageSize = parseInt(size, 10) || 10;
    assignmentsListPage = 1;
    applyAssignmentsListView();
}

function changeAssignmentsPage(delta) {
    assignmentsListPage = Math.max(1, assignmentsListPage + delta);
    applyAssignmentsListView();
}

function filterAssignmentsList() {
    assignmentsListPage = 1;
    applyAssignmentsListView();
}

function applyAssignmentsListView() {
    const container = document.getElementById('assignmentsList');
    if (!container) return;

    const search = normalizeAssignmentSearchText(document.getElementById('searchAssignmentsList')?.value || '');
    const cards = Array.from(container.querySelectorAll('.assignment-list-card'));
    if (cards.length === 0) return;

    const matchingCards = cards.filter(card => {
        const matchesType = assignmentsListFilter === 'all' || card.dataset.assignmentType === assignmentsListFilter;
        const matchesSearch = !search || (card.dataset.searchable || '').includes(search);
        return matchesType && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(matchingCards.length / assignmentsListPageSize));
    assignmentsListPage = Math.min(assignmentsListPage, totalPages);
    const start = (assignmentsListPage - 1) * assignmentsListPageSize;
    const end = start + assignmentsListPageSize;
    const visible = new Set(matchingCards.slice(start, end));

    cards.forEach(card => {
        card.style.display = visible.has(card) ? 'grid' : 'none';
    });

    let noResults = container.querySelector('.assignment-no-results');
    if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'assignment-no-results';
        noResults.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                <div class="empty-state-title">Sin coincidencias</div>
                <div class="empty-state-desc">Ajusta la búsqueda o cambia el filtro de tipo</div>
            </div>
        `;
        container.appendChild(noResults);
    }
    noResults.style.display = matchingCards.length === 0 ? 'block' : 'none';

    const pagination = document.getElementById('assignmentsPagination');
    const status = document.getElementById('assignmentsPaginationStatus');
    const prev = document.getElementById('assignmentsPrevPage');
    const next = document.getElementById('assignmentsNextPage');
    if (pagination && status && prev && next) {
        const firstShown = matchingCards.length === 0 ? 0 : start + 1;
        const lastShown = Math.min(end, matchingCards.length);
        status.textContent = `${firstShown}-${lastShown} de ${matchingCards.length}`;
        pagination.style.display = cards.length > assignmentsListPageSize || matchingCards.length !== cards.length ? 'flex' : 'none';
        prev.disabled = assignmentsListPage <= 1;
        next.disabled = assignmentsListPage >= totalPages;
    }
}

async function updateReportsList() {
    const reportsTableBody = document.getElementById('reportsTableBody');
    
    if (!reportsTableBody) return;
    
    // ✅ CARGAR DATOS ANTES DE USARLOS
    await loadCurrentData();
    
    const allReports = Object.values(currentData.reports);
    const pendingReports = allReports.filter(r => r.status === 'Pendiente');
    
    if (pendingReports.length === 0) {
        reportsTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-table-message">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-file-alt"></i></div>
                        <div class="empty-state-title">No hay reportes pendientes</div>
                        <div class="empty-state-desc">Los reportes pendientes aparecerán aquí para su revisión</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        reportsTableBody.innerHTML = '';
        pendingReports.forEach(report => {
            const user = currentData.users[report.userId];
            
            let assignment = null;
            let company = null;
            let support = null;
            let module = null;
            
            if (report.assignmentId) {
                assignment = currentData.assignments[report.assignmentId];
                if (assignment) {
                    company = currentData.companies[assignment.companyId];
                    support = currentData.supports[assignment.supportId];
                    module = currentData.modules[assignment.moduleId];
                }
            } else {
                assignment = Object.values(currentData.assignments).find(a => a.userId === report.userId && a.isActive);
                if (assignment) {
                    company = currentData.companies[assignment.companyId];
                    support = currentData.supports[assignment.supportId];
                    module = currentData.modules[assignment.moduleId];
                }
            }
            
            if (user) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="consultant-id">${user.userId}</span></td>
                    <td><span class="consultant-name">${user.name}</span></td>
                    <td><span class="company-name">${company ? company.name : 'Sin asignación'}</span></td>
                    <td><span class="project-name">${support ? support.name : 'Sin soporte'}</span></td>
                    <td>${module ? module.name : 'Sin módulo'}</td>
                    <td><span class="hours-reported">${report.hours || '0'} hrs</span></td>
                    <td><span class="report-date">${window.DateUtils.formatDate(report.createdAt)}</span></td>
                    <td>
                        <span class="status-badge status-${report.status.toLowerCase()}">
                            ${report.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn btn-approve" onclick="approveReport('${report.id}')" title="Aprobar reporte">
                                <i class="fa-solid fa-check"></i> Aprobar
                            </button>
                            <button class="action-btn btn-reject" onclick="rejectReport('${report.id}')" title="Rechazar reporte">
                                <i class="fa-solid fa-xmark"></i> Rechazar
                            </button>
                            <button class="action-btn btn-view" onclick="viewReport('${report.id}')" title="Ver detalles">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                        </div>
                    </td>
                `;
                reportsTableBody.appendChild(row);
            }
        });
    }
}

async function approveReport(reportId) {
    console.log(`✅ Aprobando reporte: ${reportId}`);
    
    try {
        // Confirmar acción
        if (!confirm('¿Está seguro de aprobar este reporte?')) {
            return;
        }
        
        // Actualizar estado del reporte en MongoDB
        const result = await window.PortalDB.updateReport(reportId, {
            status: 'Aprobado',
            approvedAt: new Date().toISOString(),
            approvedBy: window.AuthSys?.getCurrentUser()?.userId || 'admin'
        });
        
        if (result.success) {
            console.log('Reporte aprobado exitosamente');
            
            // Mostrar notificación
            if (typeof showNotification === 'function') {
                showNotification('Reporte aprobado exitosamente', 'success');
            } else {
                alert('Reporte aprobado exitosamente');
            }
            
            // ⭐ RECARGAR DATOS Y ACTUALIZAR VISTA
            await loadCurrentData();
            await updateReportsList();
            
            // Actualizar contadores del sidebar
            if (typeof updateSidebarCounts === 'function') {
                updateSidebarCounts();
            }
            
        } else {
            console.error('Error aprobando reporte:', result.message);
            alert('Error al aprobar el reporte: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error en approveReport:', error);
        alert('Error al aprobar el reporte');
    }
}

async function rejectReport(reportId) {
    console.log(`Rechazando reporte: ${reportId}`);
    
    try {
        // Pedir razón del rechazo
        const reason = prompt('Por favor, indique la razón del rechazo:');
        
        if (!reason) {
            console.log('Rechazo cancelado - no se proporcionó razón');
            return;
        }
        
        // Actualizar estado del reporte en MongoDB
        const result = await window.PortalDB.updateReport(reportId, {
            status: 'Rechazado',
            rejectedAt: new Date().toISOString(),
            rejectedBy: window.AuthSys?.getCurrentUser()?.userId || 'admin',
            feedback: reason
        });
        
        if (result.success) {
            console.log('Reporte rechazado exitosamente');
            
            // Mostrar notificación
            if (typeof showNotification === 'function') {
                showNotification('Reporte rechazado', 'warning');
            } else {
                alert('Reporte rechazado');
            }
            
            // ⭐ RECARGAR DATOS Y ACTUALIZAR VISTA
            await loadCurrentData();
            await updateReportsList();
            
            // Actualizar contadores del sidebar
            if (typeof updateSidebarCounts === 'function') {
                updateSidebarCounts();
            }
            
        } else {
            console.error('Error rechazando reporte:', result.message);
            alert('Error al rechazar el reporte: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error en rejectReport:', error);
        alert('Error al rechazar el reporte');
    }
}

function updateDropdowns() {
    console.log('🔄 === INICIANDO updateDropdowns ULTRA-DEFENSIVO ===');
    
    // Verificar que currentData esté disponible
    if (!currentData) {
        console.error('❌ currentData no está disponible');
        return;
    }
    
    // Inicializar datos si no existen
    currentData.users = currentData.users || {};
    currentData.companies = currentData.companies || {};
    currentData.supports = currentData.supports || {};
    currentData.modules = currentData.modules || {};
    currentData.assignments = currentData.assignments || {};

    // ✅ AGREGAR ESTA FUNCIÓN HELPER AQUÍ
    const getItemId = (item, type) => {
        switch(type) {
            case 'user': return item.userId;
            case 'company': return item.companyId;
            case 'support': return item.supportId;
            case 'module': return item.moduleId;
            case 'project': return item.projectId;
            default: return item.id;
        }
    };
    // ✅ FIN DE LA FUNCIÓN HELPER
    
    // Lista de elementos que vamos a actualizar
    const elementsToUpdate = [
        {
        id: 'assignUser',
        type: 'user',
        defaultOption: 'Seleccionar usuario',
        getData: () => Object.values(currentData.users).filter(user => 
            user.role === 'consultor' && 
            user.isActive !== false &&
            user.userId &&  // ✅ AGREGAR ESTA LÍNEA
            user.userId !== 'undefined'  // ✅ AGREGAR ESTA LÍNEA
        ),
        getLabel: (user) => {
            const userAssignments = Object.values(currentData.assignments).filter(a => 
                a.userId === user.userId && a.isActive
            );
            return `${user.name} (${user.userId})${userAssignments.length > 0 ? 
                ` - ${userAssignments.length} asignación(es)` : ''}`;
        }
    },
        {
    id: 'assignCompany',
    type: 'company',
    defaultOption: 'Seleccionar empresa',
    getData: () => Object.values(currentData.companies).filter(company =>
        company.companyId &&  // ✅ AGREGAR
        company.companyId !== 'undefined'  // ✅ AGREGAR
    ),
    getLabel: (company) => `${company.name} (${company.companyId})`
    },
    {
        id: 'assignSupport',
        type: 'support',
        defaultOption: 'Seleccionar Soporte',
        getData: () => Object.values(currentData.supports).filter(support =>
            support.supportId &&  // ✅ AGREGAR
            support.supportId !== 'undefined'  // ✅ AGREGAR
        ),
        getLabel: (support) => `${support.name} (${support.supportId})`
    },
    {
        id: 'assignModule',
        type: 'module',
        defaultOption: 'Seleccionar Módulo',
        getData: () => Object.values(currentData.modules).filter(module =>
            module.moduleId &&  // ✅ AGREGAR
            module.moduleId !== 'undefined'  // ✅ AGREGAR
        ),
        getLabel: (module) => `${module.name} (${module.moduleId})`
    }
  ];
    
    // VERIFICACIÓN PREVIA: Verificar que TODOS los elementos existen
    console.log('🔍 === VERIFICACIÓN PREVIA DE ELEMENTOS ===');
    const missingElements = [];
    elementsToUpdate.forEach(config => {
        const element = document.getElementById(config.id);
        if (element) {
            console.log(`✅ ${config.id}: Encontrado (${element.tagName})`);
            console.log(`    - Parent: ${element.parentElement?.tagName || 'unknown'}`);
            console.log(`    - Display: ${getComputedStyle(element).display}`);
            console.log(`    - Visible: ${element.offsetParent !== null}`);
        } else {
            console.error(`❌ ${config.id}: NO ENCONTRADO`);
            missingElements.push(config.id);
        }
    });
    
    if (missingElements.length > 0) {
        console.error(`❌ Elementos faltantes: ${missingElements.join(', ')}`);
        console.error('🚨 Abortando updateDropdowns debido a elementos faltantes');
        return;
    }
    
    console.log('✅ Todos los elementos encontrados, procediendo con actualización...');
    
    // ACTUALIZACIÓN CON VERIFICACIONES MÚLTIPLES
    elementsToUpdate.forEach((config, index) => {
        console.log(`🔄 === ACTUALIZANDO ${config.id} (${index + 1}/${elementsToUpdate.length}) ===`);
        
        try {
            // VERIFICACIÓN 1: Verificar que el elemento aún existe
            let element = document.getElementById(config.id);
            if (!element) {
                console.error(`❌ CRÍTICO: ${config.id} ya no existe al momento de actualizar`);
                return;
            }
            console.log(`✅ Verificación 1: ${config.id} existe`);
            
            // VERIFICACIÓN 2: Verificar que el elemento es válido
            if (!(element instanceof HTMLSelectElement)) {
                console.error(`❌ CRÍTICO: ${config.id} no es un elemento select válido, es: ${element.constructor.name}`);
                return;
            }
            console.log(`✅ Verificación 2: ${config.id} es un select válido`);
            
            // VERIFICACIÓN 3: Verificar que innerHTML es accesible
            try {
                const testInnerHTML = element.innerHTML;
                console.log(`✅ Verificación 3: ${config.id} innerHTML es accesible (length: ${testInnerHTML.length})`);
            } catch (error) {
                console.error(`❌ CRÍTICO: ${config.id} innerHTML no es accesible:`, error);
                return;
            }
            
            // ACTUALIZACIÓN SEGURA
            console.log(`🔄 Limpiando contenido de ${config.id}...`);
            
            // VERIFICACIÓN 4: Re-verificar elemento antes de modificar innerHTML
            element = document.getElementById(config.id);
            if (!element) {
                console.error(`❌ CRÍTICO: ${config.id} desapareció justo antes de innerHTML`);
                return;
            }
            
            // *** AQUÍ ES DONDE PROBABLEMENTE ESTÁ FALLANDO ***
            console.log(`🔄 Estableciendo innerHTML para ${config.id}...`);
            console.log(`    Element:`, element);
            console.log(`    Element type:`, typeof element);
            console.log(`    Element constructor:`, element.constructor.name);
            console.log(`    Element parentNode:`, element.parentNode);
            console.log(`    Default option:`, config.defaultOption);
            
            // INTENTO DE ACTUALIZACIÓN CON CAPTURA DE ERROR ESPECÍFICA
            try {
                element.innerHTML = `<option value="">${config.defaultOption}</option>`;
                console.log(`✅ innerHTML establecido exitosamente para ${config.id}`);
            } catch (innerHTMLError) {
                console.error(`❌ ERROR ESPECÍFICO AL ESTABLECER innerHTML para ${config.id}:`, innerHTMLError);
                console.error(`    Element en el momento del error:`, element);
                console.error(`    Element.innerHTML en el momento del error:`, element.innerHTML);
                console.error(`    Element.parentNode en el momento del error:`, element.parentNode);
                throw innerHTMLError; // Re-lanzar para captura externa
            }
            
            // Obtener datos y crear opciones
            const data = config.getData();
            console.log(`📊 Datos obtenidos para ${config.id}: ${data.length} elementos`);
            
            if (data && data.length > 0) {
                data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = getItemId(item, config.type);  // ✅ CAMBIADO: Usa la función helper
                    option.textContent = config.getLabel(item);
                    element.appendChild(option);
                });
                console.log(`✅ ${config.id} actualizado con ${data.length} opciones`);
            } else {
                console.log(`⚠️ ${config.id} actualizado pero sin datos`);
            }
            
        } catch (error) {
            console.error(`❌ ERROR GENERAL actualizando ${config.id}:`, error);
            console.error(`    Error stack:`, error.stack);
            
            // INFORMACIÓN ADICIONAL DE DEBUG
            const elementAtError = document.getElementById(config.id);
            console.error(`    Element en momento de error:`, elementAtError);
            console.error(`    Document readyState:`, document.readyState);
            console.error(`    Current section:`, currentSection);
            
            // NO lanzar el error, continuar con el siguiente elemento
        }
    });
    
    console.log('✅ === updateDropdowns COMPLETADO ===');
}

// FUNCIÓN ADICIONAL PARA VERIFICAR EL ESTADO DEL DOM
function verifyDOMState() {
    console.log('🔍 === VERIFICACIÓN DE ESTADO DEL DOM ===');
    console.log('Document readyState:', document.readyState);
    console.log('Document URL:', document.URL);
    console.log('Current section:', currentSection);
    
    // Verificar si hay elementos duplicados
    const elements = ['assignUser', 'assignCompany', 'assignSupport', 'assignModule'];
    elements.forEach(id => {
        const allElements = document.querySelectorAll(`#${id}`);
        console.log(`${id}: ${allElements.length} elemento(s) encontrado(s)`);
        if (allElements.length > 1) {
            console.error(`❌ DUPLICADO: Hay ${allElements.length} elementos con ID ${id}`);
            allElements.forEach((el, index) => {
                console.log(`  ${index + 1}. Parent:`, el.parentElement);
            });
        }
    });
    
    // Verificar la sección activa
    const activeSection = document.querySelector('.content-section.active');
    console.log('Sección activa:', activeSection ? activeSection.id : 'ninguna');
    
    // Verificar si hay conflictos de CSS que puedan estar ocultando elementos
    const createSection = document.getElementById('crear-asignacion-section');
    if (createSection) {
        console.log('crear-asignacion-section:');
        console.log('  - Display:', getComputedStyle(createSection).display);
        console.log('  - Visibility:', getComputedStyle(createSection).visibility);
        console.log('  - Opacity:', getComputedStyle(createSection).opacity);
        console.log('  - Position:', getComputedStyle(createSection).position);
    }
}

// FUNCIÓN PARA LLAMAR DESDE LA CONSOLA
window.verifyDOMState = verifyDOMState;
window.ultraDefensiveUpdate = updateDropdowns;

// === GESTIÓN DE MODALES ===
function openUserModal() {
    document.getElementById('userName').focus();
    window.ModalUtils.open('userModal');
}

function openCompanyModal() {
    document.getElementById('companyName').focus();
    window.ModalUtils.open('companyModal');
}

function openProjectModal() {
    document.getElementById('projectName').focus();
    window.ModalUtils.open('projectModal');
}

function openTaskModal() {
    document.getElementById('taskName').focus();
    window.ModalUtils.open('taskModal');
}

function openModuleModal() {
    document.getElementById('moduleName').focus();
    window.ModalUtils.open('moduleModal');
}

function openTarifarioModal() {
    // Si existe el ID, enfocarlo
    const el = document.getElementById('tarifaEmpresa');
    if (el) el.focus();
    window.ModalUtils.open('tarifarioModal');
}

function openSupportModal() {
    const el = document.getElementById('supportName');
    if (el) el.focus();
    window.ModalUtils.open('supportModal');
}

function closeModal(modalId) {
    window.ModalUtils.close(modalId);
}

function closeAllModals() {
    window.ModalUtils.closeAll();
}

// === FUNCIONES DE UTILIDAD ===
function logout() {
    window.AuthSys.logout();
}

/**
 * Detecta la categoría de un reporte (soporte o proyecto)
 * @param {Object} report - Objeto del reporte
 * @returns {string} - 'soporte', 'proyecto', o 'unknown'
 */
function getReportCategory(report) {
    // ✅ Usar assignmentType para determinar categoría
    if (report.assignmentType === 'project') {
        return 'proyecto';
    } else if (report.assignmentType === 'task' || report.assignmentType === 'support') {
        return 'soporte';
    }
    
    // Fallback: buscar en las asignaciones
    const assignment = currentData.assignments[report.assignmentId];
    const projectAssignment = currentData.projectAssignments?.[report.assignmentId];
    const taskAssignment = currentData.taskAssignments?.[report.assignmentId];
    
    if (projectAssignment) return 'proyecto';
    if (assignment || taskAssignment) return 'soporte';
    
    return 'soporte'; // Default
}

// 🆕 AGREGAR ESTA FUNCIÓN COMPLETA
/**
 * Filtra reportes aprobados por categoría 
 * @param {string} category - 'all', 'soporte', 'proyecto'
 */
function filterApprovedReportsByCategory(category) {
    console.log(`Filtrando reportes aprobados por categoría: ${category}`);

    currentApprovedReportFilter = category;
    
    // Actualizar botones activos
    updateApprovedCategoryFilterButtons(category);
    
    // Actualizar tabla con filtro aplicado
    updateApprovedReportsList();
}

/**
 * Actualiza el estado visual de los botones de filtro para reportes aprobados
 */
function updateApprovedCategoryFilterButtons(activeCategory) {
    // Buscar solo los botones de la sección de reportes aprobados
    const approvedSection = document.getElementById('reportes-aprobados-section');
    if (approvedSection) {
        approvedSection.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === activeCategory) {
                btn.classList.add('active');
            }
        });
    }
}

/**
 * Actualiza contadores de reportes aprobados por categoría
 */
function updateApprovedReportCategoryCounts(reports) {
    const counts = {
        all: reports.length,
        soporte: 0,
        proyecto: 0
    };
    
    reports.forEach(report => {
        const category = getReportCategory(report);
        if (category === 'soporte') {
            counts.soporte++;
        } else if (category === 'proyecto') {
            counts.proyecto++;
        }
    });
    
    // Actualizar badges
    const allCountElement = document.getElementById('approvedFilterCountAll');
    const soporteCountElement = document.getElementById('approvedFilterCountSoporte');
    const proyectoCountElement = document.getElementById('approvedFilterCountProyecto');
    
    if (allCountElement) allCountElement.textContent = counts.all;
    if (soporteCountElement) soporteCountElement.textContent = counts.soporte;
    if (proyectoCountElement) proyectoCountElement.textContent = counts.proyecto;
}

/**
 * Filtra reportes por categoría y actualiza la interfaz
 * @param {string} category - 'all', 'soporte', 'proyecto'
 */
function filterReportsByCategory(category) {
    console.log(`🔍 Filtrando reportes por categoría: ${category}`);
    
    currentReportFilter = category;
    
    // Actualizar botones activos
    updateCategoryFilterButtons(category);

    // Actualizar encabezados de la tabla
    updateTableHeaders();
    
    // Actualizar tabla con filtro aplicado
    updateReportsListWithFilter();
    
    // Animación de filtrado
    const table = document.querySelector('.reports-table');
    if (table) {
        table.classList.add('filtering');
        setTimeout(() => {
            table.classList.remove('filtering');
        }, 300);
    }
}

/**
 * Actualiza el estado visual de los botones de filtro
 * @param {string} activeCategory - Categoría activa
 */
function updateCategoryFilterButtons(activeCategory) {
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === activeCategory) {
            btn.classList.add('active');
        }
    });
}

/**
 * Actualiza la lista de reportes aplicando el filtro actual
 */
function updateReportsListWithFilter() {
    const reportsTableBody = document.getElementById('reportsTableBody');
    if (!reportsTableBody) {
        console.warn('⚠️ No se encontró reportsTableBody');
        return;
    }
    
    const allReports = Object.values(currentData.reports || {});
    const pendingReports = allReports.filter(r => r.status === 'Pendiente');
    
    console.log('📊 Total reportes:', allReports.length);
    console.log('📊 Reportes pendientes:', pendingReports.length);
    
    // Aplicar filtro por categoría
    let filteredReports = pendingReports;
    if (currentReportFilter !== 'all') {
        filteredReports = pendingReports.filter(report => {
            const category = getReportCategory(report);
            return category === currentReportFilter;
        });
    }
    
    console.log('📊 Reportes filtrados:', filteredReports.length);
    
    // Actualizar contadores
    updateReportCategoryCounts(pendingReports);
    
    // Renderizar reportes filtrados
    if (filteredReports.length === 0) {
        const emptyMessage = getEmptyStateMessage(currentReportFilter);
        const colspan = '10'; // Se modificó a 9 a 10 para incluir la columna de descripción
        
        reportsTableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-table-message">
                    <div class="empty-state">
                        <div class="empty-state-icon">${emptyMessage.icon}</div>
                        <div class="empty-state-title">${emptyMessage.title}</div>
                        <div class="empty-state-desc">${emptyMessage.desc}</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        reportsTableBody.innerHTML = '';
        filteredReports.forEach(report => {
            const reportRow = createReportTableRow(report);
            if (reportRow) {  // ✅ Solo agregar si la fila no es null
                reportsTableBody.appendChild(reportRow);
            } else {
                console.warn('⚠️ createReportTableRow devolvió null para:', report.id);
            }
        });
    }
}

/**
 * Actualiza los contadores en los botones de filtro
 * @param {Array} allPendingReports - Todos los reportes pendientes
 */
function updateReportCategoryCounts(allPendingReports) {
    const counts = {
        all: allPendingReports.length,
        soporte: 0,
        proyecto: 0
    };
    
    allPendingReports.forEach(report => {
        const category = getReportCategory(report);
        if (counts[category] !== undefined) {
            counts[category]++;
        }
    });
    
    // Actualizar elementos del DOM
    const allCountElement = document.getElementById('filterCountAll');
    const soporteCountElement = document.getElementById('filterCountSoporte');
    const proyectoCountElement = document.getElementById('filterCountProyecto');
    
    if (allCountElement) allCountElement.textContent = counts.all;
    if (soporteCountElement) soporteCountElement.textContent = counts.soporte;
    if (proyectoCountElement) proyectoCountElement.textContent = counts.proyecto;
}

/**
 * Genera el mensaje de estado vacío según la categoría
 * @param {string} category - Categoría actual
 * @returns {Object} - Objeto con icon, title y desc
 */
function getEmptyStateMessage(category) {
    switch (category) {
        case 'soporte':
            return {
                icon: '<i class="fa-solid fa-phone"></i>',
                title: 'No hay reportes de soporte pendientes',
                desc: 'Los reportes de soporte aparecerán aquí para su revisión'
            };
        case 'proyecto':
            return {
                icon: '<i class="fa-solid fa-clipboard"></i>',
                title: 'No hay reportes de proyecto pendientes',
                desc: 'Los reportes de proyecto aparecerán aquí para su revisión'
            };
        default:
            return {
                icon: '<i class="fa-solid fa-file-alt"></i>',
                title: 'No hay reportes pendientes',
                desc: 'Los reportes enviados por consultores aparecerán aquí'
            };
    }
}

/**
 * Crea una fila de la tabla para un reporte
 * @param {Object} report - Objeto del reporte
 * @returns {HTMLElement} - Elemento tr de la tabla
 */

function createReportTableRow(report) {
    const user = currentData.users[report.userId];
    
    if (!user) {
        console.warn('❌ Usuario no encontrado para reporte:', report.id);
        return null; // ← Esto causa que no se muestre
    }
    
    let assignment = null;
    let company = null;
    let support = null;
    let project = null;
    let module = null;
    let asignacionContent = 'Sin asignación';
    
    // ✅ CORRECCIÓN: Determinar tipo de asignación CORRECTAMENTE
    if (report.assignmentId) {
        // 1. Verificar si es una TAREA
        if (report.assignmentType === 'task') {
            console.log('🔍 Buscando tarea:', report.assignmentId);
            
            const taskAssignments = currentData.taskAssignments || {};
            assignment = taskAssignments[report.assignmentId];
            
            if (assignment) {
                console.log('✅ Tarea encontrada:', assignment);
                company = currentData.companies[assignment.companyId];
                support = currentData.supports[assignment.linkedSupportId];
                module = currentData.modules[assignment.moduleId];
                asignacionContent = `<i class="fa-solid fa-tasks"></i> Tarea: ${assignment.descripcion || assignment.taskName || 'Sin nombre'}`;
            } else {
                console.warn('⚠️ Tarea no encontrada:', report.assignmentId);
                asignacionContent = '<i class="fa-solid fa-tasks"></i> Tarea no encontrada';
            }
        } 
        // 2. Verificar si es un PROYECTO
        else if (report.assignmentType === 'project') {
            console.log('🔍 Buscando proyecto:', report.assignmentId);
            
            const projectAssignments = currentData.projectAssignments || {};
            assignment = projectAssignments[report.assignmentId];
            
            if (assignment) {
                console.log('✅ Proyecto encontrado:', assignment);
                project = currentData.projects[assignment.projectId];
                company = currentData.companies[assignment.companyId];
                module = currentData.modules[assignment.moduleId];
                asignacionContent = project ? `<i class="fa-solid fa-folder-open"></i> ${project.name}` : 'Proyecto no encontrado';
            } else {
                console.warn('⚠️ Proyecto no encontrado:', report.assignmentId);
                asignacionContent = '<i class="fa-solid fa-folder-open"></i> Proyecto no encontrado';
            }
        }
        // 3. Es un SOPORTE (asignación normal)
        else {
            console.log('🔍 Buscando soporte:', report.assignmentId);
            assignment = currentData.assignments[report.assignmentId];
            
            if (assignment) {
                console.log('✅ Soporte encontrado:', assignment);
                company = currentData.companies[assignment.companyId];
                support = currentData.supports[assignment.supportId];
                module = currentData.modules[assignment.moduleId];
                asignacionContent = support ? `<i class="fa-solid fa-headset"></i> ${support.name}` : 'Soporte no encontrado';
            } else {
                console.warn('⚠️ Soporte no encontrado:', report.assignmentId);
                asignacionContent = '<i class="fa-solid fa-headset"></i> Soporte no encontrado';
            }
        }
    }
    
    const row = document.createElement('tr');

    // Columna de descripción unificada para todos los tipos de reporte
    const descripcionContent = report.description || report.title || 'Sin descripción';

    row.innerHTML = `
        <td style="text-align: center;">
            <input type="checkbox" class="report-checkbox" value="${report.id}" onchange="toggleReportSelection()">
        </td>
        <td><span class="consultant-id">${user.userId}</span></td>
        <td><span class="consultant-name">${user.name}</span></td>
        <td><span class="company-name">${company ? company.name : 'Sin asignación'}</span></td>
        <td><span class="project-name">${asignacionContent}</span></td>
        <td>${module ? module.name : 'Sin módulo'}</td>
        <td><small style="color: #666;">${descripcionContent}</small></td>
        <td><span class="hours-badge">${report.hours || 0} hrs</span></td>
        <td>${window.DateUtils ? window.DateUtils.formatDate(report.createdAt) : new Date(report.createdAt).toLocaleDateString()}</td>
        <td><span class="status-badge status-pending">Pendiente</span></td>
        <td>
            <div class="action-buttons">
                <select class="quick-action-select" onchange="handleQuickAction(this, '${report.id}')">
                    <option value="">Acciones Rápidas...</option>
                    <option value="view">👁️ Ver Detalles</option>
                    <option value="approve">✅ Aprobar Reporte</option>
                    <option value="reject">❌ Rechazar Reporte</option>
                </select>
            </div>
        </td>
    `;
    
    return row;
}

/**
 * Modifica la función existente updateReportsList para usar el nuevo sistema
 */
async function updateReportsList() {
    console.log('📊 Actualizando lista de reportes con sistema de filtros...');
    
    // ✅ USAR AWAIT para esperar que los datos se carguen
    await loadCurrentData();
    
    // Aplicar filtro actual
    updateReportsListWithFilter();
}

async function initializeReportsFilters() {
    console.log('🎯 Inicializando filtros de reportes...');
    
    // Resetear filtro a 'all'
    currentReportFilter = 'all';
    
    // Actualizar botones
    updateCategoryFilterButtons('all');
    
    // ✅ USAR AWAIT para cargar reportes
    await updateReportsList();
}

/**

 * === LÓGICA DEL PANEL DE ADMINISTRADOR REORGANIZADO ===
 * Maneja todas las funciones administrativas del portal con sidebar
 */

// Variables globales
let currentData = {
    users: {},
    companies: {},
    projects: {},
    assignments: {},
    tasks: {},
    modules: {},
    reports: {}
};

let currentSection = 'panel-general';
let pendingAdminRealtimeRefresh = false;
let assignmentsListFilter = 'all';
let assignmentsListPage = 1;
let assignmentsListPageSize = 10;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando Panel del Administrador');

    // Verificar autenticación de administrador
    if (!window.AuthSys || !window.AuthSys.requireAdmin()) {
        console.error('Fallo de autenticación');
        return;
    }

    try {
        // Inicializar en orden específico
        initializeAdminPanel();
        setupEventListeners();
        setupSidebarNavigation();
        initializeTablePaginationObserver();
        
        // Cargar datos con delay para asegurar que el DOM esté listo
        setTimeout(() => {
            console.log('Cargando datos iniciales...');
            loadAllData();
        }, 300);
        
        console.log('Inicialización completada');
        
    } catch (error) {
        console.error('Error durante inicialización:', error);
    }

    // Inicializar listeners de tarifas
    initializeTarifaListeners();
    initializeProjectTarifaListeners();
    
    console.log('Listeners de tarifas inicializados');

    // Verificar asignaciones sin tarifas
    verificarTarifasAlCargar();

    console.log('Panel de administrador completamente inicializado');

});

async function loadAllData() {
    console.log('🚀 Cargando TODOS los datos del sistema...');
    try {
        currentData.users = await window.PortalDB.getUsers() || {};
        currentData.companies = await window.PortalDB.getCompanies() || {};
        currentData.projects = await window.PortalDB.getProjects() || {};
        currentData.assignments = await window.PortalDB.getAssignments() || {};
        currentData.supports = await window.PortalDB.getSupports() || {};
        currentData.modules = await window.PortalDB.getModules() || {};
        currentData.reports = await window.PortalDB.getReports() || {};
        currentData.projectAssignments = await window.PortalDB.getProjectAssignments() || {};
        currentData.taskAssignments = await window.PortalDB.getTaskAssignments() || {};
        currentData.tarifario = await window.PortalDB.getTarifario() || {};
        currentData.timesheets = window.PortalDB.getTimesheets ? window.PortalDB.getTimesheets() : {};
        
        console.log('📊 Datos cargados:', {
            usuarios: Object.keys(currentData.users).length,
            empresas: Object.keys(currentData.companies).length,
            reportes: Object.keys(currentData.reports).length
        });

        // Actualizar UI general
        updateSidebarCounts();
        
        // Si estamos en una sección que requiere renderizado inmediato
        if (currentSection === 'usuarios') await updateUsersList();
        if (currentSection === 'reportes-pendientes') await updateReportsList();
        
        // Si estamos en Panel General, actualizar stats
        if (currentSection === 'panel-general') {
            renderPanelGeneral();
        }

    } catch (error) {
        console.error('❌ Error en loadAllData:', error);
    }
}

console.log('Admin.js cargado, funciones mejoradas');

// === INICIALIZACIÓN ===
function initializeAdminPanel() {
    const currentUser = window.AuthSys.getCurrentUser();
    if (currentUser) {
        // Usar el nombre real del administrador logueado
        document.getElementById('adminUserName').textContent = currentUser.name || 'Administrador';
    }

    // Mostrar mensaje de bienvenida
    window.NotificationUtils.success('Bienvenido al panel de administración', 3000);
}

window.forceUpdateDropdowns = function() {
    console.log('Forzando actualización de dropdowns...');
    updateDropdowns();
};

window.debugAdmin = function() {
    console.log('Debug completo del admin...');
    debugDropdowns();
    console.log('Current data:', currentData);
    console.log('Current section:', currentSection);
};

function setupEventListeners() {
    // Formularios
    document.getElementById('userForm').addEventListener('submit', handleCreateUser);
    document.getElementById('companyForm').addEventListener('submit', handleCreateCompany);
    document.getElementById('projectForm').addEventListener('submit', handleCreateProject);
    document.getElementById('supportForm').addEventListener('submit', handleCreateSupport); 
    document.getElementById('moduleForm').addEventListener('submit', handleCreateModule);

    // Cerrar modales con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Auto-actualización silenciosa cada 30 segundos
    setInterval(async () => {
        if (!isAdminInteracting()) {
            if (pendingAdminRealtimeRefresh) {
                console.log('🔄 Ejecutando refresco en tiempo real pospuesto para el Admin...');
                pendingAdminRealtimeRefresh = false;
                await silentAdminRefresh();
                if (currentSection === 'timesheets-semanales') {
                    await renderAdminTimesheets();
                } else if (currentSection === 'panel-general') {
                    renderPanelGeneral();
                } else if (currentSection === 'reportes-pendientes') {
                    if (typeof initializeReportsFilters === 'function') {
                        await initializeReportsFilters();
                    }
                }
            } else {
                await silentAdminRefresh();
            }
        }
    }, 30000);

    // Escuchar eventos en tiempo real via SSE para actualizaciones de timesheet
    document.addEventListener('timesheetUpdated', async (e) => {
        const data = e.detail;
        console.log('🔔 Evento de timesheetUpdated capturado en Admin:', data);
        
        if (!isAdminInteracting()) {
            console.log('🔄 Actualizando datos del admin de inmediato via SSE...');
            pendingAdminRealtimeRefresh = false;
            await silentAdminRefresh();
            
            // Re-renderizar si es necesario
            if (currentSection === 'timesheets-semanales') {
                await renderAdminTimesheets();
            } else if (currentSection === 'panel-general') {
                renderPanelGeneral();
            } else if (currentSection === 'reportes-pendientes') {
                if (typeof initializeReportsFilters === 'function') {
                    await initializeReportsFilters();
                }
            }
        } else {
            console.log('⏳ Admin interactuando, posponiendo actualización en tiempo real.');
            pendingAdminRealtimeRefresh = true;
        }
    });
}

// Detectar si el admin está interactuando
function isAdminInteracting() {
    // Verificar modales abiertos
    const modals = document.querySelectorAll('.modal, .modal-overlay');
    for (let modal of modals) {
        if (modal.style.display === 'block' || modal.style.display === 'flex') {
            return true;
        }
    }
    
    // Verificar inputs con foco
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT')) {
        return true;
    }
    
    // No interrumpir si está en reportes pendientes
    if (currentSection === 'reportes-pendientes' || 
        currentSection === 'reportes-aprobados' ||
        currentSection === 'generar-reporte') {
        return true;
    }
    
    return false;
}

// Actualización silenciosa en segundo plano
async function silentAdminRefresh() {
    console.log('🔄 Actualización silenciosa en segundo plano...');
    
    try {
        // ✅ CORRECTO: Con await
        currentData.users = await window.PortalDB.getUsers() || {};
        currentData.companies = await window.PortalDB.getCompanies() || {};
        currentData.projects = await window.PortalDB.getProjects() || {};
        currentData.assignments = await window.PortalDB.getAssignments() || {};
        currentData.supports = await window.PortalDB.getSupports() || {};
        currentData.modules = await window.PortalDB.getModules() || {};
        currentData.reports = await window.PortalDB.getReports() || {};
        currentData.projectAssignments = await window.PortalDB.getProjectAssignments() || {};
        currentData.taskAssignments = await window.PortalDB.getTaskAssignments() || {};
        currentData.tarifario = await window.PortalDB.getTarifario() || {};
        currentData.timesheets = window.PortalDB.getTimesheets ? window.PortalDB.getTimesheets() : {};
        
        updateSidebarCounts();
        
        console.log('✅ Datos actualizados en segundo plano');
    } catch (error) {
        console.error('Error en actualización silenciosa:', error);
    }
}

function setupSidebarNavigation() {
    // Agregar listeners a todos los elementos del sidebar
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        const section = item.getAttribute('data-section');
        if (section) {
            item.addEventListener('click', () => {
                showSection(section);
            });
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-section="generar-reporte"]')) {
            setTimeout(ensureReportSelectorInitialized, 100);
        }
    });

    // Iniciar funcionalidad de redimensionamiento del sidebar
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar && !sidebar.querySelector('.sidebar-resizer')) {
        const resizer = document.createElement('div');
        resizer.className = 'sidebar-resizer';
        resizer.id = 'sidebarResizer';
        sidebar.appendChild(resizer);
        setupSidebarResize(sidebar, resizer);
    }

    // Agregar funcionalidad de colapso a las secciones del sidebar
    document.querySelectorAll('.sidebar-section').forEach(section => {
        const title = section.querySelector('.sidebar-section-title');
        const menu = section.querySelector('.sidebar-menu');
        
        if (title && menu) {
            title.style.cursor = 'pointer';
            
            // Agregar flecha (chevron) si no existe ya
            let chevron = title.querySelector('.section-toggle-icon');
            if (!chevron) {
                chevron = document.createElement('i');
                chevron.className = 'fa-solid fa-chevron-down section-toggle-icon';
                chevron.style.marginLeft = 'auto';
                chevron.style.transition = 'transform 0.3s ease';
                title.appendChild(chevron);
            }
            
            // Determinar si contiene el item activo actualmente
            const hasActiveItem = section.querySelector('.sidebar-menu-item.active') || 
                                  section.querySelector('.sidebar-menu-item[data-section="' + currentSection + '"]');
            
            // UX: Por defecto, colapsar todas excepto la de "Administración" (que contiene panel-general)
            // o la sección que tenga el item activo.
            const isAdministration = title.textContent.trim().includes('Administración');
            
            if (hasActiveItem || isAdministration) {
                section.classList.remove('collapsed');
                chevron.style.transform = 'rotate(0deg)';
            } else {
                section.classList.add('collapsed');
                chevron.style.transform = 'rotate(-90deg)';
            }
            
            // Toggle click listener
            title.addEventListener('click', (e) => {
                const isCollapsed = section.classList.toggle('collapsed');
                if (isCollapsed) {
                    chevron.style.transform = 'rotate(-90deg)';
                } else {
                    chevron.style.transform = 'rotate(0deg)';
                }
            });
        }
    });
}

// === NAVEGACIÓN DE SECCIONES ===
async function showSection(sectionName) {
    console.log(`🔄 === CAMBIANDO A SECCIÓN: ${sectionName} ===`);
    
    // Guardar sección anterior ANTES de cambiar
    const previousSection = currentSection;
    
    // Si está saliendo de generar-reporte, resetear
    if (previousSection === 'generar-reporte' && sectionName !== 'generar-reporte') {
        console.log('👋 Saliendo de generar-reporte, limpiando estado...');
        if (typeof resetReportGenerator === 'function') {
            resetReportGenerator();
        }
    }

    currentSection = sectionName;
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar sección seleccionada
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log(`✅ Sección ${sectionName} activada`);
    } else {
        console.error(`❌ Sección ${sectionName}-section no encontrada`);
        return;
    }

    // Actualizar navegación activa en el sidebar
    if (typeof updateActiveSidebarItem === 'function') {
        updateActiveSidebarItem(sectionName);
    }

    // ✅ CARGAR DATOS ESPECÍFICOS DE LA SECCIÓN CON AWAIT
    await loadSectionData(sectionName);
    
    // CASO ESPECIAL: Crear asignación - ESPERAR ANIMACIÓN
    if (sectionName === 'crear-asignacion') {
        console.log('📝 Preparando sección crear-asignacion - ESPERANDO ANIMACIÓN...');

        setTimeout(() => {
            console.log('🔄 Ejecutando updateDropdowns desde showSection...');
            if (typeof updateDropdowns === 'function') {
                updateDropdowns();
            }
        }, 300);
        
        // Esperar a que la animación CSS termine completamente
        if (typeof waitForAnimationComplete === 'function') {
            waitForAnimationComplete(targetSection, () => {
                console.log('🎬 Animación terminada, actualizando dropdowns...');
                
                const finalCheck = ['assignUser', 'assignCompany', 'assignSupport', 'assignModule'];
                const stillMissing = finalCheck.filter(id => !document.getElementById(id));
                
                if (stillMissing.length > 0) {
                    console.error(`❌ Elementos aún faltantes después de animación: ${stillMissing.join(', ')}`);
                } else {
                    console.log('✅ Todos los elementos verificados después de animación, actualizando...');
                    if (typeof updateDropdowns === 'function') {
                        updateDropdowns();
                    }
                }
            });
        }
    }

    // No se requiere lógica especial para Panel General
}


function updateActiveSidebarItem(activeSection) {
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === activeSection) {
            item.classList.add('active');
            
            // Auto-expandir la sección que contiene el item activo
            const section = item.closest('.sidebar-section');
            if (section && section.classList.contains('collapsed')) {
                section.classList.remove('collapsed');
                const chevron = section.querySelector('.section-toggle-icon');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        }
    });
}

async function loadSectionData(sectionName) {
    console.log(`Cargando datos para sección: ${sectionName}`);
    
    try {
        switch(sectionName) {
            case 'usuarios':
                await updateUsersList();
                break;
                
            case 'consultores':
                renderConsultoresList();
                break;
                
            case 'empresas':
                renderEmpresasList();
                break;
                
            case 'proyectos':
                renderProyectosList();
                break;
                
            case 'soportes':
                renderSoportesList();
                break;
                
            case 'modulos':
                renderModulosList();
                break;
                
            case 'tarifario':
                await loadTarifario();
                break;
                
            case 'lista-asignaciones':
            case 'asignaciones-recientes':
                await updateAssignmentsList();
                break;
                
            case 'reportes-pendientes':
                console.log('📊 Cargando reportes pendientes...');
                if (typeof initializeReportsFilters === 'function') {
                    await initializeReportsFilters();
                }
                break;
                
            case 'asignar-proyectos':
                await updateProjectAssignmentDropdowns();
                break;
                
            case 'lista-proyectos-asignados':
                await updateProjectAssignmentsList();
                break;
                
            case 'taskAssignments':
                await loadTaskAssignments();
                break;
                
            case 'reportes-aprobados':
                console.log('✅ Cargando reportes aprobados...');
                if (typeof updateApprovedReportsList === 'function') {
                    await updateApprovedReportsList();
                }
                break;
                
            case 'crear-asignacion':
                console.log('📝 Sección crear-asignacion - dropdowns se actualizarán por separado');
                break;
                
            case 'panel-general':
                renderPanelGeneral();
                break;
                
            case 'timesheets-semanales':
                console.log('📊 Cargando timesheets semanales...');
                await renderAdminTimesheets();
                break;
                
            case 'generar-reporte':
                console.log('🔄 Forzando recarga de datos para generar-reporte...');
                
                currentData.reports = await window.PortalDB.getReports() || {};
                currentData.users = await window.PortalDB.getUsers() || {};
                currentData.companies = await window.PortalDB.getCompanies() || {};
                currentData.projects = await window.PortalDB.getProjects() || {};
                currentData.assignments = await window.PortalDB.getAssignments() || {};
                currentData.supports = await window.PortalDB.getSupports() || {};
                currentData.modules = await window.PortalDB.getModules() || {};
                currentData.projectAssignments = await window.PortalDB.getProjectAssignments() || {};
                currentData.taskAssignments = await window.PortalDB.getTaskAssignments() || {};
                
                console.log('📊 Datos recargados para generar-reporte:', {
                    reportes: Object.keys(currentData.reports).length,
                    usuarios: Object.keys(currentData.users).length,
                    empresas: Object.keys(currentData.companies).length,
                    asignaciones: Object.keys(currentData.assignments).length,
                    soportes: Object.keys(currentData.supports).length,
                    modulos: Object.keys(currentData.modules).length,
                    proyectoAsignaciones: Object.keys(currentData.projectAssignments).length,
                    tareaAsignaciones: Object.keys(currentData.taskAssignments).length
                });
                
                if (typeof initializeReportSelector === 'function') {
                    initializeReportSelector();
                }
                
                setTimeout(() => {
                    const timeFilter = document.getElementById('timeFilter');
                    if (timeFilter) {
                        timeFilter.value = 'all';
                        console.log('⏰ Filtro de tiempo configurado a: all');
                    }
                }, 200);
                break;
                
            case 'historial-reportes':
                await updateGeneratedReportsList();
                break;

            default:
                console.log(`ℹ️ Sección ${sectionName} no tiene carga de datos específica`);
        }
    } catch (error) {
        console.error(`❌ Error cargando datos para ${sectionName}:`, error);
    }
}

// === GESTIÓN DE USUARIOS ===
async function handleCreateUser(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        
        if (!name) {
            alert('El nombre es requerido');
            return;
        }

        // Generar userId basado en timestamp (más simple y seguro)
        const timestamp = Date.now().toString().slice(-4);
        const userId = `USR${timestamp}`;  // Ejemplo: USR1234
        
        // Generar contraseña segura aleatoria
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let tempPassword = '';
        tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
        tempPassword += '!@#$%^&*'[Math.floor(Math.random() * 8)];
        for (let i = 0; i < 8; i++) {
            tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        tempPassword = tempPassword.split('').sort(() => 0.5 - Math.random()).join('');

        const userRoleInput = document.getElementById('userRole');
        const role = userRoleInput ? userRoleInput.value : 'consultor';

        const userData = {
            userId: userId,
            name: name,
            email: email || `${userId.toLowerCase()}@grupoitarvic.com`,
            password: tempPassword,
            role: role,
            isActive: true
        };

        console.log('📤 Creando usuario:', userData);

        // Crear usuario
        const result = await window.PortalDB.createUser(userData);
        
        console.log('📥 Resultado:', result);

        if (result.success) {
            alert(`✅ Usuario creado exitosamente!\n\n` +
                  `ID: ${userId}\n` +
                  `Nombre: ${name}\n` +
                  `Email: ${userData.email}\n` +
                  `Contraseña: ${tempPassword}\n\n` +
                  `⚠️ IMPORTANTE: Guarde estas credenciales, no se mostrarán nuevamente.`);
            
            closeModal('userModal');
            document.getElementById('userForm').reset();
            await loadAllData();
        } else {
            alert('Error: ' + (result.message || 'No se pudo crear el usuario'));
        }
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        alert('Error al crear usuario: ' + error.message);
    }
}

/**
 * Función para editar un usuario existente (con arquitectura limpia)
 */
function editUser(userId) {
    window.userModule.editUser(userId);
}

/**
 * Procesar la edición del usuario
 */
async function handleEditUser() {
    try {
        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('editUserName').value.trim();
        const email = document.getElementById('editUserEmail').value.trim();
        const newPassword = document.getElementById('editUserPassword').value.trim();
        
        // ✅ Obtener contraseña actual del modal
        const modal = document.getElementById('editUserModal');
        const currentPassword = modal ? modal.dataset.currentPassword : '';
        
        // Validaciones básicas
        if (!name) {
            window.NotificationUtils.error('El nombre es requerido');
            return;
        }
        
        if (name.length < 3) {
            window.NotificationUtils.error('El nombre debe tener al menos 3 caracteres');
            return;
        }
        
        // Validar contraseña si se proporcionó una nueva
        if (newPassword) {
            // ✅ VALIDACIÓN 1: Verificar si es la misma contraseña actual
            if (newPassword === currentPassword) {
                window.NotificationUtils.error(
                    'La contraseña ingresada es la misma que la actual.\n\n' +
                    'Por favor ingrese una contraseña diferente o deje el campo vacío para mantener la actual.'
                );
                return;
            }
            
            // ✅ VALIDACIÓN 2: Verificar longitud mínima
            if (newPassword.length < 6) {
                window.NotificationUtils.error(
                    'La contraseña debe tener al menos 6 caracteres.\n\n' +
                    'Use el botón "Generar" para crear una automáticamente.'
                );
                return;
            }
            
            // ✅ VALIDACIÓN 3: Verificar que no esté repetida por otro usuario
            const existingPasswords = Object.values(currentData.users)
                .filter(u => u.userId !== userId) // Excluir al usuario actual
                .map(u => u.password);
            
            if (existingPasswords.includes(newPassword)) {
                window.NotificationUtils.error(
                    'Esta contraseña ya está en uso por otro consultor.\n\n' +
                    'Por seguridad y trazabilidad, cada consultor debe tener una contraseña única.\n\n' +
                    'Use el botón "Generar" para crear una nueva contraseña automáticamente.'
                );
                return;
            }
        }
        
        // Preparar datos de actualización
        const updateData = {
            name: name,
            email: email || `${userId.toLowerCase()}@grupoitarvic.com`,
            updatedAt: new Date().toISOString()
        };
        
        // Solo actualizar contraseña si se proporcionó una nueva
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        console.log('📤 Actualizando usuario:', userId, updateData);
        
        const result = await window.PortalDB.updateUser(userId, updateData);
        
        console.log('📥 Resultado:', result);
        
        if (result.success) {
            // Mensaje diferente si se cambió contraseña
            if (newPassword) {
                window.NotificationUtils.success(
                    `Usuario actualizado exitosamente.\n\n` +
                    `Nueva contraseña: ${newPassword}\n\n` +
                    `IMPORTANTE: Comparta esta contraseña de forma segura con el consultor.`
                );
            } else {
                window.NotificationUtils.success('Usuario actualizado correctamente');
            }
            
            // ✅ Cerrar modal específicamente
            closeEditUserModal();
            
            // Recargar datos
            await loadAllData();
        } else {
            window.NotificationUtils.error('Error: ' + (result.message || 'No se pudo actualizar el usuario'));
        }
        
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        window.NotificationUtils.error('Error al actualizar usuario: ' + error.message);
    }
}

function generateRandomPasswordForEdit() {
    // Obtener todas las contraseñas existentes
    const existingPasswords = Object.values(currentData.users)
        .map(u => u.password)
        .filter(p => p); // Filtrar undefined/null
    
    let newPassword;
    let attempts = 0;
    const maxAttempts = 100;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    
    // Generar hasta encontrar una única
    do {
        let tempPassword = '';
        tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
        tempPassword += '!@#$%^&*'[Math.floor(Math.random() * 8)];
        for (let i = 0; i < 8; i++) {
            tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        newPassword = tempPassword.split('').sort(() => 0.5 - Math.random()).join('');
        attempts++;
        
        if (attempts >= maxAttempts) {
            window.NotificationUtils.error('No se pudo generar una contraseña única. Intente nuevamente.');
            return;
        }
    } while (existingPasswords.includes(newPassword));
    
    // Establecer en el input
    document.getElementById('editUserPassword').value = newPassword;
    
    // Feedback visual
    window.NotificationUtils.success(`✅ Contraseña generada: ${newPassword}`);
}

function validateConsultorPassword(password) {
    // Ya no se requiere un formato específico, solo longitud mínima
    return password && password.length >= 6;
}

function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.remove();
    }
}

function showUserCredentials(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fa-solid fa-check"></i> Usuario Creado Exitosamente</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="p-3">
                <div class="message message-success">
                    <strong>Credenciales del nuevo usuario:</strong>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Nombre:</strong> ${user.name}</p>
                    <p><strong>ID de Usuario:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${user.userId}</code></p>
                    <p><strong>Contraseña Única:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${user.password}</code></p>
                    ${user.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ''}
                </div>
                <div class="message message-info">
                    <strong>Importante:</strong> Esta contraseña es única y se generó automáticamente.
                </div>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Entendido</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ✅ Función deleteUser (con arquitectura limpia)
async function deleteUser(userId) {
    await window.userModule.deleteUser(userId);
}

// === GESTIÓN DE EMPRESAS ===
async function handleCreateCompany(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('companyName').value.trim();
        const description = document.getElementById('companyDescription')?.value.trim() || '';
        
        if (!name) {
            alert('El nombre de la empresa es requerido');
            return;
        }

        // Generar companyId automáticamente
        const timestamp = Date.now().toString().slice(-4);
        const companyId = `EMP${timestamp}`;  // Ejemplo: EMP1234
        
        const companyData = {
            companyId: companyId,  // ✅ Agregar companyId
            name: name,
            description: description,
            isActive: true
        };

        console.log('📤 Creando empresa:', companyData);

        const result = await window.PortalDB.createCompany(companyData);  // ✅ await
        
        console.log('📥 Resultado:', result);

        if (result.success) {
            alert(`✅ Empresa creada exitosamente!\n\nID: ${companyId}\nNombre: ${name}`);
            
            closeModal('companyModal');
            document.getElementById('companyForm').reset();
            await loadAllData();
        } else {
            alert('Error: ' + (result.message || 'No se pudo crear la empresa'));
        }
    } catch (error) {
        console.error('❌ Error creando empresa:', error);
        alert('Error al crear empresa: ' + error.message);
    }
}

async function deleteCompany(companyId) { 
    if (!confirm('¿Está seguro de eliminar esta empresa? Se eliminarán también todas las asignaciones relacionadas.')) {
        return;
    }

    try {
        const result = await window.PortalDB.deleteCompany(companyId); 
        
        if (result.success) {
            window.NotificationUtils.success('Empresa eliminada correctamente');
            await loadAllData();
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        window.NotificationUtils.error('Error al eliminar empresa');
    }
}

// === GESTIÓN DE PROYECTOS ===
async function handleCreateProject(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription')?.value.trim() || '';
        const maxHoursVal = document.getElementById('projectMaxHours')?.value;
        
        if (!name) {
            alert('El nombre del proyecto es requerido');
            return;
        }

        const timestamp = Date.now().toString().slice(-4);
        const projectId = `PRJ${timestamp}`;
        
        const projectData = {
            projectId: projectId,
            name: name,
            description: description,
            maxHours: maxHoursVal ? parseInt(maxHoursVal) : 0,
            isActive: true
        };

        console.log('📤 Creando proyecto:', projectData);
        const result = await window.PortalDB.createProject(projectData);
        console.log('📥 Resultado:', result);

        if (result.success) {
            alert(`✅ Proyecto creado exitosamente!\n\nID: ${projectId}\nNombre: ${name}${maxHoursVal ? '\nLímite: ' + maxHoursVal + ' horas' : ''}`);
            closeModal('projectModal');
            document.getElementById('projectForm').reset();
            await loadAllData();
        } else {
            alert('Error: ' + (result.message || 'No se pudo crear el proyecto'));
        }
    } catch (error) {
        console.error('❌ Error creando proyecto:', error);
        alert('Error al crear proyecto: ' + error.message);
    }
}

async function deleteProject(projectId) {
    if (!confirm('¿Está seguro de eliminar este proyecto? Se eliminarán también todas las asignaciones relacionadas.')) {
        return;
    }

    try {
        const result = await window.PortalDB.deleteProject(projectId);

        if (result.success) {
            window.NotificationUtils.success('Proyecto eliminado correctamente');
            await loadAllData();
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        window.NotificationUtils.error('Error al eliminar proyecto');
    }
}

// === GESTIÓN DE SOPORTES ===
async function handleCreateSupport(event) {  // ✅ Agrega async
    event.preventDefault();
    
    try {
        const name = document.getElementById('supportName').value.trim();
        const description = document.getElementById('supportDescription')?.value.trim() || '';
        
        if (!name) {
            alert('El nombre del soporte es requerido');
            return;
        }

        // Generar supportId automáticamente
        const timestamp = Date.now().toString().slice(-4);
        const supportId = `SUP${timestamp}`;  // Ejemplo: SUP1234
        
        const supportData = {
            supportId: supportId,  // ✅ Agregar supportId
            name: name,
            description: description,
            isActive: true
        };

        console.log('📤 Creando soporte:', supportData);

        const result = await window.PortalDB.createSupport(supportData);  // ✅ await
        
        console.log('📥 Resultado:', result);

        if (result.success) {
            alert(`✅ Soporte creado exitosamente!\n\nID: ${supportId}\nNombre: ${name}`);
            
            closeModal('supportModal');
            document.getElementById('supportForm').reset();
            await loadAllData();
        } else {
            alert('Error: ' + (result.message || 'No se pudo crear el soporte'));
        }
    } catch (error) {
        console.error('❌ Error creando soporte:', error);
        alert('Error al crear soporte: ' + error.message);
    }
}

async function deleteSupport(supportId) {
    if (!confirm('¿Está seguro de eliminar este soporte?')) {
        return;
    }

    try {
        const result = await window.PortalDB.deleteSupport(supportId);

        if (result.success) {
            window.NotificationUtils.success('Soporte eliminado correctamente');
            await loadAllData();
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        window.NotificationUtils.error('Error al eliminar soporte');
    }
}

function openSupportModal() {
    document.getElementById('supportName').focus();
    window.ModalUtils.open('supportModal');
}

// === GESTIÓN DE MÓDULOS ===
async function handleCreateModule(event) {  // ✅ Agrega async
    event.preventDefault();
    
    try {
        const name = document.getElementById('moduleName').value.trim();
        const description = document.getElementById('moduleDescription')?.value.trim() || '';
        
        if (!name) {
            alert('El nombre del módulo es requerido');
            return;
        }

        // Generar moduleId automáticamente
        const timestamp = Date.now().toString().slice(-4);
        const moduleId = `MOD${timestamp}`;  // Ejemplo: MOD1234
        
        const moduleData = {
            moduleId: moduleId,  // ✅ Agregar moduleId
            name: name,
            description: description,
            isActive: true
        };

        console.log('📤 Creando módulo:', moduleData);

        const result = await window.PortalDB.createModule(moduleData);  // ✅ await
        
        console.log('📥 Resultado:', result);

        if (result.success) {
            alert(`✅ Módulo creado exitosamente!\n\nID: ${moduleId}\nNombre: ${name}`);
            
            closeModal('moduleModal');
            document.getElementById('moduleForm').reset();
            await loadAllData();
        } else {
            alert('Error: ' + (result.message || 'No se pudo crear el módulo'));
        }
    } catch (error) {
        console.error('❌ Error creando módulo:', error);
        alert('Error al crear módulo: ' + error.message);
    }
}

async function deleteModule(moduleId) {
    if (!confirm('¿Está seguro de eliminar este módulo?')) {
        return;
    }

    try {
        const result = await window.PortalDB.deleteModule(moduleId);

        if (result.success) {
            window.NotificationUtils.success('Módulo eliminado correctamente');
            await loadAllData();
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        window.NotificationUtils.error('Error al eliminar módulo');
    }
}

// ============================================================
// FUNCIONES DE EDICIÓN — Empresa, Proyecto, Soporte, Módulo
// ============================================================
function editCompany(companyId) {
    alert(`Editar empresa ${companyId}\n\n(Funcionalidad en desarrollo)`);
}

function editProject(projectId) {
    alert(`Editar proyecto ${projectId}\n\n(Funcionalidad en desarrollo)`);
}

function editSupport(supportId) {
    alert(`Editar soporte ${supportId}\n\n(Funcionalidad en desarrollo)`);
}

function editModule(moduleId) {
    alert(`Editar módulo ${moduleId}\n\n(Funcionalidad en desarrollo)`);
}

// Nueva función para ver detalles del reporte
async function viewReport(reportId) {
    console.log(`👁️ Viendo detalles del reporte: ${reportId}`);
    
    try {
        // Asegurarse de que los datos estén cargados
        if (!currentData.reports || Object.keys(currentData.reports).length === 0) {
            await loadCurrentData();
        }
        
        const report = currentData.reports[reportId];
        
        if (!report) {
            console.error('❌ Reporte no encontrado:', reportId);
            alert('Reporte no encontrado');
            return;
        }
        
        const user = currentData.users[report.userId];
        
        // Obtener información de la asignación
        let assignment = null;
        let company = null;
        let workName = 'No asignado';
        let module = null;
        
        if (report.assignmentType === 'task') {
            assignment = currentData.taskAssignments?.[report.assignmentId];
            if (assignment) {
                company = currentData.companies[assignment.companyId];
                const support = currentData.supports[assignment.linkedSupportId];
                module = currentData.modules[assignment.moduleId];
                workName = support ? `${support.name} (Tarea)` : 'Tarea';
            }
        } else if (report.assignmentType === 'project') {
            assignment = currentData.projectAssignments?.[report.assignmentId];
            if (assignment) {
                company = currentData.companies[assignment.companyId];
                const project = currentData.projects[assignment.projectId];
                module = currentData.modules[assignment.moduleId];
                workName = project ? project.name : 'Proyecto';
            }
        } else {
            assignment = currentData.assignments?.[report.assignmentId];
            if (assignment) {
                company = currentData.companies[assignment.companyId];
                const support = currentData.supports[assignment.supportId];
                module = currentData.modules[assignment.moduleId];
                workName = support ? support.name : 'Soporte';
            }
        }
        
                // Generar desglose por día si existe
        let breakdownHtml = '';
        if (report.days) {
            const daysArr = [
                { key: 'mon', label: 'Lun' },
                { key: 'tue', label: 'Mar' },
                { key: 'wed', label: 'Mié' },
                { key: 'thu', label: 'Jue' },
                { key: 'fri', label: 'Vie' },
                { key: 'sat', label: 'Sáb' },
                { key: 'sun', label: 'Dom' }
            ];
            breakdownHtml = `
            <div style="margin-top:12px; margin-bottom:12px;">
                <p style="margin:0 0 5px 0;"><strong>Desglose por Día:</strong></p>
                <table style="width:100%; font-size:0.85em; border-collapse:collapse;">
                    <tr style="background:#e2e8f0;">
                        ${daysArr.map(d => `<th style="padding:4px; border:1px solid #cbd5e1; text-align:center;">${d.label}</th>`).join('')}
                    </tr>
                    <tr>
                        ${daysArr.map(d => `<td style="padding:4px; border:1px solid #cbd5e1; text-align:center;">${report.days[d.key] || 0}</td>`).join('')}
                    </tr>
                </table>
            </div>`;
        }
        
        // Mostrar modal con detalles usando SideDrawerUtils
        const drawerContent = `
            <div style="padding: 10px;">
                <h4 style="color: var(--color-arvic-primary); margin-bottom: 20px;">
                    <i class="fa-solid fa-file-invoice"></i> Información del Reporte
                </h4>
                
                <div class="detail-card" style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px; border-left:4px solid var(--color-arvic-primary);">
                    <p style="margin:5px 0;"><strong>ID:</strong> <span style="font-family:monospace; background:#e2e8f0; padding:2px 6px; border-radius:4px;">${report.id}</span></p>
                    <p style="margin:5px 0;"><strong>Consultor:</strong> ${user ? user.name : 'Desconocido'} <span style="color:#64748b; font-size:0.85em;">(${report.userId})</span></p>
                    <p style="margin:5px 0;"><strong>Fecha Registro:</strong> ${window.DateUtils ? window.DateUtils.formatDateTime(report.createdAt) : report.createdAt}</p>
                </div>
                
                <div class="detail-card" style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px; border-left:4px solid var(--primary-color);">
                    <p style="margin:5px 0;"><strong>Cliente:</strong> ${company ? company.name : 'No asignado'}</p>
                    <p style="margin:5px 0;"><strong>Trabajo:</strong> ${workName}</p>
                    <p style="margin:5px 0;"><strong>Módulo:</strong> ${module ? module.name : 'Sin módulo'}</p>
                </div>
                
                <div class="detail-card" style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px; border-left:4px solid var(--warning-color);">
                    <p style="margin:5px 0; font-size: 1.1em;"><strong>Horas Totales Reportadas:</strong> <span style="font-weight:bold; color:var(--warning-color);">${report.hours} hrs</span></p>
                    ${breakdownHtml}
                    <p style="margin:10px 0 5px 0;"><strong>Descripción / Actividades:</strong></p>
                    <div style="background:white; padding:10px; border-radius:6px; border:1px solid #e2e8f0; min-height:60px;">
                        ${report.description || 'Sin descripción'}
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:15px; border-radius:8px;">
                    <div>
                        <strong>Estado Actual:</strong><br>
                        <span class="status-badge status-${report.status.toLowerCase()}" style="margin-top:5px; display:inline-block;">${report.status}</span>
                    </div>
                    ${report.status === 'Pendiente' ? `
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-sm btn-success" onclick="SideDrawerUtils.close(); approveReport('${report.id}')">
                            <i class="fa-solid fa-check"></i> Aprobar
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                ${report.rejectionReason ? `
                <div style="margin-top:15px; background:#fef2f2; padding:15px; border-radius:8px; border-left:4px solid var(--danger-color);">
                    <p style="margin:0; color:var(--danger-color);"><strong><i class="fa-solid fa-circle-exclamation"></i> Motivo de Rechazo:</strong><br>${report.rejectionReason}</p>
                </div>
                ` : ''}

                <div style="margin-top:25px; border-top: 1px dashed #cbd5e1; padding-top: 20px; text-align:center;">
                    <button class="btn btn-outline-primary" style="width:100%;" onclick="if(window.chatWidget) { window.chatWidget.setContext('${report.reportId || report.id}', true, 'Chat de Ticket: ${report.reportId || report.id}'); SideDrawerUtils.close(); }">
                        <i class="fa-solid fa-comments"></i> Iniciar Chat de Soporte
                    </button>
                    <small style="display:block; margin-top:8px; color:#64748b;">Comunícate directamente con el consultor sobre este reporte.</small>
                </div>
            </div>
        `;
        
        if (window.SideDrawerUtils) {
            SideDrawerUtils.open(`Reporte #${report.id.substring(0,6)}`, drawerContent);
        } else if (typeof showModal === 'function') {
            showModal('Detalles del Reporte', drawerContent);
        } else {
            alert(`Reporte: ${report.id}\nConsultor: ${user?.name}\nHoras: ${report.hours}\nEstado: ${report.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error en viewReport:', error);
        alert('Error al ver los detalles del reporte');
    }
}

// === AGREGAR ESTAS NUEVAS FUNCIONES AL FINAL DE admin.js ===
// Copiar y pegar estas funciones al final del archivo admin.js

// Nueva función para ver todas las asignaciones de un usuario
/**
 * Ver todas las asignaciones de un usuario (SOPORTES + PROYECTOS + TAREAS)
 * @param {string} userId - ID del usuario
 */
function viewUserAssignments(userId) {
    try {
        const user = currentData.users[userId];
        
        if (!user) {
            console.error('❌ Usuario no encontrado:', userId);
            return;
        }

        console.log('👁️ Viendo asignaciones de:', user.name);

        // ✅ BUSCAR EN LAS TRES COLECCIONES
        
        // 1. Asignaciones de SOPORTE (usa 'userId')
        const supportAssignments = Object.values(currentData.assignments || {}).filter(a => 
            a.userId === userId && a.isActive !== false
        );

        // 2. Asignaciones de PROYECTO (usa 'consultorId' ⚠️)
        const projectAssignments = Object.values(currentData.projectAssignments || {}).filter(a => 
            a.consultorId === userId && a.isActive !== false
        );

        // 3. Asignaciones de TAREAS (usa 'consultorId' ⚠️)
        const taskAssignments = Object.values(currentData.taskAssignments || {}).filter(a => 
            a.consultorId === userId && a.isActive !== false
        );

        // Total de asignaciones
        const totalAssignments = supportAssignments.length + projectAssignments.length + taskAssignments.length;

        console.log('📊 Resumen de asignaciones:');
        console.log('  - Soportes:', supportAssignments.length);
        console.log('  - Proyectos:', projectAssignments.length);
        console.log('  - Tareas:', taskAssignments.length);
        console.log('  - TOTAL:', totalAssignments);

        // ✅ CREAR MODAL CON TODAS LAS ASIGNACIONES
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <i class="fa-solid fa-bullseye"></i> Asignaciones de ${user.name}
                    </h2>
                    <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="p-3">
                    ${totalAssignments === 0 ? `
                        <div class="empty-state">
                            <div class="empty-state-icon"><i class="fa-solid fa-inbox"></i></div>
                            <div class="empty-state-title">No hay asignaciones activas</div>
                            <div class="empty-state-desc">Este usuario no tiene asignaciones activas</div>
                        </div>
                    ` : `
                        <!-- Resumen de contadores -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 15px; border-radius: 10px; color: white; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold;">${supportAssignments.length}</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">SOPORTES</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 15px; border-radius: 10px; color: white; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold;">${projectAssignments.length}</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">PROYECTOS</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 15px; border-radius: 10px; color: white; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold;">${taskAssignments.length}</div>
                                <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">TAREAS</div>
                            </div>
                        </div>

                        <!-- SOPORTES -->
                        ${supportAssignments.length > 0 ? `
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px;">
                                    <i class="fa-solid fa-headset"></i> Asignaciones de Soporte (${supportAssignments.length})
                                </h3>
                                ${supportAssignments.map(assignment => {
                                    const company = currentData.companies[assignment.companyId];
                                    const support = currentData.supports[assignment.supportId];
                                    const module = currentData.modules[assignment.moduleId];
                                    
                                    return `
                                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #3b82f6;">
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                                <div>
                                                    <strong style="color: #374151;">Cliente:</strong> ${company ? company.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Soporte:</strong> ${support ? support.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Módulo:</strong> ${module ? module.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Tarifa Consultor:</strong> $${assignment.tarifaConsultor || 0}/hr
                                                </div>
                                                <div style="grid-column: span 2;">
                                                    <strong style="color: #374151;">ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${assignment.assignmentId}</code>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}

                        <!-- PROYECTOS -->
                        ${projectAssignments.length > 0 ? `
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 15px;">
                                    <i class="fa-solid fa-folder-open"></i> Asignaciones de Proyecto (${projectAssignments.length})
                                </h3>
                                ${projectAssignments.map(assignment => {
                                    const company = currentData.companies[assignment.companyId];
                                    const project = currentData.projects[assignment.projectId];
                                    const module = currentData.modules[assignment.moduleId];
                                    
                                    return `
                                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #10b981;">
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                                <div>
                                                    <strong style="color: #374151;">Cliente:</strong> ${company ? company.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Proyecto:</strong> ${project ? project.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Módulo:</strong> ${module ? module.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Tarifa Consultor:</strong> $${assignment.tarifaConsultor || 0}/hr
                                                </div>
                                                <div style="grid-column: span 2;">
                                                    <strong style="color: #374151;">ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${assignment.projectAssignmentId}</code>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}

                        <!-- TAREAS -->
                        ${taskAssignments.length > 0 ? `
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 15px;">
                                    <i class="fa-solid fa-tasks"></i> Asignaciones de Tarea (${taskAssignments.length})
                                </h3>
                                ${taskAssignments.map(assignment => {
                                    const company = currentData.companies[assignment.companyId];
                                    const module = currentData.modules[assignment.moduleId];
                                    
                                    return `
                                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #f59e0b;">
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                                <div>
                                                    <strong style="color: #374151;">Cliente:</strong> ${company ? company.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Tarea:</strong> ${assignment.taskName || 'Sin nombre'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Módulo:</strong> ${module ? module.name : 'No encontrado'}
                                                </div>
                                                <div>
                                                    <strong style="color: #374151;">Tarifa Consultor:</strong> $${assignment.tarifaConsultor || 0}/hr
                                                </div>
                                                <div style="grid-column: span 2;">
                                                    <strong style="color: #374151;">Estado:</strong> 
                                                    <span style="background: ${assignment.isActive ? '#10b981' : '#ef4444'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                                                        ${assignment.isActive ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </div>
                                                <div style="grid-column: span 2;">
                                                    <strong style="color: #374151;">ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${assignment.taskAssignmentId}</code>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}
                    `}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; padding: 15px; border-top: 1px solid #e5e7eb;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fa-solid fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        console.log('✅ Modal de asignaciones mostrado correctamente');

    } catch (error) {
        console.error('❌ Error en viewUserAssignments:', error);
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Error al ver asignaciones: ' + error.message);
        } else {
            alert('Error al ver asignaciones');
        }
    }
}

function waitForAnimationComplete(element, callback, maxWait = 2000) {
    const startTime = Date.now();
    const checkAnimation = () => {
        const styles = getComputedStyle(element);
        const opacity = parseFloat(styles.opacity);
        const display = styles.display;
        
        console.log(`🎬 Esperando animación... Opacity: ${opacity}, Display: ${display}`);
        
        // Verificar si la animación ha terminado
        if (opacity === 1 && display === 'block') {
            console.log('✅ Animación completada, ejecutando callback...');
            callback();
        } else if (Date.now() - startTime > maxWait) {
            console.warn('⚠️ Timeout esperando animación, ejecutando callback de todas formas...');
            callback();
        } else {
            // Seguir esperando
            setTimeout(checkAnimation, 50);
        }
    };
    
    checkAnimation();
}

function diagnosticAnimationState() {
    console.log('🎬 === DIAGNÓSTICO DE ESTADO DE ANIMACIÓN ===');
    
    const section = document.getElementById('crear-asignacion-section');
    if (section) {
        const styles = getComputedStyle(section);
        console.log('crear-asignacion-section:');
        console.log('  - Display:', styles.display);
        console.log('  - Visibility:', styles.visibility);
        console.log('  - Opacity:', styles.opacity);
        console.log('  - Transform:', styles.transform);
        console.log('  - Transition:', styles.transition);
        console.log('  - Animation:', styles.animation);
        
        // Verificar si hay animaciones activas
        const computedStyle = window.getComputedStyle(section);
        const animationName = computedStyle.getPropertyValue('animation-name');
        const transitionProperty = computedStyle.getPropertyValue('transition-property');
        
        if (animationName && animationName !== 'none') {
            console.log('🎬 Animación CSS activa:', animationName);
        }
        
        if (transitionProperty && transitionProperty !== 'none') {
            console.log('🎬 Transición CSS activa:', transitionProperty);
        }
    }
    
    // Verificar elementos después del diagnóstico
    const elements = ['assignUser', 'assignCompany', 'assignSupport', 'assignModule'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const elStyles = getComputedStyle(el);
            console.log(`${id}:`);
            console.log(`  - Display: ${elStyles.display}`);
            console.log(`  - Opacity: ${elStyles.opacity}`);
            console.log(`  - Pointer-events: ${elStyles.pointerEvents}`);
        }
    });
}

async function createProjectAssignment() {
    const userId = document.getElementById('assignProjectConsultor').value;
    const projectId = document.getElementById('assignProjectProject').value;
    const companyId = document.getElementById('assignProjectCompany').value;
    const moduleId = document.getElementById('assignProjectModule').value;
    const tarifaConsultor = parseFloat(document.getElementById('projectAssignTarifaConsultor').value) || 0;
    const tarifaCliente = parseFloat(document.getElementById('projectAssignTarifaCliente').value) || 0;
    
    if (!userId || !projectId || !companyId || !moduleId) {
        window.NotificationUtils.error('Todos los campos son requeridos');
        return;
    }
    
    if (tarifaConsultor <= 0 || tarifaCliente <= 0) {
        window.NotificationUtils.error('Las tarifas deben ser mayores a 0');
        return;
    }

    // ✅ Generar projectAssignmentId automáticamente
    const timestamp = Date.now().toString().slice(-4);
    const projectAssignmentId = `PRJ_ASG${timestamp}`;
    
    const assignmentData = {
        projectAssignmentId: projectAssignmentId,  
        consultorId: userId,
        projectId: projectId,
        companyId: companyId,
        moduleId: moduleId,
        tarifaConsultor: tarifaConsultor,
        tarifaCliente: tarifaCliente
    };

    console.log('📤 Creando asignación de proyecto:', assignmentData);

    const result = await window.PortalDB.createProjectAssignment(assignmentData);

    if (result.success) {
        window.NotificationUtils.success('Proyecto asignado exitosamente con tarifas configuradas');
        await loadAllData();

        // Limpiar formulario
        document.getElementById('assignProjectConsultor').value = '';
        document.getElementById('assignProjectProject').value = '';
        document.getElementById('assignProjectCompany').value = '';
        document.getElementById('assignProjectModule').value = '';
        document.getElementById('projectAssignTarifaConsultor').value = '';
        document.getElementById('projectAssignTarifaCliente').value = '';
        updateProjectAssignMargen();
    } else {
        window.NotificationUtils.error('Error al asignar proyecto: ' + result.message);
    }
}


async function updateUsersList() {
    await loadCurrentData();
    // PRIORIZAR el contenedor de Gestión Maestra
    const container = document.getElementById('usersMasterList') || document.getElementById('usersList');
    
    if (!container) {
        console.warn('Contenedor para lista de usuarios no encontrado');
        return;
    }
    
    const users = Object.values(currentData.users);
    
    const consultorUsers = users.filter(user => 
        user.isActive !== false &&
        user.userId &&
        user.userId !== 'undefined'
    );
    
    console.log(`👤 Usuarios filtrados para mostrar: ${consultorUsers.length} de ${users.length} totales`);
    
    if (consultorUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <div class="empty-state-title">No hay usuarios</div>
                <div class="empty-state-desc">Cree el primer usuario consultor</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    consultorUsers.forEach(user => {
        // Contar los TRES tipos de asignaciones
        const supportAssignments = Object.values(currentData.assignments || {}).filter(a => 
            a.userId === user.userId && a.isActive
        );
        
        const projectAssignments = Object.values(currentData.projectAssignments || {}).filter(a => 
            a.consultorId === user.userId && a.isActive !== false
        );
        
        const taskAssignments = Object.values(currentData.taskAssignments || {}).filter(a => 
            a.consultorId === user.userId && a.isActive !== false
        );
        
        // Total de asignaciones
        const totalAssignments = supportAssignments.length + projectAssignments.length + taskAssignments.length;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'item hover-lift';
        
        userDiv.innerHTML = `
            <!-- CONTENEDOR PRINCIPAL -->
            <div style="display: flex; flex-direction: column; gap: 0; width: 100%;">
                
                <!-- PARTE SUPERIOR: ID, Nombre, Badges y Botones -->
                <div style="display: flex; justify-content: space-between; align-items: center; 
                            padding-bottom: 16px; margin-bottom: 12px;">
                    <!-- Lado izquierdo -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="item-id">${user.userId}</span>
                        <strong style="font-size: 1rem;">${user.name}</strong>
                        ${user.role === 'admin' ? 
                           `<span class="custom-badge" style="background-color: var(--color-arvic-primary); color: white;"><i class="fa-solid fa-crown" style="margin-right:4px;"></i> ADMIN</span>` 
                           : ''}
                        ${totalAssignments > 1 ? 
                            `<span class="custom-badge badge-info">MÚLTIPLE</span>
                             <span class="custom-badge badge-primary">${totalAssignments}</span>` : 
                            totalAssignments === 1 ? 
                            `<span class="custom-badge badge-success">ASIGNADO</span>
                             <span class="custom-badge badge-primary">1</span>` : 
                            `<span class="custom-badge badge-warning">SIN ASIGNAR</span>`
                        }
                    </div>
                    
                    <!-- Lado derecho: Botones -->
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-primary" onclick="editUser('${user.userId}')" 
                                style="padding: 6px 12px; font-size: 0.875rem;" title="Editar usuario">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.userId}')" 
                                style="padding: 6px 12px; font-size: 0.875rem;" title="Eliminar usuario">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        ${totalAssignments > 0 ? 
                            `<button class="btn btn-sm btn-info" onclick="viewUserAssignments('${user.userId}')" 
                                     style="padding: 6px 12px; font-size: 0.875rem;" title="Ver asignaciones">
                                <i class="fa-solid fa-eye"></i>
                            </button>` : ''
                        }
                    </div>
                </div>
                
                <!-- FILA 1: Contadores de asignaciones (solo si tiene) -->
                ${totalAssignments > 0 ? `
                    <div style="display: flex; justify-content: space-between; align-items: center;
                                padding: 12px 20px; margin: 0 -20px 0 -20px;
                                border-top: 1px solid var(--gray-200);
                                background: var(--gray-50);">
                        <small style="color: var(--gray-600); font-weight: 500; font-size: 0.8rem;">
                            Soporte: <strong>${supportAssignments.length}</strong>
                        </small>
                        <small style="color: var(--gray-600); font-weight: 500; font-size: 0.8rem;">
                            Proyectos: <strong>${projectAssignments.length}</strong>
                        </small>
                        <small style="color: var(--gray-600); font-weight: 500; font-size: 0.8rem;">
                            Tareas: <strong>${taskAssignments.length}</strong>
                        </small>
                    </div>
                ` : ''}
                
                <!-- FILA 2: Información del usuario (SIEMPRE visible) -->
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 12px 20px; margin: 0 -20px -20px -20px;
                            border-top: 1px solid var(--gray-200);
                            background: var(--gray-0, #ffffff);">
                    <small style="color: var(--gray-500); font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-calendar" style="color: var(--success-color);"></i> 
                        ${window.DateUtils.formatDate(user.createdAt)}
                    </small>
                    
                    <small style="color: var(--gray-500); font-weight: 500; font-size: 0.75rem;">
                        <i class="fa-solid fa-envelope" style="color: var(--primary-light);"></i> 
                        ${user.email || 'Sin correo'}
                    </small>
                    
                    <small style="color: transparent; font-size: 0.75rem;">
                        Reservado
                    </small>
                </div>
            </div>
        `;
        
        container.appendChild(userDiv);
    });
}

// === FUNCIONES PARA GENERACIÓN DE REPORTES ===

window.diagnosticAnimationState = diagnosticAnimationState;
window.waitForAnimationComplete = waitForAnimationComplete;

window.forceUpdateAfterAnimation = () => {
    const section = document.getElementById('crear-asignacion-section');
    if (section) {
        waitForAnimationComplete(section, updateDropdowns);
    }
};

console.log('✅ === CORRECCIÓN DE ANIMACIÓN CSS CARGADA ===');

// === FUNCIONES PARA HISTORIAL DE REPORTES GENERADOS ===

function getDateRangeText(timeFilterId, startDateId, endDateId) {
    const timeFilter = document.getElementById(timeFilterId);
    if (!timeFilter) return 'No especificado';
    
    const today = new Date();
    
    switch(timeFilter.value) {
        case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return `${startOfWeek.toLocaleDateString('es-ES')} - ${endOfWeek.toLocaleDateString('es-ES')}`;
            
        case 'month':
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
            
        case 'custom':
            const startDate = document.getElementById(startDateId);
            const endDate = document.getElementById(endDateId);
            if (startDate && endDate && startDate.value && endDate.value) {
                const customStart = new Date(startDate.value);
                const customEnd = new Date(endDate.value);
                return `${customStart.toLocaleDateString('es-ES')} - ${customEnd.toLocaleDateString('es-ES')}`;
            }
            return 'Rango personalizado';
            
        default:
            return 'Todas las fechas';
    }
}

async function updateGeneratedReportsList() {  // ✅ AGREGADO: async
    const tableBody = document.getElementById('generatedReportsTableBody');
    const timeFilter = document.getElementById('historialTimeFilter');
    const typeFilter = document.getElementById('historialTypeFilter');
    const customDateRange = document.getElementById('historialCustomDateRange');
    const startDate = document.getElementById('historialStartDate');
    const endDate = document.getElementById('historialEndDate');
    const filterInfo = document.getElementById('historialFilterInfo');
    
    if (!tableBody) return;
    
    // Mostrar/ocultar rango personalizado
    if (timeFilter && customDateRange) {
        if (timeFilter.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
        }
    }
    
    const allReportsUnfiltered = Object.values(await window.PortalDB.getGeneratedReports());
    let filteredReports = allReportsUnfiltered;
    
    // Filtrar por fecha
    if (timeFilter) {
        const now = new Date();
        let filterText = '';
        
        switch(timeFilter.value) {
            case 'week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                filteredReports = filteredReports.filter(report => {
                    const reportDate = new Date(report.createdAt);
                    return reportDate >= startOfWeek && reportDate <= endOfWeek;
                });
                
                filterText = `Esta semana`;
                break;
                
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                
                filteredReports = filteredReports.filter(report => {
                    const reportDate = new Date(report.createdAt);
                    return reportDate >= startOfMonth && reportDate <= endOfMonth;
                });
                
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                filterText = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                break;
                
            case 'custom':
                if (startDate && endDate && startDate.value && endDate.value) {
                    const customStart = new Date(startDate.value);
                    customStart.setHours(0, 0, 0, 0);
                    
                    const customEnd = new Date(endDate.value);
                    customEnd.setHours(23, 59, 59, 999);
                    
                    filteredReports = filteredReports.filter(report => {
                        const reportDate = new Date(report.createdAt);
                        return reportDate >= customStart && reportDate <= customEnd;
                    });
                    
                    filterText = `${customStart.toLocaleDateString('es-ES')} - ${customEnd.toLocaleDateString('es-ES')}`;
                } else {
                    filterText = 'Rango personalizado (seleccione fechas)';
                }
                break;
                
            default: // 'all'
                filterText = 'Todos los reportes';
                break;
        }
        
        // Actualizar texto informativo
        if (filterInfo) {
            filterInfo.textContent = `Mostrando: ${filterText}`;
        }
    }
    
    // Filtrar por tipo
    if (typeFilter && typeFilter.value !== 'all') {
        filteredReports = filteredReports.filter(report => report.reportType === typeFilter.value);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    filteredReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Generar tabla
    if (filteredReports.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-table-message">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-chart-bar"></i></div>
                        <div class="empty-state-title">No hay reportes generados</div>
                        <div class="empty-state-desc">No se encontraron reportes en el período y filtros seleccionados</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = '';
        filteredReports.forEach(report => {
            const row = document.createElement('tr');
            
            // Determinar clase de descarga
            let downloadClass = 'zero';
            if (report.downloadCount > 5) downloadClass = 'high';
            else if (report.downloadCount > 0) downloadClass = '';
            
            row.innerHTML = `
                <td class="file-name-cell">${report.fileName}</td>
                <td class="report-type-cell">
                    <span class="report-type-${report.reportType}">
                        ${getReportTypeLabel(report.reportType)}
                    </span>
                </td>
                <td class="period-cell">${report.dateRange}</td>
                <td class="records-count">${report.recordCount}</td>
                <td class="hours-total">${report.totalHours ? report.totalHours.toFixed(1) : '0'} hrs</td>
                <td class="amount-total">${report.totalAmount ? '$' + report.totalAmount.toFixed(2) : '-'}</td>
                <td>${window.DateUtils.formatDateTime(report.createdAt)}</td>
                <td>
                    <span class="download-count ${downloadClass}">${report.downloadCount}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-delete-report" onclick="deleteGeneratedReportFromHistory('${report.id}')" title="Eliminar del historial">
                            <i class="fa-solid fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Actualizar estadísticas
    updateGeneratedReportsStats(allReportsUnfiltered);
}

/**
 * Obtener etiqueta legible del tipo de reporte
 */
function getReportTypeLabel(reportType) {
    const labels = {
        'pago-consultor-general': '<i class="fa-solid fa-money-bill-wave"></i> Pago (General)',
        'pago-consultor-especifico': '<i class="fa-solid fa-user"></i> Pago (Específico)',
        'cliente-soporte': '<i class="fa-solid fa-headset"></i> Cliente Soporte',
        'remanente': '<i class="fa-solid fa-chart-pie"></i> Remanente',
        'proyecto-general': '<i class="fa-solid fa-folder"></i> Proyecto (General)',
        'proyecto-cliente': '<i class="fa-solid fa-building"></i> Proyecto (Cliente)',
        'proyecto-consultor': '<i class="fa-solid fa-user-tie"></i> Proyecto (Consultor)',
        'reporte-actividades': '<i class="fa-solid fa-file-lines"></i> Reporte de Actividades'
    };

    return labels[reportType] || '<i class="fa-solid fa-file"></i> Reporte';
}

function updateGeneratedReportsStats(reports = null) {
    if (!reports) {
        reports = Object.values(window.PortalDB.getGeneratedReports());
    }
    
    // Contar cada tipo de reporte específico
    const counts = {
        'pago-consultor-general': 0,
        'pago-consultor-especifico': 0,
        'cliente-soporte': 0,
        'remanente': 0,
        'proyecto-general': 0,
        'proyecto-cliente': 0,
        'proyecto-consultor': 0
    };
    
    reports.forEach(r => {
        if (counts[r.reportType] !== undefined) {
            counts[r.reportType]++;
        }
    });
    
    // Actualizar elementos del DOM
    const totalElement = document.getElementById('totalGeneratedReports');
    const pagoGeneralEl = document.getElementById('reportPagoGeneral');
    const pagoEspecificoEl = document.getElementById('reportPagoEspecifico');
    const clienteSoporteEl = document.getElementById('reportClienteSoporte');
    const remanenteEl = document.getElementById('reportRemanente');
    const proyectoGeneralEl = document.getElementById('reportProyectoGeneral');
    const proyectoClienteEl = document.getElementById('reportProyectoCliente');
    const proyectoConsultorEl = document.getElementById('reportProyectoConsultor');
    
    if (totalElement) totalElement.textContent = reports.length;
    if (pagoGeneralEl) pagoGeneralEl.textContent = counts['pago-consultor-general'];
    if (pagoEspecificoEl) pagoEspecificoEl.textContent = counts['pago-consultor-especifico'];
    if (clienteSoporteEl) clienteSoporteEl.textContent = counts['cliente-soporte'];
    if (remanenteEl) remanenteEl.textContent = counts['remanente'];
    if (proyectoGeneralEl) proyectoGeneralEl.textContent = counts['proyecto-general'];
    if (proyectoClienteEl) proyectoClienteEl.textContent = counts['proyecto-cliente'];
    if (proyectoConsultorEl) proyectoConsultorEl.textContent = counts['proyecto-consultor'];
}

async function refreshGeneratedReportsList() {
    await updateGeneratedReportsList();
    window.NotificationUtils.info('Lista actualizada');
}

async function deleteGeneratedReportFromHistory(reportId) {
    if (!confirm('¿Está seguro de eliminar este reporte del historial? Esta acción no eliminará el archivo descargado.')) {
        return;
    }
    
    const result = await window.PortalDB.deleteGeneratedReport(reportId);
    if (result.success) {
        window.NotificationUtils.success('Reporte eliminado del historial');
        await updateGeneratedReportsList();
        await updateSidebarCounts();
    } else {
        window.NotificationUtils.error('Error: ' + result.message);
    }
}

// === NUEVO SISTEMA DE REPORTES ARVIC ===

/**
 * Inicializar el selector de reportes dinámico
 */
function initializeReportSelector() {
    console.log('🚀 Inicializando selector de reportes ARVIC...');
    
    const reportGrid = document.getElementById('reportGrid');
    if (!reportGrid) {
        console.error('❌ No se encontró el elemento reportGrid');
        return;
    }
    
    // Solo re-renderizar la rejilla si está vacía
    if (reportGrid.children.length === 0) {
        reportGrid.innerHTML = '';
        Object.entries(ARVIC_REPORTS).forEach(([key, report]) => {
            const reportOption = document.createElement('div');
            reportOption.className = 'report-option';
            reportOption.dataset.report = key;
            reportOption.innerHTML = `
                <div class="report-icon">${report.icon}</div>
                <div class="report-name">${report.name}</div>
                <div class="report-description">${report.description}</div>
                <div class="report-audience">${report.audience}</div>
            `;
            
            reportOption.addEventListener('click', () => selectNewReportType(key));
            reportGrid.appendChild(reportOption);
        });
    }

    // SI YA HAY UN REPORTE SELECCIONADO EN CURSO, PRESERVAR LA VISTA Y RETORNAR
    if (currentReportType) {
        console.log('⚠️ Conservando vista del reporte seleccionado actualmente:', currentReportType);
        
        const selector = document.getElementById('reportSelectorContainer');
        if (selector) selector.style.display = 'none';
        
        const configPanel = document.getElementById('reportConfigPanel');
        if (configPanel) configPanel.style.display = 'block';
        
        const previewPanel = document.getElementById('reportPreviewPanel');
        if (previewPanel && previewPanel.innerHTML.trim() !== '') {
            previewPanel.style.display = 'block';
        }
        return;
    }
    
    // Si no hay reporte seleccionado, mostrar el selector y ocultar paneles
    const selector = document.getElementById('reportSelectorContainer');
    if (selector) selector.style.display = 'block';
    
    const configPanel = document.getElementById('reportConfigPanel');
    const previewPanel = document.getElementById('reportPreviewPanel');
    if (configPanel) configPanel.style.display = 'none';
    if (previewPanel) previewPanel.style.display = 'none';
    
    console.log('✅ Selector de reportes inicializado');
}

/**
 * Configuración especial para Reporte de Actividades (desde Timesheets)
 */
function generateActivityReportConfig(configPanel, report) {
    // Build consultor options
    let consultorOptions = '<option value="">Seleccionar consultor...</option>';
    if (currentData.users) {
        Object.values(currentData.users).forEach(user => {
            if (user.role === 'consultor' && user.isActive !== false) {
                consultorOptions += `<option value="${user.userId}">${user.name} (${user.userId})</option>`;
            }
        });
    }

    configPanel.innerHTML = `
        <div class="config-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; text-align: left;">
            <button class="btn btn-secondary back-to-selector-btn" onclick="backToReportSelector()" style="padding: 8px 14px; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; border: 1.5px solid #d1d5db; background: white; color: #374151; border-radius: 8px; transition: all 0.2s;">
                <i class="fa-solid fa-arrow-left"></i> Retroceder
            </button>
            <div>
                <div class="config-title" style="margin: 0; display: flex; align-items: center; gap: 8px; text-align: left;">${report.icon} ${report.name}</div>
                <div class="config-subtitle" style="margin: 4px 0 0 0; text-align: left;">${report.description}</div>
            </div>
        </div>

        <div class="warning-message">
            <strong>Estructura del Reporte:</strong> ${report.structure.join(' | ')}<br>
            <strong>Formato:</strong> 2 hojas — Hoja 1: Tabla de actividades con totales y firmas | Hoja 2: Detalle de actividades realizadas
        </div>

        <div class="config-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="arConsultantFilter">Seleccionar Consultor: <span style="color: red;">*</span></label>
                    <select id="arConsultantFilter" required onchange="loadTimesheetWeeksForConsultor()">
                        ${consultorOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="arTimesheetWeekFilter">Semana (Timesheet): <span style="color: red;">*</span></label>
                    <select id="arTimesheetWeekFilter" required onchange="validateActivityReportFilters()">
                        <option value="">Seleccionar consultor primero...</option>
                    </select>
                </div>
            </div>
            
            <div class="actions-row">
                <button class="btn btn-secondary" onclick="resetActivityReportFilters()">
                    <i class="fa-solid fa-rotate-left"></i> Limpiar
                </button>
                <button class="btn btn-primary" onclick="previewActivityReport()" id="arPreviewBtn" disabled>
                    <i class="fa-solid fa-eye"></i> Vista Previa
                </button>
                <button class="btn btn-info" onclick="downloadActivityReportPDF()" id="arPDFBtn" disabled>
                    <i class="fa-solid fa-file-pdf"></i> Descargar PDF
                </button>
            </div>
        </div>
    `;
    
    configPanel.style.display = 'block';
}

/**
 * Cargar semanas de timesheets disponibles para el consultor seleccionado
 */
function loadTimesheetWeeksForConsultor() {
    const consultorId = document.getElementById('arConsultantFilter')?.value;
    const weekSelect = document.getElementById('arTimesheetWeekFilter');
    
    if (!weekSelect) return;
    
    weekSelect.innerHTML = '<option value="">Cargando timesheets...</option>';
    
    if (!consultorId) {
        weekSelect.innerHTML = '<option value="">Seleccionar consultor primero...</option>';
        validateActivityReportFilters();
        return;
    }
    
    try {
        const allTimesheets = window.PortalDB.getTimesheetsByUser(consultorId);
        
        if (!allTimesheets || allTimesheets.length === 0) {
            weekSelect.innerHTML = '<option value="">No hay timesheets para este consultor</option>';
            validateActivityReportFilters();
            return;
        }
        
        // Sort by weekStart descending
        allTimesheets.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        
        weekSelect.innerHTML = '<option value="">Seleccionar semana...</option>';
        allTimesheets.forEach(ts => {
            const statusEmoji = ts.status === 'Aprobado' ? '✅' : ts.status === 'Rechazado' ? '❌' : '⏳';
            const label = `${statusEmoji} ${ts.weekStart} al ${ts.weekEnd} — ${ts.totalWeekHours?.toFixed(1) || 0}h (${ts.status})`;
            weekSelect.innerHTML += `<option value="${ts.timesheetId}">${label}</option>`;
        });
        
        validateActivityReportFilters();
    } catch (error) {
        console.error('Error cargando timesheets:', error);
        weekSelect.innerHTML = '<option value="">Error al cargar timesheets</option>';
    }
}

/**
 * Validar que los filtros requeridos estén completos
 */
function validateActivityReportFilters() {
    const consultorId = document.getElementById('arConsultantFilter')?.value;
    const timesheetId = document.getElementById('arTimesheetWeekFilter')?.value;
    const isValid = consultorId && timesheetId;
    
    const previewBtn = document.getElementById('arPreviewBtn');
    const pdfBtn = document.getElementById('arPDFBtn');
    
    if (previewBtn) previewBtn.disabled = !isValid;
    if (pdfBtn) pdfBtn.disabled = !isValid;
}

/**
 * Limpiar filtros del reporte de actividades
 */
function resetActivityReportFilters() {
    const consultorSel = document.getElementById('arConsultantFilter');
    const weekSel = document.getElementById('arTimesheetWeekFilter');
    
    if (consultorSel) consultorSel.value = '';
    if (weekSel) {
        weekSel.innerHTML = '<option value="">Seleccionar consultor primero...</option>';
    }
    validateActivityReportFilters();
}

/**
 * Abrir vista previa del reporte de actividades
 */
async function previewActivityReport() {
    const timesheetId = document.getElementById('arTimesheetWeekFilter')?.value;
    if (!timesheetId) {
        window.NotificationUtils.warning('Seleccione un consultor y una semana');
        return;
    }
    
    if (window.activityReportGen) {
        await window.activityReportGen.openPreview(timesheetId);
    } else {
        window.NotificationUtils.error('El generador de reportes de actividades no está disponible');
    }
}

/**
 * Descargar PDF del reporte de actividades
 */
async function downloadActivityReportPDF() {
    const timesheetId = document.getElementById('arTimesheetWeekFilter')?.value;
    if (!timesheetId) {
        window.NotificationUtils.warning('Seleccione un consultor y una semana');
        return;
    }
    
    if (window.activityReportGen) {
        await window.activityReportGen.exportPDF(timesheetId);
    } else {
        window.NotificationUtils.error('El generador de reportes de actividades no está disponible');
    }
}

/**
 * Seleccionar tipo de reporte nuevo
 */
function selectNewReportType(reportType) {
    console.log('Seleccionando reporte:', reportType);
    
    // Ocultar selector de reportes
    const selector = document.getElementById('reportSelectorContainer');
    if (selector) selector.style.display = 'none';
    
    // Desplazarse al inicio smoothly
    const section = document.getElementById('generar-reporte-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 1. Ocultar paneles anteriores
    const configPanel = document.getElementById('reportConfigPanel');
    const previewPanel = document.getElementById('reportPreviewPanel');
    
    if (configPanel) configPanel.style.display = 'none';
    if (previewPanel) previewPanel.style.display = 'none';
    
    // 2. Limpiar datos anteriores
    currentReportData = null;
    currentReportConfig = null;
    editablePreviewData = {};
    window.differenceTableData = [];
    
    // 3. Actualizar selector visual
    document.querySelectorAll('.report-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`[data-report="${reportType}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // 4. Generar configuración específica
    generateReportConfiguration(reportType);
    
    // 5. Actualizar variable global
    currentReportType = reportType;
    
    console.log('Reporte seleccionado:', ARVIC_REPORTS[reportType].name);
}

/**
 * Generar configuración específica según el tipo de reporte
 */
function generateReportConfiguration(reportType) {
    const report = ARVIC_REPORTS[reportType];
    const configPanel = document.getElementById('reportConfigPanel');
    
    if (!configPanel || !report) return;
    
    console.log('Generando configuración para:', report.name);
    
    // === CASO ESPECIAL: Reporte de Actividades ===
    if (reportType === 'reporte-actividades') {
        generateActivityReportConfig(configPanel, report);
        return;
    }
    
    // Generar filtros según el tipo de reporte
    let filtersHTML = '';
    
    // Filtro de tiempo (común para la mayoría)
    if (report.filters.includes('time')) {
        filtersHTML += `
            <div class="form-group">
                <label for="timeFilter">Periodo de Tiempo:</label>
                <select id="timeFilter" onchange="handleTimeFilterChange()">
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mes</option>
                    <option value="custom">Rango Personalizado</option>
                    <option value="all">Todas las Fechas</option>
                </select>
            </div>
        `;
    }
    
    // Filtro por consultor específico
    if (report.filters.includes('consultant')) {
        filtersHTML += `
            <div class="form-group">
                <label for="consultantFilter">Seleccionar Consultor: <span style="color: red;">*</span></label>
                <select id="consultantFilter" required onchange="validateRequiredFilters()">
                    <option value="">Seleccionar consultor...</option>
                </select>
            </div>
        `;
    }
    
// Filtro por cliente específico
if (report.filters.includes('client')) {
    const clientOnChange = reportType === 'remanente' ? 
        'handleClientFilterChangeRemanente(); validateRequiredFilters();' : 
        'validateRequiredFilters()';
    
    filtersHTML += `
        <div class="form-group">
            <label for="clientFilter">Seleccionar Cliente: <span style="color: red;">*</span></label>
            <select id="clientFilter" required onchange="${clientOnChange}">
                <option value="">Seleccionar cliente...</option>
            </select>
        </div>
    `;
}
    
    // Filtro por soporte
    if (report.filters.includes('support')) {
        filtersHTML += `
            <div class="form-group">
                <label for="supportFilter">Filtrar por Soporte:</label>
                <select id="supportFilter">
                    <option value="all">Todos los Soportes</option>
                </select>
            </div>
        `;
    }
    
    // Filtro por proyecto
if (report.filters.includes('project')) {
    if (reportType === 'remanente') {
        filtersHTML += `
            <div class="form-group">
                <label for="projectFilter">Proyectos del Cliente:</label>
                <select id="projectFilter" onchange="validateRequiredFilters()">
                    <option value="">Seleccionar cliente primero...</option>
                    <option value="ninguno">Sin proyectos</option>
                    <option value="todos">Todos los proyectos</option>
                </select>
                <small style="color: #666; font-size: 0.875rem;">
                    Primero selecciona un cliente para ver sus proyectos
                </small>
            </div>
        `;
    } else {
        filtersHTML += `
            <div class="form-group">
                <label for="projectFilter">Filtrar por Proyecto:</label>
                <select id="projectFilter">
                    <option value="all">Todos los Proyectos</option>
                </select>
            </div>
        `;
    }
}
    
        // Filtros especiales para Reporte Remanente
        if (reportType === 'remanente') {
            filtersHTML += `
                <div class="form-group">
                    <label for="supportTypeFilter">Soporte Específico: <span style="color: red;">*</span></label>
                    <select id="supportTypeFilter" required onchange="validateRequiredFilters()">
                        <option value="">Seleccionar soporte específico...</option>
                    </select>
                </div>
            <div class="form-group">
                <label for="monthFilter">Mes de Análisis: <span style="color: red;">*</span></label>
                <select id="monthFilter" required onchange="validateRequiredFilters()">
                    <option value="">Seleccionar mes...</option>
                </select>
            </div>
        `;
    }
    
    // Rango de fechas personalizado (común)
    let customDateRangeHTML = '';
    if (report.filters.includes('time')) {
        customDateRangeHTML = `
            <div class="form-row" id="customDateRange" style="display: none;">
                <div class="form-group">
                    <label for="startDate">Fecha Inicio:</label>
                    <input type="date" id="startDate">
                </div>
                <div class="form-group">
                    <label for="endDate">Fecha Fin:</label>
                    <input type="date" id="endDate">
                </div>
            </div>
        `;
    }
    
    // Generar HTML completo
    configPanel.innerHTML = `
        <div class="config-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; text-align: left;">
            <button class="btn btn-secondary back-to-selector-btn" onclick="backToReportSelector()" style="padding: 8px 14px; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; border: 1.5px solid #d1d5db; background: white; color: #374151; border-radius: 8px; transition: all 0.2s;">
                <i class="fa-solid fa-arrow-left"></i> Retroceder
            </button>
            <div>
                <div class="config-title" style="margin: 0; display: flex; align-items: center; gap: 8px; text-align: left;">${report.icon} ${report.name}</div>
                <div class="config-subtitle" style="margin: 4px 0 0 0; text-align: left;">${report.description}</div>
            </div>
        </div>

        <div class="warning-message">
            <strong>Estructura del Reporte:</strong> ${report.structure.join(' | ')}<br>
            <strong>Campos Editables:</strong> ${report.editableFields.join(', ')} (modificables en vista previa)
        </div>

        <div class="config-form">
            <div class="form-row">
                ${filtersHTML}
            </div>
            ${customDateRangeHTML}
            
            <div class="actions-row">
                <button class="btn btn-secondary" onclick="resetReportFilters()">
                    Limpiar Filtros
                </button>
                <button class="btn btn-primary" onclick="generateReportPreview()" id="previewBtn" disabled>
                    Vista Previa
                </button>
                <button class="btn btn-primary" onclick="generateFinalReport()" id="generateBtn" disabled>
                    Generar Excel
                </button>
                <button class="btn btn-info" onclick="exportCurrentReportToPDF()" id="exportPDFBtn" disabled>
                    Exportar PDF
                </button>
            </div>
        </div>
    `;
    
    configPanel.style.display = 'block';
    
    // Poblar dropdowns con datos
    populateFilterDropdowns(reportType);
    
    // Validar filtros iniciales
    setTimeout(validateRequiredFilters, 100);
}

/**
 * Poblar dropdowns con datos del sistema
 */
function populateFilterDropdowns(reportType) {
    console.log('Poblando filtros para:', reportType);
    
    // Poblar consultor
    const consultantFilter = document.getElementById('consultantFilter');
    if (consultantFilter && currentData.users) {
        consultantFilter.innerHTML = '<option value="">Seleccionar consultor...</option>';
        Object.values(currentData.users).forEach(user => {
            if (user.role === 'consultor' && user.isActive !== false) {
                const option = document.createElement('option');
                option.value = user.userId;
                option.textContent = `${user.name} (${user.userId})`;
                consultantFilter.appendChild(option);
            }
        });
    }
    
    // Poblar cliente
    const clientFilter = document.getElementById('clientFilter');
    if (clientFilter && currentData.companies) {
        clientFilter.innerHTML = '<option value="">Seleccionar cliente...</option>';
        Object.values(currentData.companies).forEach(company => {
            const option = document.createElement('option');
            option.value = company.companyId;
            option.textContent = company.name;
            clientFilter.appendChild(option);
        });
    }
    
    // Poblar soporte
    const supportFilter = document.getElementById('supportFilter');
    if (supportFilter && currentData.supports) {
        supportFilter.innerHTML = '<option value="all">Todos los Soportes</option>';
        Object.values(currentData.supports).forEach(support => {
            const option = document.createElement('option');
            option.value = support.supportId;
            option.textContent = support.name;
            supportFilter.appendChild(option);
        });
    }
    
    // Poblar proyecto
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter && currentData.projects) {
        projectFilter.innerHTML = '<option value="all">Todos los Proyectos</option>';
        Object.values(currentData.projects).forEach(project => {
            const option = document.createElement('option');
            option.value = project.projectId;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
    }
    
// Poblar soporte específico (para remanente)
const supportTypeFilter = document.getElementById('supportTypeFilter');
if (supportTypeFilter && currentData.supports) {
    supportTypeFilter.innerHTML = '<option value="">Seleccionar soporte específico...</option>';
    Object.values(currentData.supports).forEach(support => {
        const option = document.createElement('option');
        option.value = support.supportId;
        option.textContent = support.name;
        supportTypeFilter.appendChild(option);
    });
}
    
    // Poblar meses (para remanente)
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
        monthFilter.innerHTML = '<option value="">Seleccionar mes...</option>';
        const currentDate = new Date();
        
        // Últimos 12 meses
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
            const option = document.createElement('option');
            option.value = monthKey;
            option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            monthFilter.appendChild(option);
        }
    }
}

/**
 * Manejar cambio en filtro de cliente para reporte remanente
 */
function handleClientFilterChangeRemanente() {
    const clientFilter = document.getElementById('clientFilter');
    const supportTypeFilter = document.getElementById('supportTypeFilter');
    const projectFilter = document.getElementById('projectFilter');
    
    if (!clientFilter || !clientFilter.value) {
        // Si no hay cliente seleccionado, limpiar otros filtros
        if (supportTypeFilter) {
            supportTypeFilter.innerHTML = '<option value="">Seleccionar cliente primero...</option>';
            supportTypeFilter.disabled = true;
        }
        if (projectFilter) {
            projectFilter.innerHTML = '<option value="">Seleccionar cliente primero...</option>';
            projectFilter.disabled = true;
        }
        return;
    }
    
    const clientId = clientFilter.value;
    console.log('🔄 Cliente seleccionado para remanente:', clientId);
    
    // Habilitar filtros
    if (supportTypeFilter) supportTypeFilter.disabled = false;
    if (projectFilter) projectFilter.disabled = false;
    
    // Actualizar filtro de soportes específicos del cliente
    updateSupportTypeFilterByClient(clientId);
    
    // Actualizar filtro de proyectos del cliente
    updateProjectFilterByClient(clientId);
    
    // Revalidar
    validateRequiredFilters();
}

/**
 * Actualizar filtro de soporte específico por cliente
 */
function updateSupportTypeFilterByClient(clientId) {
    const supportTypeFilter = document.getElementById('supportTypeFilter');
    if (!supportTypeFilter) return;
    
    // Limpiar opciones actuales
    supportTypeFilter.innerHTML = '<option value="">Seleccionar soporte específico...</option>';
    
    // Buscar asignaciones de soporte del cliente
    const clientAssignments = Object.values(currentData.assignments || {}).filter(assignment => 
        assignment.companyId === clientId && assignment.isActive
    );
    
    // Obtener soportes únicos
    const uniqueSupports = new Set();
    clientAssignments.forEach(assignment => {
        if (assignment.supportId) {
            const support = currentData.supports?.[assignment.supportId];
            if (support) {
                uniqueSupports.add(JSON.stringify({
                    supportId: support.supportId,
                    name: support.name
                }));
            }
        }
    });
    
    // Agregar opciones al filtro
    Array.from(uniqueSupports).forEach(supportStr => {
        const support = JSON.parse(supportStr);
        const option = document.createElement('option');
        option.value = support.supportId;
        option.textContent = support.name;
        supportTypeFilter.appendChild(option);
    });
    
    console.log(`🔄 ${uniqueSupports.size} soportes encontrados para cliente ${clientId}`);
}

/**
 * Actualizar filtro de proyectos por cliente
 */
function updateProjectFilterByClient(clientId) {
    const projectFilter = document.getElementById('projectFilter');
    if (!projectFilter) return;
    
    // Opciones base
    projectFilter.innerHTML = `
        <option value="ninguno">Sin proyectos</option>
        <option value="todos">Todos los proyectos</option>
    `;
    
    // Buscar asignaciones de proyecto del cliente
    const projectAssignments = Object.values(currentData.projectAssignments || {}).filter(assignment => 
        assignment.companyId === clientId && assignment.isActive
    );
    
    // Obtener proyectos únicos
    const uniqueProjects = new Set();
    projectAssignments.forEach(assignment => {
        if (assignment.projectId) {
            const project = currentData.projects?.[assignment.projectId];
            if (project) {
                uniqueProjects.add(JSON.stringify({
                    projectId: project.projectId,
                    name: project.name
                }));
            }
        }
    });
    
    // Agregar proyectos específicos
    Array.from(uniqueProjects).forEach(projectStr => {
        const project = JSON.parse(projectStr);
        const option = document.createElement('option');
        option.value = project.projectId;
        option.textContent = project.name;
        projectFilter.appendChild(option);
    });
    
    console.log(`🔄 ${uniqueProjects.size} proyectos encontrados para cliente ${clientId}`);
}

/**
 * Validar filtros requeridos y habilitar/deshabilitar botones
 */
function validateRequiredFilters() {
    const report = ARVIC_REPORTS[currentReportType];
    if (!report) return;
    
    let isValid = true;
    let missingFields = [];
    
    // Validar consultor requerido
    if (report.filters.includes('consultant')) {
        const consultantFilter = document.getElementById('consultantFilter');
        if (!consultantFilter?.value) {
            isValid = false;
            missingFields.push('Consultor');
        }
    }
    
    // Validar cliente requerido
    if (report.filters.includes('client')) {
        const clientFilter = document.getElementById('clientFilter');
        if (!clientFilter?.value) {
            isValid = false;
            missingFields.push('Cliente');
        }
    }
    
    // Validaciones especiales para remanente
    if (currentReportType === 'remanente') {
        const supportTypeFilter = document.getElementById('supportTypeFilter');
        const monthFilter = document.getElementById('monthFilter');
        
        if (!supportTypeFilter?.value) {
            isValid = false;
            missingFields.push('Soporte Específico');
        }
        if (!monthFilter?.value) {
            isValid = false;
            missingFields.push('Mes');
        }
    }
    
    // Actualizar estado de botones
    const previewBtn = document.getElementById('previewBtn');
    const generateBtn = document.getElementById('generateBtn');
    
    if (previewBtn) {
        previewBtn.disabled = !isValid;
        previewBtn.title = isValid ? 'Generar vista previa' : `Faltan campos: ${missingFields.join(', ')}`;
    }
    
    if (generateBtn) {
        generateBtn.disabled = true; // Solo se habilita después de vista previa
    }
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
        exportPDFBtn.disabled = true;
    }
    
    console.log('🔍 Validación de filtros:', isValid ? '✅ Válido' : `❌ Faltan: ${missingFields.join(', ')}`);
}

/**
 * Manejar cambio en filtro de tiempo
 */
function handleTimeFilterChange() {
    const timeFilter = document.getElementById('timeFilter');
    const customDateRange = document.getElementById('customDateRange');
    
    if (timeFilter && customDateRange) {
        customDateRange.style.display = timeFilter.value === 'custom' ? 'flex' : 'none';
    }
}

/**
 * Resetear todos los filtros del reporte actual
 */
function resetReportFilters() {
    console.log('🔄 Reseteando filtros...');

    clearPreviewAndFilters();
    
    const configPanel = document.getElementById('reportConfigPanel');
    if (configPanel) {
        const selects = configPanel.querySelectorAll('select');
        const inputs = configPanel.querySelectorAll('input[type="date"]');
        
        selects.forEach(select => {
            if (select.id === 'timeFilter') {
                select.value = 'all';    // ← CAMBIADO DE 'week' A 'all'
            } else if (select.options[0]) {
                select.selectedIndex = 0;
            }
        });
        
        inputs.forEach(input => {
            input.value = '';
        });
    }
    
    // Ocultar rango personalizado
    const customDateRange = document.getElementById('customDateRange');
    if (customDateRange) {
        customDateRange.style.display = 'none';
    }
    
    // Revalidar
    validateRequiredFilters();
    
    window.NotificationUtils.info('Filtros restablecidos');
}

/**
 * Resetear completamente el generador de reportes
 * Limpia: tipo seleccionado, configuración, vista previa, datos en memoria
 */
function resetReportGenerator() {
    console.log('🧹 Reseteando generador de reportes...');
    
    // 1. Limpiar tipo de reporte seleccionado
    currentReportType = null;
    document.querySelectorAll('.report-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // 2. Ocultar panel de configuración
    const configPanel = document.getElementById('reportConfigPanel');
    if (configPanel) configPanel.style.display = 'none';
    
    // 3. Limpiar vista previa
    const previewPanel = document.getElementById('reportPreviewPanel');
    if (previewPanel) previewPanel.style.display = 'none';
    
    // 4. Limpiar datos en memoria
    currentReportData = null;
    currentReportConfig = null;
    editablePreviewData = {};
    
    // 5. Deshabilitar botón de generar
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = true;
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.disabled = true;
    
    console.log('✅ Generador reseteado completamente');
}

/**
 * Regresar al selector de reportes
 */
function backToReportSelector() {
    resetReportGenerator();
    const selector = document.getElementById('reportSelectorContainer');
    if (selector) selector.style.display = 'block';
    
    // Smooth scroll back to selector container
    const section = document.getElementById('generar-reporte-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Limpiar solo vista previa y filtros (mantiene tipo de reporte seleccionado)
 */
function clearPreviewAndFilters() {
    console.log('Limpiando vista previa y filtros (manteniendo tipo seleccionado)...');
    
    // 1. Ocultar panel de configuración (pero no limpiar el tipo)
    const configPanel = document.getElementById('reportConfigPanel');
    if (configPanel) {
        // Resetear los campos dentro del panel
        const selects = configPanel.querySelectorAll('select');
        const inputs = configPanel.querySelectorAll('input[type="date"]');
        
        selects.forEach(select => {
            if (select.id === 'timeFilter') {
                select.value = 'all';
            } else if (select.options[0]) {
                select.selectedIndex = 0;
            }
        });
        
        inputs.forEach(input => {
            input.value = '';
        });
    }
    
    // 2. Limpiar vista previa
    const previewPanel = document.getElementById('reportPreviewPanel');
    if (previewPanel) previewPanel.style.display = 'none';
    
    // 3. Limpiar datos en memoria
    currentReportData = null;
    currentReportConfig = null;
    editablePreviewData = {};
    window.differenceTableData = [];
    
    // 4. Deshabilitar botón de generar
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = true;
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.disabled = true;
    
    // 5. Ocultar rango personalizado
    const customDateRange = document.getElementById('customDateRange');
    if (customDateRange) customDateRange.style.display = 'none';
    
    // 6. Revalidar
    validateRequiredFilters();
    
    console.log('Vista previa y filtros limpiados (tipo de reporte mantenido)');
}

// === FUNCIÓN ADICIONAL: Verificar datos antes de generar vista previa ===
function verifyDataBeforePreview() {
    console.log('Verificando datos antes de generar vista previa...');

    const dataChecks = {
        reports: Object.keys(currentData.reports || {}).length,
        users: Object.keys(currentData.users || {}).length,
        companies: Object.keys(currentData.companies || {}).length,
        assignments: Object.keys(currentData.assignments || {}).length,
        supports: Object.keys(currentData.supports || {}).length,
        modules: Object.keys(currentData.modules || {}).length
    };

    console.log('Estado de datos:', dataChecks);
    
    // Verificar si hay reportes aprobados
    const approvedReports = Object.values(currentData.reports || {})
        .filter(r => r.status === 'Aprobado');
    
    console.log('Reportes aprobados encontrados:', approvedReports.length);
    
    if (approvedReports.length === 0) {
        console.warn('No hay reportes aprobados disponibles');
        return false;
    }
    
    return true;
}

/**
 * Generar vista previa con datos reales y tabla editable
 */
async function generateReportPreview() {
    console.log('Generando vista previa para:', currentReportType);
    
    const report = ARVIC_REPORTS[currentReportType];
    const previewPanel = document.getElementById('reportPreviewPanel');
    
    if (!previewPanel || !report) {
        console.error('Panel de vista previa o configuración no encontrada');
        return;
    }
    
    try {

        // 🆕 VERIFICACIÓN: Asegurar que los datos están cargados
        if (!verifyDataBeforePreview()) {
            console.log('Recargando datos debido a verificación fallida...');
            
            // Forzar recarga de datos
            await loadCurrentData(true);
            
            // Verificar nuevamente
            if (!verifyDataBeforePreview()) {
                window.NotificationUtils.error('No hay reportes aprobados disponibles para generar la vista previa');
                return;
            }
        }

        // 1. Obtener datos según filtros
        const rawData = getReportDataByType(currentReportType);
        
        if (!rawData || rawData.length === 0) {
            showEmptyPreview(previewPanel, report);
            return;
        }
        
        // 2. Procesar datos según estructura del reporte
        currentReportData = processDataForReport(rawData, currentReportType);
        
        // 3. Inicializar datos editables
        initializeEditableData();
        
        // 4. Generar tabla editable
        generateEditableTable(previewPanel, report);
        
        // 5. Mostrar panel y habilitar generación
        previewPanel.style.display = 'block';
        previewPanel.scrollIntoView({ behavior: 'smooth' });
        
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) {
            exportPDFBtn.disabled = false;
        }
        
        window.NotificationUtils.success(`Vista previa generada: ${currentReportData.length} registros`);
        
    } catch (error) {
        console.error('Error generando vista previa:', error);
        window.NotificationUtils.error('Error al generar vista previa: ' + error.message);
    }
}

/**
 * Obtener datos según el tipo de reporte y filtros aplicados - CON DIAGNÓSTICO
 */
function getReportDataByType(reportType) {
    console.log('getReportDataByType - Tipo de reporte solicitado:', reportType);
    
    // Obtener reportes aprobados
    const allReports = Object.values(currentData.reports || {});
    console.log('Total de reportes en sistema:', allReports.length);

    let approvedReports = allReports.filter(r => r.status === 'Aprobado');
    console.log('Reportes aprobados antes de filtro tiempo:', approvedReports.length);

    // Mostrar algunos reportes de ejemplo
    if (approvedReports.length > 0) {
        console.log('Ejemplo de reporte aprobado:', {
            id: approvedReports[0].id,
            userId: approvedReports[0].userId,
            assignmentId: approvedReports[0].assignmentId,
            createdAt: approvedReports[0].createdAt,
            hours: approvedReports[0].hours,
            status: approvedReports[0].status
        });
    }
    
    // Verificar filtro de tiempo ANTES de aplicarlo
    const timeFilter = document.getElementById('timeFilter');
    console.log('Filtro de tiempo actual:', timeFilter ? timeFilter.value : 'NO ENCONTRADO');
    
    if (reportType === 'remanente') {
    const monthKey = document.getElementById('monthFilter')?.value;
    if (monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
        
        approvedReports = approvedReports.filter(report => {
            const reportDate = new Date(report.createdAt);
            const reportYear = reportDate.getFullYear();
            const reportMonth = reportDate.getMonth();
            const targetYear = monthStart.getFullYear();
            const targetMonth = monthStart.getMonth();
            
            return reportYear === targetYear && reportMonth === targetMonth;
        });
        
        console.log(`Reportes filtrados por mes ${monthKey}:`, approvedReports.length);
    }
} else {
    // Aplicar filtro de tiempo normal para otros tipos de reporte
    approvedReports = applyTimeFilter(approvedReports);
}
console.log('Reportes aprobados DESPUÉS de filtro tiempo:', approvedReports.length);

    // Si no hay reportes después del filtro de tiempo, es probable que sea el problema
    if (approvedReports.length === 0) {
        console.error('NO HAY REPORTES DESPUÉS DEL FILTRO DE TIEMPO');
        console.log('Esto indica que todos los reportes son más antiguos que el periodo seleccionado');
        console.log('Cambie el filtro de tiempo a "Todas las fechas" o "Personalizado"');
        return [];
    }
    
    // Verificar datos de asignaciones
    console.log('Datos de asignaciones disponibles:');
    console.log('   - Asignaciones normales:', Object.keys(currentData.assignments || {}).length);
    console.log('   - Asignaciones de proyecto:', Object.keys(currentData.projectAssignments || {}).length);
    
    switch (reportType) {
        case 'pago-consultor-general':
            console.log('Procesando pago-consultor-general...');
            const resultSoporte = getSoporteData(approvedReports, 'all', 'all');
            console.log('Resultado getSoporteData:', resultSoporte.length);
            return resultSoporte;
            
        case 'pago-consultor-especifico':
            console.log('👤 Procesando pago-consultor-especifico...');
            const consultantId = document.getElementById('consultantFilter')?.value;
            const supportId = document.getElementById('supportFilter')?.value || 'all';
            console.log('🎯 Filtros aplicados:', { consultantId, supportId });
            const resultConsultor = getSoporteData(approvedReports, consultantId, supportId);
            console.log('📊 Resultado getSoporteData específico:', resultConsultor.length);
            return resultConsultor;
            
        case 'cliente-soporte':
            console.log('🏢 Procesando cliente-soporte...');
            const clientId = document.getElementById('clientFilter')?.value;
            const clientSupportId = document.getElementById('supportFilter')?.value || 'all';
            console.log('🎯 Filtros aplicados:', { clientId, clientSupportId });
            const resultCliente = getClientSoporteData(approvedReports, clientId, clientSupportId);
            console.log('📊 Resultado getClientSoporteData:', resultCliente.length);
            return resultCliente;
            
        case 'proyecto-general':
            console.log('📋 Procesando proyecto-general...');
            const projectId = document.getElementById('projectFilter')?.value || 'all';
            console.log('🎯 Filtros aplicados:', { projectId });
            const resultProyecto = getProyectoData(approvedReports, 'all', projectId);
            console.log('📊 Resultado getProyectoData:', resultProyecto.length);
            return resultProyecto;
            
        case 'proyecto-cliente':
            console.log('🏢 Procesando proyecto-cliente...');
            const proyectoClientId = document.getElementById('clientFilter')?.value;
            const proyectoProjectId = document.getElementById('projectFilter')?.value || 'all';
            console.log('🎯 Filtros aplicados:', { proyectoClientId, proyectoProjectId });
            const resultProyectoCliente = getClientProyectoData(approvedReports, proyectoClientId, proyectoProjectId);
            console.log('📊 Resultado getClientProyectoData:', resultProyectoCliente.length);
            return resultProyectoCliente;
            
        case 'proyecto-consultor':
            console.log('👤 Procesando proyecto-consultor...');
            const proyectoConsultorId = document.getElementById('consultantFilter')?.value;
            const proyectoConsultorProjectId = document.getElementById('projectFilter')?.value || 'all';
            console.log('🎯 Filtros aplicados:', { proyectoConsultorId, proyectoConsultorProjectId });
            const resultProyectoConsultor = getConsultantProyectoData(approvedReports, proyectoConsultorId, proyectoConsultorProjectId);
            console.log('📊 Resultado getConsultantProyectoData:', resultProyectoConsultor.length);
            return resultProyectoConsultor;
            
        case 'remanente':
            console.log('📊 Procesando remanente...');
            const remanenteClientId = document.getElementById('clientFilter')?.value;
            const specificSupportId = document.getElementById('supportTypeFilter')?.value;
            const monthKey = document.getElementById('monthFilter')?.value;
            const projectSelection = document.getElementById('projectFilter')?.value;
            
            if (!remanenteClientId || !specificSupportId || !monthKey) {
                console.error('❌ Faltan filtros requeridos para remanente');
                return [];
            }
            
            console.log('📊 Generando remanente con proyectos:', {
                cliente: remanenteClientId,
                soporte: specificSupportId,
                mes: monthKey,
                proyectos: projectSelection
            });
            const resultRemanente = getRemanenteDataWithProjects(approvedReports, remanenteClientId, specificSupportId, monthKey, projectSelection);
            console.log('📊 Resultado getRemanenteDataWithProjects:', resultRemanente);
            return resultRemanente;
            
        default:
            console.error('❌ Tipo de reporte no reconocido:', reportType);
            return [];
    }
}

/**
 * Aplicar filtro de tiempo a los reportes
 */
function applyTimeFilter(reports) {
    const timeFilter = document.getElementById('timeFilter');
    if (!timeFilter) return reports;
    
    // 🆕 Forzar valor por defecto
    if (!timeFilter.value || timeFilter.value === 'week') {
        timeFilter.value = 'all';
    }
    
    const now = new Date();
    const timeValue = timeFilter.value;
    
    switch (timeValue) {
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return reports.filter(r => new Date(r.createdAt) >= weekAgo);
            
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return reports.filter(r => new Date(r.createdAt) >= monthAgo);
            
        case 'custom':
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                
                return reports.filter(r => {
                    const reportDate = new Date(r.createdAt);
                    return reportDate >= start && reportDate <= end;
                });
            }
            return reports;
            
        case 'all':
        default:
            return reports;
    }
}

/**
 * Obtener datos de reportes de soporte
 */
function getSoporteData(reports, consultantId, supportId) {
    const soporteData = [];
    
    reports.forEach(report => {
        // Filtrar por consultor si especificado
        if (consultantId !== 'all' && report.userId !== consultantId) return;
        
        const user = currentData.users[report.userId];
        if (!user) return;
        
        // 1️⃣ Buscar asignación (puede ser soporte normal o tarea)
        let assignment = null;
        let assignmentType = null;
        
        if (report.assignmentId) {
            // Primero buscar en asignaciones normales
            assignment = currentData.assignments[report.assignmentId];
            if (assignment) {
                assignmentType = 'support';
            } else {
                // Si no está, buscar en tareas
                const taskAssignments = window.PortalDB.getTaskAssignments ? 
                    window.PortalDB.getTaskAssignments() : {};
                assignment = taskAssignments[report.assignmentId];
                if (assignment) {
                    assignmentType = 'task';
                }
            }
        } else {
            // Fallback: buscar asignación activa del usuario
            assignment = Object.values(currentData.assignments || {}).find(a => 
                a.userId === report.userId && a.isActive && a.supportId
            );
            if (assignment) {
                assignmentType = 'support';
            }
        }
        
        if (!assignment) return;
        
        // 2️⃣ Obtener el soporte correcto según el tipo
        let supportIdToCheck = null;
        if (assignmentType === 'support') {
            supportIdToCheck = assignment.supportId;
        } else if (assignmentType === 'task') {
            supportIdToCheck = assignment.linkedSupportId;
        }
        
        if (!supportIdToCheck) return;
        
        // Filtrar por soporte si especificado
        if (supportId !== 'all' && supportIdToCheck !== supportId) return;
        
        // 3️⃣ Agregar assignmentType al reporte
        const reportWithType = {
            ...report,
            assignmentType: assignmentType
        };
        
        // 4️⃣ Usar generarLineaReporteMejorada
        const linea = generarLineaReporteMejorada(reportWithType, 'pago-consultor');
        
        if (!linea) {
            console.warn('No se pudo generar línea para reporte:', report.id);
            return;
        }
        
        const company = currentData.companies[assignment.companyId];
        const support = currentData.supports[supportIdToCheck];
        
        soporteData.push({
            reportId: report.id,
            idEmpresa: assignment.companyId,
            empresa: company?.name || assignment.companyId,
            consultor: linea.consultorNombre,
            soporte: support?.name || 'Sin soporte',
            origen: linea.origen,                    // ✅ NUEVO
            detalle: linea.detalle,                  // ✅ NUEVO
            modulo: linea.moduloNombre,
            tiempo: linea.horas,
            tarifaModulo: linea.tarifa,
            total: linea.total,
            originalTime: linea.horas
        });
    });
    
    return soporteData;
}

/**
 * Obtener datos de soporte para cliente específico
 */
function getClientSoporteData(reports, clientId, supportId) {
    const clientData = [];
    
    reports.forEach(report => {
        // Buscar asignación (soporte o tarea)
        let assignment = null;
        let assignmentType = null;
        
        if (report.assignmentId) {
            // Buscar en asignaciones normales
            assignment = currentData.assignments[report.assignmentId];
            if (assignment) {
                assignmentType = 'support';
            } else {
                // Buscar en tareas
                const taskAssignments = window.PortalDB.getTaskAssignments ? 
                    window.PortalDB.getTaskAssignments() : {};
                assignment = taskAssignments[report.assignmentId];
                if (assignment) {
                    assignmentType = 'task';
                }
            }
        } else {
            assignment = Object.values(currentData.assignments || {}).find(a => 
                a.userId === report.userId && a.isActive && a.supportId
            );
            if (assignment) {
                assignmentType = 'support';
            }
        }
        
        if (!assignment || assignment.companyId !== clientId) return;
        
        // Obtener supportId según el tipo
        const supportIdToCheck = assignmentType === 'task' ? 
            assignment.linkedSupportId : assignment.supportId;
        
        if (!supportIdToCheck) return;
        
        // Filtrar por soporte si especificado
        if (supportId !== 'all' && supportIdToCheck !== supportId) return;
        
        // Agregar assignmentType y usar generarLineaReporteMejorada
        const reportWithType = {
            ...report,
            assignmentType: assignmentType
        };
        
        const linea = generarLineaReporteMejorada(reportWithType, 'cliente-soporte');
        
        if (!linea) return;
        
        const support = currentData.supports[supportIdToCheck];
        
        clientData.push({
            reportId: report.id,
            soporte: support?.name || 'Sin soporte',
            origen: linea.origen,                    // ✅ NUEVO
            detalle: linea.detalle,                  // ✅ NUEVO
            modulo: linea.moduloNombre,
            tiempo: linea.horas,
            tarifaModulo: linea.tarifa,
            total: linea.total,
            originalTime: linea.horas
        });
    });
    
    return clientData;
}

/**
 * Calcular distribución de semanas según días del mes (según documentación oficial)
 */
function calculateMonthWeekDistribution(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    
    console.log(`📅 Calculando distribución para ${year}-${month}: ${daysInMonth} días`);
    
    let weekStructure;
    
    switch (daysInMonth) {
        case 28:
            weekStructure = {
                totalWeeks: 4,
                distribution: [7, 7, 7, 7], // 4 semanas exactas
                description: '4 semanas exactas (7 días cada una)'
            };
            break;
        case 29:
            weekStructure = {
                totalWeeks: 5,
                distribution: [7, 7, 7, 7, 1], // 4 semanas completas + 1 día
                description: '4 semanas completas + 1 día en quinta semana'
            };
            break;
        case 30:
            weekStructure = {
                totalWeeks: 5,
                distribution: [7, 7, 7, 7, 2], // 4 semanas completas + 2 días
                description: '4 semanas completas + 2 días en quinta semana'
            };
            break;
        case 31:
            weekStructure = {
                totalWeeks: 5,
                distribution: [7, 7, 7, 7, 3], // 4 semanas completas + 3 días
                description: '4 semanas completas + 3 días en quinta semana'
            };
            break;
        default:
            // Fallback para casos excepcionales
            weekStructure = {
                totalWeeks: 4,
                distribution: [7, 7, 7, 7],
                description: 'Distribución por defecto (4 semanas)'
            };
    }
    
    console.log(`✅ ${weekStructure.description}`);
    return weekStructure;
}

/**
 * Determinar a qué semana pertenece un día específico del mes
 */
function getDayWeekNumber(day, weekDistribution) {
    let currentDay = 1;
    
    for (let week = 0; week < weekDistribution.length; week++) {
        const weekDays = weekDistribution[week];
        
        if (day >= currentDay && day < currentDay + weekDays) {
            return week + 1; // Retornar 1-based (semana 1, 2, 3, etc.)
        }
        
        currentDay += weekDays;
    }
    
    // Fallback: si algo sale mal, asignar a última semana
    return weekDistribution.length;
}


/**
 * Obtener datos para reporte remanente (estructura especial por semanas) - VERSIÓN CORREGIDA
 */
function getRemanenteData(reports, clientId, specificSupportId, monthKey) {
    console.log('📊 Generando reporte remanente con soporte específico');
    
    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // ✅ Calcular distribución correcta de semanas
    const weekStructure = calculateMonthWeekDistribution(year, month);
    console.log(`📅 Estructura del mes: ${weekStructure.totalWeeks} semanas`);
    
    // Filtrar reportes del mes y cliente específicos
    const monthReports = reports.filter(report => {
        const reportDate = new Date(report.createdAt);
        
        // Verificar rango de fechas primero
        if (!(reportDate >= monthStart && reportDate <= monthEnd)) {
            return false;
        }
        
        // ✅ CORREGIDO: Buscar en AMBOS tipos de asignaciones
        let assignment = null;
        let assignmentType = null;
        
        if (report.assignmentId) {
            // Verificar si es una tarea
            if (report.assignmentId.startsWith('task_')) {
                const taskAssignments = window.PortalDB ? window.PortalDB.getTaskAssignments() : {};
                assignment = taskAssignments[report.assignmentId];
                assignmentType = 'task';
            } 
            // Si no, buscar en asignaciones normales
            else {
                assignment = currentData.assignments[report.assignmentId];
                assignmentType = 'support';
            }
        } 
        // Si no tiene assignmentId, buscar asignación activa del usuario
        else {
            assignment = Object.values(currentData.assignments || {}).find(a => 
                a.userId === report.userId && a.isActive
            );
            assignmentType = 'support';
        }
        
        if (!assignment) {
            console.log('⚠️ Reporte sin asignación válida:', report.id);
            return false;
        }
        
        // Verificar cliente
        if (assignment.companyId !== clientId) {
            return false;
        }
        
        // ✅ CORREGIDO: Obtener supportId según el tipo de asignación
        const supportIdToCheck = assignmentType === 'task' 
            ? assignment.linkedSupportId 
            : assignment.supportId;
        
        // Verificar soporte específico
        if (supportIdToCheck !== specificSupportId) {
            return false;
        }
        
        return true;
    });
    
    console.log(`📋 ${monthReports.length} reportes encontrados para el soporte específico`);

    // Agrupar por módulo y distribuir por semanas dinámicamente
    const moduleData = {};
    
    monthReports.forEach(report => {
        // ✅ CORREGIDO: Obtener asignación correcta según tipo
        let assignment = null;
        
        if (report.assignmentId?.startsWith('task_')) {
            const taskAssignments = window.PortalDB ? window.PortalDB.getTaskAssignments() : {};
            assignment = taskAssignments[report.assignmentId];
        } else if (report.assignmentId) {
            assignment = currentData.assignments[report.assignmentId];
        } else {
            assignment = Object.values(currentData.assignments || {}).find(a => 
                a.userId === report.userId && a.isActive
            );
        }
        
        if (!assignment) {
            console.warn('⚠️ No se encontró asignación para reporte:', report.id);
            return;
        }
        
        const user = currentData.users[report.userId];
        let consultantDisplayName = '';
        if (user) {
            const parts = user.name.trim().split(/\s+/);
            consultantDisplayName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
        }
        const module = currentData.modules[assignment.moduleId];
        const moduleAcronym = module ? window.convertModuleToAcronym(module.name) : 'N/A';
        
        let displayLabel = '';
        if (module && module.name && module.name !== 'N/A') {
            displayLabel = consultantDisplayName ? `${moduleAcronym} (${consultantDisplayName})` : moduleAcronym;
        } else {
            displayLabel = user ? user.name : 'Consultor';
        }
        
        const groupKey = `${assignment.moduleId || 'nomodule'}_${report.userId}`;
        const defaultTariff = assignment ? (parseFloat(assignment.tarifaCliente) || 850) : 850;
        
        // ✅ Inicializar estructura dinámica de semanas
        if (!moduleData[groupKey]) {
            moduleData[groupKey] = {
                modulo: displayLabel,
                totalHoras: 0,
                monthStructure: weekStructure,
                type: 'soporte'  // Marcar como soporte
            };
            
            // Crear semanas dinámicamente
            for (let i = 1; i <= weekStructure.totalWeeks; i++) {
                moduleData[groupKey][`semana${i}`] = {
                    tiempo: 0,
                    tarifa: defaultTariff,
                    total: 0
                };
            }
        }
        
        // ✅ Calcular semana correcta según distribución
        const reportDay = new Date(report.createdAt).getDate();
        const correctWeekNum = getDayWeekNumber(reportDay, weekStructure.distribution);
        const semanaKey = `semana${correctWeekNum}`;
        
        console.log(`📅 Reporte ${report.id} - Día ${reportDay} → ${semanaKey}`);
        
        const hours = parseFloat(report.hours || 0);
        
        if (moduleData[groupKey][semanaKey]) {
            moduleData[groupKey][semanaKey].tiempo += hours;
            moduleData[groupKey][semanaKey].total = 
                moduleData[groupKey][semanaKey].tiempo * moduleData[groupKey][semanaKey].tarifa;
            moduleData[groupKey].totalHoras += hours;
        }
    });
    
    console.log(`✅ Datos procesados para ${Object.keys(moduleData).length} módulos`);
    return Object.values(moduleData);
}

/**
 * Obtener datos para reporte remanente CON PROYECTOS
 */
function getRemanenteDataWithProjects(reports, clientId, specificSupportId, monthKey, projectSelection) {
    console.log('📊 Generando reporte remanente con proyectos incluidos');
    
    // 1. Obtener datos de soportes (función existente)
    const soporteData = getRemanenteData(reports, clientId, specificSupportId, monthKey);
    
    // 2. Obtener datos de proyectos si se seleccionaron
    let projectData = [];
    if (projectSelection && projectSelection !== 'ninguno') {
        projectData = getRemanenteProjectData(reports, clientId, monthKey, projectSelection);
    }
    
    // 3. Combinar ambos datasets
    const combinedData = {
        soportes: soporteData,
        proyectos: projectData,
        hasProjects: projectData.length > 0,
        projectSelection: projectSelection
    };
    
    console.log('✅ Datos remanente combinados:', {
        soportes: soporteData.length,
        proyectos: projectData.length,
        selección: projectSelection
    });
    
    return combinedData;
}

/**
 * Obtener datos de proyectos para reporte remanente
 */
function getRemanenteProjectData(reports, clientId, monthKey, projectSelection) {
    console.log('📋 DIAGNÓSTICO - Obteniendo datos de proyectos para remanente');
    console.log('📊 Parámetros recibidos:', {
        reportsTotal: reports.length,
        clientId: clientId,
        monthKey: monthKey,
        projectSelection: projectSelection
    });
    
    // Verificar si existen project assignments
    console.log('📋 Total projectAssignments en sistema:', Object.keys(currentData.projectAssignments || {}).length);
    console.log('📋 Muestra projectAssignments:', Object.values(currentData.projectAssignments || {}).slice(0, 3));
    
    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    console.log('📅 Rango de fechas:', { monthStart, monthEnd });

    // DIAGNÓSTICO: Examinar todos los reportes
    console.log('🔍 DIAGNÓSTICO REPORTES:');
    console.log('📊 Total reportes para análisis:', reports.length);
    
    // Mostrar algunos reportes de ejemplo
    reports.slice(0, 3).forEach((report, index) => {
        console.log(`📋 Reporte ${index + 1}:`, {
            id: report.id,
            userId: report.userId,
            assignmentId: report.assignmentId,
            createdAt: report.createdAt,
            status: report.status,
            hours: report.hours
        });
    });
    
    // Verificar assignmentIds en reportes vs projectAssignments
    const reportAssignmentIds = new Set(reports.map(r => r.assignmentId).filter(id => id));
    const projectAssignmentIds = new Set(Object.keys(currentData.projectAssignments || {}));
    
    console.log('🔗 AssignmentIds en reportes:', Array.from(reportAssignmentIds).slice(0, 5));
    console.log('🔗 AssignmentIds en projectAssignments:', Array.from(projectAssignmentIds).slice(0, 5));
    console.log('🔗 Intersección:', Array.from(reportAssignmentIds).filter(id => projectAssignmentIds.has(id)));
    
// Filtrar reportes de proyectos del mes y cliente
    const projectReports = [];
    
    reports.forEach(report => {
        const reportDate = new Date(report.createdAt);
        
        console.log('🔍 Examinando reporte:', {
            id: report.id,
            assignmentId: report.assignmentId,
            date: reportDate,
            inDateRange: reportDate >= monthStart && reportDate <= monthEnd
        });
        
        // Verificar rango de fechas
        if (!(reportDate >= monthStart && reportDate <= monthEnd)) {
            console.log('❌ Reporte fuera del rango de fechas');
            return;
        }
        
        // Buscar asignación de proyecto
        const projectAssignment = currentData.projectAssignments?.[report.assignmentId];
        
        console.log('🔍 ProjectAssignment encontrado:', projectAssignment);
        
        if (!projectAssignment) {
            console.log('❌ No es reporte de proyecto');
            return;
        }
        
        if (projectAssignment.companyId !== clientId) {
            console.log('❌ Proyecto de otro cliente');
            return;
        }
        
        // Filtrar por proyecto específico si se seleccionó uno
        if (projectSelection !== 'todos' && projectAssignment.projectId !== projectSelection) {
            console.log('❌ Proyecto no seleccionado');
            return;
        }
        
        console.log('✅ Reporte de proyecto válido agregado');
        projectReports.push(report);
    });
    
    console.log(`📋 ${projectReports.length} reportes de proyecto encontrados después del filtrado`);
    
    // Agrupar por proyecto y módulo
    const projectData = {};
    
    projectReports.forEach(report => {
        const projectAssignment = currentData.projectAssignments?.[report.assignmentId];
        const project = currentData.projects?.[projectAssignment?.projectId];
        const module = currentData.modules?.[projectAssignment?.moduleId];
        
        if (!project || !module) return;
        
        const projectKey = project.projectId;
        const moduleKey = module.moduleId;
        
        // Inicializar proyecto si no existe
        if (!projectData[projectKey]) {
            projectData[projectKey] = {
                projectName: project.name,
                modules: {}
            };
        }
        
        // Inicializar módulo si no existe
        if (!projectData[projectKey].modules[moduleKey]) {
            projectData[projectKey].modules[moduleKey] = {
                moduleName: module.name,
                totalHours: 0,
                tarifa: projectAssignment.tarifaCliente || module.tariff || 650,
                total: 0
            };
        }
        
        // Acumular horas
        const hours = parseFloat(report.hours || 0);
        projectData[projectKey].modules[moduleKey].totalHours += hours;
        projectData[projectKey].modules[moduleKey].total = 
            projectData[projectKey].modules[moduleKey].totalHours * 
            projectData[projectKey].modules[moduleKey].tarifa;
    });
    
    console.log(`✅ ${Object.keys(projectData).length} proyectos procesados`);
    
    // ✅ APLANAR LA ESTRUCTURA: Convertir objeto anidado a array plano
    const flatData = [];
    
    Object.values(projectData).forEach(project => {
        Object.values(project.modules).forEach(module => {
            flatData.push({
                projectName: project.projectName,
                moduleName: module.moduleName,
                totalHours: module.totalHours,
                tarifa: module.tarifa,
                total: module.total,
                type: 'project'  // ✅ Marcar como proyecto
            });
        });
    });
    
    console.log(`✅ ${flatData.length} módulos de proyecto en array plano`);
    return flatData;  // ✅ RETORNAR ARRAY PLANO
}

/**
 * Obtener datos de proyecto
 */
function getProyectoData(reports, consultantId, projectId) {
    const proyectoData = [];
    
    reports.forEach(report => {
        // Filtrar por consultor si especificado
        if (consultantId !== 'all' && report.userId !== consultantId) return;
        
        const user = currentData.users[report.userId];
        if (!user) return;
        
        // Buscar asignación de proyecto
        let projectAssignment = null;
        if (report.assignmentId) {
            projectAssignment = (currentData.projectAssignments || {})[report.assignmentId];
        }
        
        if (!projectAssignment) return;
        
        // Filtrar por proyecto si especificado
        if (projectId !== 'all' && projectAssignment.projectId !== projectId) return;
        
        // ✅ NUEVO: Agregar assignmentType al reporte
        const reportWithType = {
            ...report,
            assignmentType: 'project'
        };
        
        // ✅ NUEVO: Usar generarLineaReporteMejorada
        const linea = generarLineaReporteMejorada(reportWithType, 'pago-consultor');
        
        if (!linea) {
            console.warn('⚠️ No se pudo generar línea para reporte:', report.id);
            return;
        }
        
        const company = currentData.companies[projectAssignment.companyId];
        
        proyectoData.push({
            reportId: report.id,
            idEmpresa: projectAssignment.companyId,
            empresa: company?.name || projectAssignment.companyId,
            consultor: linea.consultorNombre,
            origen: linea.origen,                    // ✅ NUEVO
            detalle: linea.detalle,                  // ✅ NUEVO
            modulo: linea.moduloNombre,
            tiempo: linea.horas,
            tarifaModulo: linea.tarifa,              // ✅ Ahora del tarifario
            total: linea.total,                      // ✅ Ahora calculado
            originalTime: linea.horas
        });
    });
    
    return proyectoData;
}

/**
 * Funciones adicionales para proyecto-cliente y proyecto-consultor
 */
function getClientProyectoData(reports, clientId, projectId) {
    const clientData = [];
    
    reports.forEach(report => {
        let projectAssignment = (currentData.projectAssignments || {})[report.assignmentId];
        
        if (!projectAssignment || projectAssignment.companyId !== clientId) return;
        if (projectId !== 'all' && projectAssignment.projectId !== projectId) return;
        
        // Agregar assignmentType
        const reportWithType = {
            ...report,
            assignmentType: 'project'
        };
        
        const linea = generarLineaReporteMejorada(reportWithType, 'cliente-proyecto');
        
        if (!linea) return;
        
        clientData.push({
            reportId: report.id,
            origen: linea.origen,                    // ✅ NUEVO
            detalle: linea.detalle,                  // ✅ NUEVO
            modulo: linea.moduloNombre,
            tiempo: linea.horas,
            tarifaModulo: linea.tarifa,
            total: linea.total,
            originalTime: linea.horas
        });
    });
    
    return clientData;
}

function getConsultantProyectoData(reports, consultantId, projectId) {
    const consultantData = [];
    
    reports.forEach(report => {
        if (report.userId !== consultantId) return;
        
        let projectAssignment = (currentData.projectAssignments || {})[report.assignmentId];
        if (!projectAssignment) return;
        if (projectId !== 'all' && projectAssignment.projectId !== projectId) return;
        
        // Agregar assignmentType
        const reportWithType = {
            ...report,
            assignmentType: 'project'
        };
        
        const linea = generarLineaReporteMejorada(reportWithType, 'proyecto-consultor');
        
        if (!linea) return;
        
        const company = currentData.companies[projectAssignment.companyId];
        
        consultantData.push({
            reportId: report.id,
            idEmpresa: projectAssignment.companyId,
            empresa: company?.name || projectAssignment.companyId,
            consultor: linea.consultorNombre,
            origen: linea.origen,                    // ✅ NUEVO
            detalle: linea.detalle,                  // ✅ NUEVO
            modulo: linea.moduloNombre,
            tiempo: linea.horas,
            tarifaModulo: linea.tarifa,
            total: linea.total,
            originalTime: linea.horas
        });
    });
    
    return consultantData;
}

/**
 * Procesar datos según estructura específica del reporte
 */
function processDataForReport(rawData, reportType) {
    console.log('🔧 Procesando datos para', reportType);
    
    // Manejar caso especial del reporte remanente con proyectos
    if (reportType === 'remanente') {
        if (!rawData || (!rawData.soportes && !rawData.proyectos)) {
            console.log('❌ No hay datos válidos para remanente');
            return [];
        }
        
        console.log(`📊 Datos remanente:`, {
            soportes: rawData.soportes?.length || 0,
            proyectos: rawData.proyectos?.length || 0  // ✅ Ahora es array
        });
        
        // Los datos ya vienen procesados correctamente de getRemanenteDataWithProjects
        return rawData;
    }
    
    // Para otros tipos de reporte, manejar como array
    if (Array.isArray(rawData)) {
        console.log('🔧 Procesando', rawData.length, 'registros para', reportType);
        return rawData;
    }
    
    console.log('⚠️ Tipo de datos no reconocido para', reportType);
    return rawData;
}

/**
 * Inicializar datos editables desde los datos procesados
 */
function initializeEditableData() {
    console.log('📝 Inicializando datos editables para:', currentReportType);
    
    editablePreviewData = {};
    
    // Manejar caso especial del reporte remanente con proyectos
    if (currentReportType === 'remanente') {
        if (!currentReportData || (!currentReportData.soportes && !currentReportData.proyectos)) {
            console.log('❌ No hay datos para inicializar en remanente');
            return;
        }
        
        let index = 0;
        
        // 1. Inicializar datos de soportes
        if (currentReportData.soportes && Array.isArray(currentReportData.soportes)) {
            currentReportData.soportes.forEach((soporte) => {
                editablePreviewData[index] = {
                    type: 'soporte',
                    ...soporte,
                    originalData: { ...soporte }
                };
                index++;
            });
        }
        
// 2. Inicializar datos de proyectos
if (currentReportData.proyectos) {
    console.log('🔧 Procesando proyectos para edición:', currentReportData.proyectos);
    
    if (Array.isArray(currentReportData.proyectos)) {
        // Si es array (versión nueva)
        currentReportData.proyectos.forEach((proyecto) => {
            editablePreviewData[index] = {
                type: 'project',
                projectName: proyecto.projectName,
                moduleName: proyecto.moduleName,
                totalHours: proyecto.totalHours,
                editedTime: proyecto.totalHours,
                editedTariff: proyecto.tarifaModulo || proyecto.tarifa,
                editedTotal: proyecto.total,
                originalData: { ...proyecto }
            };
            index++;
        });
    } else if (typeof currentReportData.proyectos === 'object') {
        // Si es objeto (versión actual)
        Object.entries(currentReportData.proyectos).forEach(([projectId, projectInfo]) => {
            Object.entries(projectInfo.modules).forEach(([moduleId, moduleData]) => {
                editablePreviewData[index] = {
                    type: 'project',
                    projectName: projectInfo.projectName,
                    moduleName: moduleData.moduleName,
                    totalHours: moduleData.totalHours,
                    editedTime: moduleData.totalHours,
                   editedTariff: moduleData.tarifaModulo || moduleData.tarifa,
                    editedTotal: moduleData.total,
                    originalData: { ...moduleData }
                };
                index++;
            });
        });
    }
}
        
        // 3. Inicializar la tabla de diferencia
        let totalSoporteHours = 0;
        if (currentReportData.soportes) {
            currentReportData.soportes.forEach(soporte => {
                totalSoporteHours += parseFloat(soporte.totalHoras || 0);
            });
        }
        
        const standardHours = 150;
        const diffHours = Math.max(0, totalSoporteHours - standardHours);
        
        // Inicializar si está vacío o si se fuerza un reset (por cambio de filtros)
        if (!window.differenceTableData || window.differenceTableData.length === 0 || window.differenceTableData._resetPending) {
            window.differenceTableData = [
                {
                    factura: '',
                    concepto: 'Funcional',
                    tiempo: 0,
                    tarifa: 850,
                    total: 0
                },
                {
                    factura: '',
                    concepto: 'BASIS',
                    tiempo: 0,
                    tarifa: 1000,
                    total: 0
                },
                {
                    factura: '',
                    concepto: 'ABAP',
                    tiempo: 0,
                    tarifa: 650,
                    total: 0
                },
                {
                    factura: '',
                    concepto: 'CPI',
                    tiempo: 0,
                    tarifa: 1000,
                    total: 0
                }
            ];
            delete window.differenceTableData._resetPending;
        }
        
        console.log(`✅ Datos editables inicializados: ${index} elementos (soportes + proyectos)`);
        return;
    }
    
    // Para otros tipos de reporte (código existente)
    if (Array.isArray(currentReportData)) {
        currentReportData.forEach((row, index) => {
            // ✅ CORRECCIÓN: Buscar tarifaModulo primero, luego tarifa
            const tarifaValue = row.tarifaModulo || row.tarifa || row.editedTariff || 0;
            const tiempoValue = row.tiempo || row.editedTime || 0;

            editablePreviewData[index] = {
                ...row,
                editedTime: tiempoValue,
                editedTariff: tarifaValue,
                editedTotal: tiempoValue * tarifaValue,
                originalData: { ...row }
            };
        });
        
        console.log(`✅ ${Object.keys(editablePreviewData).length} filas inicializadas para edición`);
    }
}

/**
 * Mostrar vista previa vacía
 */
function showEmptyPreview(previewPanel, report) {
    previewPanel.innerHTML = `
        <div class="preview-header">
            <div class="preview-title"><i class="fa-solid fa-eye"></i> Vista Previa - ${report.name}</div>
            <div class="preview-info">Sin datos</div>
        </div>
        <div class="empty-preview">
            <div class="empty-preview-icon"><i class="fa-solid fa-chart-pie"></i></div>
            <div><strong>No hay datos disponibles</strong></div>
            <div>Verifique los filtros aplicados o el período seleccionado</div>
        </div>
    `;
    
    previewPanel.style.display = 'block';
    window.NotificationUtils.warning('No se encontraron datos para los filtros aplicados');
}

/**
 * Generar tabla editable
 */
function generateEditableTable(previewPanel, report) {
    let totalHours, totalAmount, recordCount;

    if (currentReportType === 'remanente') {
        // Calcular totales para remanente con proyectos
        totalHours = Object.values(editablePreviewData).reduce((sum, row) => {
            if (row.type === 'soporte') {
                return sum + (row.totalHoras || 0);
            } else if (row.type === 'project') {
                return sum + (row.totalHours || 0);
            }
            return sum;
        }, 0);
        totalAmount = Object.values(editablePreviewData).reduce((sum, row) => sum + (row.editedTotal || 0), 0);
        recordCount = Object.keys(editablePreviewData).length;
    } else {
        // Calcular totales para otros reportes
        totalHours = currentReportData.reduce((sum, row) => sum + row.tiempo, 0);
        totalAmount = Object.values(editablePreviewData).reduce((sum, row) => sum + row.editedTotal, 0);
        recordCount = currentReportData.length;
    }
    
    let tableHTML = '';
    
    if (currentReportType === 'remanente') {
        tableHTML = generateRemanenteTableWithProjects();
    } else {
        tableHTML = generateStandardTable(report);
    }
    
    previewPanel.innerHTML = `
        <div class="preview-header">
            <div class="preview-title"><i class="fa-solid fa-eye"></i> Vista Previa - ${report.name}</div>
            <div class="preview-info">
                ${recordCount} registros | 
                ${totalHours.toFixed(1)} horas | 
                $${totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                ${currentReportType === 'remanente' && currentReportData.hasProjects ? ' | <i class="fa-solid fa-folder"></i> Incluye Proyectos' : ''}
            </div>
        </div>

        <div class="warning-message">
            <strong><i class="fa-solid fa-pencil"></i> Vista Previa Editable:</strong> Haga clic en las celdas amarillas para modificar TIEMPO y TARIFA. 
            Los totales se recalculan automáticamente. <br>
            <strong><i class="fa-solid fa-chart-pie"></i> Estructura:</strong> ${report.structure.join(' | ')}
        </div>

        ${tableHTML}

        <div class="actions-row">
            <button class="btn btn-secondary" onclick="restoreOriginalValues()">
                <i class="fa-solid fa-rotate-left"></i> Restaurar Valores Originales
            </button>
            <button class="btn btn-primary" onclick="generateFinalReport()">
                <i class="fa-solid fa-file-excel"></i> Generar Reporte Excel Final
            </button>
        </div>
    `;
}

/**
 * Generar tabla estándar
 */
function generateStandardTable(report) {
    let tableHTML = '<table class="preview-table"><thead><tr>';
    
    // Generar headers según estructura del reporte
    report.structure.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    
    tableHTML += '</tr></thead><tbody>';
    
    // Generar filas
    Object.entries(editablePreviewData).forEach(([index, row]) => {
        tableHTML += '<tr>';
        
        report.structure.forEach(header => {
            let cellContent = '';
            let isEditable = report.editableFields.includes(header);
            
            switch (header) {
                case 'ID EMPRESA':
                    cellContent = row.idEmpresa || 'N/A';
                    break;
                case 'CONSULTOR':
                    cellContent = row.consultor || 'N/A';
                    break;
                case 'SOPORTE':
                    cellContent = row.soporte || 'N/A';
                    break;
                case 'ORIGEN':
                    const origenBadge = generarBadgeOrigen(row.origen || 'N/A');
                    cellContent = origenBadge;
                    break;
                case 'MÓDULO':
                    cellContent = row.modulo || 'N/A';
                    break;
                case 'TIEMPO':
                    cellContent = `<input type="number" class="editable-input" value="${row.editedTime}"
                                         step="0.1" min="0" max="24"
                                         onchange="updateRowCalculation(${index}, 'time', this.value)">`;
                    break;
                case 'TARIFA':
                    cellContent = `<input type="number" class="editable-input" value="${row.editedTariff}"
                                         step="50" min="100" max="2000"
                                         onchange="updateRowCalculation(${index}, 'tariff', this.value)">`;
                    break;
                case 'TOTAL':
                    cellContent = `<strong>$${row.editedTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>`;
                    break;
                default:
                    cellContent = 'N/A';
            }
            
            const cellClass = isEditable ? 'editable-cell' : '';
            tableHTML += `<td class="${cellClass}">${cellContent}</td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    // Fila de totales
    const totalHours = Object.values(editablePreviewData).reduce((sum, row) => sum + row.editedTime, 0);
    const totalAmount = Object.values(editablePreviewData).reduce((sum, row) => sum + row.editedTotal, 0);
    
    tableHTML += '<tr style="background: var(--gray-100); font-weight: bold;">';
    report.structure.forEach((header, index) => {
        if (index === 0) {
            tableHTML += '<td>TOTALES</td>';
        } else if (header === 'TIEMPO') {
            tableHTML += `<td>${totalHours.toFixed(1)} hrs</td>`;
        } else if (header === 'TOTAL') {
            tableHTML += `<td>$${totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>`;
        } else {
            tableHTML += '<td>-</td>';
        }
    });
    tableHTML += '</tr>';
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

/**
 * Generar tabla para reporte remanente (estructura dinámica por semanas) - VERSIÓN CORREGIDA
 */
function generateRemanenteTable() {
    console.log('📊 Generando tabla remanente con semanas dinámicas');
    
    // Obtener estructura de semanas del primer módulo (todos tienen la misma)
    const firstModule = Object.values(editablePreviewData)[0];
    if (!firstModule || !firstModule.monthStructure) {
        console.error('❌ No se encontró estructura de semanas');
        return '<p>Error: No se pudo determinar la estructura del mes</p>';
    }
    
    const weekStructure = firstModule.monthStructure;
    console.log(`📅 Generando tabla para ${weekStructure.totalWeeks} semanas`);
    
    let tableHTML = `
        <div style="margin-bottom: 1rem; padding: 1rem; background: var(--gray-100); border-radius: 8px; border-left: 4px solid var(--info-color);">
            <strong style="color: var(--info-color);"><i class="fa-solid fa-calendar"></i> Distribución del Mes:</strong> ${weekStructure.description}<br>
            <strong style="color: var(--info-color);"><i class="fa-solid fa-hashtag"></i> Total de Semanas:</strong> ${weekStructure.totalWeeks}
        </div>
        <table class="preview-table">
            <thead>
                <tr>
                    <th rowspan="2">Total de Horas</th>
    `;
    
    // Headers dinámicos para cada semana con rangos de fechas correspondientes
    const monthKey = document.getElementById('monthFilter')?.value;
    for (let i = 1; i <= weekStructure.totalWeeks; i++) {
        const daysInWeek = weekStructure.distribution[i - 1];
        let weekLabel = `SEMANA ${i} (${daysInWeek} días)`;
        if (monthKey) {
            try {
                const [year, month] = monthKey.split('-').map(Number);
                const MONTH_NAMES_ES = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ];
                const monthName = MONTH_NAMES_ES[month - 1];
                let startDay = 1;
                for (let k = 0; k < i - 1; k++) {
                    startDay += weekStructure.distribution[k];
                }
                const endDay = startDay + daysInWeek - 1;
                weekLabel = `SEMANA ${i}<br><span style="font-size:0.8em;font-weight:normal;opacity:0.9;">del ${startDay} al ${endDay} de ${monthName}</span>`;
            } catch (e) {
                console.error(e);
            }
        }
        tableHTML += `<th colspan="4">${weekLabel}</th>`;
    }
    
    tableHTML += `
                </tr>
                <tr>
    `;
    
    // Sub-headers para cada semana
    for (let i = 1; i <= weekStructure.totalWeeks; i++) {
        tableHTML += `
            <th>MODULO</th>
            <th>TIEMPO</th>
            <th>TARIFA</th>
            <th>TOTAL</th>
        `;
    }
    
    tableHTML += `
                </tr>
            </thead>
            <tbody>
    `;
    
    // Filas de datos
    Object.entries(editablePreviewData).forEach(([index, row]) => {
        tableHTML += `<tr>
            <td><strong>${row.totalHoras.toFixed(1)}</strong></td>
        `;
        
        // Generar columnas para cada semana dinámicamente
        for (let semana = 1; semana <= weekStructure.totalWeeks; semana++) {
            const semanaKey = `semana${semana}`;
            const semanaData = row[semanaKey];
            
            if (semanaData) {
                tableHTML += `
                    <td>${row.modulo}</td>
                    <td class="editable-cell">
                        <input type="number" class="editable-input" value="${semanaData.tiempo}" 
                               step="0.1" min="0" max="40" 
                               onchange="updateRemanenteCalculation(${index}, ${semana}, 'time', this.value)">
                    </td>
                    <td class="editable-cell">
                        <input type="number" class="editable-input" value="${semanaData.tarifa}" 
                               step="50" min="100" max="2000" 
                               onchange="updateRemanenteCalculation(${index}, ${semana}, 'tariff', this.value)">
                    </td>
                    <td><strong>$${semanaData.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong></td>
                `;
            } else {
                // Si no existe la semana (caso excepcional), mostrar vacío
                tableHTML += `
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                `;
            }
        }
        
        tableHTML += '</tr>';
    });
    
    // Fila de totales
    tableHTML += '<tr style="background: var(--gray-100); font-weight: bold;"><td>TOTALES</td>';
    
    for (let semana = 1; semana <= weekStructure.totalWeeks; semana++) {
        const semanaTotalHours = Object.values(editablePreviewData)
            .reduce((sum, row) => {
                const semanaData = row[`semana${semana}`];
                return sum + (semanaData ? parseFloat(semanaData.tiempo || 0) : 0);
            }, 0);
            
        const semanaTotalAmount = Object.values(editablePreviewData)
            .reduce((sum, row) => {
                const semanaData = row[`semana${semana}`];
                return sum + (semanaData ? parseFloat(semanaData.total || 0) : 0);
            }, 0);
        
        tableHTML += `
            <td>TOTAL</td>
            <td>${semanaTotalHours.toFixed(1)}</td>
            <td>-</td>
            <td>$${semanaTotalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
        `;
    }
    
    tableHTML += '</tr></tbody></table>';
    return tableHTML;
}

/**
 * Generar tabla remanente con sección de proyectos incluida
 */
function generateRemanenteTableWithProjects() {
    console.log('📊 Generando tabla remanente con proyectos y diferencias...');
    
    let tableHTML = '';
    let totalSoporteHours = 0;
    
    // 1. SECCIÓN DE SOPORTES (solo si hay soportes)
    if (currentReportData.soportes && currentReportData.soportes.length > 0) {
        console.log('📞 Generando sección de soportes');
        
        // Filtrar solo datos de soportes para la tabla existente
        const soporteEditableData = {};
        let soporteIndex = 0;
        
        Object.entries(editablePreviewData).forEach(([key, value]) => {
            if (value.type === 'soporte') {
                soporteEditableData[soporteIndex] = value;
                soporteIndex++;
            }
        });
        
        // Sumar horas de soporte
        Object.values(soporteEditableData).forEach(sop => {
            totalSoporteHours += parseFloat(sop.totalHoras || 0);
        });
        
        // Temporalmente usar datos de soporte para función existente
        const originalEditableData = editablePreviewData;
        editablePreviewData = soporteEditableData;
        
        tableHTML += generateRemanenteTable();
        
        // Restaurar datos originales
        editablePreviewData = originalEditableData;
    } else {
        console.log('📞 No hay soportes, omitiendo sección');
        tableHTML += `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--gray-100); border-radius: 8px; text-align: center; color: var(--gray-500);">
                <i class="fa-solid fa-headset"></i> No hay datos de soporte para este cliente y período
            </div>
        `;
    }
    
    // 2. SECCIÓN DE PROYECTOS (si hay proyectos)
    const hasProjectData = Object.keys(editablePreviewData).some(key => editablePreviewData[key].type === 'project');
    console.log('🔍 Verificando proyectos:', { hasProjects: currentReportData.hasProjects, hasProjectData: hasProjectData });

    if (hasProjectData) {
        console.log('📋 Generando sección de proyectos');
        tableHTML += generateProjectsSection();
    } else {
        console.log('📋 No hay proyectos para mostrar - hasProjectData:', hasProjectData);
        if (currentReportData.projectSelection === 'ninguno') {
            tableHTML += `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: 8px; text-align: center; color: var(--gray-500);">
                    <i class="fa-solid fa-folder"></i> Proyectos excluidos por selección de filtros
                </div>
            `;
        }
    }
    
    // 3. SECCIÓN DE DIFERENCIA DE HORAS (solo si sobrepasa 150 horas)
    console.log('⏱️ Horas totales para validar diferencia:', totalSoporteHours);
    if (totalSoporteHours > 150) {
        const standardHours = 150;
        const diffHours = Math.max(0, totalSoporteHours - standardHours);
        const grandTotalAmount = (window.differenceTableData || []).reduce((sum, r) => sum + (r.total || 0), 0);
        
        console.log('📊 Generando sección de diferencia de horas:', { diffHours, grandTotalAmount });
        tableHTML += generateDifferenceSectionHTML(diffHours, grandTotalAmount);
    } else {
        console.log('📊 Omitiendo diferencia de horas ya que no supera las 150 horas');
    }
    
    // Si no hay nada que mostrar
    if (!tableHTML.includes('<table') && !tableHTML.includes('📋') && !tableHTML.includes('📞')) {
        tableHTML = `
            <div style="padding: 2rem; text-align: center; color: #64748b;">
                <h3><i class="fa-solid fa-inbox"></i> Sin Datos</h3>
                <p>No se encontraron reportes para los filtros seleccionados.</p>
            </div>
        `;
    }
    
    return tableHTML;
}

/**
 * Generar HTML de la sección de diferencia de horas
 */
function generateDifferenceSectionHTML(diffHours, grandTotalAmount) {
    if (!window.differenceTableData) {
        window.differenceTableData = [];
    }
    
    let html = `
        <div style="margin-top: 2rem; padding: 1rem; background: var(--gray-50); border-radius: 8px; border-left: 4px solid var(--warning-color, #f59e0b);">
            <h4 style="margin: 0 0 0.5rem 0; color: #b45309; font-size: 1.125rem;">
                <i class="fa-solid fa-calculator"></i> DIFERENCIA DE HORAS
            </h4>
            <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                El total de horas reportadas excede el estándar de 150 horas. Especifique el desglose a continuación:
            </p>
        </div>
        
        <table class="preview-table diff-table" style="margin-top: 1rem;">
            <thead>
                <tr style="background: var(--gray-100);">
                    <th style="width: 20%;">Factura/Referencia</th>
                    <th style="width: 35%;">Concepto</th>
                    <th style="width: 15%;">Horas/Tiempo</th>
                    <th style="width: 15%;">Tarifa</th>
                    <th style="width: 15%;">Total</th>
                    <th style="width: 10%;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                <!-- Fila de Diferencia calculada (Informativa/Lectura) -->
                <tr style="background: #fffbeb; font-weight: bold;">
                    <td>-</td>
                    <td style="color: #b45309;">Diferencia para OC</td>
                    <td style="color: #b45309;">${diffHours.toFixed(1)} hrs</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
                
                <!-- Filas editables por el administrador -->
                ${window.differenceTableData.map((row, index) => `
                    <tr>
                        <td class="editable-cell">
                            <input type="text" class="editable-input" value="${row.factura || ''}" 
                                   onchange="updateDifferenceTableCalculation(${index}, 'factura', this.value)" 
                                   placeholder="Ej. FACTURA 2" style="width: 100%; border: none; background: transparent; text-align: center;">
                        </td>
                        <td class="editable-cell">
                            <input type="text" class="editable-input" value="${row.concepto || ''}" 
                                   onchange="updateDifferenceTableCalculation(${index}, 'concepto', this.value)" 
                                   placeholder="Concepto" style="width: 100%; border: none; background: transparent;">
                        </td>
                        <td class="editable-cell">
                            <input type="number" class="editable-input" value="${row.tiempo}" step="0.1" min="0"
                                   onchange="updateDifferenceTableCalculation(${index}, 'tiempo', this.value)" 
                                   style="width: 100%; border: none; background: transparent; text-align: center;">
                        </td>
                        <td class="editable-cell">
                            <input type="number" class="editable-input" value="${row.tarifa}" step="50" min="0"
                                   onchange="updateDifferenceTableCalculation(${index}, 'tarifa', this.value)" 
                                   style="width: 100%; border: none; background: transparent; text-align: center;">
                        </td>
                        <td id="diff-row-total-${index}">
                            <strong>$${(row.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deleteDifferenceRow(${index})" title="Eliminar fila" style="padding: 2px 6px;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Fila de Totales de Diferencia -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding: 0.5rem 0;">
            <button class="btn btn-secondary" onclick="addDifferenceRow()" style="padding: 6px 12px; font-size: 0.85rem;">
                <i class="fa-solid fa-plus"></i> Agregar Fila de Diferencia
            </button>
            <div style="display: flex; align-items: center; gap: 15px; background: #e2f0d9; padding: 10px 20px; border-radius: 8px; border: 1.5px solid #a9d08e; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <span style="font-weight: bold; color: #375623; font-size: 0.95rem;">Orden de Compra Pendiente:</span>
                <span id="diff-table-grand-total" style="font-weight: 800; color: #375623; font-size: 1.2rem;">
                    $${grandTotalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                </span>
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Extraer datos modificados por el usuario desde los inputs de la tabla (Soportes y Diferencia)
 */
function extraerDatosRemanente() {
    console.log('🔧 Sincronizando datos de inputs antes de re-renderizar...');
    
    // 1. Extraer datos de la tabla de soportes
    const supportTable = document.querySelector('#reportPreviewPanel table:not(.projects-table):not(.diff-table)');
    if (supportTable && window.editablePreviewData) {
        const rows = Array.from(supportTable.querySelectorAll('tbody tr'));
        
        // Mapeamos los índices de editablePreviewData que corresponden a 'soporte'
        const soporteKeys = Object.keys(window.editablePreviewData).filter(key => window.editablePreviewData[key].type === 'soporte');
        
        rows.forEach((rowEl, rowIndex) => {
            const key = soporteKeys[rowIndex];
            if (!key || !window.editablePreviewData[key]) return;
            
            const rowData = window.editablePreviewData[key];
            const inputs = Array.from(rowEl.querySelectorAll('input.editable-input'));
            
            let inputIdx = 0;
            const weekStructure = rowData.monthStructure;
            
            for (let sem = 1; sem <= weekStructure.totalWeeks; sem++) {
                const tiempoInput = inputs[inputIdx++];
                const tarifaInput = inputs[inputIdx++];
                
                if (tiempoInput && tarifaInput) {
                    const tiempo = parseFloat(tiempoInput.value) || 0;
                    const tarifa = parseFloat(tarifaInput.value) || 0;
                    
                    if (rowData[`semana${sem}`]) {
                        rowData[`semana${sem}`].tiempo = tiempo;
                        rowData[`semana${sem}`].tarifa = tarifa;
                        rowData[`semana${sem}`].total = tiempo * tarifa;
                    }
                }
            }
            
            // Recalcular totalHoras del soporte
            let totalHoras = 0;
            for (let sem = 1; sem <= weekStructure.totalWeeks; sem++) {
                if (rowData[`semana${sem}`]) {
                    totalHoras += rowData[`semana${sem}`].tiempo;
                }
            }
            rowData.totalHoras = totalHoras;
        });
    }
    
    // 2. Extraer datos de la tabla de diferencia
    const diffTable = document.querySelector('.diff-table');
    if (diffTable && window.differenceTableData) {
        const rows = Array.from(diffTable.querySelectorAll('tbody tr'));
        // La primera fila es de lectura ("Diferencia para OC"), nos saltamos esa
        const dataRows = rows.slice(1);
        
        dataRows.forEach((rowEl, index) => {
            if (!window.differenceTableData[index]) return;
            
            const inputs = Array.from(rowEl.querySelectorAll('input.editable-input'));
            if (inputs[0]) window.differenceTableData[index].factura = inputs[0].value;
            if (inputs[1]) window.differenceTableData[index].concepto = inputs[1].value;
            if (inputs[2]) window.differenceTableData[index].tiempo = parseFloat(inputs[2].value) || 0;
            if (inputs[3]) window.differenceTableData[index].tarifa = parseFloat(inputs[3].value) || 0;
            
            window.differenceTableData[index].total = 
                window.differenceTableData[index].tiempo * window.differenceTableData[index].tarifa;
        });
    }
}

/**
 * Actualizar cálculos en vivo de la fila de diferencia modificada por el usuario
 */
function updateDifferenceTableCalculation(index, field, value) {
    if (!window.differenceTableData || !window.differenceTableData[index]) return;
    
    const row = window.differenceTableData[index];
    
    if (field === 'factura') {
        row.factura = value;
    } else if (field === 'concepto') {
        row.concepto = value;
    } else if (field === 'tiempo') {
        row.tiempo = parseFloat(value) || 0;
    } else if (field === 'tarifa') {
        row.tarifa = parseFloat(value) || 0;
    }
    
    row.total = row.tiempo * row.tarifa;
    
    // Actualizar celda total específica
    const totalCell = document.getElementById(`diff-row-total-${index}`);
    if (totalCell) {
        totalCell.innerHTML = `<strong>$${row.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>`;
    }
    
    // Actualizar gran total
    const grandTotalAmount = window.differenceTableData.reduce((sum, r) => sum + (r.total || 0), 0);
    const grandTotalCell = document.getElementById('diff-table-grand-total');
    if (grandTotalCell) {
        grandTotalCell.textContent = `$${grandTotalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    }
}

/**
 * Agregar una nueva fila a la tabla de diferencias
 */
function addDifferenceRow() {
    extraerDatosRemanente();
    
    if (!window.differenceTableData) {
        window.differenceTableData = [];
    }
    
    window.differenceTableData.push({
        factura: '',
        concepto: 'Nuevo Concepto',
        tiempo: 0,
        tarifa: 850,
        total: 0
    });
    
    // Re-renderizar la vista previa
    const previewPanel = document.getElementById('reportPreviewPanel');
    const report = ARVIC_REPORTS[currentReportType];
    generateEditableTable(previewPanel, report);
}

/**
 * Eliminar una fila específica de la tabla de diferencias
 */
function deleteDifferenceRow(index) {
    extraerDatosRemanente();
    
    if (window.differenceTableData && window.differenceTableData[index]) {
        window.differenceTableData.splice(index, 1);
    }
    
    // Re-renderizar la vista previa
    const previewPanel = document.getElementById('reportPreviewPanel');
    const report = ARVIC_REPORTS[currentReportType];
    generateEditableTable(previewPanel, report);
}


/**
 * Generar sección de proyectos para la tabla remanente
 */
function generateProjectsSection() {
    console.log('📋 Generando sección de proyectos');
    
    let projectsHTML = `
        <div style="margin-top: 2rem; padding: 1rem; background: var(--gray-50); border-radius: 8px; border-left: 4px solid var(--primary-light);">
            <h4 style="margin: 0 0 1rem 0; color: var(--primary-dark); font-size: 1.125rem;">
                <i class="fa-solid fa-folder"></i> PROYECTOS DEL CLIENTE
            </h4>
        </div>
        <table class="preview-table projects-table">
            <thead>
                <tr style="background: var(--gray-100);">
                    <th>Proyecto</th>
                    <th>Módulo</th>
                    <th>Total Horas</th>
                    <th>Tarifa</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Agrupar proyectos por nombre
    const projectGroups = {};
    Object.entries(editablePreviewData).forEach(([index, row]) => {
        if (row.type === 'project') {
            if (!projectGroups[row.projectName]) {
                projectGroups[row.projectName] = [];
            }
            projectGroups[row.projectName].push({ index: parseInt(index), data: row });
        }
    });
    
    // Generar filas por proyecto
    Object.entries(projectGroups).forEach(([projectName, modules]) => {
        // Fila de encabezado del proyecto
        projectsHTML += `
            <tr style="background: var(--gray-50); font-weight: bold;">
                <td colspan="5" style="color: #1d4ed8; font-size: 1rem;">
                    <i class="fa-solid fa-bullseye"></i> ${projectName}
                </td>
            </tr>
        `;
        
        // Filas de módulos del proyecto
        modules.forEach(({ index, data }) => {
            projectsHTML += `
                <tr data-project-row="${index}">
                    <td style="padding-left: 2rem; color: #64748b;">└─ ${data.projectName}</td>
                    <td><strong>${data.moduleName}</strong></td>
                    <td class="editable-cell" 
                        onclick="editProjectCell(${index}, 'time')"
                        title="Clic para editar horas">
                        ${data.editedTime || data.totalHours || 0}
                    </td>
                    <td class="editable-cell" 
                        onclick="editProjectCell(${index}, 'tariff')"
                        title="Clic para editar tarifa">
                        $${data.editedTariff || data.tarifa || 0}
                    </td>
                    <td><strong>$${(data.editedTotal || data.total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong></td>
                </tr>
            `;
        });
    });
    
    projectsHTML += `
            </tbody>
        </table>
    `;
    
    return projectsHTML;
}

/**
 * Editar celda de proyecto en la vista previa
 */
function editProjectCell(rowIndex, field) {
    console.log(`✏️ Editando proyecto fila ${rowIndex}, campo ${field}`);
    
    const row = editablePreviewData[rowIndex];
    if (!row || row.type !== 'project') {
        console.error('❌ Fila de proyecto no encontrada:', rowIndex);
        return;
    }
    
    // Obtener valor actual
    let currentValue;
    if (field === 'time') {
        currentValue = row.editedTime || row.totalHours || 0;
    } else if (field === 'tariff') {
        currentValue = row.editedTariff || row.tarifa || 0;
    } else {
        console.error('❌ Campo no válido:', field);
        return;
    }
    
    // Solicitar nuevo valor
    const fieldName = field === 'time' ? 'Horas' : 'Tarifa';
    const newValue = prompt(`Editar ${fieldName} para ${row.moduleName}:`, currentValue);
    
    if (newValue === null) return; // Usuario canceló
    
    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0) {
        alert('❌ Por favor ingrese un número válido mayor o igual a 0');
        return;
    }
    
    // Actualizar datos
    if (field === 'time') {
        row.editedTime = numValue;
        row.totalHours = numValue; // Mantener sincronizado
    } else if (field === 'tariff') {
        row.editedTariff = numValue;
    }
    
    // Recalcular total
    row.editedTotal = (row.editedTime || row.totalHours || 0) * (row.editedTariff || row.tarifa || 0);
    
    // Actualizar display
    updateProjectRowDisplay(rowIndex);
    updateGeneralTotals();
    
    console.log(`📊 Proyecto actualizado: ${row.moduleName} = ${row.editedTime || row.totalHours} hrs x $${row.editedTariff || row.tarifa} = $${row.editedTotal.toFixed(2)}`);
}

/**
 * Actualizar display de fila de proyecto después de edición
 */
function updateProjectRowDisplay(rowIndex) {
    const row = editablePreviewData[rowIndex];
    if (!row || row.type !== 'project') return;
    
    // Buscar la fila en la tabla
    const projectRow = document.querySelector(`[data-project-row="${rowIndex}"]`);
    if (!projectRow) {
        console.error('❌ No se encontró la fila del proyecto:', rowIndex);
        return;
    }
    
    const cells = projectRow.querySelectorAll('td');
    
    // Actualizar celda de horas (índice 2)
    if (cells[2]) {
        cells[2].textContent = row.editedTime || row.totalHours || 0;
    }
    
    // Actualizar celda de tarifa (índice 3)
    if (cells[3]) {
        cells[3].textContent = `$${row.editedTariff || row.tarifa || 0}`;
    }
    
    // Actualizar celda de total (índice 4)
    if (cells[4]) {
        cells[4].innerHTML = `<strong>$${row.editedTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>`;
    }
}

/**
 * Actualizar cálculos cuando se edita una celda (tabla estándar)
 */
function updateRowCalculation(rowIndex, field, value) {
    const numValue = parseFloat(value) || 0;
    
    if (!editablePreviewData[rowIndex]) return;
    
    // Actualizar valor editado
    if (field === 'time') {
        editablePreviewData[rowIndex].editedTime = numValue;
    } else if (field === 'tariff') {
        editablePreviewData[rowIndex].editedTariff = numValue;
    }
    
    // Recalcular total
    editablePreviewData[rowIndex].editedTotal = 
        editablePreviewData[rowIndex].editedTime * editablePreviewData[rowIndex].editedTariff;
    
    // Actualizar display del total en la fila
    updateRowTotalDisplay(rowIndex);
    
    // Actualizar totales generales
    updateGeneralTotals();
    
    console.log('💰 Fila', rowIndex, 'actualizada:', 
               editablePreviewData[rowIndex].editedTime, 'hrs x $', 
               editablePreviewData[rowIndex].editedTariff, '= $', 
               editablePreviewData[rowIndex].editedTotal.toFixed(2));
}

/**
 * Actualizar cálculos para reporte remanente (versión corregida para 4 o 5 semanas)
 */
function updateRemanenteCalculation(rowIndex, semana, field, value) {
    const numValue = parseFloat(value) || 0;
    const semanaKey = `semana${semana}`;
    
    if (!editablePreviewData[rowIndex] || !editablePreviewData[rowIndex][semanaKey]) {
        console.error(`❌ No se encontró datos para fila ${rowIndex}, ${semanaKey}`);
        return;
    }
    
    // Actualizar valor editado
    if (field === 'time') {
        editablePreviewData[rowIndex][semanaKey].tiempo = numValue;
    } else if (field === 'tariff') {
        editablePreviewData[rowIndex][semanaKey].tarifa = numValue;
    }
    
    // Recalcular total de la semana
    editablePreviewData[rowIndex][semanaKey].total = 
        editablePreviewData[rowIndex][semanaKey].tiempo * editablePreviewData[rowIndex][semanaKey].tarifa;
    
    // ✅ NUEVO: Recalcular total considerando todas las semanas dinámicamente
    const weekStructure = editablePreviewData[rowIndex].monthStructure;
    let totalHoras = 0;
    
    for (let i = 1; i <= weekStructure.totalWeeks; i++) {
        const weekData = editablePreviewData[rowIndex][`semana${i}`];
        if (weekData) {
            totalHoras += parseFloat(weekData.tiempo || 0);
        }
    }
    
    editablePreviewData[rowIndex].totalHoras = totalHoras;
    
    // Actualizar displays
    updateRemanenteRowDisplay(rowIndex, semana);
    updateGeneralTotals();
    
    console.log(`📊 Remanente fila ${rowIndex} semana ${semana} actualizada:`, 
               editablePreviewData[rowIndex][semanaKey].tiempo, 'hrs x $', 
               editablePreviewData[rowIndex][semanaKey].tarifa, '= $', 
               editablePreviewData[rowIndex][semanaKey].total.toFixed(2));
}

/**
 * Actualizar display del total en una fila específica
 */
function updateRowTotalDisplay(rowIndex) {
    const table = document.querySelector('.preview-table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    if (!rows[rowIndex]) return;
    
    const cells = rows[rowIndex].querySelectorAll('td');
    const totalCell = cells[cells.length - 1]; // Última columna es TOTAL
    
    if (totalCell) {
        const total = editablePreviewData[rowIndex].editedTotal;
        totalCell.innerHTML = `<strong>$${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>`;
    }
}


/**
 * Actualizar display para fila de remanente
 */
function updateRemanenteRowDisplay(rowIndex, semana) {
    const table = document.querySelector('.preview-table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    if (!rows[rowIndex]) return;
    
    const cells = rows[rowIndex].querySelectorAll('td');
    
    // Actualizar total de horas (primera celda)
    if (cells[0]) {
        cells[0].innerHTML = `<strong>${editablePreviewData[rowIndex].totalHoras.toFixed(1)}</strong>`;
    }
    
    // Actualizar total de la semana específica
    const semanaStartCol = 1 + ((semana - 1) * 4); // Cada semana tiene 4 columnas
    const totalCol = semanaStartCol + 3; // La 4ta columna de cada semana es el total
    
    if (cells[totalCol]) {
        const total = editablePreviewData[rowIndex][`semana${semana}`].total;
        cells[totalCol].innerHTML = `<strong>$${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>`;
    }
}

/**
 * Actualizar totales generales en el header
 */
function updateGeneralTotals() {
    const previewInfo = document.querySelector('.preview-info');
    if (!previewInfo) return;
    
    let totalHours, totalAmount;
    
        if (currentReportType === 'remanente') {
            // Calcular totales combinados de soportes y proyectos
            totalHours = Object.values(editablePreviewData).reduce((sum, row) => {
                if (row.type === 'soporte') {
                    return sum + (row.totalHoras || 0);
                } else if (row.type === 'project') {
                    return sum + (row.editedTime || row.totalHours || 0);
                }
                return sum;
            }, 0);
            
            totalAmount = Object.values(editablePreviewData).reduce((sum, row) => {
                return sum + (row.editedTotal || 0);
            }, 0);
        } else { 
        // Para reportes estándar
        totalHours = Object.values(editablePreviewData).reduce((sum, row) => sum + row.editedTime, 0);
        totalAmount = Object.values(editablePreviewData).reduce((sum, row) => sum + row.editedTotal, 0);
    }
    
    previewInfo.innerHTML = `
        ${Object.keys(editablePreviewData).length} registros | 
        ${totalHours.toFixed(1)} horas | 
        $${totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}
    `;
    
    // Actualizar fila de totales en tabla estándar
    if (currentReportType !== 'remanente') {
        const table = document.querySelector('.preview-table');
        const totalRow = table?.querySelector('tbody tr:last-child');
        
        if (totalRow) {
            const cells = totalRow.querySelectorAll('td');
            const report = ARVIC_REPORTS[currentReportType];
            
            report.structure.forEach((header, index) => {
                if (header === 'TIEMPO') {
                    cells[index].innerHTML = `${totalHours.toFixed(1)} hrs`;
                } else if (header === 'TOTAL') {
                    cells[index].innerHTML = `$${totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
                }
            });
        }
    }
}

/**
 * Restaurar valores originales
 */
function restoreOriginalValues() {
    if (!confirm('¿Está seguro de restaurar todos los valores originales? Se perderán los cambios realizados.')) {
        return;
    }
    
    console.log('↩️ Restaurando valores originales...');
    
    // Reinicializar datos editables con valores originales
    initializeEditableData();
    
    // Regenerar tabla
    const previewPanel = document.getElementById('reportPreviewPanel');
    const report = ARVIC_REPORTS[currentReportType];
    generateEditableTable(previewPanel, report);
    
    window.NotificationUtils.success('Valores originales restaurados');
}

/**
 * Generar reporte Excel final con formato específico según el tipo
 */
function generateFinalReport() {
    if (!currentReportType || !editablePreviewData || Object.keys(editablePreviewData).length === 0) {
        window.NotificationUtils.error('No hay datos para generar el reporte Excel');
        return;
    }
    
    console.log('📊 Generando Excel para:', currentReportType);
    
    try {
        const report = ARVIC_REPORTS[currentReportType];
        
        switch (currentReportType) {
            case 'pago-consultor-general':
                generatePagoGeneralExcel();
                break;
            case 'pago-consultor-especifico':
                generatePagoConsultorExcel();
                break;
            case 'cliente-soporte':
                generateClienteSoporteExcel();
                break;
            case 'remanente':
                generateRemanenteExcel();
                break;
            case 'proyecto-general':
                generateProyectoGeneralExcel();
                break;
            case 'proyecto-cliente':
                generateProyectoClienteExcel();
                break;
            case 'proyecto-consultor':
                generateProyectoConsultorExcel();
                break;
            default:
                throw new Error(`Tipo de reporte no implementado: ${currentReportType}`);
        }
        
    } catch (error) {
        console.error('❌ Error generando Excel:', error);
        window.NotificationUtils.error('Error al generar Excel: ' + error.message);
    }
}

/**
 * Generar Excel para Pago Consultor General con todos los consultores y sus soportes
 */

function generatePagoGeneralExcel() {
    console.log('Generando Excel - Pago Consultor General');
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    // Fila 1: Título fusionado
    wsData.push(['', '', '', '', 'RESUMEN DE PAGO A CONSULTOR', '', '', '']);
    
    // Fila 2: Espacio
    wsData.push(['', '', '', '', '', '', '', '']);
    
    // Fila 3: Headers
    wsData.push(['ID EMPRESA', 'CONSULTOR', 'SOPORTE', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL']);
    
    // Filas de datos
    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            row.idEmpresa || 'N/A',
            row.consultor || 'N/A',
            row.soporte || 'N/A',
            row.origen || 'N/A',                    // ✅ NUEVO
            row.modulo || 'N/A',                   // ✅ NUEVO
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    // Fila de totales
    wsData.push(['', '', '', '', 'TOTALES', totalHours, '', totalAmount]);
    
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Aplicar estilos
    applyExcelStyling(ws, wsData, 'general');
    
    // Configurar merge para título (ajustado por nuevas columnas)
    ws['!merges'] = [{ s: { r: 0, c: 4 }, e: { r: 0, c: 7 } }];
    
    // Añadir worksheet
    XLSX.utils.book_append_sheet(wb, ws, 'Pago General');
    
    // Generar archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Pago_Consultor_General_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    console.log('Excel generado:', fileName);
    saveToReportHistory(fileName, 'pago-consultor-general', totalHours, totalAmount);
}
/**
 * Generar Excel para Pago Consultor Específico por Soporte con su/sus soporte/s
 */
function generatePagoConsultorExcel() {
    console.log('Generando Excel - Pago Consultor Específico');
    
    const consultantName = document.getElementById('consultantFilter')?.selectedOptions[0]?.text || 'Consultor';
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    // Fila 1: Título
    wsData.push(['', '', '', '', 'PAGO A CONSULTOR', '', '', '']);
    
    // Fila 2: Información del consultor
    wsData.push(['', `CONSULTOR: ${consultantName}`, '', '', '', '', '', '']);
    
    // Fila 3: Espacio
    wsData.push(['', '', '', '', '', '', '', '']);
    
    // Fila 4: Headers 
    wsData.push(['ID EMPRESA', 'CONSULTOR', 'SOPORTE', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL']);

    // Datos y totales
    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            row.idEmpresa || 'N/A',
            row.consultor || 'N/A',
            row.soporte || 'N/A',
            row.origen || 'N/A',                    // ✅ NUEVO
            row.detalle || 'N/A',                   // ✅ NUEVO
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    wsData.push(['', '', '', '', 'TOTALES', totalHours, '', totalAmount]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'consultor');
    
    ws['!merges'] = [
        { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } }, // Título (ajustado)
        { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } }  // Nombre consultor
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "PAGO CONSULTOR");
    
    const fileName = generateFileName('PagoConsultor');
    XLSX.writeFile(wb, fileName);
    saveToReportHistory(fileName, 'pago-consultor-especifico', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel generado: ${fileName}`);

    resetReportGenerator();
}

/**
 * Generar Excel para Cliente Soporte (vista simplificada)
 */
function generateClienteSoporteExcel() {
    console.log('Generando Excel - Cliente Soporte');
    
    const clientName = document.getElementById('clientFilter')?.selectedOptions[0]?.text || 'Cliente';
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    // Fila 1: Información del cliente
    wsData.push(['', `Cliente: ${clientName}`, '', '', '']);
    
    // Fila 2: Espacio
    wsData.push(['', '', '', '', '']);
    
    // Fila 3: Headers (estructura simplificada - sin ID Empresa ni Consultor)
    wsData.push(['SOPORTE', 'MÓDULO', 'TIEMPO', 'TARIFA MÓDULO', 'TOTAL']);

    // Datos
    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            row.soporte || 'N/A',
            window.convertModuleToAcronym(row.modulo || 'N/A'),
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    wsData.push(['', 'TOTALES', totalHours, '', totalAmount]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'cliente');
    
    ws['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 3 } }]; // Cliente info
    
    XLSX.utils.book_append_sheet(wb, ws, "CLIENTE SOPORTE");
    
    const fileName = generateFileName('ClienteSoporte');
    XLSX.writeFile(wb, fileName);
    saveToReportHistory(fileName, 'cliente-soporte', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel generado: ${fileName}`);

    resetReportGenerator();
}

/**
 * Generar Excel para Reporte Remanente (estructura dinámica por semanas) - VERSIÓN CORREGIDA CON PROYECTOS
 */
function generateRemanenteExcel() {
    console.log('📊 Generando Excel - Reporte Remanente con soporte específico');
    
    // Sincronizar inputs del usuario
    extraerDatosRemanente();
    
    const clientName = document.getElementById('clientFilter')?.selectedOptions[0]?.text || 'Cliente';
    const supportId = document.getElementById('supportTypeFilter')?.value;
    const supportName = document.getElementById('supportTypeFilter')?.selectedOptions[0]?.text || 'N/A';
    const monthName = document.getElementById('monthFilter')?.selectedOptions[0]?.text || 'Mes';
    
    // Verificar que hay datos editables
    if (!editablePreviewData || Object.keys(editablePreviewData).length === 0) {
        window.NotificationUtils.error('No hay datos para exportar');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    // Separar datos de soportes y proyectos
    const soporteData = Object.values(editablePreviewData).filter(row => row.type === 'soporte');
    const projectData = Object.values(editablePreviewData).filter(row => row.type === 'project');
    
    console.log(`📊 Exportando: ${soporteData.length} soportes, ${projectData.length} proyectos`);
    
    // === SECCIÓN DE SOPORTES (si hay) ===
    if (soporteData.length > 0) {
        // Obtener estructura de semanas del primer soporte
        const firstSupport = soporteData[0];
        const weekStructure = firstSupport.monthStructure;
        
        if (!weekStructure) {
            window.NotificationUtils.error('Error: estructura de semanas no encontrada');
            return;
        }
        
        console.log(`📅 Excel para ${weekStructure.totalWeeks} semanas: ${weekStructure.description}`);
        
        // Título de soportes
        const titleRowLength = 1 + (weekStructure.totalWeeks * 4);
        const titleRow = Array(titleRowLength).fill('');
        titleRow[Math.floor(titleRowLength / 2)] = 'REPORTE REMANENTE - SOPORTES';
        wsData.push(titleRow);
        
        // Información
        const infoRow = Array(titleRowLength).fill('');
        infoRow[1] = `Cliente: ${clientName}`;
        infoRow[4] = `Soporte: ${supportName}`;
        infoRow[7] = `Mes: ${monthName}`;
        infoRow[10] = `Semanas: ${weekStructure.totalWeeks}`;
        wsData.push(infoRow);
        
        // Espacio
        wsData.push(Array(titleRowLength).fill(''));
        
        // Headers dinámicos
        const headerRow1 = ['Total de Horas'];
        const headerRow2 = [''];
        
        for (let i = 1; i <= weekStructure.totalWeeks; i++) {
            const daysInWeek = weekStructure.distribution[i - 1] || 7;
            headerRow1.push(`SEMANA ${i} (${daysInWeek}d)`, '', '', '');
            headerRow2.push('MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL');
        }
        
        wsData.push(headerRow1);
        wsData.push(headerRow2);
        
        // Datos de soportes por módulo y semana
        let grandTotalHours = 0;
        let grandTotalAmount = 0;
        
        soporteData.forEach(row => {
            const totalHoras = row.totalHoras || 0;
            const dataRow = [totalHoras.toFixed ? totalHoras.toFixed(1) : totalHoras];
            
            for (let semana = 1; semana <= weekStructure.totalWeeks; semana++) {
                const semanaData = row[`semana${semana}`];
                
                if (semanaData && typeof semanaData === 'object') {
                    dataRow.push(
                        window.convertModuleToAcronym(row.modulo) || '-',
                        parseFloat(semanaData.tiempo || 0),
                        parseFloat(semanaData.tarifa || 0),
                        parseFloat(semanaData.total || 0)
                    );
                    grandTotalAmount += parseFloat(semanaData.total || 0);
                } else {
                    dataRow.push('-', 0, 0, 0);
                }
            }
            
            wsData.push(dataRow);
            grandTotalHours += totalHoras;
        });
        
        // Totales de soportes
        const totalsRow = [grandTotalHours.toFixed ? grandTotalHours.toFixed(1) : grandTotalHours];
        
        for (let semana = 1; semana <= weekStructure.totalWeeks; semana++) {
            const semanaTotalHours = soporteData.reduce((sum, row) => {
                const semanaData = row[`semana${semana}`];
                return sum + (semanaData ? parseFloat(semanaData.tiempo || 0) : 0);
            }, 0);
            
            const semanaTotalAmount = soporteData.reduce((sum, row) => {
                const semanaData = row[`semana${semana}`];
                return sum + (semanaData ? parseFloat(semanaData.total || 0) : 0);
            }, 0);
            
            totalsRow.push('TOTALES', semanaTotalHours, '', semanaTotalAmount);
        }
        
        wsData.push(totalsRow);
    }
    
    // === SECCIÓN DE PROYECTOS (si hay) ===
    if (projectData.length > 0) {
        // Espacio entre secciones
        wsData.push([]);
        wsData.push([]);
        
        // Título de proyectos
        wsData.push(['PROYECTOS DEL CLIENTE']);
        wsData.push([]);
        
        // Headers de proyectos
        wsData.push(['PROYECTO', 'MÓDULO', 'TOTAL HORAS', 'TARIFA', 'TOTAL']);
        
        // Datos de proyectos
        let projectTotalHours = 0;
        let projectTotalAmount = 0;
        
        // Agrupar por proyecto
        const projectGroups = {};
        projectData.forEach(row => {
            const projectName = row.projectName || 'Proyecto Sin Nombre';
            if (!projectGroups[projectName]) {
                projectGroups[projectName] = [];
            }
            projectGroups[projectName].push(row);
        });
        
        // Generar filas por proyecto
        Object.entries(projectGroups).forEach(([projectName, modules]) => {
            // Header del proyecto
            wsData.push([projectName, '', '', '', '']);
            
            // Módulos del proyecto
            modules.forEach(row => {
                const hours = parseFloat(row.editedTime || row.totalHours || 0);
                const tariff = parseFloat(row.editedTariff || row.tarifa || 0);
                const total = parseFloat(row.editedTotal || row.total || 0);
                
                wsData.push([
                    '',
                    window.convertModuleToAcronym(row.moduleName) || 'MSN',
                    hours,
                    tariff,
                    total
                ]);
                
                projectTotalHours += hours;
                projectTotalAmount += total;
            });
        });
        
        // Totales de proyectos
        wsData.push([]);
        wsData.push(['TOTAL PROYECTOS', '', projectTotalHours, '', projectTotalAmount]);
    }
    
    // === SECCIÓN DE DIFERENCIA DE HORAS (si hay y supera 150) ===
    let totalSoporteHours = soporteData.reduce((sum, row) => sum + (row.totalHoras || 0), 0);
    if (totalSoporteHours > 150 && window.differenceTableData && window.differenceTableData.length > 0) {
        // Espacio entre secciones
        wsData.push([]);
        wsData.push([]);
        
        // Título de diferencia
        wsData.push(['DIFERENCIA DE HORAS', '', '', '', '']);
        wsData.push([]);
        
        // Headers de diferencia
        wsData.push(['FACTURA', 'CONCEPTO', 'HORAS/TIEMPO', 'TARIFA', 'TOTAL']);
        
        // Fila Diferencia para OC
        const diffHours = totalSoporteHours - 150;
        wsData.push(['-', 'Diferencia para OC', diffHours, '', '']);
        
        // Filas del administrador
        let grandTotalDiffAmount = 0;
        window.differenceTableData.forEach(row => {
            const horas = parseFloat(row.tiempo || 0);
            const tarifa = parseFloat(row.tarifa || 0);
            const total = parseFloat(row.total || 0);
            
            wsData.push([
                row.factura || '',
                row.concepto || '',
                horas,
                tarifa,
                total
            ]);
            grandTotalDiffAmount += total;
        });
        
        // Fila de total de diferencia
        wsData.push([]);
        wsData.push(['', 'Orden de Compra Pendiente', '', '', grandTotalDiffAmount]);
    }
    
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'remanente');
    
    XLSX.utils.book_append_sheet(wb, ws, "REPORTE REMANENTE");
    
    const fileName = generateFileName('ReporteRemanente');
    XLSX.writeFile(wb, fileName);
    
    const totalHours = (soporteData.reduce((sum, row) => sum + (row.totalHoras || 0), 0)) + 
                      (projectData.reduce((sum, row) => sum + parseFloat(row.editedTime || row.totalHours || 0), 0));
    
    const totalAmount = (soporteData.reduce((sum, row) => {
        if (!row.monthStructure) return sum;
        let rowTotal = 0;
        for (let i = 1; i <= row.monthStructure.totalWeeks; i++) {
            const semanaData = row[`semana${i}`];
            if (semanaData) rowTotal += parseFloat(semanaData.total || 0);
        }
        return sum + rowTotal;
    }, 0)) + (projectData.reduce((sum, row) => sum + parseFloat(row.editedTotal || row.total || 0), 0));
    
    saveToReportHistory(fileName, 'remanente', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel Remanente generado: ${fileName} (${soporteData.length + projectData.length} elementos)`);

    resetReportGenerator();
}

/**
 * Generar Excel para Proyecto General
 */
function generateProyectoGeneralExcel() {
    console.log('📋 Generando Excel - Proyecto General');
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    wsData.push(['', '', 'Proyecto: General', '', '', '']);
    wsData.push(['', '', '', '', '', '']);
    wsData.push(['ID EMPRESA', 'CONSULTOR', 'MÓDULO', 'TIEMPO', 'TARIFA MÓDULO', 'TOTAL']);
    
    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            row.idEmpresa || 'N/A',
            row.consultor || 'N/A',
            window.convertModuleToAcronym(row.modulo || 'N/A'),
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    wsData.push(['', '', 'TOTALES', totalHours, '', totalAmount]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'proyecto');
    
    ws['!merges'] = [{ s: { r: 0, c: 2 }, e: { r: 0, c: 4 } }];
    
    XLSX.utils.book_append_sheet(wb, ws, "PROYECTO GENERAL");
    
    const fileName = generateFileName('ProyectoGeneral');
    XLSX.writeFile(wb, fileName);
    saveToReportHistory(fileName, 'proyecto-general', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel generado: ${fileName}`);

    resetReportGenerator();
}

/**
 * Generar Excel para Proyecto Cliente (vista simplificada)
 */
function generateProyectoClienteExcel() {
    console.log('🏢 Generando Excel - Proyecto Cliente');
    
    const clientName = document.getElementById('clientFilter')?.selectedOptions[0]?.text || 'Cliente';
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    wsData.push(['', `Proyecto: ${clientName}`, '', '']);
    wsData.push(['', '', '', '']);
    wsData.push(['MÓDULO', 'TIEMPO', 'TARIFA MÓDULO', 'TOTAL']);

    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            window.convertModuleToAcronym(row.modulo || 'N/A'),
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    wsData.push(['TOTALES', totalHours, '', totalAmount]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'proyecto-cliente');
    
    ws['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }];
    
    XLSX.utils.book_append_sheet(wb, ws, "PROYECTO CLIENTE");
    
    const fileName = generateFileName('ProyectoCliente');
    XLSX.writeFile(wb, fileName);
    saveToReportHistory(fileName, 'proyecto-cliente', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel generado: ${fileName}`);

    resetReportGenerator();
}

/**
 * Generar Excel para Proyecto Consultor
 */
function generateProyectoConsultorExcel() {
    console.log('Generando Excel - Proyecto Consultor');

    const consultantName = document.getElementById('consultantFilter')?.selectedOptions[0]?.text || 'Consultor';
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    wsData.push(['', '', '', `Proyecto: ${consultantName}`, '', '', '']);
    wsData.push(['', '', '', '', '', '', '']);
    wsData.push(['ID EMPRESA', 'CONSULTOR', 'ORIGEN', 'MÓDULO', 'TIEMPO', 'TARIFA', 'TOTAL']);

    let totalHours = 0;
    let totalAmount = 0;
    
    Object.values(editablePreviewData).forEach(row => {
        wsData.push([
            row.idEmpresa || 'N/A',
            row.consultor || 'N/A',
            row.origen || 'N/A',                    // ✅ NUEVO
            row.modulo || 'N/A',                   // ✅ NUEVO
            parseFloat(row.editedTime || 0),
            parseFloat(row.editedTariff || 0),
            parseFloat(row.editedTotal || 0)
        ]);
        
        totalHours += parseFloat(row.editedTime || 0);
        totalAmount += parseFloat(row.editedTotal || 0);
    });
    
    wsData.push(['', '', '', 'TOTALES', totalHours, '', totalAmount]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyling(ws, wsData, 'proyecto-consultor');
    
    ws['!merges'] = [{ s: { r: 0, c: 3 }, e: { r: 0, c: 5 } }];
    
    XLSX.utils.book_append_sheet(wb, ws, "PROYECTO CONSULTOR");
    
    const fileName = generateFileName('ProyectoConsultor');
    XLSX.writeFile(wb, fileName);
    saveToReportHistory(fileName, 'proyecto-consultor', totalHours, totalAmount);
    
    window.NotificationUtils.success(`Excel generado: ${fileName}`);

    resetReportGenerator();
}

/**
 * Aplicar estilos básicos a worksheet de Excel
 */
function applyExcelStyling(ws, wsData, reportType) {
    // Configurar anchos de columna
    const colWidths = [];
    
    switch (reportType) {
        case 'remanente':
            // Columnas más anchas para estructura semanal
            colWidths.push(
                { wch: 15 }, // Total Horas
                { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, // Semana 1
                { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, // Semana 2
                { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, // Semana 3
                { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }  // Semana 4
            );
            break;
        case 'cliente':
        case 'proyecto-cliente':
            // Estructura simplificada
            colWidths.push(
                { wch: 25 }, // Soporte/Modulo
                { wch: 15 }, // Modulo/Tiempo
                { wch: 10 }, // Tiempo/Tarifa
                { wch: 15 }, // Tarifa/Total
                { wch: 15 }  // Total
            );
            break;
        default:
            // Estructura estándar
            colWidths.push(
                { wch: 12 }, // ID Empresa
                { wch: 20 }, // Consultor
                { wch: 25 }, // Soporte/Modulo
                { wch: 20 }, // Modulo
                { wch: 10 }, // Tiempo
                { wch: 15 }, // Tarifa
                { wch: 15 }  // Total
            );
    }
    
    ws['!cols'] = colWidths;
    
    // Aplicar estilos básicos a celdas
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    
    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = ws[cellAddress];
            
            if (!cell) continue;
            
            // Inicializar estilo si no existe
            if (!cell.s) cell.s = {};
            
            // Verificar si es la fila de Orden de Compra Pendiente (total de diferencia)
            let isOrderCompraRow = false;
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cAddress = XLSX.utils.encode_cell({ r: row, c: c });
                const cCell = ws[cAddress];
                if (cCell && (cCell.v === 'Orden de Compra Pendiente' || cCell.v === 'TOTAL PROYECTOS')) {
                    isOrderCompraRow = true;
                    break;
                }
            }

            // Estilos para headers (fila 2 o 3 según reporte, o 3/4 para remanente)
            const headerRow = reportType === 'remanente' ? 4 : (reportType === 'cliente' ? 2 : 2);
            const isHeader = (reportType === 'remanente' && (row === 3 || row === 4)) || (reportType !== 'remanente' && row === headerRow);
            
            if (isHeader) {
                cell.s = {
                    fill: { pattern: "solid", fgColor: { rgb: "1B3A5C" } },
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
            // Estilos para la fila de Orden de Compra Pendiente (Fondo verde)
            else if (isOrderCompraRow) {
                cell.s = {
                    fill: { pattern: "solid", fgColor: { rgb: "E2F0D9" } },
                    font: { bold: true, color: { rgb: "375623" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "A9D08E" } },
                        bottom: { style: "thin", color: { rgb: "A9D08E" } },
                        left: { style: "thin", color: { rgb: "A9D08E" } },
                        right: { style: "thin", color: { rgb: "A9D08E" } }
                    }
                };
            }
            // Estilos para títulos (primera fila)
            else if (row === 0) {
                cell.s = {
                    font: { bold: true, size: 14, color: { rgb: "1E40AF" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
            // Estilos para fila de totales (última fila, si no es Orden de Compra)
            else if (row === range.e.r) {
                cell.s = {
                    fill: { pattern: "solid", fgColor: { rgb: "F1F5F9" } },
                    font: { bold: true },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "medium", color: { rgb: "000000" } },
                        bottom: { style: "medium", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
            // Estilos para datos normales
            else if (row > headerRow) {
                cell.s = {
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "E5E7EB" } },
                        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                        left: { style: "thin", color: { rgb: "E5E7EB" } },
                        right: { style: "thin", color: { rgb: "E5E7EB" } }
                    }
                };
                
                // Alternar colores de fila
                if ((row - headerRow) % 2 === 0) {
                    cell.s.fill = { pattern: "solid", fgColor: { rgb: "F9FAFB" } };
                }
            }
            
            // Formato de moneda para columnas de dinero
            if (typeof cell.v === 'number' && (col === range.e.c || cellAddress.includes('TOTAL') || isOrderCompraRow)) {
                cell.s.numFmt = '"$"#,##0.00';
            }
        }
    }
}

/**
 * Generar nombre de archivo único
 */
function generateFileName(reportPrefix) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 5).replace(':', ''); // HHMM
    
    // Obtener información adicional según filtros
    let suffix = '';
    
    if (currentReportType.includes('consultor-especifico') || currentReportType.includes('proyecto-consultor')) {
        const consultantName = document.getElementById('consultantFilter')?.selectedOptions[0]?.text?.split(' ')[0] || 'Consultor';
        suffix = `_${consultantName}`;
    } else if (currentReportType.includes('cliente')) {
        const clientName = document.getElementById('clientFilter')?.selectedOptions[0]?.text?.split(' ')[0] || 'Cliente';
        suffix = `_${clientName}`;
    } else if (currentReportType === 'remanente') {
        const monthValue = document.getElementById('monthFilter')?.value || '';
        suffix = `_${monthValue.replace('-', '')}`;
    }
    
    return `${reportPrefix}${suffix}_HPEREZ_${dateStr}_${timeStr}.xlsx`;
}

/**
 * Guardar reporte en historial
 */
async function saveToReportHistory(fileName, reportType, totalHours, totalAmount, recordCount = null, dateRange = null) {
    try {
        let finalRecordCount = recordCount;
        if (finalRecordCount === null) {
            finalRecordCount = Object.keys(editablePreviewData || {}).length;
        }

        let finalDateRange = dateRange;
        if (finalDateRange === null) {
            finalDateRange = getDateRangeText();
        }

        const reportData = {
            fileName: fileName,
            reportType: reportType, 
            generatedBy: 'Hector Perez',
            dateRange: finalDateRange,
            recordCount: finalRecordCount,
            totalHours: totalHours,
            totalAmount: totalAmount
        };
        
        const saveResult = await window.PortalDB.saveGeneratedReport(reportData);
        
        if (saveResult.success) {
            console.log('✅ Reporte guardado en historial:', fileName);
            // Actualizar contadores del sidebar
            if (typeof updateSidebarCounts === 'function') {
                await updateSidebarCounts();
            }
            // Actualizar tabla en tiempo real
            if (typeof updateGeneratedReportsList === 'function') {
                await updateGeneratedReportsList();
            }
        } else {
            console.error('❌ Error guardando en historial:', saveResult.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando reporte en historial:', error);
    }
}

/**
 * Obtener texto descriptivo del rango de fechas actual
 */
function getDateRangeText() {
    const timeFilter = document.getElementById('timeFilter');
    if (!timeFilter) return 'Período no especificado';
    
    switch (timeFilter.value) {
        case 'week':
            return 'Esta Semana';
        case 'month':
            return 'Este Mes';
        case 'custom':
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            if (startDate && endDate) {
                return `${startDate} al ${endDate}`;
            }
            return 'Rango personalizado';
        case 'all':
            return 'Todas las fechas';
        default:
            return 'Período no especificado';
    }
}



// Inicializar cuando se carga la sección
document.addEventListener('DOMContentLoaded', function() {
    // Esperamos un poco para asegurar que todo esté cargado
    setTimeout(() => {
        if (currentSection === 'generar-reporte') {
            initializeReportSelector();
        }
    }, 500);
});

// Asegurar inicialización cuando se cambia a la sección de reportes
function ensureReportSelectorInitialized() {
    const reportGrid = document.getElementById('reportGrid');
    if (reportGrid && reportGrid.children.length === 0) {
        initializeReportSelector();
    }
}

console.log('✅ Funciones de generación de reportes cargadas correctamente');

// ===================================================================
// FUNCIONES DE CÁLCULO DE MARGEN PARA TARIFAS
// ===================================================================

/**
 * Calcular margen entre tarifas
 */
function calculateMargen(tarifaConsultor, tarifaCliente) {
    const consultor = parseFloat(tarifaConsultor) || 0;
    const cliente = parseFloat(tarifaCliente) || 0;
    return cliente - consultor;
}

/**
 * Calcular porcentaje de margen
 */
function calculateMargenPorcentaje(tarifaConsultor, tarifaCliente) {
    const consultor = parseFloat(tarifaConsultor) || 0;
    const cliente = parseFloat(tarifaCliente) || 0;
    
    if (consultor === 0) return 0;
    
    const margen = cliente - consultor;
    return (margen / consultor) * 100;
}

/**
 * Formatear moneda
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
}

/**
 * Actualizar display de margen para asignaciones de soporte
 */
function updateAssignMargen() {
    const tarifaConsultor = document.getElementById('assignTarifaConsultor').value;
    const tarifaCliente = document.getElementById('assignTarifaCliente').value;
    
    const margen = calculateMargen(tarifaConsultor, tarifaCliente);
    const porcentaje = calculateMargenPorcentaje(tarifaConsultor, tarifaCliente);
    
    const margenElement = document.getElementById('assignMargen');
    const porcentajeElement = document.getElementById('assignMargenPorcentaje');
    const warningElement = document.getElementById('assignMargenWarning');
    
    // Actualizar valor
    margenElement.textContent = formatCurrency(margen);
    porcentajeElement.textContent = `(${porcentaje.toFixed(1)}%)`;
    
    // Aplicar clase según si es positivo o negativo
    if (margen < 0) {
        margenElement.classList.add('negative');
        warningElement.style.display = 'block';
    } else {
        margenElement.classList.remove('negative');
        warningElement.style.display = 'none';
    }
}

/**
 * Actualizar display de margen para asignaciones de proyecto
 */
function updateProjectAssignMargen() {
    const tarifaConsultor = document.getElementById('projectAssignTarifaConsultor').value;
    const tarifaCliente = document.getElementById('projectAssignTarifaCliente').value;
    
    const margen = calculateMargen(tarifaConsultor, tarifaCliente);
    const porcentaje = calculateMargenPorcentaje(tarifaConsultor, tarifaCliente);
    
    const margenElement = document.getElementById('projectAssignMargen');
    const porcentajeElement = document.getElementById('projectAssignMargenPorcentaje');
    const warningElement = document.getElementById('projectAssignMargenWarning');
    
    // Actualizar valor
    margenElement.textContent = formatCurrency(margen);
    porcentajeElement.textContent = `(${porcentaje.toFixed(1)}%)`;
    
    // Aplicar clase según si es positivo o negativo
    if (margen < 0) {
        margenElement.classList.add('negative');
        warningElement.style.display = 'block';
    } else {
        margenElement.classList.remove('negative');
        warningElement.style.display = 'none';
    }
}

/**
 * Inicializar listeners para campos de tarifa (soporte)
 */
function initializeTarifaListeners() {
    const tarifaConsultorInput = document.getElementById('assignTarifaConsultor');
    const tarifaClienteInput = document.getElementById('assignTarifaCliente');
    
    if (tarifaConsultorInput) {
        tarifaConsultorInput.addEventListener('input', updateAssignMargen);
    }
    
    if (tarifaClienteInput) {
        tarifaClienteInput.addEventListener('input', updateAssignMargen);
    }
}

/**
 * Inicializar listeners para campos de tarifa (proyecto)
 */
function initializeProjectTarifaListeners() {
    const tarifaConsultorInput = document.getElementById('projectAssignTarifaConsultor');
    const tarifaClienteInput = document.getElementById('projectAssignTarifaCliente');
    
    if (tarifaConsultorInput) {
        tarifaConsultorInput.addEventListener('input', updateProjectAssignMargen);
    }
    
    if (tarifaClienteInput) {
        tarifaClienteInput.addEventListener('input', updateProjectAssignMargen);
    }
}

// ===================================================================
// GESTIÓN DEL TARIFARIO
// ===================================================================

let currentTarifarioFilter = 'all';

/**
 * Cargar datos del tarifario
 */
async function loadTarifario() {
    console.log('Cargando tarifario...');

    await loadCurrentData();
    
    if (!currentData || !currentData.users) {
        console.warn('currentData no disponible');
        return;
    }
    
    const tarifario = await window.PortalDB.getTarifario();
    const tarifarioArray = Array.isArray(tarifario) ? tarifario : Object.values(tarifario);
    
    console.log('Tarifario cargado:', tarifarioArray.length, 'entradas');
    
    // Con el await esperamos a que termine las peticiones a la base de datos antes de actualizar las tablas
    await updateTarifarioTable(currentTarifarioFilter);
    await updateConsultoresTable();
    await updateTarifarioStats();
    
    // Una vez que todo cargó, actualizamos el contador en el sidebar
    const sidebarBadge = document.getElementById('sidebarTarifarioCount');
    if (sidebarBadge) {
        sidebarBadge.textContent = tarifarioArray.length;
        console.log('Contador de tarifario actualizado:', tarifarioArray.length);
    }
}

/**
 * Actualizar tabla de unión (principal)
 */
async function updateTarifarioTable() {
    const tbody = document.getElementById('tarifarioTableBody');
    if (!tbody) return;
    
    const tarifario = await window.PortalDB.getTarifario();
    const allTarifas = Array.isArray(tarifario) ? tarifario : Object.values(tarifario);
    
    // ✅ CORRECCIÓN: Aplicar filtro usando assignmentType (no 'tipo')
    let tarifas = allTarifas;
    if (currentTarifarioFilter !== 'all') {
        tarifas = allTarifas.filter(t => t.assignmentType === currentTarifarioFilter);
    }
    
    // Actualizar contador
    const countElement = document.getElementById('tarifarioCount');
    if (countElement) {
        countElement.textContent = `${tarifas.length} asignaciones`;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // Si no hay datos
    if (tarifas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                        <div class="empty-state-title">No hay tarifas con este filtro</div>
                        <div class="empty-state-desc">Prueba con otro filtro o crea nuevas asignaciones</div>
                    </div>
                </td>
            </tr>
        `;
        applyTablePagination('tarifarioTableBody');
        return;
    }
    
    // Renderizar filas
    tarifas.forEach(tarifa => {
        const row = createTarifaRow(tarifa);
        tbody.appendChild(row);
    });

    const searchInput = document.getElementById('searchTarifario');
    if (searchInput && searchInput.value.trim()) {
        filterCrudTable('tarifario');
    } else {
        applyTablePagination('tarifarioTableBody');
    }
}

/**
 * Crear fila de tarifa
 */
function createTarifaRow(tarifa) {
    const row = document.createElement('tr');
    
    let tipoIcon = '<i class="fa-solid fa-question"></i>';
    let tipoLabel = 'Desconocido';
    
    if (tarifa.assignmentType === 'support') {
        tipoIcon = '<i class="fa-solid fa-headset"></i>';
        tipoLabel = 'Soporte';
    } else if (tarifa.assignmentType === 'project') {
        tipoIcon = '<i class="fa-solid fa-folder-open"></i>';
        tipoLabel = 'Proyecto';
    } else if (tarifa.assignmentType === 'task') {
        tipoIcon = '<i class="fa-solid fa-tasks"></i>';
        tipoLabel = 'Tarea';
    }
    
    const margen = parseFloat(tarifa.margen || 0);
    const margenPorcentaje = parseFloat(tarifa.margenPorcentaje || 0);
    row.dataset.searchable = [
        tarifa.assignmentType,
        tarifa.assignmentId,
        tarifa.moduloNombre,
        tarifa.consultorNombre,
        tarifa.empresaNombre,
        tarifa.clienteNombre,
        tarifa.trabajoNombre
    ].filter(Boolean).join(' ').toLowerCase();
    
    row.innerHTML = `
        <td>${tipoIcon} ${tipoLabel}</td>
        <td><strong>${tarifa.assignmentId || 'N/A'}</strong></td>
        <td>${tarifa.moduloNombre || 'Sin módulo'}</td>
        <td>${tarifa.consultorNombre || 'Sin consultor'}</td>
        <td>${tarifa.empresaNombre || tarifa.clienteNombre || 'Sin cliente'}</td>
        <td>${tarifa.trabajoNombre || 'Sin trabajo'}</td>
        <td class="editable-cell" 
            data-tarifa-id="${tarifa.assignmentId}" 
            data-field="costoConsultor"
            onclick="editTarifaInline('${tarifa.assignmentId}', 'costoConsultor')"
            style="cursor: pointer;">
            <span class="tarifa-value">$${parseFloat(tarifa.costoConsultor || 0).toFixed(2)}</span>
            <i class="fa-solid fa-edit" style="opacity: 0.5; margin-left: 5px; font-size: 12px;"></i>
        </td>
        <td class="editable-cell" 
            data-tarifa-id="${tarifa.assignmentId}" 
            data-field="costoCliente"
            onclick="editTarifaInline('${tarifa.assignmentId}', 'costoCliente')"
            style="cursor: pointer;">
            <span class="tarifa-value">$${parseFloat(tarifa.costoCliente || 0).toFixed(2)}</span>
            <i class="fa-solid fa-edit" style="opacity: 0.5; margin-left: 5px; font-size: 12px;"></i>
        </td>
        <td>
            <strong>$${margen.toFixed(2)}</strong>
            <span class="badge ${margenPorcentaje >= 30 ? 'badge-success' : margenPorcentaje >= 15 ? 'badge-warning' : 'badge-danger'}">
                ${margenPorcentaje.toFixed(1)}%
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn btn-view" onclick="viewTarifaDetails('${tarifa.assignmentId}')" title="Ver detalles">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

/**
 * Actualizar tabla de consultores
 */
 async function updateConsultoresTable() {  // ✅ Agregar async si no lo tiene
    console.log('👥 Actualizando tabla de consultores...');
    
    const tbody = document.getElementById('tarifarioConsultoresTableBody');
    if (!tbody) {
        console.error('❌ tarifarioConsultoresTableBody no encontrado');
        return;
    }
    
    const tarifario = await window.PortalDB.getTarifario();  // ✅ Agregar await
    const tarifas = Array.isArray(tarifario) ? tarifario : Object.values(tarifario);
    
    // Agrupar por consultor
    const consultoresMap = {};
    
    tarifas.forEach(tarifa => {
        const consultorId = tarifa.consultorId;
        
        if (!consultorId || consultorId === 'undefined') {
            console.warn('⚠️ Tarifa sin consultorId válido:', tarifa);
            return;
        }
        
        if (!consultoresMap[consultorId]) {
            consultoresMap[consultorId] = {
                id: consultorId,
                nombre: tarifa.consultorNombre || 'Nombre no disponible',  // ✅ Valor por defecto
                totalAsignaciones: 0,
                modulos: new Set(),
                clientes: new Set(),
                sumaTarifas: 0
            };
        }
        
        consultoresMap[consultorId].totalAsignaciones++;
        
        // Agregar módulo si existe
        if (tarifa.moduloNombre && tarifa.moduloNombre !== 'undefined') {
            consultoresMap[consultorId].modulos.add(tarifa.moduloNombre);
        }
        
        // Agregar cliente si existe
        if (tarifa.clienteNombre && tarifa.clienteNombre !== 'undefined') {
            consultoresMap[consultorId].clientes.add(tarifa.clienteNombre);
        }
        
        // Sumar tarifa
        consultoresMap[consultorId].sumaTarifas += (tarifa.costoConsultor || 0);
    });
    
    const consultores = Object.values(consultoresMap);
    
    console.log('📊 Consultores procesados:', consultores.length);
    
    // Actualizar contador
    const countElement = document.getElementById('consultoresCount');
    if (countElement) {
        countElement.textContent = `${consultores.length} consultores`;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // Si no hay consultores
    if (consultores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-user"></i></div>
                        <div class="empty-state-title">No hay consultores con asignaciones</div>
                        <div class="empty-state-desc">Asigne proyectos o soportes a consultores para ver el resumen</div>
                    </div>
                </td>
            </tr>
        `;
        applyTablePagination('tarifarioConsultoresTableBody');
        return;
    }
    
    // Renderizar filas
    consultores.forEach(consultor => {
        const promedioTarifa = consultor.totalAsignaciones > 0 
            ? (consultor.sumaTarifas / consultor.totalAsignaciones) 
            : 0;
        
        const row = document.createElement('tr');
        row.dataset.searchable = [
            consultor.id,
            consultor.nombre,
            ...Array.from(consultor.modulos),
            ...Array.from(consultor.clientes)
        ].filter(Boolean).join(' ').toLowerCase();
        row.innerHTML = `
            <td><strong>${consultor.id}</strong></td>
            <td>${consultor.nombre}</td>
            <td>${consultor.totalAsignaciones}</td>
            <td>${consultor.modulos.size > 0 ? Array.from(consultor.modulos).join(', ') : 'N/A'}</td>
            <td>${consultor.clientes.size > 0 ? Array.from(consultor.clientes).join(', ') : 'N/A'}</td>
            <td><strong>$${promedioTarifa.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(row);
    });

    applyTablePagination('tarifarioConsultoresTableBody');
    
    console.log('✅ Tabla de consultores actualizada');
}

/**
 * Actualizar estadísticas del tarifario
 */
async function updateTarifarioStats() {  
    const tarifario = await window.PortalDB.getTarifario(); 
    const tarifas = Array.isArray(tarifario) ? tarifario : Object.values(tarifario);
    
    console.log('📊 Tarifario recibido:', tarifas.length, 'entradas');
    
    // Calcular estadísticas
    const totalAsignaciones = tarifas.length;
    const totalConsultores = tarifas.length > 0 ? new Set(tarifas.map(t => t.consultorId || t.userId)).size : 0;
    
    // Sumar el margen (ya viene calculado desde la BD)
    let totalMargen = 0;
    tarifas.forEach(t => {
        // Usar el campo 'margen' si existe, sino calcularlo
        if (t.margen !== undefined && t.margen !== null) {
            totalMargen += parseFloat(t.margen) || 0;
        } else {
            const consultor = parseFloat(t.costoConsultor || t.tarifaConsultor) || 0;
            const cliente = parseFloat(t.costoCliente || t.tarifaCliente) || 0;
            totalMargen += (cliente - consultor);
        }
    });
    
    const margenPromedio = totalAsignaciones > 0 ? totalMargen / totalAsignaciones : 0;
    
    // Actualizar elementos individuales en el DOM
    const totalAsignacionesEl = document.getElementById('totalAsignaciones');
    const margenPromedioEl = document.getElementById('margenPromedio');
    const totalConsultoresEl = document.getElementById('totalConsultores');
    
    if (totalAsignacionesEl) {
        totalAsignacionesEl.textContent = totalAsignaciones;
    }
    
    if (margenPromedioEl) {
        margenPromedioEl.textContent = `$${margenPromedio.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    if (totalConsultoresEl) {
        totalConsultoresEl.textContent = totalConsultores;
    }
    
    console.log('📊 Estadísticas de tarifario actualizadas:', {
        totalAsignaciones,
        totalConsultores,
        totalMargen,
        margenPromedio
    });
}

/**
 * Filtrar tarifario por tipo
 */
function filterTarifarioByType(type) {
    console.log(`🔍 Filtrando tarifario por: ${type}`);
    currentTarifarioFilter = type;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === type) {
            btn.classList.add('active');
        }
    });
    
    updateTarifarioTable();
}

/**
 * Ver detalles de una tarifa
 */
async function viewTarifaDetails(assignmentId) {
    const tarifario = await window.PortalDB.getTarifario();
    const tarifa = Object.values(tarifario).find(t => t.assignmentId === assignmentId);
    
    if (!tarifa) {
        window.NotificationUtils.error('Tarifa no encontrada');
        console.error('No se encontró tarifa para assignmentId:', assignmentId);
        return;
    }
    
    console.log('Mostrando detalles de tarifa:', tarifa);
    
    const detalles = `
═══════════════════════════════════════
Detalles de Tarifa
═══════════════════════════════════════

Id: ${tarifa.tarifarioId}
Tipo: ${tarifa.tipo.toUpperCase()}
Id de Asignación: ${tarifa.assignmentId}

Consultor
   Nombre: ${tarifa.consultorNombre}
   Id: ${tarifa.consultorId}

Cliente
   Empresa: ${tarifa.clienteNombre || tarifa.empresaNombre}
   Id: ${tarifa.clienteId}

Módulo
   Código: ${tarifa.moduleId}
   Nombre: ${tarifa.moduloNombre}

Trabajo
   ${tarifa.trabajoNombre}

Tarifas
   Consultor: ${formatCurrency(tarifa.costoConsultor)}/hora
   Cliente:   ${formatCurrency(tarifa.costoCliente)}/hora
   Margen:    ${formatCurrency(tarifa.margen)} (${tarifa.margenPorcentaje}%)

Fecha: ${window.DateUtils ? window.DateUtils.formatDate(tarifa.fechaCreacion) : tarifa.fechaCreacion}
    `;
    
    openInfoModal('Detalles de Tarifa', detalles.trim());
}

/**
 * Editar tarifa inline
 */
async function editTarifaInline(assignmentId, campo) {
    const element = document.querySelector(`[data-tarifa-id="${assignmentId}"][data-field="${campo}"]`);
    if (!element) return;
    
    const tarifario = await window.PortalDB.getTarifario();
    const tarifa = Object.values(tarifario).find(t => t.assignmentId === assignmentId);
    
    if (!tarifa) {
        console.error('❌ Tarifa no encontrada:', assignmentId);
        return;
    }
    
    const valorActual = tarifa[campo];
    
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.value = valorActual;
    input.className = 'inline-edit-input';
    input.style.width = '100px';
    
    const originalContent = element.innerHTML;
    
    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();
    input.select();
    
    // ✅ Bandera para evitar llamadas múltiples
    let guardando = false;
    
    const guardar = async () => {  // ✅ Hacer async
        // ✅ Prevenir ejecución múltiple
        if (guardando) return;
        guardando = true;
        
        const nuevoValor = parseFloat(input.value);
        
        if (isNaN(nuevoValor) || nuevoValor < 0) {
            window.NotificationUtils.error('Valor inválido');
            element.innerHTML = originalContent;
            element.classList.remove('editing');
            guardando = false;
            return;
        }
        
        // ✅ Remover listeners ANTES del confirm
        input.removeEventListener('blur', guardar);
        input.removeEventListener('keydown', keyHandler);
        
        const nombreCampo = campo === 'costoConsultor' ? 'Costo Consultor' : 'Costo Cliente';
        const msg = `¿Confirmar cambio de ${nombreCampo}?\n\nValor actual: ${formatCurrency(valorActual)}\nNuevo valor: ${formatCurrency(nuevoValor)}`;
        
        openConfirmModal('Confirmar Tarifa', msg, async () => {
            await saveTarifaEdit(tarifa.tarifarioId, campo, nuevoValor);
            await loadTarifario();
            guardando = false;
        });
        
        // Remove editing classes if cancelled (needs to be handled by openConfirmModal ideally, but let's just restore original content to prevent stuck UI)
        document.getElementById('closeConfirmEntityModal').addEventListener('click', () => {
            if (element.classList.contains('editing')) {
                element.innerHTML = originalContent;
                element.classList.remove('editing');
                guardando = false;
            }
        }, { once: true });
        
        const cancelBtn = document.querySelector('#confirmEntityModal .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (element.classList.contains('editing')) {
                    element.innerHTML = originalContent;
                    element.classList.remove('editing');
                    guardando = false;
                }
            }, { once: true });
        }
        
    };
    
    const cancelar = () => {
        if (guardando) return;  // ✅ Prevenir cancelación mientras guarda
        
        input.removeEventListener('blur', guardar);
        input.removeEventListener('keydown', keyHandler);
        element.innerHTML = originalContent;
        element.classList.remove('editing');
    };
    
    // ✅ Definir handler para poder removerlo después
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardar();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelar();
        }
    };
    
    input.addEventListener('blur', guardar);
    input.addEventListener('keydown', keyHandler);
}

// ===================================================================
// RETROCOMPATIBILIDAD - ASIGNACIONES SIN TARIFAS
// ===================================================================

/**
 * Detectar asignaciones sin tarifas configuradas
 */
function detectarAsignacionesSinTarifas() {
    console.log('🔍 Buscando asignaciones sin tarifas...');
    
    const assignments = window.PortalDB.getAssignments();
    const projectAssignments = window.PortalDB.getProjectAssignments();
    
    const sinTarifas = [];
    
    // Revisar asignaciones de soporte
    Object.values(assignments).forEach(assign => {
        if (!assign.tarifaConsultor || !assign.tarifaCliente) {
            sinTarifas.push({
                ...assign,
                tipo: 'soporte'
            });
        }
    });
    
    // Revisar asignaciones de proyecto
    Object.values(projectAssignments).forEach(assign => {
        if (!assign.tarifaConsultor || !assign.tarifaCliente) {
            sinTarifas.push({
                ...assign,
                tipo: 'proyecto'
            });
        }
    });
    
    console.log(`Encontradas ${sinTarifas.length} asignaciones sin tarifas`);
    
    return sinTarifas;
}

/**
 * Mostrar modal para configurar tarifas de asignaciones existentes
 */
function mostrarModalConfigurarTarifas() {
    const sinTarifas = detectarAsignacionesSinTarifas();
    
    if (sinTarifas.length === 0) {
        window.NotificationUtils.success('Todas las asignaciones tienen tarifas configuradas');
        return;
    }
    
    // Crear HTML del modal
    let listaHTML = '';
    sinTarifas.forEach(assign => {
        const user = window.PortalDB.getUser(assign.userId);
        const company = window.PortalDB.getCompany(assign.companyId);
        const module = window.PortalDB.getModule(assign.moduleId);
        
        let trabajo = '';
        if (assign.tipo === 'soporte') {
            const support = window.PortalDB.getSupport(assign.supportId);
            trabajo = support ? support.name : 'N/A';
        } else {
            const project = window.PortalDB.getProject(assign.projectId);
            trabajo = project ? project.name : 'N/A';
        }
        
        listaHTML += `
            <div class="asignacion-sin-tarifa" data-id="${assign.id}">
                <div class="asignacion-info">
                    <strong>${assign.tipo === 'soporte' ? '<i class="fa-solid fa-headset"></i>' : '<i class="fa-solid fa-folder"></i>'} ${assign.id}</strong>
                    <div class="asignacion-details">
                        <span><i class="fa-solid fa-user"></i> ${user ? user.name : 'N/A'}</span>
                        <span><i class="fa-solid fa-building"></i> ${company ? company.name : 'N/A'}</span>
                        <span><i class="fa-solid fa-puzzle-piece"></i> ${module ? module.name : 'N/A'}</span>
                        <span>${trabajo}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="abrirFormularioTarifa('${assign.id}', '${assign.tipo}')">
                    Configurar Tarifas
                </button>
            </div>
        `;
    });
    
    const modalHTML = `
        <div class="modal-overlay" id="configurarTarifasModal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-exclamation-triangle"></i> Asignaciones Sin Tarifas Configuradas</h2>
                    <button class="modal-close" onclick="cerrarModalTarifas()">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="modal-info">
                        Se encontraron <strong>${sinTarifas.length}</strong> asignaciones sin tarifas configuradas.
                        Es necesario configurar las tarifas para poder generar reportes correctamente.
                    </p>
                    <div class="asignaciones-sin-tarifa-list">
                        ${listaHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalTarifas()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar al DOM
    const existingModal = document.getElementById('configurarTarifasModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Abrir formulario para configurar tarifa de una asignación
 */
function abrirFormularioTarifa(assignmentId, tipo) {
    const formHTML = `
        <div class="modal-overlay" id="formularioTarifaModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-money-bill-wave"></i> Configurar Tarifas</h2>
                    <button class="modal-close" onclick="cerrarFormularioTarifa()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>ID Asignación:</strong> ${assignmentId}</p>
                    <p><strong>Tipo:</strong> ${tipo}</p>
                    
                    <div class="form-group">
                        <label for="modalTarifaConsultor">Tarifa Consultor ($/hora)</label>
                        <input 
                            type="number" 
                            id="modalTarifaConsultor" 
                            step="0.01" 
                            min="0" 
                            placeholder="300.00"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="modalTarifaCliente">Tarifa Cliente ($/hora)</label>
                        <input 
                            type="number" 
                            id="modalTarifaCliente" 
                            step="0.01" 
                            min="0" 
                            placeholder="500.00"
                            required
                        >
                    </div>
                    
                    <div class="margen-display">
                        <div class="margen-info">
                            <span class="margen-label">Margen:</span>
                            <span id="modalMargen" class="margen-value">$0.00</span>
                            <span id="modalMargenPorcentaje" class="margen-percent">(0%)</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarFormularioTarifa()">Cancelar</button>
                    <button class="btn btn-primary" onclick="guardarTarifaAsignacion('${assignmentId}')">
                        Guardar Tarifas
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHTML);
    
    // Agregar listeners para calcular margen
    const consultorInput = document.getElementById('modalTarifaConsultor');
    const clienteInput = document.getElementById('modalTarifaCliente');
    
    const calcularMargenModal = () => {
        const consultor = parseFloat(consultorInput.value) || 0;
        const cliente = parseFloat(clienteInput.value) || 0;
        const margen = cliente - consultor;
        const porcentaje = consultor > 0 ? (margen / consultor) * 100 : 0;
        
        document.getElementById('modalMargen').textContent = formatCurrency(margen);
        document.getElementById('modalMargenPorcentaje').textContent = `(${porcentaje.toFixed(1)}%)`;
        
        if (margen < 0) {
            document.getElementById('modalMargen').classList.add('negative');
        } else {
            document.getElementById('modalMargen').classList.remove('negative');
        }
    };
    
    consultorInput.addEventListener('input', calcularMargenModal);
    clienteInput.addEventListener('input', calcularMargenModal);
}

/**
 * Guardar tarifas de una asignación
 */
function guardarTarifaAsignacion(assignmentId) {
    const tarifaConsultor = parseFloat(document.getElementById('modalTarifaConsultor').value);
    const tarifaCliente = parseFloat(document.getElementById('modalTarifaCliente').value);
    
    if (!tarifaConsultor || !tarifaCliente) {
        window.NotificationUtils.error('Ambas tarifas son requeridas');
        return;
    }
    
    if (tarifaConsultor <= 0 || tarifaCliente <= 0) {
        window.NotificationUtils.error('Las tarifas deben ser mayores a 0');
        return;
    }
    
    const result = window.PortalDB.configurarTarifasAsignacion(assignmentId, {
        tarifaConsultor: tarifaConsultor,
        tarifaCliente: tarifaCliente
    });
    
    if (result.success) {
        window.NotificationUtils.success('Tarifas configuradas correctamente');
        cerrarFormularioTarifa();
        cerrarModalTarifas();
        
        // Recargar tarifario si está activo
        if (currentSection === 'tarifario') {
            loadTarifario();
        }
        
        // Verificar si quedan más asignaciones sin tarifas
        setTimeout(() => {
            const pendientes = detectarAsignacionesSinTarifas();
            if (pendientes.length > 0) {
                mostrarModalConfigurarTarifas();
            }
        }, 500);
    } else {
        window.NotificationUtils.error('Error al configurar tarifas: ' + result.message);
    }
}

/**
 * Cerrar modales
 */
function cerrarModalTarifas() {
    const modal = document.getElementById('configurarTarifasModal');
    if (modal) modal.remove();
}

function cerrarFormularioTarifa() {
    const modal = document.getElementById('formularioTarifaModal');
    if (modal) modal.remove();
}

/**
 * Verificar asignaciones sin tarifas al cargar el panel
 */
function verificarTarifasAlCargar() {
    setTimeout(() => {
        const sinTarifas = detectarAsignacionesSinTarifas();
        
        if (sinTarifas.length > 0) {
            console.warn(`⚠️ Hay ${sinTarifas.length} asignaciones sin tarifas configuradas`);
            
            if (window.NotificationUtils) {
                window.NotificationUtils.warning(
                    `Hay ${sinTarifas.length} asignaciones sin tarifas. Click aquí para configurar.`,
                    () => mostrarModalConfigurarTarifas()
                );
                
                // ✅ AGREGADO - Auto-ocultar después de 10 segundos
                setTimeout(() => {
                    const notification = document.querySelector('.notification.notification-warning');
                    if (notification) {
                        notification.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(400px)';
                        setTimeout(() => notification.remove(), 500);
                    }
                }, 2000);
            }
        }
    }, 2000);
}

/**
 * Guardar edición de tarifa
 */
async function saveTarifaEdit(tarifarioId, campo, nuevoValor) {
    try {
        const updates = {
            [campo]: nuevoValor
        };
        
        // Recalcular margen si cambió alguna tarifa
        const tarifario = await window.PortalDB.getTarifario();
        const tarifa = Object.values(tarifario).find(t => t.tarifarioId === tarifarioId);
        
        if (campo === 'costoConsultor' || campo === 'costoCliente') {
            const consultor = campo === 'costoConsultor' ? nuevoValor : tarifa.costoConsultor;
            const cliente = campo === 'costoCliente' ? nuevoValor : tarifa.costoCliente;
            
            updates.margen = cliente - consultor;
            updates.margenPorcentaje = cliente > 0 ? ((updates.margen / cliente) * 100).toFixed(2) : 0;
        }
        
        const result = await window.PortalDB.updateTarifaEntry(tarifarioId, updates);
        
        if (result.success) {
            window.NotificationUtils.success('✅ Tarifa actualizada correctamente');
        } else {
            window.NotificationUtils.error('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error guardando tarifa:', error);
        window.NotificationUtils.error('❌ Error al guardar');
    }
}

/**
 * Exportar tarifario a Excel
 */
async function exportTarifarioToExcel() {
    try {
        console.log('📤 Exportando tarifario a Excel...');
        
        // Verificar SheetJS
        if (typeof XLSX === 'undefined') {
            window.NotificationUtils.error('Librería XLSX no disponible');
            return;
        }
        
        const tarifario = await window.PortalDB.getTarifario();
        const tarifas = Array.isArray(tarifario) ? tarifario : Object.values(tarifario);
        
        if (tarifas.length === 0) {
            window.NotificationUtils.error('No hay datos para exportar');
            return;
        }
        
        // Preparar datos para Hoja 1: Tabla de Unión
        const datosUnion = tarifas.map(t => ({
            'Tipo': t.tipo.toUpperCase(),
            'ID Asignación': t.idAsignacion,
            'Módulo': t.moduleId,
            'Nombre Módulo': t.moduloNombre,
            'Consultor ID': t.consultorId,
            'Consultor': t.consultorNombre,
            'Cliente ID': t.clienteId,
            'Cliente': t.clienteNombre,
            'Trabajo': t.trabajoNombre,
            'Costo Consultor': t.costoConsultor,
            'Costo Cliente': t.costoCliente,
            'Margen': t.margen,
            'Margen %': t.costoConsultor > 0 ? ((t.margen / t.costoConsultor) * 100).toFixed(2) : 0,
            'Fecha Creación': t.fechaCreacion
        }));
        
        // Preparar datos para Hoja 2: Resumen Consultores
        const consultoresResumen = window.PortalDB.getConsultoresResumen();
        const datosConsultores = Object.values(consultoresResumen).map(c => ({
            'ID': c.id,
            'Nombre': c.nombre,
            'Total Asignaciones': c.totalAsignaciones,
            'Módulos': c.modulos,
            'Clientes': c.clientes,
            'Promedio Tarifa Consultor': c.promedioTarifa.toFixed(2)
        }));
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Tabla de Unión
        const ws1 = XLSX.utils.json_to_sheet(datosUnion);
        XLSX.utils.book_append_sheet(wb, ws1, 'Tabla de Unión');
        
        // Hoja 2: Resumen Consultores
        const ws2 = XLSX.utils.json_to_sheet(datosConsultores);
        XLSX.utils.book_append_sheet(wb, ws2, 'Resumen Consultores');
        
        // Generar nombre de archivo
        const fecha = new Date().toISOString().split('T')[0];
        const filename = `Tarifario_Completo_${fecha}.xlsx`;
        
        // Descargar
        XLSX.writeFile(wb, filename);
        
        window.NotificationUtils.success(`Tarifario exportado: ${filename}`);
        
        console.log('✅ Tarifario exportado exitosamente');
        
    } catch (error) {
        console.error('❌ Error al exportar tarifario:', error);
        window.NotificationUtils.error('Error al exportar: ' + error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// GESTIÓN DE ASIGNACIONES DE TAREAS
// ═══════════════════════════════════════════════════════════════

/**
 * Cargar sección de tareas
 */
async function loadTaskAssignments() {
    console.log('📋 Cargando asignaciones de tareas...');
    await loadCurrentData();
    
    if (!window.PortalDB) {
        console.error('❌ PortalDB no disponible');
        return;
    }
    
    // Cargar filtros (ahora asíncrono)
    await loadTaskFilters();
    
    // Cargar tabla (ahora asíncrono)
    await filterTasks();
    
    console.log('✅ Tareas cargadas');
}

/**
 * Cargar filtros de tareas
 */
async function loadTaskFilters() {
    const currentData = {
        companies: await window.PortalDB.getCompanies(),
        supports: await window.PortalDB.getSupports(),
        users: await window.PortalDB.getUsers()
    };
    
    // Filtro de clientes
    const companyFilter = document.getElementById('taskFilterCompany');
    if (companyFilter) {
        companyFilter.innerHTML = '<option value="">Todos los clientes</option>';
        Object.values(currentData.companies).forEach(company => {
            const option = document.createElement('option');
            option.value = company.companyId;
            option.textContent = company.name;
            companyFilter.appendChild(option);
        });
    }
    
    // Filtro de soportes
    const supportFilter = document.getElementById('taskFilterSupport');
    if (supportFilter) {
        supportFilter.innerHTML = '<option value="">Todos los soportes</option>';
        Object.values(currentData.supports).forEach(support => {
            const option = document.createElement('option');
            option.value = support.supportId;
            option.textContent = support.name;
            supportFilter.appendChild(option);
        });
    }
    
    // Filtro de consultores
    const consultorFilter = document.getElementById('taskFilterConsultor');
    if (consultorFilter) {
        consultorFilter.innerHTML = '<option value="">Todos los consultores</option>';
       Object.values(currentData.users).filter(u => u.role === 'Consultor' || u.role === 'consultor').forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = user.name;
            consultorFilter.appendChild(option);
        });
    }
}

/**
 * Filtrar tareas según criterios
 */
async function filterTasks() {
    const companyId = document.getElementById('taskFilterCompany')?.value || '';
    const supportId = document.getElementById('taskFilterSupport')?.value || '';
    const consultorId = document.getElementById('taskFilterConsultor')?.value || '';
    const status = document.getElementById('taskFilterStatus')?.value || 'active';
    
    const taskAssignments = await window.PortalDB.getTaskAssignments();
    let tasks = Object.values(taskAssignments);
    
    // Aplicar filtros
    if (companyId) {
        tasks = tasks.filter(t => t.companyId === companyId);
    }
    
    if (supportId) {
        tasks = tasks.filter(t => t.linkedSupportId === supportId);
    }
    
    if (consultorId) {
        tasks = tasks.filter(t => t.consultorId === consultorId);
    }
    
    if (status === 'active') {
        tasks = tasks.filter(t => t.isActive);
    } else if (status === 'inactive') {
        tasks = tasks.filter(t => !t.isActive);
    }
    
    // Renderizar tabla (ahora asíncrono)
    await renderTasksTable(tasks);
}

/**
 * Renderizar tabla de tareas
 */
async function renderTasksTable(tasks) {
    const tbody = document.getElementById('taskAssignmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (tasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fa-solid fa-tasks fa-3x"></i>
                    <p>No se encontraron tareas con estos filtros</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const currentData = {
        users: await window.PortalDB.getUsers(),
        companies: await window.PortalDB.getCompanies(),
        supports: await window.PortalDB.getSupports(),
        modules: await window.PortalDB.getModules()
    };
    
    tasks.forEach(task => {
        const consultor = currentData.users[task.consultorId];
        const company = currentData.companies[task.companyId];
        const support = currentData.supports[task.linkedSupportId];
        const module = currentData.modules[task.moduleId];
        
        const row = document.createElement('tr');
        row.className = task.isActive ? '' : 'inactive-row';
        
        row.innerHTML = `
            <td><code>${task.taskAssignmentId || task.taskAssignmentId}</code></td>
            <td>${consultor ? consultor.name : 'N/A'}</td>
            <td>${company ? company.name : 'N/A'}</td>
            <td>${support ? support.name : 'N/A'}</td>
            <td>${module ? module.name : 'N/A'}</td>
            <td class="task-description">${task.descripcion || 'Sin descripción'}</td>
            <td>${formatCurrency(task.tarifaConsultor)}</td>
            <td>${formatCurrency(task.tarifaCliente)}</td>
            <td>
                <span class="status-badge ${task.isActive ? 'active' : 'inactive'}">
                    ${task.isActive ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editTask('${task.taskAssignmentId || 'N/A'}')" title="Editar">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    ${task.isActive ? `
                        <button class="btn-icon btn-danger" onclick="deactivateTask('${task.taskAssignmentId || 'N/A'}')" title="Desactivar">
                            <i class="fa-solid fa-ban"></i>
                        </button>
                    ` : `
                        <button class="btn-icon btn-success" onclick="reactivateTask('${task.taskAssignmentId || 'N/A'}')" title="Reactivar">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    `}
                    <button class="btn-icon" onclick="viewTaskDetails('${task.taskAssignmentId || 'N/A'}')" title="Ver detalles">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Abrir modal para crear tarea
 */
async function openCreateTaskModal() {
    document.getElementById('taskModalTitle').innerHTML = 
        '<i class="fa-solid fa-tasks"></i> Nueva Tarea';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    
    // Cargar opciones (ahora es asíncrono)
    await loadTaskModalOptions();
    
    // Mostrar modal
    document.getElementById('taskModal').style.display = 'flex';
    
    // Limpiar margen
    document.getElementById('taskMargen').textContent = '$0.00';
    document.getElementById('taskMargenPorcentaje').textContent = '(0%)';
}

/**
 * Cargar opciones del modal
 */
async function loadTaskModalOptions() {
    const currentData = {
        companies: await window.PortalDB.getCompanies(),
        users: await window.PortalDB.getUsers(),
        modules: await window.PortalDB.getModules()
    };
    
    // Cargar clientes
    const companySelect = document.getElementById('taskCompany');
    companySelect.innerHTML = '<option value="">Seleccionar cliente...</option>';
    Object.values(currentData.companies).forEach(company => {
        const option = document.createElement('option');
        option.value = company.companyId;
        option.textContent = company.name;
        companySelect.appendChild(option);
    });
    
    const consultorSelect = document.getElementById('taskConsultor');
    consultorSelect.innerHTML = '<option value="">Seleccionar consultor...</option>';
    Object.values(currentData.users)
        .filter(u => u.role === 'Consultor' || u.role === 'consultor')
        .forEach(user => {
            const option = document.createElement('option');
            option.value = user.userId;
            option.textContent = user.name;
            consultorSelect.appendChild(option);
        });
    
    const moduleSelect = document.getElementById('taskModule');
    moduleSelect.innerHTML = '<option value="">Seleccionar módulo...</option>';
    Object.values(currentData.modules).forEach(module => {
        const option = document.createElement('option');
        option.value = module.moduleId;
        option.textContent = module.name;
        moduleSelect.appendChild(option);
    });
}


/**
 * Cargar soportes por cliente
 */
async function loadSupportsByCompany(companyId) {
    const supportSelect = document.getElementById('taskSupport');
    supportSelect.innerHTML = '<option value="">Seleccionar soporte...</option>';
    
    if (!companyId) {
        supportSelect.disabled = true;
        return;
    }
    
    // ✅ CORREGIDO: Obtener soportes a través de las asignaciones (ahora asíncrono)
    const assignments = await window.PortalDB.getAssignments();
    const supports = await window.PortalDB.getSupports();
    
    // Buscar asignaciones de este cliente
    const companyAssignments = Object.values(assignments).filter(a => 
        a.companyId === companyId && a.isActive
    );
    
    // Obtener IDs únicos de soportes
    const supportIds = new Set();
    companyAssignments.forEach(assignment => {
        if (assignment.supportId) {
            supportIds.add(assignment.supportId);
        }
    });
    
    // Convertir a array de objetos de soporte
    const companySupports = Array.from(supportIds)
        .map(id => supports[id])
        .filter(s => s && s.isActive);
    
    if (companySupports.length === 0) {
        supportSelect.innerHTML = '<option value="">No hay soportes disponibles para este cliente</option>';
        supportSelect.disabled = true;
        return;
    }
    
   
         // Agregar soportes al select
        companySupports.forEach(support => {
        const option = document.createElement('option');
        option.value = support.supportId;
        option.textContent = support.name;
        supportSelect.appendChild(option);
    });

    supportSelect.disabled = false;
    
    console.log(`✅ ${companySupports.length} soportes cargados para el cliente`);
}

/**
 * Calcular margen de la tarea
 */
function calculateTaskMargen() {
    const tarifaConsultor = parseFloat(document.getElementById('taskTarifaConsultor').value) || 0;
    const tarifaCliente = parseFloat(document.getElementById('taskTarifaCliente').value) || 0;
    
    const margen = tarifaCliente - tarifaConsultor;
    const porcentaje = tarifaConsultor > 0 ? (margen / tarifaConsultor) * 100 : 0;
    
    document.getElementById('taskMargen').textContent = formatCurrency(margen);
    document.getElementById('taskMargenPorcentaje').textContent = `(${porcentaje.toFixed(1)}%)`;
    
    // Cambiar color según margen
    const margenElement = document.getElementById('taskMargen');
    if (margen < 0) {
        margenElement.style.color = 'var(--danger-color)';
    } else if (margen > 0) {
        margenElement.style.color = 'var(--success-color)';
    } else {
        margenElement.style.color = 'var(--gray-600)';
    }
}

/**
 * Guardar tarea (crear o actualizar)
 */
async function saveTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const taskData = {
        consultorId: document.getElementById('taskConsultor').value,
        companyId: document.getElementById('taskCompany').value,
        linkedSupportId: document.getElementById('taskSupport').value,
        moduleId: document.getElementById('taskModule').value,
        descripcion: document.getElementById('taskDescription').value,
        tarifaConsultor: parseFloat(document.getElementById('taskTarifaConsultor').value),
        tarifaCliente: parseFloat(document.getElementById('taskTarifaCliente').value)
    };
    
    let result;
    if (taskId) {
        // Actualizar
        result = await window.PortalDB.updateTaskAssignment(taskId, taskData);
    } else {
        // Crear - Generar ID para nueva tarea
        const timestamp = Date.now().toString().slice(-6);
        taskData.taskAssignmentId = `TASK${timestamp}`;
        
        result = await window.PortalDB.createTaskAssignment(taskData);
    }
    
    if (result.success) {
        window.NotificationUtils.success(
            taskId ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente'
        );
        closeTaskModal();
        
        // Recargar datos antes de filtrar
        await loadAllData();
        await filterTasks();
    } else {
        window.NotificationUtils.error('Error: ' + result.message);
    }
}

/**
 * Cerrar modal de tareas
 */
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

/**
 * Editar tarea
 */
async function editTask(taskAssignmentId) {
    const task = await window.PortalDB.getTaskAssignment(taskAssignmentId);

    if (!task) {
        window.NotificationUtils.error('Tarea no encontrada');
        return;
    }
    
    // Cargar opciones primero
    await loadTaskModalOptions();
    
    // Llenar formulario
    document.getElementById('taskModalTitle').innerHTML = 
        '<i class="fa-solid fa-edit"></i> Editar Tarea';
    document.getElementById('taskId').value = task.taskAssignmentId;
    document.getElementById('taskCompany').value = task.companyId;
    
    // Cargar soportes y seleccionar
    await loadSupportsByCompany(task.companyId);
    setTimeout(() => {
        document.getElementById('taskSupport').value = task.linkedSupportId;
    }, 100);
    
    document.getElementById('taskConsultor').value = task.consultorId;
    document.getElementById('taskModule').value = task.moduleId;
    document.getElementById('taskDescription').value = task.descripcion;
    document.getElementById('taskTarifaConsultor').value = task.tarifaConsultor;
    document.getElementById('taskTarifaCliente').value = task.tarifaCliente;
    
    // Calcular margen
    calculateTaskMargen();
    
    // Mostrar modal
    document.getElementById('taskModal').style.display = 'flex';
}

/**
 * Desactivar tarea
 */
async function deactivateTask(taskId) {

    if (!confirm('¿Estás seguro de desactivar esta tarea? La tarea seguirá en el historial pero no estará visible')) {
        return;
    }
    
    try {

        const result = await window.PortalDB.updateTaskAssignment(taskId, { isActive: false });
        
        if (result.success) {
            window.NotificationUtils.success('Tarea desactivada correctamente');
            
            // Recargar datos antes de filtrar
            await loadTaskAssignments();
            await filterTasks();
            await loadAllData();
        
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Error al intentar desactivar la tarea:', error);
        window.NotificationUtils.error('Error al desactivar tarea');
    }
}

/**
 * Reactivar tarea
 */
async function reactivateTask(taskId) { 

    try {

        console.log('Reactivando tarea:', taskId);
        const result = await window.PortalDB.updateTaskAssignment(taskId, { isActive: true });

        if (result.success) {
            window.NotificationUtils.success('Tarea reactivada correctamente');
            await filterTasks();
        } else {
            window.NotificationUtils.error('Error: ' + result.message);
        }

    } catch (error) {
        console.error('Error:', error);
        window.NotificationUtils.error('Error al reactivar tarea');
    }
}

/**
 * Ver detalles de tarea
 */
async function viewTaskDetails(taskId) {

    try {

        const task = await window.PortalDB.getTaskAssignment(taskId);
        
        if (!task) {
            window.NotificationUtils.error('Tarea no encontrada');
            return;
        }
        
        const currentData = {
            users: await window.PortalDB.getUsers(),
            companies: await window.PortalDB.getCompanies(),
            supports: await window.PortalDB.getSupports(),
            modules: await window.PortalDB.getModules()
        };
        
        const consultor = currentData.users[task.consultorId];
        const company = currentData.companies[task.companyId];
        const support = currentData.supports[task.linkedSupportId];
        const module = currentData.modules[task.moduleId];
        
        const margen = task.tarifaCliente - task.tarifaConsultor;
        const porcentaje = task.tarifaConsultor > 0 ? (margen / task.tarifaConsultor) * 100 : 0;
        
        const details = `
        ═══════════════════════════════════════
        Detalles de Tarea
        ═══════════════════════════════════════

        Id: ${task.taskAssignmentId || task.taskAssignmentId}
        Estado: ${task.isActive ? 'Activa' : 'Inactiva'}

        Consultor
        ${consultor ? consultor.name : 'N/A'}
        Id: ${task.consultorId}

        Cliente
        ${company ? company.name : 'N/A'}
        Id: ${task.companyId}

        Soporte Padre
        ${support ? support.name : 'N/A'}
        Id: ${task.linkedSupportId}

        Módulo
        ${module ? module.name : 'N/A'}
        Id: ${task.moduleId}

        Descripción
        ${task.descripcion || 'Sin descripción'}

        Tarifas
        Consultor: ${formatCurrency(task.tarifaConsultor)}/hora
        Cliente:   ${formatCurrency(task.tarifaCliente)}/hora
        Margen:    ${formatCurrency(margen)} (${porcentaje.toFixed(1)}%)

        Fechas
        Creada:      ${window.DateUtils ? window.DateUtils.formatDate(task.createdAt) : task.createdAt}
        Actualizada: ${window.DateUtils ? window.DateUtils.formatDate(task.updatedAt) : task.updatedAt}

        ═══════════════════════════════════════
        `;
        
        alert(details);

    } catch (error) {
        window.NotificationUtils.error('Error al obtener detalles de la tarea: ' + error.message);
    }
}

// Contador de caracteres para descripción
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('taskDescription');
    const counter = document.getElementById('taskDescriptionCount');
    
    if (textarea && counter) {
        textarea.addEventListener('input', function() {
            counter.textContent = this.value.length;
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// FUNCIONES PARA POBLAR CONSULTORES
// ═══════════════════════════════════════════════════════════════

function populateTaskConsultors() {
    console.log('🔄 Poblando consultores en modal de tarea...');
    
    const consultorSelect = document.getElementById('taskConsultor');
    if (!consultorSelect) {
        console.error('❌ No se encontró #taskConsultor');
        return;
    }
    
    // Limpiar opciones actuales (mantener solo el placeholder)
    consultorSelect.innerHTML = '<option value="">Seleccionar consultor...</option>';
    
    // Obtener consultores de la BD
    const users = window.PortalDB.getUsers();
    const consultores = Object.values(users).filter(u => 
        u.role === 'Consultor' || u.role === 'consultor'
    );
    
    console.log(`   ✓ Consultores encontrados: ${consultores.length}`);
    
    // Agregar cada consultor como opción
    consultores.forEach(consultor => {
        const option = document.createElement('option');
        option.value = consultor.id;
        option.textContent = consultor.name;
        consultorSelect.appendChild(option);
    });
    
    console.log(`✅ ${consultores.length} consultores agregados al dropdown`);
}

function populateTaskConsultorFilter() {
    console.log('🔄 Poblando filtro de consultores...');
    
    const filterSelect = document.getElementById('taskConsultantFilter');
    if (!filterSelect) {
        console.warn('⚠️ Filtro #taskConsultantFilter no existe, saltando...');
        return;
    }
    
    // Limpiar y agregar opción "Todos"
    filterSelect.innerHTML = '<option value="all">Todos los consultores</option>';
    
    // Obtener consultores
    const users = window.PortalDB.getUsers();
    const consultores = Object.values(users).filter(u => 
        u.role === 'Consultor' || u.role === 'consultor'
    );
    
    // Agregar consultores al filtro
    consultores.forEach(consultor => {
        const option = document.createElement('option');
        option.value = consultor.id;
        option.textContent = consultor.name;
        filterSelect.appendChild(option);
    });
    
    console.log(`✅ ${consultores.length} consultores en filtro`);
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES PARA REPORTES MEJORADOS
// ═══════════════════════════════════════════════════════════════

/**
 * Generar detalle contextual para reportes
 */
function generarDetalleContextual(assignmentType, tarifa) {
    if (assignmentType === 'support') {
        // Para soporte directo: mostrar módulo
        return `Módulo: ${tarifa.moduloNombre}`;
        
    } else if (assignmentType === 'task') {
        // Para tarea: mostrar descripción + módulo
        return `${tarifa.descripcionTarea} (${tarifa.moduloNombre})`;
        
    } else if (assignmentType === 'project') {
        // Para proyecto: mostrar módulo del proyecto
        return `Proyecto: ${tarifa.moduloNombre}`;
    }
    
    return 'N/A';
}

/**
 * Generar badge de origen para columna
 */
function generarBadgeOrigen(origen) {
    const badges = {
        'SUPPORT': '<span class="origen-badge soporte"><i class="fa-solid fa-headset"></i> SOPORTE</span>',
        'TASK': '<span class="origen-badge tarea"><i class="fa-solid fa-tasks"></i> TAREA</span>',
        'PROJECT': '<span class="origen-badge proyecto"><i class="fa-solid fa-folder"></i> PROYECTO</span>'
    };
    
    return badges[origen] || origen;
}

/**
 * Generar línea de reporte con nueva estructura
 */
function generarLineaReporteMejorada(report, tipoReporte) {
    // 1. Obtener tarifa del tarifario (fuente única de verdad)
    const tarifario = currentData.tarifario;
    const tarifa = tarifario[report.assignmentId];

    if (!tarifa) {
        console.warn('No se encontró tarifa para:', report.assignmentId);
        return null;
    }
    
    // 2. Determinar qué tarifa usar según el tipo de reporte
    const tarifaAUsar = tipoReporte.includes('consultor') 
        ? tarifa.costoConsultor 
        : tarifa.costoCliente;
    
    // 3. Generar detalle contextual
    const detalle = generarDetalleContextual(report.assignmentType, tarifa);
    
    // 4. Construir línea completa
    return {
        consultorId: tarifa.consultorId,
        consultorNombre: tarifa.consultorNombre,
        trabajoNombre: tarifa.trabajoNombre,
        origen: report.assignmentType.toUpperCase(),  // ✅ NUEVO //Aquí es donde obtengo el origen del reporte (soporte, tarea o proyecto) en mayúsculas
        detalle: detalle,                              // ✅ NUEVO 
        moduloNombre: tarifa.moduloNombre,
        descripcionTarea: tarifa.descripcionTarea || null,
        horas: report.hours,
        tarifa: tarifaAUsar,
        total: report.hours * tarifaAUsar
    };
}

// Busca esta función en admin.js (aprox línea 8300-8400)
async function exportData() {
    try {
        const data = await window.PortalDB.exportData();
        
        if (!data) {
            window.NotificationUtils.error('Error al exportar datos');
            return;
        }
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `arvic_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        window.NotificationUtils.success('Datos exportados exitosamente');
    } catch (error) {
        console.error('Error exportando:', error);
        window.NotificationUtils.error('Error al exportar datos');
    }
}

async function loadCurrentData(forceReload = false) {
    const now = Date.now();

    if (!forceReload && currentData && dataCacheTimestamp) {
        if (now - dataCacheTimestamp < CACHE_DURATION) {
            console.log('Usando datos en caché');
            return currentData;
        }
    }

    console.log('Cargando datos actuales para reportes...');

    try {
        // USAR AWAIT para esperar que las promesas se resuelvan
        currentData = {
            users: await window.PortalDB.getUsers() || {},
            companies: await window.PortalDB.getCompanies() || {},
            supports: await window.PortalDB.getSupports() || {},
            modules: await window.PortalDB.getModules() || {},
            projects: await window.PortalDB.getProjects() || {},
            assignments: await window.PortalDB.getAssignments() || {},
            projectAssignments: await window.PortalDB.getProjectAssignments() || {},
            taskAssignments: await window.PortalDB.getTaskAssignments() || {},
            reports: await window.PortalDB.getReports() || {},
            tarifario: await window.PortalDB.getTarifario() || {}
        };
        
        dataCacheTimestamp = now;

        console.log('Datos cargados correctamente:', {
            users: Object.keys(currentData.users).length,
            companies: Object.keys(currentData.companies).length,
            supports: Object.keys(currentData.supports).length,
            modules: Object.keys(currentData.modules).length,
            projects: Object.keys(currentData.projects).length,
            assignments: Object.keys(currentData.assignments).length,
            projectAssignments: Object.keys(currentData.projectAssignments).length,
            taskAssignments: Object.keys(currentData.taskAssignments).length,
            reports: Object.keys(currentData.reports).length
        });
        
        return currentData;
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        // Inicializar con objetos vacíos para evitar errores
        currentData = {
            users: {},
            companies: {},
            supports: {},
            modules: {},
            projects: {},
            assignments: {},
            projectAssignments: {},
            taskAssignments: {},
            reports: {},
            tarifario: {}
        };
        return currentData;
    }
}

// AGREGAR ESTA FUNCIÓN ANTES DE window.importData = importData;
async function importData() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    console.log('Datos a importar:', data);
                    window.NotificationUtils.warning('Función de importación en desarrollo');
                } catch (error) {
                    console.error('Error parseando archivo:', error);
                    window.NotificationUtils.error('Error: Archivo JSON inválido');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    } catch (error) {
        console.error('Error en importación:', error);
        window.NotificationUtils.error('Error al importar datos');
    }
}


// === FUNCIONES EXPORTADAS GLOBALMENTE ===
window.showSection = showSection;
window.openUserModal = openUserModal;
window.openCompanyModal = openCompanyModal;
window.openSupportModal = openSupportModal;
window.deleteSupport = deleteSupport;
window.openProjectModal = openProjectModal;
window.openModuleModal = openModuleModal;
window.closeModal = closeModal;
window.deleteUser = deleteUser;
window.deleteCompany = deleteCompany;
window.deleteProject = deleteProject;
window.deleteModule = deleteModule;
window.createAssignment = createAssignment;
window.deleteAssignment = deleteAssignment;
window.createProjectAssignment = createProjectAssignment;
window.deleteProjectAssignment = deleteProjectAssignment;
window.updateProjectAssignmentDropdowns = updateProjectAssignmentDropdowns;
window.approveReport = approveReport;
window.rejectReport = rejectReport;
window.logout = logout;
window.exportData = exportData;
window.importData = importData;
window.editUser = editUser;
window.handleEditUser = handleEditUser;
window.closeEditUserModal = closeEditUserModal;
window.generateRandomPasswordForEdit = generateRandomPasswordForEdit;
window.validateConsultorPassword = validateConsultorPassword;
//window.generateAdminReport = generateAdminReport;
window.viewReport = viewReport;
window.updateApprovedReportsList = updateApprovedReportsList;
window.updateProjectsList = updateProjectsList;
window.updateModulesList = updateModulesList;
window.updateAssignmentsList = updateAssignmentsList;
window.setAssignmentsFilter = setAssignmentsFilter;
window.setAssignmentsPageSize = setAssignmentsPageSize;
window.changeAssignmentsPage = changeAssignmentsPage;
window.filterAssignmentsList = filterAssignmentsList;
window.updateUsersList = updateUsersList;
window.viewUserAssignments = viewUserAssignments;
window.updateGeneratedReportsList = updateGeneratedReportsList;
window.refreshGeneratedReportsList = refreshGeneratedReportsList;
window.deleteGeneratedReportFromHistory = deleteGeneratedReportFromHistory;
window.saveToReportHistory = saveToReportHistory;
window.filterReportsByCategory = filterReportsByCategory;
window.initializeReportsFilters = initializeReportsFilters;
window.getReportCategory = getReportCategory;
window.updateReportsListWithFilter = updateReportsListWithFilter;
window.calculateMargen = calculateMargen;
window.calculateMargenPorcentaje = calculateMargenPorcentaje;
window.updateAssignMargen = updateAssignMargen;
window.updateProjectAssignMargen = updateProjectAssignMargen;
window.initializeTarifaListeners = initializeTarifaListeners;
window.initializeProjectTarifaListeners = initializeProjectTarifaListeners;
window.loadTarifario = loadTarifario;
window.updateTarifarioTable = updateTarifarioTable;
window.updateConsultoresTable = updateConsultoresTable;
window.updateTarifarioStats = updateTarifarioStats;
window.filterTarifarioByType = filterTarifarioByType;
window.applyTablePagination = applyTablePagination;
window.refreshTablePagination = refreshTablePagination;
window.editTarifaInline = editTarifaInline;
window.saveTarifaEdit = saveTarifaEdit;
window.viewTarifaDetails = viewTarifaDetails;
window.exportTarifarioToExcel = exportTarifarioToExcel;
window.detectarAsignacionesSinTarifas = detectarAsignacionesSinTarifas;
window.mostrarModalConfigurarTarifas = mostrarModalConfigurarTarifas;
window.abrirFormularioTarifa = abrirFormularioTarifa;
window.guardarTarifaAsignacion = guardarTarifaAsignacion;
window.cerrarModalTarifas = cerrarModalTarifas;
window.cerrarFormularioTarifa = cerrarFormularioTarifa;
window.silentAdminRefresh = silentAdminRefresh;
window.isAdminInteracting = isAdminInteracting;

// === GESTIÓN MAESTRA (SISTEMA HÍBRIDO) ===

/**
 * Cambia entre las pestañas maestras de gestión
 */
window.switchMasterTab = async function(tabId) {
    console.log(`📑 Cambiando a pestaña maestra: ${tabId}`);
    
    // Actualizar botones de pestañas
    document.querySelectorAll('.master-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${tabId}'`)) {
            btn.classList.add('active');
        }
    });

    // Mostrar el panel correspondiente
    document.querySelectorAll('.master-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add('active');

    // Cargar datos según la pestaña
    await loadCurrentData(true); // Forzar recarga de datos

    switch(tabId) {
        case 'empresas':
            renderHierarchicalDirectory();
            break;
        case 'usuarios':
            renderMasterUsersList();
            break;
        case 'tarifario':
            renderMasterTarifarioList();
            break;
        case 'config':
            renderMasterConfig();
            break;
    }
};

/**
 * Renderiza el directorio jerárquico de Clientes -> Proyectos -> Asignaciones
 */
window.renderHierarchicalDirectory = function() {
    console.log('🏗️ Renderizando Directorio Jerárquico...');
    const container = document.getElementById('hierarchicalDirectory');
    if (!container) {
        console.error('❌ Contenedor hierarchicalDirectory no encontrado');
        return;
    }

    // Limpiar el estado de carga inicial OBLIGATORIAMENTE
    container.innerHTML = '';

    const companies = Object.values(currentData.companies || {});
    console.log(`📊 Directorio Jerárquico: Renderizando ${companies.length} empresas`);
    
    if (companies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-building-circle-exclamation" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                <div class="empty-state-title">No hay empresas registradas</div>
                <div class="empty-state-desc">Comience agregando una nueva empresa cliente.</div>
                <button class="btn btn-primary" onclick="openCompanyModal()" style="margin-top: 1rem;">+ Regístrar Empresa</button>
            </div>
        `;
        return;
    }
    
    // Ordenar empresas por nombre
    companies.sort((a, b) => a.name.localeCompare(b.name)).forEach(company => {
        const companyId = company.companyId;
        
        // Obtener proyectos de esta empresa
        const projects = Object.values(currentData.projects || {}).filter(p => p.companyId === companyId);
        
        const companyItem = document.createElement('div');
        companyItem.className = 'hierarchy-item';
        companyItem.innerHTML = `
            <div class="hierarchy-node" onclick="this.parentElement.classList.toggle('expanded')">
                <i class="fa-solid fa-chevron-right toggle-icon"></i>
                <i class="fa-solid fa-building" style="color: var(--primary-color)"></i>
                <span class="node-title">${company.name}</span>
                <span class="node-badge">${projects.length} Proyectos</span>
                <div class="node-actions">
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); editCompany('${companyId}')"><i class="fa-solid fa-edit"></i></button>
                </div>
            </div>
            <div class="hierarchy-children" id="children-${companyId}">
                <!-- Proyectos se cargan aquí -->
            </div>
        `;
        
        const childrenContainer = companyItem.querySelector('.hierarchy-children');
        
        if (projects.length === 0) {
            childrenContainer.innerHTML = '<div style="padding: 10px 52px; color: #94a3b8; font-size: 0.85rem;">Sin proyectos registrados</div>';
        } else {
            projects.forEach(project => {
                const projectId = project.projectId;
                
                // Obtener asignaciones de este proyecto (Soporte o Proyecto Directo)
                const projectAsg = Object.values(currentData.projectAssignments || {}).filter(a => a.projectId === projectId);
                
                const projectDiv = document.createElement('div');
                projectDiv.className = 'child-project-wrapper';
                projectDiv.innerHTML = `
                    <div class="child-project">
                        <div class="project-info">
                            <span class="project-name"><i class="fa-solid fa-folder-open"></i> ${project.name}</span>
                            <span class="project-details">${projectAsg.length} Consultores asignados</span>
                        </div>
                        <div class="project-actions">
                            <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); editProject('${projectId}')">Editar</button>
                        </div>
                    </div>
                    <div class="child-assignments">
                        ${projectAsg.map(asg => {
                            const consultor = currentData.users[asg.consultorId];
                            return `
                                <div class="assignment-mini-pill">
                                    <span class="consultant-name"><i class="fa-solid fa-user"></i> ${consultor?.name || 'Desconocido'}</span>
                                    <span class="rate-info">$${asg.tarifaCliente || 0}/hr</span>
                                    <button class="btn btn-xs text-danger" onclick="deleteProjectAssignment('${asg.projectAssignmentId}')"><i class="fa-solid fa-times"></i></button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                childrenContainer.appendChild(projectDiv);
            });
        }
        
        container.appendChild(companyItem);
    });
};

/**
 * Renderiza la lista de usuarios en la pestaña maestra
 */
window.renderMasterUsersList = function() {
    // La función updateUsersList ahora detecta automáticamente usersMasterList
    updateUsersList();
};

/**
 * Renderiza el tarifario en la pestaña maestra
 */
window.renderMasterTarifarioList = function() {
    const container = document.getElementById('tarifarioMasterList');
    if (!container) return;
    
    loadTarifario().then(() => {
        const source = document.getElementById('tarifarioTableBody');
        if (source) {
            // Aquí podríamos crear una vista más compacta o reutilizar la tabla
            container.innerHTML = `
                <table class="reports-table">
                    <thead>
                        <tr>
                            <th>Entidad</th>
                            <th>Consultor</th>
                            <th>Tarifa</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${source.innerHTML}
                    </tbody>
                </table>
            `;
        }
    });
};

window.renderMasterConfig = function() {
    // Estas funciones ahora manejan el renderizado de catálogos
    updateMasterCatalogs();
};

/**
 * Renderiza de forma completa los catálogos del sistema (Soportes y Módulos)
 */
async function updateMasterCatalogs() {
    const supportsContainer = document.getElementById('supportsMasterList');
    const modulesContainer = document.getElementById('modulesMasterList');
    
    if (!supportsContainer || !modulesContainer) return;
    
    await loadCurrentData();
    
    // Render Soportes
    const supports = Object.values(currentData.supports || {});
    if (supports.length === 0) {
        supportsContainer.innerHTML = '<div class="empty-mini">No hay soportes</div>';
    } else {
        supportsContainer.innerHTML = supports.map(s => `
            <div class="catalog-item">
                <span class="catalog-name">${s.name}</span>
                <div class="catalog-actions">
                    <button class="btn-icon" onclick="deleteSupport('${s.id}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    // Render Módulos
    const modules = Object.values(currentData.modules || {});
    if (modules.length === 0) {
        modulesContainer.innerHTML = '<div class="empty-mini">No hay módulos</div>';
    } else {
        modulesContainer.innerHTML = modules.map(m => `
            <div class="catalog-item">
                <span class="catalog-name">${m.name}</span>
                <div class="catalog-actions">
                    <button class="btn-icon" onclick="deleteModule('${m.id}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `).join('');
    }
}

console.log('✅ Funciones de asignación de proyectos cargadas');
console.log('✅ Funciones del administrador exportadas globalmente');

// CÓDIGO TEMPORAL DE DIAGNÓSTICO
window.addEventListener('load', function() {
    setTimeout(() => {
        console.log('🔍 DIAGNÓSTICO COMPLETO:');
        
        // Verificar elementos
        const elements = ['assignUser', 'assignCompany', 'assignSupport', 'assignModule'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            console.log(`${id}:`, el ? '✅ Existe' : '❌ NO EXISTE');
        });
        
        // Verificar si la sección existe
        const section = document.getElementById('crear-asignacion-section');
        console.log('crear-asignacion-section:', section ? '✅ Existe' : '❌ NO EXISTE');
        
        // Mostrar todas las secciones disponibles
        const allSections = document.querySelectorAll('[id$="-section"]');
        console.log('📝 Secciones disponibles:');
        allSections.forEach(s => console.log(`  - ${s.id}`));
        
    }, 1000);
});

// Función para actualizar el avatar del header con la foto del usuario
function updateHeaderAvatar(photoUrl) {
    const avatar = document.querySelector('.user-avatar');
    if (avatar && photoUrl) {
        avatar.innerHTML = `<img src="${photoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
}

// Escuchar cargas iniciales para poner la foto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const session = JSON.parse(localStorage.getItem('arvic_current_session'));
        if (session && session.user && session.user.profilePhoto) {
            updateHeaderAvatar(session.user.profilePhoto);
        }
    }, 1500);
});

// === QUICK ACTIONS Y SELECCIÓN MASIVA ===

window.handleQuickAction = async function(selectElement, reportId) {
    const action = selectElement.value;
    selectElement.value = ''; // Reset select
    
    if (!action) return;
    
    switch (action) {
        case 'view':
            await viewReport(reportId);
            break;
        case 'approve':
            await approveReport(reportId);
            break;
        case 'reject':
            await rejectReport(reportId);
            break;
    }
};

window.toggleAllReportsSelection = function(checkbox) {
    const checkboxes = document.querySelectorAll('.report-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateMassApprovalTools();
};

window.toggleReportSelection = function() {
    updateMassApprovalTools();
};

window.updateMassApprovalTools = function() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    const toolsContainer = document.getElementById('massApprovalTools');
    const countDisplay = document.getElementById('selectedReportsCount');
    
    if (checkboxes.length > 0) {
        toolsContainer.style.display = 'flex';
        countDisplay.textContent = `${checkboxes.length} reporte${checkboxes.length > 1 ? 's' : ''} seleccionado${checkboxes.length > 1 ? 's' : ''}`;
    } else {
        toolsContainer.style.display = 'none';
        
        // Uncheck 'Select All' if no items are selected
        const selectAll = document.getElementById('selectAllReports');
        if (selectAll) selectAll.checked = false;
    }
};

window.approveSelectedReports = async function() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const reportIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (!confirm(`¿Está seguro de aprobar los ${reportIds.length} reportes seleccionados de manera masiva?`)) {
        return;
    }
    
    const btnApprove = document.getElementById('btnApproveSelected');
    if (window.SpinnerUtils) window.SpinnerUtils.showButtonSpinner(btnApprove, 'Procesando...');
    
    try {
        const response = await fetch('/api/reports/mass-update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportIds: reportIds,
                status: 'Aprobado'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.NotificationUtils?.success(`${data.modifiedCount} reportes aprobados exitosamente.`);
            
            // Re-fetch everything and update table
            await loadAllData();
            
            // Uncheck "Select All" and hide tools
            const selectAll = document.getElementById('selectAllReports');
            if (selectAll) selectAll.checked = false;
            updateMassApprovalTools();
        } else {
            throw new Error(data.message || 'Error al aprobar reportes masivamente');
        }
    } catch (error) {
        console.error('❌ Error en aprobación masiva:', error);
        window.NotificationUtils?.error('Error en aprobación masiva: ' + error.message);
    } finally {
        if (window.SpinnerUtils) window.SpinnerUtils.hideButtonSpinner(btnApprove);
    }
};

// === ACTUALIZACIÓN KPIs DASHBOARD ===
// KPIs removed from UI - function kept as no-op for compatibility
window.updateDashboardKPIs = function() {
    // KPI cards were removed from the dashboard
};

// === OMNI-CREATE WIZARD ===
window.openOmniCreateDrawer = function() {
    const html = `
        <div class="omni-options-grid">
            <div class="omni-option-card" onclick="SideDrawerUtils.close(); setTimeout(() => openCompanyModal(), 300)">
                <i class="fa-solid fa-building"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:#1e293b;">Empresa Cliente</h4>
                <small style="color:#64748b; font-size:0.85em;">Registrar un nuevo cliente</small>
            </div>
            
            <div class="omni-option-card" onclick="SideDrawerUtils.close(); setTimeout(() => openProjectModal(), 300)">
                <i class="fa-solid fa-folder-plus"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:#1e293b;">Proyecto</h4>
                <small style="color:#64748b; font-size:0.85em;">Crear un nuevo proyecto</small>
            </div>
            
            <div class="omni-option-card" onclick="SideDrawerUtils.close(); setTimeout(() => openSupportModal(), 300)">
                <i class="fa-solid fa-headset"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:#1e293b;">Soporte</h4>
                <small style="color:#64748b; font-size:0.85em;">Añadir tipo de soporte base</small>
            </div>
            
            <div class="omni-option-card" onclick="SideDrawerUtils.close(); setTimeout(() => openModuleModal(), 300)">
                <i class="fa-solid fa-puzzle-piece"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:#1e293b;">Módulo</h4>
                <small style="color:#64748b; font-size:0.85em;">Registrar módulo del sistema</small>
            </div>

            <div class="omni-option-card" onclick="SideDrawerUtils.close(); setTimeout(() => openUserModal(), 300)">
                <i class="fa-solid fa-user-plus"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:#1e293b;">Nuevo Usuario</h4>
                <small style="color:#64748b; font-size:0.85em;">Consultor, Admin o Cliente</small>
            </div>
            
            <div class="omni-option-card" style="background:var(--color-arvic-primary); color:white; border-color:var(--color-arvic-secondary);" onclick="SideDrawerUtils.close(); setTimeout(() => showSection('crear-asignacion-section'), 300)">
                <i class="fa-solid fa-link" style="color:white;"></i>
                <h4 style="margin:10px 0; font-size:1.1rem; color:white;">Asignación Completa</h4>
                <small style="color:#e2e8f0; font-size:0.85em;">Asignar consultor a cliente/proyecto</small>
            </div>
        </div>
        <div style="margin-top:25px; text-align:center; color:#64748b; padding-top:20px; border-top:1px dashed #cbd5e1;">
            <p style="font-size:0.9em;">💡 Selecciona qué deseas crear. Usaremos paneles laterales para que no pierdas tu contexto actual de trabajo.</p>
        </div>
    `;
    
    if (window.SideDrawerUtils) {
        SideDrawerUtils.open('¿Qué deseas registrar?', html);
    }
};

// ==============================================
// PANEL GENERAL + CRUD SECTIONS — RENDER FUNCTIONS
// ==============================================



/**
 * Renderiza la tabla de Timesheets Semanales para el admin
 */
async function renderAdminTimesheets() {
    console.log('📊 Renderizando timesheets para admin...');
    
    // Sincronizar reportes desde MongoDB Atlas para reconstruir timesheets
    if (window.PortalDB && window.PortalDB.getReports) {
        try {
            await window.PortalDB.getReports();
        } catch (e) {
            console.error('Error al sincronizar reportes en renderAdminTimesheets:', e);
        }
    }
    
    const tbody = document.getElementById('adminTimesheetsBody');
    if (!tbody) {
        console.warn('adminTimesheetsBody not found');
        return;
    }
    
    // Get filter value
    const filterEl = document.getElementById('tsFilterStatus');
    const filterStatus = filterEl ? filterEl.value : 'Pendiente';
    
    // Get timesheets from PortalDB
    let timesheets = {};
    if (window.PortalDB.getTimesheets) {
        timesheets = window.PortalDB.getTimesheets() || {};
    }
    
    let tsArray = Object.values(timesheets);
    
    // Apply filter
    if (filterStatus !== 'all') {
        tsArray = tsArray.filter(ts => ts.status === filterStatus);
    }
    
    // Sort by weekStart descending
    tsArray.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
    
    if (tsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="empty-cell"><i class="fa-solid fa-inbox"></i> No hay timesheets ${filterStatus !== 'all' ? 'con estado "' + filterStatus + '"' : ''}</td></tr>`;
        return;
    }
    
    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    let html = '';
    for (const ts of tsArray) {
        // Get user name
        const userName = ts.userName || ts.userId || 'Desconocido';
        
        // Calculate day totals from entries
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];
        if (ts.entries && Array.isArray(ts.entries)) {
            ts.entries.forEach(entry => {
                DAY_KEYS.forEach((dk, i) => {
                    dayTotals[i] += (entry.days?.[dk]?.hours || 0);
                });
            });
        }
        
        const totalHours = ts.totalWeekHours || dayTotals.reduce((a, b) => a + b, 0);
        
        // Status badge
        const statusClass = ts.status === 'Aprobado' ? 'active' : 
                           ts.status === 'Rechazado' ? 'inactive' : '';
        
        // Actions
        let actionsHtml = '';
        if (ts.status === 'Pendiente') {
            actionsHtml = `
                <button class="btn btn-sm" style="background:#10b981; color:white; padding:4px 10px; border:none; border-radius:4px; cursor:pointer; margin-right:4px;" onclick="approveTimesheet('${ts.timesheetId}')" title="Aprobar">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn btn-sm" style="background:#ef4444; color:white; padding:4px 10px; border:none; border-radius:4px; cursor:pointer;" onclick="rejectTimesheet('${ts.timesheetId}')" title="Rechazar">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
        } else {
            actionsHtml = `<span style="color:#9ca3af; font-size:0.85em;">${ts.status}</span>`;
        }
        
        html += `
            <tr>
                <td><strong>${userName}</strong></td>
                <td><small>${ts.weekStart || '—'} — ${ts.weekEnd || '—'}</small></td>
                ${dayTotals.map(h => `<td style="text-align:center;">${h > 0 ? h.toFixed(1) : '—'}</td>`).join('')}
                <td style="text-align:center; font-weight:600;">${totalHours > 0 ? totalHours.toFixed(1) : '0'}</td>
                <td><span class="crud-status-badge ${statusClass}">${ts.status}</span></td>
                <td>${actionsHtml}</td>
                <td>
                    <button class="btn" style="padding:4px 10px; font-size:0.82em; background:#1B3A5C; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="openActivityReport('${ts.timesheetId}')" title="Generar Reporte de Actividades">
                        <i class="fa-solid fa-file-lines"></i> Reporte
                    </button>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
    console.log(`✅ ${tsArray.length} timesheets renderizados`);
}

// Make renderAdminTimesheets globally accessible
window.renderAdminTimesheets = renderAdminTimesheets;

/**
 * Approve a weekly timesheet
 */
async function approveTimesheet(timesheetId) {
    if (!confirm('¿Aprobar este timesheet semanal?')) return;
    
    try {
        if (window.PortalDB.updateTimesheet) {
            const result = window.PortalDB.updateTimesheet(timesheetId, {
                status: 'Aprobado',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin'
            });
            
            if (result.success) {
                window.NotificationUtils.success('Timesheet aprobado correctamente');
                // Also approve related reports
                const ts = Object.values(window.PortalDB.getTimesheets()).find(t => t.timesheetId === timesheetId);
                if (ts && ts.generatedReportIds) {
                    for (const reportId of ts.generatedReportIds) {
                        try {
                            await window.PortalDB.updateReport(reportId, { status: 'Aprobado' });
                        } catch (e) { /* ignore individual report errors */ }
                    }
                }

                // Enviar notificación al consultor de aprobación
                if (ts && typeof sendNotification === 'function') {
                    try {
                        await sendNotification(
                            ts.userId,
                            'report_approved',
                            'Timesheet Aprobado',
                            `Tu timesheet de la semana ${ts.weekStart} fue aprobado por el administrador.`,
                            timesheetId
                        );
                    } catch (notifErr) {
                        console.error('Error enviando notificación de aprobación:', notifErr);
                    }
                }

                await renderAdminTimesheets();
                updateSidebarCounts();
            } else {
                window.NotificationUtils.error('Error: ' + (result.message || 'No se pudo aprobar'));
            }
        }
    } catch (error) {
        console.error('Error aprobando timesheet:', error);
        window.NotificationUtils.error('Error al aprobar timesheet');
    }
}

/**
 * Reject a weekly timesheet
 */
async function rejectTimesheet(timesheetId) {
    const reason = prompt('Motivo del rechazo (opcional):');
    if (reason === null) return; // User cancelled
    
    try {
        if (window.PortalDB.updateTimesheet) {
            const result = window.PortalDB.updateTimesheet(timesheetId, {
                status: 'Rechazado',
                rejectionReason: reason || '',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin'
            });
            
            if (result.success) {
                window.NotificationUtils.success('Timesheet rechazado');
                
                // Actualizar el estado de los reportes en MongoDB Atlas a 'Rechazado'
                const ts = Object.values(window.PortalDB.getTimesheets()).find(t => t.timesheetId === timesheetId);
                if (ts && ts.generatedReportIds) {
                    for (const reportId of ts.generatedReportIds) {
                        try {
                            await window.PortalDB.updateReport(reportId, { 
                                status: 'Rechazado',
                                feedback: reason || ''
                            });
                        } catch (e) {
                            console.error('Error al actualizar reporte a rechazado:', e);
                        }
                    }
                }

                // Enviar notificación al consultor de rechazo
                if (ts && typeof sendNotification === 'function') {
                    try {
                        await sendNotification(
                            ts.userId,
                            'report_rejected',
                            'Timesheet Rechazado',
                            `Tu timesheet de la semana ${ts.weekStart} fue rechazado por el administrador. Motivo: ${reason || 'Sin motivo especificado'}.`,
                            timesheetId
                        );
                    } catch (notifErr) {
                        console.error('Error enviando notificación de rechazo:', notifErr);
                    }
                }
                
                await renderAdminTimesheets();
                updateSidebarCounts();
            } else {
                window.NotificationUtils.error('Error: ' + (result.message || 'No se pudo rechazar'));
            }
        }
    } catch (error) {
        console.error('Error rechazando timesheet:', error);
        window.NotificationUtils.error('Error al rechazar timesheet');
    }
}

window.approveTimesheet = approveTimesheet;
window.rejectTimesheet = rejectTimesheet;

/**
 * Renderiza el Panel General (dashboard)
 */
function renderPanelGeneral() {
    console.log('📊 Renderizando Panel General...');
    try {
        const users = currentData.users || {};
        const companies = currentData.companies || {};
        const projects = currentData.projects || {};
        const supports = currentData.supports || {};
        const modules = currentData.modules || {};
        const assignments = currentData.assignments || {};
        const reports = currentData.reports || {};
        const tarifario = currentData.tarifario || {};
        const taskAssignments = currentData.taskAssignments || {};

        const consultorCount = Object.values(users).filter(u => u.role === 'consultor' && u.isActive !== false).length;
        const empresaCount = Object.values(companies).filter(c => c.isActive !== false).length;
        const proyectoCount = Object.values(projects).filter(p => p.isActive !== false).length;
        const soporteCount = Object.values(supports).filter(s => s.isActive !== false).length;
        const moduloCount = Object.values(modules).filter(m => m.isActive !== false).length;
        const pendingReports = Object.values(reports).filter(r => r.status === 'Pendiente').length;
        const approvedReports = Object.values(reports).filter(r => r.status === 'Aprobado').length;
        const assignCount = Object.keys(assignments).length;
        const tarifarioCount = Object.keys(tarifario).length;
        const taskCount = Object.values(taskAssignments).filter(t => t.isActive !== false).length;

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('statConsultores', consultorCount);
        setEl('statEmpresas', empresaCount);
        setEl('statProyectos', proyectoCount);
        setEl('statReportesPendientes', pendingReports);
        setEl('statSoportes', soporteCount);
        setEl('statModulos', moduloCount);
        setEl('statAsignaciones', assignCount);
        setEl('statTarifario', tarifarioCount);
        setEl('statReportesAprobados', approvedReports);
        setEl('statTareas', taskCount);
        
        console.log('✅ Panel General renderizado');
    } catch (error) {
        console.error('❌ Error renderPanelGeneral:', error);
    }
}

/**
 * Renderiza lista de consultores
 */
function renderConsultoresList() {
    console.log('👥 Renderizando lista de consultores...');
    const tbody = document.getElementById('consultoresTableBody');
    if (!tbody) return;

    const users = currentData.users || {};
    const consultores = Object.values(users).filter(u => u.role === 'consultor');

    if (consultores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell"><i class="fa-solid fa-users"></i> No hay consultores registrados. Cree uno con "+ Nuevo Consultor".</td></tr>';
        return;
    }

    tbody.innerHTML = consultores.map(u => `
        <tr data-searchable="${(u.name || '').toLowerCase()} ${(u.email || '').toLowerCase()} ${(u.id || u.userId || '')}">
            <td><strong>${u.id || u.userId || '—'}</strong></td>
            <td>${u.name || 'Sin nombre'}</td>
            <td>${u.email || '—'}</td>
            <td class="crud-password-cell">${u.password || '—'}</td>
            <td><span class="crud-status-badge ${u.isActive !== false ? 'active' : 'inactive'}">${u.isActive !== false ? '● Activo' : '● Inactivo'}</span></td>
            <td>
                <div class="crud-actions">
                    <button class="crud-action-btn edit" title="Editar" onclick="editUser('${u.id || u.userId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="crud-action-btn delete" title="Eliminar" onclick="deleteUserConfirm('${u.id || u.userId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Renderiza lista de empresas
 */
function renderEmpresasList() {
    console.log('🏢 Renderizando lista de empresas...');
    const tbody = document.getElementById('empresasTableBody');
    if (!tbody) return;

    const companies = Object.values(currentData.companies || {});

    if (companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell"><i class="fa-solid fa-building"></i> No hay empresas registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = companies.map(c => `
        <tr data-searchable="${(c.name || '').toLowerCase()} ${(c.description || '').toLowerCase()}">
            <td><strong>${c.id || c.companyId || '—'}</strong></td>
            <td>${c.name || 'Sin nombre'}</td>
            <td>${c.description || '—'}</td>
            <td><span class="crud-status-badge ${c.isActive !== false ? 'active' : 'inactive'}">${c.isActive !== false ? '● Activa' : '● Inactiva'}</span></td>
            <td>
                <div class="crud-actions">
                    <button class="crud-action-btn edit" title="Editar" onclick="editCompany('${c.id || c.companyId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="crud-action-btn delete" title="Eliminar" onclick="deleteCompanyConfirm('${c.id || c.companyId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Renderiza lista de proyectos
 */
function renderProyectosList() {
    console.log('📁 Renderizando lista de proyectos...');
    const tbody = document.getElementById('proyectosTableBody');
    if (!tbody) return;

    const projects = Object.values(currentData.projects || {});

    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell"><i class="fa-solid fa-folder-open"></i> No hay proyectos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = projects.map(p => {
        const pId = p.id || p.projectId;
        const hoursInfo = getProjectHoursConsumed(pId);
        const maxH = p.maxHours || 0;
        const pct = maxH > 0 ? Math.round((hoursInfo.total / maxH) * 100) : 0;
        const barClass = pct >= 100 ? 'exceeded' : pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : '';
        
        const hoursDisplay = maxH > 0 
            ? `${hoursInfo.total.toFixed(1)} / ${maxH} hrs`
            : `${hoursInfo.total.toFixed(1)} / sin límite`;
            
        const progressHTML = maxH > 0 
            ? `
            <div style="width: 100%; min-width: 100px;">
                <div class="project-hours-bar ${barClass}" style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
                    <div style="height: 100%; width: ${Math.min(pct, 100)}%; border-radius: 3px; transition: width 0.3s;
                        background: ${pct >= 100 ? '#ef4444' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'};"></div>
                </div>
                <small style="color: #6b7280; font-size: 0.72rem; font-weight: 500;">${pct}% consumido</small>
            </div>
            `
            : `<small style="color: #94a3b8;">—</small>`;

        return `
        <tr data-searchable="${(p.name || '').toLowerCase()} ${(p.description || '').toLowerCase()}">
            <td><strong>${pId || '—'}</strong></td>
            <td>${p.name || 'Sin nombre'}</td>
            <td>${p.description || '—'}</td>
            <td>${hoursDisplay}</td>
            <td>${progressHTML}</td>
            <td><span class="crud-status-badge ${p.isActive !== false ? 'active' : 'inactive'}">${p.isActive !== false ? '● Activo' : '● Inactivo'}</span></td>
            <td>
                <div class="crud-actions">
                    <button class="crud-action-btn edit" title="Editar" onclick="editProject('${pId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="crud-action-btn delete" title="Eliminar" onclick="deleteProjectConfirm('${pId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

/**
 * Renderiza lista de soportes
 */
function renderSoportesList() {
    console.log('🛠️ Renderizando lista de soportes...');
    const tbody = document.getElementById('soportesTableBody');
    if (!tbody) return;

    const supports = Object.values(currentData.supports || {});

    if (supports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell"><i class="fa-solid fa-headset"></i> No hay soportes registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = supports.map(s => `
        <tr data-searchable="${(s.name || '').toLowerCase()} ${(s.description || '').toLowerCase()}">
            <td><strong>${s.id || s.supportId || '—'}</strong></td>
            <td>${s.name || 'Sin nombre'}</td>
            <td>${s.description || '—'}</td>
            <td><span class="crud-status-badge ${s.isActive !== false ? 'active' : 'inactive'}">${s.isActive !== false ? '● Activo' : '● Inactivo'}</span></td>
            <td>
                <div class="crud-actions">
                    <button class="crud-action-btn edit" title="Editar" onclick="editSupport('${s.id || s.supportId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="crud-action-btn delete" title="Eliminar" onclick="deleteSupportConfirm('${s.id || s.supportId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Renderiza lista de módulos
 */
function renderModulosList() {
    console.log('🧩 Renderizando lista de módulos...');
    const tbody = document.getElementById('modulosTableBody');
    if (!tbody) return;

    const modules = Object.values(currentData.modules || {});

    if (modules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell"><i class="fa-solid fa-puzzle-piece"></i> No hay módulos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = modules.map(m => `
        <tr data-searchable="${(m.name || '').toLowerCase()} ${(m.description || '').toLowerCase()}">
            <td><strong>${m.id || m.moduleId || '—'}</strong></td>
            <td>${m.name || 'Sin nombre'}</td>
            <td>${m.description || '—'}</td>
            <td><span class="crud-status-badge ${m.isActive !== false ? 'active' : 'inactive'}">${m.isActive !== false ? '● Activo' : '● Inactivo'}</span></td>
            <td>
                <div class="crud-actions">
                    <button class="crud-action-btn edit" title="Editar" onclick="editModule('${m.id || m.moduleId}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="crud-action-btn delete" title="Eliminar" onclick="deleteModuleConfirm('${m.id || m.moduleId}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Renderiza tarifario global
 */
function renderTarifarioGlobalList() {
    console.log('💰 Renderizando tarifario global...');
    const tbody = document.getElementById('tarifarioTableBody');
    if (!tbody) return;

    const tarifario = currentData.tarifario || {};
    const entries = Object.values(tarifario);

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell"><i class="fa-solid fa-dollar-sign"></i> No hay entradas en el tarifario. Se crean automáticamente al crear asignaciones con tarifas.</td></tr>';
        return;
    }

    tbody.innerHTML = entries.map(t => {
        const margen = (t.costoCliente || 0) - (t.costoConsultor || 0);
        const margenClass = margen >= 0 ? 'crud-margen-positive' : 'crud-margen-negative';
        const tipoLabel = t.tipo === 'project' ? `<i class="fa-solid fa-folder-open"></i> ${t.projectName || 'Proyecto'}` :
                          t.tipo === 'task' ? `<i class="fa-solid fa-tasks"></i> ${t.descripcionTarea || 'Tarea'}` :
                          `<i class="fa-solid fa-headset"></i> ${t.supportName || 'Soporte'}`;

        return `
            <tr data-searchable="${(t.consultorNombre || '').toLowerCase()} ${(t.companyName || '').toLowerCase()} ${(t.supportName || '').toLowerCase()} ${(t.projectName || '').toLowerCase()} ${(t.moduleName || '').toLowerCase()}">
                <td>${t.consultorNombre || '—'}</td>
                <td>${t.companyName || '—'}</td>
                <td>${tipoLabel}</td>
                <td>${t.moduleName || '—'}</td>
                <td>$${(t.costoConsultor || 0).toFixed(2)}</td>
                <td>$${(t.costoCliente || 0).toFixed(2)}</td>
                <td><span class="${margenClass}">$${margen.toFixed(2)}</span></td>
                <td><span class="crud-status-badge ${t.isActive !== false ? 'active' : 'inactive'}">${t.isActive !== false ? '● Activa' : '● Inactiva'}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Filtra las filas de una tabla CRUD por texto de búsqueda
 */
function filterCrudTable(sectionName) {
    const searchInputId = 'search' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    const input = document.getElementById(searchInputId);
    if (!input) return;

    const query = input.value.toLowerCase().trim();
    const tableBodyId = sectionName + 'TableBody';
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr[data-searchable]');
    rows.forEach(row => {
        const text = row.getAttribute('data-searchable') || '';
        row.dataset.filteredOut = text.includes(query) ? 'false' : 'true';
    });

    tbody.dataset.page = '1';
    applyTablePagination(tableBodyId);
}

function setupTablePagination(tbody) {
    if (!tbody || !tbody.id) return null;

    const table = tbody.closest('table');
    if (!table) return null;

    const tableContainer = table.closest('.crud-table-container, .reports-table-container, .table-container') || table.parentElement;
    if (!tableContainer) return null;

    const controlsId = `${tbody.id}Pagination`;
    let controls = document.getElementById(controlsId);
    if (!controls) {
        controls = document.createElement('div');
        controls.id = controlsId;
        controls.className = 'table-pagination';
        controls.dataset.paginationFor = tbody.id;
        controls.innerHTML = `
            <div class="table-pagination-size">
                <span>Mostrar</span>
                <select aria-label="Registros por página">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                </select>
                <span>registros</span>
            </div>
            <div class="table-pagination-status"></div>
            <div class="table-pagination-actions">
                <button type="button" data-page-action="prev" aria-label="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button type="button" data-page-action="next" aria-label="Página siguiente">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;

        const target = tableContainer.classList.contains('table-responsive') && tableContainer.parentElement
            ? tableContainer.parentElement
            : tableContainer;
        target.insertAdjacentElement('afterend', controls);

        const select = controls.querySelector('select');
        select.addEventListener('change', () => {
            tbody.dataset.pageSize = select.value;
            tbody.dataset.page = '1';
            applyTablePagination(tbody.id);
        });

        controls.querySelector('[data-page-action="prev"]').addEventListener('click', () => {
            const page = Math.max(1, parseInt(tbody.dataset.page || '1', 10) - 1);
            tbody.dataset.page = String(page);
            applyTablePagination(tbody.id);
        });

        controls.querySelector('[data-page-action="next"]').addEventListener('click', () => {
            const page = parseInt(tbody.dataset.page || '1', 10) + 1;
            tbody.dataset.page = String(page);
            applyTablePagination(tbody.id);
        });
    }

    const select = controls.querySelector('select');
    if (!tbody.dataset.pageSize) tbody.dataset.pageSize = select.value || '10';
    if (!tbody.dataset.page) tbody.dataset.page = '1';

    return controls;
}

function applyTablePagination(tbodyId) {
    const tbody = typeof tbodyId === 'string' ? document.getElementById(tbodyId) : tbodyId;
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const dataRows = rows.filter(row => !row.querySelector('.empty-cell, .empty-state-cell, .empty-table-message'));
    const controls = setupTablePagination(tbody);
    if (!controls) return;

    if (dataRows.length === 0) {
        rows.forEach(row => { row.style.display = ''; });
        controls.style.display = 'none';
        return;
    }

    const availableRows = dataRows.filter(row => row.dataset.filteredOut !== 'true');
    const pageSize = parseInt(tbody.dataset.pageSize || '10', 10);
    const totalPages = Math.max(1, Math.ceil(availableRows.length / pageSize));
    const currentPage = Math.min(Math.max(1, parseInt(tbody.dataset.page || '1', 10)), totalPages);
    tbody.dataset.page = String(currentPage);

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const visibleRows = new Set(availableRows.slice(start, end));

    dataRows.forEach(row => {
        row.style.display = visibleRows.has(row) ? '' : 'none';
    });

    const firstShown = availableRows.length === 0 ? 0 : start + 1;
    const lastShown = Math.min(end, availableRows.length);
    controls.style.display = dataRows.length > pageSize || availableRows.length !== dataRows.length ? 'flex' : 'none';
    controls.querySelector('.table-pagination-status').textContent =
        `${firstShown}-${lastShown} de ${availableRows.length}`;

    controls.querySelector('[data-page-action="prev"]').disabled = currentPage <= 1;
    controls.querySelector('[data-page-action="next"]').disabled = currentPage >= totalPages;
}

function refreshTablePagination(scope = document) {
    const bodies = scope.querySelectorAll(
        '.crud-table tbody[id], .admin-table tbody[id], .reports-table tbody[id], .tarifario-table tbody[id]'
    );
    bodies.forEach(tbody => applyTablePagination(tbody.id));
}

function initializeTablePaginationObserver() {
    const root = document.querySelector('.admin-main-content');
    if (!root || root.dataset.paginationObserved === 'true') return;

    root.dataset.paginationObserved = 'true';
    refreshTablePagination(root);

    let paginationTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(paginationTimer);
        paginationTimer = setTimeout(() => refreshTablePagination(root), 80);
    });
    observer.observe(root, { childList: true, subtree: true });
}



/**
 * Helper para abrir el modal de confirmación
 */
function openConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmEntityModal');
    if (!modal) {
        if (confirm(message)) onConfirm();
        return;
    }
    document.getElementById('confirmEntityTitle').textContent = title;
    document.getElementById('confirmEntityMessage').textContent = message;
    
    const btn = document.getElementById('confirmEntityBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        onConfirm();
    });
    
    modal.style.display = 'flex';
}

/**
 * Helper para abrir el modal de información 
 */
function openInfoModal(title, message) {
    const modal = document.getElementById('infoEntityModal');
    if (!modal) {
        alert(message);
        return;
    }
    document.getElementById('infoEntityTitle').textContent = title;
    document.getElementById('infoEntityMessage').textContent = message;
    modal.style.display = 'flex';
}

// Global listeners for closing confirm and info modals
document.addEventListener('DOMContentLoaded', () => {
    // Confirm Modal
    const closeConfirmBtn = document.getElementById('closeConfirmEntityModal');
    if (closeConfirmBtn) {
        closeConfirmBtn.addEventListener('click', () => {
            document.getElementById('confirmEntityModal').style.display = 'none';
        });
    }
    // Info Modal
    const closeInfoBtn = document.getElementById('closeInfoEntityModal');
    if (closeInfoBtn) {
        closeInfoBtn.addEventListener('click', () => {
            document.getElementById('infoEntityModal').style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target.id === 'confirmEntityModal') {
            e.target.style.display = 'none';
        }
        if (e.target.id === 'infoEntityModal') {
            e.target.style.display = 'none';
        }
    });
});

/**
 * Helper: Confirmar eliminación de empresa
 */
function deleteCompanyConfirm(companyId) {
    openConfirmModal('Eliminar Empresa', '¿Está seguro de eliminar esta empresa? Se eliminarán también las asignaciones relacionadas.', () => {
        const result = window.PortalDB.deleteCompany(companyId);
        if (result.success) {
            window.NotificationUtils.success('Empresa eliminada correctamente');
            loadAllData();
        } else {
            window.NotificationUtils.error(result.message || 'Error al eliminar');
        }
    });
}

function deleteProjectConfirm(projectId) {
    openConfirmModal('Eliminar Proyecto', '¿Está seguro de eliminar este proyecto?', () => {
        const result = window.PortalDB.deleteProject(projectId);
        if (result.success) {
            window.NotificationUtils.success('Proyecto eliminado correctamente');
            loadAllData();
        } else {
            window.NotificationUtils.error(result.message || 'Error al eliminar');
        }
    });
}

function deleteSupportConfirm(supportId) {
    openConfirmModal('Eliminar Soporte', '¿Está seguro de eliminar este soporte?', () => {
        const result = window.PortalDB.deleteSupport(supportId);
        if (result.success) {
            window.NotificationUtils.success('Soporte eliminado correctamente');
            loadAllData();
        } else {
            window.NotificationUtils.error(result.message || 'Error al eliminar');
        }
    });
}

function deleteModuleConfirm(moduleId) {
    openConfirmModal('Eliminar Módulo', '¿Está seguro de eliminar este módulo?', () => {
        const result = window.PortalDB.deleteModule(moduleId);
        if (result.success) {
            window.NotificationUtils.success('Módulo eliminado correctamente');
            loadAllData();
        } else {
            window.NotificationUtils.error(result.message || 'Error al eliminar');
        }
    });
}

function deleteUserConfirm(userId) {
    if (userId === 'admin') {
        window.NotificationUtils.error('No se puede eliminar el administrador');
        return;
    }
    openConfirmModal('Desactivar Consultor', '¿Está seguro de desactivar este consultor?', () => {
        const result = window.PortalDB.deleteUser(userId);
        if (result.success) {
            window.NotificationUtils.success('Consultor desactivado correctamente');
            loadAllData();
        } else {
            window.NotificationUtils.error(result.message || 'Error al eliminar');
        }
    });
}

/**
 * Helper para abrir el modal de edición genérico
 */
function openEditModal(title, currentValue, onSave) {
    const modal = document.getElementById('editEntityModal');
    if (!modal) {
        // Fallback si no está el modal en el DOM
        const val = prompt(title, currentValue);
        if (val && val.trim()) onSave(val.trim());
        return;
    }
    
    document.getElementById('editEntityTitle').textContent = title;
    const input = document.getElementById('editEntityName');
    input.value = currentValue;
    modal.style.display = 'flex';
    input.focus();
    
    // Clonar botón y form para limpiar event listeners pasados
    const btn = document.getElementById('saveEntityEditBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    const form = document.getElementById('editEntityForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    const saveHandler = (e) => {
        if (e) e.preventDefault();
        const newVal = document.getElementById('editEntityName').value;
        if (newVal && newVal.trim()) {
            modal.style.display = 'none';
            onSave(newVal.trim());
        } else {
            window.NotificationUtils.error('El valor no puede estar vacío');
        }
    };
    
    document.getElementById('saveEntityEditBtn').addEventListener('click', saveHandler);
    document.getElementById('editEntityForm').addEventListener('submit', saveHandler);
}

// Global listeners for closing modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeEditEntityModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('editEntityModal').style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('editEntityModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

/**
 * Edit helpers for empresas, proyectos, soportes, módulos
 */
function editCompany(companyId) {
    const company = currentData.companies[companyId];
    if (!company) return;
    openEditModal('Editar Empresa', company.name, (newName) => {
        const result = window.PortalDB.updateCompany(companyId, { name: newName });
        if (result.success) {
            window.NotificationUtils.success('Empresa actualizada');
            loadAllData();
        }
    });
}

function editProject(projectId) {
    const project = currentData.projects[projectId];
    if (!project) return;
    openEditModal('Editar Proyecto', project.name, (newName) => {
        const result = window.PortalDB.updateProject(projectId, { name: newName });
        if (result.success) {
            window.NotificationUtils.success('Proyecto actualizado');
            loadAllData();
        }
    });
}

function editSupport(supportId) {
    const support = currentData.supports[supportId];
    if (!support) return;
    openEditModal('Editar Soporte', support.name, (newName) => {
        const result = window.PortalDB.updateSupport(supportId, { name: newName });
        if (result.success) {
            window.NotificationUtils.success('Soporte actualizado');
            loadAllData();
        }
    });
}

function editModule(moduleId) {
    const module = currentData.modules[moduleId];
    if (!module) return;
    openEditModal('Editar Módulo', module.name, (newName) => {
        const result = window.PortalDB.updateModule(moduleId, { name: newName });
        if (result.success) {
            window.NotificationUtils.success('Módulo actualizado');
            loadAllData();
        }
    });
}

/**
 * Controla el redimensionamiento del sidebar de administración arrastrando su borde derecho
 * @param {HTMLElement} sidebar - Elemento sidebar
 * @param {HTMLElement} resizer - Elemento resizer drag handle
 */
function setupSidebarResize(sidebar, resizer) {
    let isResizing = false;
    
    // Cargar ancho preferido de localStorage si existe
    const savedWidth = localStorage.getItem('adminSidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }
    
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Evitar selección de textos
        
        // Quitar transiciones temporales durante el drag
        sidebar.classList.add('resizing');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const sidebarRect = sidebar.getBoundingClientRect();
        let newWidth = e.clientX - sidebarRect.left;
        
        // Límites razonables para una buena UX (mínimo 220px, máximo 450px)
        if (newWidth < 220) newWidth = 220;
        if (newWidth > 450) newWidth = 450;
        
        sidebar.style.width = newWidth + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            sidebar.classList.remove('resizing');
            
            // Guardar el ancho preferido en LocalStorage
            localStorage.setItem('adminSidebarWidth', sidebar.offsetWidth);
        }
    });
}
