/**
 * Chat Widget v4.0 for Portal ARVIC
 * Real-time messaging via SSE (Server-Sent Events) — works on Vercel production
 * Premium UX: Unread badges, typing indicators, message read receipts,
 * date separators, last-message previews, smooth animations
 */

class ChatWidget {
    constructor() {
        console.log('💬 ChatWidget v4.0 inicializando (SSE mode)...');
        this.isOpen = false;
        this.sseSource = null;      // EventSource for SSE
        this.ws = null;             // WebSocket fallback (local dev only)
        this.currentContextId = null;
        this.currentUser = null;
        this.token = localStorage.getItem('arvic_token');
        this.contacts = [];
        this.selectedFile = null;
        this.userStatus = 'online';
        this.soundEnabled = true;
        this.unreadCounts = {};     // { senderId: count }
        this.lastMessages = {};     // { partnerId: { message, timestamp, senderId } }
        this.typingTimers = {};
        this.totalUnread = 0;
        this.sseConnected = false;
        this._typingSent = false;
        this._typingTimeout = null;

        const session = JSON.parse(localStorage.getItem('arvic_current_session')) || null;
        this.currentUser = session ? session.user : null;
        if (!this.currentUser) return;

        // Determine API base URL
        this.apiBase = '';
        if (window.PortalDB && window.PortalDB.API_URL) {
            this.apiBase = window.PortalDB.API_URL.replace(/\/api\/?$/, '');
        }

        this.initDOM();
        this.initEvents();
        this.loadContacts();
        this.loadUnreadCounts();
        
        // Start real-time connection manager (mutually exclusive)
        this.wsFallbackTimer = null;
        this.sseAbortController = null;
        setTimeout(() => this.initRealTime(), 800);

        // Polling unread counts (más rápido en Vercel)
        const isVercel = window.location.hostname.includes('vercel.app');
        setInterval(() => this.loadUnreadCounts(), isVercel ? 5000 : 30000);
        
        // Fallback polling for active chat messages (más rápido si no hay WS/SSE funcional o en Vercel)
        setInterval(() => this.pollActiveChat(), isVercel ? 2000 : 8000);
    }

