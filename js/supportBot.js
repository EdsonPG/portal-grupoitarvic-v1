/**
 * Support Chatbot v2.0 - Híbrido (Gemini AI + Local NLP Fallback)
 * Intelligent chatbot for ARVIC Portal Support
 */

class SupportChatBot {
    constructor() {
        this.currentUser = null;
        this.isOpen = false;
        this.chatHistory = []; // Almacena el historial para enviar a Gemini
        this.apiBase = '';
        this.maxLocalRetriesBeforeEscalate = 3;
        this.localRetryCount = 0;

        // Detectar API URL
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        this.apiBase = isDevelopment ? 'http://localhost:3000' : window.location.origin;

        const session = JSON.parse(localStorage.getItem('arvic_current_session')) || null;
        this.currentUser = session ? session.user : null;
        if (!this.currentUser) return;

        this.initDOM();
        this.initEvents();
        this.loadSessionHistory();
    }

    initDOM() {
        // Eliminar panel existente si ya existe por duplicación
        const existingPanel = document.getElementById('supportChatbotPanel');
        if (existingPanel) existingPanel.remove();

        // Crear contenedor del chatbot
        this.container = document.createElement('div');
        this.container.id = 'supportChatbotPanel';
        this.container.className = 'support-bot-panel';
        this.container.style.visibility = 'hidden';
        this.container.style.opacity = '0';
        this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        this.container.innerHTML = `
            <div class="support-bot-header">
                <div class="support-bot-title">
                    <div class="bot-avatar">🤖</div>
                    <div class="bot-info">
                        <h3>Soporte ARVIC</h3>
                        <span id="botSubTitle">Asistente Virtual IA</span>
                    </div>
                </div>
                <button class="support-bot-close" id="supportBotCloseBtn" aria-label="Cerrar soporte"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="support-bot-messages" id="supportBotMessages"></div>
            <div class="support-bot-quick-replies" id="supportBotQuickReplies"></div>
            <div class="support-bot-input-area">
                <input type="text" id="supportBotInput" placeholder="Escribe tu consulta aquí..." autocomplete="off" />
                <button id="supportBotSendBtn" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
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
        // Toggle panel al hacer clic en botones de soporte
        const supportBtns = document.querySelectorAll('button[title="Soporte"]');
        supportBtns.forEach(btn => {
            // Eliminar listeners previos clonando
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePanel();
            });
        });

        this.closeBtn.onclick = () => this.togglePanel(false);
        this.sendBtn.onclick = () => this.handleUserInput();
        
        this.input.onkeypress = (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        };

        // Cerrar al hacer clic fuera del panel
        document.onclick = (e) => {
            const isClickInside = this.container.contains(e.target);
            const activeSupportBtns = document.querySelectorAll('button[title="Soporte"]');
            const isSupportBtn = Array.from(activeSupportBtns).some(btn => btn.contains(e.target));
            if (!isClickInside && !isSupportBtn && this.isOpen) {
                this.togglePanel(false);
            }
        };
    }

    togglePanel(forceOpen = undefined) {
        this.isOpen = forceOpen !== undefined ? forceOpen : !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);
        
        if (this.isOpen) {
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            
            // Cerrar otros paneles desplegables del header
            document.getElementById('notificationsPanel')?.classList.remove('active');
            document.getElementById('helpPanel')?.classList.remove('active');
            if (window.chatWidget && window.chatWidget.isOpen) {
                window.chatWidget.toggleChat(false);
            }
            
            this.input.focus();
            this.scrollToBottom();
        } else {
            this.container.style.opacity = '0';
            setTimeout(() => {
                if (!this.isOpen) this.container.style.visibility = 'hidden';
            }, 300);
        }
    }

    // === GESTIÓN DE HISTORIAL Y PERSISTENCIA ===
    
    loadSessionHistory() {
        const stored = sessionStorage.getItem('arvic_support_bot_history');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.chatHistory = parsed.history || [];
                this.localRetryCount = parsed.localRetryCount || 0;
                
                if (parsed.htmlContent) {
                    this.messagesArea.innerHTML = parsed.htmlContent;
                    this.scrollToBottom();
                    
                    // Restaurar quick replies si correspondiera
                    if (parsed.quickReplies && parsed.quickReplies.length > 0) {
                        this.showQuickReplies(parsed.quickReplies);
                    }
                    return;
                }
            } catch (e) {
                console.error('Error cargando historial de bot:', e);
            }
        }

        // Historial vacío: Inicializar bienvenida
        this.messagesArea.innerHTML = '';
        const namePart = this.currentUser.name ? `, ${this.currentUser.name}` : '';
        this.addSystemMessage(`¡Hola${namePart}! Soy tu asistente virtual de Soporte ARVIC 🤖. Estoy aquí para ayudarte a resolver cualquier duda sobre el portal. ¿Qué deseas consultar hoy?`);
        
        this.showWelcomeMenu();
    }

    saveSessionHistory(quickReplies = []) {
        try {
            const dataToStore = {
                history: this.chatHistory,
                localRetryCount: this.localRetryCount,
                htmlContent: this.messagesArea.innerHTML,
                quickReplies: quickReplies
            };
            sessionStorage.setItem('arvic_support_bot_history', JSON.stringify(dataToStore));
        } catch (e) {
            console.error('Error guardando historial de bot:', e);
        }
    }

    showWelcomeMenu() {
        if (this.currentUser.role === 'admin') {
            this.showQuickReplies([
                { id: 'admin_crear_usuario', text: '👤 ¿Cómo creo un usuario?' },
                { id: 'admin_tarifas', text: '💰 Asignar proyectos/tarifas' },
                { id: 'admin_aprobar', text: '✅ Aprobar Timesheets' },
                { id: 'soporte_humano', text: '🎧 Reportar fallo técnico' }
            ]);
        } else {
            this.showQuickReplies([
                { id: 'consultor_registrar', text: '📝 ¿Cómo registro mis horas?' },
                { id: 'consultor_asignaciones', text: '📁 No veo mis proyectos' },
                { id: 'consultor_rechazados', text: '❌ Corregir tickets rechazados' },
                { id: 'soporte_humano', text: '🎧 Hablar con Soporte' }
            ]);
        }
    }

    // === INTERACCIÓN DEL USUARIO ===

    handleUserInput() {
        const text = this.input.value.trim();
        if (!text) return;

        this.input.value = '';
        this.hideQuickReplies();
        this.addUserMessage(text);
        
        // Deshabilitar input momentáneamente
        this.input.disabled = true;
        this.showTypingIndicator();

        this.chatHistory.push({ role: 'user', text });

        // Intentar responder vía IA de Gemini
        this.getAIResponse(text);
    }

    addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'bot-msg-row user';
        msgDiv.innerHTML = `<div class="bot-msg-bubble">${this.escapeHTML(text)}</div>`;
        this.messagesArea.appendChild(msgDiv);
        this.scrollToBottom();
        this.saveSessionHistory();
    }

    addSystemMessage(text, isHtml = false) {
        // Remover indicador de escritura si existe
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
        this.saveSessionHistory();
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
            this.saveSessionHistory([]);
            return;
        }

        replies.forEach(reply => {
            const btn = document.createElement('button');
            btn.className = 'bot-quick-reply';
            btn.textContent = reply.text;
            btn.onclick = () => {
                this.hideQuickReplies();
                this.addUserMessage(reply.text);
                this.chatHistory.push({ role: 'user', text: reply.text });
                this.showTypingIndicator();
                setTimeout(() => this.processLocalAction(reply.id), 600);
            };
            this.quickRepliesArea.appendChild(btn);
        });
        
        this.quickRepliesArea.style.display = 'flex';
        this.scrollToBottom();
        this.saveSessionHistory(replies);
    }

    hideQuickReplies() {
        this.quickRepliesArea.style.display = 'none';
    }

    // === CANAL 1: CONSULTA DE INTELIGENCIA ARTIFICIAL (GEMINI) ===

    async getAIResponse(text) {
        try {
            const token = localStorage.getItem('arvic_token');
            const response = await fetch(`${this.apiBase}/api/chat/support-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    message: text,
                    chatHistory: this.chatHistory.slice(-6) // Enviar solo los últimos 6 mensajes como contexto
                })
            });

            // Si hay problemas de rate-limit o API Key no configurada, usar fallback de inmediato
            if (!response.ok) {
                console.warn(`Respuesta API no satisfactoria (${response.status}). Cambiando a NLP local...`);
                this.processLocalNLP(text);
                return;
            }

            const data = await response.json();
            
            if (data.success && data.reply) {
                this.chatHistory.push({ role: 'model', text: data.reply });
                
                // Actualizar subtítulo para reflejar estado en línea
                const sub = document.getElementById('botSubTitle');
                if (sub) sub.textContent = 'Asistente IA (Online)';

                this.addSystemMessage(data.reply, true);

                if (data.escalated) {
                    this.showQuickReplies([
                        { id: 'ver_chat_general', text: '💬 Ir al Chat General' },
                        { id: 'menu_principal', text: '🔙 Menú de Inicio' }
                    ]);
                } else {
                    this.showQuickReplies([
                        { id: 'soporte_humano', text: '🎧 Hablar con Administrador' },
                        { id: 'menu_principal', text: '🔙 Menú de Inicio' }
                    ]);
                }
            } else {
                this.processLocalNLP(text);
            }

        } catch (error) {
            console.warn('Fallo de red en API de soporte. Cambiando a NLP local...', error);
            this.processLocalNLP(text);
        }
    }

    // === CANAL 2: PROCESADOR NLP LOCAL (FALLBACK / OPCIÓN A) ===

    normalizeText(text) {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remueve acentos
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "") // remueve puntuación
            .trim();
    }

    processLocalNLP(text) {
        const sub = document.getElementById('botSubTitle');
        if (sub) sub.textContent = 'Asistente Local (Offline)';

        const query = this.normalizeText(text);

        // 1. Diccionario de intenciones y respuestas locales (adaptadas por rol)
        const role = this.currentUser.role;
        let response = "";
        let quickReplies = [];
        let score = 0;
        let matchedIntent = null;

        const intents = [
            // --- INTENCIONES COMUNES ---
            {
                id: 'saludo',
                keywords: ['hola', 'buen dia', 'buenas tardes', 'buenas noches', 'saludos', 'que tal', 'hey'],
                weight: 1,
                action: () => {
                    response = `¡Hola! ¿En qué puedo ayudarte hoy en el Portal ARVIC?`;
                    quickReplies = this.getWelcomeReplies();
                }
            },
            {
                id: 'password',
                keywords: ['contrasena', 'password', 'clave', 'seguridad', 'cambiar clave', 'cambiar contrasena', 'mi perfil'],
                weight: 2,
                action: () => {
                    response = `Para cambiar tu contraseña o actualizar los datos de tu cuenta:<br>
                    1. Ve al menú superior derecho (donde está tu nombre y foto).<br>
                    2. Haz clic en tu perfil y selecciona **"Seguridad / Contraseña"** o **"Editar Nombre"**.<br>
                    3. Ingresa tu contraseña actual y la nueva para guardar.`;
                    quickReplies = [{ id: 'menu_principal', text: '🔙 Volver al inicio' }];
                }
            },
            {
                id: 'ayuda_humana',
                keywords: ['administrador', 'admin', 'soporte', 'humano', 'hector', 'falla', 'error', 'problema', 'ticket', 'ayuda', 'no funciona', 'no jala', 'soporte tecnico', 'escribir'],
                weight: 1.5,
                action: () => {
                    this.processLocalAction('soporte_humano');
                    return true;
                }
            },
            
            // --- INTENCIONES CONSULTOR ---
            {
                id: 'consultor_horas',
                role: 'consultor',
                keywords: ['registrar', 'horas', 'reportar', 'ticket', 'guardar', 'captura', 'timesheet', 'semana', 'tiempo', 'decimal'],
                weight: 2,
                action: () => {
                    response = `<strong>Para registrar tus horas semanales:</strong><br>
                    1. Ve a la pantalla principal de tu panel.<br>
                    2. En la lista **"Mis Asignaciones y Reportes"**, ubica la fila correspondiente al soporte o proyecto en el que trabajaste.<br>
                    3. Haz clic en el botón azul **"Crear Ticket"**.<br>
                    4. Llena los campos (Título, Descripción detallada, Duración y Fecha) y presiona **"Enviar Ticket"**.<br><br>
                    *Nota: Las horas deben capturarse en **formato decimal** (ej: 8 horas y media es <code>8.5</code>, 2 horas y 15 min es <code>2.25</code>).*`;
                    quickReplies = [
                        { id: 'formato_decimal', text: '⏱️ Formato de horas' },
                        { id: 'menu_principal', text: '🔙 Volver al inicio' }
                    ];
                }
            },
            {
                id: 'consultor_no_asignaciones',
                role: 'consultor',
                keywords: ['proyectos', 'asignaciones', 'no veo', 'vacio', 'no aparece', 'vacia', 'cargar', 'cliente', 'empresa'],
                weight: 2.2,
                action: () => {
                    response = `Si tu panel de **"Captura Semanal"** está vacío o no visualizas algún proyecto o cliente, se debe a que el administrador aún no te ha vinculado a esa asignación.<br><br>
                    Por favor, solicita a tu administrador que cree la **Asignación de Proyecto o Soporte** y configure tu tarifa para que puedas empezar a cargar tus horas.`;
                    quickReplies = [
                        { id: 'soporte_humano', text: '🎧 Notificar al Administrador' },
                        { id: 'menu_principal', text: '🔙 Volver al inicio' }
                    ];
                }
            },
            {
                id: 'consultor_correccion_rechazo',
                role: 'consultor',
                keywords: ['rechazado', 'rechazo', 'corregir', 'motivo', 'rojo', 'revisar'],
                weight: 2,
                action: () => {
                    response = `Cuando un reporte es **Rechazado** por el administrador, este no se puede editar directamente. Debes:<br>
                    1. Desplazarte a la sección inferior de **Reportes Rechazados** en tu panel.<br>
                    2. Leer el comentario de observaciones del administrador.<br>
                    3. Crear un **nuevo reporte** desde la asignación respectiva introduciendo las correcciones solicitadas.<br>
                    4. El reporte anterior quedará como historial y el nuevo entrará a revisión.`;
                    quickReplies = [{ id: 'menu_principal', text: '🔙 Volver al inicio' }];
                }
            },

            // --- INTENCIONES ADMINISTRADOR ---
            {
                id: 'admin_usuarios',
                role: 'admin',
                keywords: ['crear usuario', 'nuevo consultor', 'registrar usuario', 'nuevo administrador', 'dar de alta', 'eliminar usuario', 'contrasena consultor'],
                weight: 2,
                action: () => {
                    response = `<strong>Para crear o gestionar usuarios:</strong><br>
                    1. Ve a la pestaña **Usuarios** en el menú de la izquierda del panel de administración.<br>
                    2. Haz clic en **"Crear Usuario"**.<br>
                    3. Llena su Nombre, Correo electrónico y elige su rol (**"Consultor"** o **"Administrador"**).<br>
                    4. El sistema generará automáticamente una contraseña única para el consultor (ej: <code>cons0015.4892</code>) la cual podrás copiar para enviársela.`;
                    quickReplies = [{ id: 'menu_principal', text: '🔙 Volver al inicio' }];
                }
            },
            {
                id: 'admin_proyectos_tarifas',
                role: 'admin',
                keywords: ['asignar proyecto', 'tarifas', 'costo', 'margen', 'vincular', 'cliente', 'crear proyecto', 'modulo'],
                weight: 2,
                action: () => {
                    response = `<strong>Para vincular un consultor a un proyecto y definir tarifas:</strong><br>
                    1. Asegúrate de tener creados al Cliente, Proyecto y Módulos respectivos en sus pestañas.<br>
                    2. Ve a la pestaña **Asignaciones**.<br>
                    3. Haz clic en **"Nueva Asignación de Proyecto"** o **"Nueva Asignación de Soporte"**.<br>
                    4. Elige al consultor, proyecto/módulo, y define la **Tarifa Consultor** (lo que se le paga por hora) y la **Tarifa Cliente** (lo que se cobra al cliente).<br>
                    5. El sistema calculará el **margen de ganancia** automáticamente en la pestaña **Tarifario**.`;
                    quickReplies = [{ id: 'menu_principal', text: '🔙 Volver al inicio' }];
                }
            },
            {
                id: 'admin_revisar_timesheet',
                role: 'admin',
                keywords: ['aprobar', 'rechazar', 'timesheet', 'liberar', 'revisar horas', 'tickets', 'historico'],
                weight: 2,
                action: () => {
                    response = `<strong>Para revisar y aprobar horas:</strong><br>
                    1. Ve a la pestaña **Timesheets** o **Reportes**.<br>
                    2. Verás los reportes enviados agrupados por consultor y semana.<br>
                    3. Revisa el desglose de horas y actividades. Si todo es correcto, haz clic en **"Aprobar"**.<br>
                    4. Si hay un error, haz clic en **"Rechazar"** e ingresa un comentario con el motivo del rechazo para que el consultor sea notificado al instante y pueda corregirlo.`;
                    quickReplies = [{ id: 'menu_principal', text: '🔙 Volver al inicio' }];
                }
            }
        ];

        // 2. Evaluar coincidencia
        intents.forEach(intent => {
            // Filtrar intenciones del rol opuesto
            if (intent.role && intent.role !== role) return;

            let matches = 0;
            intent.keywords.forEach(kw => {
                const kwNormalized = this.normalizeText(kw);
                if (query.includes(kwNormalized)) {
                    matches++;
                }
            });

            if (matches > 0) {
                const currentScore = matches * intent.weight;
                if (currentScore > score) {
                    score = currentScore;
                    matchedIntent = intent;
                }
            }
        });

        // 3. Ejecutar acción de la intención o dar respuesta por defecto
        if (matchedIntent && score >= 1) {
            this.localRetryCount = 0; // Reiniciar contador si entendió
            const stop = matchedIntent.action();
            if (stop === true) return; // Si la acción tomó el control completo (ej. soporte humano)
            
            setTimeout(() => {
                this.addSystemMessage(response, true);
                this.showQuickReplies(quickReplies);
            }, 600);
        } else {
            // Incrementar fallos seguidos
            this.localRetryCount++;
            
            setTimeout(() => {
                if (this.localRetryCount >= this.maxLocalRetriesBeforeEscalate) {
                    this.localRetryCount = 0;
                    this.addSystemMessage("Disculpa, no logro comprender tu consulta. Para evitar contratiempos, te conectaré de inmediato con un administrador para que te asista de forma personalizada.");
                    this.processLocalAction('soporte_humano');
                } else {
                    this.addSystemMessage("No logré entender tu consulta. Intenta redactarla de otra forma, o selecciona una de las siguientes opciones rápidas:");
                    this.showWelcomeMenu();
                }
            }, 600);
        }
    }

    getWelcomeReplies() {
        if (this.currentUser.role === 'admin') {
            return [
                { id: 'admin_crear_usuario', text: '👤 ¿Cómo creo un usuario?' },
                { id: 'admin_tarifas', text: '💰 Asignar proyectos/tarifas' },
                { id: 'soporte_humano', text: '🎧 Reportar fallo técnico' }
            ];
        } else {
            return [
                { id: 'consultor_registrar', text: '📝 ¿Cómo registro mis horas?' },
                { id: 'consultor_asignaciones', text: '📁 No veo mis proyectos' },
                { id: 'soporte_humano', text: '🎧 Hablar con Soporte' }
            ];
        }
    }

    // Procesador de clicks rápidos en modo local
    processLocalAction(actionId) {
        let response = "";
        let quickReplies = [];

        switch (actionId) {
            case 'menu_principal':
                this.localRetryCount = 0;
                this.addSystemMessage("¿En qué otra duda te puedo colaborar?");
                this.showWelcomeMenu();
                return;

            case 'consultor_registrar':
                this.processLocalNLP("registrar horas");
                return;

            case 'consultor_asignaciones':
                this.processLocalNLP("no veo mis asignaciones");
                return;

            case 'consultor_rechazados':
                this.processLocalNLP("reportes rechazados");
                return;

            case 'formato_decimal':
                this.processLocalNLP("decimal");
                return;

            case 'admin_crear_usuario':
                this.processLocalNLP("crear usuario");
                return;

            case 'admin_tarifas':
                this.processLocalNLP("asignar tarifas");
                return;

            case 'admin_aprobar':
                this.processLocalNLP("aprobar timesheet");
                return;

            case 'ver_chat_general':
                this.togglePanel(false);
                // Abrir la pestaña de chat del widget si existe
                if (window.chatWidget) {
                    window.chatWidget.toggleChat(true);
                    
                    // Si el usuario es consultor, abrir conversación con admin
                    if (this.currentUser.role !== 'admin') {
                        setTimeout(() => {
                            const adminContact = window.chatWidget.contacts.find(c => c.userId === 'admin');
                            if (adminContact) window.chatWidget.selectContact(adminContact);
                        }, 500);
                    }
                }
                return;

            case 'soporte_humano':
                this.chatHistory.push({ role: 'model', text: "Conexión con soporte humano iniciada." });
                this.addSystemMessage("Entendido. Voy a transferirte directamente con el equipo de administración. Por favor, describe detalladamente tu duda o problema a continuación y presiona Enviar:");
                this.input.placeholder = "Describe tu problema técnico aquí...";
                
                // Sobrescribir temporalmente el botón enviar y el enter de entrada
                const oldInput = this.input.cloneNode(true);
                this.input.parentNode.replaceChild(oldInput, this.input);
                this.input = oldInput;
                
                const handleEscalationSend = async () => {
                    const description = this.input.value.trim();
                    if (!description) return;
                    
                    this.input.value = '';
                    this.input.placeholder = "Escribe tu consulta aquí...";
                    this.addUserMessage(description);
                    this.showTypingIndicator();
                    
                    try {
                        // A. Llamar REST API de email
                        const emailRes = await window.PortalDB.sendSupportEmail(description);
                        
                        // B. Enviar mensaje automático por chat al administrador
                        if (this.currentUser.role !== 'admin') {
                            await window.PortalDB.sendChatMessage({
                                receiverId: 'admin',
                                message: `🤖 [SOPORTE AUTOMÁTICO]: El consultor ${this.currentUser.name || this.currentUser.userId} solicita ayuda técnica por medio del Asistente Virtual. Detalle: "${description}"`
                            });
                        }

                        if (emailRes.success) {
                            this.addSystemMessage("✅ ¡Solicitud enviada! He mandado un reporte de correo técnico y le he escrito un mensaje directo al Administrador en tu Chat General con el detalle de tu problema para que te responda cuanto antes.");
                        } else {
                            this.addSystemMessage("⚠️ He enviado un mensaje de soporte al chat del Administrador, pero no pudimos enviar el correo de respaldo. El Administrador te atenderá pronto en tu Chat General.");
                        }
                    } catch (e) {
                        this.addSystemMessage("❌ Hubo un error de conexión al procesar la escalación. Por favor, escribe tu consulta directamente al Administrador a través del menú **Chat** del banner superior.");
                    }

                    // Restaurar eventos por defecto
                    this.initEvents();
                    this.showQuickReplies([
                        { id: 'ver_chat_general', text: '💬 Ir al Chat General' },
                        { id: 'menu_principal', text: '🔙 Volver al inicio' }
                    ]);
                };

                this.input.onkeypress = (e) => {
                    if (e.key === 'Enter') handleEscalationSend();
                };
                this.sendBtn.onclick = handleEscalationSend;
                break;
        }
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

// Iniciar chatbot al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    window.supportBot = new SupportChatBot();
});
