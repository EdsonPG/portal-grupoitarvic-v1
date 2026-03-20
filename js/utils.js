/**
 * === UTILIDADES COMPARTIDAS PARA PORTAL ARVIC ===
 * Funciones comunes utilizadas en todo el portal
 */

// === FORMATEO DE FECHAS ===
const DateUtils = {
    formatDate(date, locale = 'es-MX') {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short', // 'short' para abreviar el mes
        day: 'numeric'
    });
},

    formatDateTime(date, locale = 'es-MX') {
        if (!date) return 'N/A';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Fecha inválida';
        
        return dateObj.toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatRelativeTime(date) {
        if (!date) return 'N/A';
        
        const dateObj = new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 30) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        
        return this.formatDate(date);
    },

    formatTime(date, locale = 'es-MX') {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Hora inválida';
    
    return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
},

    isToday(date) {
        if (!date) return false;
        
        const dateObj = new Date(date);
        const today = new Date();
        
        return dateObj.toDateString() === today.toDateString();
    },

    isThisWeek(date) {
    if (!date) return false;
    
    const dateObj = new Date(date);
    const today = new Date();
    
    // Obtener el inicio de la semana (domingo)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // Obtener el final de la semana (sábado)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return dateObj >= weekStart && dateObj <= weekEnd;
}
};

// === VALIDACIONES ===
const ValidationUtils = {
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    isValidUserId(userId) {
        return userId === 'admin' || /^\d{4}$/.test(userId);
    },

    isValidPassword(password) {
        return password && password.length >= 6;
    },

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
            .substring(0, 500); // Limitar longitud
    },

    validateRequired(value, fieldName) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return {
                valid: false,
                message: `${fieldName} es requerido`
            };
        }
        return { valid: true };
    }
};

// === FORMATEO DE TEXTO ===
const TextUtils = {
    truncate(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength - 3) + '...';
    },

    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    capitalizeWords(text) {
        if (!text) return '';
        return text.split(' ')
            .map(word => this.capitalize(word))
            .join(' ');
    },

    formatCurrency(amount, currency = 'MXN') {
        if (isNaN(amount)) return '$0.00';
        
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    formatNumber(number) {
        if (isNaN(number)) return '0';
        
        return new Intl.NumberFormat('es-MX').format(number);
    },

    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
};

// === MANIPULACIÓN DEL DOM ===
const DOMUtils = {
    createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    },

    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = 'block';
            element.classList.remove('d-none');
        }
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = 'none';
            element.classList.add('d-none');
        }
    },

    toggle(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            if (element.style.display === 'none' || element.classList.contains('d-none')) {
                this.show(element);
            } else {
                this.hide(element);
            }
        }
    },

    fadeIn(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        element.classList.remove('d-none');
        
        const fadeEffect = setInterval(() => {
            if (!element.style.opacity) element.style.opacity = 0;
            if (element.style.opacity < 1) {
                element.style.opacity = parseFloat(element.style.opacity) + 0.1;
            } else {
                clearInterval(fadeEffect);
            }
        }, duration / 10);
    },

    fadeOut(element, duration = 300) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (!element) return;
        
        const fadeEffect = setInterval(() => {
            if (!element.style.opacity) element.style.opacity = 1;
            if (element.style.opacity > 0) {
                element.style.opacity = parseFloat(element.style.opacity) - 0.1;
            } else {
                clearInterval(fadeEffect);
                element.style.display = 'none';
                element.classList.add('d-none');
            }
        }, duration / 10);
    },

    scrollToTop(smooth = true) {
        window.scrollTo({
            top: 0,
            behavior: smooth ? 'smooth' : 'auto'
        });
    },

    scrollToElement(element, offset = 0) {
        if (typeof element === 'string') {
            element = document.getElementById(element) || document.querySelector(element);
        }
        if (!element) return;
        
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }
};

// === GESTIÓN DE MODALES ===
const ModalUtils = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Focus en el primer input del modal
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Limpiar formularios dentro del modal
            const forms = modal.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    },

    closeAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }
};

// === NOTIFICACIONES ===
const NotificationUtils = {
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Estilos en línea para la notificación
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px',
            borderRadius: '5px',
            color: 'white',
            zIndex: '9999',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease'
        });
        
        // Colores según el tipo
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Auto-remove después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    },

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    },

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }
};

// === UTILITARIOS DE DATOS ===
const DataUtils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy(array, key, direction = 'asc') {
        return array.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    },

    filterBy(array, filters) {
        return array.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];
                
                if (filterValue === '' || filterValue === null || filterValue === undefined) {
                    return true;
                }
                
                if (typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(filterValue.toLowerCase());
                }
                
                return itemValue === filterValue;
            });
        });
    }
};

