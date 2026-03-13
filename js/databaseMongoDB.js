/**
 * === SISTEMA DE BASE DE DATOS PARA PORTAL ARVIC CON MONGODB ===
 * Conecta con MongoDB Atlas vía API REST
 * Mantiene compatibilidad con la interfaz original de PortalDatabase
 */

class PortalDatabase {
    constructor() {
        // Configuración del API - Detección automática de entorno
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        // URL del API según el entorno
        this.API_URL = isDevelopment 
            ? 'http://localhost:3000/api'
            : `${window.location.origin}/api`; // Producción: usa el mismo dominio
        
        this.token = localStorage.getItem('arvic_token') || null;
        this.prefix = 'arvic_';
        
        console.log('Sistema de Base de Datos Portal ARVIC inicializado con MongoDB');
        console.log(`Entorno: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
        console.log('API URL:', this.API_URL);
    }

    // === CONFIGURACIÓN DE HEADERS ===
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // === UTILIDADES PARA MANTENER COMPATIBILIDAD ===
    // Convierte array a objeto con IDs como keys (compatibilidad con localStorage)
    arrayToObject(array) {
        if (!Array.isArray(array)) return {};
        return array.reduce((obj, item) => {
            // Detectar automáticamente qué campo usar como clave
            const key = item.taskAssignmentId || 
                       item.projectAssignmentId || 
                       item.assignmentId || 
                       item.userId || 
                       item.companyId || 
                       item.supportId || 
                       item.moduleId || 
                       item.projectId || 
                       item.reportId || 
                       item.tarifarioId ||
                       item.id;
            
            if (key) {
                obj[key] = item;
            }
            return obj;
        }, {});
    }

    // === AUTENTICACIÓN ===
    async validateUser(userId, password) {
        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.token = data.token;
                localStorage.setItem('arvic_token', data.token);
                return { success: true, user: data.user };
            }
            
            return { success: false, message: data.message || 'Credenciales inválidas' };
        } catch (error) {
            console.error('❌ Error en login:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('arvic_token');
        localStorage.removeItem('arvic_currentUser');
        console.log('✅ Sesión cerrada');
    }

    // === GESTIÓN DE USUARIOS ===
    async getUsers() {
        try {
            const response = await fetch(`${this.API_URL}/users`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const users = {};
                result.data.forEach(user => {
                    users[user.userId] = user;  // ✅ Cambiar de user.id a user.userId
                });
                return users;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            return {};
        }
    }

    async getUser(userId) {
        try {
            const response = await fetch(`${this.API_URL}/users/${userId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const response = await fetch(`${this.API_URL}/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token ? `Bearer ${this.token}` : ''
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al obtener usuarios');
            }

            return data;
        } catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
            throw error;
        }
    }

    async getPasswordsForValidation() {
        try {
            const response = await fetch(`${this.API_URL}/users/passwords`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                // Devolver array de { userId, password }
                return result.data;
            }
            
            return [];
        } catch (error) {
            console.error('❌ Error obteniendo contraseñas:', error);
            return [];
        }
    }

    async createUser(userData) {
        try {
            console.log('📤 Enviando datos de usuario:', userData);
            
            const response = await fetch(`${this.API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token ? `Bearer ${this.token}` : ''
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            console.log('📥 Respuesta del servidor:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Error al crear usuario');
            }

            return data;
        } catch (error) {
            console.error('❌ Error en createUser:', error);
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Usuario actualizado:', userId);
                return { success: true, user: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteUser(userId) {
        try {
            // Verificar si es el administrador
            if (userId === 'admin') {
                return { success: false, message: 'No se puede eliminar el usuario administrador' };
            }

            const response = await fetch(`${this.API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Usuario eliminado:', userId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // Método de compatibilidad
    generateUniquePassword(userId) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `cons${userId}.${randomNum}`;
    }

    // === GESTIÓN DE EMPRESAS ===
    async getCompanies() {
        try {
            const response = await fetch(`${this.API_URL}/companies`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const companies = {};
                result.data.forEach(company => {
                    companies[company.companyId] = company;  // ✅ YA CORRECTO
                });
                return companies;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo empresas:', error);
            return {};
        }
    }

    async getCompany(companyId) {
        try {
            const companies = await this.getCompanies();
            return companies[companyId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo empresa:', error);
            return null;
        }
    }

    async createCompany(companyData) {
        try {
            console.log('📤 Enviando datos de empresa:', companyData);
            const response = await fetch(`${this.API_URL}/companies`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(companyData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Empresa creada:', result.data.id);
                return { success: true, company: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando empresa:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateCompany(companyId, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/companies/${companyId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Empresa actualizada:', companyId);
                return { success: true, company: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando empresa:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteCompany(companyId) {
        try {
            const response = await fetch(`${this.API_URL}/companies/${companyId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Empresa eliminada:', companyId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando empresa:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE PROYECTOS ===
    async getProjects() {
        try {
            const response = await fetch(`${this.API_URL}/projects`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const projects = {};
                result.data.forEach(project => {
                    projects[project.projectId] = project;  // ✅ YA CORRECTO
                });
                return projects;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo proyectos:', error);
            return {};
        }
    }

    async getProject(projectId) {
        try {
            const projects = await this.getProjects();
            return projects[projectId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo proyecto:', error);
            return null;
        }
    }

    async createProject(projectData) {
        try {
            const response = await fetch(`${this.API_URL}/projects`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(projectData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Proyecto creado:', result.data.id);
                return { success: true, project: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateProject(projectId, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Proyecto actualizado:', projectId);
                return { success: true, project: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteProject(projectId) {
        try {
            const response = await fetch(`${this.API_URL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Proyecto eliminado:', projectId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE SOPORTES ===
    async getSupports() {
        try {
            const response = await fetch(`${this.API_URL}/supports`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const supports = {};
                result.data.forEach(support => {
                    supports[support.supportId] = support;  // ✅ YA CORRECTO
                });
                return supports;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo soportes:', error);
            return {};
        }
    }

    async getSupport(supportId) {
        try {
            const supports = await this.getSupports();
            return supports[supportId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo soporte:', error);
            return null;
        }
    }

    async createSupport(supportData) {
        try {
            console.log('📤 Enviando datos de soporte:', supportData);
            const response = await fetch(`${this.API_URL}/supports`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(supportData)
            });
            const result = await response.json();
            
            console.log('📥 Respuesta del servidor:', result);

            if (result.success) {
                console.log('✅ Soporte creado:', result.data.supportId);
                return { success: true, support: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando soporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateSupport(supportId, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/supports/${supportId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Soporte actualizado:', supportId);
                return { success: true, support: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando soporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteSupport(supportId) {
        try {
            const response = await fetch(`${this.API_URL}/supports/${supportId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Soporte eliminado:', supportId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando soporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE MÓDULOS ===
    async getModules() {
        try {
            const response = await fetch(`${this.API_URL}/modules`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const modules = {};
                result.data.forEach(module => {
                    modules[module.moduleId] = module;  // ✅ YA CORRECTO
                });
                return modules;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo módulos:', error);
            return {};
        }
    }

    async getModule(moduleId) {
        try {
            const modules = await this.getModules();
            return modules[moduleId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo módulo:', error);
            return null;
        }
    }

    async createModule(moduleData) {
        try {
            console.log('📤 Enviando datos de módulo:', moduleData);  // ✅ Agrega este log
            
            const response = await fetch(`${this.API_URL}/modules`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(moduleData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);  // ✅ Agrega este log
            
            if (result.success) {
                console.log('✅ Módulo creado:', result.data.moduleId);  // ✅ Cambia de .id a .moduleId
                return { success: true, module: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando módulo:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateModule(moduleId, updateData) {
        try {
            const response = await fetch(`${this.API_URL}/modules/${moduleId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Módulo actualizado:', moduleId);
                return { success: true, module: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando módulo:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteModule(moduleId) {
        try {
            const response = await fetch(`${this.API_URL}/modules/${moduleId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Módulo eliminado:', moduleId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando módulo:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE ASIGNACIONES DE SOPORTE ===
    async getAssignments() {
        try {
            const response = await fetch(`${this.API_URL}/assignments`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                // ✅ CORRECCIÓN: Usar assignmentId en lugar de id
                const assignments = {};
                data.data.forEach(assignment => {
                    assignments[assignment.assignmentId] = assignment;  // ✅ CAMBIO AQUÍ
                });
                return assignments;
            }
            return {};
        } catch (error) {
            console.error('❌ Error obteniendo asignaciones:', error);
            return {};
        }
    }

    async getAssignment(assignmentId) {
        try {
            const assignments = await this.getAssignments();
            return assignments[assignmentId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo asignación:', error);
            return null;
        }
    }

    async createAssignment(assignmentData) {
        try {
            console.log('📤 Enviando datos de asignación:', assignmentData);
            
            const response = await fetch(`${this.API_URL}/assignments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(assignmentData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Asignación creada:', result.data.assignmentId);
                return { success: true, assignment: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando asignación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateAssignment(assignmentId, updates) {
        try {
            const response = await fetch(`${this.API_URL}/assignments/${assignmentId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Asignación actualizada:', assignmentId);
                return { success: true, assignment: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando asignación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteAssignment(assignmentId) {
        try {
            const response = await fetch(`${this.API_URL}/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Asignación eliminada:', assignmentId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando asignación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // Métodos auxiliares para asignaciones
    async getUserAssignments(userId) {
        try {
            console.log('🔍 getUserAssignments llamado con userId:', userId);
            
            const assignments = await this.getAssignments();
            console.log('📦 getAssignments() retornó:', assignments);
            console.log('📦 Tipo de assignments:', Array.isArray(assignments) ? 'Array' : 'Objeto');
            
            const assignmentsArray = Array.isArray(assignments) 
                ? assignments 
                : Object.values(assignments || {});
            
            console.log('📦 assignmentsArray length:', assignmentsArray.length);
            console.log('📦 Primeras 3 asignaciones:', assignmentsArray.slice(0, 3));
            
            const filtered = assignmentsArray.filter(a => {
                const assignmentUserId = a.consultorId || a.userId;
                const matches = assignmentUserId === userId && a.isActive !== false;
                
                if (matches) {
                    console.log('✅ Match encontrado:', a);
                }
                
                return matches;
            });
            
            console.log('📊 Asignaciones filtradas para', userId, ':', filtered.length);
            
            return filtered;
        } catch (error) {
            console.error('❌ Error obteniendo asignaciones del usuario:', error);
            return [];
        }
    }

    async deleteAssignmentsByUser(userId) {
        try {
            const assignments = await this.getAssignments();
            const userAssignments = Object.values(assignments).filter(a => a.consultorId === userId);
            
            for (const assignment of userAssignments) {
                await this.deleteAssignment(assignment.id);
            }
            
            return { success: true, message: 'Asignaciones del usuario eliminadas' };
        } catch (error) {
            console.error('❌ Error eliminando asignaciones del usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteAssignmentsByCompany(companyId) {
        try {
            const assignments = await this.getAssignments();
            const companyAssignments = Object.values(assignments).filter(a => a.companyId === companyId);
            
            for (const assignment of companyAssignments) {
                await this.deleteAssignment(assignment.id);
            }
            
            return { success: true, message: 'Asignaciones de la empresa eliminadas' };
        } catch (error) {
            console.error('❌ Error eliminando asignaciones de la empresa:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteAssignmentsByProject(projectId) {
        try {
            const assignments = await this.getAssignments();
            const projectAssignments = Object.values(assignments).filter(a => a.projectId === projectId);
            
            for (const assignment of projectAssignments) {
                await this.deleteAssignment(assignment.id);
            }
            
            return { success: true, message: 'Asignaciones del proyecto eliminadas' };
        } catch (error) {
            console.error('❌ Error eliminando asignaciones del proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE ASIGNACIONES DE PROYECTO ===
    async getProjectAssignments() {
        try {
            const response = await fetch(`${this.API_URL}/projectAssignments`, {  // ✅ No /assignments/projects
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const projectAssignments = {};
                result.data.forEach(pa => {
                    projectAssignments[pa.projectAssignmentId] = pa;  // ✅ Usar projectAssignmentId
                });
                return projectAssignments;
            }
            return {};
        } catch (error) {
            console.error('Error obteniendo asignaciones de proyecto:', error);
            return {};
        }
    }

    async getProjectAssignment(assignmentId) {
        try {
            const assignments = await this.getProjectAssignments();
            return assignments[assignmentId] || null;
        } catch (error) {
            console.error('❌ Error obteniendo asignación de proyecto:', error);
            return null;
        }
    }

    async createProjectAssignment(assignmentData) {
        try {
            console.log('📤 Enviando datos de asignación de proyecto:', assignmentData);
            
            const response = await fetch(`${this.API_URL}/projectAssignments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(assignmentData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Asignación de proyecto creada:', result.data.projectAssignmentId);
                return { success: true, projectAssignment: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando asignación de proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateProjectAssignment(assignmentId, updates) {
        try {
            const response = await fetch(`${this.API_URL}/assignments/projects/${assignmentId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Asignación de proyecto actualizada:', assignmentId);
                return { success: true, assignment: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando asignación de proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteProjectAssignment(assignmentId) {
        try {
            const response = await fetch(`${this.API_URL}/projectAssignments/${assignmentId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('Asignación de proyecto eliminada:', assignmentId);
            }
            
            return result;
        } catch (error) {
            console.error('Error eliminando asignación de proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async getUserProjectAssignments(consultorId) {
        try {
            const assignments = await this.getProjectAssignments();
            return Object.values(assignments).filter(a => 
                a.consultorId === consultorId && a.isActive
            );
        } catch (error) {
            console.error('Error obteniendo asignaciones de proyecto del usuario:', error);
            return [];
        }
    }

    // === GESTIÓN DE ASIGNACIONES DE TAREAS ===
    async getTaskAssignments() {
        try {
            const response = await fetch(`${this.API_URL}/taskAssignments`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                return this.arrayToObject(data.data);
            }
            return {};
        } catch (error) {
            console.error('❌ Error obteniendo task assignments:', error);
            return {};
        }
    }

    async getTaskAssignment(taskAssignmentId) {
        try {
            const url = `${this.API_URL}/taskAssignments/${taskAssignmentId}`;

            console.log('GET', url);

            const response = await fetch(url, { headers: this.getHeaders() });

            if (!response.ok) {
                console.error('HTTP Error:', response.status);
                return null;
            }
            const data = await response.json();
            
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo task assignment:', error);
            return null;
        }
    }

    async getTaskAssignmentsBySupport(supportId) {
        try {
            const response = await fetch(`${this.API_URL}/assignments/tasks/by-support/${supportId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('❌ Error obteniendo tareas por soporte:', error);
            return [];
        }
    }

    async getTaskAssignmentsByConsultor(consultorId) {
        try {
            const tasks = await this.getTaskAssignments();
            return Object.values(tasks).filter(task => 
                task.consultorId === consultorId && task.isActive
            );
        } catch (error) {
            console.error('❌ Error obteniendo tareas por consultor:', error);
            return [];
        }
    }

    async getTaskAssignmentsByCompany(companyId) {
        try {
            const tasks = await this.getTaskAssignments();
            return Object.values(tasks).filter(task => 
                task.companyId === companyId && task.isActive
            );
        } catch (error) {
            console.error('❌ Error obteniendo tareas por cliente:', error);
            return [];
        }
    }

    async createTaskAssignment(assignmentData) {
        try {
            console.log('Enviando datos de asignación de tarea:', assignmentData);
            
            const response = await fetch(`${this.API_URL}/taskAssignments`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(assignmentData)
            });
            const result = await response.json();

            console.log('Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('Asignación de tarea creada:', result.data.taskAssignmentId);
                return { success: true, taskAssignment: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Error creando asignación de tarea:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateTaskAssignment(taskAssignmentId, updates) {
        try {
            const response = await fetch(`${this.API_URL}/taskAssignments/${taskAssignmentId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('Task assignment actualizada:', updates);
                return { success: true, data: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Error actualizando task assignment:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteTaskAssignment(taskAssignmentId) {
        try {
            const response = await fetch(`${this.API_URL}/taskAssignments/${taskAssignmentId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('Task assignment eliminada:', taskAssignmentId);
            }
            
            return result;
        } catch (error) {
            console.error('Error eliminando task assignment:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

        // === GESTIÓN DE REPORTES ===
        async getReports() {
        try {
            const response = await fetch(`${this.API_URL}/reports`, {
                method: 'GET', 
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                const reportsObj = {};
                result.data.forEach(report => {
                    // ⭐ MAPPER: Agregar campo "id" que apunte a reportId
                    const mappedReport = {
                        ...report,
                        id: report.reportId || report._id,  // ✅ AGREGAR ESTA LÍNEA
                        status: report.status || report.estado
                    };
                    reportsObj[report.reportId] = mappedReport;
                });
                return reportsObj;
            }
            
            return {};
        } catch (error) {
            console.error('❌ Error obteniendo reportes:', error);
            return {};
        }
    }

    async getReportsByUser(userId) {
        try {
            const response = await fetch(`${this.API_URL}/reports?userId=${userId}`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('❌ Error obteniendo reportes del usuario:', error);
            return [];
        }
    }

    async getReportsByAssignment(assignmentId) {
        try {
            const reports = await this.getReports();
            return Object.values(reports).filter(r => r.assignmentId === assignmentId);
        } catch (error) {
            console.error('❌ Error obteniendo reportes por asignación:', error);
            return [];
        }
    }

    async getRejectedReports(userId) {
        try {
            const reports = await this.getReportsByUser(userId);
            return reports.filter(r => r.estado === 'Rechazado' && !r.isResubmitted);
        } catch (error) {
            console.error('❌ Error obteniendo reportes rechazados:', error);
            return [];
        }
    }

    async getResubmittedReports(userId) {
        try {
            const reports = await this.getReportsByUser(userId);
            return reports.filter(r => r.isResubmitted);
        } catch (error) {
            console.error('❌ Error obteniendo reportes reenviados:', error);
            return [];
        }
    }

    async createReport(reportData) {
        try {
            console.log('📤 Enviando datos de reporte:', reportData);
            
            const response = await fetch(`${this.API_URL}/reports`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(reportData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Reporte creado:', result.data.reportId);
                return { success: true, report: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando reporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateReport(reportId, updates) {
        try {
            console.log('📝 Actualizando reporte:', reportId, updates);
            
            const response = await fetch(`${this.API_URL}/reports/${reportId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();

            if (result.success) {
                console.log('✅ Reporte actualizado');
                return { success: true, report: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando reporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async resubmitReport(reportId, updateData = {}) {
        try {
            const updates = {
                ...updateData,
                estado: 'Pendiente',
                isResubmitted: true,
                resubmittedAt: new Date().toISOString()
            };
            
            return await this.updateReport(reportId, updates);
        } catch (error) {
            console.error('❌ Error reenviando reporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteReport(reportId) {
        try {
            console.log('🗑️ Eliminando reporte:', reportId);
            
            const response = await fetch(`${this.API_URL}/reports/${reportId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();

            if (result.success) {
                console.log('✅ Reporte eliminado');
                return { success: true };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error eliminando reporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async canUserCreateReport(userId) {
        try {
            const user = await this.getUser(userId);
            return user && user.isActive;
        } catch (error) {
            console.error('❌ Error validando usuario:', error);
            return false;
        }
    }

    async getUserReportStats(userId) {
        try {
            const reports = await this.getReportsByUser(userId);
            
            return {
                total: reports.length,
                pendientes: reports.filter(r => r.estado === 'Pendiente').length,
                aprobados: reports.filter(r => r.estado === 'Aprobado').length,
                rechazados: reports.filter(r => r.estado === 'Rechazado').length,
                reenviados: reports.filter(r => r.isResubmitted).length
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de reportes:', error);
            return {
                total: 0,
                pendientes: 0,
                aprobados: 0,
                rechazados: 0,
                reenviados: 0
            };
        }
    }

        // === GESTIÓN DE REPORTES EXCEL GENERADOS (STUB - NO IMPLEMENTADO EN BACKEND) ===
    /**
     * Obtener reportes generados (STUB)
     * @returns {Object} Objeto vacío por ahora
     * @note Esta funcionalidad no está implementada en el backend de MongoDB
     */
    getGeneratedReports() {
        // Stub silencioso - funcionalidad no migrada a MongoDB aún
        return {};
    }

    /**
     * Guardar reporte generado (STUB)
     * @returns {Object} Success false con mensaje
     * @note Esta funcionalidad no está implementada en el backend de MongoDB
     */
    async saveGeneratedReport(reportData) {
        console.warn('⚠️ saveGeneratedReport() es un stub. Esta funcionalidad no está migrada a MongoDB.');
        return { 
            success: false, 
            message: 'Funcionalidad no disponible - requiere implementación en MongoDB' 
        };
    }

    /**
     * Incrementar contador de descargas (STUB)
     * @returns {Object} Success false con mensaje
     * @note Esta funcionalidad no está implementada en el backend de MongoDB
     */
    async incrementDownloadCount(reportId) {
        console.warn('⚠️ incrementDownloadCount() es un stub.');
        return { 
            success: false, 
            message: 'Funcionalidad no disponible' 
        };
    }

    /**
     * Eliminar reporte generado (STUB)
     * @returns {Object} Success false con mensaje
     * @note Esta funcionalidad no está implementada en el backend de MongoDB
     */
    async deleteGeneratedReport(reportId) {
        console.warn('⚠️ deleteGeneratedReport() es un stub.');
        return { 
            success: false, 
            message: 'Funcionalidad no disponible' 
        };
    }

    // === GESTIÓN DE TARIFARIO ===
async getTarifarios() {
    try {
        const response = await fetch(`${this.API_URL}/tarifario`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        const result = await response.json();
        
        if (result.success) {
            const tarifarios = {};
            result.data.forEach(tarifario => {
                // ✅ MAPPER CORREGIDO: MongoDB → Formato frontend
                const tarifarioMapeado = {
                    // IDs principales
                    id: tarifario.tarifarioId,
                    tarifarioId: tarifario.tarifarioId,
                    assignmentId: tarifario.assignmentId,  // ✅ MANTENER assignmentId
                    idAsignacion: tarifario.assignmentId,  // ✅ Alias para compatibilidad
                    
                    // ✅ CRÍTICO: Mapear assignmentType
                    assignmentType: tarifario.tipo,  // 'support', 'project', 'task'
                    tipo: tarifario.tipo === 'support' ? 'soporte' : 
                          tarifario.tipo === 'project' ? 'proyecto' : 'tarea',
                    
                    // IDs de entidades relacionadas
                    consultorId: tarifario.consultorId,
                    clienteId: tarifario.companyId,
                    moduleId: tarifario.moduleId,
                    supportId: tarifario.supportId,
                    projectId: tarifario.projectId,
                    
                    // ✅ Nombres mapeados correctamente
                    consultorNombre: tarifario.consultorNombre,
                    empresaNombre: tarifario.companyName,       // ✅ companyName → empresaNombre
                    clienteNombre: tarifario.companyName,       // ✅ Alias
                    moduloNombre: tarifario.moduleName || 'Sin módulo',  // ✅ moduleName → moduloNombre
                    
                    // ✅ Trabajo: Combinar soporte o proyecto
                    trabajoNombre: tarifario.supportName || tarifario.projectName || 'Sin trabajo',
                    trabajoId: tarifario.supportId || tarifario.projectId,
                    
                    // Costos y margen
                    costoConsultor: parseFloat(tarifario.costoConsultor || 0),
                    costoCliente: parseFloat(tarifario.costoCliente || 0),
                    margen: parseFloat(tarifario.margen || 0),
                    margenPorcentaje: parseFloat(tarifario.margenPorcentaje || 0),
                    
                    // Campos adicionales
                    descripcionTarea: tarifario.descripcionTarea || null,
                    fechaCreacion: tarifario.fechaCreacion || tarifario.createdAt,
                    isActive: tarifario.isActive !== false,
                    updatedAt: tarifario.updatedAt
                };
                
                tarifarios[tarifario.assignmentId] = tarifarioMapeado;
            });
            
            console.log('✅ Tarifarios mapeados:', Object.keys(tarifarios).length, 'entradas');
            
            return tarifarios;
        }
        return {};
    } catch (error) {
        console.error('Error obteniendo tarifarios:', error);
        return {};
    }
}

// ✅ Alias para compatibilidad
async getTarifario() {
    return await this.getTarifarios();
}

    async getTarifaByAssignment(assignmentId) {
        try {
            const tarifario = await this.getTarifario();
            return Object.values(tarifario).find(t => t.assignmentId === assignmentId) || null;
        } catch (error) {
            console.error('❌ Error obteniendo tarifa por asignación:', error);
            return null;
        }
    }

    async getTarifasByConsultor(consultorId) {
        try {
            const tarifario = await this.getTarifario();
            return Object.values(tarifario).filter(t => t.consultorId === consultorId);
        } catch (error) {
            console.error('❌ Error obteniendo tarifas por consultor:', error);
            return [];
        }
    }

    async createTarifaEntry(tarifaData) {
        try {
            const response = await fetch(`${this.API_URL}/tarifario`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(tarifaData)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Entrada de tarifario creada:', result.data.id);
                return { success: true, tarifa: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando entrada de tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateTarifaEntry(tarifaId, updates) {
        try {
            const response = await fetch(`${this.API_URL}/tarifario/${tarifaId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Entrada de tarifario actualizada:', tarifaId);
                return { success: true, tarifa: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando entrada de tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateAssignmentTarifas(assignmentId, tarifas) {
        try {
            const tarifa = await this.getTarifaByAssignment(assignmentId);
            
            if (tarifa) {
                return await this.updateTarifaEntry(tarifa.id, tarifas);
            } else {
                // Crear nueva entrada si no existe
                const assignment = await this.getAssignment(assignmentId);
                if (!assignment) {
                    return { success: false, message: 'Asignación no encontrada' };
                }
                
                const tarifaData = {
                    assignmentId: assignmentId,
                    consultorId: assignment.consultorId,
                    companyId: assignment.companyId,
                    ...tarifas
                };
                
                return await this.createTarifaEntry(tarifaData);
            }
        } catch (error) {
            console.error('❌ Error actualizando tarifas de asignación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async configurarTarifasAsignacion(assignmentId, tarifas) {
        return await this.updateAssignmentTarifas(assignmentId, tarifas);
    }

    async deleteTarifaEntry(tarifaId) {
        try {
            const response = await fetch(`${this.API_URL}/tarifario/${tarifaId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Entrada de tarifario eliminada:', tarifaId);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando entrada de tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async getConsultoresResumen() {
        try {
            const [users, tarifario] = await Promise.all([
                this.getUsers(),
                this.getTarifario()
            ]);
            
            const consultores = Object.values(users).filter(u => u.role === 'consultor' && u.isActive);
            const tarifasArray = Object.values(tarifario);
            
            return consultores.map(consultor => {
                const tarifasConsultor = tarifasArray.filter(t => t.consultorId === consultor.id);
                return {
                    ...consultor,
                    totalAsignaciones: tarifasConsultor.length,
                    tarifas: tarifasConsultor
                };
            });
        } catch (error) {
            console.error('❌ Error obteniendo resumen de consultores:', error);
            return [];
        }
    }

    // === ESTADÍSTICAS ===
    async getStats() {
        try {
            const [users, companies, projects, assignments, reports] = await Promise.all([
                this.getUsers(),
                this.getCompanies(),
                this.getProjects(),
                this.getAssignments(),
                this.getReports()
            ]);

            return {
                totalUsers: Object.keys(users).length,
                activeUsers: Object.values(users).filter(u => u.isActive).length,
                totalCompanies: Object.keys(companies).length,
                totalProjects: Object.keys(projects).length,
                totalAssignments: Object.keys(assignments).length,
                activeAssignments: Object.values(assignments).filter(a => a.isActive).length,
                totalReports: Object.keys(reports).length,
                pendingReports: Object.values(reports).filter(r => r.estado === 'Pendiente').length,
                approvedReports: Object.values(reports).filter(r => r.estado === 'Aprobado').length,
                rejectedReports: Object.values(reports).filter(r => r.estado === 'Rechazado').length
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                totalCompanies: 0,
                totalProjects: 0,
                totalAssignments: 0,
                activeAssignments: 0,
                totalReports: 0,
                pendingReports: 0,
                approvedReports: 0,
                rejectedReports: 0
            };
        }
    }

    // === MÉTODOS DE COMPATIBILIDAD CON LOCALSTORAGE ===
    // Estos métodos mantienen compatibilidad con código que usaba localStorage
    setData(key, data) {
        console.warn('⚠️ setData() es solo para compatibilidad. Los datos se guardan en MongoDB automáticamente.');
        return true;
    }

    getData(key) {
        console.warn('⚠️ getData() es solo para compatibilidad. Usa los métodos async específicos.');
        return null;
    }

    deleteData(key) {
        console.warn('⚠️ deleteData() es solo para compatibilidad. Usa los métodos async específicos.');
        return true;
    }

    // === UTILIDADES ===
    generateId(type = 'general') {
        console.warn('⚠️ generateId() no es necesario. MongoDB genera IDs automáticamente.');
        return Date.now().toString();
    }

    async exportData() {
        try {
            const [users, companies, projects, supports, modules, assignments, projectAssignments, taskAssignments, reports, tarifario] = await Promise.all([
                this.getUsers(),
                this.getCompanies(),
                this.getProjects(),
                this.getSupports(),
                this.getModules(),
                this.getAssignments(),
                this.getProjectAssignments(),
                this.getTaskAssignments(),
                this.getReports(),
                this.getTarifario()
            ]);

            const exportData = {
                version: '2.0-MongoDB',
                exportDate: new Date().toISOString(),
                data: {
                    users,
                    companies,
                    projects,
                    supports,
                    modules,
                    assignments,
                    projectAssignments,
                    taskAssignments,
                    reports,
                    tarifario
                }
            };

            console.log('✅ Datos exportados desde MongoDB');
            return exportData;
        } catch (error) {
            console.error('❌ Error exportando datos:', error);
            return null;
        }
    }

    async clearAllData() {
        console.error('⚠️ clearAllData() deshabilitado para seguridad. Usa el panel de administración de MongoDB.');
        return { success: false, message: 'Operación no permitida desde el cliente' };
    }

    async resetToDefaults() {
        console.error('⚠️ resetToDefaults() deshabilitado. Usa el backend para reiniciar datos.');
        return { success: false, message: 'Operación no permitida desde el cliente' };
    }

    async createTarifario(tarifarioData) {
        try {
            console.log('📤 Enviando datos de tarifario:', tarifarioData);
            
            const response = await fetch(`${this.API_URL}/tarifario`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(tarifarioData)
            });
            const result = await response.json();

            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Tarifario creado:', result.data.tarifarioId);
                return { success: true, tarifario: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error creando tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateTarifario(tarifarioId, updates) {
        try {
            console.log('📝 Actualizando tarifario:', tarifarioId, updates);
            
            const response = await fetch(`${this.API_URL}/tarifario/${tarifarioId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            const result = await response.json();

            if (result.success) {
                console.log('✅ Tarifario actualizado');
                return { success: true, tarifario: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error actualizando tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteTarifario(tarifarioId) {
        try {
            console.log('🗑️ Eliminando tarifario:', tarifarioId);
            
            const response = await fetch(`${this.API_URL}/tarifario/${tarifarioId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();

            if (result.success) {
                console.log('✅ Tarifario eliminado');
                return { success: true };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('❌ Error eliminando tarifario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE NOTIFICACIONES ===
    async getNotifications(userId) {
        try {
            const response = await fetch(`${this.API_URL}/notifications/user/${userId}`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error obteniendo notificaciones:', error);
            return [];
        }
    }

    async getUnreadNotificationCount(userId) {
        try {
            const response = await fetch(`${this.API_URL}/notifications/user/${userId}/unread-count`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.count : 0;
        } catch (error) {
            console.error('❌ Error contando notificaciones:', error);
            return 0;
        }
    }

    async createNotification(notifData) {
        try {
            const response = await fetch(`${this.API_URL}/notifications`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(notifData)
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error creando notificación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`${this.API_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error marcando notificación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async markAllNotificationsAsRead(userId) {
        try {
            const response = await fetch(`${this.API_URL}/notifications/user/${userId}/read-all`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error marcando notificaciones:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteNotification(notificationId) {
        try {
            const response = await fetch(`${this.API_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error eliminando notificación:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }
}

// Crear instancia global de la base de datos
window.PortalDB = new PortalDatabase();

// Exportar para uso en módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortalDatabase;
}

console.log('✅ Sistema de Base de Datos Portal ARVIC inicializado con MongoDB');
console.log('📡 Conectado a API:', window.PortalDB.API_URL);
console.log('🔐 Token presente:', !!window.PortalDB.token);