/**
 * ==============================================================================
 * PORTAL ARVIC — MÓDULO DE CONCILIACIÓN FINANCIERA Y FACTURACIÓN (FASE 5)
 * Lógica modular para pre-facturas, cálculo de tarifas, congelación de periodos
 * y métricas de rentabilidad.
 * ==============================================================================
 */

class BillingModule {
    constructor() {
        this.currentPreview = null;
        this.activeTab = 'conciliacion'; // 'conciliacion' | 'historial'
        this.cachedCompanies = [];
    }

    /**
     * Helper para formatear fechas de forma segura sin desfase UTC
     */
    formatDateSafe(dateVal) {
        if (!dateVal) return '';
        if (typeof dateVal === 'string' && dateVal.includes('-')) {
            const parts = dateVal.split('T')[0].split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        const d = new Date(dateVal);
        return d.toLocaleDateString('es-MX', { timeZone: 'UTC' });
    }

    /**
     * Inicializar módulo y enlazar listeners
     */
    async init() {
        console.log('🏦 Inicializando Módulo de Facturación y Conciliación...');
        await this.populateCompanies();
        this.setupPeriodSelector();
        this.setupEventListeners();
        
        // Ejecutar conciliación inicial con la primera empresa y periodo actual
        setTimeout(() => {
            this.executeReconcilePreview();
            this.loadFinancialKPIsInDashboard();
        }, 300);
    }

    /**
     * Poblar selector de empresas
     */
    async populateCompanies() {
        try {
            const select = document.getElementById('billingCompanySelect');
            if (!select) return;

            let companies = [];
            if (window.PortalDB && typeof window.PortalDB.getCompanies === 'function') {
                companies = await window.PortalDB.getCompanies();
            } else if (window.currentData && window.currentData.companies) {
                companies = window.currentData.companies;
            }

            let companiesList = [];
            if (Array.isArray(companies)) {
                companiesList = companies;
            } else if (companies && typeof companies === 'object') {
                companiesList = Object.values(companies);
            }

            this.cachedCompanies = companiesList;
            select.innerHTML = '<option value="all">Todas las Empresas</option>';

            this.cachedCompanies.forEach(c => {
                if (!c) return;
                const opt = document.createElement('option');
                opt.value = c.companyId || c.id;
                opt.textContent = c.name || c.companyName || opt.value;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error('Error cargando empresas en facturación:', error);
        }
    }

    /**
     * Configurar selector rápido de periodo (Quincena 1, Quincena 2, Mes, Personalizado)
     */
    setupPeriodSelector() {
        const periodTypeSelect = document.getElementById('billingPeriodType');
        const startInput = document.getElementById('billingStartDate');
        const endInput = document.getElementById('billingEndDate');
        if (!periodTypeSelect || !startInput || !endInput) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        const day = now.getDate();

        // Determinar quincena actual por defecto
        if (day <= 15) {
            periodTypeSelect.value = 'q1';
            startInput.value = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            endInput.value = `${year}-${String(month + 1).padStart(2, '0')}-15`;
        } else {
            periodTypeSelect.value = 'q2';
            startInput.value = `${year}-${String(month + 1).padStart(2, '0')}-16`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            endInput.value = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
        }

        periodTypeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();

            if (val === 'q1') {
                startInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
                endInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`;
                startInput.disabled = true;
                endInput.disabled = true;
            } else if (val === 'q2') {
                startInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-16`;
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                endInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
                startInput.disabled = true;
                endInput.disabled = true;
            } else if (val === 'month') {
                startInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                endInput.value = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
                startInput.disabled = true;
                endInput.disabled = true;
            } else {
                startInput.disabled = false;
                endInput.disabled = false;
            }
        });
    }

    /**
     * Enlazar eventos de botones e interfaz
     */
    setupEventListeners() {
        const btnConciliar = document.getElementById('btnExecuteReconcile');
        if (btnConciliar) {
            btnConciliar.addEventListener('click', () => this.executeReconcilePreview());
        }

        const tabConciliar = document.getElementById('tabBillingConciliar');
        const tabHistorial = document.getElementById('tabBillingHistorial');
        if (tabConciliar && tabHistorial) {
            tabConciliar.addEventListener('click', () => this.switchTab('conciliacion'));
            tabHistorial.addEventListener('click', () => this.switchTab('historial'));
        }
    }

    /**
     * Cambiar entre pestañas
     */
    switchTab(tab) {
        this.activeTab = tab;
        const viewConciliar = document.getElementById('billingConciliarView');
        const viewHistorial = document.getElementById('billingHistorialView');
        const tabConciliar = document.getElementById('tabBillingConciliar');
        const tabHistorial = document.getElementById('tabBillingHistorial');

        if (tab === 'conciliacion') {
            if (viewConciliar) viewConciliar.style.display = 'block';
            if (viewHistorial) viewHistorial.style.display = 'none';
            if (tabConciliar) tabConciliar.classList.add('active');
            if (tabHistorial) tabHistorial.classList.remove('active');
        } else {
            if (viewConciliar) viewConciliar.style.display = 'none';
            if (viewHistorial) viewHistorial.style.display = 'block';
            if (tabConciliar) tabConciliar.classList.remove('active');
            if (tabHistorial) tabHistorial.classList.add('active');
            this.loadBillingHistory();
        }
    }

    /**
     * Ejecutar consulta de pre-conciliación en vivo
     */
    async executeReconcilePreview() {
        const companyId = document.getElementById('billingCompanySelect')?.value || 'all';
        const startDate = document.getElementById('billingStartDate')?.value;
        const endDate = document.getElementById('billingEndDate')?.value;
        const periodType = document.getElementById('billingPeriodType')?.value || 'custom';

        if (!startDate || !endDate) {
            if (window.toastSystem) window.toastSystem.show('Selecciona un rango de fechas válido', 'warning');
            return;
        }

        const btn = document.getElementById('btnExecuteReconcile');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conciliando...';
            btn.disabled = true;
        }

        try {
            const data = await window.PortalDB.reconcileBillingPreview({
                companyId,
                startDate,
                endDate,
                periodType
            });

            this.currentPreview = data;
            this.renderPreview(data);

            if (window.toastSystem) {
                window.toastSystem.show(`Conciliación calculada: ${data.items.length} reportes procesados`, 'success');
            }
        } catch (error) {
            console.error('Error al conciliar:', error);
            if (window.toastSystem) window.toastSystem.show(error.message || 'Error al conciliar', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-calculator"></i> Conciliar Periodo';
                btn.disabled = false;
            }
        }
    }

