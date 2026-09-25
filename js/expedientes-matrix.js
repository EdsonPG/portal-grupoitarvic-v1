/**
 * === EXPEDIENTES MATRIX (ADMIN A-06) ===
 * Matriz semáforo de consultores × documentos, revisión, fijación de vigencias y habilitación fiscal
 */

window.ExpedientesMatrix = {
    matrixData: [],
    selectedDoc: null,

    async init() {
        await this.loadMatrix();
    },

    async loadMatrix() {
        const tbody = document.getElementById('expedientesMatrixBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="11" class="empty-cell"><i class="fa-solid fa-spinner fa-spin"></i> Cargando matriz de expedientes y vigencias...</td></tr>';

        try {
            const res = await window.PortalDB.getExpedientesMatrix();
            if (res.success && res.data) {
                this.matrixData = res.data;
                this.renderTable();
            } else {
                tbody.innerHTML = '<tr><td colspan="11" class="empty-cell" style="color:#ef4444;">Error al cargar datos de expedientes</td></tr>';
            }
        } catch (error) {
            console.error('Error cargando matriz de expedientes:', error);
            tbody.innerHTML = '<tr><td colspan="11" class="empty-cell" style="color:#ef4444;">Error de conexión con el servidor</td></tr>';
        }
    },

    renderTable() {
        const tbody = document.getElementById('expedientesMatrixBody');
        if (!tbody) return;

        if (!this.matrixData || this.matrixData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">No se encontraron consultores registrados</td></tr>';
            return;
        }

        const docTypes = [
            { key: 'ine', title: 'INE / Identificación' },
            { key: 'curp', title: 'CURP' },
            { key: 'csf', title: 'Constancia SAT (CSF)' },
            { key: 'domicilio', title: 'Comprobante Domicilio' },
            { key: 'cv', title: 'CV y Certificaciones' },
            { key: 'caratula_bancaria', title: 'Carátula Bancaria' },
            { key: 'opinion_32d', title: 'Opinión 32-D SAT' },
            { key: 'contrato_arvic', title: 'Contrato Arvic' }
        ];

        tbody.innerHTML = this.matrixData.map(item => {
            const user = item.user;
            const summary = item.summary || {};
            const docs = item.docs || {};

            const docCells = docTypes.map(dt => {
                const doc = docs[dt.key] || { status: 'faltante' };
                const dotClass = `dot-${doc.status || 'faltante'}`;
                const titleText = `${dt.title}: ${this.getStatusLabel(doc.status)}${doc.validUntil ? ' (Vence: ' + new Date(doc.validUntil).toLocaleDateString('es-MX') + ')' : ''}`;
                
                return `
                    <td style="text-align: center; cursor: pointer;" title="${titleText}" onclick="window.ExpedientesMatrix.openReviewModal('${user.userId}', '${this.escapeHtml(user.name)}', '${dt.key}', '${dt.title}')">
                        <span class="matrix-status-dot ${dotClass}"></span>
                    </td>
                `;
            }).join('');

            const canInvoiceBadge = summary.canInvoice
                ? `<span class="doc-status-badge status-vigente"><i class="fa-solid fa-circle-check"></i> Habilitado</span>`
                : `<span class="doc-status-badge status-rechazado" title="${summary.faltantesCount} faltantes, ${summary.vencidosCount} vencidos"><i class="fa-solid fa-lock"></i> Bloqueado</span>`;

            return `
                <tr>
                    <td>
                        <strong>${this.escapeHtml(user.name)}</strong>
                        <div style="font-size: 0.78rem; color: #64748b;">${this.escapeHtml(user.email || user.userId)}</div>
                    </td>
                    ${docCells}
                    <td style="text-align: center;">${canInvoiceBadge}</td>
                    <td style="text-align: center;">
                        <button class="doc-action-btn primary" onclick="window.ExpedientesMatrix.openConsultorFullExpediente('${user.userId}', '${this.escapeHtml(user.name)}')">
                            <i class="fa-solid fa-folder-open"></i> Ver
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    getStatusLabel(status) {
        const labels = {
            vigente: 'Vigente',
            por_vencer: 'Próximo a Vencer',
            vencido: 'Vencido',
            en_revision: 'En Revisión',
            rechazado: 'Rechazado',
            faltante: 'Faltante'
        };
        return labels[status] || 'Faltante';
    },

    openDocReviewModal(docId, docTitle, userId, userName, docType) {
        return this.openReviewModal(userId, userName, docType || docTitle, docTitle);
    },

    async openReviewModal(userId, userName, docType, docTitle) {
        try {
            const expRes = await window.PortalDB.getExpediente('consultor', userId);
            if (!expRes.success) {
                alert('No se pudo cargar el expediente');
                return;
            }

            const checkItem = expRes.data?.checklist?.find(c => c.documentType === docType);
            const doc = checkItem?.doc;

            // Calcular fecha de 1 año a partir de hoy por defecto
            const defaultValidUntil = new Date();
            defaultValidUntil.setFullYear(defaultValidUntil.getFullYear() + 1);
            const defaultDateStr = defaultValidUntil.toISOString().split('T')[0];

            const currentValidStr = doc?.validUntil ? new Date(doc.validUntil).toISOString().split('T')[0] : defaultDateStr;

            const modalHTML = `
                <div class="modal" id="reviewDocModal" style="display:flex; z-index:9999;">
                    <div class="modal-content" style="max-width: 650px;">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                <i class="fa-solid fa-clipboard-check"></i> Revisión de Documento
                            </h2>
                            <button class="close" onclick="window.ExpedientesMatrix.closeReviewModal()">&times;</button>
                        </div>

                        <div class="modal-body">
                            <div style="background:#f8fafc; border-radius:8px; padding:14px; margin-bottom:16px;">
                                <p style="margin:0 0 6px 0;"><strong>Consultor:</strong> ${this.escapeHtml(userName)}</p>
                                <p style="margin:0 0 6px 0;"><strong>Documento:</strong> ${this.escapeHtml(docTitle)}</p>
                                <p style="margin:0;"><strong>Estado Actual:</strong> <span class="doc-status-badge status-${doc?.status || 'faltante'}">${this.getStatusLabel(doc?.status)}</span></p>
                            </div>

                            ${doc?.fileData ? `
                                <div style="margin-bottom:16px; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <i class="fa-solid fa-file-pdf" style="color:#ef4444; font-size:1.4rem;"></i>
                                        <span style="font-weight:600; margin-left:8px;">${this.escapeHtml(doc.fileName || 'Documento adjunto')}</span>
                                    </div>
                                    <button type="button" class="doc-action-btn primary" onclick="window.ExpedientesMatrix.previewSelectedDoc('${doc.docId}')">
                                        <i class="fa-solid fa-eye"></i> Visualizar Archivo
                                    </button>
                                </div>
                            ` : `
                                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px 14px; margin-bottom:16px; color:#92400e; font-size:0.88rem;">
                                    <i class="fa-solid fa-circle-exclamation"></i> El consultor aún no ha subido este documento o está pendiente.
                                </div>
                            `}

                            <form id="reviewDocForm" onsubmit="window.ExpedientesMatrix.submitReview(event, '${doc?.docId || ''}', '${userId}', '${docType}')">
                                <div class="form-group">
                                    <label><strong>Resolución de Aprobación *</strong></label>
                                    <div style="display:flex; gap:20px; margin-top:6px;">
                                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                            <input type="radio" name="reviewStatus" value="vigente" ${doc?.status === 'vigente' || !doc?.status || doc?.status === 'en_revision' ? 'checked' : ''} onchange="window.ExpedientesMatrix.toggleRejectionReason(false)">
                                            <span style="color:#15803d; font-weight:600;">✓ Aprobar (Vigente)</span>
                                        </label>
                                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                            <input type="radio" name="reviewStatus" value="rechazado" ${doc?.status === 'rechazado' ? 'checked' : ''} onchange="window.ExpedientesMatrix.toggleRejectionReason(true)">
                                            <span style="color:#b91c1c; font-weight:600;">✗ Rechazar</span>
                                        </label>
                                    </div>
                                </div>

                                <div id="vigenciaSection" class="form-group" style="margin-top:14px;">
                                    <label for="reviewValidUntil"><strong>Vigencia del Documento *</strong></label>
                                    <p style="font-size:0.8rem; color:#64748b; margin:2px 0 8px 0;">Por defecto se asigna 1 año a partir de hoy. Puedes ajustar la fecha si el documento tiene una vigencia distinta.</p>
                                    <input type="date" id="reviewValidUntil" value="${currentValidStr}" required style="padding:8px 12px; border:1.5px solid #cbd5e1; border-radius:6px; font-size:0.9rem;">
                                </div>

                                <div id="rejectionReasonSection" class="form-group" style="display:${doc?.status === 'rechazado' ? 'block' : 'none'}; margin-top:14px;">
                                    <label for="reviewRejectionReason"><strong>Motivo de Rechazo *</strong></label>
                                    <textarea id="reviewRejectionReason" placeholder="Indica al consultor por qué se rechaza el documento (ej. archivo borroso, fecha caducada, falta firma)..." rows="3" style="width:100%; padding:10px; border:1.5px solid #cbd5e1; border-radius:6px;"></textarea>
                                </div>

                                <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px;">
                                    <button type="button" class="btn btn-secondary" onclick="window.ExpedientesMatrix.closeReviewModal()">Cancelar</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fa-solid fa-floppy-disk"></i> Guardar Resolución
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            this.closeReviewModal();
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            this.selectedDoc = doc;
        } catch (err) {
            console.error('Error al abrir modal de revisión:', err);
        }
    },

    toggleRejectionReason(show) {
        const rejSec = document.getElementById('rejectionReasonSection');
        const vigSec = document.getElementById('vigenciaSection');
        if (rejSec) rejSec.style.display = show ? 'block' : 'none';
        if (vigSec) vigSec.style.display = show ? 'none' : 'block';
    },

    previewSelectedDoc() {
        const doc = this.selectedDoc;
        if (!doc || !doc.fileData) {
            alert('No hay archivo disponible para previsualizar');
            return;
        }

        const win = window.open();
        if (win) {
            if (doc.mimeType === 'application/pdf' || doc.fileData.startsWith('data:application/pdf')) {
                win.document.write(`<iframe src="${doc.fileData}" style="width:100%; height:100%; border:none;"></iframe>`);
            } else {
                win.document.write(`<img src="${doc.fileData}" style="max-width:100%; height:auto; display:block; margin:20px auto;">`);
            }
        }
    },

    async submitReview(e, docId, userId, docType) {
        e.preventDefault();
        const status = document.querySelector('input[name="reviewStatus"]:checked')?.value || 'vigente';
        const validUntil = document.getElementById('reviewValidUntil')?.value;
        const rejectionReason = document.getElementById('reviewRejectionReason')?.value.trim();

        if (status === 'rechazado' && !rejectionReason) {
            alert('Por favor indica el motivo del rechazo para orientar al consultor');
            return;
        }

        try {
            // Si el documento aún no tenía registro, asegurar upload previo
            let targetDocId = docId;
            if (!targetDocId) {
                const uploadRes = await window.PortalDB.uploadExpedienteDoc({
                    entityType: 'consultor',
                    entityId: userId,
                    documentType: docType,
                    documentTitle: docType,
                    fileName: 'Registro manual admin'
                });
                if (uploadRes.success && uploadRes.data) {
                    targetDocId = uploadRes.data.docId;
                }
            }

            const res = await window.PortalDB.reviewExpedienteDoc(targetDocId, {
                status,
                validUntil: status === 'vigente' ? validUntil : undefined,
                rejectionReason: status === 'rechazado' ? rejectionReason : undefined
            });

            if (res.success) {
                if (window.NotificationUtils) {
                    window.NotificationUtils.success('Resolución de expediente guardada correctamente');
                } else {
                    alert('Resolución guardada correctamente');
                }
                this.closeReviewModal();
                await this.loadMatrix();
            } else {
                alert(res.message || 'Error al guardar revisión');
            }
        } catch (error) {
            console.error('Error al guardar revisión:', error);
            alert('Error al procesar la resolución');
        }
    },

    closeReviewModal() {
        const modal = document.getElementById('reviewDocModal');
        if (modal) modal.remove();
        this.selectedDoc = null;
    },

    async openConsultorFullExpediente(userId, userName) {
        // En lugar de modal emergente, navegar a la pestaña completa del workspace
        if (window.AccountWorkspace) {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.sidebar-menu-item').forEach(m => m.classList.remove('active'));

            const section = document.getElementById('mi-cuenta-section');
            if (section) {
                section.classList.add('active');
                await window.AccountWorkspace.render('accountWorkspaceRoot', 'expedientes', userId, { isReadOnlyData: true });
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },

    escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m]);
    }
};

window.loadExpedientesMatrix = function() {
    window.ExpedientesMatrix.loadMatrix();
};
