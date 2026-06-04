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

    // === GESTIÓN DE SESIONES ===
    loadCurrentSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                
                // Verificar si la sesión ha expirado por inactividad de 10 minutos (pestaña cerrada, etc.)
                const lastActiveTime = session.lastActivity ? new Date(session.lastActivity) : new Date(session.loginTime);
                const currentTime = new Date();
                const minutesDiff = (currentTime - lastActiveTime) / (1000 * 60);
                
                if (minutesDiff >= 10) {
                    console.log('⏳ Sesión expirada por inactividad de 10 minutos.');
                    // Limpiar datos locales directamente antes de redireccionar
                    localStorage.removeItem(this.sessionKey);
                    localStorage.removeItem('arvic_token');
                    this.currentUser = null;
                    this.redirectToLogin();
                    return false;
                }

                // Verificar si la sesión no ha expirado por fecha límite global (24 horas)
                const sessionTime = new Date(session.loginTime);
                const hoursDiff = (currentTime - sessionTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    this.currentUser = session.user;
                    
                    // 👇 NUEVO: Validar token con el servidor en segundo plano
                    setTimeout(() => this.validateTokenWithServer(), 100);
                    
                    return true;
                } else {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.logout();
        }
        return false;
    }

    async validateTokenWithServer() {
        if (!window.PortalDB || !localStorage.getItem('arvic_token')) return;
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
                console.warn('⚠️ Token de sesión inválido en el servidor. Cerrando sesión...');
                this.logout();
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

    canAccessAdminPanel() {
        return this.isAdmin();
    }

    canAccessConsultorPanel() {
        return this.isConsultor();
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

    redirectToLogin() {
        // En Vercel o en servidor (localhost:3000), la ruta del login es siempre "/" 
        // ya que el backend de Express (api/index.js) mapea "/" a "index.html".
        let loginPath = '/';
        
        // Fallback por si lo están abriendo directamente con doble clic en el archivo HTML local
        if (window.location.protocol === 'file:') {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/admin/') || currentPath.includes('/consultor/')) {
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
        const INACTIVITY_TIME = 10 * 60 * 1000; // 10 minutos de inactividad

        const resetTimer = () => {
            // Actualizar timestamp en localStorage
            this.updateLastActivity();
            
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('⏳ Inactividad de 10 minutos alcanzada. Cerrando sesión automáticamente.');
                this.logout();
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