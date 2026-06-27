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

        // Cache system to prevent redundant lookup requests in rendering loops
        this.cache = {
            companies: null,
            supports: null,
            modules: null,
            projects: null,
            users: null,
            assignments: null,
            projectAssignments: null,
            taskAssignments: null,
            reports: null,
            tarifario: null
        };
        this.cacheTimestamps = {
            companies: 0,
            supports: 0,
            modules: 0,
            projects: 0,
            users: 0,
            assignments: 0,
            projectAssignments: 0,
            taskAssignments: 0,
            reports: 0,
            tarifario: 0
        };
        this.CACHE_DURATION = 30000; // Cache valid for 30 seconds
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

    // === GESTIÓN DE CACHÉ ===
    invalidateCache(key) {
        if (this.cache && key in this.cache) {
            this.cache[key] = null;
            this.cacheTimestamps[key] = 0;
            console.log(`[Cache] Invalida caché de: ${key}`);
        }
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
        localStorage.removeItem('arvic_current_session');
        sessionStorage.removeItem('arvic_support_bot_history'); // Limpiar el historial del bot de soporte al cerrar sesión
        console.log('✅ Sesión cerrada');
    }

    // === 👇 NUEVO: ENDPOINTS CONSOLIDADOS PARA CARGA ULTRA-RÁPIDA ===
    async getAllAdminData() {
        try {
            console.log('📡 Solicitando datos consolidados de Administrador...');
            const response = await fetch(`${this.API_URL}/all-data/admin`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error obteniendo datos admin consolidados:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }

    async getAllConsultorData() {
        try {
            console.log('📡 Solicitando datos consolidados de Consultor...');
            const response = await fetch(`${this.API_URL}/all-data/consultor`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error obteniendo datos consultor consolidados:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.API_URL}/auth/validate`, {
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error validando token:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    prefillCacheFromAllData(data) {
        const now = Date.now();
        console.log('⚡ Llenando caché de Administrador con datos consolidados...');

        if (data.users) {
            const users = {};
            data.users.forEach(user => {
                users[user.userId] = user;
            });
            this.cache.users = users;
            this.cacheTimestamps.users = now;
        }

        if (data.companies) {
            const companies = {};
            data.companies.forEach(company => {
                companies[company.companyId] = company;
            });
            this.cache.companies = companies;
            this.cacheTimestamps.companies = now;
        }

        if (data.projects) {
            const projects = {};
            data.projects.forEach(project => {
                projects[project.projectId] = project;
            });
            this.cache.projects = projects;
            this.cacheTimestamps.projects = now;
        }

        if (data.supports) {
            const supports = {};
            data.supports.forEach(support => {
                supports[support.supportId] = support;
            });
            this.cache.supports = supports;
            this.cacheTimestamps.supports = now;
        }

        if (data.modules) {
            const modules = {};
            data.modules.forEach(module => {
                modules[module.moduleId] = module;
            });
            this.cache.modules = modules;
            this.cacheTimestamps.modules = now;
        }

        if (data.assignments) {
            const assignments = {};
            data.assignments.forEach(a => {
                assignments[a.assignmentId] = a;
            });
            this.cache.assignments = assignments;
            this.cacheTimestamps.assignments = now;
        }

        if (data.projectAssignments) {
            const projectAssignments = {};
            data.projectAssignments.forEach(pa => {
                projectAssignments[pa.projectAssignmentId] = pa;
            });
            this.cache.projectAssignments = projectAssignments;
            this.cacheTimestamps.projectAssignments = now;
        }

        if (data.taskAssignments) {
            this.cache.taskAssignments = this.arrayToObject(data.taskAssignments);
            this.cacheTimestamps.taskAssignments = now;
        }

        if (data.reports) {
            const reportsObj = {};
            data.reports.forEach(report => {
                const mappedReport = {
                    ...report,
                    id: report.reportId || report._id,
                    status: report.status || report.estado
                };
                reportsObj[report.reportId] = mappedReport;
            });
            this.cache.reports = reportsObj;
            this.cacheTimestamps.reports = now;
            
            try {
                this.reconstructTimesheetsFromReports(data.reports);
            } catch (e) {
                console.error('Error al reconstruir timesheets desde caché admin:', e);
            }
        }

        if (data.tarifario) {
            const tarifarios = {};
            data.tarifario.forEach(tarifario => {
                const tarifarioMapeado = {
                    id: tarifario.tarifarioId,
                    tarifarioId: tarifario.tarifarioId,
                    assignmentId: tarifario.assignmentId,
                    idAsignacion: tarifario.assignmentId,
                    assignmentType: tarifario.tipo,
                    tipo: tarifario.tipo === 'support' ? 'soporte' : 
                          tarifario.tipo === 'project' ? 'proyecto' : 'tarea',
                    consultorId: tarifario.consultorId,
                    clienteId: tarifario.companyId,
                    moduleId: tarifario.moduleId,
                    supportId: tarifario.supportId,
                    projectId: tarifario.projectId,
                    consultorNombre: tarifario.consultorNombre,
                    empresaNombre: tarifario.companyName,
                    clienteNombre: tarifario.companyName,
                    moduloNombre: tarifario.moduleName || 'Sin módulo',
                    trabajoNombre: tarifario.supportName || tarifario.projectName || 'Sin trabajo',
                    trabajoId: tarifario.supportId || tarifario.projectId,
                    costoConsultor: parseFloat(tarifario.costoConsultor || 0),
                    costoCliente: parseFloat(tarifario.costoCliente || 0),
                    margen: parseFloat(tarifario.margen || 0),
                    margenPorcentaje: parseFloat(tarifario.margenPorcentaje || 0),
                    descripcionTarea: tarifario.descripcionTarea || null,
                    fechaCreacion: tarifario.fechaCreacion || tarifario.createdAt,
                    isActive: tarifario.isActive !== false,
                    updatedAt: tarifario.updatedAt
                };
                tarifarios[tarifario.assignmentId] = tarifarioMapeado;
            });
            this.cache.tarifario = tarifarios;
            this.cacheTimestamps.tarifario = now;
        }
    }

    prefillConsultorCacheFromAllData(data) {
        const now = Date.now();
        console.log('⚡ Llenando caché de Consultor con datos consolidados...');

        if (data.companies) {
            const companies = {};
            data.companies.forEach(company => {
                companies[company.id || company.companyId] = company;
            });
            this.cache.companies = companies;
            this.cacheTimestamps.companies = now;
        }

        if (data.supports) {
            const supports = {};
            data.supports.forEach(support => {
                supports[support.id || support.supportId] = support;
            });
            this.cache.supports = supports;
            this.cacheTimestamps.supports = now;
        }

        if (data.modules) {
            const modules = {};
            data.modules.forEach(module => {
                modules[module.id || module.moduleId] = module;
            });
            this.cache.modules = modules;
            this.cacheTimestamps.modules = now;
        }

        if (data.projects) {
            const projects = {};
            data.projects.forEach(project => {
                projects[project.id || project.projectId] = project;
            });
            this.cache.projects = projects;
            this.cacheTimestamps.projects = now;
        }

        if (data.reports) {
            const reportsObj = {};
            data.reports.forEach(report => {
                const mappedReport = {
                    ...report,
                    id: report.reportId || report._id,
                    status: report.status || report.estado
                };
                reportsObj[report.reportId] = mappedReport;
            });
            this.cache.reports = reportsObj;
            this.cacheTimestamps.reports = now;
            
            try {
                this.reconstructTimesheetsFromReports(data.reports);
            } catch (e) {
                console.error('Error al reconstruir timesheets desde caché consultor:', e);
            }
        }

        if (data.assignments) {
            const assignments = {};
            data.assignments.forEach(a => {
                assignments[a.assignmentId] = a;
            });
            this.cache.assignments = assignments;
            this.cacheTimestamps.assignments = now;
        }

        if (data.projectAssignments) {
            const projectAssignments = {};
            data.projectAssignments.forEach(pa => {
                projectAssignments[pa.projectAssignmentId] = pa;
            });
            this.cache.projectAssignments = projectAssignments;
            this.cacheTimestamps.projectAssignments = now;
        }

        if (data.taskAssignments) {
            this.cache.taskAssignments = this.arrayToObject(data.taskAssignments);
            this.cacheTimestamps.taskAssignments = now;
        }
    }

    // === GESTIÓN DE USUARIOS ===
    async getUsers() {
        const now = Date.now();
        if (this.cache && this.cache.users && (now - this.cacheTimestamps.users < this.CACHE_DURATION)) {
            return this.cache.users;
        }
        try {
            const response = await fetch(`${this.API_URL}/users`, {
                method: 'GET',
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            
            if (result.success) {
                const users = {};
                result.data.forEach(user => {
                    users[user.userId] = user;  // ✅ Cambiar de user.id a user.userId
                });
                this.cache.users = users;
                this.cacheTimestamps.users = now;
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
                headers: this.getHeaders(),
                cache: 'no-store'
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

            this.invalidateCache('users');
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
                this.invalidateCache('users');
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
                this.invalidateCache('users');
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
        const now = Date.now();
        if (this.cache && this.cache.companies && (now - this.cacheTimestamps.companies < this.CACHE_DURATION)) {
            return this.cache.companies;
        }
        try {
            const response = await fetch(`${this.API_URL}/companies`, {
                method: 'GET',
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            
            if (result.success) {
                const companies = {};
                result.data.forEach(company => {
                    companies[company.companyId] = company;  // ✅ YA CORRECTO
                });
                this.cache.companies = companies;
                this.cacheTimestamps.companies = now;
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
                this.invalidateCache('companies');
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
                console.log('Empresa actualizada:', companyId);
                this.invalidateCache('companies');
                return { success: true, company: result.data };
            }
            
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Error actualizando empresa:', error);
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
                this.invalidateCache('companies');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando empresa:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE PROYECTOS ===
    async getProjects() {
        const now = Date.now();
        if (this.cache && this.cache.projects && (now - this.cacheTimestamps.projects < this.CACHE_DURATION)) {
            return this.cache.projects;
        }
        try {
            const response = await fetch(`${this.API_URL}/projects`, {
                method: 'GET',
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            
            if (result.success) {
                const projects = {};
                result.data.forEach(project => {
                    projects[project.projectId] = project;  // ✅ YA CORRECTO
                });
                this.cache.projects = projects;
                this.cacheTimestamps.projects = now;
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
                this.invalidateCache('projects');
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
                this.invalidateCache('projects');
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
                this.invalidateCache('projects');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando proyecto:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE SOPORTES ===
    async getSupports() {
        const now = Date.now();
        if (this.cache && this.cache.supports && (now - this.cacheTimestamps.supports < this.CACHE_DURATION)) {
            return this.cache.supports;
        }
        try {
            const response = await fetch(`${this.API_URL}/supports`, {
                method: 'GET',
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            
            if (result.success) {
                const supports = {};
                result.data.forEach(support => {
                    supports[support.supportId] = support;  // ✅ YA CORRECTO
                });
                this.cache.supports = supports;
                this.cacheTimestamps.supports = now;
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
                this.invalidateCache('supports');
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
                this.invalidateCache('supports');
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
                this.invalidateCache('supports');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando soporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE MÓDULOS ===
    async getModules() {
        const now = Date.now();
        if (this.cache && this.cache.modules && (now - this.cacheTimestamps.modules < this.CACHE_DURATION)) {
            return this.cache.modules;
        }
        try {
            const response = await fetch(`${this.API_URL}/modules`, {
                method: 'GET',
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            
            if (result.success) {
                const modules = {};
                result.data.forEach(module => {
                    modules[module.moduleId] = module;  // ✅ YA CORRECTO
                });
                this.cache.modules = modules;
                this.cacheTimestamps.modules = now;
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
                this.invalidateCache('modules');
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
                this.invalidateCache('modules');
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
                this.invalidateCache('modules');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error eliminando módulo:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE ASIGNACIONES DE SOPORTE ===
    async getAssignments() {
        const now = Date.now();
        if (this.cache && this.cache.assignments && (now - this.cacheTimestamps.assignments < this.CACHE_DURATION)) {
            return this.cache.assignments;
        }
        try {
            const response = await fetch(`${this.API_URL}/assignments`, {
                headers: this.getHeaders(),
                cache: 'no-store'
            });
            const data = await response.json();
            
            if (data.success) {
                // ✅ CORRECCIÓN: Usar assignmentId en lugar de id
                const assignments = {};
                data.data.forEach(assignment => {
                    assignments[assignment.assignmentId] = assignment;  // ✅ CAMBIO AQUÍ
                });
                this.cache.assignments = assignments;
                this.cacheTimestamps.assignments = now;
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
        const now = Date.now();
        if (this.cache && this.cache.projectAssignments && (now - this.cacheTimestamps.projectAssignments < this.CACHE_DURATION)) {
            return this.cache.projectAssignments;
        }
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
                this.cache.projectAssignments = projectAssignments;
                this.cacheTimestamps.projectAssignments = now;
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
        const now = Date.now();
        if (this.cache && this.cache.taskAssignments && (now - this.cacheTimestamps.taskAssignments < this.CACHE_DURATION)) {
            return this.cache.taskAssignments;
        }
        try {
            const response = await fetch(`${this.API_URL}/taskAssignments`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const mapped = this.arrayToObject(data.data);
                this.cache.taskAssignments = mapped;
                this.cacheTimestamps.taskAssignments = now;
                return mapped;
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
        const now = Date.now();
        if (this.cache && this.cache.reports && (now - this.cacheTimestamps.reports < this.CACHE_DURATION)) {
            return this.cache.reports;
        }
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
                        id: report.reportId || report._id,
                        status: report.status || report.estado
                    };
                    reportsObj[report.reportId] = mappedReport;
                });
                
                try {
                    this.reconstructTimesheetsFromReports(result.data);
                } catch (e) {
                    console.error('Error reconstructing timesheets in getReports:', e);
                }
                
                this.cache.reports = reportsObj;
                this.cacheTimestamps.reports = now;
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
            if (data.success && Array.isArray(data.data)) {
                try {
                    this.reconstructTimesheetsFromReports(data.data);
                } catch (e) {
                    console.error('Error reconstructing timesheets in getReportsByUser:', e);
                }
                return data.data;
            }
            return [];
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

        // === GESTIÓN DE REPORTES EXCEL GENERADOS (PERSISTENCIA EN MONGODB) ===
    /**
     * Obtener reportes generados
     * @returns {Object} Historial de reportes generados
     */
    async getGeneratedReports() {
        try {
            const response = await fetch(`${this.API_URL}/generatedReports`, {
                headers: this.getHeaders()
            });
            const data = await response.json();
            if (data.success) {
                const reportsObj = {};
                data.data.forEach(report => {
                    reportsObj[report.reportId] = {
                        ...report,
                        id: report.reportId || report._id
                    };
                });
                return reportsObj;
            }
            return {};
        } catch (e) {
            console.error('❌ Error leyendo reportes generados de MongoDB:', e);
            return {};
        }
    }

    /**
     * Guardar reporte generado
     * @returns {Object} Resultado de la operación
     */
    async saveGeneratedReport(reportData) {
        try {
            const reportId = `excel_${Date.now()}`;
            const payload = {
                reportId: reportId,
                fileName: reportData.fileName,
                reportType: reportData.reportType,
                generatedBy: reportData.generatedBy || 'Hector Perez',
                dateRange: reportData.dateRange,
                recordCount: reportData.recordCount || 0,
                totalHours: reportData.totalHours || 0,
                totalAmount: reportData.totalAmount || 0,
                downloadCount: 0
            };
            
            const response = await fetch(`${this.API_URL}/generatedReports`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Reporte guardado en MongoDB:', reportId);
                return { 
                    success: true, 
                    report: {
                        ...data.data,
                        id: data.data.reportId || data.data._id
                    } 
                };
            }
            return { success: false, message: data.message };
        } catch (e) {
            console.error('❌ Error guardando reporte generado en MongoDB:', e);
            return { success: false, message: 'Error de conexión' };
        }
    }

    /**
     * Incrementar contador de descargas
     * @returns {Object} Resultado de la operación
     */
    async incrementDownloadCount(reportId) {
        try {
            const response = await fetch(`${this.API_URL}/generatedReports/${reportId}`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            const data = await response.json();
            return data.success ? { success: true } : { success: false, message: data.message };
        } catch (e) {
            console.error('❌ Error incrementando descargas en MongoDB:', e);
            return { success: false, message: 'Error de conexión' };
        }
    }

    /**
     * Eliminar reporte generado
     * @returns {Object} Resultado de la operación
     */
    async deleteGeneratedReport(reportId) {
        try {
            const response = await fetch(`${this.API_URL}/generatedReports/${reportId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Reporte eliminado de MongoDB:', reportId);
                return { success: true, message: 'Reporte eliminado del historial' };
            }
            return { success: false, message: data.message };
        } catch (e) {
            console.error('❌ Error eliminando reporte de MongoDB:', e);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // === GESTIÓN DE TARIFARIO ===
async getTarifarios() {
    const now = Date.now();
    if (this.cache && this.cache.tarifario && (now - this.cacheTimestamps.tarifario < this.CACHE_DURATION)) {
        return this.cache.tarifario;
    }
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
            
            this.cache.tarifario = tarifarios;
            this.cacheTimestamps.tarifario = now;
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
                this.invalidateCache('tarifario');
                console.log('Entrada de tarifario actualizada:', tarifaId);
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

    // === GESTIÓN DE CHAT ===
    async getChatHistory(contextId, isReport = false) {
        try {
            const url = `${this.API_URL}/chat/history/${contextId}${isReport ? '?isReport=true' : ''}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('❌ Error obteniendo historial de chat:', error);
            return null;
        }
    }

    async sendChatMessage(payload) {
        try {
            const response = await fetch(`${this.API_URL}/chat/send`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error enviando mensaje de chat:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async sendSupportEmail(message) {
        try {
            const response = await fetch(`${this.API_URL}/chat/support-email`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ message })
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error enviando email de soporte:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async getUnreadChatCounts(userId) {
        try {
            const response = await fetch(`${this.API_URL}/chat/unread-count/${userId}`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result : { totalUnread: 0, bySender: [] };
        } catch (error) {
            console.error('❌ Error obteniendo conteo de no leídos:', error);
            return { totalUnread: 0, bySender: [] };
        }
    }

    async markChatAsRead(senderId) {
        try {
            const response = await fetch(`${this.API_URL}/chat/mark-read/${senderId}`, {
                method: 'PUT',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error marcando chat como leído:', error);
            return { success: false };
        }
    }

    async getLastMessages(userId) {
        try {
            const response = await fetch(`${this.API_URL}/chat/last-messages/${userId}`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error obteniendo últimos mensajes:', error);
            return [];
        }
    }

    async deleteChatMessage(messageId) {
        try {
            const response = await fetch(`${this.API_URL}/chat/message/${messageId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error eliminando mensaje:', error);
            return { success: false };
        }
    }

    // === GESTIÓN DE CALENDARIO ===
    async getCalendarEvents(startDate, endDate, userId) {
        try {
            let url = `${this.API_URL}/calendar/events?`;
            if (startDate) url += `start=${startDate}&`;
            if (endDate) url += `end=${endDate}&`;
            if (userId) url += `userId=${userId}`;
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error obteniendo eventos:', error);
            return [];
        }
    }

    async getCalendarEvent(eventId) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events/${eventId}`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('❌ Error obteniendo evento:', error);
            return null;
        }
    }

    async createCalendarEvent(eventData) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(eventData)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error creando evento:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async updateCalendarEvent(eventId, updates) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events/${eventId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error actualizando evento:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async deleteCalendarEvent(eventId) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events/${eventId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error eliminando evento:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async getDaySummary(date) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/day-summary/${date}`, {
                headers: this.getHeaders()
            });
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('❌ Error obteniendo resumen del día:', error);
            return null;
        }
    }

    async rsvpCalendarEvent(eventId, status) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ status })
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error actualizando RSVP:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async sendCalendarInvites(eventId) {
        try {
            const response = await fetch(`${this.API_URL}/calendar/events/${eventId}/invite`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error enviando invitaciones:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    reconstructTimesheetsFromReports(reportsArray) {
        if (!reportsArray || !Array.isArray(reportsArray)) return;

        // Helper local para decodificar descripción
        const deserializeDescription = (description) => {
            const match = description?.match(/^\[TICKET:(.*?)\] (.*)$/);
            if (match) {
                return {
                    ticket: match[1],
                    detail: match[2]
                };
            }
            const matchOnly = description?.match(/^\[TICKET:(.*?)\]$/);
            if (matchOnly) {
                return {
                    ticket: matchOnly[1],
                    detail: ''
                };
            }
            return {
                ticket: '',
                detail: description || ''
            };
        };

        // Group reports by userId and weekStart
        const groups = {};
        
        reportsArray.forEach(report => {
            const userId = report.userId;
            const dateStr = report.reportDate || report.date;
            if (!userId || !dateStr) return;
            
            const baseDateStr = dateStr.split('T')[0];
            const d = new Date(baseDateStr + 'T00:00:00');
            if (isNaN(d.getTime())) return;
            
            // Calculate Monday
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            const y = monday.getFullYear();
            const m = String(monday.getMonth() + 1).padStart(2, '0');
            const dayNum = String(monday.getDate()).padStart(2, '0');
            const weekStartStr = `${y}-${m}-${dayNum}`;
            
            const key = `${userId}_${weekStartStr}`;
            if (!groups[key]) {
                groups[key] = {
                    userId,
                    weekStart: weekStartStr,
                    reports: []
                };
            }
            groups[key].reports.push(report);
        });
        
        // Load current arvic_timesheets
        let timesheets = {};
        try {
            const data = localStorage.getItem('arvic_timesheets');
            if (data) timesheets = JSON.parse(data);
        } catch (e) {
            console.error('Error parsing arvic_timesheets:', e);
        }
        
        // Reconstruct timesheets
        Object.values(groups).forEach(group => {
            const { userId, weekStart, reports } = group;
            
            const weekStartObj = new Date(weekStart + 'T00:00:00');
            const sunday = new Date(weekStartObj);
            sunday.setDate(sunday.getDate() + 6);
            const y = sunday.getFullYear();
            const m = String(sunday.getMonth() + 1).padStart(2, '0');
            const d = String(sunday.getDate()).padStart(2, '0');
            const weekEndStr = `${y}-${m}-${d}`;
            
            const timesheetId = `ts_${userId}_${weekStart.replace(/-/g, '')}`;
            const existing = timesheets[timesheetId] || {};
            
            // Build entries
            const entriesMap = {};
            let totalWeekHours = 0;
            const generatedReportIds = [];
            
            let hasPending = false;
            let hasRejected = false;
            let hasBorrador = false;
            let rejectionReason = null;
            
            reports.forEach(report => {
                const reportId = report.reportId || report.id || report._id;
                generatedReportIds.push(reportId);
                
                const repStatus = report.status || report.estado || 'Pendiente';
                if (repStatus === 'Pendiente' || repStatus === 'Resubmitted') {
                    hasPending = true;
                } else if (repStatus === 'Rechazado') {
                    hasRejected = true;
                    if (report.feedback) {
                        rejectionReason = report.feedback;
                    }
                } else if (repStatus === 'Borrador') {
                    hasBorrador = true;
                }
                
                const hours = parseFloat(report.hours) || 0;
                totalWeekHours += hours;
                
                const assignmentId = report.assignmentId;
                const { ticket, detail } = deserializeDescription(report.description);
                const groupKey = `${assignmentId}_${ticket}`;
                
                if (!entriesMap[groupKey]) {
                    let label = report.title || assignmentId;
                    if (label.includes(' — ')) {
                        label = label.split(' — ')[1];
                    }
                    entriesMap[groupKey] = {
                        rowId: `row_${assignmentId}_${ticket.replace(/[^a-zA-Z0-9]/g, '')}`,
                        assignmentId,
                        assignmentType: report.assignmentType || 'support',
                        assignmentLabel: label,
                        ticket: ticket,
                        days: {
                            mon: { hours: 0, detail: '' },
                            tue: { hours: 0, detail: '' },
                            wed: { hours: 0, detail: '' },
                            thu: { hours: 0, detail: '' },
                            fri: { hours: 0, detail: '' },
                            sat: { hours: 0, detail: '' },
                            sun: { hours: 0, detail: '' }
                        },
                        totalHours: 0
                    };
                }
                
                const repDate = new Date((report.date || report.reportDate).split('T')[0] + 'T00:00:00');
                const dayIndex = repDate.getDay();
                const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
                
                entriesMap[groupKey].days[dayKey].hours = hours;
                const rawDesc = detail || '';
                const cleanDesc = (rawDesc === 'JUSTIFICACION_PENDIENTE' || rawDesc.startsWith('Horas registradas:')) ? '' : rawDesc;
                entriesMap[groupKey].days[dayKey].detail = cleanDesc;
                entriesMap[groupKey].totalHours += hours;
            });
            
            let status = 'Borrador';
            if (hasRejected) {
                status = 'Rechazado';
            } else if (hasPending) {
                status = 'Pendiente';
            } else if (!hasBorrador) {
                status = 'Aprobado';
            }
            
            // Resolve userName
            let userName = existing.userName || '';
            if (!userName) {
                try {
                    const session = JSON.parse(localStorage.getItem('arvic_current_session'));
                    if (session && session.user && session.user.userId === userId) {
                        userName = session.user.name;
                    }
                } catch(e) {}
            }
            if (!userName && this.cache && this.cache.users && this.cache.users[userId]) {
                userName = this.cache.users[userId].name;
            }
            
            timesheets[timesheetId] = {
                timesheetId,
                userId,
                userName,
                weekStart,
                weekEnd: weekEndStr,
                entries: Object.values(entriesMap),
                totalWeekHours,
                status: existing.status === 'Borrador' ? 'Borrador' : status,
                generatedReportIds,
                submittedAt: existing.submittedAt || reports[0].createdAt || new Date().toISOString(),
                reviewedAt: existing.reviewedAt || null,
                reviewedBy: existing.reviewedBy || null,
                rejectionReason: rejectionReason || existing.rejectionReason || null,
                createdAt: existing.createdAt || reports[0].createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        });
        
        localStorage.setItem('arvic_timesheets', JSON.stringify(timesheets));
    }

    async syncTimesheetsFromDB(userId) {
        if (userId) {
            await this.getReportsByUser(userId);
        } else {
            await this.getReports();
        }
    }

    // === GESTIÓN DE TIMESHEETS SEMANALES (localStorage temporal) ===
    getTimesheets() {
        try {
            const data = localStorage.getItem('arvic_timesheets');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error reading timesheets:', e);
            return {};
        }
    }

    getTimesheetsByUser(userId) {
        const timesheets = this.getTimesheets();
        return Object.values(timesheets).filter(ts => ts.userId === userId);
    }

    getTimesheetByWeek(userId, weekStart) {
        const timesheets = this.getTimesheets();
        return Object.values(timesheets).find(ts => 
            ts.userId === userId && ts.weekStart === weekStart
        ) || null;
    }

    createTimesheet(tsData) {
        const timesheets = this.getTimesheets();
        const timesheetId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const newTimesheet = {
            timesheetId,
            userId: tsData.userId,
            userName: tsData.userName || '',
            weekStart: tsData.weekStart,
            weekEnd: tsData.weekEnd,
            entries: tsData.entries || [],
            totalWeekHours: tsData.totalWeekHours || 0,
            status: tsData.status || 'Borrador',
            generatedReportIds: tsData.generatedReportIds || [],
            submittedAt: null,
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        timesheets[timesheetId] = newTimesheet;
        localStorage.setItem('arvic_timesheets', JSON.stringify(timesheets));
        return { success: true, timesheet: newTimesheet };
    }

    updateTimesheet(timesheetId, updateData) {
        const timesheets = this.getTimesheets();
        if (!timesheets[timesheetId]) {
            return { success: false, message: 'Timesheet no encontrado' };
        }

        timesheets[timesheetId] = {
            ...timesheets[timesheetId],
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('arvic_timesheets', JSON.stringify(timesheets));
        return { success: true, timesheet: timesheets[timesheetId] };
    }

    deleteTimesheet(timesheetId) {
        const timesheets = this.getTimesheets();
        if (!timesheets[timesheetId]) {
            return { success: false, message: 'Timesheet no encontrado' };
        }
        delete timesheets[timesheetId];
        localStorage.setItem('arvic_timesheets', JSON.stringify(timesheets));
        return { success: true };
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