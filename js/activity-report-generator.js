/**
 * GENERADOR DE REPORTE DE ACTIVIDADES
 * Replica el diseño Excel con logo ARVIC, tabla de 8 columnas,
 * totales con fondo amarillo, y sección de firmas.
 */
class ActivityReportGenerator {
    constructor() {
        this.logoUrl = '../images/Logo-Grupo-IT-Arvic-22.png';
    }

    /**
     * Recopilar y resolver todos los datos de un timesheet
     */
    _generateTicketId(assignmentId, weekStart) {
        let hash = 0;
        const str = (assignmentId || '') + (weekStart || '');
        for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
        return '#' + Math.abs(hash).toString().slice(-6).padStart(6, '0');
    }

    async collectData(timesheetId) {
        const timesheets = window.PortalDB.getTimesheets();
        const ts = timesheets[timesheetId];
        if (!ts) throw new Error('Timesheet no encontrado');

        const rows = [];
        const detailItems = [];
        let projectName = '';
        let clientName = '';
        const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
        const dayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

        if (ts.entries && Array.isArray(ts.entries)) {
            for (const entry of ts.entries) {
                const resolved = await this._resolveAssignment(entry);
                if (!projectName && resolved.projectName) projectName = resolved.projectName;
                if (!clientName && resolved.clientName) clientName = resolved.clientName;

                const ticketId = entry.ticket && entry.ticket.trim() 
                    ? entry.ticket.trim() 
                    : this._generateTicketId(entry.assignmentId, ts.weekStart);
                let daysWorked = 0;
                for (let i = 0; i < 7; i++) {
                    if (entry.days?.[DAY_KEYS[i]]?.hours > 0) daysWorked++;
                }

                for (let i = 0; i < 7; i++) {
                    const dk = DAY_KEYS[i];
                    const dayData = entry.days?.[dk];
                    if (dayData && dayData.hours > 0) {
                        const cellDate = new Date(ts.weekStart + 'T00:00:00');
                        cellDate.setDate(cellDate.getDate() + i);
                        const dateStr = this._formatDate(cellDate);

                        rows.push({
                            cliente: resolved.clientName || '',
                            modulo: resolved.moduleName ? (window.convertModuleToAcronym(resolved.moduleName) || resolved.moduleName) : '',
                            ticket: ticketId,
                            fecha: dateStr,
                            actividad: dayData.detail || 'Horas registradas',
                            dias: daysWorked,
                            horas: dayData.hours,
                            lider: 'Administrador'
                        });

                        detailItems.push({
                            date: dateStr,
                            dayName: dayNames[i],
                            assignment: entry.assignmentLabel || resolved.projectName,
                            detail: dayData.detail || 'Horas registradas',
                            hours: dayData.hours
                        });
                    }
                }
            }
        }

        return {
            userName: ts.userName || 'Consultor',
            weekStart: this._formatDateFull(ts.weekStart),
            weekEnd: this._formatDateFull(ts.weekEnd),
            projectName: projectName || 'Sin proyecto',
            clientName: clientName || '',
            rows, totalHours: ts.totalWeekHours || rows.reduce((s,r) => s + r.horas, 0),
            detailItems, timesheetId
        };
    }

