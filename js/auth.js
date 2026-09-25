/**
 * === SISTEMA DE AUTENTICACIÓN PARA PORTAL ARVIC ===
 * Maneja login, logout, sesiones y permisos
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'arvic_current_session';
        this.lastStorageUpdate = 0;
        this.loadCurrentSession();
    }

    // === UTILIDADES DE TOKEN JWT ===
    isTokenExpired(token) {
        if (!token || typeof token !== 'string') return true;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            // Decodificar Base64Url de JWT payload
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (!payload || !payload.exp) return false;
            // Si el tiempo de expiración (en ms) ya pasó con margen de 30 segundos
            return (payload.exp * 1000) <= (Date.now() + 30000);
        } catch (e) {
            console.warn('⚠️ Error al decodificar token JWT:', e);
            return true;
        }
    }

    clearSession() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem('arvic_token');
        localStorage.removeItem('arvic_admin_prefetched_data');
        localStorage.removeItem('arvic_consultor_prefetched_data');
        localStorage.removeItem('arvic_cliente_prefetched_data');
        sessionStorage.removeItem('arvic_token');
        sessionStorage.removeItem('arvic_support_bot_history');
        this.currentUser = null;
    }

    handleSessionExpired(message = 'Tu sesión ha expirado por seguridad. Redirigiendo al inicio de sesión...') {
        console.warn('⚠️ Sesión expirada o token inválido:', message);
        this.clearSession();
        if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show(message, 'warning', 4000);
        }
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    }

    // === GESTIÓN DE SESIONES ===
    loadCurrentSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            const token = localStorage.getItem('arvic_token') || sessionStorage.getItem('arvic_token');

            if (sessionData && token) {
                // 1. Verificar si el token JWT ya caducó antes de intentar usarlo
                if (this.isTokenExpired(token)) {
                    console.log('⏳ Token JWT expirado detectado en cliente.');
                    this.clearSession();
                    this.redirectToLogin();
                    return false;
                }

                const session = JSON.parse(sessionData);
                const currentTime = new Date();
                
                // 2. Margen de inactividad amigable para móviles y multi-dispositivo (24 horas)
                const lastActiveTime = session.lastActivity ? new Date(session.lastActivity) : new Date(session.loginTime || currentTime);
                const hoursInactive = (currentTime - lastActiveTime) / (1000 * 60 * 60);
                
                if (hoursInactive >= 24) {
                    console.log('⏳ Sesión expirada por inactividad de más de 24 horas.');
                    this.clearSession();
                    this.redirectToLogin();
                    return false;
                }

                // 3. Límite de sesión sincronizado con el token JWT (30 días)
                const sessionTime = session.loginTime ? new Date(session.loginTime) : currentTime;
                const daysDiff = (currentTime - sessionTime) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 30) {
                    this.currentUser = session.user;
                    setTimeout(() => this.validateTokenWithServer(), 150);
                    return true;
                } else {
                    console.log('⏳ Sesión superó el límite de 30 días.');
                    this.handleSessionExpired('Tu sesión ha superado el tiempo máximo de 30 días.');
                }
            } else if (sessionData && !token) {
                // Inconsistencia: sesión en caché pero sin token
                this.clearSession();
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.clearSession();
        }
        return false;
    }

    async validateTokenWithServer() {
        const token = localStorage.getItem('arvic_token') || sessionStorage.getItem('arvic_token');
        if (!window.PortalDB || !token) return;
        
        // Validación preventiva en cliente
        if (this.isTokenExpired(token)) {
            console.warn('⚠️ Token expirado según fecha de validez.');
            this.handleSessionExpired();
            return;
        }

        try {
            const result = await window.PortalDB.validateToken();
            if (result && result.success && result.user) {
                const currentSession = JSON.parse(localStorage.getItem(this.sessionKey));
                if (currentSession) {
                    // Si el rol de usuario cambió en la BD, redirigir al panel correspondiente
                    if (currentSession.user.role !== result.user.role) {
                        console.log('🔄 Rol de usuario actualizado de', currentSession.user.role, 'a', result.user.role);
                        currentSession.user = result.user;
                        localStorage.setItem(this.sessionKey, JSON.stringify(currentSession));
                        this.currentUser = result.user;
                        this.redirectToAppropriatePanel();
                    } else {
                        // Actualizar información fresca
                        currentSession.user = result.user;
                        localStorage.setItem(this.sessionKey, JSON.stringify(currentSession));
                        this.currentUser = result.user;
                    }
                }
            } else {
                console.warn('⚠️ Token de sesión inválido en el servidor. Redirigiendo...');
                this.handleSessionExpired();
            }
        } catch (e) {
            console.error('❌ Error al validar token con el servidor:', e);
        }
    }

    saveCurrentSession(user) {
        try {
            const sessionData = {
                user: user,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            this.currentUser = user;
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    }

    updateLastActivity() {
        try {
            const now = Date.now();
            // Throttling: evitar escrituras masivas en localStorage (máximo una escritura cada 10 segundos)
            if (now - this.lastStorageUpdate < 10000) return;
            this.lastStorageUpdate = now;

            const sessionData = localStorage.getItem(this.sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                session.lastActivity = new Date().toISOString();
                localStorage.setItem(this.sessionKey, JSON.stringify(session));
            }
        } catch (error) {
            console.error('Error updating activity:', error);
        }
    }

    // === LOGIN Y LOGOUT ===
    async login(userId, password) {
    try {
        console.log('Intentando login con:', userId, password);
        
        // Validar campos requeridos
        if (!userId || !password) {
            return {
                success: false,
                message: 'Usuario y contraseña son requeridos'
            };
        }

        // Primero validar usuario en la base de datos
        const validation = await window.PortalDB.validateUser(userId, password);
        console.log('Resultado validación DB:', validation);
        
        if (!validation.success) {
            return {
                success: false,
                message: 'Usuario o contraseña incorrectos'
            };
        }

        const user = validation.user;
        console.log('Usuario encontrado:', user);

        // Detectar tipo automáticamente basado en el usuario obtenido
        let detectedUserType = user.role;

        /*
        // Verificación adicional de seguridad
        if (userId === 'admin' && password !== 'hperez1402.') {
            return {
                success: false,
                message: 'Credenciales incorrectas'
            };
        }
        */

        if (userId !== 'admin' && user.role === 'consultor') {
            // Ya no se requiere un formato estricto de contraseña
        }
        // Guardar sesión
        const sessionSaved = this.saveCurrentSession(user);
        
        if (!sessionSaved) {
            return {
                success: false,
                message: 'Error al iniciar sesión'
            };
        }

        this.logActivity('login', `Usuario ${userId} inició sesión como ${user.role}`);

        return {
            success: true,
            user: user,
            message: 'Inicio de sesión exitoso'
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'Error interno del sistema'
        };
    }
}

    // Función isConsultorPassword eliminada para permitir cualquier formato


    async logout() {
        try {
            if (this.currentUser) {
                this.logActivity('logout', `Usuario ${this.currentUser.id} cerró sesión`);
                
                // Avisar al servidor que nos desconectamos
                try {
                    const token = localStorage.getItem('arvic_token');
                    const apiBase = (window.PortalDB && window.PortalDB.API_URL) 
                        ? window.PortalDB.API_URL.replace(/\/api\/?$/, '') 
                        : '';
                    if (token) {
                        await fetch(`${apiBase}/api/chat/status`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: 'offline' })
                        });
                    }
                } catch (err) {
                    console.error('Error al notificar logout al chat:', err);
                }
            }
            
            localStorage.removeItem(this.sessionKey);
            localStorage.removeItem('arvic_token');
            sessionStorage.removeItem('arvic_support_bot_history'); // Limpiar el historial del bot de soporte al cerrar sesión
            this.currentUser = null;
            
            // Redirigir al login
            this.redirectToLogin();
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    // === VERIFICACIÓN DE PERMISOS ===
    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    isAdmin() {
        return this.hasRole('admin');
    }

    isConsultor() {
        return this.hasRole('consultor');
    }

    isCliente() {
        return this.hasRole('cliente');
    }

    canAccessAdminPanel() {
        return this.isAdmin();
    }

    canAccessConsultorPanel() {
        return this.isConsultor();
    }

    canAccessClientePanel() {
        return this.isCliente();
    }

    // === PROTECCIÓN DE RUTAS ===
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        this.updateLastActivity();
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            this.showError('Acceso denegado: Se requieren permisos de administrador');
            this.redirectToAppropriatePanel();
            return false;
        }
        
        return true;
    }

    requireConsultor() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isConsultor()) {
            this.showError('Acceso denegado: Se requieren permisos de consultor');
            this.redirectToAppropriatePanel();
            return false;
        }
        
        return true;
    }

    requireCliente() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isCliente()) {
            this.showError('Acceso denegado: Se requieren permisos de cliente');
            this.redirectToAppropriatePanel();
            return false;
        }
        
        return true;
    }

    redirectToLogin() {
        // En Vercel o en servidor (localhost:3000), la ruta del login es siempre "/" 
        // ya que el backend de Express (api/index.js) mapea "/" a "index.html".
        let loginPath = '/';
        
        // Fallback por si lo están abriendo directamente con doble clic en el archivo HTML local
        if (window.location.protocol === 'file:') {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/admin/') || currentPath.includes('/consultor/') || currentPath.includes('/cliente/')) {
                loginPath = '../index.html';
            } else {
                loginPath = 'index.html';
            }
        }
        
        window.location.href = loginPath;
    }

    redirectToAppropriatePanel() {
        if (this.isAdmin()) {
            window.location.href = '../admin/dashboard.html';
        } else if (this.isConsultor()) {
            window.location.href = '../consultor/dashboard.html';
        } else if (this.isCliente()) {
            window.location.href = '../cliente/dashboard.html';
        } else {
            this.redirectToLogin();
        }
    }


    // === UTILIDADES ===
    showError(message) {
        // Mostrar mensaje de error en la interfaz
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        // Mostrar mensaje de éxito en la interfaz
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        } else {
            console.log('Success:', message);
        }
    }

    logActivity(action, description) {
        try {
            const activities = JSON.parse(localStorage.getItem('arvic_activities') || '[]');
            
            const activity = {
                id: Date.now().toString(),
                userId: this.currentUser ? this.currentUser.id : 'anonymous',
                action: action,
                description: description,
                timestamp: new Date().toISOString(),
                ip: 'local', // En un entorno real, obtendría la IP
                userAgent: navigator.userAgent
            };
            
            activities.unshift(activity);
            
            // Mantener solo las últimas 100 actividades
            if (activities.length > 100) {
                activities.splice(100);
            }
            
            localStorage.setItem('arvic_activities', JSON.stringify(activities));
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    getRecentActivities(limit = 10) {
        try {
            const activities = JSON.parse(localStorage.getItem('arvic_activities') || '[]');
            return activities.slice(0, limit);
        } catch (error) {
            console.error('Error getting activities:', error);
            return [];
        }
    }

    // === VALIDACIONES DE SEGURIDAD ===
    validatePassword(password) {
        if (!password || password.length < 6) {
            return {
                valid: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            };
        }
        
        return { valid: true };
    }

    validateUserId(userId) {
        if (!userId || userId.length < 1) {
            return {
                valid: false,
                message: 'El ID de usuario es requerido'
            };
        }
        
        // Validar formato de ID para consultores (debe ser numérico de 4 dígitos)
        if (userId !== 'admin' && !/^\d{4}$/.test(userId)) {
            return {
                valid: false,
                message: 'El ID de consultor debe ser de 4 dígitos'
            };
        }
        
        return { valid: true };
    }

    // === GESTIÓN DE CONTRASEÑAS ===
    changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                message: 'Debe estar autenticado para cambiar la contraseña'
            };
        }

        // Verificar contraseña actual
        if (this.currentUser.password !== currentPassword) {
            return {
                success: false,
                message: 'La contraseña actual es incorrecta'
            };
        }

        // Validar nueva contraseña
        const validation = this.validatePassword(newPassword);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        // Actualizar contraseña en la base de datos
        const updateResult = window.PortalDB.updateUser(this.currentUser.id, {
            password: newPassword
        });

        if (updateResult.success) {
            // Actualizar sesión actual
            this.currentUser.password = newPassword;
            this.saveCurrentSession(this.currentUser);
            
            this.logActivity('password_change', 'Usuario cambió su contraseña');
            
            return {
                success: true,
                message: 'Contraseña actualizada correctamente'
            };
        }

        return {
            success: false,
            message: 'Error al actualizar la contraseña'
        };
    }

    // === AUTO LOGOUT POR INACTIVIDAD ===
    startInactivityTimer() {
        let inactivityTimer;
        // 24 horas de inactividad en segundo plano (amigable para móviles, laptops y tablets)
        const INACTIVITY_TIME = 24 * 60 * 60 * 1000;

        const resetTimer = () => {
            // Actualizar timestamp en localStorage
            this.updateLastActivity();
            
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('⏳ Inactividad prolongada (24 horas). Cerrando sesión automáticamente.');
                this.handleSessionExpired('Tu sesión ha expirado por inactividad prolongada.');
            }, INACTIVITY_TIME);
        };

        // Eventos que resetean el timer e indican actividad
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        resetTimer();
    }
}

// Crear instancia global del sistema de autenticación
window.AuthSys = new AuthSystem();

// Iniciar timer de inactividad si hay una sesión activa
if (window.AuthSys.isAuthenticated()) {
    window.AuthSys.startInactivityTimer();
}