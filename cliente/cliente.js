/**
 * ===================================================
 * PORTAL GRUPO IT ARVIC — CLIENTE / EMPRESA LOGIC
 * Dashboard, KPIs, Auditoría de Horas y Expediente
 * ===================================================
 */

let clientData = {
    company: null,
    companies: [],
    projects: [],
    supports: [],
    modules: [],
    assignments: [],
    projectAssignments: [],
    taskAssignments: [],
    reports: [],
    tarifarios: [],
    expedientesDocs: [],
    projectDocs: [],
    billingPeriods: []
};

let filteredReports = [];

document.addEventListener('DOMContentLoaded', async function() {
    // 1. Validar autenticación de cliente
    if (!window.AuthSys || !window.AuthSys.requireCliente()) {
        return;
    }

    // 2. Setup datos de usuario en header
    setupHeaderUserInfo();

    // 3. Cargar datos del cliente
    await loadClientData();

    // 4. Inicializar filtros y vistas
    setupFilters();

    // 5. Inicializar notificaciones y badges
    initClientNotifications();

    // 6. Inicializar y sincronizar tema (Dark / Light) con persistencia garantizada
    initTheme();
});

function setupHeaderUserInfo() {
    const user = window.AuthSys.getCurrentUser();
    if (!user) return;

    const name = user.name || 'Cliente Autorizado';
    const email = user.email || '';
    const initials = (name).split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'C';

    // Header Principal
    const nameEl = document.getElementById('clientUserName');
    const emailEl = document.getElementById('clientUserEmail');
    const avatarEl = document.getElementById('userAvatarPill');

    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = initials;

    // Interior del Dropdown de Perfil
    const dropNameEl = document.getElementById('dropdownUserName');
    const dropEmailEl = document.getElementById('dropdownUserEmail');
    const dropAvatarEl = document.getElementById('dropdownAvatarPill');

    if (dropNameEl) dropNameEl.textContent = name;
    if (dropEmailEl) dropEmailEl.textContent = email;
    if (dropAvatarEl) dropAvatarEl.textContent = initials;

    // Hero de Bienvenida
    const heroNameEl = document.getElementById('heroClientName');
    if (heroNameEl) {
        // Usar primer nombre o nombre completo
        heroNameEl.textContent = name.split(' ')[0] || name;
    }
}

async function loadClientData() {
    try {
        // Intentar cargar primero de la API consolidada
        const res = await window.PortalDB.getAllClienteData();
        if (res && res.success && res.data) {
            clientData = {
                company: res.data.company || (res.data.companies && res.data.companies[0]) || null,
                companies: res.data.companies || [],
                projects: res.data.projects || [],
                supports: res.data.supports || [],
                modules: res.data.modules || [],
                assignments: res.data.assignments || [],
                projectAssignments: res.data.projectAssignments || [],
                taskAssignments: res.data.taskAssignments || [],
                reports: res.data.reports || [],
                tarifarios: res.data.tarifario || [],
                expedientesDocs: res.data.expedientesDocs || [],
                projectDocs: res.data.projectDocs || []
            };

            // Pre-llenar caché local
            window.PortalDB.prefillClienteCacheFromAllData(res.data);
        } else {
            console.warn('Cargando fallback desde caché local...');
            const cached = JSON.parse(localStorage.getItem('arvic_cliente_prefetched_data') || '{}');
            clientData.company = cached.company || null;
            clientData.projects = cached.projectsList || [];
            clientData.supports = cached.supportsList || [];
            clientData.modules = cached.modulesList || [];
            clientData.reports = cached.allReportsList || [];
            clientData.tarifarios = cached.allTarifarioList || [];
            clientData.projectDocs = cached.projectDocs || [];
        }

        // Renderizar vistas
        renderCompanyHeader();
        renderKPIs();
        renderOverviewSections();
        renderProjectsList();
        populateFilterDropdowns();
        applyHoursFilters();
        await renderExpedienteWorkspace();
        await renderAccountWorkspace();
        await loadClientBillingPeriods();

    } catch (error) {
        console.error('Error cargando datos del cliente:', error);
        if (window.NotificationUtils) {
            window.NotificationUtils.error('Error al sincronizar datos del cliente: ' + error.message);
        }
    }
}

function renderCompanyHeader() {
    const comp = clientData.company;
    const nameEl = document.getElementById('headerCompanyName');
    const rfcEl = document.getElementById('headerCompanyRfc');
    const dropCompEl = document.getElementById('dropdownCompanyName');

    if (comp) {
        if (nameEl) nameEl.textContent = comp.name || 'Empresa Cliente';
        if (rfcEl) {
            rfcEl.textContent = comp.rfc ? `RFC: ${comp.rfc}` : (comp.companyId || 'Sin RFC');
        }
        if (dropCompEl) dropCompEl.textContent = comp.name || 'Empresa Cliente';
        const heroCompEl = document.getElementById('heroCompanyName');
        if (heroCompEl) heroCompEl.textContent = comp.name || 'su Empresa';
    } else {
        const user = window.AuthSys.getCurrentUser();
        const fallbackName = user?.companyName || user?.companyId || 'Empresa Cliente';
        if (nameEl) nameEl.textContent = fallbackName;
        if (rfcEl) rfcEl.textContent = user?.companyId || 'ARVIC';
        if (dropCompEl) dropCompEl.textContent = fallbackName;
        const heroCompEl = document.getElementById('heroCompanyName');
        if (heroCompEl) heroCompEl.textContent = fallbackName;
    }
}

function renderKPIs() {
    // 1. Horas Totales
    const totalHours = clientData.reports.reduce((acc, r) => acc + (parseFloat(r.hours) || 0), 0);
    const kpiHoursEl = document.getElementById('kpiTotalHours');
    if (kpiHoursEl) kpiHoursEl.textContent = `${totalHours.toFixed(1)} hrs`;

    // 2. Proyectos Activos
    const activeProjects = clientData.projects.length;
    const kpiProjectsEl = document.getElementById('kpiActiveProjects');
    if (kpiProjectsEl) kpiProjectsEl.textContent = activeProjects;

    // 3. Soportes Activos
    const activeSupports = clientData.supports.length;
    const kpiSupportsEl = document.getElementById('kpiActiveSupports');
    if (kpiSupportsEl) kpiSupportsEl.textContent = activeSupports;

    // Badges en sidebar
    const badgeProj = document.getElementById('badgeProjectsCount');
    if (badgeProj) badgeProj.textContent = activeProjects;

    const badgeRep = document.getElementById('badgeReportsCount');
    if (badgeRep) badgeRep.textContent = clientData.reports.length;

    // 4. Estatus Documental
    const kpiDocStatus = document.getElementById('kpiDocStatus');
    const kpiDocSubtext = document.getElementById('kpiDocSubtext');
    if (kpiDocStatus) {
        const docsCount = clientData.expedientesDocs.length;
        if (docsCount >= 3) {
            kpiDocStatus.textContent = 'En Regla';
            kpiDocStatus.style.color = '#16a34a';
            if (kpiDocSubtext) kpiDocSubtext.textContent = `${docsCount} documentos registrados`;
        } else {
            kpiDocStatus.textContent = 'Pendiente';
            kpiDocStatus.style.color = '#d97706';
            if (kpiDocSubtext) kpiDocSubtext.textContent = 'Documentación pendiente';
        }
    }
}