    async _resolveAssignment(entry) {
        let clientName = '', projectName = '', moduleName = '';
        try {
            const aId = entry.assignmentId;
            // Try to find assignment in different collections
            const allAssignments = await window.PortalDB.getAssignments();
            const assignmentsArr = Array.isArray(allAssignments) ? allAssignments : Object.values(allAssignments || {});
            let assignment = assignmentsArr.find(a => a.assignmentId === aId);

            if (!assignment) {
                const allPA = await window.PortalDB.getProjectAssignments();
                const paArr = Array.isArray(allPA) ? allPA : Object.values(allPA || {});
                assignment = paArr.find(a => a.projectAssignmentId === aId);
            }
            if (!assignment) {
                const allTA = window.PortalDB.getTaskAssignments ? await window.PortalDB.getTaskAssignments() : {};
                const taArr = Array.isArray(allTA) ? allTA : Object.values(allTA || {});
                assignment = taArr.find(a => a.taskAssignmentId === aId);
            }

            if (assignment) {
                if (assignment.companyId) {
                    const company = await window.PortalDB.getCompany(assignment.companyId);
                    clientName = company?.name || '';
                }
                if (assignment.supportId) {
                    const support = await window.PortalDB.getSupport(assignment.supportId);
                    projectName = support?.name || '';
                }
                if (assignment.projectId) {
                    const project = await window.PortalDB.getProject(assignment.projectId);
                    projectName = project?.name || projectName;
                }
                if (assignment.moduleId) {
                    const mod = await window.PortalDB.getModule(assignment.moduleId);
                    if (mod?.name) {
                        moduleName = mod.name.includes(' - ') ? mod.name.split(' - ')[0].trim() : mod.name;
                    }
                }
            }

            // Fallback: parse from assignmentLabel
            if (!clientName && entry.assignmentLabel) {
                const parts = entry.assignmentLabel.split(' — ');
                if (parts.length > 1) clientName = parts[1].trim();
                if (!projectName && parts[0]) projectName = parts[0].trim();
            }
        } catch (e) {
            console.warn('Error resolving assignment:', e);
            if (entry.assignmentLabel) {
                const parts = entry.assignmentLabel.split(' — ');
                if (parts.length > 1) clientName = parts[1].trim();
                if (parts[0]) projectName = parts[0].trim();
            }
        }
        return { clientName, projectName, moduleName };
    }

