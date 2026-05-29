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
let pendingRealtimeRefresh = false;

// === MANEJO DE ERRORES ===
function showError(message) {
    console.error('Error:', message);
    if (window.ArvicToast) {
        window.ArvicToast.error('Error', message, 5000);
        return;
    }
    
    // Fallback
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
                if (window.AuthSys) window.AuthSys.logout();
                else window.location.href = window.location.protocol === 'file:' ? '../index.html' : '/';
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
        if (userNameElement) userNameElement.textContent = currentUser.name;

        // Sidebar user info
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserId = document.getElementById('sidebarUserId');
        if (sidebarUserName) sidebarUserName.textContent = currentUser.name;
        if (sidebarUserId) sidebarUserId.textContent = 'ID: ' + currentUser.userId;
        
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
        
        // Auto-refresh en segundo plano cada 10 segundos
        setInterval(() => {
            if (isInitialized && !isUserInteracting()) {
                if (pendingRealtimeRefresh) {
                    console.log('🔄 Ejecutando refresco en tiempo real pospuesto...');
                    pendingRealtimeRefresh = false;
                    silentDataRefresh();
                } else {
                    silentDataRefresh();
                }
            }
        }, 10000);

        // Escuchar eventos en tiempo real via SSE
        document.addEventListener('timesheetUpdated', async (e) => {
            const data = e.detail;
            console.log('🔔 Evento de timesheetUpdated capturado en Consultor:', data);
            
            // Determinar si el cambio afecta al consultor actual
            const isCurrentUser = currentUser && (data.userId === currentUser.userId);
            const isMassUpdate = data.action === 'mass-update' || !data.userId;
            
            if (isCurrentUser || isMassUpdate) {
                if (!isUserInteracting()) {
                    console.log('🔄 Actualizando grid de timesheet de inmediato via SSE...');
                    pendingRealtimeRefresh = false;
                    await silentDataRefresh();
                } else {
                    console.log('⏳ Usuario interactuando, posponiendo actualización en tiempo real.');
                    pendingRealtimeRefresh = true;
                }
            }
        });
        
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
        
        // Sincronizar reportes y actualizar grid/historial en segundo plano si está activo
        const currentViewEl = document.querySelector('.consultor-sidebar .menu-item.active');
        const currentView = currentViewEl ? currentViewEl.dataset.view : 'timesheet';
        
        if (currentView === 'timesheet') {
            console.log('🔄 Sincronizando timesheet semanal en segundo plano...');
            await renderTimesheetGrid();
        } else if (currentView === 'historial') {
            console.log('🔄 Sincronizando historial en segundo plano...');
            await renderHistorial();
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
                            <div style="background: var(--gray-50); padding: 10px; border-radius: 6px; border-left: 3px solid var(--accent-color); margin-top: 10px;">
                                <strong style="color: var(--accent-color);">Comentarios de revisión:</strong>
                                <p style="margin: 5px 0 0 0; color: var(--gray-600);">${report.feedback}</p>
                            </div>
                        ` : ''}
                        <div style="margin-top:10px;">
                            <button class="btn btn-sm" style="background: var(--primary-light); color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;" onclick="if(window.chatWidget) window.chatWidget.setContext('${report.reportId || report.id}', true, 'Chat de Ticket: ${report.reportId || report.id}')">
                                <i class="fa-solid fa-comments"></i> Chat del Ticket
                            </button>
                        </div>
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
        if (window.AuthSys) {
            window.AuthSys.logout();
        } else {
            window.location.href = window.location.protocol === 'file:' ? '../index.html' : '/';
        }
    } catch (error) {
        console.error('Error en logout:', error);
        window.location.href = window.location.protocol === 'file:' ? '../index.html' : '/';
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
                        <div class="form-section feedback-section" style="background: var(--gray-100); border-left: 4px solid var(--warning-color); padding: 15px; margin-bottom: 20px;">
                    <div class="section-title" style="color: var(--warning-color);">
                        <i class="fa-solid fa-comment-dots"></i> Comentarios del Administrador
                    </div>
                    <p style="margin: 10px 0 0 0; color: var(--gray-700);">${report.feedback}</p>
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
            background: var(--gray-50); 
            border: 1px solid var(--accent-color); 
            border-radius: 6px; 
            padding: 12px; 
            margin-bottom: 15px;
        ">
            <strong style="color: var(--accent-color);"><i class="fa-solid fa-comments"></i> Comentarios del Administrador:</strong><br>
            <span style="color: var(--gray-600);">${report.feedback}</span>
        </div>
    `;
}

function renderReportActions(reportId) {
    return `
        <div class="assignment-actions report-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
            <button class="btn btn-primary" onclick="openEditRejectedReportModal('${reportId}')" style="
                background: var(--warning-color); 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer;
            ">
                <i class="fa-solid fa-pencil-alt"></i> Editar
            </button>
            <button class="btn btn-secondary" onclick="quickResubmitReport('${reportId}')" style="
                background: var(--success-color); 
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

// ==============================================
// TIMESHEET SEMANAL — SISTEMA DE CUADRÍCULA
// ==============================================

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
let currentWeekStart = null; // Date object for Monday of current week
let timesheetDraft = {}; // { assignmentId: { mon: {hours,detail}, tue: ... } }
let activeDetailPopover = null;
let activeDetailBackdrop = null;

/**
 * Get Monday of the week containing the given date
 */
function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * Get the Sunday (end) of a week given its Monday
 */
function getSunday(monday) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return sunday;
}

/**
 * Format date as "dd MMM"
 */
function formatShortDate(date) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return date.getDate() + ' ' + months[date.getMonth()];
}

/**
 * Format date as YYYY-MM-DD
 */
function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Get day index (0=Mon, 6=Sun) for today relative to current week
 */
function getTodayDayIndex() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!currentWeekStart) return -1;
    const diff = Math.floor((today - currentWeekStart) / 86400000);
    if (diff < 0 || diff > 6) return -1;
    return diff;
}

/**
 * Check if a day index is editable
 * Rules: future days are locked, today and past days of current week are editable
 */
function isDayEditable(dayIndex) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(currentWeekStart);
    cellDate.setDate(cellDate.getDate() + dayIndex);
    return cellDate <= today;
}

/**
 * Initialize the timesheet grid for the current week
 */
function initTimesheetGrid() {
    if (!currentWeekStart) {
        currentWeekStart = getMonday(new Date());
    }
    renderTimesheetGrid();
}

/**
 * Navigate between weeks
 */
function navigateWeek(direction) {
    if (!currentWeekStart) currentWeekStart = getMonday(new Date());
    
    // Don't allow navigating to future weeks
    const nextMonday = new Date(currentWeekStart);
    nextMonday.setDate(nextMonday.getDate() + (direction * 7));
    
    const thisMonday = getMonday(new Date());
    if (direction > 0 && nextMonday > thisMonday) return;
    
    // Save current draft before navigating
    saveTimesheetDraft();
    
    currentWeekStart = nextMonday;
    renderTimesheetGrid();
}

/**
 * Main render function for the timesheet grid
 */
async function renderTimesheetGrid() {
    console.log('📊 Renderizando timesheet semanal...');
    
    // Sincronizar borradores y reportes desde MongoDB Atlas
    if (window.PortalDB && window.PortalDB.getReportsByUser && currentUser) {
        try {
            await window.PortalDB.getReportsByUser(currentUser.userId);
        } catch (e) {
            console.error('Error al sincronizar reportes desde la BD:', e);
        }
    }
    
    if (!currentWeekStart) currentWeekStart = getMonday(new Date());
    
    const sunday = getSunday(currentWeekStart);
    const weekStartStr = toISODate(currentWeekStart);
    const thisMonday = getMonday(new Date());
    
    // Update week navigator display
    const weekRange = document.getElementById('weekRangeDisplay');
    if (weekRange) {
        weekRange.textContent = `${formatShortDate(currentWeekStart)} — ${formatShortDate(sunday)} ${sunday.getFullYear()}`;
    }
    
    // Disable next button if we're on current week
    const nextBtn = document.getElementById('weekNextBtn');
    if (nextBtn) {
        nextBtn.disabled = currentWeekStart >= thisMonday;
    }
    
    // Update date headers
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const el = document.getElementById('date' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]);
        if (el) el.textContent = formatShortDate(date);
    }
    
    // Check if there's an existing timesheet for this week
    const existingTs = window.PortalDB.getTimesheetByWeek(currentUser.userId, weekStartStr);
    const weekStatus = existingTs ? existingTs.status : 'Borrador';
    const isReadOnly = weekStatus === 'Pendiente' || weekStatus === 'Aprobado';
    
    // Update status badge
    const statusBadge = document.getElementById('weekStatusBadge');
    if (statusBadge) {
        statusBadge.setAttribute('data-status', weekStatus);
        statusBadge.querySelector('.week-status-text').textContent = weekStatus;
    }
    
    // Load draft data from existing timesheet or localStorage
    loadTimesheetDraft(weekStartStr, existingTs);
    
    // Build table body
    const tbody = document.getElementById('timesheetBody');
    if (!tbody) return;
    
    if (userAssignments.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('timesheetTable').style.display = 'none';
        document.getElementById('timesheetEmptyState').style.display = 'block';
        document.getElementById('timesheetActions').style.display = 'none';
        return;
    }
    
    document.getElementById('timesheetTable').style.display = '';
    document.getElementById('timesheetEmptyState').style.display = 'none';
    document.getElementById('timesheetActions').style.display = '';
    
    let html = '';
    const todayIdx = getTodayDayIndex();
    
    for (const assignment of userAssignments) {
        const aId = assignment.assignmentId || assignment.projectAssignmentId || assignment.taskAssignmentId;
        const aType = assignment.assignmentType;
        
        // Get display info
        const company = await window.PortalDB.getCompany(assignment.companyId);
        const module = await window.PortalDB.getModule(assignment.moduleId);
        const moduleText = module ? (window.convertModuleToAcronym(module.name) || module.name) : 'GENERAL';

        let entityName = '';
        let icon = 'fa-headset';
        
        if (aType === 'support') {
            const support = await window.PortalDB.getSupport(assignment.supportId);
            entityName = support?.name || 'Soporte';
            icon = 'fa-headset';
        } else if (aType === 'project') {
            const project = await window.PortalDB.getProject(assignment.projectId);
            entityName = project?.name || 'Proyecto';
            icon = 'fa-folder-open';
        } else if (aType === 'task') {
            entityName = assignment.descripcion || 'Tarea';
            icon = 'fa-tasks';
        }
        
        const draft = timesheetDraft[aId] || {};
        let rowTotal = 0;
        
        let dayCells = '';
        for (let i = 0; i < 7; i++) {
            const dayKey = DAY_KEYS[i];
            const hours = draft[dayKey]?.hours || 0;
            const detail = draft[dayKey]?.detail || '';
            rowTotal += hours;
            
            const editable = isDayEditable(i) && !isReadOnly;
            const isToday = i === todayIdx;
            const hasValue = hours > 0;
            
            let inputClass = 'ts-hour-input';
            if (hasValue) inputClass += ' has-value';
            if (isToday) inputClass += ' today';
            if (!editable) inputClass += ' locked';
            
            const hasDetailText = detail && detail.trim().length > 0;
            let indicatorClass = 'ts-detail-indicator';
            if (hasDetailText) {
                indicatorClass += ' visible populated';
            } else if (hours > 0) {
                indicatorClass += ' visible warning';
            }

            dayCells += `
                <td class="ts-day-cell">
                    <input type="number" 
                        class="${inputClass}" 
                        value="${hours || ''}" 
                        min="0" max="24" step="0.5"
                        data-assignment="${aId}" 
                        data-day="${dayKey}"
                        ${!editable ? 'disabled' : ''}
                        onchange="onHourChange(this)"
                        onfocus="onHourFocus(this)"
                        ondblclick="if(parseFloat(this.value) > 0) window.showDetailPopover(this, '${aId}', '${dayKey}')"
                        title="${detail ? 'Detalle: ' + detail : (editable ? 'Clic para ingresar horas' : 'Día bloqueado')}"
                    >
                    <span class="${indicatorClass}" 
                        data-assignment="${aId}" 
                        data-day="${dayKey}"
                        onclick="if(${editable}) window.showDetailPopover(this.parentNode.querySelector('input'), '${aId}', '${dayKey}')"
                        style="cursor:pointer;"
                        title="${hasDetailText ? 'Detalle: ' + detail : (hours > 0 ? 'Falta justificación obligatoria (Clic para escribir)' : 'Clic para ingresar horas')}"
                    ></span>
                </td>
            `;
        }
        
        html += `
            <tr data-assignment-id="${aId}">
                <td class="ts-assignment-cell">
                    <div class="ts-assignment-label">
                        <div class="ts-assignment-icon ${aType}">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div>
                            <div class="ts-assignment-name">${entityName}</div>
                            <div class="ts-assignment-company">
                                ${company?.name || ''} 
                                <span class="ts-type-badge ${aType}">${aType === 'support' ? 'Soporte' : aType === 'project' ? 'Proyecto' : 'Tarea'}</span>
                                <span class="ts-module-badge" title="Módulo: ${module?.name || 'General'}">${moduleText}</span>
                            </div>
                        </div>
                    </div>
                </td>
                ${dayCells}
                <td class="ts-row-total" id="rowTotal_${aId}">${rowTotal > 0 ? rowTotal.toFixed(1) : '0'}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
    updateTimesheetTotals();
    
    // Update buttons state
    const submitBtn = document.getElementById('btnSubmitWeek');
    const clearBtn = document.getElementById('btnClearDraft');
    if (submitBtn) {
        submitBtn.disabled = isReadOnly;
        if (isReadOnly) {
            submitBtn.innerHTML = weekStatus === 'Pendiente' 
                ? '<i class="fa-solid fa-clock"></i> Enviado — Pendiente'
                : weekStatus === 'Aprobado'
                    ? '<i class="fa-solid fa-check-circle"></i> Aprobado'
                    : '<i class="fa-solid fa-paper-plane"></i> Enviar Semana';
        } else {
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Semana';
        }
    }
    if (clearBtn) clearBtn.disabled = isReadOnly;
    
    // Check for rejected timesheets
    checkRejectedTimesheets();
}

/**
 * Handle hour input change — save draft and prompt for detail
 */
function onHourChange(input) {
    const aId = input.dataset.assignment;
    const dayKey = input.dataset.day;
    let hours = parseFloat(input.value) || 0;
    
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    input.value = hours || '';
    
    // Initialize draft structure
    if (!timesheetDraft[aId]) timesheetDraft[aId] = {};
    if (!timesheetDraft[aId][dayKey]) timesheetDraft[aId][dayKey] = { hours: 0, detail: '' };
    
    timesheetDraft[aId][dayKey].hours = hours;
    
    // Update classes
    input.classList.toggle('has-value', hours > 0);
    
    // Update indicator classes
    const indicator = document.querySelector(`.ts-detail-indicator[data-assignment="${aId}"][data-day="${dayKey}"]`);
    if (indicator) {
        indicator.className = 'ts-detail-indicator';
        const detailText = timesheetDraft[aId][dayKey].detail || '';
        if (detailText.trim().length > 0) {
            indicator.classList.add('visible', 'populated');
            indicator.title = 'Detalle: ' + detailText;
        } else if (hours > 0) {
            indicator.classList.add('visible', 'warning');
            indicator.title = 'Falta justificación obligatoria (Clic para escribir)';
        }
    }

    // Update row total
    updateRowTotal(aId);
    updateTimesheetTotals();
    saveTimesheetDraft();
    
    // Sincronizar con MongoDB en segundo plano
    saveDraftCellToMongoDB(aId, dayKey, hours, timesheetDraft[aId][dayKey].detail || '');
    
    // If hours > 0 and no detail yet, prompt for detail
    if (hours > 0 && (!timesheetDraft[aId][dayKey].detail || !timesheetDraft[aId][dayKey].detail.trim())) {
        showDetailPopover(input, aId, dayKey);
    }
}

/**
 * Handle hour input focus — show detail popover if there are hours
 */
function onHourFocus(input) {
    // Close any existing popover
    closeDetailPopover();
}

/**
 * Show detail popover for entering work description
 */
function showDetailPopover(anchor, aId, dayKey) {
    closeDetailPopover();
    
    const currentDetail = timesheetDraft[aId]?.[dayKey]?.detail || '';
    const dayNames = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' };
    
    const popover = document.createElement('div');
    popover.className = 'ts-detail-popover';
    popover.innerHTML = `
        <label style="font-weight:600; font-size:0.85em; color:#374151; margin-bottom:6px; display:block;">
            <i class="fa-solid fa-pen"></i> Detalle — ${dayNames[dayKey]}
        </label>
        <textarea id="detailTextarea" placeholder="¿Qué trabajaste hoy? Ej: Configuración de módulo FI...">${currentDetail}</textarea>
        <div class="ts-detail-actions">
            <button class="btn btn-secondary" style="padding:6px 14px; font-size:0.82em;" onclick="closeDetailPopover()">
                Cerrar
            </button>
            <button class="btn btn-primary" style="padding:6px 14px; font-size:0.82em;" onclick="saveDetail('${aId}','${dayKey}')">
                <i class="fa-solid fa-check"></i> Guardar
            </button>
        </div>
    `;
    
    // Check if mobile view
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        popover.classList.add('mobile-modal');
        
        // Create a backdrop overlay
        const backdrop = document.createElement('div');
        backdrop.className = 'ts-popover-backdrop';
        backdrop.onclick = closeDetailPopover;
        document.body.appendChild(backdrop);
        document.body.appendChild(popover);
        
        activeDetailBackdrop = backdrop;
    } else {
        const cell = anchor.closest('.ts-day-cell');
        if (cell) {
            cell.style.position = 'relative';
            cell.appendChild(popover);
        }
    }
    
    activeDetailPopover = popover;
    
    setTimeout(() => {
        const textarea = popover.querySelector('textarea');
        if (textarea) textarea.focus();
    }, 100);
}

