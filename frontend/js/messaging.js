/**
 * Système de messagerie interne
 */

class MessagingApp {
    constructor() {
        this.ws = null;
        this.currentChannel = null;
        this.currentConversation = null;
        this.channels = [];
        this.conversations = [];
        this.messages = [];
        this.users = [];
        this.typingTimeout = null;
        this.reconnectAttempts = 0;
        this.mentionAutocomplete = null;
        this.replyingTo = null;
        
        // Utiliser la configuration centralisée
        this.config = window.AppConfig || {
            websocket: {
                maxReconnectAttempts: 10,
                reconnectBackoffMax: 60000,
                pingInterval: 30000,
                useAuthorizationHeader: true
            },
            messaging: {
                maxMessageLength: 5000,
                typingIndicatorTimeout: 3000,
                messageLoadLimit: 50
            }
        };
        
        this.maxReconnectAttempts = this.config.websocket.maxReconnectAttempts;
        
        // Initialiser de manière asynchrone
        this.init().catch(error => {
            console.error('❌ Erreur initialisation messagerie:', error);
            showNotification('Erreur lors du chargement de la messagerie', 'error');
        });
    }
    
    async init() {
        // Vérifier l'authentification
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error('❌ Token manquant');
            window.location.href = 'index.html';
            return;
        }
        
        // Charger les données initiales
        await this.loadChannels();
        await this.loadConversations();
        await this.loadUsers();
        
        // Connecter le WebSocket
        this.connectWebSocket();
        
        // Initialiser les événements
        this.initEventListeners();
        