function renderOverviewSections() {
    // 1. Progreso de proyectos
    const projContainer = document.getElementById('overviewProjectsProgress');
    if (projContainer) {
        if (clientData.projects.length === 0) {
            projContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--client-text-muted);">No hay proyectos contratados activos actualmente.</div>';
        } else {
            projContainer.innerHTML = clientData.projects.map(p => {
                const pReports = clientData.reports.filter(r => r.projectId === (p.projectId || p.id));
                const consumed = pReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
                const max = p.maxHours || 0;
                const pct = max > 0 ? Math.min(Math.round((consumed / max) * 100), 100) : 0;
                
                return `
                    <div style="margin-bottom: 16px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.88rem;">
                            <strong>${p.name}</strong>
                            <span style="color:var(--client-text-muted);">${consumed.toFixed(1)} ${max > 0 ? `/ ${max} hrs` : 'hrs'}</span>
                        </div>
                        <div class="service-progress-bar-bg">
                            <div class="service-progress-bar-fill" style="width: ${max > 0 ? pct : 100}%; background: ${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#0284c7'};"></div>
                        </div>
                        ${max > 0 ? `<small style="color:var(--client-text-muted); font-size:0.75rem;">${pct}% consumido</small>` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // 2. Actividades recientes (últimos 5 reportes)
    const actContainer = document.getElementById('overviewRecentActivities');
    if (actContainer) {
        if (clientData.reports.length === 0) {
            actContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--client-text-muted);">No hay registros de actividades en el periodo.</div>';
        } else {
            const recent = clientData.reports.slice(0, 5);
            actContainer.innerHTML = recent.map(r => {
                const dateFormatted = r.date ? new Date(r.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—';
                const serviceName = getServiceName(r);
                const moduleName = getModuleName(r);

                return `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--client-border);">
                        <div>
                            <div style="font-weight:600; font-size:0.88rem; color:var(--client-text-main);">${serviceName}</div>
                            <small style="color:var(--client-text-muted); font-size:0.78rem;">${moduleName} • ${escapeHtml(r.description || 'Actividad general').substring(0, 60)}...</small>
                        </div>
                        <div style="text-align:right; white-space:nowrap; margin-left:12px;">
                            <span style="font-weight:700; color:#0284c7; font-size:0.88rem;">${parseFloat(r.hours || 0).toFixed(1)} hrs</span>
                            <div style="color:var(--client-text-muted); font-size:0.72rem;">${dateFormatted}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderProjectsList() {
    const container = document.getElementById('projectsListContainer');
    if (!container) return;

    if (clientData.projects.length === 0 && clientData.supports.length === 0) {
        container.innerHTML = `
            <div class="cliente-card" style="text-align:center; padding:40px; color:var(--client-text-muted);">
                <i class="fa-solid fa-folder-open" style="font-size:2.5rem; margin-bottom:12px; color:#cbd5e1;"></i>
                <h3>No hay proyectos o soportes asignados</h3>
                <p>Comuníquese con su ejecutivo de cuenta ARVIC para formalizar nuevas contrataciones.</p>
            </div>
        `;
        return;
    }

    let html = '';

    // Proyectos
    if (clientData.projects.length > 0) {
        html += '<h3 style="margin: 0 0 16px 0; font-size:1.1rem; color:var(--client-text-main);"><i class="fa-solid fa-folder-open" style="color:#0284c7;"></i> Proyectos Tecnológicos</h3>';
        html += clientData.projects.map(p => {
            const pId = p.projectId || p.id;
            const pReports = clientData.reports.filter(r => r.projectId === pId);
            const consumed = pReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
            const max = p.maxHours || 0;
            const pct = max > 0 ? Math.min(Math.round((consumed / max) * 100), 100) : 0;
            const remaining = max > 0 ? Math.max(0, max - consumed) : null;

            const docsForProj = (clientData.projectDocs || []).filter(d => d.projectId === pId || d.entityId === pId);
            const docsCount = docsForProj.length;

            return `
                <div class="service-project-card">
                    <div class="service-project-header">
                        <div>
                            <div class="service-project-title">
                                <i class="fa-solid fa-cubes" style="color:#0284c7;"></i> ${p.name}
                            </div>
                            <p style="margin:4px 0 0 0; color:var(--client-text-muted); font-size:0.85rem;">
                                ${p.description || 'Proyecto de desarrollo e implementación especializada'}
                            </p>
                        </div>
                        <span class="crud-status-badge active" style="font-size:0.8rem;">● En Ejecución</span>
                    </div>

                    <div class="service-progress-container">
                        <div class="service-progress-bar-bg">
                            <div class="service-progress-bar-fill" style="width: ${max > 0 ? pct : 100}%; background: ${pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#0284c7'};"></div>
                        </div>
                        <div class="service-progress-meta">
                            <span>Horas Realizadas: <strong>${consumed.toFixed(1)} hrs</strong></span>
                            ${max > 0 ? `<span>Bolsa Contratada: <strong>${max} hrs</strong> (Restan: ${remaining.toFixed(1)} hrs)</span>` : '<span>Bolsa Flexible sin límite</span>'}
                        </div>
                    </div>

                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--client-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 0.8rem; color: var(--client-text-muted);">
                            <i class="fa-solid fa-file-contract" style="color: #0284c7; margin-right: 4px;"></i>
                            ${docsCount > 0 ? `<strong>${docsCount}</strong> documento(s) formalizado(s)` : 'Contratos y Anexos formalizados'}
                        </span>
                        <button type="button" class="btn-client-doc" onclick="openClientProjectDocs('${pId}', '${escapeHtml(p.name).replace(/'/g, "\\'")}')" title="Ver contratos y acuerdos formalizados">
                            <i class="fa-solid fa-folder-open"></i> Expediente Contractual ${docsCount > 0 ? `<span style="background:#0284c7; color:#fff; border-radius:10px; padding:1px 6px; font-size:0.75rem; margin-left:4px;">${docsCount}</span>` : ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Soportes
    if (clientData.supports.length > 0) {
        html += '<h3 style="margin: 24px 0 16px 0; font-size:1.1rem; color:var(--client-text-main);"><i class="fa-solid fa-headset" style="color:#10b981;"></i> Bolsas de Soporte y Mantenimiento</h3>';
        html += clientData.supports.map(s => {
            const sReports = clientData.reports.filter(r => r.supportId === (s.supportId || s.id));
            const consumed = sReports.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);

            return `
                <div class="service-project-card" style="border-left: 4px solid #10b981;">
                    <div class="service-project-header">
                        <div>
                            <div class="service-project-title">
                                <i class="fa-solid fa-shield-halved" style="color:#10b981;"></i> ${s.name}
                            </div>
                            <p style="margin:4px 0 0 0; color:var(--client-text-muted); font-size:0.85rem;">
                                ${s.description || 'Mesa de ayuda y soporte técnico especializado continuo'}
                            </p>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:1.15rem; font-weight:800; color:#10b981;">${consumed.toFixed(1)} hrs</span>
                            <div style="font-size:0.75rem; color:var(--client-text-muted);">Horas consumidas</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
}

function populateFilterDropdowns() {
    // 1. Proyectos / Soportes
    const projSelect = document.getElementById('filterProject');
    if (projSelect) {
        const services = [];
        clientData.projects.forEach(p => services.push({ id: p.projectId || p.id, name: `Proyecto: ${p.name}` }));
        clientData.supports.forEach(s => services.push({ id: s.supportId || s.id, name: `Soporte: ${s.name}` }));

        projSelect.innerHTML = '<option value="">Todos los Proyectos / Soportes</option>' +
            services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // 2. Módulos
    const modSelect = document.getElementById('filterModule');
    if (modSelect) {
        modSelect.innerHTML = '<option value="">Todos los Módulos</option>' +
            clientData.modules.map(m => `<option value="${m.moduleId || m.id}">${m.name}</option>`).join('');
    }
}

function setupFilters() {
    // Inicializar mes actual por defecto
    const monthInput = document.getElementById('filterMonth');
    if (monthInput && !monthInput.value) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${yyyy}-${mm}`;
    }
}

function applyHoursFilters() {
    const selectedService = document.getElementById('filterProject')?.value || '';
    const selectedModule = document.getElementById('filterModule')?.value || '';
    const selectedMonth = document.getElementById('filterMonth')?.value || '';
    const query = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';

    filteredReports = clientData.reports.filter(r => {
        // Filtro de Proyecto/Soporte
        if (selectedService) {
            const matchesService = (r.projectId === selectedService) || 
                                   (r.supportId === selectedService) || 
                                   (r.assignmentId === selectedService);
            if (!matchesService) return false;
        }

        // Filtro de Módulo
        if (selectedModule) {
            if (r.moduleId !== selectedModule) return false;
        }

        // Filtro de Mes (yyyy-mm)
        if (selectedMonth && r.date) {
            const rMonth = String(r.date).substring(0, 7);
            if (rMonth !== selectedMonth) return false;
        }

        // Búsqueda de texto (ticket, justificación, descripción)
        if (query) {
            const text = `${r.title || ''} ${r.description || ''} ${r.feedback || ''} ${r.reportId || ''}`.toLowerCase();
            if (!text.includes(query)) return false;
        }

        return true;
    });

    renderAuditTable();
}

function renderAuditTable() {
    const tbody = document.getElementById('clientAuditTableBody');
    if (!tbody) return;

    if (filteredReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell" style="text-align:center; padding:30px; color:var(--client-text-muted);"><i class="fa-solid fa-filter-circle-xmark"></i> No se encontraron registros de horas para los filtros seleccionados.</td></tr>';
        updateSummaryFooter(0, 0, 0);
        return;
    }

    let totalHrs = 0;
    let totalAmt = 0;

    tbody.innerHTML = filteredReports.map(r => {
        const hrs = parseFloat(r.hours) || 0;
        totalHrs += hrs;

        // Tarifa Pactada con el Cliente para esta asignación / módulo
        const clientRate = getClientRate(r);
        const lineTotal = hrs * clientRate;
        totalAmt += lineTotal;

        const dateStr = r.date ? new Date(r.date).toLocaleDateString('es-MX') : '—';
        const serviceName = getServiceName(r);
        const moduleName = getModuleName(r);
        const ticketRef = r.title || r.reportId || '—';

        return `
            <tr>
                <td class="cell-date">${dateStr}</td>
                <td class="cell-service">${serviceName}</td>
                <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${ticketRef}</code></td>
                <td><span class="cell-module">${moduleName}</span></td>
                <td class="cell-hours">${hrs.toFixed(1)}</td>
                <td class="cell-rate">$${clientRate.toFixed(2)}</td>
                <td class="cell-total">$${lineTotal.toFixed(2)}</td>
                <td class="cell-description">
                    <div style="font-weight: 500; margin-bottom: 2px;">${escapeHtml(r.description || 'Sin detalle')}</div>
                    ${r.feedback ? `<small style="color:#0284c7; display:block;"><i class="fa-solid fa-comment-dots"></i> Testigo/Nota: ${escapeHtml(r.feedback)}</small>` : ''}
                </td>
                <td class="cell-status">
                    <span class="crud-status-badge active" style="font-size:0.75rem;">● ${r.status || 'Aprobado'}</span>
                </td>
            </tr>
        `;
    }).join('');

    updateSummaryFooter(filteredReports.length, totalHrs, totalAmt);
}

function updateSummaryFooter(count, hours, amount) {
    const recEl = document.getElementById('summaryRecordsCount');
    const hrsEl = document.getElementById('summaryTotalHours');
    const amtEl = document.getElementById('summaryTotalAmount');

    if (recEl) recEl.textContent = count;
    if (hrsEl) hrsEl.textContent = `${hours.toFixed(1)} hrs`;
    if (amtEl) amtEl.textContent = `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function getServiceName(report) {
    if (report.projectId) {
        const proj = clientData.projects.find(p => (p.projectId || p.id) === report.projectId);
        if (proj) return proj.name;
    }
    if (report.supportId) {
        const supp = clientData.supports.find(s => (s.supportId || s.id) === report.supportId);
        if (supp) return supp.name;
    }
    return report.assignmentType === 'project' ? 'Proyecto' : 'Soporte General';
}

function getModuleName(report) {
    if (report.moduleId) {
        const mod = clientData.modules.find(m => (m.moduleId || m.id) === report.moduleId);
        if (mod) return mod.name;
    }
    return 'General';
}

function getClientRate(report) {
    // Buscar en tarifarios de la empresa
    if (clientData.tarifarios && clientData.tarifarios.length > 0) {
        const match = clientData.tarifarios.find(t => {
            if (report.moduleId && t.moduleId === report.moduleId) return true;
            if (report.projectId && t.projectId === report.projectId) return true;
            if (report.supportId && t.supportId === report.supportId) return true;
            return false;
        });
        if (match && typeof match.costoCliente === 'number') {
            return match.costoCliente;
        }
    }
    return 0; // Si no hay tarifa configurada
}

// === EXPORTACIÓN EXCEL ===
function exportHoursToExcel() {
    if (filteredReports.length === 0) {
        alert('No hay datos para exportar con los filtros seleccionados');
        return;
    }

    const compName = clientData.company?.name || 'Cliente';
    const rows = filteredReports.map(r => {
        const hrs = parseFloat(r.hours) || 0;
        const rate = getClientRate(r);
        return {
            'Fecha': r.date ? new Date(r.date).toLocaleDateString('es-MX') : '—',
            'Proyecto / Soporte': getServiceName(r),
            'Ticket / Referencia': r.title || r.reportId || '—',
            'Módulo': getModuleName(r),
            'Horas Justificadas': hrs,
            'Tarifa Pactada (MXN)': rate,
            'Importe Total (MXN)': hrs * rate,
            'Descripción y Justificación de Actividad': r.description || '',
            'Notas de Validación / Testigos': r.feedback || '',
            'Estatus': r.status || 'Aprobado'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría de Horas');

    const fileName = `Conciliacion_Horas_${compName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

// === EXPORTACIÓN PDF / IMPRESIÓN ===
function exportHoursToPDF() {
    if (filteredReports.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const compName = clientData.company?.name || 'Empresa Cliente';
    const compRfc = clientData.company?.rfc || '—';
    const period = document.getElementById('filterMonth')?.value || new Date().toISOString().substring(0, 7);

    const totalHrs = filteredReports.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0);
    const totalAmt = filteredReports.reduce((s, r) => s + ((parseFloat(r.hours) || 0) * getClientRate(r)), 0);

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Por favor habilite las ventanas emergentes para generar el PDF');
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Conciliación de Horas - GRUPO IT ARVIC</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
                .header-table { width: 100%; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
                .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
                .subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
                .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; }
                table.data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
                table.data-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; }
                table.data-table td { border: 1px solid #cbd5e1; padding: 8px 6px; vertical-align: top; }
                .summary-table { width: 350px; margin-left: auto; border-collapse: collapse; font-size: 12px; }
                .summary-table td { padding: 6px 10px; }
                .confidential-seal { margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 15px; font-size: 10px; color: #64748b; text-align: center; }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td>
                        <div class="title">GRUPO IT ARVIC</div>
                        <div class="subtitle">Reporte Oficial de Auditoría y Conciliación de Servicios</div>
                    </td>
                    <td style="text-align: right;">
                        <strong>Periodo:</strong> ${period}<br>
                        <strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-MX')}
                    </td>
                </tr>
            </table>

            <div class="meta-box">
                <strong>Empresa Cliente:</strong> ${compName} &nbsp;|&nbsp; 
                <strong>RFC:</strong> ${compRfc} &nbsp;|&nbsp; 
                <strong>Total Registros:</strong> ${filteredReports.length}
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Servicio</th>
                        <th>Ticket</th>
                        <th>Módulo</th>
                        <th style="text-align:right;">Horas</th>
                        <th style="text-align:right;">Tarifa</th>
                        <th style="text-align:right;">Importe</th>
                        <th>Descripción y Justificación de Tareas (Testigos)</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredReports.map(r => {
                        const hrs = parseFloat(r.hours) || 0;
                        const rate = getClientRate(r);
                        return `
                            <tr>
                                <td>${r.date ? new Date(r.date).toLocaleDateString('es-MX') : '—'}</td>
                                <td><strong>${getServiceName(r)}</strong></td>
                                <td><code>${r.title || r.reportId || '—'}</code></td>
                                <td>${getModuleName(r)}</td>
                                <td style="text-align:right; font-weight:bold;">${hrs.toFixed(1)}</td>
                                <td style="text-align:right;">$${rate.toFixed(2)}</td>
                                <td style="text-align:right; font-weight:bold;">$${(hrs * rate).toFixed(2)}</td>
                                <td>
                                    ${escapeHtml(r.description || '')}
                                    ${r.feedback ? `<br><small style="color:#0284c7;">Testigo: ${escapeHtml(r.feedback)}</small>` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <table class="summary-table">
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td><strong>Total Horas Auditadas:</strong></td>
                    <td style="text-align:right; font-weight:bold;">${totalHrs.toFixed(1)} hrs</td>
                </tr>
                <tr style="background:#f0fdf4; font-size:13px;">
                    <td><strong>Importe Total Pactado:</strong></td>
                    <td style="text-align:right; font-weight:bold; color:#15803d;">$${totalAmt.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</td>
                </tr>
            </table>

            <div class="confidential-seal">
                Documento generado electrónicamente por el Portal de Clientes de GRUPO IT ARVIC.<br>
                Garantía de Confidencialidad y Cumplimiento de Niveles de Servicio.
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
}

// === WORKSPACES DE EXPEDIENTE Y DATOS DE CUENTA ===
async function renderExpedienteWorkspace() {
    const root = document.getElementById('clientExpedienteWorkspaceRoot');
    if (!root || !window.AccountWorkspace) return;

    const companyId = clientData.company?.companyId || window.AuthSys.getCurrentUser()?.companyId;
    if (!companyId) {
        root.innerHTML = '<div style="text-align:center; padding:40px; color:var(--client-text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b; margin-right:8px;"></i>No se encontró empresa vinculada para cargar el expediente.</div>';
        return;
    }

    await window.AccountWorkspace.render('clientExpedienteWorkspaceRoot', 'expedientes', companyId, {
        entityType: 'cliente',
        isReadOnlyData: false,
        forcedTab: 'expedientes'
    });
}

async function renderAccountWorkspace() {
    const root = document.getElementById('clientAccountWorkspaceRoot');
    if (!root || !window.AccountWorkspace) return;

    const companyId = clientData.company?.companyId || window.AuthSys.getCurrentUser()?.companyId;
    if (!companyId) {
        root.innerHTML = '<div style="text-align:center; padding:40px; color:var(--client-text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b; margin-right:8px;"></i>No se encontró empresa vinculada para cargar los datos.</div>';
        return;
    }

    await window.AccountWorkspace.render('clientAccountWorkspaceRoot', 'datos', companyId, {
        entityType: 'cliente',
        isReadOnlyData: false,
        forcedTab: 'datos'
    });
}

// === NAVEGACIÓN ENTRE SECCIONES ===
function switchClientSection(sectionKey) {
    document.querySelectorAll('.cliente-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.cliente-menu-item').forEach(m => m.classList.remove('active'));

    const targetSec = document.getElementById(`section-${sectionKey}`);
    const targetMenu = document.querySelector(`.cliente-menu-item[data-section="${sectionKey}"]`);

    if (targetSec) targetSec.classList.add('active');
    if (targetMenu) targetMenu.classList.add('active');

    // Cargar o refrescar el workspace correspondiente
    if (sectionKey === 'expedientes') {
        renderExpedienteWorkspace();
    } else if (sectionKey === 'mi-cuenta') {
        renderAccountWorkspace();
    } else if (sectionKey === 'facturacion') {
        loadClientBillingPeriods();
    }

    // Scroll suave arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// SISTEMA DE TEMA (DARK / LIGHT) CON PERSISTENCIA GARANTIZADA
// =========================================================================

function initTheme() {
    const savedTheme = localStorage.getItem('arvic_theme') || localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme, false);

    // Listener para cerrar dropdown de perfil al hacer clic afuera
    document.addEventListener('click', function(e) {
        const container = document.getElementById('clientProfileContainer');
        const dropdown = document.getElementById('clientProfileDropdown');
        const btn = document.getElementById('clientProfileBtn');

        if (dropdown && dropdown.classList.contains('active')) {
            if (!container || (!container.contains(e.target) && !dropdown.contains(e.target))) {
                dropdown.classList.remove('active');
                if (btn) btn.classList.remove('active');
            }
        }
    });
}

function applyTheme(theme, animate = true) {
    const isDark = theme === 'dark';
    
    // Aplicar atributos a HTML y Body
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
    }

    // Persistir en LocalStorage
    localStorage.setItem('arvic_theme', theme);
    localStorage.setItem('theme', theme);

    // Actualizar icono en header/dropdown
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    // Sincronizar checkbox switch
    const checkbox = document.getElementById('themeCheckbox');
    if (checkbox) {
        checkbox.checked = isDark;
    }
}

function toggleTheme(event) {
    if (event) {
        event.stopPropagation();
    }
    const currentTheme = localStorage.getItem('arvic_theme') || (document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
}

// =========================================================================
// MENÚ DESPLEGABLE DE PERFIL Y CONFIGURACIÓN
// =========================================================================

function toggleClientProfileMenu(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const dropdown = document.getElementById('clientProfileDropdown');
    const btn = document.getElementById('clientProfileBtn');
    if (!dropdown) return;

    // Si el panel de notificaciones está abierto, cerrarlo
    const notifPanel = document.getElementById('notificationsPanel');
    if (notifPanel && notifPanel.classList.contains('active')) {
        notifPanel.classList.remove('active');
    }

    const isOpen = dropdown.classList.contains('active');
    if (isOpen) {
        dropdown.classList.remove('active');
        if (btn) btn.classList.remove('active');
    } else {
        dropdown.classList.add('active');
        if (btn) btn.classList.add('active');
    }
}

function navigateFromDropdown(sectionKey) {
    const dropdown = document.getElementById('clientProfileDropdown');
    const btn = document.getElementById('clientProfileBtn');
    if (dropdown) dropdown.classList.remove('active');
    if (btn) btn.classList.remove('active');

    switchClientSection(sectionKey);
}

function logoutClient() {
    if (confirm('¿Desea cerrar la sesión del portal de cliente?')) {
        window.AuthSys.logout();
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}

// === EXPEDIENTE CONTRACTUAL DE PROYECTO (CLIENTE) ===
async function openClientProjectDocs(projectId, projectName) {
    const modal = document.getElementById('clientProjectDocsModal');
    const titleEl = document.getElementById('clientProjDocsModalTitle');
    const nameEl = document.getElementById('clientProjDocsModalName');
    const idEl = document.getElementById('clientProjDocsModalId');
    const listEl = document.getElementById('clientProjDocsList');

    if (titleEl) titleEl.textContent = `Expediente: ${projectName}`;
    if (nameEl) nameEl.textContent = projectName;
    if (idEl) idEl.textContent = `PROYECTO: ${projectId}`;

    if (modal) modal.style.display = 'flex';

    if (listEl) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 25px; color: #64748b;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.4rem; color:#0284c7;"></i>
                <p style="margin-top: 8px;">Consultando acuerdos y contratos del proyecto...</p>
            </div>
        `;
    }

    try {
        const token = localStorage.getItem('arvic_token') || sessionStorage.getItem('arvic_token');
        const projUrl = window.getArvicApiUrl ? window.getArvicApiUrl(`/api/expedientes/proyecto/${encodeURIComponent(projectId)}`) : `/api/expedientes/proyecto/${encodeURIComponent(projectId)}`;
        const res = await fetch(projUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        let docs = [];
        if (json.success && Array.isArray(json.data)) {
            docs = json.data;
        } else {
            // Fallback a caché
            docs = (clientData.projectDocs || []).filter(d => d.projectId === projectId || d.entityId === projectId);
        }

        // Detectar si existe un SOW firmado
        const signedSow = docs.find(d => 
            (d.documentType === 'anexo_sow' || d.documentType === 'contrato_proyecto') && 
            (d.signatureStatus === 'firmado' || (!d.isDraft && d.fileData))
        );

        const signingBox = document.getElementById('clientSowSigningBox');
        if (signingBox) {
            if (signedSow) {
                signingBox.innerHTML = `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                <i class="fa-solid fa-circle-check"></i>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #166534; font-size: 0.92rem;">Orden de Servicio / SOW Formalizado</div>
                                <div style="font-size: 0.78rem; color: #15803d;">Este proyecto cuenta con su contrato de servicios y alcance debidamente firmado y vigente.</div>
                            </div>
                        </div>
                        <a href="${(window.getArvicApiUrl ? window.getArvicApiUrl(`/api/expedientes/doc/${signedSow.docId}/download`) : `/api/expedientes/doc/${signedSow.docId}/download`)}?token=${encodeURIComponent(token || '')}" 
                           target="_blank" 
                           class="btn-machote-download" 
                           style="background: #16a34a; padding: 7px 14px; font-size: 0.8rem; text-decoration: none;">
                            <i class="fa-solid fa-file-pdf"></i> Ver SOW Firmado
                        </a>
                    </div>
                `;
            } else {
                signingBox.innerHTML = `
                    <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="display:inline-block; padding: 3px 8px; border-radius: 10px; background: #fef08a; color: #854d0e; font-weight: 700; font-size: 0.75rem;">
                                    <i class="fa-solid fa-clock"></i> Pendiente de Firma
                                </span>
                                <span style="font-weight: 700; color: #713f12; font-size: 0.92rem;">Orden de Servicio (SOW) del Proyecto</span>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button type="button" class="btn-machote-download" style="background: #dc2626; border-color: #dc2626; padding: 6px 12px; font-size: 0.8rem;" onclick="downloadClientSow('${projectId}', 'pdf')">
                                    <i class="fa-solid fa-file-pdf"></i> Descargar SOW (PDF)
                                </button>
                                <button type="button" class="btn-machote-download" style="background: #0284c7; padding: 6px 12px; font-size: 0.8rem;" onclick="downloadClientSow('${projectId}', 'doc')">
                                    <i class="fa-solid fa-file-word"></i> Word (.doc)
                                </button>
                            </div>
                        </div>
                        <p style="margin: 0 0 12px 0; font-size: 0.82rem; color: #713f12; line-height: 1.4;">
                            Descargue el documento prellenado con las horas y alcance de este proyecto, revíselo y firme física o digitalmente. Una vez firmado, adjúntelo a continuación:
                        </p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="file" id="clientSignedSowFile_${projectId}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="font-size: 0.8rem; padding: 6px; border: 1px dashed #ca8a04; border-radius: 6px; background: #ffffff; flex-grow: 1;">
                            <button type="button" class="btn-machote-download" style="background: #16a34a; padding: 7px 14px; font-size: 0.8rem; white-space: nowrap;" onclick="submitClientSignedSow('${projectId}')">
                                <i class="fa-solid fa-cloud-arrow-up"></i> Subir SOW Firmado
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        if (docs.length === 0) {
            listEl.innerHTML = `
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 24px; text-align: center; color: #64748b;">
                    <i class="fa-solid fa-file-contract" style="font-size: 2rem; margin-bottom: 8px; color: #94a3b8;"></i>
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Sin otros documentos formalizados registrados</p>
                    <small style="display: block; line-height: 1.4;">
                        Los documentos adicionales aparecerán listados aquí en cuanto sean adjuntos por el Administrador.
                    </small>
                </div>
            `;
            return;
        }

        const typeLabels = {
            'contrato_proyecto': 'Contrato de Proyecto',
            'anexo_sow': 'Anexo de Alcance (SOW)',
            'especificacion_tecnica': 'Especificación Técnica',
            'nda': 'Acuerdo de Confidencialidad (NDA)',
            'acta_entrega': 'Acta de Entrega',
            'otro': 'Documento Legal'
        };

        listEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${docs.map(d => {
                    const typeLabel = typeLabels[d.documentType] || d.documentType;
                    const dateStr = d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                    const validStr = d.validUntil ? new Date(d.validUntil).toLocaleDateString('es-MX') : 'Vigencia Permanente';
                    const fileSizeKb = d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : '';

                    return `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                            <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
                                <div style="width: 40px; height: 40px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                                    <i class="fa-solid fa-file-lines"></i>
                                </div>
                                <div style="min-width: 0;">
                                    <div style="font-weight: 700; color: #0f172a; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${escapeHtml(d.documentTitle || d.fileName)}
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center; font-size: 0.76rem; color: #64748b; margin-top: 3px; flex-wrap: wrap;">
                                        <span style="background: #f1f5f9; padding: 2px 7px; border-radius: 4px; font-weight: 600; color: #475569;">${typeLabel}</span>
                                        <span>• ${dateStr}</span>
                                        ${fileSizeKb ? `<span>• ${fileSizeKb}</span>` : ''}
                                        <span style="color: #16a34a; font-weight: 500;"><i class="fa-solid fa-shield-check"></i> ${validStr}</span>
                                    </div>
                                    ${d.notes ? `<div style="font-size: 0.74rem; color: #0284c7; margin-top: 3px;"><i class="fa-solid fa-info-circle"></i> ${escapeHtml(d.notes)}</div>` : ''}
                                </div>
                            </div>
                            <div style="flex-shrink: 0;">
                                <a href="${(window.getArvicApiUrl ? window.getArvicApiUrl(`/api/expedientes/doc/${d.docId}/download`) : `/api/expedientes/doc/${d.docId}/download`)}?token=${encodeURIComponent(token || '')}" target="_blank" class="btn-machote-download" style="padding: 6px 14px; font-size: 0.8rem; text-decoration: none;" title="Descargar documento">
                                    <i class="fa-solid fa-download"></i> Descargar
                                </a>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch (err) {
        console.error('Error al obtener documentos de proyecto:', err);
        listEl.innerHTML = `
            <div style="color: #ef4444; padding: 14px; text-align: center;">
                <i class="fa-solid fa-circle-exclamation"></i> Error al consultar documentos del proyecto.
            </div>
        `;
    }
}

function downloadClientSow(projectId, format = 'pdf') {
    const token = localStorage.getItem('arvic_token') || sessionStorage.getItem('arvic_token');
    const url = window.getArvicApiUrl
        ? window.getArvicApiUrl(`/api/expedientes/proyecto/${projectId}/generar-contrato?tipo=cliente&format=${format}&token=${token}`)
        : `/api/expedientes/proyecto/${projectId}/generar-contrato?tipo=cliente&format=${format}&token=${token}`;
    window.open(url, '_blank');
}

async function submitClientSignedSow(projectId) {
    const fileInput = document.getElementById(`clientSignedSowFile_${projectId}`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Por favor seleccione el archivo de contrato o SOW firmado.');
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 20 * 1024 * 1024) {
        alert('El archivo no debe exceder 20 MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        try {
            const token = localStorage.getItem('arvic_token') || sessionStorage.getItem('arvic_token');
            const url = window.getArvicApiUrl ? window.getArvicApiUrl('/api/expedientes/firmar') : '/api/expedientes/firmar';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    entityType: 'proyecto',
                    targetId: projectId,
                    documentType: 'anexo_sow',
                    documentTitle: `SOW Firmado - ${file.name}`,
                    fileName: file.name,
                    fileData: base64Data,
                    fileSize: file.size,
                    mimeType: file.type || 'application/pdf'
                })
            });

            const json = await res.json();
            if (json.success) {
                alert('¡SOW firmado cargado exitosamente!');
                const nameEl = document.getElementById('clientProjDocsModalName');
                openClientProjectDocs(projectId, nameEl ? nameEl.textContent : 'Proyecto');
            } else {
                alert(`Error al subir documento: ${json.message}`);
            }
        } catch (err) {
            console.error('Error al subir SOW firmado:', err);
            alert('Error de conexión al subir el documento firmado.');
        }
    };
    reader.readAsDataURL(file);
}

function closeClientProjectDocsModal() {
    const modal = document.getElementById('clientProjectDocsModal');
    if (modal) modal.style.display = 'none';
}

window.openClientProjectDocs = openClientProjectDocs;
window.closeClientProjectDocsModal = closeClientProjectDocsModal;
window.downloadClientSow = downloadClientSow;
window.submitClientSignedSow = submitClientSignedSow;

// =========================================================================
// SISTEMA DE NOTIFICACIONES INTERACTIVAS DEL CLIENTE
// =========================================================================
let clientNotifsInterval = null;

function initClientNotifications() {
    updateClientNotificationBadge();
    
    // Polling periódico cada 30 segundos
    if (clientNotifsInterval) clearInterval(clientNotifsInterval);
    clientNotifsInterval = setInterval(() => {
        updateClientNotificationBadge();
    }, 30000);

    // Cerrar panel al hacer clic en cualquier parte exterior
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('notificationsPanel');
        const btn = document.getElementById('btnNotifClient');
        if (panel && panel.classList.contains('active')) {
            if (!panel.contains(e.target) && !btn?.contains(e.target)) {
                panel.classList.remove('active');
            }
        }
    });
}

function toggleClientNotifications(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;

    const isOpen = panel.classList.contains('active');
    if (isOpen) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        loadClientNotifications();
    }
}

async function loadClientNotifications() {
    const user = window.AuthSys ? window.AuthSys.getCurrentUser() : null;
    if (!user || !user.userId) return;

    const listEl = document.getElementById('notificationsList');
    if (listEl) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 25px; color: #94a3b8;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.2rem; color: #0284c7;"></i>
                <p style="margin-top: 6px; font-size: 0.8rem;">Cargando notificaciones...</p>
            </div>
        `;
    }

    try {
        const notifs = await window.PortalDB.getNotifications(user.userId);
        renderClientNotifications(notifs);
    } catch (err) {
        console.error('Error cargando notificaciones de cliente:', err);
        if (listEl) {
            listEl.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>
                    <p>No fue posible cargar las notificaciones</p>
                </div>
            `;
        }
    }
}

function renderClientNotifications(notifications) {
    const listEl = document.getElementById('notificationsList');
    if (!listEl) return;

    if (!notifications || notifications.length === 0) {
        listEl.innerHTML = `
            <div class="notif-empty">
                <i class="fa-solid fa-bell-slash"></i>
                <p>No tienes notificaciones pendientes</p>
            </div>
        `;
        return;
    }

    const iconMap = {
        'report_created': 'fa-solid fa-clock-rotate-left',
        'report_approved': 'fa-solid fa-circle-check',
        'report_rejected': 'fa-solid fa-circle-xmark',
        'assignment_new': 'fa-solid fa-user-check',
        'contract_assigned': 'fa-solid fa-file-signature',
        'contract_signed': 'fa-solid fa-stamp',
        'system': 'fa-solid fa-gear'
    };

    listEl.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" 
             data-notif-id="${n.notificationId}"
             data-type="${n.type}"
             onclick="handleClientNotificationClick('${n.notificationId}', '${n.type}', '${n.actionUrl || ''}', this)">
            <div class="notif-icon type-${n.type}">
                <i class="${iconMap[n.type] || 'fa-solid fa-bell'}"></i>
            </div>
            <div class="notif-body">
                <div class="notif-title">${escapeHtml(n.title)}</div>
                <div class="notif-message">${escapeHtml(n.message)}</div>
                <div class="notif-time">
                    <i class="fa-solid fa-clock"></i>
                    ${timeAgoClient(n.createdAt)}
                </div>
            </div>
            ${!n.read ? '<span style="width:8px; height:8px; border-radius:50%; background:#0284c7; flex-shrink:0; margin-top:5px;"></span>' : ''}
        </div>
    `).join('');
}

function timeAgoClient(dateStr) {
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

async function handleClientNotificationClick(notifId, type, actionUrl, element) {
    try {
        await window.PortalDB.markNotificationAsRead(notifId);
        if (element) {
            element.classList.remove('unread');
            const dot = element.querySelector('span[style*="border-radius:50%"]');
            if (dot) dot.remove();
        }
        updateClientNotificationBadge();
    } catch (err) {
        console.error('Error marcando notificación como leída:', err);
    }

    // Cerrar panel flotante
    const panel = document.getElementById('notificationsPanel');
    if (panel) panel.classList.remove('active');

    // Navegar de forma inteligente a la sección correspondiente
    if (actionUrl && typeof switchClientSection === 'function') {
        switchClientSection(actionUrl);
    } else if (type === 'contract_assigned' || type === 'contract_signed' || type === 'documento_firmado') {
        switchClientSection('expedientes');
    } else if (type === 'report_created' || type === 'report_approved' || type === 'report_rejected') {
        switchClientSection('horas');
    } else if (type === 'assignment_new') {
        switchClientSection('proyectos');
    } else {
        // Si viene como 'system', deducir por el título o texto del elemento
        const text = (element ? element.textContent : '').toLowerCase();
        if (text.includes('expediente') || text.includes('situación fiscal') || text.includes('csf') || text.includes('contrato') || text.includes('sow')) {
            switchClientSection('expedientes');
        } else if (text.includes('hora') || text.includes('actividad') || text.includes('reporte') || text.includes('conciliación')) {
            switchClientSection('horas');
        } else if (text.includes('proyecto') || text.includes('servicio')) {
            switchClientSection('proyectos');
        } else {
            switchClientSection('resumen');
        }
    }
}

async function markAllNotificationsRead() {
    const user = window.AuthSys ? window.AuthSys.getCurrentUser() : null;
    if (!user || !user.userId) return;

    try {
        await window.PortalDB.markAllNotificationsAsRead(user.userId);
        loadClientNotifications();
        updateClientNotificationBadge();
    } catch (err) {
        console.error('Error marcando todas como leídas:', err);
    }
}

async function updateClientNotificationBadge() {
    const user = window.AuthSys ? window.AuthSys.getCurrentUser() : null;
    if (!user || !user.userId) return;

    try {
        const count = await window.PortalDB.getUnreadNotificationCount(user.userId);
        const badge = document.getElementById('clientNotifyBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error actualizando badge cliente:', err);
    }
}

window.toggleClientNotifications = toggleClientNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.handleClientNotificationClick = handleClientNotificationClick;
window.toggleClientProfileMenu = toggleClientProfileMenu;
window.navigateFromDropdown = navigateFromDropdown;
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.logoutClient = logoutClient;

// =========================================================================
// MÓDULO DE FACTURACIÓN Y PRE-FACTURAS PARA EL CLIENTE
// =========================================================================

async function loadClientBillingPeriods() {
    const tbody = document.getElementById('clientBillingTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--client-text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cortes de facturación...</td></tr>`;
    }

    try {
        const periods = await window.PortalDB.getBillingPeriods();
        clientData.billingPeriods = periods || [];

        // 1. Actualizar Badge en el Sidebar
        const badge = document.getElementById('badgeBillingCount');
        if (badge) {
            if (periods && periods.length > 0) {
                badge.textContent = periods.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // 2. Calcular y actualizar KPIs
        let totalBilled = 0;
        let totalHours = 0;

        periods.forEach(p => {
            totalHours += (Number(p.totalHours) || 0);
            totalBilled += (Number(p.totalWithIva) || (Number(p.totalClient || 0) * 1.16));
        });

        const statTotal = document.getElementById('clientStatTotalFacturado');
        const statHours = document.getElementById('clientStatHorasFacturadas');
        const statCount = document.getElementById('clientStatCortesCount');

        if (statTotal) statTotal.textContent = `$ ${totalBilled.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
        if (statHours) statHours.textContent = `${totalHours.toFixed(1)} hrs`;
        if (statCount) statCount.textContent = `${periods.length}`;

        // 3. Renderizar Tabla de Cortes
        if (!tbody) return;

        if (!periods || periods.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:40px; color:var(--client-text-muted);">
                        <i class="fa-solid fa-file-invoice" style="font-size:2rem; margin-bottom:10px; opacity:0.4; display:block;"></i>
                        No hay cortes o pre-facturas registradas actualmente para su empresa.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = periods.map(p => {
            const d1 = formatDateSafeClient(p.startDate);
            const d2 = formatDateSafeClient(p.endDate);
            const subtotal = Number(p.totalClient || p.subtotal || 0);
            const iva = Number(p.iva || (subtotal * 0.16));
            const totalWithIva = Number(p.totalWithIva || (subtotal * 1.16));

            let statusBadge = '<span class="crud-status-badge active">Conciliado</span>';
            if (p.status === 'Facturado') {
                statusBadge = '<span class="crud-status-badge active" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;"><i class="fa-solid fa-file-circle-check"></i> Facturado</span>';
            } else if (p.status === 'Cerrado') {
                statusBadge = '<span class="crud-status-badge active" style="background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0;"><i class="fa-solid fa-lock"></i> Cerrado</span>';
            }

            return `
                <tr>
                    <td><strong style="color:var(--client-primary);">${p.periodId}</strong></td>
                    <td><strong>${p.periodName || 'Quincenal'}</strong></td>
                    <td style="white-space:nowrap; font-size:0.85rem; color:var(--client-text-muted);">${d1} al ${d2}</td>
                    <td style="text-align:right;"><strong>${p.totalHours} hrs</strong></td>
                    <td style="text-align:right;">$ ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align:right; color:var(--client-text-muted);">$ ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align:right; font-weight:800; color:#0284c7;">$ ${totalWithIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align:center;">${statusBadge}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-export pdf" onclick="downloadClientPreFacturaPDF('${p.periodId}')" title="Descargar Pre-Factura Oficial en PDF" style="padding:5px 9px; font-size:0.8rem; margin-right:4px;">
                            <i class="fa-solid fa-file-pdf"></i> PDF
                        </button>
                        <button class="btn-export excel" onclick="downloadClientPreFacturaExcel('${p.periodId}')" title="Descargar Desglose en Excel" style="padding:5px 9px; font-size:0.8rem; margin-right:4px;">
                            <i class="fa-solid fa-file-excel"></i> Excel
                        </button>
                        <button class="btn-export" onclick="viewClientPeriodDetail('${p.periodId}')" title="Ver detalle de actividades" style="padding:5px 9px; font-size:0.8rem;">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error cargando periodos cliente:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#ef4444; padding:30px;">Error al cargar cortes de facturación</td></tr>`;
        }
    }
}

function formatDateSafeClient(d) {
    if (!d) return '—';
    if (typeof d === 'string' && d.includes('-')) {
        const parts = d.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(d).toLocaleDateString('es-MX');
}

/**
 * Descargar Excel oficial del corte
 */
function downloadClientPreFacturaExcel(periodId) {
    try {
        const url = window.PortalDB.getBillingExcelUrl(periodId);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Corte_${periodId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        console.error('Error al descargar Excel:', err);
        alert('Error al descargar el archivo Excel');
    }
}

/**
 * Descargar PDF oficial de la Pre-Factura para el Cliente
 */
async function downloadClientPreFacturaPDF(periodId) {
    const period = (clientData.billingPeriods || []).find(p => p.periodId === periodId);
    if (!period) {
        alert('Periodo no encontrado');
        return;
    }

    try {
        if (typeof window.jspdf === 'undefined') {
            alert('Librería de PDF cargando, intente nuevamente');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const d1 = formatDateSafeClient(period.startDate);
        const d2 = formatDateSafeClient(period.endDate);

        // 1. Cargar Logo ARVIC
        let logoData = null;
        try {
            logoData = await new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1017;
                    canvas.height = 370;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 1017, 370);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => resolve(null);
                img.src = '../images/Logo Grupo IT Arvic 33.svg';
            });
        } catch (e) {
            logoData = null;
        }

        // 2. Encabezado Corporativo ARVIC (Banda azul marino)
        doc.setFillColor(27, 58, 92); // #1B3A5C
        doc.rect(0, 0, 210, 32, 'F');

        doc.setFillColor(2, 132, 199); // Línea cian
        doc.rect(0, 31.2, 210, 0.8, 'F');

        let textStartX = 14;
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 6.5, 44, 16);
            textStartX = 64;
        }

        // Membrete
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.text('GRUPO IT ARVIC S.A. DE C.V.', textStartX, 12);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(224, 242, 254);
        doc.text('ORDEN DE PRE-FACTURA Y CONCILIACIÓN DE SERVICIOS', textStartX, 18);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(186, 230, 253);
        doc.text('Servicios Especializados de Consultoría y Soporte en TI', textStartX, 23.5);

        // Metadatos derecha
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 196, 12, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(224, 242, 254);
        doc.text(`Folio: ${period.periodId}`, 196, 18, { align: 'right' });

        doc.setFontSize(7.5);
        doc.setTextColor(186, 230, 253);
        doc.text(`Estado: ${period.status}`, 196, 23.5, { align: 'right' });

        // 3. Tarjeta Receptor Cliente
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 38, 182, 24, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 38, 182, 24, 2, 2, 'S');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL RECEPTOR / CLIENTE', 18, 44);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`Empresa: ${period.companyName || clientData.company?.name || 'Cliente'}`, 18, 50);
        doc.text(`RFC: ${period.rfc || clientData.company?.rfc || 'XEXX010101000'}`, 18, 56);

        doc.text(`Periodo: ${period.periodName || 'Quincenal'} (${d1} al ${d2})`, 110, 50);
        doc.text(`Moneda: MXN (Pesos Mexicanos)`, 110, 56);

        // 4. Tabla de Actividades
        const items = period.items || [];
        const tableRows = items.map(it => [
            formatDateSafeClient(it.date),
            it.projectName || it.supportName || 'General',
            it.moduleName || it.moduleId || '—',
            it.ticket || '-',
            it.hours,
            `$ ${Number(it.rateClient).toFixed(2)}`,
            `$ ${Number(it.amountClient).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 68,
            head: [['Fecha', 'Proyecto/Soporte', 'Módulo', 'Ticket / Ref.', 'Horas', 'Tarifa Pactada', 'Subtotal']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [27, 58, 92], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });

        // 5. Totales
        const finalY = doc.lastAutoTable.finalY + 8;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(120, finalY, 76, 36, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(120, finalY, 76, 36, 2, 2, 'S');

        const subtotal = Number(period.totalClient || period.subtotal || 0);
        const iva = Number(period.iva || (subtotal * 0.16));
        const total = Number(period.totalWithIva || (subtotal * 1.16));

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total Horas Facturadas:`, 124, finalY + 8);
        doc.text(`${period.totalHours} hrs`, 190, finalY + 8, { align: 'right' });

        doc.text(`Subtotal Facturable:`, 124, finalY + 16);
        doc.text(`$ ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, finalY + 16, { align: 'right' });

        doc.text(`IVA (16%):`, 124, finalY + 24);
        doc.text(`$ ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, finalY + 24, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(27, 58, 92);
        doc.text(`TOTAL FACTURABLE:`, 124, finalY + 32);
        doc.text(`$ ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 190, finalY + 32, { align: 'right' });

        // 6. Firmas
        const signY = finalY + 52;
        if (signY < 270) {
            doc.setDrawColor(203, 213, 225);
            doc.line(24, signY, 84, signY);
            doc.line(126, signY, 186, signY);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Por Grupo IT Arvic S.A. de C.V.', 54, signY + 6, { align: 'center' });
            doc.text('Por el Cliente / Aceptación', 156, signY + 6, { align: 'center' });
        }

        doc.save(`PreFactura_${period.periodId}.pdf`);
    } catch (err) {
        console.error('Error generando PDF cliente:', err);
        alert('Error al generar el PDF de la Pre-Factura');
    }
}

/**
 * Modal para ver detalle de tickets del corte
 */
function viewClientPeriodDetail(periodId) {
    const period = (clientData.billingPeriods || []).find(p => p.periodId === periodId);
    if (!period) return;

    const modal = document.getElementById('modalClientPeriodDetail');
    const title = document.getElementById('modalDetailTitle');
    const body = document.getElementById('modalDetailBody');

    if (title) title.innerHTML = `Corte ${period.periodId} — <strong>${period.periodName || 'Periodo'}</strong>`;

    const subtotal = Number(period.totalClient || period.subtotal || 0);
    const iva = Number(period.iva || (subtotal * 0.16));
    const total = Number(period.totalWithIva || (subtotal * 1.16));

    const rows = (period.items || []).map(it => `
        <tr>
            <td>${formatDateSafeClient(it.date)}</td>
            <td><strong>${it.projectName || it.supportName || 'General'}</strong></td>
            <td><span class="audit-table cell-module">${it.moduleName || it.moduleId || '—'}</span></td>
            <td><small style="color:var(--client-text-muted);">${it.ticket || it.description || '—'}</small></td>
            <td style="text-align:right;"><strong>${it.hours} hrs</strong></td>
            <td style="text-align:right;">$ ${Number(it.rateClient).toFixed(2)}</td>
            <td style="text-align:right; font-weight:700; color:#0284c7;">$ ${Number(it.amountClient).toFixed(2)}</td>
        </tr>
    `).join('');

    if (body) {
        body.innerHTML = `
            <div style="background:var(--client-bg-alt, #f8fafc); padding:16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; border:1px solid var(--client-border);">
                <div>
                    <span style="font-size:0.8rem; color:var(--client-text-muted);">Empresa</span><br>
                    <strong>${period.companyName}</strong>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--client-text-muted);">Horas Totales</span><br>
                    <strong>${period.totalHours} hrs</strong>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--client-text-muted);">Subtotal</span><br>
                    <strong>$ ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--client-text-muted);">IVA (16%)</span><br>
                    <strong>$ ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div>
                    <span style="font-size:0.8rem; color:var(--client-text-muted);">Total con IVA</span><br>
                    <strong style="color:#0284c7; font-size:1.1rem;">$ ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
            </div>

            <div class="audit-table-responsive" style="max-height:400px; overflow-y:auto;">
                <table class="audit-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Proyecto / Servicio</th>
                            <th>Módulo</th>
                            <th>Ticket / Actividad</th>
                            <th style="text-align:right;">Horas</th>
                            <th style="text-align:right;">Tarifa</th>
                            <th style="text-align:right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="7" style="text-align:center; padding:20px;">Sin registros</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button class="btn-export pdf" onclick="downloadClientPreFacturaPDF('${period.periodId}')">
                    <i class="fa-solid fa-file-pdf"></i> Descargar Pre-Factura PDF
                </button>
                <button class="btn-export excel" onclick="downloadClientPreFacturaExcel('${period.periodId}')">
                    <i class="fa-solid fa-file-excel"></i> Descargar Excel
                </button>
            </div>
        `;
    }

    if (modal) modal.style.display = 'flex';
}

function closeClientPeriodModal() {
    const modal = document.getElementById('modalClientPeriodDetail');
    if (modal) modal.style.display = 'none';
}

window.loadClientBillingPeriods = loadClientBillingPeriods;
window.downloadClientPreFacturaPDF = downloadClientPreFacturaPDF;
window.downloadClientPreFacturaExcel = downloadClientPreFacturaExcel;
window.viewClientPeriodDetail = viewClientPeriodDetail;
window.closeClientPeriodModal = closeClientPeriodModal;