function closeDetailPopover() {
    if (activeDetailPopover) {
        activeDetailPopover.remove();
        activeDetailPopover = null;
    }
    if (activeDetailBackdrop) {
        activeDetailBackdrop.remove();
        activeDetailBackdrop = null;
    }
}

function saveDetail(aId, dayKey) {
    const textarea = document.getElementById('detailTextarea');
    if (!textarea) return;
    
    if (!timesheetDraft[aId]) timesheetDraft[aId] = {};
    if (!timesheetDraft[aId][dayKey]) timesheetDraft[aId][dayKey] = { hours: 0, detail: '' };
    
    timesheetDraft[aId][dayKey].detail = textarea.value.trim();
    
    const val = textarea.value.trim();
    timesheetDraft[aId][dayKey].detail = val;
    
    // Update indicator
    const indicator = document.querySelector(`.ts-detail-indicator[data-assignment="${aId}"][data-day="${dayKey}"]`);
    const input = document.querySelector(`input[data-assignment="${aId}"][data-day="${dayKey}"]`);
    const hours = parseFloat(input?.value) || 0;

    if (indicator) {
        indicator.className = 'ts-detail-indicator';
        if (val.length > 0) {
            indicator.classList.add('visible', 'populated');
            indicator.title = 'Detalle: ' + val;
        } else if (hours > 0) {
            indicator.classList.add('visible', 'warning');
            indicator.title = 'Falta justificación obligatoria (Clic para escribir)';
        }
    }
    
    // Update title attribute of the input
    if (input) input.title = val ? 'Detalle: ' + val : 'Clic para ingresar horas';
    
    closeDetailPopover();
    saveTimesheetDraft();
    
    // Sincronizar detalle con MongoDB en segundo plano
    saveDraftCellToMongoDB(aId, dayKey, hours, val);
    
    if (window.NotificationUtils) {
        window.NotificationUtils.success('Detalle guardado', 1500);
    }
}

