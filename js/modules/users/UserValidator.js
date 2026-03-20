/**
 * UserValidator.js
 * 
 * Responsabilidad: Validar todos los datos relacionados con usuarios
 * Principio SOLID: Single Responsibility - Solo valida, no modifica datos
 * 
 * Este validador maneja:
 * - Validaciones de formato (nombre, email, contraseña)
 * - Validaciones de negocio (unicidad de contraseñas, no admin)
 * - Generación de contraseñas únicas
 */

window.UserValidator = class UserValidator {
    /**
     * @param {UserRepository} userRepository - Repositorio para consultar datos
     */
    constructor(userRepository) {
        if (!userRepository) {
            throw new Error('UserValidator requiere una instancia de UserRepository');
        }
        this.repository = userRepository;
    }

    /**
     * Validar nombre de usuario
     * @param {string} name - Nombre a validar
     * @returns {Object} { valid: boolean, message: string }
     */
    validateName(name) {
        if (!name || typeof name !== 'string') {
            return {
                valid: false,
                message: 'El nombre es requerido'
            };
        }

        const trimmedName = name.trim();

        if (trimmedName.length < 3) {
            return {
                valid: false,
                message: 'El nombre debe tener al menos 3 caracteres'
            };
        }

        if (trimmedName.length > 100) {
            return {
                valid: false,
                message: 'El nombre no puede exceder 100 caracteres'
            };
        }

        // Validar que contenga al menos letras
        if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(trimmedName)) {
            return {
                valid: false,
                message: 'El nombre debe contener al menos una letra'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * Validar email
     * @param {string} email - Email a validar
     * @returns {Object} { valid: boolean, message: string }
     */
    validateEmail(email) {
        // Email es opcional, si está vacío es válido
        if (!email || email.trim() === '') {
            return { valid: true, message: '' };
        }

        const trimmedEmail = email.trim();

        // Validar formato básico de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(trimmedEmail)) {
            return {
                valid: false,
                message: 'Formato de email inválido'
            };
        }

        if (trimmedEmail.length > 255) {
            return {
                valid: false,
                message: 'El email es demasiado largo'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * Validar formato de contraseña de consultor
     * Formato: cons####.#### (cons + 4 dígitos + punto + 4 dígitos)
     * 
     * @param {string} password - Contraseña a validar
     * @returns {Object} { valid: boolean, message: string }
     */
    validatePasswordFormat(password) {
        if (!password || typeof password !== 'string') {
            return {
                valid: false,
                message: 'La contraseña es requerida'
            };
        }

        const trimmedPassword = password.trim();

        if (trimmedPassword.length < 6) {
            return {
                valid: false,
                message: 'La contraseña debe tener al menos 6 caracteres.\n\n' +
                        'Use el botón "Generar" para crear una automáticamente.'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * Calcula la fuerza de una contraseña y devuelve un puntaje y etiqueta
     * @param {string} password 
     * @returns {Object} { score: number, label: string, color: string }
     */
    calculatePasswordStrength(password) {
        if (!password || password.length === 0) return { score: 0, label: '', color: '#ddd', class: '' };
        
        let score = 0;
        
        // Longitud
        if (password.length >= 6) score += 20;
        if (password.length >= 10) score += 10;
        
        // Variedad de caracteres
        if (/[A-Z]/.test(password)) score += 20;
        if (/[a-z]/.test(password)) score += 20;
        if (/[0-9]/.test(password)) score += 20;
        if (/[^A-Za-z0-9]/.test(password)) score += 10;
        
        if (score <= 40) return { score, label: 'Débil', color: '#ff4d4f', class: 'strength-weak' };
        if (score <= 70) return { score, label: 'Media', color: '#faad14', class: 'strength-medium' };
        return { score, label: 'Fuerte', color: '#52c41a', class: 'strength-strong' };
    }

    /**
     * VALIDACIÓN CLAVE: Verificar que la contraseña NO sea la misma que la actual
     * Esta es una de las validaciones que estaba fallando
     * 
     * @param {string} newPassword - Nueva contraseña propuesta
     * @param {string} currentPassword - Contraseña actual del usuario
     * @returns {Object} { valid: boolean, message: string }
     */
    validatePasswordNotSameAsCurrent(newPassword, currentPassword) {
        console.log('validatePasswordNotSameAsCurrent:');  
        //console.log('  Nueva:', newPassword); 
        //console.log('  Actual:', currentPassword);  

        if (!newPassword) {
            // Si no hay nueva contraseña, es válido (mantiene la actual)
            return { valid: true, message: '' };
        }

        if (!currentPassword) {
            // Si no hay contraseña actual (nuevo usuario), es válido
            console.log('No hay contraseña actual - se permite');
            return { valid: true, message: '' };
        }

        if (newPassword.trim() === currentPassword.trim()) {
            return {
                valid: false,
                message: 'La contraseña ingresada es la misma que la actual.\n\n' +
                        'Por favor ingrese una contraseña diferente o deje el campo vacío para mantener la actual.'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * VALIDACIÓN CLAVE: Verificar que la contraseña NO esté duplicada
     * Esta es la otra validación que estaba fallando
     * 
     * @param {string} password - Contraseña a validar
     * @param {string} excludeUserId - ID de usuario a excluir (para edición)
     * @returns {Promise<Object>} { valid: boolean, message: string }
     */
    async validatePasswordUnique(password, excludeUserId = null) {
        if (!password || password.trim() === '') {
            return { valid: true, message: '' };
        }

        try {
            // Obtener todas las contraseñas existentes, excluyendo el usuario actual
            const existingPasswords = await this.repository.getAllPasswords(excludeUserId);

            console.log('Validando unicidad de contraseña...');
            //console.log('Nueva contraseña:', password);
            console.log('Usuario excluido:', excludeUserId);
            //console.log('  Contraseñas existentes:', existingPasswords.length);
            //console.log('  📋 ARRAY COMPLETO:', existingPasswords);

            if (existingPasswords.includes(password.trim())) {
                return {
                    valid: false,
                    message: 'Esta contraseña ya está en uso por otro consultor.\n\n' +
                            'Por seguridad y trazabilidad, cada consultor debe tener una contraseña única.\n\n' +
                            'Use el botón "Generar" para crear una nueva contraseña automáticamente.'
                };
            }

            console.log('Contraseña única - validación pasada');
            return { valid: true, message: '' };

        } catch (error) {
            console.error('Error validando unicidad de contraseña:', error);
            return {
                valid: false,
                message: 'Error al validar contraseña: ' + error.message
            };
        }
    }

    /**
     * Validar que no sea el usuario administrador
     * @param {string} userId - ID del usuario
     * @returns {Object} { valid: boolean, message: string }
     */
    validateNotAdmin(userId) {
        if (userId === 'admin') {
            return {
                valid: false,
                message: 'No se puede modificar el usuario administrador'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * GENERACIÓN DE CONTRASEÑAS ÚNICAS
     * Genera contraseñas que NO estén duplicadas
     * 
     * @param {string} excludeUserId - ID de usuario a excluir (opcional)
     * @returns {Promise<string>} Contraseña única generada
     */
    async generateUniquePassword(excludeUserId = null) {
        let isUnique = false;
        let finalPassword = '';
        let attempts = 0;
        const maxAttempts = 10; // Prevenir ciclo infinito

        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            
            // Generar contraseña aleatoria fuerte de 12 caracteres
            let tempPassword = '';
            // Asegurar al menos uno de cada tipo
            tempPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
            tempPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
            tempPassword += "0123456789"[Math.floor(Math.random() * 10)];
            tempPassword += "!@#$%^&*"[Math.floor(Math.random() * 8)];
            
            // Completar hasta 12 caracteres
            for (let i = 0; i < 8; i++) {
                tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            // Mezclar (shuffle)
            finalPassword = tempPassword.split('').sort(() => 0.5 - Math.random()).join('');

            // Verificar si es única
            const check = await this.validatePasswordUnique(finalPassword, excludeUserId);
            if (check.valid) {
                isUnique = true;
            }
        }

        if (!isUnique) {
            console.warn('No se pudo generar una contraseña única después de múltiples intentos');
            // Como fallback si hay extrema colisión, usar timestamp
            finalPassword = `P@ss${Date.now()}${(Math.random() * 1000).toFixed(0)}`;
        }

        return finalPassword;
    }      

    /**
     * VALIDACIÓN COMPLETA para actualizar usuario
     * Combina todas las validaciones necesarias
     * 
     * @param {string} userId - ID del usuario a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @param {Object} currentUserData - Datos actuales del usuario
     * @returns {Promise<Object>} { valid: boolean, message: string }
     */
    async validateUpdate(userId, updateData, currentUserData) {
        // 1. Validar que no sea admin
        const adminValidation = this.validateNotAdmin(userId);
        if (!adminValidation.valid) {
            return adminValidation;
        }

        // 2. Validar nombre si está presente
        if (updateData.name !== undefined) {
            const nameValidation = this.validateName(updateData.name);
            if (!nameValidation.valid) {
                return nameValidation;
            }
        }

        // 3. Validar email si está presente
        if (updateData.email !== undefined) {
            const emailValidation = this.validateEmail(updateData.email);
            if (!emailValidation.valid) {
                return emailValidation;
            }
        }

        // 4. Validar contraseña si está presente
        if (updateData.password && updateData.password.trim() !== '') {
            // 4a. Validar formato
            const formatValidation = this.validatePasswordFormat(updateData.password);
            if (!formatValidation.valid) {
                return formatValidation;
            }

            // 4b. Validar que NO sea la misma que la actual
            const currentPassword = currentUserData ? currentUserData.password : null;
            const samePasswordValidation = this.validatePasswordNotSameAsCurrent(
                updateData.password,
                currentPassword
            );
            if (!samePasswordValidation.valid) {
                return samePasswordValidation;
            }

            // 4c. Validar que NO esté duplicada
            const uniqueValidation = await this.validatePasswordUnique(updateData.password, userId);
            if (!uniqueValidation.valid) {
                return uniqueValidation;
            }
        }

        return { valid: true, message: '' };
    }

    /**
     * VALIDACIÓN COMPLETA para crear usuario
     * 
     * @param {Object} userData - Datos del nuevo usuario
     * @returns {Promise<Object>} { valid: boolean, message: string }
     */
    async validateCreate(userData) {
        // 1. Validar nombre
        const nameValidation = this.validateName(userData.name);
        if (!nameValidation.valid) {
            return nameValidation;
        }

        // 2. Validar email si está presente
        if (userData.email) {
            const emailValidation = this.validateEmail(userData.email);
            if (!emailValidation.valid) {
                return emailValidation;
            }
        }

        // 3. Validar contraseña si está presente (normalmente se genera automática)
        if (userData.password) {
            const formatValidation = this.validatePasswordFormat(userData.password);
            if (!formatValidation.valid) {
                return formatValidation;
            }

            const uniqueValidation = await this.validatePasswordUnique(userData.password);
            if (!uniqueValidation.valid) {
                return uniqueValidation;
            }
        }

        return { valid: true, message: '' };
    }

    /**
     * Validar eliminación de usuario
     * @param {string} userId - ID del usuario a eliminar
     * @returns {Object} { valid: boolean, message: string }
     */
    validateDelete(userId) {
        return this.validateNotAdmin(userId);
    }
}