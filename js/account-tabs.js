/**
 * === ACCOUNT WORKSPACE MODULE ===
 * Componente modular de Mi Cuenta & Expediente Digital
 * Estilo Hub con pestañas principales: Datos y Expedientes
 * Soporta registro y edición de Empresas en vista completa tipo pestaña,
 * autolectura CSF, validación de RFC y Razón Social, catálogo SAT de Regímenes y autocompletado por C.P.
 */

window.AccountWorkspace = (function() {
    let currentTargetUserId = null;
    let currentTargetUser = null;
    let currentTargetExpediente = null;
    let isAdminView = false;
    let isReadOnlyMode = false;
    let isNewCompanyMode = false;
    let pendingCsfFile = null;
    let activeTab = 'datos';

    // Catálogo de estados de México por prefijo de Código Postal (2 dígitos iniciales)
    const MEX_CP_PREFIX_STATES = {
        '01': 'Ciudad de México', '02': 'Ciudad de México', '03': 'Ciudad de México', '04': 'Ciudad de México',
        '05': 'Ciudad de México', '06': 'Ciudad de México', '07': 'Ciudad de México', '08': 'Ciudad de México',
        '09': 'Ciudad de México', '10': 'Ciudad de México', '11': 'Ciudad de México', '12': 'Ciudad de México',
        '13': 'Ciudad de México', '14': 'Ciudad de México', '15': 'Ciudad de México', '16': 'Ciudad de México',
        '20': 'Aguascalientes',
        '21': 'Baja California', '22': 'Baja California',
        '23': 'Baja California Sur',
        '24': 'Campeche',
        '25': 'Coahuila', '26': 'Coahuila', '27': 'Coahuila',
        '28': 'Colima',
        '29': 'Chiapas', '30': 'Chiapas',
        '31': 'Chihuahua', '32': 'Chihuahua', '33': 'Chihuahua',
        '34': 'Durango', '35': 'Durango',
        '36': 'Guanajuato', '37': 'Guanajuato', '38': 'Guanajuato',
        '39': 'Guerrero', '40': 'Guerrero', '41': 'Guerrero',
        '42': 'Hidalgo', '43': 'Hidalgo',
        '44': 'Jalisco', '45': 'Jalisco', '46': 'Jalisco', '47': 'Jalisco', '48': 'Jalisco', '49': 'Jalisco',
        '50': 'Estado de México', '51': 'Estado de México', '52': 'Estado de México', '53': 'Estado de México',
        '54': 'Estado de México', '55': 'Estado de México', '56': 'Estado de México', '57': 'Estado de México',
        '58': 'Michoacán', '59': 'Michoacán', '60': 'Michoacán', '61': 'Michoacán',
        '62': 'Morelos',
        '63': 'Nayarit',
        '64': 'Nuevo León', '65': 'Nuevo León', '66': 'Nuevo León', '67': 'Nuevo León',
        '68': 'Oaxaca', '69': 'Oaxaca', '70': 'Oaxaca', '71': 'Oaxaca',
        '72': 'Puebla', '73': 'Puebla', '74': 'Puebla', '75': 'Puebla',
        '76': 'Querétaro',
        '77': 'Quintana Roo',
        '78': 'San Luis Potosí', '79': 'San Luis Potosí',
        '80': 'Sinaloa', '81': 'Sinaloa', '82': 'Sinaloa',
        '83': 'Sonora', '84': 'Sonora', '85': 'Sonora',
        '86': 'Tabasco',
        '87': 'Tamaulipas', '88': 'Tamaulipas', '89': 'Tamaulipas',
        '90': 'Tlaxcala',
        '91': 'Veracruz', '92': 'Veracruz', '93': 'Veracruz', '94': 'Veracruz', '95': 'Veracruz', '96': 'Veracruz',
        '97': 'Yucatán',
        '98': 'Zacatecas', '99': 'Zacatecas'
    };

    let currentEntityType = 'consultor';

    // Validación oficial SAT de RFC (Moral 12 caracteres, Física 13 caracteres)
    function validateRFC(rfc) {
        if (!rfc) return { valid: false, message: 'El RFC es requerido' };
        const cleanRfc = rfc.trim().toUpperCase();
        const regexMoral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
        const regexFisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

        if (cleanRfc.length === 12) {
            if (!regexMoral.test(cleanRfc)) {
                return { valid: false, type: 'moral', message: 'RFC de Persona Moral inválido o inexistente ante el SAT' };
            }
            const mm = parseInt(cleanRfc.substr(5, 2), 10);
            const dd = parseInt(cleanRfc.substr(7, 2), 10);
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
                return { valid: false, type: 'moral', message: 'Fecha embebida en el RFC de empresa inválida' };
            }
            return { valid: true, type: 'moral', message: 'RFC de Persona Moral válido ante el SAT' };
        } else if (cleanRfc.length === 13) {
            if (!regexFisica.test(cleanRfc)) {
                return { valid: false, type: 'fisica', message: 'RFC de Persona Física inválido o inexistente ante el SAT' };
            }
            const mm = parseInt(cleanRfc.substr(6, 2), 10);
            const dd = parseInt(cleanRfc.substr(8, 2), 10);
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
                return { valid: false, type: 'fisica', message: 'Fecha embebida en el RFC inválida' };
            }
            return { valid: true, type: 'fisica', message: 'RFC de Persona Física válido ante el SAT' };
        } else {
            return { valid: false, message: `Longitud de RFC inválida (${cleanRfc.length}/12 caracteres para Empresa)` };
        }
    }


    function onRfcInput(value) {
        const input = document.getElementById('acc_comp_rfc') || document.getElementById('acc_rfc');
        const feedback = document.getElementById('rfc_validation_feedback');
        if (!input) return;

        input.value = (value || '').toUpperCase();
        const trimmed = input.value.trim();

        if (!trimmed) {
            input.classList.remove('is-valid', 'is-invalid');
            if (feedback) feedback.style.display = 'none';
            return;
        }

        const res = validateRFC(trimmed);
        if (feedback) {
            feedback.style.display = 'flex';
            if (res.valid) {
                feedback.className = 'field-validation-feedback valid';
                feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message}`;
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            } else {
                feedback.className = 'field-validation-feedback invalid';
                feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${res.message}`;
                input.classList.remove('is-valid');
                input.classList.add('is-invalid');
            }
        }
    }

    function onRazonSocialInput(value) {
        const input = document.getElementById('acc_comp_razon') || document.getElementById('acc_razon');
        const feedback = document.getElementById('razon_validation_feedback');
        if (!input) return;

        const trimmed = (value || '').trim();
        if (!trimmed) {
            input.classList.remove('is-valid', 'is-invalid');
            if (feedback) feedback.style.display = 'none';
            return;
        }

        if (feedback) {
            feedback.style.display = 'flex';
            if (trimmed.length >= 3) {
                feedback.className = 'field-validation-feedback valid';
                feedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Razón Social registrada correctamente`;
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            } else {
                feedback.className = 'field-validation-feedback invalid';
                feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Razón Social demasiado corta o inválida`;
                input.classList.remove('is-valid');
                input.classList.add('is-invalid');
            }
        }
    }

    function onRegimenSelect(selectEl) {
        if (!selectEl) return;
        const customInput = document.getElementById('acc_comp_regimen_custom');
        if (customInput) {
            if (selectEl.value === '__custom__') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        }
    }

    async function init(targetUserId = null, initialTab = 'datos', options = {}) {
        const session = JSON.parse(localStorage.getItem('arvic_current_session') || '{}');
        const loggedUser = session.user || {};
        isAdminView = loggedUser.role === 'admin';
        isReadOnlyMode = !!options.isReadOnlyData;
        isNewCompanyMode = !!options.isNewCompany;

        if (isNewCompanyMode) {
            currentEntityType = 'cliente';
            currentTargetUserId = null;
            currentTargetUser = { name: '', razonSocial: '', rfc: '', regimenFiscal: '601 - General de Ley Personas Morales' };
            currentTargetExpediente = null;
            pendingCsfFile = null;
            activeTab = 'datos';
            return;
        }

        currentEntityType = options.entityType || (targetUserId && String(targetUserId).startsWith('EMP') ? 'cliente' : (loggedUser.role === 'cliente' ? 'cliente' : 'consultor'));
        currentTargetUserId = (currentEntityType === 'cliente') 
            ? (targetUserId || loggedUser.companyId || loggedUser.userId) 
            : (targetUserId || loggedUser.userId || loggedUser.id);

        activeTab = (initialTab === 'expediente' || initialTab === 'expedientes') ? 'expedientes' : 'datos';

        // Cargar datos del usuario o empresa
        try {
            if (currentEntityType === 'cliente') {
                if (window.PortalDB && window.PortalDB.cache && window.PortalDB.cache.companies && window.PortalDB.cache.companies[currentTargetUserId]) {
                    currentTargetUser = window.PortalDB.cache.companies[currentTargetUserId];
                } else if (window.PortalDB && typeof window.PortalDB.getCompany === 'function') {
                    const compRes = await window.PortalDB.getCompany(currentTargetUserId);
                    currentTargetUser = compRes?.data || compRes || { name: 'Empresa Cliente', companyId: currentTargetUserId };
                } else {
                    currentTargetUser = { name: 'Empresa Cliente', companyId: currentTargetUserId };
                }
            } else if (isAdminView && targetUserId && targetUserId !== loggedUser.userId) {
                const users = await window.PortalDB.getUsers();
                currentTargetUser = users[currentTargetUserId] || Object.values(users).find(u => (u.id === currentTargetUserId || u.userId === currentTargetUserId));
                if (currentTargetUser && currentTargetUser.role === 'cliente') {
                    currentEntityType = 'cliente';
                    if (currentTargetUser.companyId && window.PortalDB && typeof window.PortalDB.getCompany === 'function') {
                        const compRes = await window.PortalDB.getCompany(currentTargetUser.companyId);
                        if (compRes?.data || compRes?.name) {
                            const compData = compRes.data || compRes;
                            currentTargetUser = { ...compData, ...currentTargetUser, name: compData.name || currentTargetUser.companyName || currentTargetUser.name };
                        }
                    }
                }
            } else {
                currentTargetUser = loggedUser;
                if (currentTargetUser.role === 'cliente') {
                    currentEntityType = 'cliente';
                }
            }

            // Obtener expediente digital desde MongoDB
            if (currentTargetUserId) {
                const expResult = await window.PortalDB.getExpediente(currentEntityType, currentTargetUserId);
                if (expResult && (expResult.success || expResult.data)) {
                    currentTargetExpediente = expResult.data || expResult;
                } else {
                    currentTargetExpediente = null;
                }
            } else {
                currentTargetExpediente = null;
            }
        } catch (e) {
            console.error('Error al cargar datos en AccountWorkspace:', e);
            currentTargetExpediente = null;
        }
    }

    function switchTab(tabKey, containerScope = null) {
        activeTab = (tabKey === 'expediente' || tabKey === 'expedientes') ? 'expedientes' : 'datos';
        
        let root = document;
        if (containerScope) {
            root = (typeof containerScope === 'string') ? document.getElementById(containerScope) : containerScope;
            if (!root) root = document;
        }

        root.querySelectorAll('.account-hub-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === activeTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        root.querySelectorAll('.account-hub-panel').forEach(panel => {
            const panelTab = panel.getAttribute('data-tab') || (panel.id === 'tab-panel-expedientes' ? 'expedientes' : (panel.id === 'tab-panel-datos' ? 'datos' : ''));
            if (panelTab === activeTab) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    }

    async function render(containerId, initialTab = 'datos', targetUserId = null, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        await init(targetUserId, initialTab, options);
        if (options.forcedTab) {
            activeTab = (options.forcedTab === 'expediente' || options.forcedTab === 'expedientes') ? 'expedientes' : 'datos';
        }
        const u = currentTargetUser || {};
        const isClient = currentEntityType === 'cliente' || u.role === 'cliente' || isNewCompanyMode;
        
        // Estructurar expediente y extraer lista de documentos
        const expData = currentTargetExpediente?.data || currentTargetExpediente || {};
        const summary = expData.summary || {};
        const isVerified = summary.canInvoice === true;

        // Lista de documentos asegurada desde checklist o fallback
        let docList = [];
        if (Array.isArray(expData.checklist) && expData.checklist.length > 0) {
            docList = expData.checklist.map(c => ({
                ...(c.doc || {}),
                documentType: c.documentType,
                documentTitle: c.documentTitle,
                status: c.doc?.status || (c.isUploaded ? 'en_revision' : 'faltante'),
                fileName: c.doc?.fileName || null,
                fileData: c.doc?.fileData || null,
                validUntil: c.doc?.validUntil || null,
                rejectionReason: c.doc?.rejectionReason || null
            }));
        } else if (isClient) {
            // Fallback con los 5 documentos oficiales de cliente
            const clientDefs = [
                { type: 'csf', title: 'Constancia de Situación Fiscal (Empresa)' },
                { type: 'contrato_marco_cliente', title: 'Contrato Marco de Servicios Arvic' },
                { type: 'anexo_sow', title: 'Anexos / SOW de Soporte y Proyectos' },
                { type: 'opinion_32d', title: 'Opinión de Cumplimiento 32-D (SAT)' },
                { type: 'domicilio', title: 'Comprobante de Domicilio Fiscal' }
            ];
            docList = clientDefs.map(d => ({
                docId: null,
                documentType: d.type,
                documentTitle: d.title,
                status: 'faltante',
                fileName: null,
                fileData: null,
                validUntil: null
            }));
        } else {
            // Fallback con los 9 documentos oficiales requeridos para consultor
            const defaultDefs = [
                { type: 'ine', title: 'INE / Identificación Oficial' },
                { type: 'curp', title: 'CURP Oficial' },
                { type: 'csf', title: 'Constancia de Situación Fiscal (SAT)' },
                { type: 'domicilio', title: 'Comprobante de Domicilio' },
                { type: 'cv', title: 'Currículum Vitae y Certificaciones' },
                { type: 'caratula_bancaria', title: 'Carátula Bancaria (Estado de Cuenta)' },
                { type: 'opinion_32d', title: 'Opinión de Cumplimiento 32-D (SAT)' },
                { type: 'contrato_arvic', title: 'Contrato Marco Arvic' },
                { type: 'contrato_proyecto', title: 'Convenio / Anexo de Proyecto' }
            ];
            docList = defaultDefs.map(d => ({
                docId: null,
                documentType: d.type,
                documentTitle: d.title,
                status: 'faltante',
                fileName: null,
                fileData: null,
                validUntil: null
            }));
        }

        let headerTitle = '';
        if (isNewCompanyMode) {
            headerTitle = `<i class="fa-solid fa-building-circle-arrow-right"></i> Registrar Nueva Empresa`;
        } else if (isAdminView && targetUserId) {
            if (isClient) {
                headerTitle = `<i class="fa-solid fa-building"></i> Expediente de la Empresa: ${u.name || u.companyName || u.razonSocial || 'Empresa Cliente'}`;
            } else if (u.role === 'admin') {
                headerTitle = `<i class="fa-solid fa-user-gear"></i> Ficha de Administrador: ${u.name || 'Sin nombre'}`;
            } else {
                headerTitle = `<i class="fa-solid fa-user-tie"></i> Ficha de Consultor: ${u.name || 'Sin nombre'}`;
            }
        } else {
            headerTitle = isClient 
                ? '<i class="fa-solid fa-building"></i> Datos Corporativos & Expediente Digital' 
                : '<i class="fa-solid fa-id-card"></i> Mi Cuenta & Expediente Digital';
        }

        let subInfoHtml = '';
        if (isNewCompanyMode) {
            subInfoHtml = `<span class="account-hub-type-badge client"><i class="fa-solid fa-building"></i> Nueva Empresa Cliente</span> &bull; Registro Fiscal SAT, Contacto y Expediente`;
        } else if (isClient) {
            const cId = u.companyId || u.id || u.userId || '—';
            const rfcStr = u.rfc ? `&bull; RFC: <strong>${u.rfc}</strong>` : '';
            const emailStr = u.contactEmail ? `&bull; <i class="fa-solid fa-envelope"></i> ${u.contactEmail}` : (u.email ? `&bull; <i class="fa-solid fa-envelope"></i> ${u.email}` : '');
            subInfoHtml = `<span class="account-hub-type-badge client"><i class="fa-solid fa-building"></i> Cliente</span> &bull; ID: <strong>${cId}</strong> ${rfcStr} ${emailStr}`;
        } else if (u.role === 'admin') {
            subInfoHtml = `<span class="account-hub-type-badge admin"><i class="fa-solid fa-user-gear"></i> Administrador</span> &bull; ID: <strong>${u.userId || u.id || '—'}</strong> &bull; <i class="fa-solid fa-envelope"></i> ${u.email || ''}`;
        } else {
            subInfoHtml = `<span class="account-hub-type-badge consultor"><i class="fa-solid fa-user-tie"></i> Consultor</span> &bull; ID: <strong>${u.userId || u.id || '—'}</strong> &bull; <i class="fa-solid fa-envelope"></i> ${u.email || ''}`;
        }

        let backButtonHtml = '';
        if (isAdminView) {
            if (isClient || isNewCompanyMode) {
                backButtonHtml = `
                    <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.84rem; background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.3);" onclick="showSection('empresas')">
                        <i class="fa-solid fa-arrow-left"></i> Volver a Empresas
                    </button>
                `;
            } else if (targetUserId) {
                backButtonHtml = `
                    <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.84rem; background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.3);" onclick="showSection('consultores')">
                        <i class="fa-solid fa-arrow-left"></i> Volver a Usuarios
                    </button>
                `;
            }
        }

        container.innerHTML = `
            <div class="account-workspace-container">
                <!-- Hub Banner Superior -->
                <div class="account-hub-banner">
                    <div class="account-hub-info">
                        <h2>${headerTitle}</h2>
                        <p>${subInfoHtml}</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${isNewCompanyMode ? `
                            <span class="account-hub-badge" style="background:#e0f2fe; border-color:#bae6fd; color:#0369a1;">
                                <i class="fa-solid fa-sparkles"></i> Nuevo Registro
                            </span>
                        ` : isVerified ? `
                            <span class="account-hub-badge" style="background:#dcfce7; border-color:#86efac; color:#15803d;">
                                <i class="fa-solid fa-circle-check"></i> ${isClient ? 'Expediente Verificado' : 'Perfil Verificado'}
                            </span>
                        ` : `
                            <span class="account-hub-badge" style="background:#fef3c7; border-color:#fde68a; color:#b45309;">
                                <i class="fa-solid fa-clock-rotate-left"></i> Verificación Pendiente
                            </span>
                        `}

                        ${backButtonHtml}
                    </div>
                </div>

                <!-- Hub Tabs Navigation -->
                ${!options.hideInternalTabs ? `
                <div class="account-hub-tabs">
                    <button class="account-hub-tab-btn ${activeTab === 'datos' ? 'active' : ''}" data-tab="datos" onclick="window.AccountWorkspace.switchTab('datos', '${containerId}')">
                        <i class="fa-solid ${isClient ? 'fa-building-circle-check' : 'fa-user-pen'}"></i> ${isClient ? (isNewCompanyMode ? 'Datos y Fiscales SAT' : 'Datos de Empresa') : 'Datos'}
                    </button>
                    ${!isNewCompanyMode ? `
                        <button class="account-hub-tab-btn ${activeTab === 'expedientes' ? 'active' : ''}" data-tab="expedientes" onclick="window.AccountWorkspace.switchTab('expedientes', '${containerId}')">
                            <i class="fa-solid fa-folder-tree"></i> Expedientes
                            <span class="account-tab-badge">${docList.length} Docs</span>
                        </button>
                    ` : ''}
                </div>
                ` : ''}

                <!-- TAB PANEL 1: DATOS -->
                <div id="tab-panel-datos" data-tab="datos" class="account-hub-panel ${activeTab === 'datos' ? 'active' : ''}">
                    
                    ${isReadOnlyMode ? `
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-bottom:18px; color:#1e40af; font-size:0.86rem; display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-circle-info"></i> Modo visualización de expediente. Para realizar modificaciones sobre este registro, use la opción de <strong>Editar</strong>.
                        </div>
                    ` : ''}

                    ${isClient ? `
                        <!-- FORMULARIO CLIENTE / EMPRESA -->

                        <!-- Banner Autolectura CSF para Empresas -->
                        ${!isReadOnlyMode ? `
                            <div class="csf-upload-banner" style="margin-bottom: 20px;">
                                <div class="csf-upload-info">
                                    <div class="csf-upload-icon">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    </div>
                                    <div class="csf-upload-text">
                                        <h4>Autolectura Inteligente de Constancia Fiscal (SAT)</h4>
                                        <p>Sube el PDF oficial de la Constancia de Situación Fiscal de la empresa para autocompletar RFC, Razón Social, Régimen y Domicilio Fiscal completo en un solo clic y anexarlo automáticamente al expediente digital.</p>
                                    </div>
                                </div>
                                <div>
                                    <input type="file" id="compCsfFileInput" accept="application/pdf" style="display:none;" onchange="window.AccountWorkspace.handleCSFUpload(event)">
                                    <button type="button" class="csf-btn-upload" onclick="document.getElementById('compCsfFileInput').click()">
                                        <i class="fa-solid fa-file-arrow-up"></i> Cargar PDF de CSF
                                    </button>
                                </div>
                            </div>
                        ` : ''}

                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-building" style="color:#0284c7;"></i> Datos Generales y Fiscales SAT de la Empresa</span>
                            </div>
                            <div class="account-form-grid">
                                <div class="account-form-group">
                                    <label for="acc_comp_name"><i class="fa-solid fa-building"></i> Nombre Comercial de la Empresa *</label>
                                    <input type="text" id="acc_comp_name" value="${u.name || u.companyName || ''}" placeholder="Ej. Tech Solutions México" required ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_comp_razon"><i class="fa-solid fa-file-signature"></i> Razón Social Oficial SAT *</label>
                                    <input type="text" id="acc_comp_razon" value="${u.razonSocial || ''}" placeholder="Ej. Tech Solutions de México S.A. de C.V." oninput="window.AccountWorkspace.onRazonSocialInput(this.value)" ${isReadOnlyMode ? 'readonly' : ''}>
                                    <div id="razon_validation_feedback" class="field-validation-feedback" style="display:none;"></div>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_comp_rfc"><i class="fa-solid fa-id-badge"></i> RFC de la Empresa *</label>
                                    <input type="text" id="acc_comp_rfc" value="${u.rfc || ''}" placeholder="12 caracteres para Empresa (ej. TSM180512AB3)" maxlength="13" style="font-family:monospace; font-weight:600; text-transform:uppercase;" oninput="window.AccountWorkspace.onRfcInput(this.value)" ${isReadOnlyMode ? 'readonly' : ''}>
                                    <div id="rfc_validation_feedback" class="field-validation-feedback" style="display:none;"></div>
                                </div>
                                <div class="account-form-group" style="grid-column: 1 / -1;">
                                    <label for="acc_comp_regimen"><i class="fa-solid fa-scale-balanced"></i> Régimen Fiscal SAT *</label>
                                    <select id="acc_comp_regimen" onchange="window.AccountWorkspace.onRegimenSelect(this)" ${isReadOnlyMode ? 'disabled' : ''}>
                                        <option value="">-- Seleccionar Régimen Fiscal SAT --</option>
                                        <option value="601 - General de Ley Personas Morales" ${(u.regimenFiscal && u.regimenFiscal.includes('601')) || isNewCompanyMode ? 'selected' : ''}>601 - General de Ley Personas Morales</option>
                                        <option value="603 - Personas Morales con Fines no Lucrativos" ${u.regimenFiscal && u.regimenFiscal.includes('603') ? 'selected' : ''}>603 - Personas Morales con Fines no Lucrativos</option>
                                        <option value="620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos" ${u.regimenFiscal && u.regimenFiscal.includes('620') ? 'selected' : ''}>620 - Sociedades Cooperativas de Producción</option>
                                        <option value="622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" ${u.regimenFiscal && u.regimenFiscal.includes('622') ? 'selected' : ''}>622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</option>
                                        <option value="623 - Opcional para Grupos de Sociedades" ${u.regimenFiscal && u.regimenFiscal.includes('623') ? 'selected' : ''}>623 - Opcional para Grupos de Sociedades</option>
                                        <option value="624 - Coordinados" ${u.regimenFiscal && u.regimenFiscal.includes('624') ? 'selected' : ''}>624 - Coordinados</option>
                                        <option value="626 - Régimen Simplificado de Confianza (RESICO)" ${u.regimenFiscal && u.regimenFiscal.includes('626') ? 'selected' : ''}>626 - Régimen Simplificado de Confianza (RESICO)</option>
                                        <option value="612 - Personas Físicas con Actividades Empresariales y Profesionales" ${u.regimenFiscal && u.regimenFiscal.includes('612') ? 'selected' : ''}>612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                                        <option value="605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" ${u.regimenFiscal && u.regimenFiscal.includes('605') ? 'selected' : ''}>605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                                        <option value="606 - Arrendamiento" ${u.regimenFiscal && u.regimenFiscal.includes('606') ? 'selected' : ''}>606 - Arrendamiento</option>
                                        <option value="621 - Incorporación Fiscal" ${u.regimenFiscal && u.regimenFiscal.includes('621') ? 'selected' : ''}>621 - Incorporación Fiscal</option>
                                        <option value="625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" ${u.regimenFiscal && u.regimenFiscal.includes('625') ? 'selected' : ''}>625 - Plataformas Tecnológicas</option>
                                        <option value="__custom__">+ Otro Régimen Fiscal (Escribir manualmente)...</option>
                                    </select>
                                    <input type="text" id="acc_comp_regimen_custom" placeholder="Escriba su régimen fiscal SAT" style="display:none; margin-top:6px;" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                            </div>

                            <!-- Domicilio Fiscal SAT -->
                            <div style="margin-top:16px; padding-top:14px; border-top:1px dashed #e2e8f0;">
                                <h4 style="font-size:0.88rem; color:#475569; margin:0 0 12px 0; font-weight:700;">
                                    <i class="fa-solid fa-location-dot" style="color:#0284c7;"></i> Domicilio Fiscal Registrado ante el SAT
                                </h4>
                                <div class="account-form-grid">
                                    <div class="account-form-group">
                                        <label for="acc_cp_fiscal"><i class="fa-solid fa-map-pin"></i> Código Postal (C.P.) *</label>
                                        <input type="text" id="acc_cp_fiscal" value="${u.codigoPostalFiscal || ''}" placeholder="5 dígitos" maxlength="5" oninput="window.AccountWorkspace.onPostalCodeInput(this.value, 'fiscal')" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_estado_fiscal"><i class="fa-solid fa-earth-americas"></i> Estado / Entidad</label>
                                        <input type="text" id="acc_estado_fiscal" value="${u.estadoFiscal || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_municipio_fiscal"><i class="fa-solid fa-city"></i> Alcaldía / Municipio</label>
                                        <input type="text" id="acc_municipio_fiscal" value="${u.municipioFiscal || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_colonia_fiscal"><i class="fa-solid fa-tree-city"></i> Colonia / Asentamiento</label>
                                        <select id="acc_colonia_fiscal" onchange="window.AccountWorkspace.onColoniaSelect(this, 'fiscal')" ${isReadOnlyMode ? 'disabled' : ''}>
                                            <option value="">-- Seleccionar Colonia Fiscal --</option>
                                            ${u.coloniaFiscal ? `<option value="${u.coloniaFiscal}" selected>${u.coloniaFiscal}</option>` : ''}
                                            <option value="__custom__">+ Otra colonia (Escribir manualmente)...</option>
                                        </select>
                                        <input type="text" id="acc_colonia_fiscal_custom" placeholder="Escriba su colonia" style="display:none; margin-top:6px;" oninput="window.AccountWorkspace.onCustomColoniaInput(this, 'fiscal')">
                                    </div>
                                    <div class="account-form-group" style="grid-column: 1 / span 2;">
                                        <label for="acc_calle_fiscal"><i class="fa-solid fa-road"></i> Calle / Avenida</label>
                                        <input type="text" id="acc_calle_fiscal" value="${u.calleFiscal || ''}" placeholder="Nombre de la calle" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_num_ext_fiscal">Núm. Exterior</label>
                                        <input type="text" id="acc_num_ext_fiscal" value="${u.numExtFiscal || ''}" placeholder="Ej. 123" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_num_int_fiscal">Núm. Interior (Opcional)</label>
                                        <input type="text" id="acc_num_int_fiscal" value="${u.numIntFiscal || ''}" placeholder="Ej. Piso 4" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-user-check" style="color:#10b981;"></i> Contacto Autorizado Principal</span>
                            </div>
                            <div class="account-form-grid">
                                <div class="account-form-group">
                                    <label for="acc_contact_name"><i class="fa-solid fa-user"></i> Nombre del Contacto</label>
                                    <input type="text" id="acc_contact_name" value="${u.contactName || ''}" placeholder="Ej. Lic. Mariana Torres" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_contact_position"><i class="fa-solid fa-briefcase"></i> Cargo o Puesto</label>
                                    <input type="text" id="acc_contact_position" value="${u.contactPosition || ''}" placeholder="Ej. Directora de TI" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_contact_email"><i class="fa-solid fa-envelope"></i> Correo Electrónico</label>
                                    <input type="email" id="acc_contact_email" value="${u.contactEmail || ''}" placeholder="contacto@empresa.com" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_contact_phone"><i class="fa-solid fa-phone"></i> Teléfono Directo</label>
                                    <input type="tel" id="acc_contact_phone" value="${u.contactPhone || ''}" placeholder="Ej. 55 1234 5678" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                            </div>
                        </div>

                        ${!isReadOnlyMode ? `
                            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
                                <button type="button" class="btn btn-secondary" style="padding:10px 20px; font-weight:600;" onclick="showSection('empresas')">
                                    <i class="fa-solid fa-xmark"></i> Cancelar
                                </button>
                                <button type="button" class="btn btn-primary" style="padding:10px 24px; font-weight:700;" onclick="window.AccountWorkspace.saveAccountData()">
                                    <i class="fa-solid fa-floppy-disk"></i> ${isNewCompanyMode ? 'Registrar Empresa' : 'Guardar Cambios de la Empresa'}
                                </button>
                            </div>
                        ` : ''}
                    ` : `
                        <!-- FORMULARIO CONSULTOR / USUARIO -->
                        <!-- 1.1 Datos Personales y de Contacto -->
                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-address-card" style="color:#0284c7;"></i> Datos Personales y de Contacto</span>
                            </div>
                            <div class="account-form-grid">
                                <div class="account-form-group">
                                    <label for="acc_name"><i class="fa-solid fa-user"></i> Nombre Completo</label>
                                    <input type="text" id="acc_name" value="${u.name || ''}" placeholder="Ej. Juan Pérez González" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_email"><i class="fa-solid fa-envelope"></i> Correo Electrónico</label>
                                    <input type="email" id="acc_email" value="${u.email || ''}" ${(!isAdminView || isReadOnlyMode) ? 'readonly style="background:#f8fafc;"' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_phone"><i class="fa-solid fa-phone"></i> Teléfono / Celular</label>
                                    <input type="tel" id="acc_phone" value="${u.phone || ''}" placeholder="Ej. 55 1234 5678" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                            </div>

                            <!-- Desglose Domiciliar Completo -->
                            <div style="margin-top:16px; padding-top:14px; border-top:1px dashed #e2e8f0;">
                                <h4 style="font-size:0.88rem; color:#475569; margin:0 0 12px 0; font-weight:700;">
                                    <i class="fa-solid fa-location-dot" style="color:#0284c7;"></i> Dirección Domiciliar
                                </h4>
                                
                                <div class="account-form-grid">
                                    <div class="account-form-group">
                                        <label for="acc_cp_personal"><i class="fa-solid fa-map-pin"></i> Código Postal (C.P.) *</label>
                                        <input type="text" id="acc_cp_personal" value="${u.codigoPostal || ''}" placeholder="5 dígitos" maxlength="5" oninput="window.AccountWorkspace.onPostalCodeInput(this.value, 'personal')" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_estado_personal"><i class="fa-solid fa-earth-americas"></i> Estado / Entidad</label>
                                        <input type="text" id="acc_estado_personal" value="${u.estado || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_municipio_personal"><i class="fa-solid fa-city"></i> Alcaldía / Municipio / Ciudad</label>
                                        <input type="text" id="acc_municipio_personal" value="${u.municipio || u.ciudad || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_colonia_personal"><i class="fa-solid fa-tree-city"></i> Colonia / Asentamiento</label>
                                        <select id="acc_colonia_personal" onchange="window.AccountWorkspace.onColoniaSelect(this, 'personal')" ${isReadOnlyMode ? 'disabled' : ''}>
                                            <option value="">-- Seleccionar Colonia --</option>
                                            ${u.colonia ? `<option value="${u.colonia}" selected>${u.colonia}</option>` : ''}
                                            <option value="__custom__">+ Otra colonia (Escribir manualmente)...</option>
                                        </select>
                                        <input type="text" id="acc_colonia_personal_custom" placeholder="Escriba su colonia" style="display:none; margin-top:6px;" oninput="window.AccountWorkspace.onCustomColoniaInput(this, 'personal')">
                                    </div>
                                    <div class="account-form-group" style="grid-column: 1 / span 2;">
                                        <label for="acc_calle_personal"><i class="fa-solid fa-road"></i> Calle / Vialidad</label>
                                        <input type="text" id="acc_calle_personal" value="${u.calle || ''}" placeholder="Nombre de la calle" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_num_ext_personal">Núm. Exterior</label>
                                        <input type="text" id="acc_num_ext_personal" value="${u.numExterior || ''}" placeholder="Ej. 123" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_num_int_personal">Núm. Interior (Opcional)</label>
                                        <input type="text" id="acc_num_int_personal" value="${u.numInterior || ''}" placeholder="Ej. Depto 4B" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                    <div class="account-form-group">
                                        <label for="acc_pais_personal">País</label>
                                        <input type="text" id="acc_pais_personal" value="${u.pais || 'México'}" placeholder="México" ${isReadOnlyMode ? 'readonly' : ''}>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 1.2 Credenciales y Contraseña -->
                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-key" style="color:#f59e0b;"></i> Seguridad y Contraseña</span>
                                ${isAdminView ? '<span style="font-size:0.75rem; color:#64748b; font-weight:normal;">Visible y editable para el Administrador</span>' : ''}
                            </div>
                            <div class="account-form-grid">
                                <div class="account-form-group" style="grid-column: 1 / -1;">
                                    <label for="acc_password">
                                        ${isAdminView ? 'Contraseña del Usuario (Visualizar / Modificar)' : 'Actualizar Contraseña'}
                                    </label>
                                    <div class="password-manage-box">
                                        <input type="password" id="acc_password" value="${isAdminView ? (u.password || '') : ''}" placeholder="${isAdminView ? 'Contraseña del usuario' : 'Escriba nueva contraseña solo si desea cambiarla'}" ${isReadOnlyMode ? 'readonly' : ''}>
                                        <button type="button" class="password-toggle-btn" onclick="window.AccountWorkspace.togglePasswordVisibility('acc_password', this)" title="Ver / Ocultar">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                        ${isAdminView && !isReadOnlyMode ? `
                                            <button type="button" class="btn btn-secondary" style="padding:8px 12px; font-size:0.8rem;" onclick="window.AccountWorkspace.generateNewPassword('acc_password')" title="Generar contraseña segura">
                                                <i class="fa-solid fa-arrows-rotate"></i> Generar
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 1.3 Datos Fiscales SAT con Autolectura CSF -->
                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-file-invoice-dollar" style="color:#10b981;"></i> Datos Fiscales (SAT)</span>
                                ${!isReadOnlyMode ? `
                                    <button type="button" class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="window.AccountWorkspace.copyPersonalToFiscal()" title="Copiar datos domiciliarios personales al domicilio fiscal">
                                        <i class="fa-solid fa-copy"></i> Copiar Domicilio Personal a Fiscal
                                    </button>
                                ` : ''}
                            </div>

                            <!-- Banner Autolectura CSF -->
                            <div class="csf-upload-banner">
                                <div class="csf-upload-info">
                                    <div class="csf-upload-icon">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    </div>
                                    <div class="csf-upload-text">
                                        <h4>Autolectura Inteligente de Constancia Fiscal (SAT)</h4>
                                        <p>Sube tu PDF oficial para autocompletar RFC, Razón Social, Régimen y Domicilio Fiscal completo en un clic.</p>
                                    </div>
                                </div>
                                <div>
                                    <input type="file" id="csfFileInput" accept="application/pdf" style="display:none;" onchange="window.AccountWorkspace.handleCSFUpload(event)">
                                    <button type="button" class="csf-btn-upload" onclick="document.getElementById('csfFileInput').click()">
                                        <i class="fa-solid fa-file-arrow-up"></i> Cargar PDF de CSF
                                    </button>
                                </div>
                            </div>

                            <div class="account-form-grid">
                                <div class="account-form-group">
                                    <label for="acc_rfc"><i class="fa-solid fa-id-card"></i> RFC *</label>
                                    <input type="text" id="acc_rfc" value="${u.rfc || ''}" placeholder="Ej. PEGA900101XYZ" maxlength="13" style="text-transform: uppercase;" oninput="window.AccountWorkspace.onRfcInput(this.value)" ${isReadOnlyMode ? 'readonly' : ''}>
                                    <div id="rfc_validation_feedback" class="field-validation-feedback" style="display:none;"></div>
                                </div>
                                <div class="account-form-group" style="grid-column: 2 / -1;">
                                    <label for="acc_razon"><i class="fa-solid fa-building"></i> Nombre / Denominación / Razón Social *</label>
                                    <input type="text" id="acc_razon" value="${u.razonSocial || ''}" placeholder="Nombre registrado ante el SAT" oninput="window.AccountWorkspace.onRazonSocialInput(this.value)" ${isReadOnlyMode ? 'readonly' : ''}>
                                    <div id="razon_validation_feedback" class="field-validation-feedback" style="display:none;"></div>
                                </div>
                                <div class="account-form-group" style="grid-column: 1 / -1;">
                                    <label for="acc_regimen"><i class="fa-solid fa-receipt"></i> Régimen Fiscal *</label>
                                    <input type="text" id="acc_regimen" value="${u.regimenFiscal || ''}" placeholder="Ej. 605 Sueldos y Salarios / 612 Personas Físicas con Actividades Empresariales" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>

                                <!-- Domicilio Fiscal Detallado -->
                                <div class="account-form-group">
                                    <label for="acc_cp_fiscal"><i class="fa-solid fa-map-pin"></i> C.P. Fiscal *</label>
                                    <input type="text" id="acc_cp_fiscal" value="${u.codigoPostalFiscal || ''}" placeholder="5 dígitos" maxlength="5" oninput="window.AccountWorkspace.onPostalCodeInput(this.value, 'fiscal')" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_estado_fiscal"><i class="fa-solid fa-earth-americas"></i> Estado Fiscal</label>
                                    <input type="text" id="acc_estado_fiscal" value="${u.estadoFiscal || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_municipio_fiscal"><i class="fa-solid fa-city"></i> Municipio / Alcaldía Fiscal</label>
                                    <input type="text" id="acc_municipio_fiscal" value="${u.municipioFiscal || ''}" placeholder="Autodetectado por C.P." ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_colonia_fiscal"><i class="fa-solid fa-tree-city"></i> Colonia Fiscal</label>
                                    <select id="acc_colonia_fiscal" onchange="window.AccountWorkspace.onColoniaSelect(this, 'fiscal')" ${isReadOnlyMode ? 'disabled' : ''}>
                                        <option value="">-- Seleccionar Colonia Fiscal --</option>
                                        ${u.coloniaFiscal ? `<option value="${u.coloniaFiscal}" selected>${u.coloniaFiscal}</option>` : ''}
                                        <option value="__custom__">+ Otra colonia (Escribir manualmente)...</option>
                                    </select>
                                    <input type="text" id="acc_colonia_fiscal_custom" placeholder="Escriba su colonia fiscal" style="display:none; margin-top:6px;" oninput="window.AccountWorkspace.onCustomColoniaInput(this, 'fiscal')">
                                </div>
                                <div class="account-form-group" style="grid-column: 1 / span 2;">
                                    <label for="acc_calle_fiscal"><i class="fa-solid fa-road"></i> Calle Fiscal</label>
                                    <input type="text" id="acc_calle_fiscal" value="${u.calleFiscal || ''}" placeholder="Calle fiscal registrada" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_num_ext_fiscal">Núm. Ext. Fiscal</label>
                                    <input type="text" id="acc_num_ext_fiscal" value="${u.numExtFiscal || ''}" placeholder="Ej. 123" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_num_int_fiscal">Núm. Int. Fiscal</label>
                                    <input type="text" id="acc_num_int_fiscal" value="${u.numIntFiscal || ''}" placeholder="Ej. Piso 3" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                            </div>
                        </div>

                        <!-- 1.4 Datos Bancarios -->
                        <div class="account-section-card">
                            <div class="account-section-card-title">
                                <span><i class="fa-solid fa-building-columns" style="color:#6366f1;"></i> Datos Bancarios para Pagos y Honorarios</span>
                            </div>
                            <div class="account-form-grid">
                                <div class="account-form-group">
                                    <label for="acc_clabe"><i class="fa-solid fa-hashtag"></i> Cuenta CLABE Interbancaria (18 dígitos)</label>
                                    <input type="text" id="acc_clabe" value="${u.clabe || ''}" placeholder="18 dígitos numéricos" maxlength="18" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                                <div class="account-form-group">
                                    <label for="acc_bank"><i class="fa-solid fa-landmark"></i> Institución Bancaria</label>
                                    <input type="text" id="acc_bank" value="${u.bankName || ''}" placeholder="Ej. BBVA, Santander, Banorte" ${isReadOnlyMode ? 'readonly' : ''}>
                                </div>
                            </div>
                        </div>

                        ${!isReadOnlyMode ? `
                            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
                                <button type="button" class="btn btn-primary" style="padding:10px 24px; font-weight:700;" onclick="window.AccountWorkspace.saveAccountData()">
                                    <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
                                </button>
                            </div>
                        ` : ''}
                    `}
                </div>

                <!-- TAB PANEL 2: EXPEDIENTES (Documentos Oficiales, Semáforos, Subida y Visor) -->
                <div id="tab-panel-expedientes" data-tab="expedientes" class="account-hub-panel ${activeTab === 'expedientes' ? 'active' : ''}">
                    
                    ${isClient ? `
                        <!-- Banner Expediente Cliente -->
                        ${isVerified ? `
                            <div class="candado-warning-banner" style="background:#f0fdf4; border-color:#dcfce7; border-left-color:#16a34a; color:#15803d;">
                                <i class="fa-solid fa-circle-check" style="color:#16a34a;"></i>
                                <div>
                                    <strong>Expediente Digital Corporativo Completo</strong>
                                    <p style="margin:2px 0 0 0; font-size:0.82rem;">Todos los documentos contractuales y fiscales de la empresa están validados y vigentes.</p>
                                </div>
                            </div>
                        ` : `
                            <div class="candado-warning-banner">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <div>
                                    <strong>Expediente Corporativo en Validación</strong>
                                    <p style="margin:2px 0 0 0; font-size:0.82rem;">
                                        Existen documentos de la empresa faltantes, en revisión o vencidos. Asegúrese de contar con la documentación fiscal y legal vigente para garantizar el cumplimiento contractual.
                                    </p>
                                </div>
                            </div>
                        `}
                    ` : `
                        <!-- Banner Facturación Consultor -->
                        ${isVerified ? `
                            <div class="candado-warning-banner" style="background:#f0fdf4; border-color:#dcfce7; border-left-color:#16a34a; color:#15803d;">
                                <i class="fa-solid fa-circle-check" style="color:#16a34a;"></i>
                                <div>
                                    <strong>Expediente Completo y Habilitado para Facturación</strong>
                                    <p style="margin:2px 0 0 0; font-size:0.82rem;">Todos los documentos obligatorios están validados y vigentes.</p>
                                </div>
                            </div>
                        ` : `
                            <div class="candado-warning-banner">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <div>
                                    <strong>Candado de Facturación Activo</strong>
                                    <p style="margin:2px 0 0 0; font-size:0.82rem;">
                                        Existen documentos faltantes, en revisión o vencidos. La facturación de honorarios está bloqueada hasta completar el expediente.
                                    </p>
                                </div>
                            </div>
                        `}
                    `}

                    <!-- Grid de Documentos -->
                    <div class="expediente-cards-grid">
                        ${renderDocumentCards(docList)}
                    </div>
                </div>
            </div>
        `;

        // Pre-cargar opciones de CP si ya estaban presentes
        if (u.codigoPostal) onPostalCodeInput(u.codigoPostal, 'personal');
        if (u.codigoPostalFiscal) onPostalCodeInput(u.codigoPostalFiscal, 'fiscal');
        if (u.rfc) onRfcInput(u.rfc);
        if (u.razonSocial) onRazonSocialInput(u.razonSocial);
    }

    function renderDocumentCards(documents) {
        if (!documents || documents.length === 0) {
            return '<div class="empty-mini">No hay documentos registrados en el expediente.</div>';
        }

        return documents.map(doc => {
            const statusClass = `status-${doc.status || 'faltante'}`;
            const statusLabels = {
                vigente: 'Vigente',
                por_vencer: 'Por Vencer',
                vencido: 'Vencido',
                en_revision: 'En Revisión',
                rechazado: 'Rechazado',
                faltante: 'Faltante'
            };

            const hasFile = !!(doc.fileData || doc.fileName);

            return `
                <div class="expediente-doc-card">
                    <div>
                        <div class="expediente-card-header">
                            <h4 class="expediente-doc-title">
                                <i class="fa-solid fa-file-lines" style="color:#0284c7;"></i>
                                ${doc.documentTitle}
                            </h4>
                            <span class="doc-status-badge ${statusClass}">
                                ${statusLabels[doc.status] || doc.status}
                            </span>
                        </div>

                        <div class="expediente-doc-details">
                            <p><strong>Archivo:</strong> ${doc.fileName || '<em>Sin subir</em>'}</p>
                            ${doc.validUntil ? `<p><strong>Vigencia:</strong> ${new Date(doc.validUntil).toLocaleDateString('es-MX')}</p>` : ''}
                            ${doc.rejectionReason ? `<p style="color:#b91c1c;"><strong>Motivo rechazo:</strong> ${doc.rejectionReason}</p>` : ''}
                        </div>
                    </div>

                    <div class="expediente-doc-actions">
                        <input type="file" id="file_doc_${doc.documentType}" style="display:none;" onchange="window.AccountWorkspace.uploadDocument('${doc.documentType}', event)">
                        
                        <button type="button" class="doc-action-btn primary" onclick="document.getElementById('file_doc_${doc.documentType}').click()">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> ${hasFile ? 'Reemplazar' : 'Subir'}
                        </button>

                        ${hasFile ? `
                            <button type="button" class="doc-action-btn" onclick="window.AccountWorkspace.previewDocument('${doc.docId || doc.documentType}')" title="Ver Documento">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                        ` : ''}

                        ${isAdminView ? `
                            <button type="button" class="doc-action-btn" style="background:#e0f2fe; color:#0369a1;" onclick="window.AccountWorkspace.adminReviewDoc('${doc.docId}', '${doc.documentTitle}', '${doc.documentType}')" title="Aprobar / Fijar Vigencia">
                                <i class="fa-solid fa-check-double"></i> Revisar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function onPostalCodeInput(cp, type = 'personal') {
        const cleanCp = String(cp || '').trim();
        if (cleanCp.length < 2) return;

        const prefix = cleanCp.substring(0, 2);
        const autoState = MEX_CP_PREFIX_STATES[prefix] || '';

        const stateInputId = type === 'personal' ? 'acc_estado_personal' : 'acc_estado_fiscal';
        const munInputId = type === 'personal' ? 'acc_municipio_personal' : 'acc_municipio_fiscal';
        const colSelectId = type === 'personal' ? 'acc_colonia_personal' : 'acc_colonia_fiscal';

        const stateInput = document.getElementById(stateInputId);
        if (stateInput && autoState) {
            stateInput.value = autoState;
            stateInput.classList.add('autofilled');
        }

        if (cleanCp.length === 5) {
            try {
                // Consultar API de códigos postales local o remota
                let colonies = [];
                let detectedMun = '';

                try {
                    const apiUrl = (window.PortalDB && window.PortalDB.API_URL) ? window.PortalDB.API_URL : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000/api' : '/api');
                    const response = await fetch(`${apiUrl}/postal-codes/${cleanCp}`);
                    if (response.ok) {
                        const json = await response.json();
                        colonies = json.colonias || json.colonies || [];
                        detectedMun = json.municipio || json.municipality || '';
                    }
                } catch (e) {
                    console.log('API CP local no disponible, usando inferencia básica');
                }

                const munInput = document.getElementById(munInputId);
                if (munInput && detectedMun) {
                    munInput.value = detectedMun;
                    munInput.classList.add('autofilled');
                }

                const colSelect = document.getElementById(colSelectId);
                if (colSelect && colonies.length > 0) {
                    const currentVal = colSelect.value;
                    colSelect.innerHTML = '<option value="">-- Seleccionar Colonia --</option>';
                    colonies.forEach(col => {
                        const opt = document.createElement('option');
                        opt.value = col;
                        opt.textContent = col;
                        if (col.toLowerCase() === (currentVal || '').toLowerCase()) {
                            opt.selected = true;
                        }
                        colSelect.appendChild(opt);
                    });
                    const customOpt = document.createElement('option');
                    customOpt.value = '__custom__';
                    customOpt.textContent = '+ Otra colonia (Escribir manualmente)...';
                    colSelect.appendChild(customOpt);
                    colSelect.classList.add('autofilled');
                }
            } catch (err) {
                console.error('Error en lookup de CP:', err);
            }
        }
    }

    function onColoniaSelect(selectEl, type) {
        const customInputId = type === 'personal' ? 'acc_colonia_personal_custom' : 'acc_colonia_fiscal_custom';
        const customInput = document.getElementById(customInputId);
        if (selectEl.value === '__custom__') {
            if (customInput) {
                customInput.style.display = 'block';
                customInput.focus();
            }
        } else {
            if (customInput) {
                customInput.style.display = 'none';
            }
        }
    }

    function onCustomColoniaInput(inputEl, type) {
        // Al escribir en custom colonia
    }

    function copyPersonalToFiscal() {
        const cp = document.getElementById('acc_cp_personal')?.value || '';
        const edo = document.getElementById('acc_estado_personal')?.value || '';
        const mun = document.getElementById('acc_municipio_personal')?.value || '';
        const calle = document.getElementById('acc_calle_personal')?.value || '';
        const ext = document.getElementById('acc_num_ext_personal')?.value || '';
        const int = document.getElementById('acc_num_int_personal')?.value || '';
        let col = document.getElementById('acc_colonia_personal')?.value || '';
        if (col === '__custom__') {
            col = document.getElementById('acc_colonia_personal_custom')?.value || '';
        }

        const cpF = document.getElementById('acc_cp_fiscal');
        const edoF = document.getElementById('acc_estado_fiscal');
        const munF = document.getElementById('acc_municipio_fiscal');
        const calleF = document.getElementById('acc_calle_fiscal');
        const extF = document.getElementById('acc_num_ext_fiscal');
        const intF = document.getElementById('acc_num_int_fiscal');
        const colF = document.getElementById('acc_colonia_fiscal');

        if (cpF) { cpF.value = cp; cpF.classList.add('autofilled'); }
        if (edoF) { edoF.value = edo; edoF.classList.add('autofilled'); }
        if (munF) { munF.value = mun; munF.classList.add('autofilled'); }
        if (calleF) { calleF.value = calle; calleF.classList.add('autofilled'); }
        if (extF) { extF.value = ext; extF.classList.add('autofilled'); }
        if (intF) { intF.value = int; intF.classList.add('autofilled'); }

        if (colF && col) {
            const exists = Array.from(colF.options).some(opt => opt.value.toLowerCase() === col.toLowerCase());
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = col;
                opt.textContent = col;
                colF.insertBefore(opt, colF.querySelector('option[value="__custom__"]'));
            }
            colF.value = col;
            colF.classList.add('autofilled');
        }

        window.NotificationUtils?.info?.('Domicilio personal copiado a fiscal');
    }

    async function handleCSFUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        window.NotificationUtils?.info?.('Analizando Constancia Fiscal SAT con autolectura...', 3500);

        try {
            const parsed = await window.CSFParser.parseFile(file);
            console.log('📄 Datos extraídos de CSF SAT:', parsed);

            // 1. RFC
            if (parsed.rfc) {
                const rfcInput = document.getElementById('acc_comp_rfc') || document.getElementById('acc_rfc');
                if (rfcInput) { 
                    rfcInput.value = parsed.rfc; 
                    rfcInput.classList.add('autofilled'); 
                    onRfcInput(parsed.rfc);
                }
            }

            // 2. Razón Social / Denominación
            if (parsed.razonSocial) {
                const razonInput = document.getElementById('acc_comp_razon') || document.getElementById('acc_razon');
                if (razonInput) { 
                    razonInput.value = parsed.razonSocial; 
                    razonInput.classList.add('autofilled'); 
                    onRazonSocialInput(parsed.razonSocial);
                }

                // Autocompletar nombre comercial si está vacío
                const nameInput = document.getElementById('acc_comp_name');
                if (nameInput && !nameInput.value.trim()) {
                    nameInput.value = parsed.razonSocial;
                    nameInput.classList.add('autofilled');
                }
            }

            // 3. Régimen Fiscal
            if (parsed.regimenFiscal) {
                const regSelect = document.getElementById('acc_comp_regimen');
                const regInput = document.getElementById('acc_regimen');
                if (regSelect) {
                    const matchOpt = Array.from(regSelect.options).find(opt => 
                        opt.value.toLowerCase().includes(parsed.regimenFiscal.toLowerCase()) || 
                        parsed.regimenFiscal.toLowerCase().includes(opt.value.toLowerCase().substring(0, 3))
                    );
                    if (matchOpt) {
                        regSelect.value = matchOpt.value;
                    } else {
                        const newOpt = document.createElement('option');
                        newOpt.value = parsed.regimenFiscal;
                        newOpt.textContent = parsed.regimenFiscal;
                        regSelect.insertBefore(newOpt, regSelect.querySelector('option[value="__custom__"]'));
                        regSelect.value = parsed.regimenFiscal;
                    }
                    regSelect.classList.add('autofilled');
                } else if (regInput) {
                    regInput.value = parsed.regimenFiscal;
                    regInput.classList.add('autofilled');
                }
            }

            // 4. Código Postal y carga geográfica
            if (parsed.codigoPostalFiscal) {
                const cpInput = document.getElementById('acc_cp_fiscal');
                if (cpInput) { 
                    cpInput.value = parsed.codigoPostalFiscal; 
                    cpInput.classList.add('autofilled'); 
                    await onPostalCodeInput(parsed.codigoPostalFiscal, 'fiscal');
                }
            }

            // 5. Estado y Municipio
            if (parsed.estadoFiscal) {
                const edoInput = document.getElementById('acc_estado_fiscal');
                if (edoInput) { edoInput.value = parsed.estadoFiscal; edoInput.classList.add('autofilled'); }
            }
            if (parsed.municipioFiscal) {
                const munInput = document.getElementById('acc_municipio_fiscal');
                if (munInput) { munInput.value = parsed.municipioFiscal; munInput.classList.add('autofilled'); }
            }

            // 6. Colonia Fiscal (asegurar opción en select)
            if (parsed.coloniaFiscal) {
                const colSelect = document.getElementById('acc_colonia_fiscal');
                if (colSelect) {
                    const exists = Array.from(colSelect.options).some(opt => opt.value.toLowerCase() === parsed.coloniaFiscal.toLowerCase());
                    if (!exists) {
                        const newOpt = document.createElement('option');
                        newOpt.value = parsed.coloniaFiscal;
                        newOpt.textContent = parsed.coloniaFiscal;
                        const customOpt = colSelect.querySelector('option[value="__custom__"]');
                        if (customOpt) {
                            colSelect.insertBefore(newOpt, customOpt);
                        } else {
                            colSelect.appendChild(newOpt);
                        }
                    }
                    colSelect.value = parsed.coloniaFiscal;
                    colSelect.classList.add('autofilled');
                }
            }

            // 7. Calle y Números
            if (parsed.calleFiscal) {
                const calleInput = document.getElementById('acc_calle_fiscal');
                if (calleInput) { calleInput.value = parsed.calleFiscal; calleInput.classList.add('autofilled'); }
            }
            if (parsed.numExtFiscal) {
                const extInput = document.getElementById('acc_num_ext_fiscal');
                if (extInput) { extInput.value = parsed.numExtFiscal; extInput.classList.add('autofilled'); }
            }
            if (parsed.numIntFiscal) {
                const intInput = document.getElementById('acc_num_int_fiscal');
                if (intInput) { intInput.value = parsed.numIntFiscal; intInput.classList.add('autofilled'); }
            }

            // 8. Anexar archivo CSF en memoria
            pendingCsfFile = {
                fileName: file.name,
                fileData: parsed.fileData,
                fileSize: file.size,
                mimeType: file.type || 'application/pdf'
            };

            // Si es edición de empresa existente o usuario, subir directamente
            if (!isNewCompanyMode && currentTargetUserId) {
                await window.PortalDB.uploadExpedienteDoc({
                    entityType: currentEntityType || 'consultor',
                    entityId: currentTargetUserId,
                    documentType: 'csf',
                    documentTitle: currentEntityType === 'cliente' ? 'Constancia de Situación Fiscal (Empresa)' : 'Constancia de Situación Fiscal (SAT)',
                    fileName: file.name,
                    fileData: parsed.fileData,
                    fileSize: file.size,
                    mimeType: file.type || 'application/pdf'
                });
                pendingCsfFile = null;
                await saveAccountData(true);
            }

            window.NotificationUtils?.success?.('¡Constancia Fiscal analizada y autocompletada con éxito!');
        } catch (error) {
            console.error('Error al procesar CSF:', error);
            window.NotificationUtils?.error?.('No se pudo analizar la CSF: ' + error.message);
        }
    }

    async function uploadDocument(documentType, event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;
            try {
                window.NotificationUtils?.info?.('Cargando documento...', 2000);
                const result = await window.PortalDB.uploadExpedienteDoc({
                    entityType: currentEntityType || 'consultor',
                    entityId: currentTargetUserId,
                    documentType: documentType,
                    documentTitle: documentType.toUpperCase(),
                    fileName: file.name,
                    fileData: base64Data,
                    fileSize: file.size,
                    mimeType: file.type
                });

                if (result && (result.success || result.data)) {
                    window.NotificationUtils?.success?.('Documento subido a revisión');
                    const rootId = document.getElementById('accountWorkspaceRoot') ? 'accountWorkspaceRoot' : 'consultorAccountWorkspaceRoot';
                    await render(rootId, 'expedientes', currentTargetUserId);
                } else {
                    window.NotificationUtils?.error?.(result.message || 'Error al subir');
                }
            } catch (err) {
                window.NotificationUtils?.error?.('Error de red: ' + err.message);
            }
        };
        reader.readAsDataURL(file);
    }

    async function saveAccountData(isSilent = false) {
        if (currentEntityType === 'cliente' || isNewCompanyMode) {
            const compName = document.getElementById('acc_comp_name')?.value?.trim();
            if (!compName) {
                window.NotificationUtils?.error?.('El Nombre Comercial de la empresa es obligatorio.');
                document.getElementById('acc_comp_name')?.focus();
                return;
            }

            const rfcVal = document.getElementById('acc_comp_rfc')?.value?.trim()?.toUpperCase();
            if (rfcVal) {
                const rfcCheck = validateRFC(rfcVal);
                if (!rfcCheck.valid) {
                    window.NotificationUtils?.error?.(rfcCheck.message || 'El RFC ingresado no tiene una estructura válida ante el SAT.');
                    document.getElementById('acc_comp_rfc')?.focus();
                    return;
                }
            }

            const razonVal = document.getElementById('acc_comp_razon')?.value?.trim();
            if (razonVal && razonVal.length < 3) {
                window.NotificationUtils?.error?.('La Razón Social debe tener al menos 3 caracteres.');
                document.getElementById('acc_comp_razon')?.focus();
                return;
            }

            let regVal = document.getElementById('acc_comp_regimen')?.value || '';
            if (regVal === '__custom__') {
                regVal = document.getElementById('acc_comp_regimen_custom')?.value?.trim() || '';
            }

            let colFiscal = document.getElementById('acc_colonia_fiscal')?.value || '';
            if (colFiscal === '__custom__') {
                colFiscal = document.getElementById('acc_colonia_fiscal_custom')?.value?.trim() || '';
            }

            const companyPayload = {
                name: compName,
                razonSocial: razonVal || null,
                rfc: rfcVal || null,
                regimenFiscal: regVal || null,
                codigoPostalFiscal: document.getElementById('acc_cp_fiscal')?.value?.trim() || null,
                estadoFiscal: document.getElementById('acc_estado_fiscal')?.value?.trim() || null,
                municipioFiscal: document.getElementById('acc_municipio_fiscal')?.value?.trim() || null,
                coloniaFiscal: colFiscal || null,
                calleFiscal: document.getElementById('acc_calle_fiscal')?.value?.trim() || null,
                numExtFiscal: document.getElementById('acc_num_ext_fiscal')?.value?.trim() || null,
                numIntFiscal: document.getElementById('acc_num_int_fiscal')?.value?.trim() || null,
                paisFiscal: 'México',
                contactName: document.getElementById('acc_contact_name')?.value?.trim() || null,
                contactPosition: document.getElementById('acc_contact_position')?.value?.trim() || null,
                contactEmail: document.getElementById('acc_contact_email')?.value?.trim() || null,
                contactPhone: document.getElementById('acc_contact_phone')?.value?.trim() || null,
                isActive: true
            };

            try {
                let result;
                if (isNewCompanyMode || !currentTargetUserId) {
                    const timestamp = Date.now().toString().slice(-4);
                    companyPayload.companyId = `EMP${timestamp}`;
                    result = await window.PortalDB.createCompany(companyPayload);
                    
                    if (result.success) {
                        // Si se subió Constancia Fiscal en el registro, anexarla de inmediato
                        if (pendingCsfFile) {
                            try {
                                await window.PortalDB.uploadExpedienteDoc({
                                    entityType: 'cliente',
                                    entityId: companyPayload.companyId,
                                    documentType: 'csf',
                                    documentTitle: 'Constancia de Situación Fiscal (Empresa)',
                                    fileName: pendingCsfFile.fileName,
                                    fileData: pendingCsfFile.fileData,
                                    fileSize: pendingCsfFile.fileSize,
                                    mimeType: pendingCsfFile.mimeType
                                });
                                pendingCsfFile = null;
                            } catch (e) {
                                console.error('Error al anexar CSF en creación:', e);
                            }
                        }

                        if (!isSilent) window.NotificationUtils?.success?.(`¡Empresa ${companyPayload.name} registrada exitosamente!`);
                        if (isAdminView && typeof loadAllData === 'function') {
                            await loadAllData();
                        }
                        if (typeof showSection === 'function') {
                            showSection('empresas');
                        }
                    } else {
                        if (!isSilent) window.NotificationUtils?.error?.(result.message || 'Error al registrar empresa');
                    }
                } else {
                    result = await window.PortalDB.updateCompany(currentTargetUserId, companyPayload);
                    if (result.success) {
                        if (pendingCsfFile) {
                            try {
                                await window.PortalDB.uploadExpedienteDoc({
                                    entityType: 'cliente',
                                    entityId: currentTargetUserId,
                                    documentType: 'csf',
                                    documentTitle: 'Constancia de Situación Fiscal (Empresa)',
                                    fileName: pendingCsfFile.fileName,
                                    fileData: pendingCsfFile.fileData,
                                    fileSize: pendingCsfFile.fileSize,
                                    mimeType: pendingCsfFile.mimeType
                                });
                                pendingCsfFile = null;
                            } catch (e) {
                                console.error('Error al anexar CSF en actualización:', e);
                            }
                        }

                        if (!isSilent) window.NotificationUtils?.success?.('Datos de la empresa guardados exitosamente');
                        if (isAdminView && typeof loadAllData === 'function') {
                            loadAllData();
                        }
                    } else {
                        if (!isSilent) window.NotificationUtils?.error?.(result.message || 'Error al guardar');
                    }
                }
            } catch (e) {
                if (!isSilent) window.NotificationUtils?.error?.('Error al conectar con el servidor: ' + e.message);
            }
            return;
        }

        let colPersonal = document.getElementById('acc_colonia_personal')?.value || '';
        if (colPersonal === '__custom__') {
            colPersonal = document.getElementById('acc_colonia_personal_custom')?.value?.trim() || '';
        }

        let colFiscal = document.getElementById('acc_colonia_fiscal')?.value || '';
        if (colFiscal === '__custom__') {
            colFiscal = document.getElementById('acc_colonia_fiscal_custom')?.value?.trim() || '';
        }

        const payload = {
            name: document.getElementById('acc_name')?.value?.trim(),
            phone: document.getElementById('acc_phone')?.value?.trim(),
            
            // Domicilio personal detallado
            codigoPostal: document.getElementById('acc_cp_personal')?.value?.trim(),
            estado: document.getElementById('acc_estado_personal')?.value?.trim(),
            municipio: document.getElementById('acc_municipio_personal')?.value?.trim(),
            ciudad: document.getElementById('acc_municipio_personal')?.value?.trim(),
            colonia: colPersonal,
            calle: document.getElementById('acc_calle_personal')?.value?.trim(),
            numExterior: document.getElementById('acc_num_ext_personal')?.value?.trim(),
            numInterior: document.getElementById('acc_num_int_personal')?.value?.trim(),
            pais: document.getElementById('acc_pais_personal')?.value?.trim() || 'México',

            // Fiscal SAT detallado
            rfc: document.getElementById('acc_rfc')?.value?.trim()?.toUpperCase(),
            razonSocial: document.getElementById('acc_razon')?.value?.trim(),
            regimenFiscal: document.getElementById('acc_regimen')?.value?.trim(),
            codigoPostalFiscal: document.getElementById('acc_cp_fiscal')?.value?.trim(),
            estadoFiscal: document.getElementById('acc_estado_fiscal')?.value?.trim(),
            municipioFiscal: document.getElementById('acc_municipio_fiscal')?.value?.trim(),
            coloniaFiscal: colFiscal,
            calleFiscal: document.getElementById('acc_calle_fiscal')?.value?.trim(),
            numExtFiscal: document.getElementById('acc_num_ext_fiscal')?.value?.trim(),
            numIntFiscal: document.getElementById('acc_num_int_fiscal')?.value?.trim(),

            // Bancarios
            clabe: document.getElementById('acc_clabe')?.value?.trim(),
            bankName: document.getElementById('acc_bank')?.value?.trim()
        };

        const passVal = document.getElementById('acc_password')?.value?.trim();
        if (passVal) {
            payload.password = passVal;
        }

        try {
            const result = await window.PortalDB.updateAccountInfo(currentTargetUserId, payload);
            if (result.success) {
                if (!isSilent) window.NotificationUtils?.success?.('Datos guardados exitosamente');
                if (isAdminView && typeof loadAllData === 'function') {
                    loadAllData();
                }
            } else {
                if (!isSilent) window.NotificationUtils?.error?.(result.message || 'Error al guardar');
            }
        } catch (e) {
            if (!isSilent) window.NotificationUtils?.error?.('Error al conectar con el servidor');
        }
    }

    function togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (btn) {
            btn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        }
    }

    function generateNewPassword(inputId) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let pass = '';
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const input = document.getElementById(inputId);
        if (input) {
            input.value = pass;
            input.type = 'text';
            input.classList.add('autofilled');
            window.NotificationUtils?.info?.('Contraseña generada: ' + pass, 4000);
        }
    }

    function previewDocument(docIdOrType) {
        const expData = currentTargetExpediente?.data || currentTargetExpediente || {};
        let doc = null;
        if (Array.isArray(expData.checklist)) {
            const item = expData.checklist.find(c => (c.doc?.docId === docIdOrType || c.documentType === docIdOrType));
            doc = item?.doc;
        }

        if (!doc || !doc.fileData) {
            window.NotificationUtils?.error?.('No hay archivo disponible para previsualizar');
            return;
        }

        const win = window.open();
        if (doc.mimeType?.includes('pdf') || doc.fileData.startsWith('data:application/pdf')) {
            win.document.write(`<iframe src="${doc.fileData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            win.document.write(`<img src="${doc.fileData}" style="max-width:100%; height:auto; display:block; margin:20px auto;" />`);
        }
    }

    function adminReviewDoc(docId, docTitle, docType) {
        if (!window.ExpedientesMatrix) return;
        window.ExpedientesMatrix.openDocReviewModal(docId, docTitle, currentTargetUserId, currentTargetUser?.name, docType);
    }

    async function openCompanyForm(companyId = null, initialTab = 'datos') {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.sidebar-menu-item').forEach(m => m.classList.remove('active'));

        const section = document.getElementById('mi-cuenta-section');
        if (section) {
            section.classList.add('active');
            const rootId = 'accountWorkspaceRoot';
            if (companyId) {
                await render(rootId, initialTab, companyId, {
                    entityType: 'cliente',
                    isReadOnlyData: false,
                    isNewCompany: false
                });
            } else {
                await render(rootId, 'datos', null, {
                    entityType: 'cliente',
                    isReadOnlyData: false,
                    isNewCompany: true
                });
            }
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    return {
        init,
        render,
        switchTab,
        saveAccountData,
        handleCSFUpload,
        uploadDocument,
        previewDocument,
        adminReviewDoc,
        togglePasswordVisibility,
        generateNewPassword,
        copyPersonalToFiscal,
        onPostalCodeInput,
        onColoniaSelect,
        onCustomColoniaInput,
        onRfcInput,
        onRazonSocialInput,
        onRegimenSelect,
        openCompanyForm,
        validateRFC
    };
})();