    initDOM() {
        if (!document.querySelector('link[href*="chat.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../css/chat.css';
            document.head.appendChild(link);
        }

        this.container = document.createElement('div');
        this.container.className = 'chat-widget-container';
        this.container.style.visibility = 'hidden';
        this.container.style.opacity = '0';
        this.container.style.transition = 'opacity 0.3s ease';
        this.container.innerHTML = `
            <div class="chat-overlay" id="chatOverlay"></div>
            <div class="chat-call-modal" id="chatCallModal" style="display:none;">
                <div class="chat-call-header">
                    <span id="chatCallTitle"><i class="fa-solid fa-video"></i> Llamada en curso</span>
                    <button id="chatCallCloseBtn" title="Salir de la llamada"><i class="fa-solid fa-phone-slash"></i></button>
                </div>
                <div class="chat-call-body">
                    <iframe id="chatCallFrame" allow="camera; microphone; fullscreen; display-capture; autoplay"></iframe>
                </div>
            </div>
            <div class="chat-panel">
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <div class="chat-sidebar-header-top" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <div class="chat-sidebar-title" style="margin:0;">
                                <i class="fa-solid fa-comments"></i>
                                <span>Mensajes</span>
                            </div>
                            <div class="chat-sidebar-actions">
                                <button id="chatSoundToggle" title="Sonido: Activado" class="tool-btn"><i class="fa-solid fa-bell"></i></button>
                            </div>
                        </div>
                        <div class="chat-my-status">
                            <select id="chatMyStatus">
                                <option value="online">🟢 En línea</option>
                                <option value="away">🟡 Ausente</option>
                                <option value="offline">🔴 Desconectado</option>
                            </select>
                        </div>
                    </div>
                    <div class="chat-search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="chatSearchInput" placeholder="Buscar contacto..." />
                    </div>
                    <div class="chat-contacts" id="chatContactsList"></div>
                </div>
                <div class="chat-main">
                    <div class="chat-main-header" id="chatMainHeader">
                        <div class="chat-header-info">
                            <div class="chat-header-avatar" id="chatHeaderAvatar">
                                <i class="fa-solid fa-comments" style="font-size:1.2rem;opacity:0.5;"></i>
                            </div>
                            <div class="chat-header-details">
                                <span class="chat-header-name" id="chatHeaderName">Selecciona un chat</span>
                                <span class="chat-header-status" id="chatHeaderStatus"></span>
                            </div>
                        </div>
                        <div class="chat-header-actions" id="chatHeaderActions" style="display:none; gap:10px; margin-left:auto; margin-right:15px;">
                            <button class="chat-call-btn" id="chatVoiceCallBtn" title="Iniciar llamada de voz"><i class="fa-solid fa-phone"></i></button>
                            <button class="chat-call-btn" id="chatVideoCallBtn" title="Iniciar videollamada"><i class="fa-solid fa-video"></i></button>
                        </div>
                        <button class="chat-close-btn" id="chatCloseBtn" title="Cerrar">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="chat-messages-area" id="chatMessagesArea">
                        <div class="chat-empty-state">
                            <i class="fa-solid fa-message"></i>
                            <p>Selecciona una conversación</p>
                            <small>Elige un contacto para comenzar a chatear</small>
                        </div>
                    </div>
                    <div class="chat-typing-indicator" id="chatTypingIndicator" style="display:none;">
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <span class="typing-text">escribiendo...</span>
                    </div>
                    <div class="chat-attachment-bar" id="chatAttachmentBar" style="display:none;">
                        <i class="fa-solid fa-file"></i>
                        <span id="chatAttachmentName"></span>
                        <button id="chatAttachmentRemove"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="chat-emoji-picker" id="chatEmojiPicker" style="display:none;">
                        <span class="emoji">😀</span><span class="emoji">😂</span><span class="emoji">🥰</span><span class="emoji">😎</span><span class="emoji">🤔</span>
                        <span class="emoji">👍</span><span class="emoji">👎</span><span class="emoji">❤️</span><span class="emoji">🔥</span><span class="emoji">🎉</span>
                    </div>
                    <div class="chat-input-bar" id="chatInputBar" style="display:none;">
                        <input type="file" id="chatFileInput" style="display:none;" />
                        <button class="chat-input-action" id="chatAttachBtn" title="Adjuntar archivo">
                            <i class="fa-solid fa-paperclip"></i>
                        </button>
                        <button class="chat-input-action" id="chatEmojiBtn" title="Emojis">
                            <i class="fa-solid fa-face-smile"></i>
                        </button>
                        <input type="text" class="chat-text-input" id="chatTextInput" placeholder="Escribe un mensaje..." />
                        <button class="chat-send-btn" id="chatSendBtn" title="Enviar">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        // Cache references
        this.overlay = this.container.querySelector('#chatOverlay');
        this.contactsList = this.container.querySelector('#chatContactsList');
        this.messagesArea = this.container.querySelector('#chatMessagesArea');
        this.input = this.container.querySelector('#chatTextInput');
        this.inputBar = this.container.querySelector('#chatInputBar');
        this.sendBtn = this.container.querySelector('#chatSendBtn');
        this.closeBtn = this.container.querySelector('#chatCloseBtn');
        this.searchInput = this.container.querySelector('#chatSearchInput');
        this.headerName = this.container.querySelector('#chatHeaderName');
        this.headerStatus = this.container.querySelector('#chatHeaderStatus');
        this.headerAvatar = this.container.querySelector('#chatHeaderAvatar');
        this.headerActions = this.container.querySelector('#chatHeaderActions');
        this.voiceCallBtn = this.container.querySelector('#chatVoiceCallBtn');
        this.videoCallBtn = this.container.querySelector('#chatVideoCallBtn');
        this.fileInput = this.container.querySelector('#chatFileInput');
        this.attachBtn = this.container.querySelector('#chatAttachBtn');
        this.attachmentBar = this.container.querySelector('#chatAttachmentBar');
        this.attachmentName = this.container.querySelector('#chatAttachmentName');
        this.attachmentRemove = this.container.querySelector('#chatAttachmentRemove');
        this.typingIndicator = this.container.querySelector('#chatTypingIndicator');
        this.statusSelect = this.container.querySelector('#chatMyStatus');
        this.soundTogglebtn = this.container.querySelector('#chatSoundToggle');
        this.emojiBtn = this.container.querySelector('#chatEmojiBtn');
        this.emojiPicker = this.container.querySelector('#chatEmojiPicker');
        
        // Call Modal
        this.callModal = this.container.querySelector('#chatCallModal');
        this.callFrame = this.container.querySelector('#chatCallFrame');
        this.callCloseBtn = this.container.querySelector('#chatCallCloseBtn');
        this.callTitle = this.container.querySelector('#chatCallTitle');
    }

    initEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
        this.input.addEventListener('input', () => this.emitTyping());
        this.closeBtn.addEventListener('click', () => this.toggleChat(false));
        this.overlay.addEventListener('click', () => this.toggleChat(false));
        this.searchInput.addEventListener('input', (e) => this.filterContacts(e.target.value));
        
        // Call bindings
        this.voiceCallBtn.addEventListener('click', () => this.startCall('voice'));
        this.videoCallBtn.addEventListener('click', () => this.startCall('video'));
        this.callCloseBtn.addEventListener('click', () => this.leaveCall());
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        this.attachmentRemove.addEventListener('click', () => this.clearAttachment());
        this.statusSelect.addEventListener('change', (e) => this.updateMyStatus(e.target.value));

        this.soundTogglebtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.soundTogglebtn.querySelector('i').className = this.soundEnabled ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
            this.soundTogglebtn.title = this.soundEnabled ? 'Sonido: Activado' : 'Sonido: Silenciado';
        });

        this.emojiBtn.addEventListener('click', () => {
            this.emojiPicker.style.display = this.emojiPicker.style.display === 'none' ? 'flex' : 'none';
        });

        this.emojiPicker.querySelectorAll('.emoji').forEach(em => {
            em.addEventListener('click', (e) => {
                this.input.value += e.target.textContent;
                this.emojiPicker.style.display = 'none';
                this.input.focus();
            });
        });

        // Bind ONLY the Chat button (not Soporte)
        document.querySelectorAll('button[title="Chat"]').forEach(btn => {
            btn.addEventListener('click', () => this.toggleChat(true));
        });

        // Auto status on focus/blur
        window.addEventListener('focus', () => {
            if (this.statusSelect.value === 'online') this.updateMyStatus('online');
        });
        window.addEventListener('blur', () => {
            if (this.statusSelect.value === 'online') this.updateMyStatus('away');
        });
    }

    // ========================================
    // REAL-TIME CONNECTION MANAGER
    // ========================================
    initRealTime() {
        const isVercel = window.location.hostname.includes('vercel.app');
        if (isVercel) {
            console.log('Modo Vercel: Priorizando SSE (WebSockets no soportados de forma persistente).');
            this.initSSE();
            return;
        }

        console.log('🔌 Intentando conexión principal por WebSocket...');
        this.initWebSocket();
        
        // Timer de respaldo: si WS no se conecta en 3 segundos, iniciamos SSE
        if (this.wsFallbackTimer) clearTimeout(this.wsFallbackTimer);
        this.wsFallbackTimer = setTimeout(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.warn('🔌 WebSocket no conectó a tiempo, iniciando fallback a SSE...');
                this.initSSE();
            }
        }, 3000);
    }

    // ========================================
    // SSE (Server-Sent Events) — FALLBACK
    // ========================================
    initSSE() {
        if (this.sseConnected) return;
        console.log('📡 Iniciando conexión Server-Sent Events (SSE)...');
        const streamUrl = `${this.apiBase}/api/chat/stream`;
        this._connectSSE(streamUrl);
    }

    closeSSE() {
        if (this.sseAbortController) {
            try { this.sseAbortController.abort(); } catch(e) {}
            this.sseAbortController = null;
        }
        this.sseConnected = false;
        console.log('📡 Conexión SSE cerrada/abortada.');
    }

    async _connectSSE(url) {
        if (this.sseAbortController) {
            try { this.sseAbortController.abort(); } catch(e) {}
        }
        this.sseAbortController = new AbortController();
        const signal = this.sseAbortController.signal;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                signal: signal
            });

            if (!response.ok) {
                console.warn('⚠️ SSE connection failed:', response.status);
                if (!signal.aborted) {
                    setTimeout(() => {
                        if (!signal.aborted) this._connectSSE(url);
                    }, 5000);
                }
                return;
            }

            this.sseConnected = true;
            console.log('📡 SSE conectado exitosamente');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
                try {
                    while (true) {
                        if (signal.aborted) break;
                        const { done, value } = await reader.read();
                        if (done || signal.aborted) break;

                        buffer += decoder.decode(value, { stream: true });
                        
                        // Parse SSE events from buffer
                        const events = buffer.split('\n\n');
                        buffer = events.pop(); // Keep incomplete event in buffer

                        for (const eventStr of events) {
                            if (signal.aborted) break;
                            if (!eventStr.trim() || eventStr.startsWith(': ping')) continue;

                            let eventType = 'message';
                            let eventData = '';

                            const lines = eventStr.split('\n');
                            for (const line of lines) {
                                if (line.startsWith('event: ')) {
                                    eventType = line.substring(7).trim();
                                } else if (line.startsWith('data: ')) {
                                    eventData = line.substring(6);
                                }
                            }

                            if (eventData && !signal.aborted) {
                                try {
                                    const data = JSON.parse(eventData);
                                    this._handleSSEEvent(eventType, data);
                                } catch (parseErr) {
                                    // Skip malformed events
                                }
                            }
                        }
                    }
                } catch (readErr) {
                    if (!signal.aborted) {
                        console.warn('📡 SSE stream interrupted, reconnecting...');
                    }
                }

                // Reconnect after stream ends
                if (!signal.aborted) {
                    this.sseConnected = false;
                    setTimeout(() => {
                        if (!signal.aborted) this._connectSSE(url);
                    }, 3000);
                }
            };

            processStream();

        } catch (err) {
            if (!signal.aborted) {
                console.warn('📡 SSE error, will retry:', err.message);
                this.sseConnected = false;
                setTimeout(() => {
                    if (!signal.aborted) this._connectSSE(url);
                }, 5000);
            }
        }
    }

    _handleSSEEvent(type, data) {
        switch (type) {
            case 'connected':
                console.log('📡 SSE auth OK:', data.userId);
                break;

            case 'new_message':
                this.handleIncomingMessage(data);
                break;

            case 'message_deleted':
                this.handleMessageDeleted(data.messageId);
                break;

            case 'typing_start':
                this.showTyping(data.senderId);
                break;

            case 'typing_stop':
                this.hideTyping(data.senderId);
                break;

            case 'messages_read':
                this.handleMessagesRead(data.readBy);
                break;

            case 'user_status':
                this.updateContactUIStatus(data.userId, data.status);
                break;

            case 'active_users':
                if (data.users) {
                    data.users.forEach(u => this.updateContactUIStatus(u.userId, u.status));
                }
                break;

            case 'timesheet_updated':
                console.log('📡 Evento de timesheet recibido via SSE:', data);
                const tsEvent = new CustomEvent('timesheetUpdated', { detail: data });
                document.dispatchEvent(tsEvent);
                break;
        }
    }

    // ========================================
    // TYPING INDICATOR (via REST API)
    // ========================================
    emitTyping() {
        if (!this.currentContextId) return;

        if (!this._typingSent) {
            this._typingSent = true;
            // Send typing via REST (works everywhere including Vercel)
            this._sendTypingAPI(true);
        }
        
        clearTimeout(this._typingTimeout);
        this._typingTimeout = setTimeout(() => {
            this._sendTypingAPI(false);
            this._typingSent = false;
        }, 2000);
    }

    async _sendTypingAPI(isTyping) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const type = isTyping ? 'typing_start' : 'typing_stop';
                this.ws.send(JSON.stringify({ type, receiverId: this.currentContextId }));
                return;
            } catch (wsErr) {
                console.warn('Error enviando typing por WebSocket, usando fallback REST API:', wsErr);
            }
        }

        try {
            await fetch(`${this.apiBase}/api/chat/typing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ 
                    receiverId: this.currentContextId, 
                    isTyping 
                })
            });
        } catch (e) {
            console.error('Error enviando typing por API:', e);
        }
    }

    showTyping(senderId) {
        if (senderId !== this.currentContextId) return;
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
        
        // Auto-hide after 4 seconds (safety net)
        clearTimeout(this._typingAutoHide);
        this._typingAutoHide = setTimeout(() => {
            this.typingIndicator.style.display = 'none';
        }, 4000);
    }

    hideTyping(senderId) {
        if (senderId !== this.currentContextId) return;
        this.typingIndicator.style.display = 'none';
        clearTimeout(this._typingAutoHide);
    }

    // ========================================
    // FILE ATTACHMENT
    // ========================================
    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { 
            window.NotificationUtils?.error('El archivo no puede exceder 10MB');
            return; 
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.selectedFile = { name: file.name, base64: event.target.result };
            this.attachmentName.textContent = file.name;
            this.attachmentBar.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    clearAttachment() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.attachmentBar.style.display = 'none';
    }

    // ========================================
    // CONTACTS
    // ========================================
    async loadContacts() {
        try {
            const users = await window.PortalDB.getUsers();
            const currentUserId = this.currentUser.userId || this.currentUser.id;
            this.contacts = Object.values(users).filter(u => u.userId !== currentUserId && u.isActive !== false);
            
            // Load last messages
            const lastMsgs = await window.PortalDB.getLastMessages(currentUserId);
            this.lastMessages = {};
            lastMsgs.forEach(m => {
                this.lastMessages[m.partnerId] = m;
            });

            this.renderContacts(this.contacts);
        } catch (e) { console.error('Error loading contacts:', e); }
    }

    async pollActiveChat() {
        if (!this.isOpen || !this.currentContextId) return;
        
        const isVercel = window.location.hostname.includes('vercel.app');
        if (!isVercel) {
            // Don't poll if SSE or WebSocket is healthy on non-Vercel environments
            if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
            if (this.sseConnected) return;
        }

        try {
            const currentUserId = this.currentUser.userId || this.currentUser.id;
            const history = await window.PortalDB.getChatHistory(this.currentContextId);
            if (!history) return;
            
            let changed = false;

            // 1. Sincronizar mensajes uno por uno (añadir nuevos o promover optimistas)
            history.forEach(m => {
                const elById = document.getElementById(`msg-${m._id}`);
                
                if (elById) {
                    // Si ya existe por ID real, sincronizar doble check
                    const statusSpan = elById.querySelector('.msg-status');
                    if (statusSpan) {
                        const isMe = m.senderId === currentUserId;
                        if (isMe) {
                            if (m.read && !statusSpan.classList.contains('read')) {
                                statusSpan.innerHTML = '<i class="fa-solid fa-check-double"></i>';
                                statusSpan.className = 'msg-status read';
                            } else if (!m.read && !statusSpan.classList.contains('sent')) {
                                statusSpan.innerHTML = '<i class="fa-solid fa-check"></i>';
                                statusSpan.className = 'msg-status sent';
                            }
                        }
                    }
                    return;
                }

                // Si no existe, ver si hay un elemento optimista para asociarlo
                let optEl = null;
                if (m.tempId) {
                    optEl = document.getElementById(`msg-${m.tempId}`);
                }
                if (!optEl) {
                    // Match por contenido, imagen o archivo si tempId no coincide o no viajó
                    const tempMessages = this.messagesArea.querySelectorAll('.chat-msg[id^="msg-temp-"]');
                    for (const tempEl of tempMessages) {
                        let isMatch = false;
                        
                        // Mensaje de texto
                        const msgTextEl = tempEl.querySelector('.msg-text');
                        if (msgTextEl && m.message && msgTextEl.textContent === m.message) {
                            isMatch = true;
                        }
                        
                        // Mensaje de imagen
                        const msgImgEl = tempEl.querySelector('.msg-image img');
                        if (msgImgEl && m.fileName && (msgImgEl.getAttribute('alt') === m.fileName || msgImgEl.src.includes(m.fileName))) {
                            isMatch = true;
                        }
                        
                        // Mensaje de archivo
                        const msgFileEl = tempEl.querySelector('.msg-file a');
                        if (msgFileEl && m.fileName && msgFileEl.textContent === m.fileName) {
                            isMatch = true;
                        }
                        
                        if (isMatch && tempEl.classList.contains('msg-out')) {
                            optEl = tempEl;
                            break;
                        }
                    }
                }

                if (optEl) {
                    const tempId = optEl.id.replace('msg-', '');
                    this.promoteMessage(tempId, m._id, m.timestamp, 'sent', m.read);
                } else {
                    // Mensaje verdaderamente nuevo (del otro usuario)
                    const currentRenderedMsgs = this.messagesArea.querySelectorAll('.chat-msg');
                    this.appendMessage(m, true); // Animar sólo mensajes entrantes nuevos
                    changed = true;
                    
                    if (m.senderId === this.currentContextId) {
                        this.markConversationRead(m.senderId);
                        if (currentRenderedMsgs.length > 0) {
                            this.playNotificationSound();
                        }
                    }
                }
            });

            // 2. Limpiar del DOM mensajes borrados (física o lógicamente)
            const allRendered = this.messagesArea.querySelectorAll('.chat-msg');
            allRendered.forEach(el => {
                const id = el.id.replace('msg-', '');
                if (id.startsWith('temp-')) return;
                
                // Buscar el mensaje en el historial obtenido del servidor
                const historyMsg = history.find(m => m._id === id);
                
                if (historyMsg && historyMsg.deleted) {
                    // El servidor confirma explícitamente que está borrado: remover de inmediato sin lag
                    el.remove();
                    changed = true;
                } else if (!historyMsg) {
                    // No está en el historial (borrado físico o retraso de replicación en base de datos)
                    // Aplicar regla de 15 segundos para evitar remover mensajes nuevos que están en tránsito
                    const addedTime = parseInt(el.getAttribute('data-timestamp') || '0', 10);
                    if (Date.now() - addedTime >= 15000) {
                        el.remove();
                        changed = true;
                    }
                }
            });

            if (changed) {
                this.scrollToBottom();
            }
        } catch(e) {
            console.error('Error en pollActiveChat:', e);
        }
    }

    renderContacts(contacts) {
        this.contactsList.innerHTML = '';
        
        // Sort contacts: those with last messages first (by timestamp desc), then rest
        const sorted = [...contacts].sort((a, b) => {
            const lastA = this.lastMessages[a.userId];
            const lastB = this.lastMessages[b.userId];
            if (lastA && lastB) return new Date(lastB.lastTimestamp) - new Date(lastA.lastTimestamp);
            if (lastA) return -1;
            if (lastB) return 1;
            const nameA = a.name || a.userId || '';
            const nameB = b.name || b.userId || '';
            return nameA.localeCompare(nameB);
        });

        sorted.forEach(user => {
            const div = document.createElement('div');
            div.className = `chat-contact-item ${this.currentContextId === user.userId ? 'active' : ''}`;
            div.setAttribute('data-user-id', user.userId);

            const unreadCount = this.unreadCounts[user.userId] || 0;
            const lastMsg = this.lastMessages[user.userId];
            const currentUserId = this.currentUser.userId || this.currentUser.id;
            
            let safeName = user.name || (user.userId === 'admin' ? 'Soporte / Admin' : user.userId) || 'Usuario';

            let avatarHTML = user.profilePhoto 
                ? `<img src="${user.profilePhoto}" alt="${safeName}" />`
                : `<span class="avatar-initial">${safeName[0].toUpperCase()}</span>`;

            let lastMsgPreview = '';
            if (lastMsg) {
                const isMe = lastMsg.lastSenderId === currentUserId;
                let text = lastMsg.lastMessage || '📎 Archivo';
                
                // Formatear etiquetas de llamadas
                if (text.startsWith('[MEET_CALL_VIDEO]')) {
                    text = '🎥 Videollamada';
                } else if (text.startsWith('[MEET_CALL_VOICE]')) {
                    text = '📞 Llamada de voz';
                }
                
                lastMsgPreview = `<span class="contact-last-msg">${isMe ? 'Tú: ' : ''}${this.truncate(text, 30)}</span>`;
            } else {
                lastMsgPreview = `<span class="contact-last-msg empty">Sin mensajes</span>`;
            }

            let timeStr = '';
            if (lastMsg && lastMsg.lastTimestamp) {
                timeStr = this.formatContactTime(lastMsg.lastTimestamp);
            }

            div.innerHTML = `
                <div class="contact-avatar-wrap">
                    <div class="contact-avatar">${avatarHTML}</div>
                    <div class="contact-status-dot offline" data-status-id="${user.userId}"></div>
                </div>
                <div class="contact-text">
                    <div class="contact-top-row">
                        <span class="contact-name">${safeName}</span>
                        ${timeStr ? `<span class="contact-time">${timeStr}</span>` : ''}
                    </div>
                    <div class="contact-bottom-row">
                        ${lastMsgPreview}
                        ${unreadCount > 0 ? `<div class="contact-unread">${unreadCount > 99 ? '99+' : unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
            div.onclick = () => this.selectContact(user);
            this.contactsList.appendChild(div);
        });
    }

    filterContacts(q) {
        const filtered = this.contacts.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
        this.renderContacts(filtered);
    }

    // ========================================
    // UNREAD COUNTS
    // ========================================
    async loadUnreadCounts() {
        if (!this.currentUser) return;
        try {
            const currentUserId = this.currentUser.userId || this.currentUser.id;
            const result = await window.PortalDB.getUnreadChatCounts(currentUserId);
            
            this.unreadCounts = {};
            (result.bySender || []).forEach(item => {
                this.unreadCounts[item.senderId] = item.count;
            });
            this.totalUnread = result.totalUnread || 0;

            this.updateHeaderBadge();
            
            // Update contact badges if rendered
            if (this.contactsList.children.length > 0) {
                this.renderContacts(this.contacts);
            }
        } catch (e) { console.error('Error loading unread counts:', e); }
    }

    updateHeaderBadge() {
        // Update the CHAT button badge in the page header
        const chatBtn = document.querySelector('button[title="Chat"]');
        if (!chatBtn) return;

        let badge = chatBtn.querySelector('.chat-header-badge');
        if (this.totalUnread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'chat-header-badge';
                const wrapper = chatBtn.querySelector('.notify-wrapper') || chatBtn;
                wrapper.appendChild(badge);
            }
            badge.textContent = this.totalUnread > 99 ? '99+' : this.totalUnread;
            badge.style.display = 'flex';
        } else {
            if (badge) badge.style.display = 'none';
        }
    }

    // ========================================
    // SELECT CONTACT & LOAD HISTORY
    // ========================================
    async selectContact(user) {
        this.currentContextId = user.userId;
        this.headerName.textContent = user.name;
        this.headerStatus.textContent = user.role === 'admin' ? 'Administrador' : 'Consultor';
        this.inputBar.style.display = 'flex';
        this.typingIndicator.style.display = 'none';
        
        // Show Call actions
        this.headerActions.style.display = 'flex';

        // Update avatar
        if (user.profilePhoto) {
            this.headerAvatar.innerHTML = `<img src="${user.profilePhoto}" alt="${user.name}" />`;
        } else {
            this.headerAvatar.innerHTML = `<span class="avatar-initial">${(user.name || '?')[0].toUpperCase()}</span>`;
        }

        // Active state
        this.contactsList.querySelectorAll('.chat-contact-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-user-id') === user.userId);
        });

        // Load messages
        this.messagesArea.innerHTML = '<div class="chat-loading"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
        const history = await window.PortalDB.getChatHistory(user.userId);
        this.renderHistory(history);

        // Mark as read
        await this.markConversationRead(user.userId);
    }

    async markConversationRead(senderId) {
        // Use REST API (works everywhere)
        try {
            await window.PortalDB.markChatAsRead(senderId);
        } catch(e) {}

        // Update local counts
        if (this.unreadCounts[senderId]) {
            this.totalUnread -= this.unreadCounts[senderId];
            if (this.totalUnread < 0) this.totalUnread = 0;
            delete this.unreadCounts[senderId];
            this.updateHeaderBadge();
        }

        // Remove badge from contact item
        const contactItem = this.contactsList.querySelector(`[data-user-id="${senderId}"]`);
        if (contactItem) {
            const badge = contactItem.querySelector('.contact-unread');
            if (badge) badge.remove();
        }

        // Refresh global notification badge if available on parent page
        if (typeof window.updateNotificationBadge === 'function') {
            window.updateNotificationBadge();
        }
        if (typeof window.loadNotifications === 'function') {
            window.loadNotifications();
        }
    }

    // ========================================
    // WEBSOCKET (Fallback for local dev)
    // ========================================
    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = window.location.host;
        if (window.PortalDB && window.PortalDB.API_URL) {
            try { host = new URL(window.PortalDB.API_URL).host; } catch(e) {}
        }

        const isVercel = window.location.hostname.includes('vercel.app');
        if (isVercel) {
            console.log('Modo Vercel: WebSockets desactivados (usando SSE).');
            return;
        }

        try {
            this.ws = new WebSocket(`${protocol}//${host}`);

            this.ws.onopen = () => {
                if (this.wsFallbackTimer) {
                    clearTimeout(this.wsFallbackTimer);
                    this.wsFallbackTimer = null;
                }
                console.log('🔌 WebSocket conectado. Cerrando SSE para ahorrar sockets.');
                this.closeSSE();
                this.ws.send(JSON.stringify({ type: 'auth', token: this.token }));
                this.updateMyStatus(this.statusSelect.value);
            };

            this.ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                
                if (data.type === 'new_message') this.handleIncomingMessage(data.payload);
                if (data.type === 'message_deleted') this.handleMessageDeleted(data.messageId);
                if (data.type === 'user_status_update') this.updateContactUIStatus(data.userId, data.status);
                if (data.type === 'active_users_list') {
                    data.users.forEach(u => this.updateContactUIStatus(u.userId, u.status));
                }
                if (data.type === 'typing_start') this.showTyping(data.senderId);
                if (data.type === 'typing_stop') this.hideTyping(data.senderId);
                if (data.type === 'messages_read') this.handleMessagesRead(data.readBy);
            };

            this.ws.onclose = () => {
                console.warn('❌ WebSocket cerrado. Conectando SSE como respaldo...');
                this.initSSE();
                setTimeout(() => this.initWebSocket(), 10000);
            };

            this.ws.onerror = (err) => {
                console.warn('❌ WebSocket error:', err);
                if (!this.sseConnected) {
                    console.log('🔌 WebSocket falló, iniciando SSE de inmediato...');
                    this.initSSE();
                }
            };
        } catch (e) {
            console.error('Error inicializando WebSocket:', e);
            this.initSSE();
        }
    }

    updateMyStatus(status) {
        this.userStatus = status;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'status_change', status }));
        }
    }

    updateContactUIStatus(userId, status) {
        const marker = this.container.querySelector(`[data-status-id="${userId}"]`);
        if (marker) {
            marker.className = `contact-status-dot ${status}`;
        }
        // Update header status if this contact is selected
        if (userId === this.currentContextId) {
            const statusText = status === 'online' ? 'En línea' : status === 'away' ? 'Ausente' : 'Desconectado';
            this.headerStatus.textContent = statusText;
            this.headerStatus.className = `chat-header-status status-${status}`;
        }
    }

    // ========================================
    // MESSAGES
    // ========================================
    handleIncomingMessage(msg) {
        const currentUserId = this.currentUser.userId || this.currentUser.id;
        
        // If this message has a tempId and was sent by me, replace the optimistic message
        if (msg.tempId && msg.senderId === currentUserId) {
            const optEl = document.getElementById(`msg-${msg.tempId}`);
            if (optEl) {
                this.promoteMessage(msg.tempId, msg._id, msg.timestamp, 'sent', msg.read);
                // Update last messages and contacts
                this.lastMessages[msg.receiverId] = {
                    lastMessage: msg.message || '📎 Archivo',
                    lastTimestamp: msg.timestamp,
                    lastSenderId: msg.senderId,
                    read: msg.read
                };
                this.renderContacts(this.contacts);
                return; // Don't re-append
            }
        }

        // Prevent duplicate rendering
        if (msg._id && document.getElementById(`msg-${msg._id}`)) return;

        const isCurrent = msg.senderId === this.currentContextId || msg.receiverId === this.currentContextId;

        if (isCurrent && this.isOpen) {
            this.appendMessage(msg);
            this.scrollToBottom();
            // Auto mark as read if the chat is open and message is from the current contact
            if (msg.senderId === this.currentContextId) {
                this.markConversationRead(msg.senderId);
                this.playNotificationSound();
            }
        } else if (msg.senderId !== currentUserId) {
            // Increment unread
            this.unreadCounts[msg.senderId] = (this.unreadCounts[msg.senderId] || 0) + 1;
            this.totalUnread++;
            this.updateHeaderBadge();
            this.renderContacts(this.contacts);
            this.playNotificationSound();
            
            // Desktop notification
            if (window.NotificationUtils) {
                const sender = this.contacts.find(c => c.userId === msg.senderId);
                const senderName = sender ? sender.name : msg.senderId;
                window.NotificationUtils.info(`💬 ${senderName}: ${this.truncate(msg.message || '📎 Archivo', 40)}`, 4000);
            }
        }

        // Update last message for contact
        const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        this.lastMessages[partnerId] = {
            lastMessage: msg.message,
            lastTimestamp: msg.timestamp,
            lastSenderId: msg.senderId,
            read: msg.read
        };

        // Always re-render contacts so the conversation jumps to the top
        this.renderContacts(this.contacts);
    }

    handleMessagesRead(readBy) {
        // Update read receipts for messages sent to this user
        if (readBy === this.currentContextId) {
            this.messagesArea.querySelectorAll('.msg-status.sent').forEach(el => {
                el.innerHTML = '<i class="fa-solid fa-check-double"></i>';
                el.className = 'msg-status read';
            });
        }
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text && !this.selectedFile) return;

        const currentUserId = this.currentUser.userId || this.currentUser.id;
        const tempId = 'temp-' + Date.now();

        const payload = {
            receiverId: this.currentContextId,
            message: text,
            attachment: this.selectedFile ? this.selectedFile.base64 : undefined,
            fileName: this.selectedFile ? this.selectedFile.name : undefined,
            tempId: tempId
        };

        this.input.value = '';
        this.clearAttachment();

        // Optimistic UI update for instant feedback
        const optimisticMsg = {
            _id: tempId,
            senderId: currentUserId,
            receiverId: payload.receiverId,
            message: payload.message,
            attachment: payload.attachment,
            fileName: payload.fileName,
            timestamp: new Date().toISOString(),
            read: false,
            isOptimistic: true
        };
        
        // Render locally immediately
        this.appendMessage(optimisticMsg);
        this.scrollToBottom();
        
        // Update header/contacts last message immediately
        this.lastMessages[payload.receiverId] = {
            lastMessage: payload.message || '📎 Archivo',
            lastTimestamp: optimisticMsg.timestamp,
            lastSenderId: currentUserId,
            read: false
        };
        this.renderContacts(this.contacts);

        // Stop typing
        if (this._typingSent) {
            this._sendTypingAPI(false);
            this._typingSent = false;
        }

        // Priorizar WebSocket si está abierto para tiempo real directo y ahorrar sockets HTTP
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({
                    type: 'chat_message',
                    payload: {
                        receiverId: payload.receiverId,
                        message: payload.message,
                        attachment: payload.attachment,
                        fileName: payload.fileName
                    },
                    tempId: tempId
                }));
                console.log('✉️ Mensaje enviado via WebSocket:', tempId);
                return; // Enviado por WebSocket con éxito, no continuar con REST API
            } catch (wsErr) {
                console.warn('Error enviando mensaje por WebSocket, usando fallback REST API:', wsErr);
            }
        }

        // Fallback: enviar por REST API si WebSocket no está disponible
        try {
            const res = await window.PortalDB.sendChatMessage(payload);
            if (res.success) {
                this.promoteMessage(tempId, res.data._id, res.data.timestamp, 'sent', res.data.read);
                // Actualizar último mensaje y contactos
                this.lastMessages[payload.receiverId] = {
                    lastMessage: res.data.message || '📎 Archivo',
                    lastTimestamp: res.data.timestamp,
                    lastSenderId: res.data.senderId,
                    read: res.data.read
                };
                this.renderContacts(this.contacts);
            } else {
                // Mark optimistic msg as failed
                const failedEl = document.getElementById(`msg-${tempId}`);
                if (failedEl) {
                    const statusSpan = failedEl.querySelector('.msg-status');
                    if (statusSpan) {
                        statusSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:red;" title="Error al enviar"></i>';
                    }
                }
            }
        } catch (err) {
            // Mark as failed
            const failedEl = document.getElementById(`msg-${tempId}`);
            if (failedEl) {
                const statusSpan = failedEl.querySelector('.msg-status');
                if (statusSpan) {
                    statusSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:red;" title="Error al enviar"></i>';
                }
            }
        }
    }

    renderHistory(msgs) {
        this.messagesArea.innerHTML = '';
        const activeMsgs = (msgs || []).filter(m => !m.deleted);
        if (activeMsgs.length === 0) {
            this.messagesArea.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fa-solid fa-paper-plane"></i>
                    <p>Aún no hay mensajes</p>
                    <small>Envía el primer mensaje para iniciar la conversación</small>
                </div>
            `;
            return;
        }

        let lastDate = '';
        activeMsgs.forEach(m => {
            // Date separator
            const msgDate = new Date(m.timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
            const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
            
            let dateLabel = msgDate;
            if (msgDate === today) dateLabel = 'Hoy';
            else if (msgDate === yesterday) dateLabel = 'Ayer';

            if (dateLabel !== lastDate) {
                lastDate = dateLabel;
                const sep = document.createElement('div');
                sep.className = 'chat-date-separator';
                sep.innerHTML = `<span>${dateLabel}</span>`;
                this.messagesArea.appendChild(sep);
            }

            this.appendMessage(m, false); // No animar en la carga inicial del historial
        });
        this.scrollToBottom();
    }

    appendMessage(msg, animate = true) {
        if (msg.deleted) return;
        if (document.getElementById(`msg-${msg._id}`)) return;
        const currentUserId = this.currentUser.userId || this.currentUser.id;
        const isMe = msg.senderId === currentUserId;

        const div = document.createElement('div');
        div.id = `msg-${msg._id}`;
        div.className = `chat-msg ${isMe ? 'msg-out' : 'msg-in'}${animate ? ' msg-animate-in' : ''}`;
        div.setAttribute('data-timestamp', Date.now()); // Registrar cuándo se agregó al DOM para evitar lag de replicación

        let content = '';
        if (msg.message) {
            // Check for call tags
            const callMatch = msg.message.match(/^\[MEET_CALL_(VIDEO|VOICE)\]:(.+)$/);
            if (callMatch) {
                const callType = callMatch[1] === 'VIDEO' ? 'Videollamada' : 'Llamada de Voz';
                const callUrl = callMatch[2];
                const icon = callMatch[1] === 'VIDEO' ? 'fa-video' : 'fa-phone';
                content += `
                    <div class="msg-call-block">
                        <div class="msg-call-icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="msg-call-details">
                            <strong>${callType} iniciada</strong>
                            <button class="chat-join-btn" onclick="window.chatWidget.joinCall('${callUrl}', '${callType}')">Unirse</button>
                        </div>
                    </div>`;
            } else {
                content += `<div class="msg-text">${this.escapeHTML(msg.message)}</div>`;
            }
        }
        if (msg.fileName && msg.attachment) {
            if (msg.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                content += `<div class="msg-image"><img src="${msg.attachment}" alt="${msg.fileName}" onclick="window.open('${msg.attachment}')" /></div>`;
            } else {
                content += `<div class="msg-file"><i class="fa-solid fa-file-arrow-down"></i> <a href="${msg.attachment}" download="${msg.fileName}">${msg.fileName}</a></div>`;
            }
        }

        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let readStatusHtml = '';
        if (msg.isOptimistic) {
            readStatusHtml = '<i class="fa-regular fa-clock" title="Enviando..."></i>';
        } else if (msg.read) {
            readStatusHtml = '<i class="fa-solid fa-check-double"></i>';
        } else {
            readStatusHtml = '<i class="fa-solid fa-check"></i>';
        }
        
        const readStatus = isMe
            ? `<span class="msg-status ${msg.read ? 'read' : 'sent'}">${readStatusHtml}</span>`
            : '';
            
        const deleteBtn = isMe 
            ? `<button class="msg-delete-btn" onclick="window.chatWidget.deleteMessage('${msg._id}')" title="Eliminar para todos"><i class="fa-solid fa-trash-can"></i></button>`
            : '';

        div.innerHTML = `
            ${content}
            <div class="msg-meta">
                ${deleteBtn}
                <span class="msg-time">${time}</span>
                ${readStatus}
            </div>
        `;
        this.messagesArea.appendChild(div);
        
        // Remove animation class after animation completes
        setTimeout(() => div.classList.remove('msg-animate-in'), 350);
    }

    promoteMessage(tempId, realId, timestamp, status, read) {
        const optEl = document.getElementById(`msg-${tempId}`);
        if (!optEl) return;

        if (optEl.getAttribute('data-promoting') === 'true') return;
        optEl.setAttribute('data-promoting', 'true');

        const appendedAt = parseInt(optEl.getAttribute('data-timestamp') || '0', 10);
        const elapsed = Date.now() - appendedAt;
        const delay = Math.max(0, 350 - elapsed);

        setTimeout(() => {
            const el = document.getElementById(`msg-${tempId}`);
            if (!el) return;

            el.classList.remove('msg-animate-in');
            el.id = `msg-${realId}`;
            el.setAttribute('data-timestamp', Date.now()); // Para gracia de 15s
            el.removeAttribute('data-promoting');

            // Actualizar status
            const statusSpan = el.querySelector('.msg-status');
            if (statusSpan) {
                if (read) {
                    statusSpan.innerHTML = '<i class="fa-solid fa-check-double"></i>';
                    statusSpan.className = 'msg-status read';
                } else {
                    statusSpan.innerHTML = '<i class="fa-solid fa-check"></i>';
                    statusSpan.className = 'msg-status sent';
                }
            }

            // Actualizar botón de eliminar
            const deleteBtn = el.querySelector('.msg-delete-btn');
            if (deleteBtn) {
                deleteBtn.setAttribute('onclick', `window.chatWidget.deleteMessage('${realId}')`);
            }
        }, delay);
    }

    // ========================================
    // UTILITIES
    // ========================================
    async deleteMessage(messageId) {
        if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;
        
        // Remove locally immediately for better UX
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.remove();

        try {
            await window.PortalDB.deleteChatMessage(messageId);
        } catch(e) {
            console.error('Error deleting message:', e);
        }
    }

    handleMessageDeleted(messageId) {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
            setTimeout(() => el.remove(), 200);
        }
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }

    scrollToBottom() {  
        requestAnimationFrame(() => {
            this.messagesArea.scrollTop = this.messagesArea.scrollHeight; 
        });
    }

    escapeHTML(s) { const p = document.createElement('p'); p.textContent = s; return p.innerHTML; }

    truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    formatContactTime(timestamp) {
        const d = new Date(timestamp);
        const now = new Date();
        const diff = now - d;
        
        if (diff < 86400000 && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 172800000) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    }

    // ========================================
    // VIDEO / VOICE CALLS
    // ========================================
    async startCall(type) {
        if (!this.currentContextId) return;
        
        // 1. Create room via API
        const response = await window.PortalDB.createVideoRoom(true, type);
        if (!response.success || !response.data?.url) {
            window.NotificationUtils?.error('Error al iniciar la llamada');
            return;
        }

        // 2. Automatically join the call myself
        this.joinCall(response.data.url, type === 'video' ? 'Videollamada' : 'Llamada de voz');

        // 3. Send message to chat partner so they can join
        const payload = {
            receiverId: this.currentContextId,
            message: `[MEET_CALL_${type.toUpperCase()}]:${response.data.url}`,
            tempId: 'temp-' + Date.now()
        };

        try {
            await window.PortalDB.sendChatMessage(payload);
        } catch (e) {
            console.error('Failed to send call invite:', e);
        }
    }

    joinCall(url, title = 'Videollamada') {
        this.callTitle.innerHTML = `<i class="fa-solid ${title.toLowerCase().includes('video') ? 'fa-video' : 'fa-phone'}"></i> ${title}`;
        this.callFrame.src = url;
        this.callModal.style.display = 'flex';
    }

    leaveCall() {
        this.callFrame.src = '';
        this.callModal.style.display = 'none';
    }

    toggleChat(show) {
        this.isOpen = show;
        this.container.classList.toggle('active', show);
        
        if (show) {
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            this.loadContacts();
            this.loadUnreadCounts();
            this.input?.focus();
        } else {
            this.container.style.opacity = '0';
            // Wait for transition before hiding completely
            setTimeout(() => {
                if (!this.isOpen) this.container.style.visibility = 'hidden';
            }, 300);
        }
    }
}

// Initialize chat widget
document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
});
