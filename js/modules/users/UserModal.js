/**
 * UserModal.js
 * 
 * Responsabilidad: Interfaz de usuario (UI) para gestión de usuarios
 * Principio SOLID: Single Responsibility - Solo maneja la interfaz
 * 
 * Este componente:
 * - Muestra modales (crear, editar)
 * - Captura datos de formularios
 * - Llama a UserService (NO maneja lógica de negocio)
 * - Muestra notificaciones de éxito/error
 */

window.UserModal = class UserModal {
    /**
     * @param {UserService} userService - Servicio de lógica de negocio
     * @param {Object} notifier - Sistema de notificaciones (window.NotificationUtils)
     */
    constructor(userService, notifier) {
        if (!userService) {
            throw new Error('UserModal requiere UserService');
        }
        if (!notifier) {
            throw new Error('UserModal requiere NotificationUtils');
        }
        
        this.userService = userService;
        this.notifier = notifier;
        this.currentModal = null;
    }

    /**
     * Abrir modal de edición de usuario
     * @param {string} userId - ID del usuario a editar
     */
    async openEdit(userId) {
        try {
            console.log(`UserModal.openEdit(${userId})`);

            // Obtener datos del usuario
            const user = await this.userService.getById(userId);
            
            if (!user) {
                this.notifier.error('Usuario no encontrado');
                return;
            }

            // Renderizar modal
            this.renderEditModal(user);
            
            // Adjuntar event handlers
            this.attachEditHandlers(userId);

        } catch (error) {
            console.error('Error en openEdit:', error);
            this.notifier.error('Error al abrir modal de edición');
        }
    }

    /**
     * Renderizar HTML del modal de edición
     * @param {Object} user - Datos del usuario
     */
    renderEditModal(user) {
        const modalHTML = `
            <div class="modal" id="editUserModal" style="display: flex;">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            Editar Usuario          
                        </h2>
                        <button class="close" onclick="window.userModule.closeEditModal()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="editUserForm" class="admin-form">
                            <input type="hidden" id="editUserId" value="${user.userId}">
                            
                            <!-- ID de Usuario (no editable) -->
                            <div class="form-group">
                                <label>ID de Usuario</label>
                                <input type="text" value="${user.userId}" disabled 
                                       style="background: #f5f5f5; cursor: not-allowed; color: #666;">
                                <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 5px;">
                                   El ID no puede modificarse
                                </small>
                            </div>
                            
                            <!-- Nombre -->
                            <div class="form-group">
                                <label for="editUserName">
                                   Nombre Completo *
                                </label>
                                <input type="text" 
                                       id="editUserName" 
                                       value="${user.name}" 
                                       placeholder="Ej: Juan Pérez García" 
                                       required>
                            </div>
                            
                            <!-- Email -->
                            <div class="form-group">
                                <label for="editUserEmail">
                                   Email
                                </label>
                                <input type="email" 
                                       id="editUserEmail" 
                                       value="${user.email || ''}" 
                                       placeholder="usuario@empresa.com">
                            </div>

                            <!-- Rol -->
                            <div class="form-group">
                                <label for="editUserRole">Rol del Usuario</label>
                                <select id="editUserRole" ${user.userId === 'admin' ? 'disabled' : ''} onchange="window.userModule?.handleEditRoleChange?.(this.value)">
                                    <option value="consultor" ${user.role === 'consultor' ? 'selected' : ''}>Consultor Profesional</option>
                                    <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente / Empresa</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador (Acceso Total)</option>
                                </select>
                                ${user.userId === 'admin' ? '<small style="color: #666; font-size: 0.85rem; display: block; margin-top: 5px;">El rol del administrador principal no puede ser modificado.</small>' : ''}
                            </div>

                            <!-- Empresa Asignada (solo para cliente) -->
                            <div class="form-group" id="editCompanyGroup" style="${user.role === 'cliente' ? 'display:block;' : 'display:none;'}">
                                <label for="editUserCompany">Empresa Asignada *</label>
                                <select id="editUserCompany">
                                    <option value="">-- Seleccionar Empresa --</option>
                                    ${(window.PortalDB?.cache?.companies ? Object.values(window.PortalDB.cache.companies) : []).map(c => `
                                        <option value="${c.companyId || c.id}" ${(user.companyId === (c.companyId || c.id)) ? 'selected' : ''}>
                                            ${c.name || c.companyId}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <!-- Nueva Contraseña -->
                            <div class="form-group">
                                <label for="editUserPassword">
                                    Nueva Contraseña
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" 
                                           id="editUserPassword" 
                                           placeholder="Escriba una contraseña segura"
                                           style="flex: 1;">
                                    <button type="button" 
                                            class="btn btn-secondary" 
                                            id="generatePasswordBtn"
                                            style="white-space: nowrap; padding: 0 15px;"
                                            title="Generar contraseña segura aleatoria">
                                        <i class="fa-solid fa-rotate"></i> Generar
                                    </button>
                                </div>
                                <div id="passwordStrengthMeter" class="password-strength-meter" style="margin-top: 8px; display: none;">
                                    <div class="strength-bar-bg">
                                        <div id="strengthBar" class="strength-bar"></div>
                                    </div>
                                    <span id="strengthLabel" class="strength-label"></span>
                                </div>
                                <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 5px;">
                                    Dejar vacío para mantener la contraseña actual
                                </small>
                                <small style="color: #e74c3c; font-size: 0.85rem; display: block; margin-top: 5px;">
                                    <strong>Importante:</strong> Por seguridad, cada consultor debe tener una contraseña única
                                </small>
                            </div>
                            
                            <!-- Mensaje informativo -->
                            <div class="message message-info" style="margin-top: 20px;">
                                <strong>Nota:</strong> Los cambios se aplicarán inmediatamente al guardar.
                            </div>
                            
                            <!-- Botones de acción -->
                            <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                                <button type="button" 
                                        class="btn btn-secondary" 
                                        onclick="window.userModule.closeEditModal()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const existingModal = document.getElementById('editUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Insertar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.currentModal = document.getElementById('editUserModal');
    }

    /**
     * Adjuntar event handlers al modal de edición
     * @param {string} userId - ID del usuario
     */
    attachEditHandlers(userId) {
        // Handler para el formulario (submit)
        const form = document.getElementById('editUserForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleEditSubmit(userId);
            });
        }

        // Handler para generar contraseña
        const generateBtn = document.getElementById('generatePasswordBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                await this.handleGeneratePassword(userId);
            });
        }

        // Handler para medir fuerza de contraseña en tiempo real
        const passwordInput = document.getElementById('editUserPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.updateStrengthMeter(passwordInput.value);
            });
        }
    }

    /**
     * Manejar el envío del formulario de edición
     * @param {string} userId - ID del usuario
     */
    async handleEditSubmit(userId) {
        try {
            console.log(`Enviando actualización de usuario ${userId}`);

            // Capturar datos del formulario
            const formData = {
                name: document.getElementById('editUserName').value.trim(),
                email: document.getElementById('editUserEmail').value.trim(),
                password: document.getElementById('editUserPassword').value.trim(),
                role: document.getElementById('editUserRole') ? document.getElementById('editUserRole').value : undefined
            };

            // Preparar datos de actualización
            const updateData = {
                name: formData.name,
                email: formData.email || `${userId.toLowerCase()}@grupoitarvic.com`,
                updatedAt: new Date().toISOString()
            };
            
            if (formData.role && userId !== 'admin') {
                updateData.role = formData.role;
                if (formData.role === 'cliente') {
                    const compSelect = document.getElementById('editUserCompany');
                    if (compSelect && compSelect.value) {
                        updateData.companyId = compSelect.value;
                        const companies = window.PortalDB?.cache?.companies ? Object.values(window.PortalDB.cache.companies) : [];
                        const compObj = companies.find(c => (c.companyId || c.id) === compSelect.value);
                        updateData.companyName = compObj ? compObj.name : compSelect.value;
                    }
                }
            }

            // Solo incluir contraseña si se proporcionó una nueva
            if (formData.password) {
                updateData.password = formData.password;
            }

            //console.log('📋 Datos a actualizar:', updateData);

            // Llamar al servicio (él valida y guarda)
            const result = await this.userService.update(userId, updateData);

            // Mostrar mensaje de éxito
            if (result.passwordChanged) {
                this.notifier.success(
                    `Usuario actualizado exitosamente.\n\n` +
                    `Nueva contraseña: ${formData.password}\n\n` +
                    `IMPORTANTE: Comparta esta contraseña de forma segura.`
                );
            } else {
                this.notifier.success('Usuario actualizado correctamente');
            }

            // Cerrar modal
            this.closeEditModal();

            // Recargar datos (compatibilidad con código legacy)
            if (typeof window.loadAllData === 'function') {
                await window.loadAllData();
            }

            console.log('Actualización completada');

        } catch (error) {
            console.error('Error en handleEditSubmit:', error);
            this.notifier.error(error.message || 'Error al actualizar usuario');
        }
    }

    /**
     * Generar contraseña única y mostrarla en el campo
     * @param {string} excludeUserId - Usuario a excluir (el actual)
     */
    async handleGeneratePassword(excludeUserId) {
        try {
            console.log('Generando contraseña única...');

            const password = await this.userService.generatePassword(excludeUserId);
            
            // Establecer en el input
            const passwordInput = document.getElementById('editUserPassword');
            if (passwordInput) {
                passwordInput.value = password;
            }

            // Actualizar medidor de fuerza
            this.updateStrengthMeter(password);

            // Feedback visual
            this.notifier.success(`Contraseña generada: ${password}`);

        } catch (error) {
            console.error('Error al generar contraseña:', error);
            this.notifier.error('No se pudo generar una contraseña única');
        }
    }

    /**
     * Actualizar la barra visual de fuerza de contraseña
     * @param {string} password
     */
    updateStrengthMeter(password) {
        const meter = document.getElementById('passwordStrengthMeter');
        const bar = document.getElementById('strengthBar');
        const label = document.getElementById('strengthLabel');
        if (!meter || !bar || !label) return;

        if (!password || password.length === 0) {
            meter.style.display = 'none';
            return;
        }

        meter.style.display = 'flex';

        // Usar la función del UserValidator si disponible, sino calcular internamente
        let strength;
        if (this.userService && this.userService.validator && this.userService.validator.calculatePasswordStrength) {
            strength = this.userService.validator.calculatePasswordStrength(password);
        } else {
            // Fallback
            let score = 0;
            if (password.length >= 6) score += 20;
            if (password.length >= 10) score += 10;
            if (/[A-Z]/.test(password)) score += 20;
            if (/[a-z]/.test(password)) score += 20;
            if (/[0-9]/.test(password)) score += 20;
            if (/[^A-Za-z0-9]/.test(password)) score += 10;
            if (score <= 40) strength = { score, label: 'Débil', color: '#ff4d4f', class: 'strength-weak' };
            else if (score <= 70) strength = { score, label: 'Media', color: '#faad14', class: 'strength-medium' };
            else strength = { score, label: 'Fuerte', color: '#52c41a', class: 'strength-strong' };
        }

        bar.style.width = strength.score + '%';
        bar.style.backgroundColor = strength.color;
        bar.className = 'strength-bar ' + strength.class;
        label.textContent = strength.label;
        label.style.color = strength.color;
    }

    /**
     * Cerrar el modal de edición
     */
    closeEditModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.remove();
            this.currentModal = null;
        }
    }

    /**
     * Abrir modal de creación de nuevo usuario con ID auto-generado
     */
    openCreate(defaultData = {}) {
        const companies = window.PortalDB?.cache?.companies ? Object.values(window.PortalDB.cache.companies) : [];
        const isClientRole = defaultData.role === 'cliente' || !!defaultData.companyId;
        const selectedCompanyId = defaultData.companyId || '';

        const companiesOptions = companies.map(c => {
            const cid = c.companyId || c.id;
            const isSel = (cid === selectedCompanyId) ? 'selected' : '';
            return `<option value="${cid}" ${isSel}>${c.name || cid}</option>`;
        }).join('');

        const modalHTML = `
            <div class="modal" id="createUserModal" style="display: flex;">
                <div class="modal-content" style="max-width: 520px;">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <i class="fa-solid fa-user-plus"></i> ${isClientRole ? 'Crear Usuario de Acceso para Empresa' : 'Nuevo Usuario'}
                        </h2>
                        <button class="close" onclick="window.userModule.closeCreateModal()">&times;</button>
                    </div>

                    <div class="modal-body" style="padding: 24px;">
                        <form id="createUserForm" onsubmit="window.userModule.handleCreateSubmit(event)">
                            
                            <!-- Nombre Completo -->
                            <div class="form-group">
                                <label for="createUserName">Nombre del Contacto / Usuario *</label>
                                <input type="text" id="createUserName" value="${defaultData.name || ''}" placeholder="Ej: Lic. Carlos Mendoza" required>
                            </div>
                            
                            <!-- Email -->
                            <div class="form-group">
                                <label for="createUserEmail">Correo Electrónico (Login) *</label>
                                <input type="email" id="createUserEmail" value="${defaultData.email || ''}" placeholder="carlos.mendoza@empresa.com" required>
                                <small style="color: #64748b; font-size: 0.82rem; margin-top: 4px; display: block;">
                                    A este correo se enviará el enlace de activación con el que el cliente creará su contraseña de acceso.
                                </small>
                            </div>

                            <!-- Rol -->
                            <div class="form-group" ${isClientRole ? 'style="display:none;"' : ''}>
                                <label for="createUserRole">Rol del Usuario *</label>
                                <select id="createUserRole" onchange="window.userModule.handleRoleChange(this.value)">
                                    <option value="consultor" selected>Consultor Profesional</option>
                                    <option value="admin">Administrador (Acceso Total)</option>
                                    ${isClientRole ? '<option value="cliente" selected>Cliente / Empresa</option>' : ''}
                                </select>
                            </div>
                            ${isClientRole ? '<input type="hidden" id="createUserRole" value="cliente">' : ''}

                            <!-- Empresa Asignada (solo para cliente) -->
                            <div class="form-group" id="createCompanyGroup" style="display: ${isClientRole ? 'block' : 'none'};">
                                <label for="createUserCompany">Empresa Asignada *</label>
                                <select id="createUserCompany">
                                    <option value="">-- Seleccionar Empresa --</option>
                                    ${companiesOptions}
                                </select>
                            </div>


                            <!-- Checkbox de Activación -->
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 14px; margin: 14px 0;">
                                <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin: 0; font-size: 0.88rem; color: #166534; font-weight: 500;">
                                    <input type="checkbox" id="createSendActivation" checked onchange="window.userModule.toggleManualPassword(this.checked)" style="margin-top: 3px;">
                                    <span><strong>Envío automático de invitación:</strong> El usuario recibirá un correo para activar su cuenta y crear su propia contraseña.</span>
                                </label>
                            </div>

                            <!-- Contraseña Manual Opcional -->
                            <div id="manualPasswordGroup" style="display: none;" class="form-group">
                                <label for="createManualPassword">Asignar Contraseña Manualmente</label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" id="createManualPassword" placeholder="Contraseña personalizada" minlength="10">
                                    <button type="button" class="btn btn-secondary" onclick="window.userModule.generateCreatePassword()" style="white-space: nowrap; padding: 8px 12px; font-size: 0.85rem;">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i> Generar
                                    </button>
                                </div>
                            </div>

                            <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                                <button type="button" class="btn btn-secondary" onclick="window.userModule.closeCreateModal()">Cancelar</button>
                                <button type="submit" class="btn btn-primary" id="btnSubmitCreateUser">
                                    <i class="fa-solid fa-paper-plane"></i> Crear y Enviar Invitación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remover modal previo si existe
        this.closeCreateModal();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.currentModal = document.getElementById('createUserModal');
        document.getElementById('createUserName').focus();
    }


    closeCreateModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) modal.remove();
    }

    handleRoleChange(role) {
        const companyGroup = document.getElementById('createCompanyGroup');
        if (companyGroup) {
            companyGroup.style.display = (role === 'cliente') ? 'block' : 'none';
        }
    }

    handleEditRoleChange(role) {
        const companyGroup = document.getElementById('editCompanyGroup');
        if (companyGroup) {
            companyGroup.style.display = (role === 'cliente') ? 'block' : 'none';
        }
    }

    toggleManualPassword(sendActivation) {
        const group = document.getElementById('manualPasswordGroup');
        const submitBtn = document.getElementById('btnSubmitCreateUser');
        if (group) group.style.display = sendActivation ? 'none' : 'block';
        if (submitBtn) {
            submitBtn.innerHTML = sendActivation 
                ? '<i class="fa-solid fa-paper-plane"></i> Crear y Enviar Invitación' 
                : '<i class="fa-solid fa-check"></i> Crear Usuario con Contraseña';
        }
    }

    async generateCreatePassword() {
        const pwd = await this.userService.validator.generateUniquePassword();
        const input = document.getElementById('createManualPassword');
        if (input) input.value = pwd;
    }

    async handleCreateSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('createUserName').value.trim();
        const email = document.getElementById('createUserEmail').value.trim();
        const role = document.getElementById('createUserRole').value;
        const sendActivation = document.getElementById('createSendActivation').checked;
        const manualPwd = document.getElementById('createManualPassword')?.value.trim();

        const btn = document.getElementById('btnSubmitCreateUser');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creando...';

        try {
            const payload = {
                name,
                email,
                role,
                sendActivationEmail: sendActivation
            };

            if (role === 'cliente') {
                const compSelect = document.getElementById('createUserCompany');
                if (!compSelect || !compSelect.value) {
                    throw new Error('Debe seleccionar una empresa para el usuario cliente');
                }
                payload.companyId = compSelect.value;
                const companies = window.PortalDB?.cache?.companies ? Object.values(window.PortalDB.cache.companies) : [];
                const compObj = companies.find(c => (c.companyId || c.id) === compSelect.value);
                payload.companyName = compObj ? compObj.name : compSelect.value;
            }

            if (!sendActivation && manualPwd) {
                payload.password = manualPwd;
            }

            const res = await this.userService.create(payload);

            this.notifier.success(sendActivation 
                ? `¡Usuario ${name} registrado! Se ha enviado el correo de activación a ${email}.`
                : `¡Usuario ${name} creado con éxito!`
            );

            this.closeCreateModal();

            if (typeof window.loadAllData === 'function') {
                await window.loadAllData();
            } else if (typeof window.renderConsultoresTable === 'function') {
                await window.renderConsultoresTable();
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            this.notifier.error(error.message || 'Error al crear usuario');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Crear y Enviar Invitación';
        }
    }
}