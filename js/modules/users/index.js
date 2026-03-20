/**
 * index.js
 * 
 * Punto de entrada del módulo de usuarios
 * 
 * Responsabilidad: Inicializar y conectar todas las piezas del módulo
 * Principio SOLID: Dependency Injection - Inyecta dependencias desde un punto central
 * 
 * Este archivo:
 * - Crea instancias en el orden correcto
 * - Inyecta dependencias entre ellas
 * - Expone API pública del módulo
 * - Mantiene compatibilidad con código legacy (window.userModule)
 */

/**
 * Inicializar módulo de usuarios
 * 
 * @param {Object} database - Instancia de PortalDB (window.PortalDB)
 * @param {Object} notifier - Sistema de notificaciones (window.NotificationUtils)
 * @returns {Object} API pública del módulo
 */
window.initializeUserModule = function(database, notifier) {
    console.log('Inicializando módulo de usuarios...');

    // Validar dependencias externas
    if (!database) {
        throw new Error('initializeUserModule requiere database (window.PortalDB)');
    }
    if (!notifier) {
        throw new Error('initializeUserModule requiere notifier (window.NotificationUtils)');
    }

    // 1. Crear Repository (capa de datos)
    console.log('Creando UserRepository...');
    const userRepository = new UserRepository(database);

    // 2. Crear Validator (capa de validaciones)
    console.log('Creando UserValidator...');
    const userValidator = new UserValidator(userRepository);

    // 3. Crear Service (capa de lógica de negocio)
    console.log('Creando UserService...');
    const userService = new UserService(userRepository, userValidator);

    // 4. Crear Modal (capa de interfaz)
    console.log('Creando UserModal...');
    const userModal = new UserModal(userService, notifier);

    // 5. Crear API pública del módulo
    const publicAPI = {
        // Métodos principales para usar en admin.js
        editUser: (userId) => userModal.openEdit(userId),
        closeEditModal: () => userModal.closeEditModal(),
        
        // Método para eliminar usuario (llamará a service)
        deleteUser: async (userId) => {
            if (!confirm('¿Está seguro de eliminar este usuario? Esta acción eliminará también todas sus asignaciones.')) {
                return;
            }

            try {
                await userService.delete(userId);
                notifier.success('Usuario eliminado correctamente');
                
                // Recargar datos (compatibilidad con código legacy)
                if (typeof window.loadAllData === 'function') {
                    await window.loadAllData();
                }
            } catch (error) {
                notifier.error(error.message || 'Error al eliminar usuario');
            }
        },

        // Acceso directo a las instancias (para uso avanzado)
        service: userService,
        repository: userRepository,
        validator: userValidator,
        modal: userModal
    };

    // 6. Exponer globalmente para compatibilidad con código legacy
    window.userModule = publicAPI;

    console.log('Módulo de usuarios inicializado correctamente');
    console.log('Disponible en: window.userModule');
    console.log('Métodos: editUser, deleteUser, closeEditModal');

    // 7. Retornar API pública
    return publicAPI;
}

/**
 * Inicialización automática cuando el DOM está listo
 * (Solo si window.PortalDB y window.NotificationUtils ya existen)
 */
function autoInitialize() {
    if (typeof window !== 'undefined') {
        // Esperar a que las dependencias estén disponibles
        const checkDependencies = () => {
            if (window.PortalDB && window.NotificationUtils) {
                console.log('Auto-inicializando módulo de usuarios...');
                initializeUserModule(window.PortalDB, window.NotificationUtils);
            } else {
                // Reintentar después de 100ms
                setTimeout(checkDependencies, 100);
            }
        };

        // Iniciar verificación cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkDependencies);
        } else {
            checkDependencies();
        }
    }
}

// Ejecutar auto-inicialización
autoInitialize();