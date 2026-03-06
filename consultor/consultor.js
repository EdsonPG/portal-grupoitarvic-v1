/**
 * === PANEL DE CONSULTOR SIMPLIFICADO ===
 * Solo maneja asignaciones y reportes de horas
 */

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


// === PANEL DE NOTIFICACIONES ===
let notifCurrentUserId = null;

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.querySelector('.nav-action-btn[title="Notificaciones"]');
    if (!panel) return;

    // Cerrar panel de ayuda si está abierto
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
    const userId = notifCurrentUserId || (currentUser ? currentUser.userId : null);
    if (!userId) return;
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
    const userId = notifCurrentUserId || (currentUser ? currentUser.userId : null);
    if (!userId) return;
    try {
        await window.PortalDB.markAllNotificationsAsRead(userId);
        loadNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marcando todas:', error);
    }
}

async function updateNotificationBadge() {
    const userId = notifCurrentUserId || (currentUser ? currentUser.userId : null);
    if (!userId) return;
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
    if (window.PortalDB && currentUser) {
        updateNotificationBadge();
    }
}, 30000);

// Helper para enviar notificaciones
async function sendNotification(userId, type, title, message, relatedId = null) {
    try {
        await window.PortalDB.createNotification({
            userId, type, title, message, relatedId
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}


// Variables globales
let isUpdatingRejectedReports = false;
let currentUser = null;
let userAssignments = [];
let currentAssignmentId = null;
let isInitialized = false;

// === MANEJO DE ERRORES ===
function showError(message) {
    console.error('Error:', message);
    const errorContainer = document.getElementById('errorContainer');
    const errorText = document.getElementById('errorText');
    
    if (errorContainer && errorText) {
        errorText.textContent = message;
        errorContainer.style.display = 'block';
        
        setTimeout(() => {
            hideError();
        }, 5000);
    } else {
        alert('Error: ' + message);
    }
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    const mainContent = document.getElementById('mainContent');
    
    if (spinner) {
        spinner.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// === VERIFICACIÓN DE DEPENDENCIAS ===
function checkDependencies() {
    const requiredObjects = ['PortalDB', 'AuthSys', 'NotificationUtils', 'DateUtils', 'ModalUtils'];
    const missing = [];
    
    for (const obj of requiredObjects) {
        if (!window[obj]) {
            missing.push(obj);
        }
    }
    
    if (missing.length > 0) {
        showError(`Faltan dependencias: ${missing.join(', ')}. Por favor verifica que todos los archivos JS estén cargados.`);
        return false;
    }
    
    return true;
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando panel de consultor simplificado...');
    
    try {
        let retries = 0;
        const maxRetries = 10;
        
        const checkAndInit = () => {
            if (checkDependencies()) {
                initializeConsultor();
            } else {
                retries++;
                if (retries < maxRetries) {
                    console.log(`Reintentando carga de dependencias (${retries}/${maxRetries})...`);
                    setTimeout(checkAndInit, 500);
                } else {
                    showError('Error crítico: No se pudieron cargar las dependencias necesarias. Recarga la página.');
                }
            }
        };
        
        checkAndInit();
        
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        showError('Error durante la inicialización: ' + error.message);
    }
});

function initializeConsultor() {
    try {
        console.log('✅ Dependencias cargadas, verificando autenticación...');
        
        // Verificar autenticación
        if (!window.AuthSys || !window.AuthSys.isAuthenticated()) {
            console.error('❌ Usuario no autenticado');
            showError('Sesión no válida. Redirigiendo al login...');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }
        
        currentUser = window.AuthSys.getCurrentUser();
        
        if (!currentUser) {
            console.error('❌ No se pudo obtener información del usuario');
            showError('Error al obtener información del usuario');
            return;
        }
        
        if (currentUser.role !== 'consultor') {
            console.error('❌ Usuario no es consultor:', currentUser.role);
            showError('Acceso denegado: No tienes permisos de consultor');
            setTimeout(() => {
                window.AuthSys.logout();
            }, 2000);
            return;
        }
        
        console.log('✅ Usuario autenticado como consultor:', currentUser.name);
        
        // Inicializar panel
        setupConsultorPanel();
        setupEventListeners();
        loadUserAssignments();
        
        hideLoadingSpinner();
        isInitialized = true;
        
        console.log('🎉 Panel de consultor inicializado correctamente');
        
    } catch (error) {
        console.error('Error en initializeConsultor:', error);
        showError('Error de inicialización: ' + error.message);
    }
}

function setupConsultorPanel() {
    try {
        // Actualizar información del usuario
        const userNameElement = document.getElementById('consultorUserName');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userIdDisplay = document.getElementById('userIdDisplay');
        
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
        if (userNameDisplay) {
            userNameDisplay.textContent = currentUser.name;
        }
        if (userIdDisplay) {
            userIdDisplay.textContent = currentUser.userId;
        }
        
        // Configurar fecha actual en el modal
        const reportDateElement = document.getElementById('reportDate');
        if (reportDateElement) {
            const today = new Date().toISOString().split('T')[0];
            reportDateElement.value = today;
        }
        
        if (window.NotificationUtils) {
            window.NotificationUtils.success(`¡Bienvenido ${currentUser.name}!`, 3000);
        }
        
    } catch (error) {
        console.error('Error en setupConsultorPanel:', error);
        showError('Error al configurar panel: ' + error.message);
    }

    setTimeout(() => {
        updateRejectedReportsSection();
    }, 1000);
}

function setupEventListeners() {
    try {
        // Formulario de reportes
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', handleCreateReport);
        }
        
        // Auto-refresh en segundo plano cada 30 segundos
        setInterval(() => {
            if (isInitialized && !isUserInteracting()) {
                silentDataRefresh();
            }
        }, 30000);
        
    } catch (error) {
        console.error('Error en setupEventListeners:', error);
        showError('Error al configurar eventos: ' + error.message);
    }
}

// Detectar si el usuario está interactuando
function isUserInteracting() {
    // Verificar si hay modales abiertos
    const modals = document.querySelectorAll('.modal');
    for (let modal of modals) {
        if (modal.style.display === 'block') {
            return true;
        }
    }
    
    // Verificar si hay inputs con foco
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT')) {
        return true;
    }
    
    return false;
}

// Actualización silenciosa en segundo plano
async function silentDataRefresh() {
    try {
        const oldAssignmentsCount = userAssignments.length;
        
        // Support
        const supportAssignmentsData = await window.PortalDB.getUserAssignments(currentUser.userId);
        const supportAssignments = Array.isArray(supportAssignmentsData)
            ? supportAssignmentsData
            : Object.values(supportAssignmentsData || {});
        
        // Projects
        const allProjectAssignments = window.PortalDB.getProjectAssignments ? 
            await window.PortalDB.getProjectAssignments() : {};
        
        const projectAssignmentsArray = Array.isArray(allProjectAssignments)
            ? allProjectAssignments
            : Object.values(allProjectAssignments || {});
            
        const userProjectAssignments = projectAssignmentsArray.filter(pa => {
            const assignmentUserId = pa.consultorId || pa.userId;
            return assignmentUserId === currentUser.userId && (pa.isActive !== false);
        });
        
        // ✅ Tasks (NUEVO)
        const allTaskAssignments = window.PortalDB.getTaskAssignments ? 
            await window.PortalDB.getTaskAssignments() : {};
        
        const taskAssignmentsArray = Array.isArray(allTaskAssignments)
            ? allTaskAssignments
            : Object.values(allTaskAssignments || {});
            
        const userTaskAssignments = taskAssignmentsArray.filter(ta => {
            const assignmentUserId = ta.consultorId || ta.userId;
            return assignmentUserId === currentUser.userId && (ta.isActive !== false);
        });
        
        const combinedAssignments = [
            ...supportAssignments.map(a => ({...a, assignmentType: 'support'})),
            ...userProjectAssignments.map(a => ({...a, assignmentType: 'project'})),
            ...userTaskAssignments.map(a => ({...a, assignmentType: 'task'}))  // ✅ NUEVO
        ];
        
        userAssignments = combinedAssignments;
        
        updateCountersOnly();
        
        if (combinedAssignments.length > oldAssignmentsCount) {
            if (window.NotificationUtils) {
                window.NotificationUtils.info('Tienes nuevas asignaciones disponibles', 3000);
            }
        }
        
    } catch (error) {
        console.error('Error en actualización silenciosa:', error);
    }
}

// Actualizar solo contadores sin regenerar HTML
async function updateCountersOnly() {
    try {
        // Actualizar contador de asignaciones
        const assignmentsCount = document.getElementById('assignmentsCount');
        if (assignmentsCount) {
            assignmentsCount.textContent = userAssignments.length;
        }
        
        // ✅ CORRECCIÓN: Convertir a array si viene como objeto
        const allReportsData = await window.PortalDB.getReports();
        const allReports = Array.isArray(allReportsData)
            ? allReportsData
            : Object.values(allReportsData || {});
        
        const rejectedReports = allReports.filter(
            r => r.userId === currentUser.userId && r.status === 'Rechazado'
        );
        
        const rejectedCount = document.getElementById('rejectedReportsCount');
        if (rejectedCount) {
            rejectedCount.textContent = rejectedReports.length;
        }
        
    } catch (error) {
        console.error('Error actualizando contadores:', error);
    }
}

// === GESTIÓN DE ASIGNACIONES ===
async function loadUserAssignments() {
    try {
        console.log('🔄 Cargando asignaciones para usuario:', currentUser.userId);
        
        // ✅ 1. Support Assignments
        const supportAssignmentsData = await window.PortalDB.getUserAssignments(currentUser.userId);
        console.log('📦 Support assignments data:', supportAssignmentsData); // ✅ DEBUG
        const supportAssignments = Array.isArray(supportAssignmentsData) 
            ? supportAssignmentsData 
            : Object.values(supportAssignmentsData || {});
        
        console.log('📦 Support assignments array:', supportAssignments); // ✅ DEBUG
        console.log('📦 Support assignments length:', supportAssignments.length); // ✅ DEBUG

        // ✅ 2. Project Assignments
        const allProjectAssignments = window.PortalDB.getProjectAssignments ? 
            await window.PortalDB.getProjectAssignments() : {};
        
        const projectAssignmentsArray = Array.isArray(allProjectAssignments)
            ? allProjectAssignments
            : Object.values(allProjectAssignments || {});
            
        const userProjectAssignments = projectAssignmentsArray.filter(pa => {
            const assignmentUserId = pa.consultorId || pa.userId;
            return assignmentUserId === currentUser.userId && (pa.isActive !== false);
        });
        
        // ✅ 3. Task Assignments (NUEVO - ESTO FALTABA)
        const allTaskAssignments = window.PortalDB.getTaskAssignments ? 
            await window.PortalDB.getTaskAssignments() : {};
        
        const taskAssignmentsArray = Array.isArray(allTaskAssignments)
            ? allTaskAssignments
            : Object.values(allTaskAssignments || {});
            
        const userTaskAssignments = taskAssignmentsArray.filter(ta => {
            const assignmentUserId = ta.consultorId || ta.userId;
            return assignmentUserId === currentUser.userId && (ta.isActive !== false);
        });
        
        // Combinar TODAS las asignaciones
        const combinedAssignments = [
            ...supportAssignments.map(a => ({...a, assignmentType: 'support'})),
            ...userProjectAssignments.map(a => ({...a, assignmentType: 'project'})),
            ...userTaskAssignments.map(a => ({...a, assignmentType: 'task'}))  // ✅ NUEVO
        ];
        
        userAssignments = combinedAssignments;
        
        console.log('📊 Asignaciones cargadas:', {
            support: supportAssignments.length,
            projects: userProjectAssignments.length,
            tasks: userTaskAssignments.length,  // ✅ NUEVO
            total: combinedAssignments.length
        });
        
        updateAssignmentsList();
        updateCountersOnly();
        
        setTimeout(() => {
            updateRejectedReportsSection();
        }, 100);
        
    } catch (error) {
        console.error('Error en loadUserAssignments:', error);
        showError('Error al cargar asignaciones: ' + error.message);
    }
}

function updateAssignmentsList() {
    try {
        const container = document.getElementById('assignmentsList');
        if (!container) return;

        const supportAssignments = userAssignments.filter(a => a.assignmentType === 'support');
        const taskAssignments = userAssignments.filter(a => a.assignmentType === 'task');
        const projectAssignments = userAssignments.filter(a => a.assignmentType === 'project');

        // ✅ CAMBIO 1: Hacer la función async
        const renderAssignments = async () => {
            let html = '';

            // === SUPPORT ASSIGNMENTS ===
            // ✅ CAMBIO 2: Usar for...of en lugar de forEach
            for (const assignment of supportAssignments) {
                const assignmentReportsData = await window.PortalDB.getReportsByAssignment(assignment.assignmentId);
                const assignmentReports = normalizeReports(assignmentReportsData);
                const totalHours = assignmentReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

                // ✅ CAMBIO 3: Usar await
                const company = await window.PortalDB.getCompany(assignment.companyId);
                const support = await window.PortalDB.getSupport(assignment.supportId);
                const module = await window.PortalDB.getModule(assignment.moduleId);

                html += `
                    <div class="assignment-card support-card">
                        <div class="assignment-header">
                            <div class="assignment-title">
                                <i class="fa-solid fa-headset"></i>
                                <h3>${company?.name || 'Empresa no encontrada'}</h3>
                                <span class="badge badge-support">SOPORTE</span>
                                <span class="assignment-id">${assignment.assignmentId.slice(-6)}</span>
                            </div>
                        </div>
                        <div class="assignment-body">
                            <div class="assignment-info">
                                <p><strong><i class="fa-solid fa-tools"></i> Soporte:</strong> ${support?.name || 'Soporte no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-file-alt"></i> Reportes:</strong> ${assignmentReports.length} reportes | <strong><i class="fa-solid fa-clock"></i> Total:</strong> ${totalHours.toFixed(1)} hrs</p>
                                <p><strong><i class="fa-solid fa-calendar"></i> Asignado:</strong> ${window.DateUtils.formatDate(assignment.createdAt)}</p>
                            </div>
                            <div class="assignment-actions">
                                <button class="btn btn-primary" onclick="openCreateReportModal('${assignment.assignmentId}')">
                                    <i class="fa-solid fa-file-alt"></i> Crear Ticket
                                </button>
                                <button class="btn btn-secondary" onclick="viewAssignmentReports('${assignment.assignmentId}')">
                                    <i class="fa-solid fa-chart-line"></i> Ver Tickets (${assignmentReports.length})
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // === TASK ASSIGNMENTS ===
            for (const assignment of taskAssignments) {
                const assignmentReportsData = await window.PortalDB.getReportsByAssignment(assignment.taskAssignmentId);
                const assignmentReports = normalizeReports(assignmentReportsData);
                const totalHours = assignmentReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

                const company = await window.PortalDB.getCompany(assignment.companyId);
                const support = await window.PortalDB.getSupport(assignment.linkedSupportId);
                const module = await window.PortalDB.getModule(assignment.moduleId);

                html += `
                    <div class="assignment-card task-card">
                        <div class="assignment-header">
                            <div class="assignment-title">
                                <i class="fa-solid fa-tasks"></i>
                                <h3>${company?.name || 'Empresa no encontrada'}</h3>
                                <span class="badge badge-task">TAREA</span>
                                <span class="assignment-id">${assignment.taskAssignmentId.slice(-6)}</span>
                            </div>
                        </div>
                        <div class="assignment-body">
                            <div class="assignment-info">
                                <p><strong><i class="fa-solid fa-headset"></i> Soporte:</strong> ${support?.name || 'Soporte no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-clipboard-list"></i> Descripción:</strong> ${assignment.descripcion || 'Sin descripción'}</p>
                                <p><strong><i class="fa-solid fa-file-alt"></i> Reportes:</strong> ${assignmentReports.length} reportes | <strong><i class="fa-solid fa-clock"></i> Total:</strong> ${totalHours.toFixed(1)} hrs</p>
                                <p><strong><i class="fa-solid fa-calendar"></i> Asignado:</strong> ${window.DateUtils.formatDate(assignment.createdAt)}</p>
                            </div>
                            <div class="assignment-actions">
                                <button class="btn btn-primary" onclick="openCreateReportModal('${assignment.taskAssignmentId}')">
                                    <i class="fa-solid fa-file-alt"></i> Crear Ticket
                                </button>
                                <button class="btn btn-secondary" onclick="viewAssignmentReports('${assignment.taskAssignmentId}')">
                                    <i class="fa-solid fa-chart-line"></i> Ver Tickets (${assignmentReports.length})
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // === PROJECT ASSIGNMENTS ===
            for (const assignment of projectAssignments) {
                const assignmentReportsData = await window.PortalDB.getReportsByAssignment(assignment.projectAssignmentId);
                const assignmentReports = normalizeReports(assignmentReportsData);
                const totalHours = assignmentReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

                const company = await window.PortalDB.getCompany(assignment.companyId);
                const project = await window.PortalDB.getProject(assignment.projectId);
                const module = await window.PortalDB.getModule(assignment.moduleId);

                html += `
                    <div class="assignment-card project-card">
                        <div class="assignment-header">
                            <div class="assignment-title">
                                <i class="fa-solid fa-diagram-project"></i>
                                <h3>${company?.name || 'Empresa no encontrada'}</h3>
                                <span class="badge badge-project">PROYECTO</span>
                                <span class="assignment-id">${assignment.projectAssignmentId.slice(-8)}</span>
                            </div>
                        </div>
                        <div class="assignment-body">
                            <div class="assignment-info">
                                <p><strong><i class="fa-solid fa-diagram-project"></i> Proyecto:</strong> ${project?.name || 'Proyecto no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
                                <p><strong><i class="fa-solid fa-file-alt"></i> Reportes:</strong> ${assignmentReports.length} reportes | <strong><i class="fa-solid fa-clock"></i> Total:</strong> ${totalHours.toFixed(1)} hrs</p>
                                <p><strong><i class="fa-solid fa-calendar"></i> Asignado:</strong> ${window.DateUtils.formatDate(assignment.createdAt)}</p>
                            </div>
                            <div class="assignment-actions">
                                <button class="btn btn-success" onclick="openProjectReportModal('${assignment.projectAssignmentId}')">
                                    <i class="fa-solid fa-file-alt"></i> Crear Ticket
                                </button>
                                <button class="btn btn-secondary" onclick="viewAssignmentReports('${assignment.projectAssignmentId}')">
                                    <i class="fa-solid fa-chart-line"></i> Ver Tickets (${assignmentReports.length})
                                </button>
                                <button class="btn btn-info" onclick="viewProjectDetails('${assignment.projectAssignmentId}')">
                                    <i class="fa-solid fa-info-circle"></i> Ver Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Si no hay asignaciones
            if (html === '') {
                html = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-bullseye"></i></div>
                        <div class="empty-state-title">No hay asignaciones</div>
                        <div class="empty-state-desc">Las asignaciones del administrador aparecerán aquí</div>
                    </div>
                `;
            }

            container.innerHTML = html;
        };

        // ✅ CAMBIO 4: Llamar la función async
        renderAssignments();

    } catch (error) {
        console.error('Error en updateAssignmentsList:', error);
    }
}

function updateAssignmentsCount() {
    try {
        const countElement = document.getElementById('assignmentsCount');
        if (countElement) {
            countElement.textContent = userAssignments.length;
        }
    } catch (error) {
        console.error('Error en updateAssignmentsCount:', error);
    }
}

// === GESTIÓN DE REPORTES ===
async function openCreateReportModal(assignmentId) {  // ✅ Agregar async
    try {
        currentAssignmentId = assignmentId;
        
        const assignment = userAssignments.find(a => {
            if (a.assignmentType === 'support') {
                return a.assignmentId === assignmentId;
            } else if (a.assignmentType === 'project') {
                return a.projectAssignmentId === assignmentId;
            } else if (a.assignmentType === 'task') {
                return a.taskAssignmentId === assignmentId;
            }
            return false;
        });
        
        if (!assignment) {
            showError('Asignación no encontrada');
            return;
        }
        
        console.log('✅ Asignación encontrada:', assignment);
        
        // ✅ Agregar await
        const company = await window.PortalDB.getCompany(assignment.companyId);
        const module = await window.PortalDB.getModule(assignment.moduleId);
        
        // NUEVO: Llenar información del empleado
        const employeeDisplay = document.getElementById('employeeDisplay');
        if (employeeDisplay) {
            employeeDisplay.innerHTML = `${currentUser.name} (ID: ${currentUser.userId})`;
        }
        
        const assignmentInfoElement = document.getElementById('selectedAssignmentInfo');
        if (assignmentInfoElement) {
            let assignmentDetails = '';
            
            if (assignment.assignmentType === 'project') {
                // ✅ Agregar await
                const project = await window.PortalDB.getProject(assignment.projectId);
                assignmentDetails = `
                    <h4><i class="fa-solid fa-bullseye"></i> Proyecto</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Proyecto:</strong> ${project?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            } 
            else if (assignment.assignmentType === 'task') {
                // ✅ Agregar await
                const support = await window.PortalDB.getSupport(assignment.linkedSupportId);
                
                assignmentDetails = `
                    <h4><i class="fa-solid fa-tasks"></i> Tarea</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            }
            else {
                // ✅ Agregar await
                const support = await window.PortalDB.getSupport(assignment.supportId);
                assignmentDetails = `
                    <h4><i class="fa-solid fa-headset"></i> Soporte</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            }
            
            assignmentInfoElement.innerHTML = assignmentDetails;
        }
        
        document.getElementById('reportForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;
        
        openModal('createReportModal');
        
    } catch (error) {
        console.error('Error en openCreateReportModal:', error);
        showError('Error al abrir modal de ticket: ' + error.message);
    }
}

function getAssignmentDisplayInfo(assignmentId) {
    let assignmentInfo = {
        assignment: null,
        company: null,
        assignmentType: null,
        specificInfo: null, // soporte o proyecto
        module: null,
        displayData: null
    };
    
    try {
        // 1️⃣ BUSCAR EN ASIGNACIONES DE SOPORTE PRIMERO
        const supportAssignment = window.PortalDB.getAssignment(assignmentId);
        if (supportAssignment) {
            assignmentInfo.assignment = supportAssignment;
            assignmentInfo.company = window.PortalDB.getCompany(supportAssignment.companyId);
            assignmentInfo.specificInfo = window.PortalDB.getSupport(supportAssignment.supportId);
            assignmentInfo.module = window.PortalDB.getModule(supportAssignment.moduleId);
            assignmentInfo.assignmentType = 'support';
            
            // Datos para mostrar (igual que en tu dashboard)
            assignmentInfo.displayData = {
                typeIcon: '<i class="fa-solid fa-headset"></i>',
                typeName: 'SOPORTE',
                typeClass: 'support-badge',
                mainTitle: assignmentInfo.specificInfo?.name || 'Soporte no encontrado',
                companyName: assignmentInfo.company?.name || 'Empresa no encontrada',
                moduleName: assignmentInfo.module?.name || 'Módulo no encontrado'
            };
        } else {
            // 2️⃣ SI NO SE ENCUENTRA, BUSCAR EN ASIGNACIONES DE PROYECTO
            const projectAssignment = window.PortalDB.getProjectAssignment(assignmentId);
            if (projectAssignment) {
                assignmentInfo.assignment = projectAssignment;
                assignmentInfo.company = window.PortalDB.getCompany(projectAssignment.companyId);
                assignmentInfo.specificInfo = window.PortalDB.getProject(projectAssignment.projectId);
                assignmentInfo.module = window.PortalDB.getModule(projectAssignment.moduleId);
                assignmentInfo.assignmentType = 'project';
                
                // Datos para mostrar (igual que en tu dashboard)
                assignmentInfo.displayData = {
                    typeIcon: '<i class="fa-solid fa-folder-open"></i>',
                    typeName: 'PROYECTO',
                    typeClass: 'project-badge',
                    mainTitle: assignmentInfo.specificInfo?.name || 'Proyecto no encontrado',
                    companyName: assignmentInfo.company?.name || 'Empresa no encontrada',
                    moduleName: assignmentInfo.module?.name || 'Módulo no encontrado'
                };
            }
        }
    } catch (error) {
        console.error('Error obteniendo información de asignación:', error);
    }
    
    return assignmentInfo;
}

async function handleCreateReport(event) {
    event.preventDefault();
    
    try {
        const modal = event.target.closest('.modal');
        const isEditing = modal?.dataset.isEditing === 'true';
        const editingReportId = modal?.dataset.editingReportId;
        
        // Obtener datos del formulario
        const formData = {
            title: document.getElementById('reportTitle')?.value?.trim(),
            description: document.getElementById('reportDescription')?.value?.trim(),
            hours: parseFloat(document.getElementById('reportHours')?.value),
            reportDate: document.getElementById('reportDate')?.value
        };
        
        // Validaciones comunes
        if (!formData.title || !formData.description || !formData.hours || !formData.reportDate) {
            showError('Todos los campos son obligatorios');
            return;
        }
        
        if (formData.hours <= 0 || formData.hours > 24) {
            showError('Las horas deben estar entre 0.5 y 24');
            return;
        }
        
        if (isEditing && editingReportId) {
            // ============================================================================
            // MODO EDICIÓN: SOLO GUARDAR CAMBIOS, NO REENVIAR
            // ============================================================================
            console.log('Guardando cambios en reporte rechazado:', editingReportId);
            
            const result = await editRejectedReport(editingReportId, {
                title: formData.title,
                description: formData.description,
                hours: formData.hours,
                date: formData.reportDate
            });
            
            if (result.success) {
                cleanupEditingMode(modal);
                closeModal('createReportModal');
                
                if (window.NotificationUtils) {
                    window.NotificationUtils.success('<i class="fa-solid fa-pencil-alt"></i> Cambios guardados. Puedes reenviar el ticket cuando estés listo.');
                }
                
                setTimeout(() => {
                    loadUserAssignments();
                    if (typeof updateRejectedReportsSection === 'function') {
                        updateRejectedReportsSection();
                    }
                }, 500);
            }
            
        } else {
            // ============================================================================
            // MODO CREACIÓN: CREAR REPORTE NUEVO NORMAL
            // ============================================================================
            
            if (!currentAssignmentId) {
                showError('No se ha seleccionado una asignación');
                return;
            }
            
            const assignment = userAssignments.find(a => {
                if (a.assignmentType === 'support') return a.assignmentId === currentAssignmentId;
                if (a.assignmentType === 'project') return a.projectAssignmentId === currentAssignmentId;
                if (a.assignmentType === 'task') return a.taskAssignmentId === currentAssignmentId;
                return false;
            });

            if (!assignment) {
                showError('No se encontró la asignación');
                return;
            }

            // ✅ GENERAR reportId único
            const reportId = 'REP' + Math.random().toString(36).substring(2, 6).toUpperCase() + Date.now().toString().slice(-4);
            
            const reportData = {
                reportId: reportId, 
                userId: currentUser.userId,
                assignmentId: currentAssignmentId,
                assignmentType: assignment.assignmentType,  
                companyId: assignment.companyId,            
                moduleId: assignment.moduleId,            
                title: formData.title,
                description: formData.description,
                hours: formData.hours,
                date: formData.reportDate
            };

            if (assignment.assignmentType === 'support') {
                reportData.supportId = assignment.supportId;
            } else if (assignment.assignmentType === 'project') {
                reportData.projectId = assignment.projectId;
            } else if (assignment.assignmentType === 'task') {
                reportData.linkedSupportId = assignment.linkedSupportId;
            }
            
            console.log('Creando reporte nuevo:', reportData);
            
            const result = await window.PortalDB.createReport(reportData);
            
            if (result.success) {
                if (window.NotificationUtils) {
                    window.NotificationUtils.success('¡Ticket creado exitosamente!');
                }
                
                closeModal('createReportModal');
                
                setTimeout(() => {
                    loadUserAssignments();
                    if (typeof updateRejectedReportsSection === 'function') {
                        updateRejectedReportsSection();
                    }
                }, 500);
            } else {
                showError('Error al crear ticket: ' + result.message);
            }
        }
        
    } catch (error) {
        console.error('Error en handleCreateReport:', error);
        showError('Error al procesar ticket: ' + error.message);
    }
}

function cleanupEditingMode(modal) {
    if (!modal) return;
    
    try {
        // Limpiar marcadores de edición
        modal.dataset.isEditing = 'false';
        modal.dataset.editingReportId = '';
        
        // Restaurar título original
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = '<i class="fa-solid fa-file-alt"></i> Crear Ticket de Horas';
        }
        
        // Restaurar botón original
        const submitButton = modal.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Ticket';
            submitButton.style.background = '';
            submitButton.style.borderColor = '';
            submitButton.classList.remove('editing-mode');
        }
        
        // Remover contenedores de edición
        const infoContainer = modal.querySelector('.editing-info');
        if (infoContainer) {
            infoContainer.remove();
        }
        
        const feedbackContainer = modal.querySelector('.rejection-feedback');
        if (feedbackContainer) {
            feedbackContainer.remove();
        }
        
    } catch (error) {
        console.error('Error limpiando modo edición:', error);
    }
}

async function viewAssignmentReports(assignmentId) {  
    try {
        const assignment = userAssignments.find(a => {
            if (a.assignmentType === 'support') return a.assignmentId === assignmentId;
            if (a.assignmentType === 'project') return a.projectAssignmentId === assignmentId;
            if (a.assignmentType === 'task') return a.taskAssignmentId === assignmentId;
            return false;
        });
        
        if (!assignment) {
            showError('Asignación no encontrada');
            return;
        }
        
        // ✅ Agregar await
        const company = await window.PortalDB.getCompany(assignment.companyId);
        const module = await window.PortalDB.getModule(assignment.moduleId);
        
        const reportsData = await window.PortalDB.getReportsByAssignment(assignmentId);
        const reports = normalizeReports(reportsData);
        
        const assignmentInfoElement = document.getElementById('assignmentReportsInfo');
        if (assignmentInfoElement) {
            let assignmentDetails = '';
            
            if (assignment.assignmentType === 'project') {
                // ✅ Agregar await
                const project = await window.PortalDB.getProject(assignment.projectId);
                assignmentDetails = `
                    <div class="assignment-info-display">
                        <h4><i class="fa-solid fa-file-alt"></i> Información de la Asignación</h4>
                        <p><strong><i class="fa-solid fa-building"></i> Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                        <p><strong><i class="fa-solid fa-bullseye"></i> Proyecto:</strong> ${project?.name || 'No encontrado'}</p>
                        <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                        <p><strong><i class="fa-solid fa-file-alt"></i> Descripción:</strong> ${project?.description || 'Sin descripción'}</p>
                    </div>
                `;
            } else if (assignment.assignmentType === 'task') {
                // ✅ Agregar await
                const support = await window.PortalDB.getSupport(assignment.linkedSupportId);
                assignmentDetails = `
                    <div class="assignment-info-display">
                        <h4><i class="fa-solid fa-file-alt"></i> Información de la Asignación</h4>
                        <p><strong><i class="fa-solid fa-building"></i> Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                        <p><strong><i class="fa-solid fa-headset"></i> Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                        <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                        <p><strong><i class="fa-solid fa-clipboard-list"></i> Descripción:</strong> ${assignment.descripcion || 'Sin descripción'}</p>
                    </div>
                `;
            } else {
                // ✅ Agregar await
                const support = await window.PortalDB.getSupport(assignment.supportId);
                assignmentDetails = `
                    <div class="assignment-info-display">
                        <h4><i class="fa-solid fa-file-alt"></i> Información de la Asignación</h4>
                        <p><strong><i class="fa-solid fa-building"></i> Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                        <p><strong><i class="fa-solid fa-headset"></i> Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                        <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                    </div>
                `;
            }
            
            assignmentInfoElement.innerHTML = assignmentDetails;
        }
        
        // Mostrar lista de reportes...
        const reportsListElement = document.getElementById('reportsList');
        if (reportsListElement) {
            if (reports.length === 0) {
                reportsListElement.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-file-alt"></i></div>
                        <div class="empty-state-title">No hay Tickets</div>
                        <div class="empty-state-desc">No has creado tickets para esta asignación</div>
                    </div>
                `;
            } else {
                reportsListElement.innerHTML = '<h4><i class="fa-solid fa-chart-line"></i> Tickets Enviados</h4>';
                
                reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                reports.forEach(report => {
                    const reportDiv = document.createElement('div');
                    reportDiv.className = 'report-item';
                    reportDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5 style="margin: 0; color: #2c3e50;">${report.title}</h5>
                            <span class="report-status status-${report.status.toLowerCase()}">${report.status}</span>
                        </div>
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">
                            <strong><i class="fa-solid fa-clock"></i> Horas:</strong> ${report.hours}h | 
                            <strong><i class="fa-solid fa-calendar"></i> Fecha:</strong> ${window.DateUtils.formatDate(report.reportDate)} |
                            <strong><i class="fa-solid fa-paper-plane"></i> Enviado:</strong> ${window.DateUtils.formatDateTime(report.createdAt)}
                        </p>
                        <p style="margin: 10px 0 0 0; color: #555; font-size: 0.9em; line-height: 1.4;">
                            ${report.description}
                        </p>
                        ${report.feedback ? `
                            <div style="background: #fff5f5; padding: 10px; border-radius: 6px; border-left: 3px solid #e74c3c; margin-top: 10px;">
                                <strong style="color: #e74c3c;">Comentarios de revisión:</strong>
                                <p style="margin: 5px 0 0 0; color: #666;">${report.feedback}</p>
                            </div>
                        ` : ''}
                    `;
                    reportsListElement.appendChild(reportDiv);
                });
            }
        }
        
        if (window.ModalUtils) {
            window.ModalUtils.open('viewReportsModal');
        }
        
    } catch (error) {
        console.error('Error en viewAssignmentReports:', error);
        showError('Error al ver reportes: ' + error.message);
        showError('Error al guardar cambios: ' + result.message);
    }
}

// === UTILIDADES MEJORADAS PARA MODALES ===
function closeModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Animación de salida
            modal.style.animation = 'fadeOut 0.3s ease';
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.animation = '';
                
                // Restaurar scroll del body
                document.body.style.overflow = 'auto';
                
                // Limpiar formularios
                const forms = modal.querySelectorAll('form');
                forms.forEach(form => form.reset());
            }, 300);
        }
        
        // Limpiar variables de estado
        if (modalId === 'createReportModal') {
            currentAssignmentId = null;
        }
        
    } catch (error) {
        console.error('Error en closeModal:', error);
    }
}

// Función mejorada para abrir modales
function openModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            
            // Prevenir scroll del body cuando el modal está abierto
            document.body.style.overflow = 'hidden';
            
            // Focus en el primer input del modal
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    } catch (error) {
        console.error('Error en openModal:', error);
    }
}

function logout() {
    try {
        if (confirm('¿Está seguro de cerrar sesión?')) {
            if (window.AuthSys) {
                window.AuthSys.logout();
            } else {
                window.location.href = '../index.html';
            }
        }
    } catch (error) {
        console.error('Error en logout:', error);
        window.location.href = '../index.html';
    }
}

// === FUNCIONES AUXILIARES PARA PROYECTOS ===
function openProjectReportModal(projectAssignmentId) {
    console.log('Abriendo modal de reporte para proyecto:', projectAssignmentId);
    // ✅ CORRECTO: Usar la función que realmente existe
    openCreateReportModal(projectAssignmentId);
}

async function viewProjectDetails(projectAssignmentId) {  // ✅ Agregar async
    const assignment = userAssignments.find(a => a.projectAssignmentId === projectAssignmentId);
    
    if (!assignment) {
        window.NotificationUtils.error('No se encontró la asignación del proyecto');
        return;
    }
    
    // ✅ Agregar await
    const project = await window.PortalDB.getProject(assignment.projectId);
    const company = await window.PortalDB.getCompany(assignment.companyId);
    const module = await window.PortalDB.getModule(assignment.moduleId);
    
    const details = `
   DETALLES DEL PROYECTO
════════════════════════════
   Proyecto: ${project?.name || 'No encontrado'}
   Cliente: ${company?.name || 'No encontrado'}  
   Módulo: ${module?.name || 'No encontrado'}
   Descripción: ${project?.description || 'Sin descripción'}
   Fecha de asignación: ${window.DateUtils.formatDate(assignment.createdAt)}
   ID de asignación: ${assignment.projectAssignmentId}
    `;
    
    if (window.ModalUtils && window.ModalUtils.showInfo) {
        window.ModalUtils.showInfo('Detalles del Proyecto', details);
    } else {
        alert(details);
    }
}

// === ACTUALIZAR CONTADOR EN SIDEBAR ===
function updateAssignmentsCount() {
    const badge = document.getElementById('assignmentsCount');
    if (badge) {
        badge.textContent = userAssignments.length;
    }
}

// ============================================================================
// SISTEMA DE REPORTES RECHAZADOS
// ============================================================================

/**
 * Cargar reportes rechazados del usuario actual
 */
async function loadRejectedReports() {
    try {
        // ✅ CORRECCIÓN: Convertir a array si viene como objeto
        const allReportsData = await window.PortalDB.getReports();
        const allReports = normalizeReports(allReportsData);
        
        const rejectedReports = allReports.filter(r => 
            r.userId === currentUser.userId && r.status === 'Rechazado'
        );
        
        console.log('📋 Reportes rechazados encontrados:', rejectedReports.length);
        return rejectedReports;
        
    } catch (error) {
        console.error('Error cargando reportes rechazados:', error);
        return [];
    }
}

/**
 * Editar un reporte rechazado
 */
// Línea ~1120-1180

async function editRejectedReport(reportId, updateData) {  // ✅ Agregar async
    try {
        if (!currentUser || !window.PortalDB) {
            throw new Error('Usuario no autenticado o PortalDB no disponible');
        }
        
        // ✅ Buscar el reporte correctamente en MongoDB
        const allReportsData = await window.PortalDB.getReports();
        const allReports = normalizeReports(allReportsData);
        
        const report = allReports.find(r => r.reportId === reportId);
        
        if (!report) {
            throw new Error('Reporte no encontrado');
        }
        
        if (report.userId !== currentUser.userId) {
            throw new Error('No tienes permisos para editar este reporte');
        }
        
        if (report.status !== 'Rechazado') {
            throw new Error('Solo se pueden editar reportes rechazados');
        }
        
        // Validaciones
        if (!updateData.title || !updateData.description || !updateData.hours || !updateData.date) {
            throw new Error('Todos los campos son obligatorios');
        }
        
        if (updateData.hours < 0.5 || updateData.hours > 24) {
            throw new Error('Las horas deben estar entre 0.5 y 24');
        }
        
        // ✅ Actualizar el reporte en MongoDB
        const result = await window.PortalDB.updateReport(reportId, {
            title: updateData.title,
            description: updateData.description,
            hours: updateData.hours,
            date: updateData.date,
            // NO cambiar el status aquí, eso lo hace resubmitReport
            updatedAt: new Date().toISOString()
        });
        
        if (result.success) {
            console.log('✅ Cambios guardados en reporte rechazado:', reportId);
            return result;
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error editando reporte:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Reenviar un reporte rechazado
 */
// Línea ~1195-1240

async function resubmitRejectedReport(reportId) {  // ✅ Agregar async
    try {
        if (!currentUser || !window.PortalDB) {
            throw new Error('Usuario no autenticado o PortalDB no disponible');
        }
        
        // ✅ Buscar el reporte correctamente en MongoDB
        const allReportsData = await window.PortalDB.getReports();
        const allReports = normalizeReports(allReportsData);
        
        const report = allReports.find(r => r.reportId === reportId);
        
        if (!report) {
            throw new Error('Ticket no encontrado');
        }
        
        if (report.userId !== currentUser.userId) {
            throw new Error('No tienes permisos para reenviar este ticket');
        }
        
        if (report.status !== 'Rechazado') {
            throw new Error('Solo se pueden reenviar reportes rechazados');
        }
        
        // ✅ Reenviar el reporte (cambiar status a "Pendiente" o "Resubmitted")
        const result = await window.PortalDB.updateReport(reportId, {
            status: 'Pendiente',  // O "Resubmitted" si prefieres
            resubmittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        if (result.success) {
            console.log('✅ Reporte reenviado:', reportId);
            
            if (window.NotificationUtils) {
                window.NotificationUtils.success('Ticket reenviado al administrador para revisión');
            }
            
            // Actualizar la vista
            setTimeout(() => {
                loadUserAssignments();
                updateRejectedReportsSection();
            }, 500);
            
            return result;
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error reenviando reporte:', error);
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Error: ' + error.message);
        }
        return { success: false, message: error.message };
    }
}

/**
 * Abrir modal para editar reporte rechazado
 */
// Línea ~1230-1320

async function openEditRejectedReportModal(reportId) {
    try {
        console.log('🔍 Buscando ticket rechazado:', reportId);
        
        // Buscar en MongoDB
        const allReportsData = await window.PortalDB.getReports();
        const allReports = normalizeReports(allReportsData);
        
        const report = allReports.find(r => r.reportId === reportId);
        
        if (!report) {
            console.error('❌ Ticket no encontrado:', reportId);
            showError('Ticket no encontrado');
            return;
        }
        
        console.log('✅ Ticket encontrado:', report);
        
        // Buscar la asignación completa
        const assignment = userAssignments.find(a => {
            if (report.assignmentType === 'support') return a.assignmentId === report.assignmentId;
            if (report.assignmentType === 'project') return a.projectAssignmentId === report.assignmentId;
            if (report.assignmentType === 'task') return a.taskAssignmentId === report.assignmentId;
            return false;
        });
        
        if (!assignment) {
            console.error('❌ Asignación no encontrada para el reporte');
            showError('No se encontró la asignación asociada al ticket');
            return;
        }
        
        console.log('✅ Asignación encontrada:', assignment);
        
        // Configurar el modal
        currentAssignmentId = report.assignmentId;
        const modal = document.getElementById('createReportModal');
        
        // ✅ CARGAR INFORMACIÓN DE LA ASIGNACIÓN EN EL MODAL (en lugar de loadAssignmentInfoInModal)
        const company = await window.PortalDB.getCompany(assignment.companyId);
        const module = await window.PortalDB.getModule(assignment.moduleId);
        
        // Llenar información del empleado
        const employeeDisplay = document.getElementById('employeeDisplay');
        if (employeeDisplay) {
            employeeDisplay.innerHTML = `${currentUser.name} (ID: ${currentUser.userId})`;
        }
        
        // Llenar información de la asignación
        const assignmentInfoElement = document.getElementById('selectedAssignmentInfo');
        if (assignmentInfoElement) {
            let assignmentDetails = '';
            
            if (assignment.assignmentType === 'project') {
                const project = await window.PortalDB.getProject(assignment.projectId);
                assignmentDetails = `
                    <h4><i class="fa-solid fa-bullseye"></i> Proyecto</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Proyecto:</strong> ${project?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            } else if (assignment.assignmentType === 'task') {
                const support = await window.PortalDB.getSupport(assignment.linkedSupportId);
                assignmentDetails = `
                    <h4><i class="fa-solid fa-tasks"></i> Tarea</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            } else {
                const support = await window.PortalDB.getSupport(assignment.supportId);
                assignmentDetails = `
                    <h4><i class="fa-solid fa-headset"></i> Soporte</h4>
                    <p><strong>Empresa:</strong> ${company?.name || 'No encontrada'}</p>
                    <p><strong>Soporte:</strong> ${support?.name || 'No encontrado'}</p>
                    <p><strong>Módulo:</strong> ${module?.name || 'No encontrado'}</p>
                `;
            }
            
            assignmentInfoElement.innerHTML = assignmentDetails;
        }
        
        // Pre-cargar datos del reporte
        document.getElementById('reportTitle').value = report.title || '';
        document.getElementById('reportDescription').value = report.description || '';
        document.getElementById('reportHours').value = report.hours || '';
        document.getElementById('reportDate').value = report.date ? report.date.split('T')[0] : '';
        
        // Marcar el modal como modo edición
        modal.dataset.isEditing = 'true';
        modal.dataset.editingReportId = reportId;
        
        // Cambiar el título del modal
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fa-solid fa-edit"></i> Editar Ticket Rechazado';
        }
        
        // Cambiar el texto del botón submit
        const submitBtn = modal.querySelector('.btn-submit');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
        }
        
        // Agregar feedback del admin si existe
        if (report.feedback) {
            const feedbackHtml = `
                <div class="form-section feedback-section" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                    <div class="section-title" style="color: #856404;">
                        <i class="fa-solid fa-comment-dots"></i> Comentarios del Administrador
                    </div>
                    <p style="margin: 10px 0 0 0; color: #856404;">${report.feedback}</p>
                </div>
            `;
            
            // Insertar antes del primer form-section
            const firstSection = modal.querySelector('.form-section');
            if (firstSection) {
                firstSection.insertAdjacentHTML('beforebegin', feedbackHtml);
            }
        }
        
        // Mostrar el modal
        modal.style.display = 'flex';
        
        console.log('✅ Modal abierto en modo edición');
        
    } catch (error) {
        console.error('❌ Error abriendo modal de edición:', error);
        showError('Error al abrir ticket: ' + error.message);
    }
}

/**
 * Reenvío rápido de reporte sin edición
 */
// Línea ~1345-1370

async function quickResubmitReport(reportId) {  // ✅ Agregar async
    // Confirmación más clara
    if (!confirm('¿Estás seguro de que quieres reenviar este ticket al administrador para nueva revisión?\n\nEl reporte cambiará de estado "Rechazado" a "Pendiente".')) {
        return;
    }
    
    const result = await resubmitRejectedReport(reportId);  // ✅ Agregar await
    
    if (result.success) {
        // Mensaje más claro
        if (window.NotificationUtils) {
            window.NotificationUtils.success('<i class="fa-solid fa-redo"></i> Reporte reenviado exitosamente. El administrador lo revisará nuevamente.');
        }
        
        // Actualizar la vista
        setTimeout(() => {
            if (typeof loadUserAssignments === 'function') {
                loadUserAssignments();
            }
            if (typeof updateRejectedReportsSection === 'function') {
                updateRejectedReportsSection();
            }
        }, 500);
    }
}

/**
 * Actualizar la sección de reportes rechazados en la vista
 */
// Línea ~1148

// Línea ~1148

async function updateRejectedReportsSection() {

    if (isUpdatingRejectedReports) {
        console.log('Ya se está actualizando la sección de reportes rechazados');
        return;
    }
    isUpdatingRejectedReports = true;

    try {
        console.log('Iniciando updateRejectedReportsSection...');
        
        const rejectedReports = await loadRejectedReports();
        console.log('Reportes rechazados cargados:', rejectedReports);
        console.log('Cantidad:', rejectedReports.length);
        
        const container = document.getElementById('rejectedReportsSection');
        console.log('Contenedor encontrado:', container);
        
        if (!container) {
            console.log('Contenedor de reportes rechazados no encontrado');
            return;
        }
        
        if (rejectedReports.length === 0) {
            console.log('No hay reportes rechazados, ocultando sección');
            container.style.display = 'none';
            return;
        }

        console.log('Mostrando sección de reportes rechazados');
        container.style.display = 'block';
        
        const rejectedContainer = document.getElementById('rejectedReportsContainer');
        console.log('Contenedor de cards:', rejectedContainer);

        if (!rejectedContainer) {
            console.log('No se encontró rejectedReportsContainer');
            return;
        }
        
        rejectedContainer.innerHTML = '';

        console.log('Renderizando', rejectedReports.length, 'tarjetas...');

        for (const report of rejectedReports) {
            console.log('Renderizando tarjeta para:', report.reportId);
            const card = await renderRejectedReportCard(report);
            console.log('Tarjeta creada:', card);
            rejectedContainer.appendChild(card);
        }

        console.log('Todas las tarjetas renderizadas');

        const badge = document.getElementById('rejectedCount');
        if (badge) {
            badge.textContent = rejectedReports.length;
            console.log('Badge actualizado:', rejectedReports.length);
        }
        
    } catch (error) {
        console.error('Error en updateRejectedReportsSection:', error);
        console.error('Stack:', error.stack);
    } finally {
        isUpdatingRejectedReports = false; 
        console.log('✅ Lock liberado');
    }
}

/**
 * Renderizar tarjeta de reporte rechazado
 */
// Línea ~1402

async function renderRejectedReportCard(report) {
    console.log('🎨 Iniciando renderizado de tarjeta para:', report.reportId);
    
    const card = document.createElement('div');
    card.className = 'rejected-report-card';
    
    console.log('📋 Buscando asignación para:', report.assignmentId, 'tipo:', report.assignmentType);
    
    const assignment = userAssignments.find(a => {
        if (report.assignmentType === 'support') return a.assignmentId === report.assignmentId;
        if (report.assignmentType === 'project') return a.projectAssignmentId === report.assignmentId;
        if (report.assignmentType === 'task') return a.taskAssignmentId === report.assignmentId;
        return false;
    });
    
    console.log('✅ Asignación encontrada:', assignment);
    
    if (!assignment) {
        console.log('⚠️ No se encontró asignación para el reporte rechazado');
    }
    
    const company = assignment ? await window.PortalDB.getCompany(assignment.companyId) : null;
    console.log('🏢 Company:', company);
    
    const module = assignment ? await window.PortalDB.getModule(assignment.moduleId) : null;
    console.log('🧩 Module:', module);
    
    let typeInfo = '';
    
    if (report.assignmentType === 'support' && assignment) {
        console.log('🔧 Cargando info de soporte...');
        const support = await window.PortalDB.getSupport(assignment.supportId);
        console.log('🛠️ Support:', support);
        
        typeInfo = `
            <p><strong><i class="fa-solid fa-headset"></i> Soporte:</strong> ${support?.name || 'Soporte no encontrado'}</p>
            <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
        `;
    } else if (report.assignmentType === 'project' && assignment) {
        console.log('📂 Cargando info de proyecto...');
        const project = await window.PortalDB.getProject(assignment.projectId);
        console.log('📊 Project:', project);
        
        typeInfo = `
            <p><strong><i class="fa-solid fa-diagram-project"></i> Proyecto:</strong> ${project?.name || 'Proyecto no encontrado'}</p>
            <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
        `;
    } else if (report.assignmentType === 'task' && assignment) {
        console.log('📋 Cargando info de tarea...');
        const support = await window.PortalDB.getSupport(assignment.linkedSupportId);
        console.log('🛠️ Linked Support:', support);
        
        typeInfo = `
            <p><strong><i class="fa-solid fa-tasks"></i> Tarea vinculada a:</strong> ${support?.name || 'Soporte no encontrado'}</p>
            <p><strong><i class="fa-solid fa-puzzle-piece"></i> Módulo:</strong> ${module?.name || 'Módulo no encontrado'}</p>
        `;
    }
    
    const typeLabel = report.assignmentType === 'support' ? 'SOPORTE' : 
                     report.assignmentType === 'project' ? 'PROYECTO' : 'TAREA';
    const typeClass = report.assignmentType === 'support' ? 'badge-support' : 
                     report.assignmentType === 'project' ? 'badge-project' : 'badge-task';
    
    console.log('🎨 Generando HTML de la tarjeta...');
    
    card.innerHTML = `
        <div class="rejected-report-header">
            <div class="rejected-report-title">
                <i class="fa-solid fa-ban"></i>
                <h3>${company?.name || 'Empresa no encontrada'}</h3>
                <span class="badge ${typeClass}">${typeLabel}</span>
                <span class="badge badge-rejected">RECHAZADO</span>
            </div>
        </div>
        <div class="rejected-report-body">
            <div class="rejected-report-info">
                ${typeInfo}
                <p><strong><i class="fa-solid fa-file-alt"></i> Ticket:</strong> ${report.title || report.description?.substring(0, 50) || 'Sin título'}</p>
                <p><strong><i class="fa-solid fa-clock"></i> Horas:</strong> ${report.hours} hrs | <strong><i class="fa-solid fa-calendar"></i> Fecha:</strong> ${window.DateUtils.formatDate(report.reportDate)}</p>
            </div>
            <div class="rejected-feedback">
                <h4><i class="fa-solid fa-comment-dots"></i> Comentarios del Administrador:</h4>
                <div class="feedback-content">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>${report.feedback || 'Sin comentarios'}</p>
                </div>
            </div>
            <div class="rejected-report-actions">
                <button class="btn btn-warning" onclick="openEditRejectedReportModal('${report.reportId}')">
                    <i class="fa-solid fa-edit"></i> EDITAR
                </button>
                <button class="btn btn-success" onclick="resubmitRejectedReport('${report.reportId}')">
                    <i class="fa-solid fa-paper-plane"></i> REENVIAR
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ Tarjeta HTML generada');
    
    return card;
}

function formatReportDate(report) {
    try {
        if (report.reportDate) {
            return new Date(report.reportDate).toLocaleDateString('es-ES');
        } else if (report.date) {
            return new Date(report.date).toLocaleDateString('es-ES');
        } else if (report.createdAt) {
            return new Date(report.createdAt).toLocaleDateString('es-ES');
        }
        return 'Fecha no disponible';
    } catch (error) {
        return 'Fecha inválida';
    }
}

function renderRejectionFeedback(report) {
    if (!report.feedback) {
        return '';
    }
    
    return `
        <div class="rejection-feedback" style="
            background: #ffe3e3; 
            border: 1px solid #ff4757; 
            border-radius: 6px; 
            padding: 12px; 
            margin-bottom: 15px;
        ">
            <strong style="color: #ff4757;"><i class="fa-solid fa-comments"></i> Comentarios del Administrador:</strong><br>
            <span style="color: #721c24;">${report.feedback}</span>
        </div>
    `;
}

function renderReportActions(reportId) {
    return `
        <div class="assignment-actions report-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
            <button class="btn btn-primary" onclick="openEditRejectedReportModal('${reportId}')" style="
                background: #ffa502; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer;
            ">
                <i class="fa-solid fa-pencil-alt"></i> Editar
            </button>
            <button class="btn btn-secondary" onclick="quickResubmitReport('${reportId}')" style="
                background: #2ed573; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer;
            ">
                <i class="fa-solid fa-redo"></i> Reenviar
            </button>
        </div>
    `;
}

/**
 * Normalizar campos de reporte para compatibilidad
 * MongoDB puede usar "date" o "reportDate", "title" puede estar vacío
 */
function normalizeReport(report) {
    return {
        ...report,
        // ✅ Asegurar que siempre haya "title"
        title: report.title || report.description?.substring(0, 50) || 'Sin título',
        
        // ✅ Unificar fecha: priorizar reportDate, luego date
        reportDate: report.reportDate || report.date || report.createdAt,
        
        // ✅ También agregar "date" para compatibilidad inversa
        date: report.date || report.reportDate || report.createdAt,
        
        // ✅ Asegurar que hours sea número
        hours: parseFloat(report.hours) || 0
    };
}

/**
 * Normalizar array de reportes
 */
function normalizeReports(reports) {
    const reportsArray = Array.isArray(reports) 
        ? reports 
        : Object.values(reports || {});
    
    return reportsArray.map(normalizeReport);
}

// Exportar nuevas funciones
window.getAssignmentDisplayInfo = getAssignmentDisplayInfo;
window.renderRejectedReportCard = renderRejectedReportCard;
window.updateRejectedReportsSection = updateRejectedReportsSection;
window.formatReportDate = formatReportDate;

// Exportar funciones globalmente
window.loadRejectedReports = loadRejectedReports;
window.editRejectedReport = editRejectedReport;
window.resubmitRejectedReport = resubmitRejectedReport;
window.openEditRejectedReportModal = openEditRejectedReportModal;
window.quickResubmitReport = quickResubmitReport;
window.cleanupEditingMode = cleanupEditingMode;

// === FUNCIONES EXPORTADAS GLOBALMENTE ===
window.openCreateReportModal = openCreateReportModal;
window.viewAssignmentReports = viewAssignmentReports;
window.closeModal = closeModal;
window.logout = logout;
window.hideError = hideError;

window.openProjectReportModal = openProjectReportModal;
window.viewProjectDetails = viewProjectDetails;

window.silentDataRefresh = silentDataRefresh;
window.updateCountersOnly = updateCountersOnly;

window.normalizeReport = normalizeReport;
window.normalizeReports = normalizeReports;

console.log('✅ Funciones del consultor exportadas globalmente');