/**
 * Update row total for assignment
 */
function updateRowTotal(aId) {
    const draft = timesheetDraft[aId] || {};
    let total = 0;
    DAY_KEYS.forEach(dk => { total += (draft[dk]?.hours || 0); });
    
    const el = document.getElementById('rowTotal_' + aId);
    if (el) el.textContent = total > 0 ? total.toFixed(1) : '0';
}

/**
 * Update all column totals and grand total
 */
function updateTimesheetTotals() {
    let grandTotal = 0;
    
    DAY_KEYS.forEach((dk, i) => {
        let dayTotal = 0;
        Object.keys(timesheetDraft).forEach(aId => {
            dayTotal += (timesheetDraft[aId]?.[dk]?.hours || 0);
        });
        
        const el = document.getElementById('total' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]);
        if (el) el.textContent = dayTotal > 0 ? dayTotal.toFixed(1) : '0';
        
        grandTotal += dayTotal;
    });
    
    const el = document.getElementById('totalWeek');
    if (el) el.textContent = grandTotal > 0 ? grandTotal.toFixed(1) : '0';
}

/**
 * Save draft to localStorage
 */
function saveTimesheetDraft() {
    if (!currentUser || !currentWeekStart) return;
    const key = `ts_draft_${currentUser.userId}_${toISODate(currentWeekStart)}`;
    localStorage.setItem(key, JSON.stringify(timesheetDraft));
    
    const status = document.getElementById('autosaveStatus');
    if (status) {
        status.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Guardado ' + new Date().toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'});
    }
}

