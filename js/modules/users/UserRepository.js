/**
 * UserRepository.js
 * 
 * Responsabilidad: Abstraer el acceso a datos de usuarios
 * Principio SOLID: Single Responsibility - Solo maneja acceso a datos
 * 
 * Este repositorio es un wrapper sobre window.PortalDB que:
 * - Abstrae la implementación de la base de datos
 * - Facilita cambiar a otra BD en el futuro
 * - Es fácil de mockear para testing
 */

window.UserRepository = class UserRepository {
    /**
     * @param {Object} database - Instancia de PortalDB
     */
    constructor(database) {
        if (!database) {
            throw new Error('UserRepository requiere una instancia de database');
        }
        this.db = database;
    }

    /**
     * Obtener todos los usuarios
     * @returns {Promise<Object>} Objeto con todos los usuarios
     */
    async getAll() {
        try {
            const users = await this.db.getUsers();
            return users || {};
        } catch (error) {
            console.error('Error en UserRepository.getAll:', error);
            throw new Error('Error al obtener usuarios');
        }
    }

    /**
     * Obtener usuario por ID
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object|null>} Usuario encontrado o null
     */
    async getById(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }

            const user = await this.db.getUser(userId);
            return user || null;
        } catch (error) {
            console.error(`Error en UserRepository.getById(${userId}):`, error);
            throw new Error(`Error al obtener usuario ${userId}`);
        }
    }

    /**
     * ⭐ NUEVO: Obtener contraseña del usuario para validación
     * Solo debe usarse internamente para validar contraseñas
     * 
     * @param {string} userId - ID del usuario
     * @returns {Promise<string|null>} Password del usuario o null
     */
    async getPasswordForValidation(userId) {
        try {
            if (!userId) {
                console.error('getPasswordForValidation: userId es requerido');
                return null;
            }

            console.log(`getPasswordForValidation: ${userId}`);

            // Usar el endpoint especial /passwords que SÍ devuelve contraseñas
            const passwordData = await this.db.getPasswordsForValidation();
            
            // Buscar la contraseña del usuario específico
            const userPasswordData = passwordData.find(item => item.userId === userId);
            
            if (userPasswordData && userPasswordData.password) {
                console.log(`Contraseña encontrada para ${userId}`);
                return userPasswordData.password;
            }

            console.log(`Contraseña no encontrada para ${userId}`);
            return null;
            
        } catch (error) {
            console.error(`Error en getPasswordForValidation:`, error);
            return null;
        }
    }

    /**
     * Crear nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Resultado de la operación
     */
    async create(userData) {
        try {
            if (!userData) {
                throw new Error('userData es requerido');
            }

            //console.log('UserRepository.create:', userData);
            const result = await this.db.createUser(userData);
            
            if (!result.success) {
                throw new Error(result.message || 'Error al crear usuario');
            }

            console.log('Usuario creado en DB:', result.user);
            return result;
        } catch (error) {
            console.error('Error en UserRepository.create:', error);
            throw error;
        }
    }

    /**
     * Actualizar usuario existente
     * @param {string} userId - ID del usuario
     * @param {Object} updateData - Datos a actualizar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async update(userId, updateData) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }
            if (!updateData) {
                throw new Error('updateData es requerido');
            }

            //console.log(`UserRepository.update(${userId}):`, updateData);
            const result = await this.db.updateUser(userId, updateData);
            
            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar usuario');
            }

            console.log('Usuario actualizado en DB:', result.user);
            return result;
        } catch (error) {
            console.error(`Error en UserRepository.update(${userId}):`, error);
            throw error;
        }
    }

    /**
     * Eliminar usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} Resultado de la operación
     */
    async delete(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }

            console.log(`UserRepository.delete(${userId})`);
            const result = await this.db.deleteUser(userId);
            
            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar usuario');
            }

            console.log('Usuario eliminado de DB');
            return result;
        } catch (error) {
            console.error(`Error en UserRepository.delete(${userId}):`, error);
            throw error;
        }
    }

    /**
     * Obtener solo consultores activos
     * @returns {Promise<Array>} Array de usuarios consultores activos
     */
    async getActiveConsultores() {
        try {
            const allUsers = await this.getAll();
            const consultores = Object.values(allUsers).filter(user => 
                user.role === 'consultor' && 
                user.isActive !== false &&
                user.userId &&
                user.userId !== 'undefined'
            );
            
            console.log(`Consultores activos encontrados: ${consultores.length}`);
            return consultores;
        } catch (error) {
            console.error('Error en UserRepository.getActiveConsultores:', error);
            throw new Error('Error al obtener consultores activos');
        }
    }

    /**
     * Verificar si un userId existe
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} true si existe, false si no
     */
    async exists(userId) {
        try {
            const user = await this.getById(userId);
            return user !== null;
        } catch (error) {
            console.error(`Error en UserRepository.exists(${userId}):`, error);
            return false;
        }
    }

    /**
     * Obtener todas las contraseñas existentes (para validar unicidad)
     * 
     * IMPORTANTE: Este método hace llamadas individuales a getById() 
     * porque GET /users excluye passwords por seguridad,
     * pero GET /users/:id SÍ incluye password
     * 
     * @param {string} excludeUserId - ID de usuario a excluir (opcional)
     * @returns {Promise<Array<string>>} Array de contraseñas
     */
    async getAllPasswords(excludeUserId = null) {
        try {
            //Usar endpoint dedicado
            const passwordData = await this.db.getPasswordsForValidation();
            
            //console.log('🔍 getAllPasswords - Diagnóstico:');
            //console.log('  Contraseñas obtenidas:', passwordData.length);
            
            const passwords = passwordData
                .filter(item => {
                    if (excludeUserId && item.userId === excludeUserId) {
                        console.log(`Usuario ${item.userId}: excluido`);
                        return false;
                    }
                    return item.password && item.password !== 'undefined';
                })
                .map(item => item.password);
            
            //console.log('  Contraseñas válidas:', passwords.length);
            return passwords;
            
        } catch (error) {
            console.error('Error en getAllPasswords:', error);
            return [];
        }
    }
}