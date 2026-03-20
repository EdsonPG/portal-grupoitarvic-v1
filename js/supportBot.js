/**
 * Support Chatbot v1.0
 * Intelligent bot for ARVIC Portal Support
 */

class SupportChatBot {
    constructor() {
        this.currentUser = null;
        this.isOpen = false;
        const session = JSON.parse(localStorage.getItem('arvic_current_session')) || null;
        this.currentUser = session ? session.user : null;
        if (!this.currentUser) return;

        this.chatHistory = [];
        this.initDOM();
        this.initEvents();
        this.addSystemMessage("¡Hola! Soy el asistente virtual de Soporte ARVIC 🤖. ¿En qué te puedo ayudar hoy?");
        this.showQuickReplies([
            { id: 'como_reportar', text: '📝 ¿Cómo registro horas?' },
            { id: 'asignaciones', text: '📁 Mis Asignaciones' },
            { id: 'rechazos', text: '❌ Reportes Rechazados' },
            { id: 'soporte_humano', text: '🎧 Hablar con Soporte' }
        ]);
    }

    initDOM() {
        // Create the chatbot panel
        this.container = document.createElement('div');
        this.container.id = 'supportChatbotPanel';
        this.container.className = 'support-bot-panel';
        this.container.innerHTML = `
            <div class="support-bot-header">
                <div class="support-bot-title">
                    <div class="bot-avatar">🤖</div>
                    <div class="bot-info">
                        <h3>Soporte ARVIC</h3>
                        <span>Asistente Virtual</span>
                    </div>
                </div>
                <button class="support-bot-close" id="supportBotCloseBtn"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="support-bot-messages" id="supportBotMessages"></div>
            <div class="support-bot-quick-replies" id="supportBotQuickReplies"></div>
            <div class="support-bot-input-area">
                <input type="text" id="supportBotInput" placeholder="Escribe tu consulta..." />
                <button id="supportBotSendBtn"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        `;

        document.body.appendChild(this.container);

        this.messagesArea = this.container.querySelector('#supportBotMessages');
        this.quickRepliesArea = this.container.querySelector('#supportBotQuickReplies');
        this.input = this.container.querySelector('#supportBotInput');
        this.sendBtn = this.container.querySelector('#supportBotSendBtn');
        this.closeBtn = this.container.querySelector('#supportBotCloseBtn');
    }