/**
 * Guardar una celda individual de borrador en MongoDB Atlas
 */
async function saveDraftCellToMongoDB(aId, dayKey, hours, detail) {
    if (!currentUser || !currentWeekStart || !window.PortalDB) return;
    
    const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(dayKey);
    if (dayIndex === -1) return;
    
    const cellDate = new Date(currentWeekStart);
    cellDate.setDate(cellDate.getDate() + dayIndex);
    const dateStr = toISODate(cellDate);
    
    const reportId = `rep_draft_${currentUser.userId}_${aId}_${dateStr.replace(/-/g, '')}`;
    
    try {
        const reports = await window.PortalDB.getReports();
        const existingReport = reports[reportId];
        
        if (hours === 0) {
            if (existingReport) {
                console.log(`🗑️ Eliminando borrador en la BD: ${reportId}`);
                await window.PortalDB.deleteReport(reportId);
            }
            return;
        }
        
        const assignment = userAssignments.find(a => 
            (a.assignmentId === aId || a.projectAssignmentId === aId || a.taskAssignmentId === aId)
        );
        
        let label = aId;
        if (assignment) {
            const company = await window.PortalDB.getCompany(assignment.companyId);
            if (assignment.assignmentType === 'support') {
                const support = await window.PortalDB.getSupport(assignment.supportId);
                label = (support?.name || 'Soporte') + ' — ' + (company?.name || '');
            } else if (assignment.assignmentType === 'project') {
                const project = await window.PortalDB.getProject(assignment.projectId);
                label = (project?.name || 'Proyecto') + ' — ' + (company?.name || '');
            } else {
                label = (assignment.descripcion || 'Tarea') + ' — ' + (company?.name || '');
            }
        }
        
        const finalDescription = (detail && detail.trim()) ? detail.trim() : 'JUSTIFICACION_PENDIENTE';

        const reportData = {
            reportId,
            userId: currentUser.userId,
            assignmentId: aId,
            assignmentType: assignment?.assignmentType || 'support',
            companyId: assignment?.companyId || 'GENERAL',
            moduleId: assignment?.moduleId || 'GENERAL',
            title: `Timesheet ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayIndex]} ${formatShortDate(cellDate)} — ${label}`,
            description: finalDescription,
            hours,
            date: dateStr,
            reportDate: dateStr,
            status: 'Borrador'
        };
        
        if (assignment) {
            if (assignment.supportId) reportData.supportId = assignment.supportId;
            if (assignment.projectId) reportData.projectId = assignment.projectId;
        }
        
        if (existingReport) {
            console.log(`📝 Actualizando borrador en la BD: ${reportId}`);
            await window.PortalDB.updateReport(reportId, {
                hours,
                description: finalDescription,
                title: reportData.title
            });
        } else {
            console.log(`➕ Creando borrador en la BD: ${reportId}`);
            await window.PortalDB.createReport(reportData);
        }
    } catch (e) {
        console.error('Error guardando celda de borrador en MongoDB:', e);
    }
}

