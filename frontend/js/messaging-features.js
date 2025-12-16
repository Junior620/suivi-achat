/**
 * Fonctionnalités avancées de messagerie:
 * - Réactions emoji
 * - Recherche de messages
 * - Notifications push
 */

// ============================================
// RÉACTIONS EMOJI
// ============================================

class EmojiPicker {
    constructor() {
        this.emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '✅', '❌', '⭐'];
        this.picker = null;
    }
    
    show(messageId, buttonElement) {
        // Supprimer l'ancien picker s'il existe
        this.hide();
        
        // Créer le picker
        this.picker = document.createElement('div');
        this.picker.className = 'emoji-picker';
        this.picker.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 4px;
        `;
        
        // Ajouter les emojis
        this.emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.cssText = `
                font-size: 1.5rem;
                padding: 8px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            btn.onmouseover = () => btn.style.background = '#f5f5f5';
            btn.onmouseout = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                this.addReaction(messageId, emoji);
                this.hide();
            };
            this.picker.appendChild(btn);
        });
        
        // Positionner le picker
        const rect = buttonElement.getBoundingClientRect();
        this.picker.style.top = (rect.bottom + 5) + 'px';
        this.picker.style.left = rect.left + 'px';
        
        document.body.appendChild(this.picker);
        
        // Fermer en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
    }
    
    hide() {
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }
    }
    
    handleClickOutside(e) {
        if (this.picker && !this.picker.contains(e.target)) {
            this.hide();
        }
    }
    
    async addReaction(messageId, emoji) {
        try {
            await api.post(`/messaging/messages/${messageId}/reactions`, { emoji });
            
            // Recharger les réactions du message
            await this.loadMessageReactions(messageId);
            
            // Notifier via WebSocket
            if (window.messagingApp && window.messagingApp.ws && window.messagingApp.ws.readyState === WebSocket.OPEN) {
                window.messagingApp.ws.send(JSON.stringify({
                    type: 'reaction_added',
                    data: { message_id: messageId, emoji }
                }));
            }
        } catch (error) {
            if (error.status === 204) {
                // Réaction supprimée (toggle)
                await this.loadMessageReactions(messageId);
            } else {
                console.error('Erreur ajout réaction:', error);
                showToast('Erreur lors de l\'ajout de la réaction', 'error');
            }
        }
    }
    
    async loadMessageReactions(messageId) {
        try {
            const reactions = await api.get(`/messaging/messages/${messageId}/reactions`);
            this.renderReactions(messageId, reactions);
        } catch (error) {
            console.error('Erreur chargement réactions:', error);
        }
    }
    
    renderReactions(messageId, reactions) {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) return;
        
        // Supprimer l'ancien conteneur de réactions
        const oldContainer = messageElement.querySelector('.message-reactions');
        if (oldContainer) oldContainer.remove();
        
        if (reactions.length === 0) return;
        
        // Grouper les réactions par emoji
        const grouped = {};
        reactions.forEach(r => {
            if (!grouped[r.emoji]) {
                grouped[r.emoji] = { count: 0, users: [] };
            }
            grouped[r.emoji].count++;
            grouped[r.emoji].users.push(r.user_id);
        });
        
        // Créer le conteneur
        const container = document.createElement('div');
        container.className = 'message-reactions';
        container.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        `;
        
        // Ajouter chaque réaction
        Object.entries(grouped).forEach(([emoji, data]) => {
            const currentUserId = window.messagingApp?.getCurrentUserId();
            const hasReacted = data.users.includes(currentUserId);
            
            const reactionBtn = document.createElement('button');
            reactionBtn.className = 'reaction-btn';
            reactionBtn.innerHTML = `${emoji} ${data.count}`;
            reactionBtn.style.cssText = `
                padding: 4px 8px;
                border: 1px solid ${hasReacted ? '#1976d2' : '#ddd'};
                background: ${hasReacted ? '#e3f2fd' : 'white'};
                border-radius: 12px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
            `;
            reactionBtn.onmouseover = () => {
                reactionBtn.style.transform = 'scale(1.1)';
            };
            reactionBtn.onmouseout = () => {
                reactionBtn.style.transform = 'scale(1)';
            };
            reactionBtn.onclick = () => {
                this.addReaction(messageId, emoji);
            };
            
            container.appendChild(reactionBtn);
        });
        
        // Ajouter le bouton "+"
        const addBtn = document.createElement('button');
        addBtn.innerHTML = '+';
        addBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px dashed #ddd;
            background: white;
            border-radius: 12px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
        `;
        addBtn.onmouseover = () => {
            addBtn.style.borderColor = '#1976d2';
            addBtn.style.color = '#1976d2';
        };
        addBtn.onmouseout = () => {
            addBtn.style.borderColor = '#ddd';
            addBtn.style.color = 'inherit';
        };
        addBtn.onclick = (e) => {
            e.stopPropagation();
            this.show(messageId, addBtn);
        };
        container.appendChild(addBtn);
        
        // Insérer après le contenu du message
        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            messageContent.appendChild(container);
        }
    }
}

