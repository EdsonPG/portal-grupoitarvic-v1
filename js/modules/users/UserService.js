/**
 * UserService.js
 * 
 * Responsabilidad: Lógica de negocio de usuarios
 * Principio SOLID: Single Responsibility - Orquesta validaciones y acceso a datos
 * 
 * Este servicio:
 * - Coordina UserRepository (datos) y UserValidator (validaciones)
 * - Implementa reglas de negocio
 * - NO sabe de UI (UserModal hace eso)
 * - NO accede directamente a BD (UserRepository hace eso)
 */

window.UserService = class UserService {
    /**
     * @param {UserRepository} repository - Repositorio de datos
     * @param {UserValidator} validator - Validador de reglas
     */
    constructor(repository, validator) {
        if (!repository) {
            throw new Error('UserService requiere UserRepository');
        }
        if (!validator) {
            throw new Error('UserService requiere UserValidator');
        }
        
        this.repository = repository;
        this.validator = validator;
    }

    /**
     * Obtener todos los usuarios
     * @returns {Promise<Object>} Objeto con usuarios
     */
    async getAll() {
        try {
            return await this.repository.getAll();
        } catch (error) {
            console.error('Error en UserService.getAll:', error);
            throw new Error('Error al obtener usuarios');
        }
    }

    /**
     * Obtener consultores activos
     * @returns {Promise<Array>} Array de consultores activos
     */
    async getActiveConsultores() {
        try {
            return await this.repository.getActiveConsultores();
        } catch (error) {
            console.error('Error en UserService.getActiveConsultores:', error);
            throw new Error('Error al obtener consultores');
        }
    }

    /**
     * Obtener usuario por ID
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object|null>} Usuario o null
     */
    async getById(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }

            return await this.repository.getById(userId);
        } catch (error) {
            console.error(`Error en UserService.getById(${userId}):`, error);
            throw new Error(`Error al obtener usuario ${userId}`);
        }
    }

    /**
     * CREAR USUARIO - Lógica completa
     * 
     * 1. Validar datos
     * 2. Generar contraseña única si no viene
     * 3. Crear en BD
     * 
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado con contraseña
     */
    async create(userData) {
        try {
            console.log('UserService.create - Iniciando creación de usuario');

            // Validar datos básicos
            const validation = await this.validator.validateCreate(userData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Si no viene contraseña, generar una única
            if (!userData.password) {
                console.log('Generando contraseña única...');
                userData.password = await this.validator.generateUniquePassword();
                console.log('Contraseña generada:');
            }

            // Preparar datos completos
            const completeUserData = {
                ...userData,
                role: userData.role || 'consultor',
                email: userData.email || `${userData.userId.toLowerCase()}@grupoitarvic.com`,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            // Crear en BD
            const result = await this.repository.create(completeUserData);

            if (!result.success) {
                throw new Error(result.message || 'Error al crear usuario');
            }

            console.log('Usuario creado exitosamente:', result.user.userId);

            // Devolver usuario con contraseña para mostrar al admin
            return {
                success: true,
                user: result.user,
                password: userData.password // ⚠️ Solo se devuelve al crear, nunca después
            };

        } catch (error) {
            console.error('Error en UserService.create:', error);
            throw error;
        }
    }

    /**
     * ACTUALIZAR USUARIO - Lógica completa con validaciones
     *
     * Este es el método que arregla tu bug de validación de contraseñas
     * 
     * 1. Obtener usuario actual
     * 2. Validar cambios (incluyendo contraseña no duplicada)
     * 3. Actualizar en BD
     * 
     * @param {string} userId - ID del usuario
     * @param {Object} updateData - Datos a actualizar
     * @returns {Promise<Object>} Usuario actualizado
     */
    async update(userId, updateData) {
        try {
            console.log(`🔧 UserService.update(${userId}) - Iniciando actualización`);

            // 1. Obtener datos actuales del usuario
            const currentUser = await this.repository.getById(userId);
            
            if (!currentUser) {
                throw new Error('Usuario no encontrado');
            }

            console.log('Usuario actual obtenido:', currentUser.userId);

            if (updateData.password && updateData.password.trim() !== '') {
                currentUser.password = await this.repository.getPasswordForValidation(userId);
                console.log('Contraseña actual obtenida para validación');
            }

            // 2. Validar actualización (AQUÍ se valida que no sea la misma contraseña)
            const validation = await this.validator.validateUpdate(
                userId, 
                updateData, 
                currentUser  // ← Pasa datos actuales para comparar contraseñas
            );

            if (!validation.valid) {
                throw new Error(validation.message);
            }

            console.log('Validaciones pasadas');

            // 3. Preparar datos para actualización
            const dataToUpdate = {
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            // 4. Actualizar en BD
            const result = await this.repository.update(userId, dataToUpdate);

            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar usuario');
            }

            console.log('Usuario actualizado exitosamente');

            return {
                success: true,
                user: result.user,
                passwordChanged: !!updateData.password // Info de si cambió contraseña
            };

        } catch (error) {
            console.error(`Error en UserService.update(${userId}):`, error);
            throw error;
        }
    }

    /**
     * ELIMINAR USUARIO - Con validación
     *
     * @param {string} userId - ID del usuario a eliminar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async delete(userId) {
        try {
            console.log(`UserService.delete(${userId}) - Iniciando eliminación`);

            // Validar que no sea admin
            const validation = this.validator.validateDelete(userId);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Verificar que el usuario existe
            const exists = await this.repository.exists(userId);
            if (!exists) {
                throw new Error('Usuario no encontrado');
            }

            // Eliminar
            const result = await this.repository.delete(userId);

            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar usuario');
            }

            console.log('Usuario eliminado exitosamente');

            return {
                success: true,
                message: 'Usuario eliminado correctamente'
            };

        } catch (error) {
            console.error(`Error en UserService.delete(${userId}):`, error);
            throw error;
        }
    }

    /**
     * Generar contraseña única
     * Wrapper sobre validator para facilitar acceso
     * 
     * @param {string} excludeUserId - Usuario a excluir (opcional)
     * @returns {Promise<string>} Contraseña generada
     */
    async generatePassword(excludeUserId = null) {
        try {
            return await this.validator.generateUniquePassword(excludeUserId);
        } catch (error) {
            console.error('Error generando contraseña:', error);
            throw new Error('Error al generar contraseña');
        }
    }

    /**
     * Verificar si un usuario existe
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} true si existe
     */
    async exists(userId) {
        try {
            return await this.repository.exists(userId);
        } catch (error) {
            console.error(`Error verificando existencia de ${userId}:`, error);
            return false;
        }
    }
}