// === UTILITARIOS DE STORAGE ===
const StorageUtils = {
    set(key, value, expiration = null) {
        const data = {
            value: value,
            timestamp: new Date().toISOString(),
            expiration: expiration
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    get(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            
            // Verificar expiración
            if (parsed.expiration) {
                const expDate = new Date(parsed.expiration);
                if (new Date() > expDate) {
                    this.remove(key);
                    return null;
                }
            }
            
            return parsed.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// === UTILIDADES COMPARTIDAS PARA PORTAL ARVIC ===
// === EXPORTAR UTILIDADES ===
window.DateUtils = DateUtils;
window.ValidationUtils = ValidationUtils;
window.TextUtils = TextUtils;
window.DOMUtils = DOMUtils;
window.ModalUtils = ModalUtils;
window.NotificationUtils = NotificationUtils;
window.DataUtils = DataUtils;
window.StorageUtils = StorageUtils;

// === SPINNERS Y CARGA ===
const SpinnerUtils = {
    showButtonSpinner(buttonElement, loadingText = 'Cargando...') {
        if (typeof buttonElement === 'string') {
            buttonElement = document.getElementById(buttonElement);
        }
        if (!buttonElement) return;
        
        // Guardar estado original
        if (buttonElement.dataset.originalHtml === undefined) {
            buttonElement.dataset.originalHtml = buttonElement.innerHTML;
        }
        
        // Mantener ancho
        const currentWidth = buttonElement.offsetWidth;
        if (currentWidth > 0 && !buttonElement.style.width) {
            buttonElement.style.width = currentWidth + 'px';
        }
        
        buttonElement.disabled = true;
        buttonElement.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${loadingText}`;
    },
    
    hideButtonSpinner(buttonElement) {
        if (typeof buttonElement === 'string') {
            buttonElement = document.getElementById(buttonElement);
        }
        if (!buttonElement || buttonElement.dataset.originalHtml === undefined) return;
        
        buttonElement.innerHTML = buttonElement.dataset.originalHtml;
        buttonElement.disabled = false;
        buttonElement.style.width = '';
        delete buttonElement.dataset.originalHtml;
    }
};

window.SpinnerUtils = SpinnerUtils;

// === SIDE DRAWERS ===
const SideDrawerUtils = {
    open(title, contentHTML, onSaveCallback = null, saveText = 'Guardar') {
        let overlay = document.getElementById('sideDrawerOverlay');
        let drawer = document.getElementById('sideDrawer');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sideDrawerOverlay';
            overlay.className = 'side-drawer-overlay';
            overlay.onclick = this.close;
            document.body.appendChild(overlay);
            
            drawer = document.createElement('div');
            drawer.id = 'sideDrawer';
            drawer.className = 'side-drawer';
            document.body.appendChild(drawer);
        }
        
        const saveButtonHtml = onSaveCallback 
            ? `<button class="btn btn-primary" id="sideDrawerSaveBtn">
                 <i class="fa-solid fa-save"></i> ${saveText}
               </button>` 
            : '';

        drawer.innerHTML = `
            <div class="side-drawer-header">
                <h3>${title}</h3>
                <button class="side-drawer-close" onclick="SideDrawerUtils.close()">&times;</button>
            </div>
            <div class="side-drawer-body">
                ${contentHTML}
            </div>
            ${onSaveCallback ? `
            <div class="side-drawer-footer">
                <button class="btn btn-secondary" onclick="SideDrawerUtils.close()">Cancelar</button>
                ${saveButtonHtml}
            </div>` : ''}
        `;
        
        if (onSaveCallback) {
            document.getElementById('sideDrawerSaveBtn').onclick = async function() {
                SpinnerUtils.showButtonSpinner(this, 'Guardando...');
                try {
                    await onSaveCallback();
                } finally {
                    SpinnerUtils.hideButtonSpinner(this);
                }
            };
        }
        
        document.body.style.overflow = 'hidden';
        
        // Small delay to allow fade-in effect via CSS class addition
        setTimeout(() => {
            overlay.classList.add('active');
            drawer.classList.add('active');
        }, 10);
    },
    
    close() {
        const overlay = document.getElementById('sideDrawerOverlay');
        const drawer = document.getElementById('sideDrawer');
        if (overlay && drawer) {
            overlay.classList.remove('active');
            drawer.classList.remove('active');
            setTimeout(() => {
                document.body.style.overflow = 'auto';
            }, 300);
        }
    }
};

window.SideDrawerUtils = SideDrawerUtils;

// === INICIALIZACIÓN GLOBAL ===
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            ModalUtils.close(event.target.id);
        }
    });
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            ModalUtils.closeAll();
        }
    });
    
    // Agregar estilos para notificaciones
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }
});