    initEvents() {
        // Toggle panel when Soporte button is clicked
        const supportBtns = document.querySelectorAll('button[title="Soporte"]');
        supportBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePanel();
            });
        });

        this.closeBtn.addEventListener('click', () => this.togglePanel(false));
        this.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            const isClickInside = this.container.contains(e.target);
            const isSupportBtn = Array.from(supportBtns).some(btn => btn.contains(e.target));
            if (!isClickInside && !isSupportBtn && this.isOpen) {
                this.togglePanel(false);
            }
        });
    }

    togglePanel(forceOpen = undefined) {
        this.isOpen = forceOpen !== undefined ? forceOpen : !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            // Close other panels
            document.getElementById('notificationsPanel')?.classList.remove('active');
            document.getElementById('helpPanel')?.classList.remove('active');
            // Close chat widget if it exists and is open
            if (window.chatWidget && window.chatWidget.isOpen) {
                window.chatWidget.toggleChat(false);
            }
            this.input.focus();
            this.scrollToBottom();
        }
    }

    handleUserInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.input.value = '';
        this.hideQuickReplies();
        this.addUserMessage(text);
        
        // Disable input while typing
        this.input.disabled = true;
        this.showTypingIndicator();

        setTimeout(() => {
            this.input.disabled = false;
            this.input.focus();
            this.processResponse(text);
        }, 800 + Math.random() * 700);
    }

    addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'bot-msg-row user';
        msgDiv.innerHTML = `<div class="bot-msg-bubble">${this.escapeHTML(text)}</div>`;
        this.messagesArea.appendChild(msgDiv);
        this.scrollToBottom();
    }

    addSystemMessage(text, isHtml = false) {
        // Remove typing indicator if present
        const typing = this.messagesArea.querySelector('.bot-typing');
        if (typing) typing.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = 'bot-msg-row system';
        
        const content = isHtml ? text : this.escapeHTML(text);
        
        msgDiv.innerHTML = `
            <div class="bot-avatar-small">🤖</div>
            <div class="bot-msg-bubble">${content}</div>
        `;
        this.messagesArea.appendChild(msgDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-msg-row system bot-typing';
        typingDiv.innerHTML = `
            <div class="bot-avatar-small">🤖</div>
            <div class="bot-msg-bubble">
                <div class="typing-dots"><span></span><span></span><span></span></div>
            </div>
        `;
        this.messagesArea.appendChild(typingDiv);
        this.scrollToBottom();
    }

    showQuickReplies(replies) {
        this.quickRepliesArea.innerHTML = '';
        if (!replies || replies.length === 0) {
            this.quickRepliesArea.style.display = 'none';
            return;
        }

        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'bot-quick-reply';
            btn.textContent = reply.text;
            btn.onclick = () => {
                this.hideQuickReplies();
                this.addUserMessage(reply.text);
                this.showTypingIndicator();
                setTimeout(() => this.processAction(reply.id), 800);
            };
            this.quickRepliesArea.appendChild(btn);
        });
        
        this.quickRepliesArea.style.display = 'flex';
        this.scrollToBottom();
    }

    hideQuickReplies() {
        this.quickRepliesArea.style.display = 'none';
    }

    // Process free text using keywords
    processResponse(text) {
        text = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents

        if (text.includes('hola') || text.includes('buen dia') || text.includes('saludos')) {
            this.addSystemMessage("¡Hola! ¿En qué te puedo ayudar hoy?");
            return;
        }

        if (text.includes('reporte') || text.includes('horas') || text.includes('registrar')) {
            this.processAction('como_reportar');
            return;
        }

        if (text.includes('asignacion') || text.includes('proyecto')) {
            this.processAction('asignaciones');
            return;
        }

        if (text.includes('rechazo') || text.includes('rechazado')) {
            this.processAction('rechazos');
            return;
        }

        if (text.includes('contraseña') || text.includes('password') || text.includes('clave')) {
            this.processAction('password');
            return;
        }

        if (text.includes('soporte') || text.includes('humano') || text.includes('admin') || text.includes('ayuda') || text.includes('error') || text.includes('falla') || text.includes('problema')) {
            this.processAction('soporte_humano');
            return;
        }

        // Default response
        this.addSystemMessage("No estoy seguro de entender al 100%. Te dejo algunas opciones comunes, o si prefieres, puedes hablar con un administrador:");
        this.showQuickReplies([
            { id: 'como_reportar', text: '📝 ¿Cómo registro horas?' },
            { id: 'soporte_humano', text: '🎧 Contactar Administrador' }
        ]);
    }

    // Process specific actions (from keywords or quick replies)
    processAction(action) {
        switch (action) {
            case 'como_reportar':
                this.addSystemMessage(`
                    <strong>Para registrar horas:</strong><br>
                    1. Ve a la sección principal de tu dashboard.<br>
                    2. En "Mis Asignaciones y Reportes", busca la asignación.<br>
                    3. Haz clic en el botón azul "Crear Ticket".<br>
                    4. Llena el título, descripción, y las horas (en formato decimal, ej: 8.5).<br>
                    5. Envíalo para revisión.
                `, true);
                this.showQuickReplies([
                    { id: 'formato_horas', text: '⏱️ Sobre formato de horas' },
                    { id: 'menu_principal', text: '🔙 Volver al inicio' }
                ]);
                break;
            
            case 'formato_horas':
                this.addSystemMessage("Las horas deben ingresarse en formato decimal. Por ejemplo: 8 horas es <strong>8.0</strong>, y 8 horas con 30 minutos es <strong>8.5</strong>. El mínimo permitido es 0.5 horas.", true);
                this.showQuickReplies([{ id: 'menu_principal', text: '🔙 Volver' }]);
                break;

            case 'asignaciones':
                this.addSystemMessage("Las asignaciones te las crea el administrador. Puedes verlas en la pantalla principal en <strong>Mis Asignaciones y Reportes</strong>. Si no tienes ninguna, significa que aún no te han asignado un proyecto o soporte activo.", true);
                this.showQuickReplies([{ id: 'menu_principal', text: '🔙 Volver' }]);
                break;

            case 'rechazos':
                this.addSystemMessage("Si el estado de tu reporte dice <strong>Rechazado</strong>, significa que el administrador encontró un detalle que debes corregir. Ve a la sección de 'Reportes Rechazados', lee el motivo del rechazo, y crea un nuevo reporte de horas (ticket) con las correcciones.", true);
                this.showQuickReplies([{ id: 'menu_principal', text: '🔙 Volver' }]);
                break;

            case 'password':
                this.addSystemMessage("Para cambiar tu contraseña, abre el menú de tu perfil (arriba a la derecha), selecciona <strong>Seguridad / Contraseña</strong> y sigue los pasos.", true);
                this.showQuickReplies([{ id: 'menu_principal', text: '🔙 Volver' }]);
                break;

            case 'soporte_humano':
                this.addSystemMessage("Entendido. Te pondré en contacto directo con nuestro equipo de administración. Por favor, describe detalladamente tu problema en un mensaje a continuación:", true);
                this.input.placeholder = "Escribe el detalle del problema aquí...";
                
                // Override the Enter handler for one message
                const oldInput = this.input.cloneNode(true);
                this.input.parentNode.replaceChild(oldInput, this.input);
                this.input = oldInput;
                
                const handleSupportRequest = () => {
                    const desc = this.input.value.trim();
                    if (!desc) return;
                    
                    this.input.value = '';
                    this.input.placeholder = "Escribe tu consulta...";
                    this.addUserMessage(desc);
                    this.showTypingIndicator();
                    
                    setTimeout(() => {
                        this.escalateToHuman(desc);
                        // Restore original handlers
                        this.initEvents(); // this will re-bind default handlers but we need to unbind old ones
                    }, 1000);
                };
                
                this.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSupportRequest(); });
                this.sendBtn.onclick = handleSupportRequest;
                break;

            case 'menu_principal':
            default:
                this.addSystemMessage("¿Hay algo más en lo que te pueda ayudar?");
                this.showQuickReplies([
                    { id: 'como_reportar', text: '📝 ¿Cómo registro horas?' },
                    { id: 'asignaciones', text: '📁 Mis Asignaciones' },
                    { id: 'soporte_humano', text: '🎧 Hablar con Soporte' }
                ]);
                break;
        }
    }

    async escalateToHuman(description) {
        try {
            // Update UI immediately for better UX
            const result = await window.PortalDB.sendSupportEmail(description);

            if (result.success) {
                this.addSystemMessage("✅ ¡Mensaje enviado con éxito! Nuestro equipo técnico ha recibido tu correo y se pondrá en contacto contigo pronto.", true);
            } else {
                this.addSystemMessage("❌ Hubo un error al procesar tu solicitud por correo. Por favor contacta al administrador vía Chat manualmente.");
            }
        } catch (e) {
            this.addSystemMessage("❌ Error de conexión al intentar enviar tu solicitud por correo.");
        }

        // Restore default handlers
        const oldInput = this.input.cloneNode(true);
        this.input.parentNode.replaceChild(oldInput, this.input);
        this.input = oldInput;
        this.initEvents();
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
        });
    }

    escapeHTML(s) { 
        const p = document.createElement('p'); 
        p.textContent = s; 
        return p.innerHTML; 
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.supportBot = new SupportChatBot();
});
