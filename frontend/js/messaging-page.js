function renderMessagingPage() {
    return `
        <link rel="stylesheet" href="css/messaging.css">
        <div class="messaging-container" style="height: calc(100vh - 100px); display: flex;">
            <aside class="messaging-sidebar">
                <div class="sidebar-header">
                    <h2><i class="fas fa-comments"></i> Messagerie</h2>
                </div>
                
                <div class="sidebar-content">
                    <div class="section">
                        <div class="section-header">
                            <h3>Canaux</h3>
                            <button class="btn-icon" id="addChannelBtn" title="Créer un canal">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div id="channelsList" class="channels-list"></div>
                    </div>
                    
                    <div class="section">
                        <div class="section-header">
                            <h3>Messages directs</h3>
                            <button class="btn-icon" id="newDMBtn" title="Nouveau message">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div id="conversationsList" class="conversations-list"></div>
                    </div>
                </div>
            </aside>
            
            <main class="messaging-main">
                <div class="chat-header" id="chatHeader">
                    <div class="chat-info">
                        <h2 id="chatTitle">Sélectionnez une conversation</h2>
                        <p id="chatSubtitle"></p>
                    </div>
                </div>
                
                <div class="messages-container" id="messagesContainer">
                    <div class="empty-state">
                        <i class="fas fa-comments fa-3x"></i>
                        <p>Sélectionnez un canal ou une conversation pour commencer</p>
                    </div>
                </div>
                
                <div class="message-input-container" id="messageInputContainer" style="display: none;">
                    <div class="typing-indicator" id="typingIndicator" style="display: none;">
                        <span class="typing-dots">
                            <span></span><span></span><span></span>
                        </span>
                        <span id="typingText"></span>
                    </div>
                    
                    <div class="message-input">
                        <button class="btn-icon" id="attachBtn" title="Joindre un fichier">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        
                        <textarea id="messageInput" placeholder="Écrivez votre message..." rows="1"></textarea>
                        
                        <button class="btn-icon" id="locationBtn" title="Partager ma position">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        
                        <button class="btn-icon" id="emojiBtn" title="Émojis">
                            <i class="fas fa-smile"></i>
                        </button>
                        
                        <button class="btn-primary" id="sendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </main>
        </div>
        
        <div class="modal" id="createChannelModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Créer un canal</h3>
                    <button class="btn-icon" onclick="closeModal('createChannelModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="createChannelForm">
                        <div class="form-group">
                            <label for="channelName">Nom du canal *</label>
                            <input type="text" id="channelName" required placeholder="ex: zone-nord" pattern="[a-z0-9-]+">
                            <small>Lettres minuscules, chiffres et tirets uniquement</small>
                        </div>
                        <div class="form-group">
                            <label for="channelDisplayName">Nom d'affichage *</label>
                            <input type="text" id="channelDisplayName" required placeholder="ex: Zone Nord">
                        </div>
                        <div class="form-group">
                            <label for="channelDescription">Description</label>
                            <textarea id="channelDescription" rows="3" placeholder="Description du canal..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="channelPrivate">
                                Canal privé
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('createChannelModal')">Annuler</button>
                            <button type="submit" class="btn-primary">Créer</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <div class="modal" id="newDMModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouveau message direct</h3>
                    <button class="btn-icon" onclick="closeModal('newDMModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="userSearch">Rechercher un utilisateur</label>
                        <input type="text" id="userSearch" placeholder="Nom ou email...">
                    </div>
                    <div id="usersList" class="users-list"></div>
                </div>
            </div>
        </div>
    `;
}

function initMessaging() {
    console.log('🚀 Initialisation messagerie intégrée');
    
    // Nettoyer l'ancienne instance si elle existe
    if (window.messagingApp) {
        console.log('🧹 Nettoyage ancienne instance');
        if (typeof window.messagingApp.disconnect === 'function') {
            window.messagingApp.disconnect();
        }
    }
    
    // Créer une nouvelle instance
    setTimeout(() => {
        if (typeof MessagingApp !== 'undefined') {
            window.messagingApp = new MessagingApp();
            console.log('✅ MessagingApp initialisée');
        } else {
            console.error('❌ MessagingApp non disponible');
        }
    }, 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}