// Instance globale
window.emojiPicker = new EmojiPicker();


// ============================================
// RECHERCHE DE MESSAGES
// ============================================

class MessageSearch {
    constructor() {
        this.searchResults = [];
        this.currentQuery = '';
    }
    
    showSearchModal() {
        const modal = document.getElementById('searchMessagesModal');
        if (!modal) {
            this.createSearchModal();
        } else {
            modal.classList.add('active');
        }
        
        // Focus sur l'input
        setTimeout(() => {
            const input = document.getElementById('messageSearchInput');
            if (input) input.focus();
        }, 100);
    }
    
    createSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'searchMessagesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-search"></i> Rechercher des messages</h3>
                    <button class="btn-icon" onclick="window.messageSearch.hideSearchModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <input 
                            type="text" 
                            id="messageSearchInput" 
                            placeholder="Rechercher dans les messages..."
                            style="width: 100%; padding: 12px; font-size: 1rem; border: 2px solid #ddd; border-radius: 8px;"
                        >
                    </div>
                    <div id="searchResults" style="max-height: 400px; overflow-y: auto; margin-top: 20px;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Événement de recherche
        const input = document.getElementById('messageSearchInput');
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.search(e.target.value);
            }, 300);
        });
    }
    
    hideSearchModal() {
        const modal = document.getElementById('searchMessagesModal');
        if (modal) modal.classList.remove('active');
    }
    
    async search(query) {
        if (!query || query.length < 2) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        this.currentQuery = query;
        
        try {
            const channelId = window.messagingApp?.currentChannel?.id;
            const conversationId = window.messagingApp?.currentConversation?.id;
            
            let url = `/messaging/messages/search?q=${encodeURIComponent(query)}`;
            if (channelId) url += `&channel_id=${channelId}`;
            if (conversationId) url += `&conversation_id=${conversationId}`;
            
            const results = await api.get(url);
            this.searchResults = results;
            this.renderResults();
        } catch (error) {
            console.error('Erreur recherche:', error);
            showToast('Erreur lors de la recherche', 'error');
        }
    }
    
    renderResults() {
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (this.searchResults.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-search fa-3x" style="margin-bottom: 16px;"></i>
                    <p>Aucun résultat pour "${this.currentQuery}"</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.searchResults.map(msg => {
            const time = new Date(msg.created_at).toLocaleString('fr-FR');
            const highlightedContent = this.highlightQuery(msg.content, this.currentQuery);
            
            return `
                <div class="search-result-item" style="
                    padding: 16px;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'"
                   onclick="window.messageSearch.goToMessage('${msg.id}', '${msg.channel_id}', '${msg.conversation_id}')">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: #1976d2;">${msg.sender_email}</span>
                        <span style="font-size: 0.85rem; color: #999;">${time}</span>
                    </div>
                    <div style="color: #333;">${highlightedContent}</div>
                </div>
            `;
        }).join('');
    }
    
    highlightQuery(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark style="background: #ffeb3b; padding: 2px 4px; border-radius: 2px;">$1</mark>');
    }
    
    goToMessage(messageId, channelId, conversationId) {
        this.hideSearchModal();
        
        // Ouvrir le canal ou la conversation
        if (channelId && channelId !== 'null') {
            window.messagingApp.openChannel(channelId).then(() => {
                // Scroller vers le message
                setTimeout(() => {
                    const messageElement = document.getElementById(`message-${messageId}`);
                    if (messageElement) {
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        messageElement.style.background = '#fff3cd';
                        setTimeout(() => {
                            messageElement.style.background = '';
                        }, 2000);
                    }
                }, 500);
            });
        } else if (conversationId && conversationId !== 'null') {
            window.messagingApp.openConversation(conversationId).then(() => {
                setTimeout(() => {
                    const messageElement = document.getElementById(`message-${messageId}`);
                    if (messageElement) {
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        messageElement.style.background = '#fff3cd';
                        setTimeout(() => {
                            messageElement.style.background = '';
                        }, 2000);
                    }
                }, 500);
            });
        }
    }
}