        // Mettre à jour le statut en ligne
        this.updateUserStatus('online');
    }
    
    connectWebSocket() {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            console.error('❌ Token manquant, impossible de se connecter au WebSocket');
            return;
        }
        
        // Utiliser la configuration centralisée pour l'URL
        let wsUrl = window.AppConfig 
            ? window.AppConfig.getWebSocketUrl('/ws/messaging')
            : this.getFallbackWebSocketUrl();
        
        // Méthode d'authentification
        if (this.config.websocket.useAuthorizationHeader) {
            // Méthode recommandée: Authorization header (via query param pour WebSocket)
            wsUrl += `?Authorization=Bearer ${token}`;
        } else {
            // Méthode legacy: token direct
            wsUrl += `?token=${token}`;
        }
        
        console.log('🔌 Connexion WebSocket:', wsUrl.replace(token, 'TOKEN_HIDDEN'));
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket connecté');
            this.reconnectAttempts = 0;
            
            // S'abonner aux canaux actuels
            if (this.currentChannel) {
                this.subscribeToChannel(this.currentChannel.id);
            }
            if (this.currentConversation) {
                this.subscribeToConversation(this.currentConversation.id);
            }
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ Erreur WebSocket:', error);
        };
        
        this.ws.onclose = () => {
            console.log('🔌 WebSocket déconnecté');
            this.attemptReconnect();
        };
        
        // Ping régulier pour maintenir la connexion
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.config.websocket.pingInterval);
    }
    
    getFallbackWebSocketUrl() {
        // Fallback si AppConfig n'est pas chargé
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'ws://localhost:8000/ws/messaging';
        } else if (hostname.includes('vercel.app')) {
            return 'wss://cocoatrack-api-prod.azurewebsites.net/ws/messaging';
        } else if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
            return `ws://${hostname}:8000/ws/messaging`;
        } else {
            return 'wss://cocoatrack-api-prod.azurewebsites.net/ws/messaging';
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Backoff exponentiel avec maximum configurable
            const delay = Math.min(
                1000 * Math.pow(2, this.reconnectAttempts), 
                this.config.websocket.reconnectBackoffMax
            );
            
            console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${Math.round(delay/1000)}s`);
            
            // Afficher une notification à l'utilisateur
            if (this.reconnectAttempts === 1) {
                showNotification('Connexion perdue, reconnexion en cours...', 'warning');
            } else if (this.reconnectAttempts === Math.floor(this.maxReconnectAttempts / 2)) {
                showNotification(`Reconnexion difficile... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning');
            }
            
            this.reconnectTimeout = setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            console.error('❌ Impossible de se reconnecter au WebSocket après', this.maxReconnectAttempts, 'tentatives');
            showNotification('Connexion perdue. Veuillez recharger la page.', 'error');
            
            // Proposer de recharger automatiquement après 5 secondes
            setTimeout(() => {
                if (confirm('La connexion au serveur est perdue. Voulez-vous recharger la page ?')) {
                    window.location.reload();
                }
            }, 5000);
        }
    }
    
    disconnect() {
        // Nettoyer les timers
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Fermer la connexion WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        console.log('🔌 WebSocket déconnecté proprement');
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new_message':
                this.handleNewMessage(data.data);
                break;
            
            case 'typing':
                this.handleTypingIndicator(data.data);
                break;
            
            case 'message_read':
                this.handleMessageRead(data.data);
                break;
            
            case 'user_status':
                this.handleUserStatus(data.data);
                break;
            
            case 'subscribed':
                console.log('Abonné:', data.data);
                break;
            
            case 'pong':
                // Réponse au ping
                break;
            
            default:
                console.log('Message WebSocket non géré:', data);
        }
    }
    
    subscribeToChannel(channelId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe_channel',
                channel_id: channelId
            }));
        }
    }
    
    unsubscribeFromChannel(channelId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe_channel',
                channel_id: channelId
            }));
        }
    }
    
    subscribeToConversation(conversationId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe_conversation',
                conversation_id: conversationId
            }));
        }
    }
    
    unsubscribeFromConversation(conversationId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe_conversation',
                conversation_id: conversationId
            }));
        }
    }
    
    async loadChannels() {
        try {
            const response = await api.get('/messaging/channels');
            this.channels = response || [];
            this.renderChannels();
        } catch (error) {
            console.error('Erreur chargement canaux:', error);
            this.channels = [];
            this.renderChannels();
            // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de canaux
            if (error.response?.status !== 404) {
                showNotification('Erreur lors du chargement des canaux', 'error');
            }
        }
    }
    
    async loadPublicChannels() {
        try {
            const response = await api.get('/messaging/channels/public');
            return response || [];
        } catch (error) {
            console.error('Erreur chargement canaux publics:', error);
            return [];
        }
    }
    
    async loadConversations() {
        try {
            const response = await api.get('/messaging/conversations');
            this.conversations = response || [];
            this.renderConversations();
        } catch (error) {
            console.error('Erreur chargement conversations:', error);
            this.conversations = [];
            this.renderConversations();
        }
    }
    
    async loadUsers() {
        try {
            // Essayer d'abord l'endpoint de recherche (accessible à tous)
            const response = await api.get('/users/search');
            this.users = response || [];
        } catch (error) {
            console.warn('⚠️ Impossible de charger les utilisateurs:', error);
            this.users = [];
            // Ne pas bloquer si on n'a pas accès aux utilisateurs
            // On les chargera depuis les conversations/canaux
        }
    }
    
    async searchUsers(query) {
        try {
            const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
            return response || [];
        } catch (error) {
            console.error('Erreur recherche utilisateurs:', error);
            return [];
        }
    }
    
    renderChannels() {
        const container = document.getElementById('channelsList');
        if (!container) {
            console.warn('⚠️ Conteneur channelsList non trouvé');
            return;
        }
        
        if (this.channels.length === 0) {
            container.innerHTML = `
                <p style="padding: 10px; color: #999; font-size: 0.9rem;">Aucun canal</p>
                <button class="btn-secondary" id="browseChannelsBtn" style="margin: 10px; width: calc(100% - 20px);">
                    <i class="fas fa-search"></i> Parcourir les canaux
                </button>
            `;
            
            // Ajouter l'événement pour le bouton parcourir
            const browseBtn = document.getElementById('browseChannelsBtn');
            if (browseBtn) {
                browseBtn.addEventListener('click', () => this.showBrowseChannelsModal());
            }
            return;
        }
        
        container.innerHTML = this.channels.map(channel => `
            <div class="channel-item ${this.currentChannel?.id === channel.id ? 'active' : ''}" 
                 data-channel-id="${channel.id}">
                <div class="channel-icon">
                    <i class="fas fa-hashtag"></i>
                </div>
                <div class="channel-info">
                    <div class="channel-name">${channel.display_name}</div>
                    ${channel.last_message ? `<div class="last-message">${channel.last_message}</div>` : ''}
                </div>
                ${channel.unread_count > 0 ? `<span class="unread-badge">${channel.unread_count}</span>` : ''}
            </div>
        `).join('');
        
        // Ajouter les événements
        container.querySelectorAll('.channel-item').forEach(item => {
            item.addEventListener('click', () => {
                const channelId = item.dataset.channelId;
                this.openChannel(channelId);
            });
        });
    }
    
    renderConversations() {
        const container = document.getElementById('conversationsList');
        if (!container) {
            console.warn('⚠️ Conteneur conversationsList non trouvé');
            return;
        }
        
        if (this.conversations.length === 0) {
            container.innerHTML = '<p style="padding: 10px; color: #999; font-size: 0.9rem;">Aucune conversation</p>';
            return;
        }
        
        container.innerHTML = this.conversations.map(conv => {
            const otherUser = conv.other_user;
            const initials = otherUser ? otherUser.email.substring(0, 2).toUpperCase() : '??';
            
            return `
                <div class="conversation-item ${this.currentConversation?.id === conv.id ? 'active' : ''}" 
                     data-conversation-id="${conv.id}">
                    <div class="user-avatar">${initials}</div>
                    <div class="conversation-info">
                        <div class="user-name">${otherUser ? otherUser.email : 'Utilisateur inconnu'}</div>
                        ${conv.last_message ? `<div class="last-message">${conv.last_message}</div>` : ''}
                    </div>
                    ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                    <div class="user-status ${otherUser?.status || 'offline'}"></div>
                </div>
            `;
        }).join('');
        
        // Ajouter les événements
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.conversationId;
                this.openConversation(conversationId);
            });
        });
    }
    
    async openChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;
        
        // Désabonner de l'ancien canal/conversation
        if (this.currentChannel) {
            this.unsubscribeFromChannel(this.currentChannel.id);
        }
        if (this.currentConversation) {
            this.unsubscribeFromConversation(this.currentConversation.id);
        }
        
        this.currentChannel = channel;
        this.currentConversation = null;
        
        // S'abonner au nouveau canal
        this.subscribeToChannel(channelId);
        
        // Mettre à jour l'interface
        document.getElementById('chatTitle').textContent = channel.display_name;
        document.getElementById('chatSubtitle').textContent = channel.description || `${channel.member_count} membres`;
        document.getElementById('messageInputContainer').style.display = 'block';
        
        // Charger les messages
        await this.loadChannelMessages(channelId);
        
        // Marquer tous les messages comme lus
        await this.markChannelAsRead(channelId);
        
        // Mettre à jour la sélection
        this.renderChannels();
    }
    
    async openConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Désabonner de l'ancien canal/conversation
        if (this.currentChannel) {
            this.unsubscribeFromChannel(this.currentChannel.id);
        }
        if (this.currentConversation) {
            this.unsubscribeFromConversation(this.currentConversation.id);
        }
        
        this.currentChannel = null;
        this.currentConversation = conversation;
        
        // S'abonner à la nouvelle conversation
        this.subscribeToConversation(conversationId);
        
        // Mettre à jour l'interface
        const otherUser = conversation.other_user;
        document.getElementById('chatTitle').textContent = otherUser ? otherUser.email : 'Utilisateur inconnu';
        document.getElementById('chatSubtitle').textContent = otherUser ? otherUser.role : '';
        document.getElementById('messageInputContainer').style.display = 'block';
        
        // Charger les messages
        await this.loadConversationMessages(conversationId);
        
        // Marquer tous les messages comme lus
        await this.markConversationAsRead(conversationId);
        
        // Mettre à jour la sélection
        this.renderConversations();
    }
    
    async loadChannelMessages(channelId) {
        try {
            const messages = await api.get(`/messaging/channels/${channelId}/messages`);
            // Les messages sont déjà triés du plus ancien au plus récent par l'API
            this.messages = messages || [];
            this.renderMessages();
        } catch (error) {
            console.error('Erreur chargement messages:', error);
            showNotification('Erreur lors du chargement des messages', 'error');
        }
    }
    
    async loadConversationMessages(conversationId) {
        try {
            const messages = await api.get(`/messaging/conversations/${conversationId}/messages`);
            // Les messages sont déjà triés du plus ancien au plus récent par l'API
            this.messages = messages || [];
            this.renderMessages();
        } catch (error) {
            console.error('Erreur chargement messages:', error);
            showNotification('Erreur lors du chargement des messages', 'error');
        }
    }
    
    renderMessages(autoScroll = true) {
        const container = document.getElementById('messagesContainer');
        if (!container) {
            console.warn('⚠️ Conteneur messagesContainer non trouvé');
            return;
        }
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments fa-3x"></i>
                    <p>Aucun message pour le moment</p>
                    <p style="font-size: 0.9rem; color: #999;">Soyez le premier à écrire!</p>
                </div>
            `;
            return;
        }
        
        const currentUserId = this.getCurrentUserId();
        
        container.innerHTML = this.messages.map(msg => {
            const isOwn = msg.sender_id === currentUserId;
            const sender = msg.sender || {};
            const initials = sender.email ? sender.email.substring(0, 2).toUpperCase() : '??';
            const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            // Vérifier si l'utilisateur actuel est mentionné
            const currentUser = this.users.find(u => u.id === currentUserId);
            const isMentioned = currentUser && msg.content.includes(`@${currentUser.email}`);
            
            return `
                <div id="message-${msg.id}" class="message ${isOwn ? 'own' : ''} ${isMentioned ? 'mentioned' : ''}" data-message-id="${msg.id}" style="${isMentioned ? 'background: #fff3cd; border-left: 3px solid #ffc107;' : ''}">
                    ${!isOwn ? `<div class="message-avatar">${initials}</div>` : ''}
                    <div class="message-content">
                        <div class="message-header">
                            ${!isOwn ? `<span class="message-sender">${sender.email || 'Inconnu'}</span>` : ''}
                            <span class="message-time">${time}</span>
                        </div>
                        ${msg.reply_to ? this.renderReplyPreview(msg.reply_to) : ''}
                        ${(() => {
                            const loc = msg.location || this.extractLocation(msg);
                            if (loc) return this.renderLocation(loc);
                            if (msg.content) return `<div class="message-text ${msg.edited_at ? 'edited' : ''}">${this.formatMessageContent(msg.content)}</div>`;
                            return '';
                        })()}
                        ${msg.attachments && msg.attachments.length > 0 ? msg.attachments.map(att => this.renderAttachment(att)).join('') : ''}
                        <div class="message-actions">
                            <button onclick="window.messagingApp.replyToMessage('${msg.id}')">
                                <i class="fas fa-reply"></i> Répondre
                            </button>
                            ${isOwn ? `
                                <button onclick="window.messagingApp.editMessage('${msg.id}')">
                                    <i class="fas fa-edit"></i> Modifier
                                </button>
                                <button onclick="window.messagingApp.deleteMessage('${msg.id}')">
                                    <i class="fas fa-trash"></i> Supprimer
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroller vers le bas seulement si demandé (nouveaux messages)
        if (autoScroll) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }
    
    formatMessageContent(content) {
        // Échapper le HTML
        content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Convertir les URLs en liens
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #1976d2; text-decoration: underline;">$1</a>');
        
        // Convertir les mentions @email avec style spécial
        content = content.replace(/@([^\s@]+@[^\s@]+)/g, '<span class="mention" style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-weight: 500;">@$1</span>');
        
        // Convertir les sauts de ligne
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content) return;
        
        if (!this.currentChannel && !this.currentConversation) {
            showNotification('Sélectionnez un canal ou une conversation', 'warning');
            return;
        }
        
        try {
            // Extraire les mentions
            const mentions = this.extractMentions(content);
            
            const messageData = {
                content: content,
                channel_id: this.currentChannel?.id || null,
                conversation_id: this.currentConversation?.id || null,
                mentions: mentions.length > 0 ? mentions : undefined,
                reply_to_id: this.replyingTo?.id || null
            };
            
            const message = await api.post('/messaging/messages', messageData);
            
            // Ajouter la référence au message parent localement
            if (this.replyingTo) {
                message.reply_to = this.replyingTo;
            }
            
            // Ajouter le message localement
            this.messages.push(message);
            this.renderMessages();
            
            // Diffuser via WebSocket
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'new_message',
                    data: message
                }));
            }
            
            // Réinitialiser l'input et la réponse
            input.value = '';
            input.style.height = 'auto';
            this.cancelReply();
            
            // Arrêter l'indicateur de frappe
            this.sendTypingIndicator(false);
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            showNotification('Erreur lors de l\'envoi du message', 'error');
        }
    }
    
    handleNewMessage(message) {
        console.log('📨 Nouveau message reçu:', message);
        
        // Vérifier si le message appartient au canal/conversation actuel
        const isCurrentChannel = this.currentChannel && message.channel_id === this.currentChannel.id;
        const isCurrentConversation = this.currentConversation && message.conversation_id === this.currentConversation.id;
        const currentUserId = this.getCurrentUserId();
        const isOwnMessage = message.sender_id === currentUserId;
        
        if (isCurrentChannel || isCurrentConversation) {
            // Ajouter le message s'il n'existe pas déjà
            if (!this.messages.find(m => m.id === message.id)) {
                console.log('✅ Message ajouté à la conversation actuelle');
                
                // Si c'est une réponse, charger le message parent
                if (message.reply_to_id) {
                    message.reply_to = this.messages.find(m => m.id === message.reply_to_id);
                }
                
                this.messages.push(message);
                this.renderMessages(true); // Auto-scroll pour les nouveaux messages
                
                // Notification sonore/visuelle si ce n'est pas notre propre message
                if (!isOwnMessage) {
                    this.showMessageNotification(message);
                }
            } else {
                console.log('⚠️ Message déjà présent, ignoré');
            }
        } else {
            console.log('ℹ️ Message pour un autre canal/conversation');
            
            // Notification pour les messages dans d'autres canaux/conversations
            if (!isOwnMessage) {
                this.showMessageNotification(message);
            }
        }
        
        // Mettre à jour les compteurs non lus
        this.updateUnreadCounts();
    }
    
    showMessageNotification(message) {
        const sender = message.sender || {};
        const senderName = sender.email || 'Quelqu\'un';
        const channelName = this.getChannelOrConversationName(message);
        
        // Vérifier si l'utilisateur est mentionné
        const currentUser = this.users.find(u => u.id === this.getCurrentUserId());
        const isMentioned = currentUser && message.content.includes(`@${currentUser.email}`);
        
        // Notification navigateur si la page n'est pas active
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const title = isMentioned ? `🔔 ${senderName} vous a mentionné` : `💬 ${senderName}`;
            const notification = new Notification(title, {
                body: `${channelName}: ${message.content}`,
                icon: '/assets/feve-de-cacao.png',
                badge: '/assets/feve-de-cacao.png',
                tag: `message-${message.id}`,
                requireInteraction: isMentioned, // Garder la notification si mentionné
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                // Ouvrir le canal/conversation
                if (message.channel_id) {
                    this.openChannel(message.channel_id);
                } else if (message.conversation_id) {
                    this.openConversation(message.conversation_id);
                }
                notification.close();
            };
            
            // Fermer automatiquement après 5 secondes
            setTimeout(() => notification.close(), 5000);
        }
        
        // Toast notification si la page est active
        if (!document.hidden && typeof showToast === 'function') {
            const icon = isMentioned ? '🔔' : '💬';
            const prefix = isMentioned ? 'Vous a mentionné' : '';
            showToast(`${icon} ${senderName} ${prefix}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`, isMentioned ? 'warning' : 'info');
        }
        
        // Son de notification (plus fort si mentionné)
        this.playNotificationSound(isMentioned);
    }
    
    getChannelOrConversationName(message) {
        if (message.channel_id) {
            const channel = this.channels.find(c => c.id === message.channel_id);
            return channel ? `#${channel.display_name}` : 'Canal';
        } else if (message.conversation_id) {
            return 'Message direct';
        }
        return 'Message';
    }
    
    playNotificationSound(isMention = false) {
        // Son de notification (différent si mention)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (isMention) {
                // Son plus aigu et plus long pour les mentions
                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                
                // Deuxième bip
                setTimeout(() => {
                    const osc2 = audioContext.createOscillator();
                    const gain2 = audioContext.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioContext.destination);
                    osc2.frequency.value = 1200;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(0.4, audioContext.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    osc2.start(audioContext.currentTime);
                    osc2.stop(audioContext.currentTime + 0.2);
                }, 150);
            } else {
                // Son normal
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (error) {
            // Ignorer les erreurs de son
            console.debug('Son de notification non disponible');
        }
    }
    
    // Gestion des mentions @utilisateur
    handleMentionAutocomplete(event) {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value;
        const cursorPos = input.selectionStart;
        
        // Trouver le dernier @ avant le curseur
        const textBeforeCursor = text.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex === -1) {
            this.hideMentionAutocomplete();
            return;
        }
        
        // Vérifier qu'il n'y a pas d'espace entre @ et le curseur
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (textAfterAt.includes(' ')) {
            this.hideMentionAutocomplete();
            return;
        }
        
        // Filtrer les utilisateurs
        const query = textAfterAt.toLowerCase();
        const filteredUsers = this.users.filter(user => 
            user.email.toLowerCase().includes(query) && 
            user.id !== this.getCurrentUserId()
        );
        
        if (filteredUsers.length > 0) {
            this.showMentionAutocomplete(filteredUsers, lastAtIndex);
        } else {
            this.hideMentionAutocomplete();
        }
    }
    
    showMentionAutocomplete(users, atIndex) {
        if (!this.mentionAutocomplete) {
            this.mentionAutocomplete = new MentionAutocomplete(this);
        }
        this.mentionAutocomplete.show(users, atIndex);
    }
    
    hideMentionAutocomplete() {
        if (this.mentionAutocomplete) {
            this.mentionAutocomplete.hide();
        }
    }
    
    insertMention(user, atIndex) {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value;
        const cursorPos = input.selectionStart;
        
        // Trouver la fin du mot après @
        const textAfterAt = text.substring(atIndex);
        const spaceIndex = textAfterAt.indexOf(' ');
        const endIndex = spaceIndex === -1 ? text.length : atIndex + spaceIndex;
        
        // Remplacer @query par @email
        const mention = `@${user.email}`;
        const newText = text.substring(0, atIndex) + mention + ' ' + text.substring(endIndex);
        
        input.value = newText;
        input.selectionStart = input.selectionEnd = atIndex + mention.length + 1;
        
        // Trigger input event pour auto-resize
        input.dispatchEvent(new Event('input'));
        
        this.hideMentionAutocomplete();
        input.focus();
    }
    
    extractMentions(content) {
        // Extraire tous les @email du message
        const mentionRegex = /@([^\s@]+@[^\s@]+)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
            const email = match[1];
            const user = this.users.find(u => u.email === email);
            if (user) {
                mentions.push(user.id);
            }
        }
        
        return mentions;
    }
    
    async markChannelAsRead(channelId) {
        try {
            // Marquer tous les messages du canal comme lus
            for (const msg of this.messages) {
                if (msg.channel_id === channelId && msg.sender_id !== this.getCurrentUserId()) {
                    await api.post(`/messaging/messages/${msg.id}/read`).catch(() => {});
                }
            }
            
            // Réinitialiser le compteur localement
            const channel = this.channels.find(c => c.id === channelId);
            if (channel) {
                channel.unread_count = 0;
                this.renderChannels();
            }
            await this.updateUnreadCounts();
        } catch (error) {
            console.error('Erreur marquage canal comme lu:', error);
        }
    }
    
    async markConversationAsRead(conversationId) {
        try {
            // Marquer tous les messages de la conversation comme lus
            for (const msg of this.messages) {
                if (msg.conversation_id === conversationId && msg.sender_id !== this.getCurrentUserId()) {
                    await api.post(`/messaging/messages/${msg.id}/read`).catch(() => {});
                }
            }
            
            // Réinitialiser le compteur localement
            const conv = this.conversations.find(c => c.id === conversationId);
            if (conv) {
                conv.unread_count = 0;
                this.renderConversations();
            }
            await this.updateUnreadCounts();
        } catch (error) {
            console.error('Erreur marquage conversation comme lue:', error);
        }
    }
    
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        this.replyingTo = message;
        this.showReplyPreview();
        
        // Focus sur l'input
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    }
    
    showReplyPreview() {
        const container = document.getElementById('messageInputContainer');
        if (!container || !this.replyingTo) return;
        
        let preview = document.getElementById('replyPreview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'replyPreview';
            preview.style.cssText = `
                padding: 10px 15px;
                background: #f5f5f5;
                border-left: 3px solid #1976d2;
                margin-bottom: 10px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            container.insertBefore(preview, container.firstChild);
        }
        
        const sender = this.replyingTo.sender?.email || 'Quelqu\'un';
        const content = this.replyingTo.content.substring(0, 50) + (this.replyingTo.content.length > 50 ? '...' : '');
        
        preview.innerHTML = `
            <div>
                <div style="font-size: 0.85rem; color: #1976d2; font-weight: 600;">
                    <i class="fas fa-reply"></i> Répondre à ${sender}
                </div>
                <div style="font-size: 0.9rem; color: #666; margin-top: 4px;">${content}</div>
            </div>
            <button onclick="window.messagingApp.cancelReply()" style="
                background: transparent;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 5px;
                font-size: 1.2rem;
            ">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    cancelReply() {
        this.replyingTo = null;
        const preview = document.getElementById('replyPreview');
        if (preview) preview.remove();
    }
    
    renderReplyPreview(replyToMessage) {
        if (!replyToMessage) return '';
        
        const sender = replyToMessage.sender?.email || 'Quelqu\'un';
        const content = replyToMessage.content.substring(0, 50) + (replyToMessage.content.length > 50 ? '...' : '');
        
        return `
            <div class="reply-preview" style="
                padding: 8px 12px;
                background: #f5f5f5;
                border-left: 3px solid #1976d2;
                margin-bottom: 8px;
                border-radius: 4px;
                font-size: 0.85rem;
                cursor: pointer;
            " onclick="document.getElementById('message-${replyToMessage.id}')?.scrollIntoView({behavior: 'smooth', block: 'center'})">
                <div style="color: #1976d2; font-weight: 600; margin-bottom: 2px;">
                    <i class="fas fa-reply"></i> ${sender}
                </div>
                <div style="color: #666;">${content}</div>
            </div>
        `;
    }
    
    showAttachmentDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                await this.uploadAttachments(files);
            }
        };
        
        input.click();
    }
    
    async uploadAttachments(files) {
        if (!this.currentChannel && !this.currentConversation) {
            showNotification('Sélectionnez un canal ou une conversation', 'warning');
            return;
        }
        
        try {
            showNotification(`📎 Conversion de ${files.length} fichier(s) en base64...`, 'info');
            
            for (const file of files) {
                // Convertir en base64 pour envoi simple
                const base64 = await this.fileToBase64(file);
                
                const messageData = {
                    content: `📎 ${file.name}`,
                    channel_id: this.currentChannel?.id || null,
                    conversation_id: this.currentConversation?.id || null,
                    attachments: [{
                        filename: file.name,
                        mime_type: file.type,
                        size: file.size,
                        data: base64
                    }]
                };
                
                const message = await api.post('/messaging/messages', messageData);
                this.messages.push(message);
            }
            
            this.renderMessages();
            showNotification('✅ Fichier(s) envoyé(s)', 'success');
            
        } catch (error) {
            console.error('Erreur envoi pièce jointe:', error);
            showNotification('❌ Erreur: ' + error.message, 'error');
        }
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    renderAttachment(attachment) {
        const isImage = attachment.mime_type?.startsWith('image/');
        const dataUrl = attachment.data || attachment.url;
        
        if (isImage && dataUrl) {
            return `
                <div style="margin-top: 8px;">
                    <img src="${dataUrl}" alt="${attachment.filename}" 
                         style="max-width: 300px; max-height: 300px; border-radius: 8px; cursor: pointer;"
                         onclick="window.open('${dataUrl}', '_blank')">
                    <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">${attachment.filename}</div>
                </div>
            `;
        } else {
            return `
                <div style="margin-top: 8px; padding: 10px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file" style="font-size: 1.5rem; color: #666;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${attachment.filename}</div>
                        <div style="font-size: 0.85rem; color: #666;">${this.formatFileSize(attachment.size || 0)}</div>
                    </div>
                    ${dataUrl ? `<a href="${dataUrl}" download="${attachment.filename}" style="color: #1976d2;">
                        <i class="fas fa-download"></i>
                    </a>` : ''}
                </div>
            `;
        }
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    async shareLocation() {
        if (!navigator.geolocation) {
            showNotification('❌ Géolocalisation non supportée', 'error');
            return;
        }
        
        if (!this.currentChannel && !this.currentConversation) {
            showNotification('Sélectionnez un canal ou une conversation', 'warning');
            return;
        }
        
        showNotification('📍 Récupération de votre position...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    const messageData = {
                        content: `📍 GPS: ${latitude},${longitude}`,
                        channel_id: this.currentChannel?.id || null,
                        conversation_id: this.currentConversation?.id || null
                    };
                    
                    const message = await api.post('/messaging/messages', messageData);
                    message.location = { latitude, longitude, accuracy: position.coords.accuracy };
                    this.messages.push(message);
                    this.renderMessages();
                    
                    showNotification('✅ Position partagée', 'success');
                } catch (error) {
                    console.error('Erreur partage position:', error);
                    showNotification('❌ Erreur lors du partage', 'error');
                }
            },
            (error) => {
                console.error('Erreur géolocalisation:', error);
                showNotification('❌ Impossible d\'obtenir votre position', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
    
    isLocationMessage(msg) {
        return msg.content && msg.content.startsWith('📍 GPS:');
    }
    
    extractLocation(msg) {
        if (msg.location) return msg.location;
        
        if (!msg.content) return null;
        
        // Format: 📍 GPS: 48.123456,2.123456
        const match = msg.content.match(/📍 GPS:\s*([-\d.]+)\s*,\s*([-\d.]+)/);
        if (match) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lon)) {
                return { latitude: lat, longitude: lon };
            }
        }
        return null;
    }
    
    renderLocation(location) {
        if (!location || !location.latitude || !location.longitude) return '';
        
        const { latitude, longitude } = location;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x200&markers=color:red%7C${latitude},${longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`;
        
        return `
            <div style="margin-top: 8px; border-radius: 12px; overflow: hidden; border: 2px solid #1976d2; max-width: 320px; background: white;">
                <div style="position: relative;">
                    <img 
                        src="${staticMapUrl}" 
                        alt="Carte" 
                        style="width: 100%; height: 200px; object-fit: cover; display: block;"
                        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ECarte non disponible%3C/text%3E%3C/svg%3E'">
                    <div style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #1976d2;">
                        📍 Position GPS
                    </div>
                </div>
                <div style="padding: 12px; background: #f8f9fa;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.85rem; color: #666; font-family: monospace;">
                            ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                        </div>
                        <a href="${googleMapsUrl}" target="_blank" style="color: white; background: #1976d2; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-map-marked-alt"></i> Ouvrir
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    sendTypingIndicator(isTyping) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('⌨️ Envoi indicateur frappe:', isTyping);
            this.ws.send(JSON.stringify({
                type: 'typing',
                channel_id: this.currentChannel?.id || null,
                conversation_id: this.currentConversation?.id || null,
                is_typing: isTyping
            }));
        }
    }
    
    handleTypingIndicator(data) {
        console.log('⌨️ Indicateur de frappe:', data);
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = document.getElementById('typingText');
        
        if (!typingIndicator || !typingText) {
            console.warn('⚠️ Éléments typing indicator non trouvés');
            return;
        }
        
        if (data.is_typing) {
            const userName = data.user_email || 'Quelqu\'un';
            typingText.textContent = `${userName} est en train d'écrire...`;
            typingIndicator.style.display = 'flex';
        } else {
            typingIndicator.style.display = 'none';
        }
    }
    
    handleMessageRead(data) {
        // Mettre à jour l'interface si nécessaire
        console.log('Message lu:', data);
    }
    
    handleUserStatus(data) {
        console.log('👤 Statut utilisateur:', data);
        // Mettre à jour le statut des utilisateurs dans les conversations
        if (data.user_id && data.status) {
            // Mettre à jour dans la liste des conversations
            this.conversations.forEach(conv => {
                if (conv.other_user && conv.other_user.id === data.user_id) {
                    conv.other_user.status = data.status;
                }
            });
            this.renderConversations();
        }
    }
    
    async updateUnreadCounts() {
        try {
            const counts = await api.get('/messaging/unread');
            console.log('Compteurs non lus:', counts);
            
            // Mettre à jour le badge dans la sidebar
            const messagingBadge = document.getElementById('messagingBadge');
            if (messagingBadge && counts && counts.total > 0) {
                messagingBadge.textContent = counts.total;
                messagingBadge.style.display = 'inline-block';
            } else if (messagingBadge) {
                messagingBadge.style.display = 'none';
            }
            
            // Mettre à jour les badges des canaux et conversations
            this.updateChannelBadges(counts);
            this.updateConversationBadges(counts);
            
        } catch (error) {
            console.error('Erreur mise à jour compteurs:', error);
        }
    }
    
    updateChannelBadges(counts) {
        if (!counts || !counts.channels) return;
        
        // Mettre à jour les badges des canaux
        this.channels.forEach(channel => {
            const count = counts.channels[channel.id] || 0;
            channel.unread_count = count;
        });
        
        // Re-render si on est sur la page messagerie
        if (document.getElementById('channelsList')) {
            this.renderChannels();
        }
    }
    
    updateConversationBadges(counts) {
        if (!counts || !counts.conversations) return;
        
        // Mettre à jour les badges des conversations
        this.conversations.forEach(conv => {
            const count = counts.conversations[conv.id] || 0;
            conv.unread_count = count;
        });
        
        // Re-render si on est sur la page messagerie
        if (document.getElementById('conversationsList')) {
            this.renderConversations();
        }
    }
    
    async updateUserStatus(status) {
        try {
            await api.put('/messaging/status', { status });
        } catch (error) {
            console.error('Erreur mise à jour statut:', error);
        }
    }
    
    getCurrentUserId() {
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub;
        } catch (error) {
            return null;
        }
    }
    
    initEventListeners() {
        // Vérifier que les éléments existent avant d'ajouter les listeners
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // Entrée dans le textarea
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                // Gérer l'autocomplete des mentions
                if (this.mentionAutocomplete && this.mentionAutocomplete.isVisible) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.mentionAutocomplete.selectNext();
                        return;
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.mentionAutocomplete.selectPrevious();
                        return;
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        this.mentionAutocomplete.selectCurrent();
                        return;
                    } else if (e.key === 'Escape') {
                        this.mentionAutocomplete.hide();
                        return;
                    }
                }
                
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Indicateur de frappe et autocomplete mentions
            messageInput.addEventListener('input', (e) => {
                // Auto-resize
                messageInput.style.height = 'auto';
                messageInput.style.height = messageInput.scrollHeight + 'px';
                
                // Envoyer l'indicateur de frappe
                this.sendTypingIndicator(true);
                
                // Arrêter après 3 secondes d'inactivité
                clearTimeout(this.typingTimeout);
                this.typingTimeout = setTimeout(() => {
                    this.sendTypingIndicator(false);
                }, 3000);
                
                // Gérer l'autocomplete des mentions
                this.handleMentionAutocomplete(e);
            });
        }
        
        // Bouton pièce jointe
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                this.showAttachmentDialog();
            });
        }
        
        // Bouton localisation
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => {
                this.shareLocation();
            });
        }
        
        // Bouton créer canal
        const addChannelBtn = document.getElementById('addChannelBtn');
        if (addChannelBtn) {
            addChannelBtn.addEventListener('click', () => {
                this.showCreateChannelModal();
            });
        }
        
        // Bouton nouveau DM
        const newDMBtn = document.getElementById('newDMBtn');
        if (newDMBtn) {
            newDMBtn.addEventListener('click', () => {
                this.showNewDMModal();
            });
        }
        
        // Formulaire créer canal
        const createChannelForm = document.getElementById('createChannelForm');
        if (createChannelForm) {
            createChannelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createChannel();
            });
        }
        
        // Mettre à jour le statut et nettoyer avant de quitter
        window.addEventListener('beforeunload', () => {
            this.updateUserStatus('offline');
            this.disconnect();
        });
        
        // Nettoyer aussi lors de la navigation
        window.addEventListener('pagehide', () => {
            this.disconnect();
        });
    }
    
    showCreateChannelModal() {
        document.getElementById('createChannelModal').classList.add('active');
    }
    
    async showBrowseChannelsModal() {
        document.getElementById('browseChannelsModal').classList.add('active');
        
        // Charger les canaux publics
        const publicChannels = await this.loadPublicChannels();
        const container = document.getElementById('publicChannelsList');
        
        if (!container) return;
        
        if (publicChannels.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Aucun canal public disponible</p>';
            return;
        }
        
        container.innerHTML = publicChannels.map(channel => {
            const isMember = channel.is_member;
            return `
                <div class="channel-browse-item" data-channel-id="${channel.id}">
                    <div class="channel-icon">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <div class="channel-info">
                        <div class="channel-name">${channel.display_name}</div>
                        <div class="channel-description">${channel.description || 'Pas de description'}</div>
                        <div class="channel-meta">
                            <span><i class="fas fa-users"></i> ${channel.member_count} membre(s)</span>
                        </div>
                    </div>
                    <div class="channel-actions">
                        ${isMember 
                            ? '<span class="badge-success"><i class="fas fa-check"></i> Membre</span>' 
                            : `<button class="btn-primary btn-sm join-channel-btn" data-channel-id="${channel.id}">
                                <i class="fas fa-plus"></i> Rejoindre
                               </button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
        
        // Ajouter les événements pour rejoindre les canaux
        container.querySelectorAll('.join-channel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const channelId = btn.dataset.channelId;
                await this.joinChannel(channelId);
            });
        });
    }
    
    async joinChannel(channelId) {
        try {
            await api.post(`/messaging/channels/${channelId}/join`);
            showNotification('Canal rejoint avec succès', 'success');
            
            // Recharger les canaux
            await this.loadChannels();
            
            // Fermer le modal et ouvrir le canal
            closeModal('browseChannelsModal');
            this.openChannel(channelId);
            
        } catch (error) {
            console.error('Erreur rejoindre canal:', error);
            showNotification(error.response?.data?.detail || 'Erreur lors de la tentative de rejoindre le canal', 'error');
        }
    }
    
    async createChannel() {
        const name = document.getElementById('channelName').value.trim();
        const displayName = document.getElementById('channelDisplayName').value.trim();
        const description = document.getElementById('channelDescription').value.trim();
        const isPrivate = document.getElementById('channelPrivate').checked;
        
        if (!name || !displayName) {
            showNotification('Veuillez remplir tous les champs requis', 'warning');
            return;
        }
        
        try {
            const channel = await api.post('/messaging/channels', {
                name: name,
                display_name: displayName,
                description: description,
                type: isPrivate ? 'private' : 'public'
            });
            
            showNotification('Canal créé avec succès', 'success');
            closeModal('createChannelModal');
            
            // Recharger les canaux
            await this.loadChannels();
            
            // Ouvrir le nouveau canal
            this.openChannel(channel.id);
            
        } catch (error) {
            console.error('Erreur création canal:', error);
            showNotification(error.response?.data?.detail || 'Erreur lors de la création du canal', 'error');
        }
    }
    
    async showNewDMModal() {
        document.getElementById('newDMModal').classList.add('active');
        
        // Charger tous les utilisateurs au départ
        await this.loadUsers();
        
        // Afficher la liste
        this.renderUsersList(this.users);
        
        // Ajouter l'événement de recherche
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            // Supprimer les anciens événements
            const newUserSearch = userSearch.cloneNode(true);
            userSearch.parentNode.replaceChild(newUserSearch, userSearch);
            
            let searchTimeout;
            newUserSearch.addEventListener('input', async (e) => {
                const query = e.target.value.trim();
                
                // Debounce la recherche
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    if (query.length === 0) {
                        // Afficher tous les utilisateurs
                        this.renderUsersList(this.users);
                    } else if (query.length >= 2) {
                        // Rechercher sur le serveur
                        const users = await this.searchUsers(query);
                        this.renderUsersList(users);
                    }
                }, 300);
            });
        }
    }
    
    renderUsersList(users) {
        const usersList = document.getElementById('usersList');
        const currentUserId = this.getCurrentUserId();
        
        if (!usersList) return;
        
        const filteredUsers = users.filter(user => user.id !== currentUserId);
        
        if (filteredUsers.length === 0) {
            usersList.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Aucun utilisateur trouvé</p>';
            return;
        }
        
        usersList.innerHTML = filteredUsers
            .map(user => {
                const initials = user.email.substring(0, 2).toUpperCase();
                return `
                    <div class="user-item" data-user-id="${user.id}">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <div class="user-name">${user.email}</div>
                            <div class="user-role">${user.role}</div>
                        </div>
                    </div>
                `;
            }).join('');
        
        // Ajouter les événements
        usersList.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', async () => {
                const userId = item.dataset.userId;
                await this.createConversation(userId);
            });
        });
    }
    
    async createConversation(userId) {
        try {
            const conversation = await api.post('/messaging/conversations', {
                user_id: userId
            });
            
            closeModal('newDMModal');
            
            // Recharger les conversations
            await this.loadConversations();
            
            // Ouvrir la conversation
            this.openConversation(conversation.id);
            
        } catch (error) {
            console.error('Erreur création conversation:', error);
            showNotification('Erreur lors de la création de la conversation', 'error');
        }
    }
    
    async editMessage(messageId) {
        const newContent = prompt('Modifier le message:');
        if (!newContent) return;
        
        try {
            // Sauvegarder la position de scroll
            const container = document.getElementById('messagesContainer');
            const scrollPosition = container ? container.scrollTop : 0;
            
            await api.put(`/messaging/messages/${messageId}`, {
                content: newContent
            });
            
            // Mettre à jour le message localement
            const messageIndex = this.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
                this.messages[messageIndex].content = newContent;
                this.messages[messageIndex].edited_at = new Date().toISOString();
            }
            
            // Re-render sans scroller
            this.renderMessages(false);
            
            // Restaurer la position de scroll
            if (container) {
                setTimeout(() => {
                    container.scrollTop = scrollPosition;
                }, 50);
            }
            
            showNotification('Message modifié', 'success');
        } catch (error) {
            console.error('Erreur modification message:', error);
            showNotification('Erreur lors de la modification', 'error');
        }
    }
    
    async deleteMessage(messageId) {
        if (!confirm('Supprimer ce message?')) return;
        
        try {
            // Sauvegarder la position de scroll
            const container = document.getElementById('messagesContainer');
            const scrollPosition = container ? container.scrollTop : 0;
            
            await api.delete(`/messaging/messages/${messageId}`);
            
            // Supprimer le message localement
            this.messages = this.messages.filter(m => m.id !== messageId);
            
            // Re-render sans scroller
            this.renderMessages(false);
            
            // Restaurer la position de scroll
            if (container) {
                setTimeout(() => {
                    container.scrollTop = scrollPosition;
                }, 50);
            }
            
            showNotification('Message supprimé', 'success');
        } catch (error) {
            console.error('Erreur suppression message:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

// Classe pour l'autocomplete des mentions
class MentionAutocomplete {
    constructor(messagingApp) {
        this.app = messagingApp;
        this.container = null;
        this.users = [];
        this.selectedIndex = 0;
        this.atIndex = 0;
        this.isVisible = false;
    }
    
    show(users, atIndex) {
        this.users = users;
        this.atIndex = atIndex;
        this.selectedIndex = 0;
        this.isVisible = true;
        
        if (!this.container) {
            this.createContainer();
        }
        
        this.render();
        this.position();
        this.container.style.display = 'block';
    }
    
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'mention-autocomplete';
        this.container.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(this.container);
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = this.users.map((user, index) => {
            const initials = user.email.substring(0, 2).toUpperCase();
            return `
                <div class="mention-item ${index === this.selectedIndex ? 'selected' : ''}" 
                     data-index="${index}"
                     style="
                         padding: 10px 15px;
                         cursor: pointer;
                         display: flex;
                         align-items: center;
                         gap: 10px;
                         ${index === this.selectedIndex ? 'background: #e3f2fd;' : ''}
                     "
                     onmouseover="this.style.background='#e3f2fd'"
                     onmouseout="this.style.background='${index === this.selectedIndex ? '#e3f2fd' : 'white'}'"
                     onclick="window.messagingApp.insertMention(${JSON.stringify(user).replace(/"/g, '&quot;')}, ${this.atIndex})">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: #e0e0e0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 600;
                        color: #666;
                    ">${initials}</div>
                    <div>
                        <div style="font-weight: 500;">${user.email}</div>
                        <div style="font-size: 0.85rem; color: #666;">${user.role}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    position() {
        const input = document.getElementById('messageInput');
        if (!input || !this.container) return;
        
        const inputRect = input.getBoundingClientRect();
        
        // Positionner au-dessus du champ de saisie
        this.container.style.left = inputRect.left + 'px';
        this.container.style.bottom = (window.innerHeight - inputRect.top + 10) + 'px';
        this.container.style.width = Math.min(300, inputRect.width) + 'px';
    }
    
    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.users.length;
        this.render();
    }
    
    selectPrevious() {
        this.selectedIndex = (this.selectedIndex - 1 + this.users.length) % this.users.length;
        this.render();
    }
    
    selectCurrent() {
        if (this.users[this.selectedIndex]) {
            this.app.insertMention(this.users[this.selectedIndex], this.atIndex);
        }
    }
}

// Fonctions utilitaires
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showNotification(message, type = 'info') {
    // Utiliser le système de toast existant si disponible
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Variable globale pour l'instance
let messagingApp;