/**
 * Load draft from localStorage or existing timesheet
 */
function loadTimesheetDraft(weekStartStr, existingTs) {
    timesheetDraft = {};
    
    if (existingTs && existingTs.entries) {
        // Load from existing submitted timesheet
        existingTs.entries.forEach(entry => {
            timesheetDraft[entry.assignmentId] = { ...entry.days };
        });
    } else {
        // Load from localStorage draft
        const key = `ts_draft_${currentUser.userId}_${weekStartStr}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { timesheetDraft = JSON.parse(saved); } catch(e) { timesheetDraft = {}; }
        }
    }
}

/**
 * Clear the current week's draft
 */
function clearWeekDraft() {
    if (!confirm('¿Limpiar todas las horas de esta semana?')) return;
    
    timesheetDraft = {};
    const key = `ts_draft_${currentUser.userId}_${toISODate(currentWeekStart)}`;
    localStorage.removeItem(key);
    
    // Eliminar reportes de borrador en MongoDB Atlas en segundo plano
    if (window.PortalDB && currentUser && currentWeekStart) {
        const weekStartStr = toISODate(currentWeekStart);
        window.PortalDB.getReports().then(reports => {
            Object.values(reports).forEach(async report => {
                if (report.userId === currentUser.userId && report.status === 'Borrador') {
                    const dateStr = report.reportDate || report.date;
                    if (dateStr) {
                        const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
                        const day = d.getDay();
                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                        const monday = new Date(d.setDate(diff));
                        if (toISODate(monday) === weekStartStr) {
                            try {
                                await window.PortalDB.deleteReport(report.reportId);
                            } catch (e) {
                                console.error('Error eliminando borrador en BD:', e);
                            }
                        }
                    }
                }
            });
        });
    }
    
    renderTimesheetGrid();
    
    if (window.NotificationUtils) {
        window.NotificationUtils.info('Borrador limpiado', 2000);
    }
}

/**
 * Submit the weekly timesheet — generates individual reports for compatibility
 */
async function submitWeeklyTimesheet() {
    if (!currentUser || !currentWeekStart) return;
    
    const weekStartStr = toISODate(currentWeekStart);
    const sundayStr = toISODate(getSunday(currentWeekStart));
    
    // Check if already submitted
    const existing = window.PortalDB.getTimesheetByWeek(currentUser.userId, weekStartStr);
    if (existing && (existing.status === 'Pendiente' || existing.status === 'Aprobado')) {
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Esta semana ya fue enviada y está ' + existing.status.toLowerCase());
        }
        return;
    }
    
    // Validate: at least some hours entered
    let totalHours = 0;
    let entries = [];
    let hasDetail = true;
    
    for (const aId of Object.keys(timesheetDraft)) {
        const draft = timesheetDraft[aId];
        let entryTotal = 0;
        const days = {};
        
        DAY_KEYS.forEach(dk => {
            const h = draft[dk]?.hours || 0;
            const d = draft[dk]?.detail || '';
            days[dk] = { hours: h, detail: d };
            entryTotal += h;
            if (h > 0 && !d) hasDetail = false;
        });
        
        if (entryTotal > 0) {
            const assignment = userAssignments.find(a => {
                return (a.assignmentId === aId || a.projectAssignmentId === aId || a.taskAssignmentId === aId);
            });
            
            // Build label
            let label = aId;
            if (assignment) {
                const company = await window.PortalDB.getCompany(assignment.companyId);
                if (assignment.assignmentType === 'support') {
                    const support = await window.PortalDB.getSupport(assignment.supportId);
                    label = (support?.name || 'Soporte') + ' — ' + (company?.name || '');
                } else if (assignment.assignmentType === 'project') {
                    const project = await window.PortalDB.getProject(assignment.projectId);
                    label = (project?.name || 'Proyecto') + ' — ' + (company?.name || '');
                } else {
                    label = (assignment.descripcion || 'Tarea') + ' — ' + (company?.name || '');
                }
            }
            
            entries.push({
                assignmentId: aId,
                assignmentType: assignment?.assignmentType || 'support',
                assignmentLabel: label,
                days,
                totalHours: entryTotal
            });
            totalHours += entryTotal;
        }
    }
    
    if (totalHours === 0) {
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Debes ingresar al menos una hora antes de enviar');
        }
        return;
    }
    
    if (!hasDetail) {
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Todos los días con horas registradas deben tener una justificación/detalle obligatorio.');
        } else {
            alert('Todos los días con horas registradas deben tener una justificación/detalle obligatorio.');
        }
        return;
    }
    
    // ──────────────────────────────────────────────
    // VALIDACIÓN DE LÍMITE DE HORAS PARA PROYECTOS
    // ──────────────────────────────────────────────
    const dbProjects = window.PortalDB.getProjects();
    const allTimesheets = window.PortalDB.getTimesheets();
    const portalData = window.PortalDB.getData();
    
    for (const entry of entries) {
        if (entry.assignmentType === 'project') {
            const assignment = userAssignments.find(a => 
                a.assignmentId === entry.assignmentId || 
                a.projectAssignmentId === entry.assignmentId || 
                a.taskAssignmentId === entry.assignmentId
            );
            
            if (assignment && assignment.projectId) {
                const project = dbProjects[assignment.projectId];
                if (project && project.maxHours && project.maxHours > 0) {
                    // Calcular horas consumidas a nivel proyecto
                    let consumedSoFar = 0;
                    Object.values(allTimesheets).forEach(ts => {
                        // Omitir el actual si estamos re-enviando, y omitir rechazados
                        if (ts.timesheetId === existing?.timesheetId) return; 
                        if (ts.status === 'Rechazado') return;
                        
                        if (ts.entries) {
                            ts.entries.forEach(e => {
                                const tsAssignment = Object.values(portalData.projectAssignments || {}).find(pa => 
                                    (pa.projectAssignmentId === e.assignmentId || pa.id === e.assignmentId)
                                );
                                if (tsAssignment && tsAssignment.projectId === project.projectId) {
                                    consumedSoFar += e.totalHours || 0;
                                }
                            });
                        }
                    });
                    
                    const projectedTotal = consumedSoFar + entry.totalHours;
                    
                    if (projectedTotal > project.maxHours) {
                        if (window.NotificationUtils) {
                            window.NotificationUtils.error(`No se puede enviar. El proyecto '${project.name}' excederá su límite. Límite: ${project.maxHours}h. Previamente Consumidas: ${consumedSoFar}h. Intento: +${entry.totalHours}h.`);
                        } else {
                            alert(`Error: Límite de horas excedido en proyecto ${project.name}`);
                        }
                        return; // ABORTAR ENVÍO
                    } else if (projectedTotal >= project.maxHours * 0.8) {
                        if (window.NotificationUtils) {
                            window.NotificationUtils.warning(`Advertencia: El proyecto '${project.name}' está al ${(projectedTotal / project.maxHours * 100).toFixed(1)}% de su capacidad total (${projectedTotal} / ${project.maxHours}h).`, 6000);
                        }
                    }
                }
            }
        }
    }
    
    if (!confirm(`¿Enviar timesheet de la semana ${formatShortDate(currentWeekStart)} — ${formatShortDate(getSunday(currentWeekStart))}?\n\nTotal: ${totalHours.toFixed(1)} horas en ${entries.length} asignación(es)`)) {
        return;
    }
    
    try {
        // 1. Eliminar borradores temporales correspondientes a esta semana en la BD
        for (const entry of entries) {
            for (let i = 0; i < 7; i++) {
                const cellDate = new Date(currentWeekStart);
                cellDate.setDate(cellDate.getDate() + i);
                const dateStr = toISODate(cellDate);
                const draftReportId = `rep_draft_${currentUser.userId}_${entry.assignmentId}_${dateStr.replace(/-/g, '')}`;
                try {
                    await window.PortalDB.deleteReport(draftReportId);
                } catch (e) { /* ignore if draft doesn't exist */ }
            }
        }

        // 2. Eliminar reportes antiguos asociados a este timesheet (en caso de re-envío)
        if (existing && existing.generatedReportIds && existing.generatedReportIds.length > 0) {
            for (const reportId of existing.generatedReportIds) {
                try {
                    await window.PortalDB.deleteReport(reportId);
                } catch (e) {
                    console.error('Error eliminando reporte antiguo:', e);
                }
            }
        }

        // 3. Crear los nuevos reportes permanentes en MongoDB
        const generatedReportIds = [];
        
        for (const entry of entries) {
            for (let i = 0; i < 7; i++) {
                const dk = DAY_KEYS[i];
                const dayData = entry.days[dk];
                if (dayData.hours > 0) {
                    const cellDate = new Date(currentWeekStart);
                    cellDate.setDate(cellDate.getDate() + i);
                    const dateStr = toISODate(cellDate);
                    
                    const assignment = userAssignments.find(a => 
                        (a.assignmentId === entry.assignmentId || 
                         a.projectAssignmentId === entry.assignmentId || 
                         a.taskAssignmentId === entry.assignmentId)
                    );
                    
                    if (assignment) {
                        const reportId = 'REP' + Math.random().toString(36).substring(2, 6).toUpperCase() + Date.now().toString().slice(-4);
                        
                        const reportData = {
                            reportId,
                            userId: currentUser.userId,
                            assignmentId: entry.assignmentId,
                            assignmentType: entry.assignmentType,
                            companyId: assignment.companyId || 'GENERAL',
                            moduleId: assignment.moduleId || 'GENERAL',
                            title: `Timesheet ${DAY_LABELS[i]} ${formatShortDate(cellDate)} — ${entry.assignmentLabel}`,
                            description: dayData.detail || `Horas registradas: ${dayData.hours}h`,
                            hours: dayData.hours,
                            date: dateStr,
                            reportDate: dateStr,
                            status: 'Pendiente'
                        };
                        
                        if (assignment.supportId) reportData.supportId = assignment.supportId;
                        if (assignment.projectId) reportData.projectId = assignment.projectId;
                        
                        const result = await window.PortalDB.createReport(reportData);
                        if (result.success && result.report) {
                            generatedReportIds.push(result.report.id || result.report.reportId);
                        }
                    }
                }
            }
        }
        
        // 4. Crear o actualizar el registro de timesheet en PortalDB
        if (existing) {
            window.PortalDB.updateTimesheet(existing.timesheetId, {
                entries,
                totalWeekHours: totalHours,
                status: 'Pendiente',
                generatedReportIds,
                submittedAt: new Date().toISOString()
            });
        } else {
            window.PortalDB.createTimesheet({
                userId: currentUser.userId,
                userName: currentUser.name,
                weekStart: weekStartStr,
                weekEnd: sundayStr,
                entries,
                totalWeekHours: totalHours,
                status: 'Pendiente',
                generatedReportIds
            });
            
            const ts = window.PortalDB.getTimesheetByWeek(currentUser.userId, weekStartStr);
            if (ts) {
                window.PortalDB.updateTimesheet(ts.timesheetId, {
                    generatedReportIds,
                    submittedAt: new Date().toISOString()
                });
            }
        }
        
        // Clean localStorage draft
        const key = `ts_draft_${currentUser.userId}_${weekStartStr}`;
        localStorage.removeItem(key);
        
        // Send notification to admin
        if (typeof sendNotification === 'function') {
            await sendNotification('admin', 'report_created', 
                'Nuevo Timesheet Semanal',
                `${currentUser.name} envió su timesheet de la semana ${formatShortDate(currentWeekStart)} — ${formatShortDate(getSunday(currentWeekStart))} (${totalHours.toFixed(1)} hrs)`
            );
        }
        
        if (window.NotificationUtils) {
            window.NotificationUtils.success(`¡Timesheet enviado! ${totalHours.toFixed(1)} hrs en ${entries.length} asignación(es)`, 4000);
        }
        
        renderTimesheetGrid();
        
    } catch (error) {
        console.error('Error enviando timesheet:', error);
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Error al enviar: ' + error.message);
        }
    }
}

/**
 * Check for rejected timesheets and show alert
 */
function checkRejectedTimesheets() {
    if (!currentUser) return;
    
    const allTs = window.PortalDB.getTimesheetsByUser(currentUser.userId);
    const rejected = allTs.filter(ts => ts.status === 'Rechazado');
    
    const alert = document.getElementById('rejectedTimesheetsAlert');
    const list = document.getElementById('rejectedTimesheetsList');
    
    if (rejected.length === 0) {
        if (alert) alert.style.display = 'none';
        return;
    }
    
    if (alert) alert.style.display = 'block';
    if (list) {
        list.innerHTML = rejected.map(ts => `
            <div style="background:white; padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid #fecaca;">
                <strong>Semana: ${ts.weekStart} — ${ts.weekEnd}</strong> | 
                ${ts.totalWeekHours.toFixed(1)} hrs |
                <span style="color:#ef4444">Rechazado</span>
                ${ts.rejectionReason ? `<br><small style="color:#6b7280">Motivo: ${ts.rejectionReason}</small>` : ''}
                <br>
                <button class="btn btn-secondary" style="margin-top:6px; padding:4px 12px; font-size:0.82em;" onclick="reopenRejectedTimesheet('${ts.timesheetId}')">
                    <i class="fa-solid fa-pen"></i> Corregir y Reenviar
                </button>
            </div>
        `).join('');
    }
}

/**
 * Reopen a rejected timesheet for editing
 */
async function reopenRejectedTimesheet(timesheetId) {
    const ts = Object.values(window.PortalDB.getTimesheets()).find(t => t.timesheetId === timesheetId);
    if (!ts) return;
    
    // Navigate to that week
    currentWeekStart = new Date(ts.weekStart + 'T00:00:00');
    
    // Update status to Borrador so it can be re-edited
    window.PortalDB.updateTimesheet(timesheetId, { status: 'Borrador' });
    
    // Convertir reportes rechazados a borradores en MongoDB Atlas
    if (ts.generatedReportIds && ts.generatedReportIds.length > 0) {
        try {
            const reports = await window.PortalDB.getReports();
            for (const reportId of ts.generatedReportIds) {
                const report = reports[reportId];
                if (report) {
                    const dateStr = report.reportDate || report.date;
                    const aId = report.assignmentId;
                    const draftReportId = `rep_draft_${currentUser.userId}_${aId}_${dateStr.split('T')[0].replace(/-/g, '')}`;
                    
                    // Crear el borrador correspondiente en la BD
                    await window.PortalDB.createReport({
                        reportId: draftReportId,
                        userId: currentUser.userId,
                        assignmentId: aId,
                        assignmentType: report.assignmentType,
                        companyId: report.companyId,
                        moduleId: report.moduleId,
                        title: report.title,
                        description: report.description,
                        hours: report.hours,
                        date: dateStr,
                        reportDate: dateStr,
                        status: 'Borrador',
                        supportId: report.supportId || undefined,
                        projectId: report.projectId || undefined
                    });
                    
                    // Eliminar el reporte rechazado antiguo
                    await window.PortalDB.deleteReport(reportId);
                }
            }
        } catch (e) {
            console.error('Error al convertir reportes rechazados a borradores:', e);
        }
    }
    
    await renderTimesheetGrid();
    
    if (window.NotificationUtils) {
        window.NotificationUtils.info('Timesheet reabierto para corrección. Edita y vuelve a enviar.');
    }
}

/**
 * Switch between timesheet and historial views
 */
function switchConsultorView(viewName) {
    // Update sidebar active state
    document.querySelectorAll('.consultor-sidebar .menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Toggle views
    document.querySelectorAll('.consultor-view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });
    
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'block';
    }
    
    if (viewName === 'historial') {
        renderHistorial();
    }
}

/**
 * Render historial table
 */
async function renderHistorial() {
    const tbody = document.getElementById('historialBody');
    if (!tbody || !currentUser) return;
    
    // Sincronizar borradores y reportes desde MongoDB Atlas
    if (window.PortalDB && window.PortalDB.getReportsByUser) {
        try {
            await window.PortalDB.getReportsByUser(currentUser.userId);
        } catch (e) {
            console.error('Error al sincronizar reportes desde la BD:', e);
        }
    }
    
    const allTs = window.PortalDB.getTimesheetsByUser(currentUser.userId);
    
    if (allTs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell"><i class="fa-solid fa-inbox"></i> No hay timesheets anteriores</td></tr>';
        return;
    }
    
    // Sort by weekStart desc
    allTs.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
    
    tbody.innerHTML = allTs.map(ts => {
        const statusClass = ts.status === 'Aprobado' ? 'active' : ts.status === 'Rechazado' ? 'inactive' : '';
        return `
            <tr>
                <td><strong>${ts.weekStart}</strong> — ${ts.weekEnd}</td>
                <td><strong>${ts.totalWeekHours.toFixed(1)}</strong> hrs</td>
                <td><span class="crud-status-badge ${statusClass}">${ts.status}</span></td>
                <td>${ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString('es-MX') : '—'}</td>
                <td>
                    <button class="btn btn-secondary" style="padding:4px 10px; font-size:0.82em;" onclick="viewTimesheetWeek('${ts.weekStart}')">
                        <i class="fa-solid fa-eye"></i> Ver
                    </button>
                </td>
                <td>
                    <button class="btn" style="padding:4px 10px; font-size:0.82em; background:#1B3A5C; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="openActivityReport('${ts.timesheetId}')" title="Generar Reporte de Actividades">
                        <i class="fa-solid fa-file-lines"></i> Reporte
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Navigate to a specific week from historial
 */
function viewTimesheetWeek(weekStartStr) {
    currentWeekStart = new Date(weekStartStr + 'T00:00:00');
    switchConsultorView('timesheet');
    renderTimesheetGrid();
}

// === OVERRIDE: loadUserAssignments should also render the grid ===
const _originalLoadUserAssignments = loadUserAssignments;
loadUserAssignments = async function() {
    await _originalLoadUserAssignments.call(this);
    // After assignments are loaded, render the timesheet grid
    setTimeout(() => {
        initTimesheetGrid();
    }, 200);
};

// Export new functions globally
window.navigateWeek = navigateWeek;
window.onHourChange = onHourChange;
window.onHourFocus = onHourFocus;
window.showDetailPopover = showDetailPopover;
window.closeDetailPopover = closeDetailPopover;
window.saveDetail = saveDetail;
window.clearWeekDraft = clearWeekDraft;
window.submitWeeklyTimesheet = submitWeeklyTimesheet;
window.switchConsultorView = switchConsultorView;
window.reopenRejectedTimesheet = reopenRejectedTimesheet;
window.viewTimesheetWeek = viewTimesheetWeek;

// Función para actualizar el avatar del header con la foto del usuario
function updateHeaderAvatar(photoUrl) {
    const avatar = document.querySelector('.user-avatar');
    if (avatar && photoUrl) {
        avatar.innerHTML = `<img src="${photoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const session = JSON.parse(localStorage.getItem('arvic_current_session'));
        if (session && session.user && session.user.profilePhoto) {
            updateHeaderAvatar(session.user.profilePhoto);
        }
    }, 1500);
});