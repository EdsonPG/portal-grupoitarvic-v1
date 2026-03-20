/**
 * Chat Widget v3.0 for Portal ARVIC
 * Premium UX: Unread badges, typing indicators, message read receipts,
 * date separators, last-message previews, smooth animations
 */

class ChatWidget {
    constructor() {
        console.log('💬 ChatWidget v3.0 inicializando...');
        this.isOpen = false;
        this.ws = null;
        this.currentContextId = null;
        this.currentUser = null;
        this.token = localStorage.getItem('arvic_token');
        this.contacts = [];
        this.selectedFile = null;
        this.userStatus = 'online';
        this.soundEnabled = true;
        this.unreadCounts = {};  // { senderId: count }
        this.lastMessages = {};  // { partnerId: { message, timestamp, senderId } }
        this.typingTimers = {};
        this.totalUnread = 0;

        const session = JSON.parse(localStorage.getItem('arvic_current_session')) || null;
        this.currentUser = session ? session.user : null;
        if (!this.currentUser) return;

        this.initDOM();
        this.initEvents();
        this.loadContacts();
        this.loadUnreadCounts();
        setTimeout(() => this.initWebSocket(), 1500);

        // Polling unread counts every 30s
        setInterval(() => this.loadUnreadCounts(), 30000);
        
        // Fallback polling for active chat messages if WebSocket fails (Vercel support)
        setInterval(() => this.pollActiveChat(), 5000);
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
        this.container.innerHTML = `
            <div class="chat-overlay" id="chatOverlay"></div>
            <div class="chat-panel">
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <div class="chat-sidebar-title">
                            <i class="fa-solid fa-comments"></i>
                            <span>Mensajes</span>
                        </div>
                        <div class="chat-sidebar-actions">
                            <button id="chatSoundToggle" title="Sonido: Activado" class="tool-btn"><i class="fa-solid fa-bell"></i></button>
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
    }

    initEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
        this.input.addEventListener('input', () => this.emitTyping());
        this.closeBtn.addEventListener('click', () => this.toggleChat(false));
        this.overlay.addEventListener('click', () => this.toggleChat(false));
        this.searchInput.addEventListener('input', (e) => this.filterContacts(e.target.value));
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

    // === TYPING INDICATOR ===
    emitTyping() {
        if (!this.currentContextId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        if (!this._typingSent) {
            this.ws.send(JSON.stringify({ type: 'typing_start', receiverId: this.currentContextId }));
            this._typingSent = true;
        }
        clearTimeout(this._typingTimeout);
        this._typingTimeout = setTimeout(() => {
            this.ws.send(JSON.stringify({ type: 'typing_stop', receiverId: this.currentContextId }));
            this._typingSent = false;
        }, 2000);
    }

    showTyping(senderId) {
        if (senderId !== this.currentContextId) return;
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTyping(senderId) {
        if (senderId !== this.currentContextId) return;
        this.typingIndicator.style.display = 'none';
    }

    // === FILE ATTACHMENT ===
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

    // === CONTACTS ===
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
        // Don't poll if WebSocket is fully healthy
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        try {
            const history = await window.PortalDB.getChatHistory(this.currentContextId);
            if (!history || history.length === 0) return;
            
            // Check if there are new messages we haven't rendered
            const existingMessages = this.messagesArea.querySelectorAll('.bot-msg-row, .chat-message');
            // If the count of messages differs significantly, just reload history
            // For a simpler deep check, compare last message ID or text
            const lastMsg = history[history.length - 1];
            if (lastMsg && !document.getElementById(`msg-${lastMsg._id}`)) {
                this.renderHistory(history);
                this.playNotificationSound();
            }
        } catch(e) {}
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
                const text = lastMsg.lastMessage || '📎 Archivo';
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

    // === UNREAD COUNTS ===
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

    // === SELECT CONTACT & LOAD HISTORY ===
    async selectContact(user) {
        this.currentContextId = user.userId;
        this.headerName.textContent = user.name;
        this.headerStatus.textContent = user.role === 'admin' ? 'Administrador' : 'Consultor';
        this.inputBar.style.display = 'flex';
        this.typingIndicator.style.display = 'none';

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
        // Via WebSocket for real-time
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'mark_read', senderId }));
        } else {
            await window.PortalDB.markChatAsRead(senderId);
        }

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
            const badge = contactItem.querySelector('.contact-unread-badge');
            if (badge) badge.remove();
        }
    }

    // === WEBSOCKET ===
    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = window.location.host;
        if (window.PortalDB && window.PortalDB.API_URL) {
            try { host = new URL(window.PortalDB.API_URL).host; } catch(e) {}
        }

        const isVercel = window.location.hostname.includes('vercel.app');
        if (isVercel) {
            console.log('Modo Vercel detectado: WebSockets desactivados (usando polling).');
            return;
        }

        this.ws = new WebSocket(`${protocol}//${host}`);

        this.ws.onopen = () => {
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

        this.ws.onclose = () => setTimeout(() => this.initWebSocket(), 5000);
        this.ws.onerror = () => {};
    }

    updateMyStatus(status) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.userStatus = status;
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

    // === MESSAGES ===
    handleIncomingMessage(msg) {
        const currentUserId = this.currentUser.userId || this.currentUser.id;
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

        const payload = {
            receiverId: this.currentContextId,
            message: text,
            attachment: this.selectedFile ? this.selectedFile.base64 : undefined,
            fileName: this.selectedFile ? this.selectedFile.name : undefined
        };

        this.input.value = '';
        this.clearAttachment();

        // Stop typing
        // Optimistic UI update for instant feedback
        const currentUserId = this.currentUser.userId || this.currentUser.id;
        const tempId = 'temp-' + Date.now();
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

        if (this._typingSent && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'typing_stop', receiverId: this.currentContextId }));
            this._typingSent = false;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'chat_message', payload, tempId }));
        } else {
            const res = await window.PortalDB.sendChatMessage(payload);
            if (res.success) {
                // Remove the optimistic message so we can render the real one from DB (with correct Mongoose ID)
                const optEl = document.getElementById(`msg-${tempId}`);
                if (optEl) optEl.remove();
                this.handleIncomingMessage(res.data);
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
        }
    }

    renderHistory(msgs) {
        this.messagesArea.innerHTML = '';
        if (!msgs || msgs.length === 0) {
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
        msgs.forEach(m => {
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

            this.appendMessage(m);
        });
        this.scrollToBottom();
    }

    appendMessage(msg) {
        if (document.getElementById(`msg-${msg._id}`)) return;
        const currentUserId = this.currentUser.userId || this.currentUser.id;
        const isMe = msg.senderId === currentUserId;

        const div = document.createElement('div');
        div.id = `msg-${msg._id}`;
        div.className = `chat-msg ${isMe ? 'msg-out' : 'msg-in'}`;

        let content = '';
        if (msg.message) {
            content += `<div class="msg-text">${this.escapeHTML(msg.message)}</div>`;
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
            readStatusHtml = '<i class="fa-regular fa-clock" title="Enviando..."></i>'; // Reloj de envío
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
    }

    // === UTILITIES ===
    async deleteMessage(messageId) {
        if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;
        
        // Remove locally immediately for better UX
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.remove();

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'delete_message', messageId }));
        } else {
            await window.PortalDB.deleteChatMessage(messageId);
        }
    }

    handleMessageDeleted(messageId) {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.remove();
    }

    playNotificationSound() {
        if (!this.soundEnabled) return;
        try {
            // Generates a short soft beep
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

    toggleChat(show) {
        this.isOpen = show;
        this.container.classList.toggle('active', show);
        if (show) {
            this.loadContacts();
            this.loadUnreadCounts();
            this.input?.focus();
        }
    }
}

// Initialize chat widget
document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
});
