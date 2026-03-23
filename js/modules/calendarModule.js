/**
 * Calendar Module v1.0 for Portal ARVIC
 * Full calendar with month/week views, event creation, day summary
 */
(function() {
    'use strict';

    const root = document.getElementById('calendarModuleRoot');
    if (!root) return;

    let currentDate = new Date();
    let currentView = 'month'; // 'month' | 'week'
    let events = [];
    let users = [];

    // ===== RENDER MAIN LAYOUT =====
    function renderCalendar() {
        root.innerHTML = `
            <div class="cal-module">
                <div class="cal-header">
                    <div class="cal-header-left">
                        <h2 class="section-title"><i class="fa-solid fa-calendar-days"></i> Calendario</h2>
                    </div>
                    <div class="cal-header-center">
                        <button class="cal-nav-btn" id="calPrev"><i class="fa-solid fa-chevron-left"></i></button>
                        <span class="cal-current-label" id="calLabel"></span>
                        <button class="cal-nav-btn" id="calNext"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                    <div class="cal-header-right">
                        <button class="cal-today-btn" id="calToday">Hoy</button>
                        <div class="cal-view-toggle">
                            <button class="cal-view-btn ${currentView === 'month' ? 'active' : ''}" data-view="month">Mes</button>
                            <button class="cal-view-btn ${currentView === 'week' ? 'active' : ''}" data-view="week">Semana</button>
                        </div>
                        <button class="add-btn cal-add-event" id="calAddEvent"><i class="fa-solid fa-plus"></i> Nuevo Evento</button>
                    </div>
                </div>
                <div class="cal-body" id="calBody"></div>
            </div>
            <!-- Event Drawer -->
            <div class="cal-drawer-overlay" id="calDrawerOverlay"></div>
            <div class="cal-drawer" id="calDrawer">
                <div class="cal-drawer-header">
                    <h3 id="calDrawerTitle">Nuevo Evento</h3>
                    <button class="cal-drawer-close" id="calDrawerClose"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="cal-drawer-body" id="calDrawerBody"></div>
            </div>
            <!-- Day Summary Modal -->
            <div class="cal-modal-overlay" id="calModalOverlay"></div>
            <div class="cal-modal" id="calModal">
                <div class="cal-modal-header">
                    <h3 id="calModalTitle">Resumen del Día</h3>
                    <button class="cal-drawer-close" id="calModalClose"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="cal-modal-body" id="calModalBody"></div>
            </div>
        `;

        // Bind events
        document.getElementById('calPrev').onclick = () => { navigateMonth(-1); };
        document.getElementById('calNext').onclick = () => { navigateMonth(1); };
        document.getElementById('calToday').onclick = () => { currentDate = new Date(); refresh(); };
        document.getElementById('calAddEvent').onclick = () => openEventDrawer();
        document.getElementById('calDrawerClose').onclick = closeDrawer;
        document.getElementById('calDrawerOverlay').onclick = closeDrawer;
        document.getElementById('calModalClose').onclick = closeModal;
        document.getElementById('calModalOverlay').onclick = closeModal;

        root.querySelectorAll('.cal-view-btn').forEach(btn => {
            btn.onclick = () => {
                currentView = btn.dataset.view;
                root.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                refresh();
            };
        });

        refresh();
    }

    function navigateMonth(dir) {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + dir);
        } else {
            currentDate.setDate(currentDate.getDate() + (dir * 7));
        }
        refresh();
    }

    async function refresh() {
        updateLabel();
        await loadEvents();
        if (currentView === 'month') renderMonthView();
        else renderWeekView();
    }

    function updateLabel() {
        const label = document.getElementById('calLabel');
        if (!label) return;
        if (currentView === 'month') {
            label.textContent = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        } else {
            const start = getWeekStart(currentDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            label.textContent = `${start.getDate()} ${start.toLocaleDateString('es-MX', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
        }
    }

    async function loadEvents() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month + 2, 0).toISOString();
        events = await window.PortalDB.getCalendarEvents(start, end);
        
        // Load users for attendee selection
        if (users.length === 0) {
            try {
                const usersObj = await window.PortalDB.getUsers();
                users = Object.values(usersObj);
            } catch(e) { users = []; }
        }
    }

    function getWeekStart(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    // ===== MONTH VIEW =====
    function renderMonthView() {
        const body = document.getElementById('calBody');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
        const today = new Date();

        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        let html = '<div class="cal-grid cal-month-grid">';
        // Header row
        html += '<div class="cal-grid-header">';
        dayNames.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });
        html += '</div>';
        // Calendar cells
        html += '<div class="cal-grid-body">';
        
        const totalCells = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;
        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - startDay + 1;
            const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate();
            const cellDate = new Date(year, month, dayNum);
            const isToday = isCurrentMonth && cellDate.toDateString() === today.toDateString();
            
            const dayEvents = isCurrentMonth ? getEventsForDate(cellDate) : [];

            html += `<div class="cal-cell ${isCurrentMonth ? '' : 'cal-cell-other'} ${isToday ? 'cal-cell-today' : ''}" 
                          data-date="${cellDate.toISOString().split('T')[0]}"
                          onclick="window._calClickDay('${cellDate.toISOString().split('T')[0]}')">`;
            html += `<div class="cal-cell-header"><span class="cal-cell-num ${isToday ? 'today-badge' : ''}">${isCurrentMonth ? dayNum : ''}</span></div>`;
            
            if (dayEvents.length > 0) {
                html += '<div class="cal-cell-events">';
                dayEvents.slice(0, 3).forEach(ev => {
                    const time = new Date(ev.startDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                    html += `<div class="cal-event-pill" style="background:${ev.color || '#0ea5e9'}" 
                                  onclick="event.stopPropagation(); window._calEditEvent('${ev.eventId}')"
                                  title="${ev.title}">
                                <span class="cal-event-time">${time}</span> ${escapeHTML(ev.title)}
                            </div>`;
                });
                if (dayEvents.length > 3) {
                    html += `<div class="cal-event-more">+${dayEvents.length - 3} más</div>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        body.innerHTML = html;
    }

    // ===== WEEK VIEW =====
    function renderWeekView() {
        const body = document.getElementById('calBody');
        const weekStart = getWeekStart(new Date(currentDate));
        const today = new Date();
        const hours = [];
        for (let h = 7; h <= 21; h++) hours.push(h);

        let html = '<div class="cal-week-grid">';
        // Header
        html += '<div class="cal-week-header"><div class="cal-week-time-col"></div>';
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const isToday = d.toDateString() === today.toDateString();
            html += `<div class="cal-week-day-col ${isToday ? 'cal-week-today' : ''}" 
                          onclick="window._calClickDay('${d.toISOString().split('T')[0]}')">
                        <span class="cal-week-day-name">${d.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                        <span class="cal-week-day-num ${isToday ? 'today-badge' : ''}">${d.getDate()}</span>
                    </div>`;
        }
        html += '</div>';

        // Body with time slots
        html += '<div class="cal-week-body">';
        hours.forEach(h => {
            html += '<div class="cal-week-row">';
            html += `<div class="cal-week-time">${h}:00</div>`;
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const dayEvents = getEventsForDateAndHour(d, h);
                html += `<div class="cal-week-cell" data-date="${d.toISOString().split('T')[0]}" data-hour="${h}">`;
                dayEvents.forEach(ev => {
                    html += `<div class="cal-event-block" style="background:${ev.color || '#0ea5e9'}" 
                                  onclick="event.stopPropagation(); window._calEditEvent('${ev.eventId}')"
                                  title="${ev.title}">
                                ${escapeHTML(ev.title)}
                            </div>`;
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div></div>';
        body.innerHTML = html;
    }

    function getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(ev => {
            const start = new Date(ev.startDate).toISOString().split('T')[0];
            const end = new Date(ev.endDate).toISOString().split('T')[0];
            return dateStr >= start && dateStr <= end;
        });
    }

    function getEventsForDateAndHour(date, hour) {
        return events.filter(ev => {
            const evDate = new Date(ev.startDate);
            return evDate.toDateString() === date.toDateString() && evDate.getHours() === hour;
        });
    }

    // ===== EVENT DRAWER =====
    function openEventDrawer(eventData = null) {
        const drawer = document.getElementById('calDrawer');
        const overlay = document.getElementById('calDrawerOverlay');
        const title = document.getElementById('calDrawerTitle');
        const body = document.getElementById('calDrawerBody');
        const isEdit = !!eventData;

        title.textContent = isEdit ? 'Editar Evento' : 'Nuevo Evento';

        // Default times
        const now = new Date();
        const defaultStart = eventData ? new Date(eventData.startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
        const defaultEnd = eventData ? new Date(eventData.endDate) : new Date(defaultStart.getTime() + 3600000);

        // Generate attendee checkboxes
        const session = JSON.parse(localStorage.getItem('arvic_current_session')) || {};
        const currentUserId = session.user?.userId || session.user?.id;
        const attendeeChecks = users
            .filter(u => u.userId !== currentUserId && u.isActive !== false)
            .map(u => {
                const checked = eventData?.attendees?.some(a => a.userId === u.userId) ? 'checked' : '';
                return `<label class="cal-attendee-check">
                    <input type="checkbox" value="${u.userId}" data-name="${u.name || u.userId}" data-email="${u.email || ''}" ${checked}>
                    <span>${u.name || u.userId}</span>
                </label>`;
            }).join('');

        body.innerHTML = `
            <form id="calEventForm" class="cal-event-form">
                <div class="cal-form-group">
                    <label>Título *</label>
                    <input type="text" id="calEvTitle" value="${escapeHTML(eventData?.title || '')}" placeholder="Ej: Reunión con cliente" required>
                </div>
                <div class="cal-form-row">
                    <div class="cal-form-group">
                        <label>Tipo</label>
                        <select id="calEvType">
                            <option value="meeting" ${eventData?.type === 'meeting' ? 'selected' : ''}>📅 Reunión</option>
                            <option value="conference" ${eventData?.type === 'conference' ? 'selected' : ''}>🎥 Conferencia</option>
                            <option value="task" ${eventData?.type === 'task' ? 'selected' : ''}>📋 Tarea</option>
                            <option value="reminder" ${eventData?.type === 'reminder' ? 'selected' : ''}>⏰ Recordatorio</option>
                        </select>
                    </div>
                    <div class="cal-form-group">
                        <label>Color</label>
                        <input type="color" id="calEvColor" value="${eventData?.color || '#0ea5e9'}">
                    </div>
                </div>
                <div class="cal-form-group">
                    <label>Inicio / Fecha del Evento *</label>
                    <input type="datetime-local" id="calEvStart" value="${toLocalDateTimeString(defaultStart)}" required>
                </div>
                <div class="cal-form-group">
                    <label>Descripción</label>
                    <textarea id="calEvDesc" rows="3" placeholder="Detalles del evento...">${escapeHTML(eventData?.description || '')}</textarea>
                </div>
                <div class="cal-form-group">
                    <label>Ubicación / Link</label>
                    <input type="text" id="calEvLocation" value="${escapeHTML(eventData?.location || '')}" placeholder="Ej: Sala 3 o zoom.us/j/...">
                </div>
                <div class="cal-form-group">
                    <label>Invitar Participantes</label>
                    <div class="cal-attendees-list">${attendeeChecks || '<span style="color:#94a3b8;font-size:0.85rem;">No hay usuarios disponibles</span>'}</div>
                </div>
                <div class="cal-form-actions">
                    ${isEdit ? `<button type="button" class="cal-btn-danger" onclick="window._calDeleteEvent('${eventData.eventId}')"><i class="fa-solid fa-trash"></i> Eliminar</button>` : ''}
                    <button type="submit" class="cal-btn-primary">
                        <i class="fa-solid fa-${isEdit ? 'check' : 'plus'}"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Evento'}
                    </button>
                </div>
            </form>
        `;

        document.getElementById('calEventForm').onsubmit = async (e) => {
            e.preventDefault();
            await saveEvent(isEdit ? eventData.eventId : null);
        };

        drawer.classList.add('open');
        overlay.classList.add('open');
    }

    async function saveEvent(editId) {
        const attendeeInputs = document.querySelectorAll('.cal-attendee-check input:checked');
        const attendees = Array.from(attendeeInputs).map(inp => ({
            userId: inp.value,
            name: inp.dataset.name,
            email: inp.dataset.email,
            status: 'pending'
        }));

        const startDateObj = new Date(document.getElementById('calEvStart').value);
        // Ensure endDate is at least some time after start, using +1 hour by default since UI doesn't ask.
        const endDateObj = new Date(startDateObj.getTime() + 3600000); 

        const data = {
            title: document.getElementById('calEvTitle').value.trim(),
            type: document.getElementById('calEvType').value,
            color: document.getElementById('calEvColor').value,
            startDate: startDateObj.toISOString(),
            endDate: endDateObj.toISOString(),
            description: document.getElementById('calEvDesc').value.trim(),
            location: document.getElementById('calEvLocation').value.trim(),
            attendees
        };

        if (!data.title) {
            window.NotificationUtils?.error('El título es requerido');
            return;
        }

        let result;
        if (editId) {
            result = await window.PortalDB.updateCalendarEvent(editId, data);
        } else {
            result = await window.PortalDB.createCalendarEvent(data);
        }

        if (result.success) {
            window.NotificationUtils?.success(editId ? 'Evento actualizado' : 'Evento creado exitosamente');
            closeDrawer();
            refresh();
            
            // Send invitations if attendees were added
            if (attendees.length > 0 && result.data?.eventId) {
                await window.PortalDB.sendCalendarInvites(result.data.eventId);
            }
        } else {
            window.NotificationUtils?.error(result.message || 'Error guardando evento');
        }
    }

    function closeDrawer() {
        document.getElementById('calDrawer')?.classList.remove('open');
        document.getElementById('calDrawerOverlay')?.classList.remove('open');
    }

    // ===== DAY SUMMARY MODAL =====
    async function openDaySummary(dateStr) {
        const modal = document.getElementById('calModal');
        const overlay = document.getElementById('calModalOverlay');
        const title = document.getElementById('calModalTitle');
        const body = document.getElementById('calModalBody');
        
        const date = new Date(dateStr + 'T12:00:00');
        title.textContent = `📅 ${date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
        
        body.innerHTML = '<div class="cal-loading"><div class="typing-dots"><span></span><span></span><span></span></div> Cargando...</div>';
        modal.classList.add('open');
        overlay.classList.add('open');

        const summary = await window.PortalDB.getDaySummary(dateStr);
        const dayEvents = getEventsForDate(date);

        let html = '';

        // Events section
        html += `<div class="cal-summary-section">
            <h4><i class="fa-solid fa-calendar-check"></i> Eventos del Día (${dayEvents.length})</h4>`;
        if (dayEvents.length > 0) {
            dayEvents.forEach(ev => {
                const start = new Date(ev.startDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const end = new Date(ev.endDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const typeIcons = { meeting: '📅', conference: '🎥', task: '📋', reminder: '⏰' };
                html += `<div class="cal-summary-event" style="border-left: 4px solid ${ev.color || '#0ea5e9'}">
                    <div class="cal-summary-event-header">
                        <strong>${typeIcons[ev.type] || '📅'} ${escapeHTML(ev.title)}</strong>
                        <span class="cal-summary-time">${start} — ${end}</span>
                    </div>
                    ${ev.description ? `<p class="cal-summary-desc">${escapeHTML(ev.description)}</p>` : ''}
                    ${ev.attendees?.length ? `<div class="cal-summary-attendees"><i class="fa-solid fa-users"></i> ${ev.attendees.map(a => a.name || a.userId).join(', ')}</div>` : ''}
                    <div class="cal-summary-actions">
                        <button class="cal-btn-sm" onclick="window._calEditEvent('${ev.eventId}')"><i class="fa-solid fa-pen"></i> Editar</button>
                    </div>
                </div>`;
            });
        } else {
            html += '<p class="cal-summary-empty">Sin eventos programados</p>';
        }
        html += '</div>';

        // Activity summary from reports
        if (summary) {
            html += `<div class="cal-summary-section">
                <h4><i class="fa-solid fa-clock"></i> Actividad del Día — ${summary.totalHours?.toFixed(1) || 0} horas totales</h4>`;
            
            if (summary.consultorSummary && summary.consultorSummary.length > 0) {
                summary.consultorSummary.forEach(c => {
                    html += `<div class="cal-consultant-card">
                        <div class="cal-consultant-header">
                            <strong><i class="fa-solid fa-user"></i> ${escapeHTML(c.name || c.userId)}</strong>
                            <span class="cal-hours-badge">${c.totalHours?.toFixed(1)}h</span>
                        </div>
                        <div class="cal-consultant-tasks">`;
                    c.tasks?.forEach(t => {
                        html += `<div class="cal-task-row">
                            <span class="cal-task-desc">${escapeHTML(t.description)}</span>
                            <span class="cal-task-hours">${t.hours}h</span>
                            <span class="cal-task-status cal-status-${(t.status || '').toLowerCase()}">${t.status}</span>
                        </div>`;
                    });
                    html += '</div></div>';
                });
            } else {
                html += '<p class="cal-summary-empty">Sin reportes de actividad</p>';
            }
            html += '</div>';
        }

        // Add event button
        html += `<div class="cal-summary-footer">
            <button class="cal-btn-primary" onclick="window._calAddOnDate('${dateStr}')">
                <i class="fa-solid fa-plus"></i> Agregar Evento en Este Día
            </button>
        </div>`;

        body.innerHTML = html;
    }

    function closeModal() {
        document.getElementById('calModal')?.classList.remove('open');
        document.getElementById('calModalOverlay')?.classList.remove('open');
    }

    // ===== GLOBAL HANDLERS =====
    window._calClickDay = (dateStr) => openDaySummary(dateStr);
    window._calEditEvent = async (eventId) => {
        const ev = events.find(e => e.eventId === eventId);
        if (ev) {
            closeModal();
            openEventDrawer(ev);
        }
    };
    window._calDeleteEvent = async (eventId) => {
        if (!confirm('¿Eliminar este evento?')) return;
        const result = await window.PortalDB.deleteCalendarEvent(eventId);
        if (result.success) {
            window.NotificationUtils?.success('Evento eliminado');
            closeDrawer();
            closeModal();
            refresh();
        } else {
            window.NotificationUtils?.error('Error eliminando evento');
        }
    };
    window._calAddOnDate = (dateStr) => {
        closeModal();
        const date = new Date(dateStr + 'T10:00:00');
        openEventDrawer({
            startDate: date.toISOString(),
            endDate: new Date(date.getTime() + 3600000).toISOString(),
        });
    };

    // ===== UTILITIES =====
    function toLocalDateTimeString(d) {
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function escapeHTML(s) {
        if (!s) return '';
        const p = document.createElement('p');
        p.textContent = s;
        return p.innerHTML;
    }

    // ===== INJECT STYLES =====
    const style = document.createElement('style');
    style.textContent = `
        /* Calendar Module Styles */
        .cal-module { padding: 0; }
        .cal-header { display:flex; justify-content:space-between; align-items:center; padding:0 0 20px 0; flex-wrap:wrap; gap:12px; }
        .cal-header-left h2 { margin:0; }
        .cal-header-center { display:flex; align-items:center; gap:12px; }
        .cal-current-label { font-size:1.15rem; font-weight:700; color:#1e293b; min-width:200px; text-align:center; text-transform:capitalize; }
        .cal-nav-btn { background:none; border:1px solid #e2e8f0; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; color:#475569; }
        .cal-nav-btn:hover { background:#f1f5f9; border-color:#0ea5e9; color:#0ea5e9; }
        .cal-header-right { display:flex; align-items:center; gap:10px; }
        .cal-today-btn { background:#f1f5f9; border:1px solid #e2e8f0; padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s; color:#475569; }
        .cal-today-btn:hover { background:#0ea5e9; color:white; border-color:#0ea5e9; }
        .cal-view-toggle { display:flex; background:#f1f5f9; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; }
        .cal-view-btn { background:none; border:none; padding:8px 16px; font-size:0.82rem; font-weight:600; cursor:pointer; color:#64748b; transition:all 0.2s; }
        .cal-view-btn.active { background:#0ea5e9; color:white; }
        .cal-add-event { font-size:0.85rem; }

        /* Month Grid */
        .cal-month-grid { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:white; }
        .cal-grid-header { display:grid; grid-template-columns:repeat(7,1fr); background:linear-gradient(135deg,#0f172a,#1e293b); }
        .cal-day-name { padding:12px 8px; text-align:center; font-size:0.78rem; font-weight:700; color:white; text-transform:uppercase; letter-spacing:0.5px; }
        .cal-grid-body { display:grid; grid-template-columns:repeat(7,1fr); }
        .cal-cell { min-height:110px; border:1px solid #f1f5f9; padding:4px 6px; cursor:pointer; transition:background 0.15s; position:relative; }
        .cal-cell:hover { background:#f8fafc; }
        .cal-cell-other { opacity:0.35; }
        .cal-cell-today { background:#eff6ff; }
        .cal-cell-header { display:flex; justify-content:flex-end; margin-bottom:4px; }
        .cal-cell-num { font-size:0.82rem; font-weight:600; color:#475569; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; }
        .today-badge { background:#0ea5e9; color:white !important; }
        .cal-cell-events { display:flex; flex-direction:column; gap:2px; }
        .cal-event-pill { padding:2px 6px; border-radius:4px; font-size:0.68rem; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; transition:opacity 0.2s; }
        .cal-event-pill:hover { opacity:0.85; }
        .cal-event-time { font-weight:700; margin-right:2px; }
        .cal-event-more { font-size:0.65rem; color:#64748b; padding:1px 4px; font-weight:600; }

        /* Week View */
        .cal-week-grid { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:white; }
        .cal-week-header { display:grid; grid-template-columns:60px repeat(7,1fr); background:linear-gradient(135deg,#0f172a,#1e293b); }
        .cal-week-time-col { padding:10px; }
        .cal-week-day-col { padding:10px; text-align:center; cursor:pointer; transition:background 0.2s; }
        .cal-week-day-col:hover { background:rgba(255,255,255,0.1); }
        .cal-week-today { background:rgba(14,165,233,0.2); }
        .cal-week-day-name { display:block; font-size:0.72rem; color:#94a3b8; text-transform:uppercase; font-weight:600; }
        .cal-week-day-num { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; font-size:0.9rem; font-weight:700; color:white; margin-top:4px; }
        .cal-week-body { max-height:500px; overflow-y:auto; }
        .cal-week-row { display:grid; grid-template-columns:60px repeat(7,1fr); border-bottom:1px solid #f1f5f9; }
        .cal-week-time { padding:8px; font-size:0.72rem; color:#94a3b8; text-align:right; padding-right:12px; border-right:1px solid #f1f5f9; }
        .cal-week-cell { min-height:50px; border-right:1px solid #f1f5f9; padding:2px 4px; position:relative; }
        .cal-event-block { padding:3px 8px; border-radius:4px; font-size:0.72rem; color:white; margin:1px 0; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cal-event-block:hover { opacity:0.85; }

        /* Drawer */
        .cal-drawer-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.3); backdrop-filter:blur(2px); z-index:9998; opacity:0; pointer-events:none; transition:opacity 0.3s; }
        .cal-drawer-overlay.open { opacity:1; pointer-events:auto; }
        .cal-drawer { position:fixed; top:0; right:-420px; width:400px; height:100vh; background:white; box-shadow:-8px 0 30px rgba(0,0,0,0.15); z-index:9999; transition:right 0.35s cubic-bezier(0.16,1,0.3,1); display:flex; flex-direction:column; }
        .cal-drawer.open { right:0; }
        .cal-drawer-header { padding:20px 24px; background:linear-gradient(135deg,#0f172a,#1e293b); color:white; display:flex; justify-content:space-between; align-items:center; }
        .cal-drawer-header h3 { margin:0; font-size:1.1rem; }
        .cal-drawer-close { background:rgba(255,255,255,0.1); border:none; color:white; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
        .cal-drawer-close:hover { background:rgba(239,68,68,0.3); }
        .cal-drawer-body { flex:1; overflow-y:auto; padding:24px; }

        /* Event Form */
        .cal-event-form { display:flex; flex-direction:column; gap:16px; }
        .cal-form-group { display:flex; flex-direction:column; gap:6px; }
        .cal-form-group label { font-size:0.82rem; font-weight:600; color:#475569; }
        .cal-form-group input, .cal-form-group select, .cal-form-group textarea { padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.87rem; outline:none; transition:border-color 0.2s, box-shadow 0.2s; font-family:inherit; }
        .cal-form-group input:focus, .cal-form-group select:focus, .cal-form-group textarea:focus { border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,0.1); }
        .cal-form-group input[type="color"] { padding:4px; height:40px; cursor:pointer; }
        .cal-form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .cal-attendees-list { max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; padding:8px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; }
        .cal-attendee-check { display:flex; align-items:center; gap:8px; font-size:0.85rem; padding:4px 8px; border-radius:6px; cursor:pointer; transition:background 0.2s; }
        .cal-attendee-check:hover { background:#e2e8f0; }
        .cal-attendee-check input { accent-color:#0ea5e9; }
        .cal-form-actions { display:flex; justify-content:flex-end; gap:10px; padding-top:8px; border-top:1px solid #e2e8f0; }
        .cal-btn-primary { background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; border:none; padding:10px 20px; border-radius:8px; font-size:0.87rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s; }
        .cal-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(14,165,233,0.3); }
        .cal-btn-danger { background:none; border:1px solid #ef4444; color:#ef4444; padding:10px 16px; border-radius:8px; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s; }
        .cal-btn-danger:hover { background:#ef4444; color:white; }
        .cal-btn-sm { background:none; border:1px solid #e2e8f0; color:#475569; padding:4px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; transition:all 0.2s; }
        .cal-btn-sm:hover { background:#0ea5e9; color:white; border-color:#0ea5e9; }

        /* Modal */
        .cal-modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.4); backdrop-filter:blur(3px); z-index:9998; opacity:0; pointer-events:none; transition:opacity 0.3s; }
        .cal-modal-overlay.open { opacity:1; pointer-events:auto; }
        .cal-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(0.95); width:600px; max-height:80vh; background:white; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.25); z-index:9999; display:flex; flex-direction:column; opacity:0; pointer-events:none; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .cal-modal.open { opacity:1; pointer-events:auto; transform:translate(-50%,-50%) scale(1); }
        .cal-modal-header { padding:20px 24px; background:linear-gradient(135deg,#0f172a,#1e293b); color:white; display:flex; justify-content:space-between; align-items:center; border-radius:16px 16px 0 0; }
        .cal-modal-header h3 { margin:0; font-size:1rem; text-transform:capitalize; }
        .cal-modal-body { flex:1; overflow-y:auto; padding:24px; }

        /* Summary Styles */
        .cal-summary-section { margin-bottom:24px; }
        .cal-summary-section h4 { margin:0 0 12px 0; font-size:0.95rem; color:#1e293b; display:flex; align-items:center; gap:8px; padding-bottom:8px; border-bottom:2px solid #f1f5f9; }
        .cal-summary-event { padding:12px 16px; background:#f8fafc; border-radius:8px; margin-bottom:8px; }
        .cal-summary-event-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        .cal-summary-time { font-size:0.78rem; color:#64748b; background:#e2e8f0; padding:2px 8px; border-radius:4px; }
        .cal-summary-desc { font-size:0.82rem; color:#64748b; margin:6px 0; }
        .cal-summary-attendees { font-size:0.78rem; color:#0ea5e9; margin-top:4px; }
        .cal-summary-actions { margin-top:8px; }
        .cal-summary-empty { color:#94a3b8; font-size:0.85rem; font-style:italic; text-align:center; padding:16px; }
        .cal-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px; color:#94a3b8; }

        /* Consultant Summary */
        .cal-consultant-card { background:#f8fafc; border-radius:8px; padding:14px 16px; margin-bottom:8px; border:1px solid #e2e8f0; }
        .cal-consultant-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .cal-hours-badge { background:linear-gradient(135deg,#0ea5e9,#0284c7); color:white; padding:3px 10px; border-radius:12px; font-size:0.78rem; font-weight:700; }
        .cal-consultant-tasks { display:flex; flex-direction:column; gap:4px; }
        .cal-task-row { display:flex; align-items:center; gap:8px; font-size:0.82rem; padding:4px 0; border-bottom:1px solid #f1f5f9; }
        .cal-task-desc { flex:1; color:#475569; }
        .cal-task-hours { font-weight:600; color:#0ea5e9; }
        .cal-task-status { font-size:0.7rem; padding:2px 8px; border-radius:4px; font-weight:600; }
        .cal-status-pendiente { background:#fef3c7; color:#92400e; }
        .cal-status-aprobado { background:#d1fae5; color:#065f46; }
        .cal-status-rechazado { background:#fee2e2; color:#991b1b; }
        .cal-summary-footer { padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:center; }

        @media(max-width:768px) {
            .cal-drawer { width:100%; right:-100%; }
            .cal-modal { width:95%; }
            .cal-header { flex-direction:column; }
        }
    `;
    document.head.appendChild(style);

    // ===== INIT ON SECTION SHOW =====
    // Watch for the calendar section becoming visible
    let calInited = false;
    const observer = new MutationObserver(() => {
        const section = document.getElementById('calendario-section');
        if (section && section.classList.contains('active') && !calInited) {
            calInited = true;
            renderCalendar();
        } else if (section && section.classList.contains('active') && calInited) {
            refresh();
        }
    });

    // Start observing once DOM is ready
    setTimeout(() => {
        const section = document.getElementById('calendario-section');
        if (section) {
            observer.observe(section, { attributes: true });
        }
    }, 500);
})();