// Instance globale
window.messageSearch = new MessageSearch();


// ============================================
// NOTIFICATIONS PUSH
// ============================================

class PushNotifications {
    constructor() {
        this.subscription = null;
        // Clé VAPID publique - À générer avec: npx web-push generate-vapid-keys
        // Pour l'instant, désactiver les push notifications jusqu'à génération des clés
        this.publicKey = null;
    }
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications non supportées');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        
        return false;
    }
    
    async subscribe() {
        try {
            // Pour l'instant, utiliser uniquement les notifications navigateur simples
            // Les push notifications nécessitent une clé VAPID valide
            const hasPermission = await this.requestPermission();
            if (hasPermission) {
                showToast('✅ Notifications activées', 'success');
            } else {
                showToast('Permission de notification refusée', 'warning');
            }
            return;
            
            // Code push notifications désactivé temporairement
            if (!this.publicKey) {
                const hasPermission = await this.requestPermission();
                if (hasPermission) {
                    showToast('✅ Notifications navigateur activées', 'success');
                }
                return;
            }
            
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                showToast('Permission de notification refusée', 'warning');
                return;
            }
            
            if (!('serviceWorker' in navigator)) {
                console.warn('Service Worker non supporté');
                showToast('⚠️ Service Worker non supporté par ce navigateur', 'warning');
                return;
            }
            
            // Enregistrer le service worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            
            // S'abonner aux push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
            });
            
            this.subscription = subscription;
            
            // Envoyer la souscription au serveur
            const subscriptionData = {
                endpoint: subscription.endpoint,
                p256dh_key: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                auth_key: this.arrayBufferToBase64(subscription.getKey('auth')),
                user_agent: navigator.userAgent
            };
            
            await api.post('/messaging/push/subscribe', subscriptionData);
            
            showToast('✅ Notifications push activées', 'success');
        } catch (error) {
            console.error('Erreur souscription push:', error);
            showToast('Erreur: ' + error.message, 'error');
        }
    }
    
    async unsubscribe() {
        try {
            if (!this.subscription) {
                const registration = await navigator.serviceWorker.ready;
                this.subscription = await registration.pushManager.getSubscription();
            }
            
            if (this.subscription) {
                await this.subscription.unsubscribe();
                await api.delete(`/messaging/push/unsubscribe?endpoint=${encodeURIComponent(this.subscription.endpoint)}`);
                this.subscription = null;
                showToast('Notifications désactivées', 'info');
            }
        } catch (error) {
            console.error('Erreur désabonnement push:', error);
            showToast('Erreur lors de la désactivation', 'error');
        }
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

// Instance globale
window.pushNotifications = new PushNotifications();


// ============================================
// INITIALISATION
// ============================================

// Ne PAS demander automatiquement - doit être déclenché par un clic utilisateur
// L'utilisateur cliquera sur le bouton cloche pour activer
