/**
 * SISTEMA DE NOTIFICACIONES PREMIUM - PORTAL ARVIC
 * Gestor global de toasts (ArvicToast)
 */

class ArvicToastClass {
    constructor() {
        this.containerId = 'arvic-toast-container';
        this.container = null;
        this.initContainer();
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById(this.containerId);
        }
    }

    /**
     * Muestra una notificación Toast
     * @param {Object} options 
     * @param {string} options.type - 'success', 'error', 'info', 'warning'
     * @param {string} options.title - Título principal
     * @param {string} options.message - Mensaje descriptivo
     * @param {number} options.duration - Duración en milisegundos (por defecto 4000)
     */
    show({ type = 'info', title = '', message = '', duration = 4000 }) {
        this.initContainer();

        const toast = document.createElement('div');
        toast.className = `arvic-toast toast-${type}`;

        // Obtener icono según el tipo
        let iconHtml = '';
        switch(type) {
            case 'success': iconHtml = '<i class="fa-solid fa-circle-check"></i>'; break;
            case 'error': iconHtml = '<i class="fa-solid fa-circle-exclamation"></i>'; break;
            case 'warning': iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>'; break;
            default: iconHtml = '<i class="fa-solid fa-bell"></i>'; break;
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconHtml}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close-btn"><i class="fa-solid fa-xmark"></i></button>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        this.container.appendChild(toast);

        // Trigger reflow para animación CSS
        void toast.offsetWidth;
        toast.classList.add('show');

        const progressBar = toast.querySelector('.toast-progress-bar');
        
        let start = null;
        let animationFrameId;
        let isPaused = false;
        let timeRemaining = duration;
        let lastTimestamp;

        // Animar barra de progreso
        const animateProgress = (timestamp) => {
            if (!start) start = timestamp;
            if (!lastTimestamp) lastTimestamp = timestamp;

            if (!isPaused) {
                const delta = timestamp - lastTimestamp;
                timeRemaining -= delta;
                
                const progressPercentage = Math.max(0, (timeRemaining / duration) * 100);
                progressBar.style.transform = `scaleX(${progressPercentage / 100})`;

                if (timeRemaining <= 0) {
                    this.removeToast(toast);
                    return;
                }
            }
            lastTimestamp = timestamp;
            animationFrameId = requestAnimationFrame(animateProgress);
        };

        animationFrameId = requestAnimationFrame(animateProgress);

        // Pausar al poner el ratón encima
        toast.addEventListener('mouseenter', () => {
            isPaused = true;
        });

        toast.addEventListener('mouseleave', () => {
            isPaused = false;
            lastTimestamp = performance.now(); // Reset delta
        });

        // Click en botón de cierre o en el toast (opcional)
        toast.querySelector('.toast-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            cancelAnimationFrame(animationFrameId);
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        if (!toast.classList.contains('hiding')) {
            toast.classList.remove('show');
            toast.classList.add('hiding');
            
            // Esperar animación de salida antes de remover
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400); // 400ms match transition time en CSS
        }
    }

    // Sugar syntax methods
    success(title, message, duration) { this.show({ type: 'success', title, message, duration }); }
    error(title, message, duration) { this.show({ type: 'error', title, message, duration }); }
    info(title, message, duration) { this.show({ type: 'info', title, message, duration }); }
    warning(title, message, duration) { this.show({ type: 'warning', title, message, duration }); }
}

// Instanciar globalmente
window.ArvicToast = new ArvicToastClass();