    /**
     * Renderizar datos de la pre-factura en la interfaz
     */
    renderPreview(data) {
        // 1. Actualizar tarjetas KPI
        const elHours = document.getElementById('kpiBillingHours');
        const elClient = document.getElementById('kpiBillingTotalClient');
        const elConsultant = document.getElementById('kpiBillingTotalConsultant');
        const elMargin = document.getElementById('kpiBillingGrossMargin');

        if (elHours) elHours.textContent = `${data.totalHours || 0} hrs`;
        if (elClient) elClient.textContent = `$ ${(data.totalClient || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (elConsultant) elConsultant.textContent = `$ ${(data.totalConsultant || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (elMargin) {
            elMargin.textContent = `$ ${(data.grossMargin || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${data.marginPercentage || 0}%)`;
        }

        // 2. Metadatos de la cabecera
        const titleEl = document.getElementById('billingPreviewTitle');
        const subEl = document.getElementById('billingPreviewSubtitle');
        if (titleEl) {
            titleEl.textContent = `Pre-Factura: ${data.companyName || 'Todas las Empresas'}`;
        }
        if (subEl) {
            const d1 = this.formatDateSafe(data.startDate);
            const d2 = this.formatDateSafe(data.endDate);
            subEl.textContent = `Periodo del ${d1} al ${d2} • ${data.items.length} registros aprobados`;
        }

        // 3. Tabla de desglose de items
        const tbody = document.getElementById('billingItemsTableBody');
        if (!tbody) return;

        if (!data.items || data.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 30px; color: #64748b;">
                        <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        No se encontraron reportes aprobados en este periodo para la empresa seleccionada.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = data.items.map(it => {
                const dateStr = this.formatDateSafe(it.date);
                const badgeClass = it.periodLocked ? 'congelado' : 'conciliado';
                const badgeText = it.periodLocked ? 'Bloqueado' : (it.billingStatus || 'Pendiente');

                return `
                    <tr>
                        <td><strong>${dateStr}</strong></td>
                        <td><strong>${it.consultorNombre || it.consultorId}</strong></td>
                        <td>${it.projectName || it.supportName || 'Asignación'}</td>
                        <td><span class="badge" style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; white-space:nowrap;" title="${it.moduleName || it.moduleId}">${it.moduleName || it.moduleId}</span></td>
                        <td style="color:#64748b;"><small style="font-size:0.82rem;">${it.ticket || it.description || '-'}</small></td>
                        <td class="text-right"><strong>${it.hours}</strong></td>
                        <td class="text-right">$ ${Number(it.rateClient).toFixed(2)}</td>
                        <td class="text-right highlight-cell">$ ${Number(it.amountClient).toFixed(2)}</td>
                        <td class="text-right" style="color:#10b981; font-weight:600;">$ ${Number(it.margin).toFixed(2)}</td>
                        <td class="text-center">
                            <span class="billing-badge ${badgeClass}" style="white-space:nowrap;" title="${it.periodLocked ? 'Bloqueado contra modificaciones' : badgeText}">
                                ${it.periodLocked ? '<i class="fa-solid fa-lock"></i>' : ''} ${badgeText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 4. Panel de Totales
        const elSubtotal = document.getElementById('billingTotalSubtotal');
        const elIva = document.getElementById('billingTotalIva');
        const elGrandTotal = document.getElementById('billingTotalGrand');
        const elProfit = document.getElementById('billingTotalProfit');

        if (elSubtotal) elSubtotal.textContent = `$ ${(data.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (elIva) elIva.textContent = `$ ${(data.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (elGrandTotal) elGrandTotal.textContent = `$ ${(data.totalWithIva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        if (elProfit) elProfit.textContent = `$ ${(data.grossMargin || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${data.marginPercentage || 0}%)`;
    }

    /**
     * Modal de Confirmación para Cerrar y Congelar Periodo
     */
    openFreezeModal() {
        if (!this.currentPreview || !this.currentPreview.items || this.currentPreview.items.length === 0) {
            if (window.toastSystem) window.toastSystem.show('No hay horas para congelar en este periodo', 'warning');
            return;
        }

        if (this.currentPreview.companyId === 'all') {
            if (window.toastSystem) window.toastSystem.show('Para cerrar un periodo oficial, debes seleccionar una Empresa específica', 'warning');
            return;
        }

        const modal = document.getElementById('billingFreezeModal');
        const desc = document.getElementById('billingFreezeModalDesc');
        if (desc) {
            desc.innerHTML = `Estás a punto de congelar el periodo para <strong>${this.currentPreview.companyName}</strong> con un total de <strong>${this.currentPreview.totalHours} horas</strong> aprobadas ($ ${(this.currentPreview.totalClient).toLocaleString('es-MX', { minimumFractionDigits: 2 })}).`;
        }

        if (modal) modal.style.display = 'flex';
    }

    closeFreezeModal() {
        const modal = document.getElementById('billingFreezeModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Confirmar y guardar Cierre de Periodo
     */
    async confirmFreezePeriod() {
        if (!this.currentPreview) return;

        const btn = document.getElementById('btnConfirmFreezePeriod');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Congelando...';
            btn.disabled = true;
        }

        try {
            let pType = this.currentPreview.periodType || 'quincenal';
            if (pType === 'month') pType = 'mensual';
            if (pType === 'q1' || pType === 'q2') pType = 'quincenal';

            const payload = {
                ...this.currentPreview,
                periodType: pType,
                status: 'Cerrado'
            };

            const created = await window.PortalDB.createBillingPeriod(payload);
            this.closeFreezeModal();

            if (window.toastSystem) {
                window.toastSystem.show(`Periodo ${created.periodId} cerrado y congelado exitosamente.`, 'success');
            }

            // Recargar datos
            await this.executeReconcilePreview();
            this.loadFinancialKPIsInDashboard();
        } catch (error) {
            console.error('Error al congelar periodo:', error);
            if (window.toastSystem) window.toastSystem.show(error.message || 'Error al congelar periodo', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-lock"></i> Sí, Cerrar y Congelar';
                btn.disabled = false;
            }
        }
    }

    /**
     * Cargar Historial de Periodos Cerrados / Facturados
     */
    async loadBillingHistory() {
        const tbody = document.getElementById('billingHistoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 25px; color: #64748b;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial de periodos...
                </td>
            </tr>
        `;

        try {
            const periods = await window.PortalDB.getBillingPeriods();

            if (!periods || periods.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">
                            <i class="fa-solid fa-clock-rotate-left" style="font-size: 2rem; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                            Aún no se han cerrado ni registrado periodos de facturación.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = periods.map(p => {
                const d1 = this.formatDateSafe(p.startDate);
                const d2 = this.formatDateSafe(p.endDate);
                const badgeClass = p.status.toLowerCase();

                return `
                    <tr>
                        <td><strong>${p.periodId}</strong></td>
                        <td><div class="cell-ellipsis" title="${p.companyName}">${p.companyName}</div></td>
                        <td><div class="cell-ellipsis" title="${p.periodName}">${p.periodName}</div></td>
                        <td><small>${d1} al ${d2}</small></td>
                        <td class="text-right"><strong>${p.totalHours} hrs</strong></td>
                        <td class="text-right highlight-cell">$ ${(p.totalClient || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td class="text-right" style="color:#10b981; font-weight:600;">$ ${(p.grossMargin || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td class="text-center">
                            <span class="billing-badge ${badgeClass}" style="padding: 2px 6px; font-size: 0.68rem;">${p.status}</span>
                        </td>
                        <td class="text-center">
                            <a href="${window.PortalDB.getBillingExcelUrl(p.periodId)}" target="_blank" class="btn-billing-action btn-billing-excel" style="padding: 3px 8px; font-size: 0.72rem;" title="Descargar Excel">
                                <i class="fa-solid fa-file-excel"></i> Excel
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error cargando historial de periodos:', error);
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:20px;">Error al cargar historial</td></tr>`;
        }
    }

    /**
     * Descargar Excel del periodo actual
     */
    async downloadCurrentExcel() {
        if (!this.currentPreview || !this.currentPreview.items || this.currentPreview.items.length === 0) {
            if (window.toastSystem) window.toastSystem.show('No hay datos en el periodo para exportar a Excel', 'warning');
            return;
        }

        try {
            // Guardar corte preliminar o usar periodo existente
            let periodId = this.currentPreview.periodId;
            if (!periodId) {
                if (window.toastSystem) window.toastSystem.show('Generando archivo Excel corporativo...', 'info');
                let pType = this.currentPreview.periodType || 'quincenal';
                if (pType === 'month') pType = 'mensual';
                if (pType === 'q1' || pType === 'q2') pType = 'quincenal';

                const created = await window.PortalDB.createBillingPeriod({
                    ...this.currentPreview,
                    periodType: pType,
                    status: 'Conciliado'
                });
                periodId = created.periodId;
                this.currentPreview.periodId = periodId;
            }

            const downloadUrl = window.PortalDB.getBillingExcelUrl(periodId);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Corte_${periodId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exportando Excel:', error);
            if (window.toastSystem) window.toastSystem.show('Error al exportar Excel', 'error');
        }
    }

    /**
     * Cargar el logo institucional de ARVIC para el PDF (prioriza SVG blanco corporativo, fallback a PNG)
     */
    async getLogoBase64() {
        if (this._cachedLogo) return this._cachedLogo;

        return new Promise((resolve) => {
            const imgSvg = new Image();
            imgSvg.crossOrigin = 'anonymous';
            imgSvg.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1017;
                    canvas.height = 370;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgSvg, 0, 0, 1017, 370);
                    const dataUrl = canvas.toDataURL('image/png');
                    this._cachedLogo = { data: dataUrl, isWhite: true };
                    resolve(this._cachedLogo);
                } catch (e) {
                    this._fallbackPngLogo(resolve);
                }
            };
            imgSvg.onerror = () => {
                this._fallbackPngLogo(resolve);
            };
            imgSvg.src = '../images/Logo Grupo IT Arvic 33.svg';
        });
    }

    _fallbackPngLogo(resolve) {
        const pngImg = new Image();
        pngImg.crossOrigin = 'anonymous';
        pngImg.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = pngImg.naturalWidth || 1017;
                canvas.height = pngImg.naturalHeight || 370;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(pngImg, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                this._cachedLogo = { data: dataUrl, isWhite: false };
                resolve(this._cachedLogo);
            } catch (e) {
                resolve(null);
            }
        };
        pngImg.onerror = () => resolve(null);
        pngImg.src = '../images/Logo-Grupo-IT-Arvic-22.png';
    }

    /**
     * Generar Pre-Factura en PDF con jsPDF y diseño institucional ARVIC
     */
    async downloadCurrentPDF() {
        if (!this.currentPreview || !this.currentPreview.items || this.currentPreview.items.length === 0) {
            if (window.toastSystem) window.toastSystem.show('No hay datos para generar el PDF', 'warning');
            return;
        }

        try {
            if (typeof window.jspdf === 'undefined') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (typeof (window.jspdf?.jsPDF?.API?.autoTable || window.jsPDF?.API?.autoTable) !== 'function') {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const data = this.currentPreview;
            const d1 = this.formatDateSafe(data.startDate);
            const d2 = this.formatDateSafe(data.endDate);

            // 1. Obtener logo institucional ARVIC
            const logo = await this.getLogoBase64();

            // 2. Encabezado Corporativo ARVIC (Banda azul marino de 32mm)
            doc.setFillColor(27, 58, 92); // #1B3A5C
            doc.rect(0, 0, 210, 32, 'F');

            // Franja decorativa inferior azul cian (#0284C7)
            doc.setFillColor(2, 132, 199);
            doc.rect(0, 31.2, 210, 0.8, 'F');

            // 3. Colocación y alineación del Logo a la izquierda
            let textStartX = 14;
            if (logo && logo.data) {
                if (logo.isWhite) {
                    // Logo vectorial blanco: directo sobre fondo marino
                    doc.addImage(logo.data, 'PNG', 14, 6.5, 44, 16);
                } else {
                    // Logo con fondo oscuro: dentro de cápsula blanca estilizada
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(13, 5.5, 48, 19, 2, 2, 'F');
                    doc.addImage(logo.data, 'PNG', 14.5, 7, 45, 16);
                }
                textStartX = 64;
            }

            // 4. Títulos y datos institucionales
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

            // Metadatos de emisión a la derecha (x = 196)
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 196, 12, { align: 'right' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(224, 242, 254);
            doc.text(`Folio: ${data.periodId || 'PRE-CONCIL'}`, 196, 18, { align: 'right' });

            doc.setFontSize(7.5);
            doc.setTextColor(186, 230, 253);
            doc.text(`Periodo: ${data.periodName || 'Quincenal'}`, 196, 23.5, { align: 'right' });

            // 5. Tarjeta elegante de Datos del Receptor / Cliente
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
            doc.text(`Empresa: ${data.companyName || 'Todas las Empresas'}`, 18, 50);
            doc.text(`RFC: ${data.rfc || 'XEXX010101000'}`, 18, 56);

            doc.text(`Rango: ${d1} al ${d2}`, 110, 50);
            doc.text(`Moneda: MXN (Pesos Mexicanos)`, 110, 56);

            // 6. Tabla de Actividades y Tickets
            const tableRows = data.items.map(it => [
                this.formatDateSafe(it.date),
                it.consultorNombre,
                it.projectName || it.supportName || 'General',
                it.moduleName || it.moduleId,
                it.ticket || '-',
                it.hours,
                `$ ${Number(it.rateClient).toFixed(2)}`,
                `$ ${Number(it.amountClient).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: 68,
                head: [['Fecha', 'Consultor', 'Proyecto/Soporte', 'Módulo', 'Ticket', 'Horas', 'Tarifa', 'Subtotal']],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [27, 58, 92], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    5: { halign: 'right' },
                    6: { halign: 'right' },
                    7: { halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 }
            });

            // 7. Resumen de Totales
            const finalY = doc.lastAutoTable.finalY + 8;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(120, finalY, 76, 36, 2, 2, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(120, finalY, 76, 36, 2, 2, 'S');

            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(`Total Horas Aprobadas:`, 124, finalY + 8);
            doc.text(`${data.totalHours} hrs`, 190, finalY + 8, { align: 'right' });

            doc.text(`Subtotal Facturable:`, 124, finalY + 16);
            doc.text(`$ ${(data.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, finalY + 16, { align: 'right' });

            doc.text(`IVA (16%):`, 124, finalY + 24);
            doc.text(`$ ${(data.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, finalY + 24, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(27, 58, 92);
            doc.text(`TOTAL FACTURABLE:`, 124, finalY + 32);
            doc.text(`$ ${(data.totalWithIva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 190, finalY + 32, { align: 'right' });

            // 8. Firmas de Aceptación
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

            doc.save(`PreFactura_${data.companyId || 'ARVIC'}_${d1.replace(/\//g, '-')}.pdf`);
            if (window.toastSystem) window.toastSystem.show('PDF de Pre-Factura generado exitosamente', 'success');
        } catch (error) {
            console.error('Error generando PDF:', error);
        }
    }

    /**
     * Cargar script de forma dinámica
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Cargar Métricas y KPIs Financieros en el Panel General de Administración
     */
    async loadFinancialKPIsInDashboard() {
        try {
            const metrics = await window.PortalDB.getBillingMetrics();
            if (!metrics) return;

            // Tarjetas del Panel General
            const elFacturable = document.getElementById('statFacturacionProyectada');
            const elMargen = document.getElementById('statMargenBrutoGlobal');
            const elHorasBloqueadas = document.getElementById('statHorasFacturadas');

            if (elFacturable) {
                elFacturable.textContent = `$ ${(metrics.financials?.totalBilled || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
            }
            if (elMargen) {
                elMargen.textContent = `$ ${(metrics.financials?.grossMargin || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${metrics.financials?.marginPercentage || 0}%)`;
            }
            if (elHorasBloqueadas) {
                elHorasBloqueadas.textContent = `${metrics.hours?.locked || 0} hrs`;
            }

            // Renderizar mini gráfico de tendencia mensual si existe contenedor
            const chartContainer = document.getElementById('dashboardMonthlyBillingChart');
            if (chartContainer && metrics.monthlyTrend && metrics.monthlyTrend.length > 0) {
                const maxVal = Math.max(...metrics.monthlyTrend.map(m => m.billed), 1);
                chartContainer.innerHTML = `
                    <div class="billing-bars-container">
                        ${metrics.monthlyTrend.map(m => {
                            const pct = Math.round((m.billed / maxVal) * 100);
                            return `
                                <div class="billing-bar-col" title="${m.month}: $ ${m.billed.toLocaleString()} (${m.hours} hrs)">
                                    <div class="billing-bar-fill" style="height: ${Math.max(pct, 8)}%;"></div>
                                    <span class="billing-bar-label">${m.month.split('-')[1]}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando KPIs financieros en dashboard:', error);
        }
    }
}

// Instanciar globalmente
window.billingModule = new BillingModule();