    _formatDate(date) {
        if (typeof date === 'string') date = new Date(date + 'T00:00:00');
        const d = String(date.getDate()).padStart(2,'0');
        const m = String(date.getMonth()+1).padStart(2,'0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    _formatDateFull(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        const d = String(date.getDate()).padStart(2,'0');
        const m = String(date.getMonth()+1).padStart(2,'0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }

    /**
     * Generate HTML for Sheet 1 (Reporte de Actividades)
     */
    generateSheet1(data) {
        const emptyRowsNeeded = 0;

        let rowsHTML = data.rows.map(r => `
            <tr>
                <td class="col-cliente">${r.cliente}</td>
                <td class="col-modulo">${r.modulo}</td>
                <td class="col-ticket">${r.ticket}</td>
                <td class="col-fecha">${r.fecha}</td>
                <td class="col-actividad">${r.actividad}</td>
                <td class="col-dias">${r.dias}</td>
                <td class="col-horas">${r.horas}</td>
                <td class="col-lider">${r.lider}</td>
            </tr>
        `).join('');

        for (let i = 0; i < emptyRowsNeeded; i++) {
            rowsHTML += `<tr class="ar-empty-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        }

        return `
        <div class="ar-sheet" id="arSheet1">
            <div class="ar-header">
                <div class="ar-logo">
                    <img src="${this.logoUrl}" alt="GRUPO IT ARVIC" onerror="this.style.display='none'">
                </div>
                <div class="ar-header-title">
                    <h1>REPORTE DE ACTIVIDADES</h1>
                </div>
            </div>

            <div class="ar-metadata">
                <div class="ar-metadata-row">
                    <div class="ar-metadata-field">
                        <span class="ar-metadata-label">NOMBRE:</span>
                        <span class="ar-metadata-value">${data.userName}</span>
                    </div>
                    <div class="ar-metadata-field">
                        <span class="ar-metadata-label">SEMANA DEL</span>
                        <span class="ar-metadata-value">${data.weekStart}</span>
                        <span class="ar-metadata-label" style="margin-left:4px">al</span>
                        <span class="ar-metadata-value" style="max-width:120px">${data.weekEnd}</span>
                    </div>
                </div>
                <div class="ar-metadata-row">
                    <div class="ar-metadata-field">
                        <span class="ar-metadata-label">PROYECTO:</span>
                        <span class="ar-metadata-value">${data.projectName}</span>
                    </div>
                    <div class="ar-metadata-field">
                        <span class="ar-metadata-label">CLIENTE</span>
                        <span class="ar-metadata-value">${data.clientName}</span>
                    </div>
                </div>
            </div>

            <div class="ar-table-container">
                <table class="ar-table">
                    <colgroup>
                        <col class="col-w-cliente">
                        <col class="col-w-modulo">
                        <col class="col-w-ticket">
                        <col class="col-w-fecha">
                        <col class="col-w-actividad">
                        <col class="col-w-dias">
                        <col class="col-w-horas">
                        <col class="col-w-lider">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Modulo</th>
                            <th>Ticket</th>
                            <th>Fecha</th>
                            <th>ACTIVIDAD</th>
                            <th>DIAS</th>
                            <th>HORAS</th>
                            <th>LIDER</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                        <tr class="ar-totals-row">
                            <td colspan="5"></td>
                            <td class="ar-totals-label" colspan="1">TOTAL DE HORAS</td>
                            <td>${data.totalHours}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="ar-signatures">
                <div class="ar-signature-block">
                    <div class="ar-signature-line"></div>
                    <div class="ar-signature-name">${data.userName}</div>
                    <div class="ar-signature-title">FIRMA DE CONSULTOR</div>
                </div>
                <div class="ar-signature-block">
                    <div class="ar-signature-line"></div>
                    <div class="ar-signature-name">&nbsp;</div>
                    <div class="ar-signature-title">NOMBRE Y FIRMA DE CLIENTE</div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate HTML for Sheet 2 (Detalle)
     */
    generateSheet2(data) {
        let activitiesHTML = '';
        if (data.detailItems.length > 0) {
            activitiesHTML = data.detailItems.map(item => `
                <div class="ar-detail-activity-item">
                    <div class="activity-date">${item.dayName} ${item.date}</div>
                    <div class="activity-assignment">${item.assignment || ''}</div>
                    <div class="activity-text">${item.detail}</div>
                    <div class="activity-hours">${item.hours} hora(s)</div>
                </div>
            `).join('');
        } else {
            activitiesHTML = '<p style="color:#94a3b8;font-style:italic;">No se registraron detalles de actividades.</p>';
        }

        return `
        <div class="ar-sheet ar-detail-sheet ar-page-break" id="arSheet2">
            <h2>Detalle del Reporte</h2>
            <ul class="ar-detail-meta-list">
                <li><strong>Nombre</strong> – Nombre del recurso asignado al proyecto: <strong>${data.userName}</strong></li>
                <li><strong>Semana del – al</strong> – Semana a la que corresponde el informe de actividades: <strong>${data.weekStart} al ${data.weekEnd}</strong></li>
                <li><strong>Proyecto</strong> – Nombre(s) del proyecto al cual está asignado el recurso: <strong>${data.projectName}</strong></li>
                <li><strong>Cliente</strong> – ${data.clientName || 'N/A'}</li>
                <li><strong>Actividades</strong> – Actividades realizadas en el proyecto</li>
            </ul>
            <div class="ar-detail-activities">
                <h3>Actividades Realizadas</h3>
                ${activitiesHTML}
            </div>
        </div>`;
    }

    /**
     * Open the preview modal
     */
    async openPreview(timesheetId) {
        try {
            if (window.NotificationUtils) window.NotificationUtils.info('Generando reporte...', 2000);
            const data = await this.collectData(timesheetId);
            const sheet1 = this.generateSheet1(data);
            const sheet2 = this.generateSheet2(data);

            // Build modal
            let modal = document.getElementById('activityReportModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'activityReportModal';
                modal.className = 'modal activity-report-modal';
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header" style="background:#1B3A5C;color:white;padding:14px 20px;">
                        <h2 class="modal-title" style="color:white;margin:0;font-size:1.1rem;">
                            <i class="fa-solid fa-file-lines"></i> Reporte de Actividades — ${data.userName}
                        </h2>
                        <button class="close-btn" onclick="document.getElementById('activityReportModal').style.display='none'" style="color:white;font-size:1.5rem;background:none;border:none;cursor:pointer;">&times;</button>
                    </div>
                    <div class="ar-toolbar no-print">
                        <div class="ar-toolbar-tabs">
                            <button class="ar-tab-btn active" onclick="window._arSwitchTab('sheet1',this)">
                                <i class="fa-solid fa-table"></i> Reporte
                            </button>
                            <button class="ar-tab-btn" onclick="window._arSwitchTab('sheet2',this)">
                                <i class="fa-solid fa-list-check"></i> Detalle
                            </button>
                        </div>
                        <div class="ar-toolbar-actions">
                            <button class="btn ar-btn-print" onclick="window._arPrint()">
                                <i class="fa-solid fa-print"></i> Imprimir
                            </button>
                            <button class="btn ar-btn-excel" onclick="window._arDownloadExcel('${timesheetId}')">
                                <i class="fa-solid fa-file-excel"></i> Descargar Excel
                            </button>
                            <button class="btn ar-btn-pdf" onclick="window._arDownloadPDF('${timesheetId}')">
                                <i class="fa-solid fa-file-pdf"></i> Descargar PDF
                            </button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="ar-print-target" id="arPrintTarget">
                            <div class="ar-paper" id="arTabSheet1">${sheet1}</div>
                            <div class="ar-paper" id="arTabSheet2" style="display:none;">${sheet2}</div>
                        </div>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';

            // Close on outside click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.style.display = 'none';
            });
        } catch (error) {
            console.error('Error generando reporte:', error);
            if (window.NotificationUtils) window.NotificationUtils.error('Error al generar reporte: ' + error.message);
        }
    }

    /**
     * Export to PDF using jsPDF
     */
    async exportPDF(timesheetId) {
        try {
            if (window.NotificationUtils) window.NotificationUtils.info('Generando PDF...', 2000);
            const data = await this.collectData(timesheetId);

            // Load jsPDF if needed
            if (typeof window.jspdf === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const m = 15; // margin

            // === PAGE 1: REPORTE DE ACTIVIDADES ===
            // Logo
            try {
                doc.addImage(this.logoUrl, 'PNG', m, 10, 45, 16);
            } catch(e) {
                doc.setFontSize(10); doc.text('GRUPO IT ARVIC', m, 22);
            }

            // Title
            doc.setFont('helvetica','bold');
            doc.setFontSize(16);
            doc.setTextColor(0,0,0);
            doc.text('REPORTE DE ACTIVIDADES', pw - m, 22, {align:'right'});

            // Metadata
            doc.setFontSize(9);
            doc.setFont('helvetica','bold');
            doc.text('NOMBRE:', m, 40);
            doc.setFont('helvetica','normal');
            doc.text(data.userName, m + 22, 40);
            doc.setFont('helvetica','bold');
            doc.text('SEMANA DEL', pw/2 + 5, 40);
            doc.setFont('helvetica','normal');
            doc.text(`${data.weekStart}  al  ${data.weekEnd}`, pw/2 + 30, 40);

            doc.setFont('helvetica','bold');
            doc.text('PROYECTO:', m, 48);
            doc.setFont('helvetica','normal');
            doc.text(data.projectName, m + 25, 48);
            doc.setFont('helvetica','bold');
            doc.text('CLIENTE', pw/2 + 5, 48);
            doc.setFont('helvetica','normal');
            doc.text(data.clientName, pw/2 + 22, 48);

            // Lines under metadata values
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            doc.line(m+22, 41, pw/2, 41);
            doc.line(pw/2+30, 41, pw-m, 41);
            doc.line(m+25, 49, pw/2, 49);
            doc.line(pw/2+22, 49, pw-m, 49);

            // Table
            const tableTop = 55;
            const headers = ['Cliente','Modulo','Ticket','Fecha','ACTIVIDAD','DIAS','HORAS','LIDER'];
            const colWidths = [0.11,0.09,0.11,0.11,0.32,0.08,0.08,0.10].map(p => p * (pw - 2*m));
            const rowH = 10;
            const headerH = 10;

            // Draw header row
            let x = m;
            doc.setFillColor(27, 58, 92);
            doc.rect(m, tableTop, pw - 2*m, headerH, 'F');
            doc.setTextColor(255,255,255);
            doc.setFont('helvetica','bold');
            doc.setFontSize(8);
            headers.forEach((h, i) => {
                doc.text(h, x + colWidths[i]/2, tableTop + 6.5, {align:'center'});
                x += colWidths[i];
            });

            // Draw borders for header
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            x = m;
            headers.forEach((h, i) => {
                doc.rect(x, tableTop, colWidths[i], headerH);
                x += colWidths[i];
            });

            // Draw data rows
            doc.setTextColor(0,0,0);
            doc.setFont('helvetica','normal');
            doc.setFontSize(7.5);
            let curY = tableTop + headerH;
            const maxRows = data.rows.length;

            for (let r = 0; r < maxRows; r++) {
                const row = data.rows[r];
                x = m;

                // Check page break
                if (curY + rowH > ph - 40) {
                    // Draw totals row before break if needed
                    doc.addPage();
                    curY = 20;
                }

                // Draw cell borders
                headers.forEach((h, i) => {
                    doc.rect(x, curY, colWidths[i], rowH);
                    x += colWidths[i];
                });

                if (row) {
                    const vals = [row.cliente, row.modulo, row.ticket, row.fecha, row.actividad, row.dias, String(row.horas), row.lider];
                    x = m;
                    vals.forEach((v, i) => {
                        if (i === 4) { // ACTIVIDAD - wrap to max 2 lines
                            let txt = String(v || '');
                            const lines = doc.splitTextToSize(txt, colWidths[i] - 3);
                            if (lines.length > 2) {
                                lines[1] = lines[1].substring(0, lines[1].length - 3) + '...';
                            }
                            const toPrint = lines.slice(0, 2);
                            const yOffset = toPrint.length > 1 ? 4 : 6;
                            doc.text(toPrint, x + 1.5, curY + yOffset);
                        } else {
                            let valStr = String(v || '');
                            const valWidth = doc.getTextWidth(valStr);
                            const maxW = colWidths[i] - 2;
                            if (valWidth > maxW) {
                                let truncated = valStr;
                                while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxW) {
                                    truncated = truncated.slice(0, -1);
                                }
                                valStr = truncated + '...';
                            }
                            doc.text(valStr, x + colWidths[i]/2, curY + 6, {align:'center'});
                        }
                        x += colWidths[i];
                    });
                }
                curY += rowH;
            }

            // Totals row
            x = m;
            const totalsW6 = colWidths.slice(0,6).reduce((a,b)=>a+b,0);
            doc.setFillColor(245, 212, 66);
            doc.rect(m, curY, pw-2*m, rowH, 'F');
            doc.rect(m, curY, totalsW6, rowH);
            doc.rect(m+totalsW6, curY, colWidths[6], rowH);
            doc.rect(m+totalsW6+colWidths[6], curY, colWidths[7], rowH);

            doc.setFont('helvetica','bold');
            doc.setFontSize(8);
            doc.setTextColor(0,0,0);
            doc.text('TOTAL DE HORAS', m+totalsW6 - 5, curY+6.5, {align:'right'});
            doc.text(String(data.totalHours), m+totalsW6+colWidths[6]/2, curY+6.5, {align:'center'});
            curY += rowH;

            // Signatures
            let sigY = ph - 40;
            if (curY > sigY - 10) {
                doc.addPage();
            }
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(m + 10, sigY, m + 80, sigY);
            doc.line(pw - m - 80, sigY, pw - m - 10, sigY);

            doc.setFont('helvetica','normal');
            doc.setFontSize(8);
            doc.text(data.userName, m + 45, sigY + 5, {align:'center'});
            doc.setFont('helvetica','bold');
            doc.text('FIRMA DE CONSULTOR', m + 45, sigY + 10, {align:'center'});
            doc.text('NOMBRE Y FIRMA DE CLIENTE', pw - m - 45, sigY + 10, {align:'center'});

            // === PAGE 2: DETALLE ===
            doc.addPage();
            let dy = 20;
            doc.setFont('helvetica','bold');
            doc.setFontSize(12);
            doc.setTextColor(27,58,92);
            doc.text('Detalle del Reporte', m, dy);
            doc.setDrawColor(27,58,92);
            doc.setLineWidth(0.8);
            doc.line(m, dy + 2, pw - m, dy + 2);

            doc.setFontSize(8);
            doc.setTextColor(0,0,0);
            dy += 10;
            const metaLines = [
                `Nombre – ${data.userName}`,
                `Semana del – al – ${data.weekStart} al ${data.weekEnd}`,
                `Proyecto – ${data.projectName}`,
                `Cliente – ${data.clientName || 'N/A'}`,
                `Actividades – Actividades realizadas en el proyecto`
            ];
            metaLines.forEach(line => {
                if (dy > ph - 15) { doc.addPage(); dy = 20; }
                doc.setFont('helvetica','normal');
                doc.text(line, m, dy);
                dy += 6;
            });

            dy += 6;
            if (dy > ph - 20) { doc.addPage(); dy = 20; }
            doc.setFont('helvetica','bold');
            doc.setFontSize(10);
            doc.setTextColor(27,58,92);
            doc.text('Actividades Realizadas', m, dy);
            dy += 6;

            doc.setFontSize(8);
            doc.setTextColor(0,0,0);
            data.detailItems.forEach(item => {
                if (dy > ph - 20) { doc.addPage(); dy = 20; }
                doc.setFont('helvetica','bold');
                doc.text(`${item.dayName} ${item.date} — ${item.hours}h`, m, dy);
                dy += 4;
                doc.setFont('helvetica','normal');
                const lines = doc.splitTextToSize(item.detail || '', pw - 2*m - 10);
                lines.forEach(l => {
                    if (dy > ph - 15) { doc.addPage(); dy = 20; }
                    doc.text(l, m + 5, dy);
                    dy += 4;
                });
                dy += 3;
            });

            if (data.detailItems.length === 0) {
                doc.setFont('helvetica','italic');
                doc.text('No se registraron detalles de actividades.', m, dy);
            }

            // Save
            const fileName = `REPORTE_ACTIVIDADES_${data.userName.replace(/\s+/g,'_')}_${data.weekStart.replace(/\//g,'-')}.pdf`;
            doc.save(fileName);
            if (window.NotificationUtils) window.NotificationUtils.success('PDF generado: ' + fileName);
            if (typeof window.saveToReportHistory === 'function') {
                const recCount = data.detailItems ? data.detailItems.length : 0;
                const dRange = `${data.weekStart} al ${data.weekEnd}`;
                window.saveToReportHistory(fileName, 'reporte-actividades', data.totalHours, 0, recCount, dRange);
            }
        } catch (error) {
            console.error('Error generando PDF:', error);
            if (window.NotificationUtils) window.NotificationUtils.error('Error al generar PDF: ' + error.message);
        }
    }
    /**
     * Export to Excel using SheetJS
     */
    async exportExcel(timesheetId) {
        try {
            if (typeof XLSX === 'undefined') {
                if (window.NotificationUtils) window.NotificationUtils.error('Librería XLSX no disponible');
                return;
            }
            if (window.NotificationUtils) window.NotificationUtils.info('Generando Excel...', 2000);
            const data = await this.collectData(timesheetId);
            const wb = XLSX.utils.book_new();

            // === SHEET 1: REPORTE DE ACTIVIDADES ===
            const s1 = [];
            s1.push(['GRUPO IT ARVIC', '', '', '', 'REPORTE DE ACTIVIDADES', '', '', '']);
            s1.push([]);
            s1.push(['NOMBRE:', data.userName, '', '', 'SEMANA DEL', data.weekStart, 'al', data.weekEnd]);
            s1.push(['PROYECTO:', data.projectName, '', '', 'CLIENTE', data.clientName, '', '']);
            s1.push([]);
            s1.push(['Cliente', 'Modulo', 'Ticket', 'Fecha', 'ACTIVIDAD', 'DIAS', 'HORAS', 'LIDER']);
            data.rows.forEach(r => {
                s1.push([r.cliente, r.modulo, r.ticket, r.fecha, r.actividad, r.dias, r.horas, r.lider]);
            });
            // Remove fill empty rows logic
            // for (let i = data.rows.length; i < 20; i++) s1.push(['','','','','','','','']);
            s1.push(['', '', '', '', 'TOTAL DE HORAS', '', data.totalHours, '']);
            s1.push([]);
            s1.push([]);
            s1.push(['', data.userName, '', '', '', '', '', '']);
            s1.push(['', 'FIRMA DE CONSULTOR', '', '', '', 'NOMBRE Y FIRMA DE CLIENTE', '', '']);

            const ws1 = XLSX.utils.aoa_to_sheet(s1);
            // Set column widths
            ws1['!cols'] = [
                {wch:15},{wch:12},{wch:12},{wch:12},{wch:40},{wch:8},{wch:10},{wch:15}
            ];
            XLSX.utils.book_append_sheet(wb, ws1, 'REPORTE DE ACTIVIDADES');

            // === SHEET 2: DETALLE ===
            const s2 = [];
            s2.push(['Detalle del Reporte']);
            s2.push([]);
            s2.push(['Nombre', data.userName]);
            s2.push(['Semana del – al', `${data.weekStart} al ${data.weekEnd}`]);
            s2.push(['Proyecto', data.projectName]);
            s2.push(['Cliente', data.clientName || 'N/A']);
            s2.push([]);
            s2.push(['Actividades Realizadas']);
            s2.push(['Día', 'Fecha', 'Asignación', 'Detalle', 'Horas']);
            data.detailItems.forEach(item => {
                s2.push([item.dayName, item.date, item.assignment, item.detail, item.hours]);
            });
            if (data.detailItems.length === 0) {
                s2.push(['', '', '', 'No se registraron detalles', '']);
            }

            const ws2 = XLSX.utils.aoa_to_sheet(s2);
            ws2['!cols'] = [{wch:15},{wch:12},{wch:25},{wch:50},{wch:10}];
            XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');

            const fileName = `REPORTE_ACTIVIDADES_${data.userName.replace(/\s+/g,'_')}_${data.weekStart.replace(/\//g,'-')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            if (window.NotificationUtils) window.NotificationUtils.success('Excel generado: ' + fileName);
            if (typeof window.saveToReportHistory === 'function') {
                const recCount = data.detailItems ? data.detailItems.length : 0;
                const dRange = `${data.weekStart} al ${data.weekEnd}`;
                window.saveToReportHistory(fileName, 'reporte-actividades', data.totalHours, 0, recCount, dRange);
            }
        } catch (error) {
            console.error('Error generando Excel:', error);
            if (window.NotificationUtils) window.NotificationUtils.error('Error al generar Excel: ' + error.message);
        }
    }
}

// === GLOBAL INSTANCE ===
window.activityReportGen = new ActivityReportGenerator();

// === HELPER FUNCTIONS ===
window._arSwitchTab = function(tab, btn) {
    document.getElementById('arTabSheet1').style.display = tab === 'sheet1' ? '' : 'none';
    document.getElementById('arTabSheet2').style.display = tab === 'sheet2' ? '' : 'none';
    document.querySelectorAll('.ar-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window._arPrint = function() {
    document.getElementById('arTabSheet1').style.display = '';
    document.getElementById('arTabSheet2').style.display = '';
    window.print();
    setTimeout(() => {
        const activeTab = document.querySelector('.ar-tab-btn.active');
        if (activeTab) activeTab.click();
    }, 500);
};

window._arDownloadPDF = async function(timesheetId) {
    await window.activityReportGen.exportPDF(timesheetId);
};

window._arDownloadExcel = async function(timesheetId) {
    await window.activityReportGen.exportExcel(timesheetId);
};

window.openActivityReport = async function(timesheetId) {
    await window.activityReportGen.openPreview(timesheetId);
};

console.log('✅ Activity Report Generator loaded');

