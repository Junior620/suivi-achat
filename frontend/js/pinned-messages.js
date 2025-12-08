/**
 * Système de messages épinglés
 */

let pinnedMessages = [];
let showingPinnedPanel = false;

// Épingler un message
async function pinMessage(messageId) {
    // Vérifier qu'on est dans un canal
    if (!currentChannelId) {
        showToast('⚠️ Les messages ne peuvent être épinglés que dans les canaux', 'warning');
        return;
    }
    
    try {
        await api.post(`/messaging/messages/${messageId}/pin`);
        showToast('📌 Message épinglé', 'success');
        
        // Recharger les messages épinglés
        await loadPinnedMessages();
        
        // Recharger les messages pour mettre à jour l'icône
        const channelName = document.getElementById('chatTitle').textContent;
        await openChannel(currentChannelId, channelName, true);
        
    } catch (error) {
        console.error('❌ Erreur épinglage:', error);
        
        let errorMsg = 'Erreur lors de l\'épinglage';
        if (error.message && error.message.includes('canaux')) {
            errorMsg = '⚠️ Seuls les messages de canaux peuvent être épinglés';
        }
        
        showToast(errorMsg, 'error');
    }
}

// Désépingler un message
async function unpinMessage(messageId) {
    try {
        await api.delete(`/messaging/messages/${messageId}/pin`);
        showToast('📌 Message désépinglé', 'info');
        
        // Recharger les messages épinglés
        await loadPinnedMessages();
        
        // Recharger les messages pour mettre à jour l'icône
        if (currentChannelId) {
            const channelName = document.getElementById('chatTitle').textContent;
            await openChannel(currentChannelId, channelName, true);
        } else if (currentConversationId) {
            const userName = document.getElementById('chatTitle').textContent;
            await openConversation(currentConversationId, userName, true);
        }
        
    } catch (error) {
        console.error('❌ Erreur désépinglage:', error);
        showToast('Erreur lors du désépinglage', 'error');
    }
}

// Charger les messages épinglés
async function loadPinnedMessages() {
    try {
        // Les messages épinglés ne sont disponibles que pour les canaux
        if (currentChannelId) {
            pinnedMessages = await api.get(`/messaging/channels/${currentChannelId}/pinned`);
            console.log('📌 Messages épinglés:', pinnedMessages.length);
        } else {
            pinnedMessages = [];
        }
        
        updatePinnedBadge();
        
    } catch (error) {
        console.error('❌ Erreur chargement messages épinglés:', error);
        pinnedMessages = [];
    }
}

// Mettre à jour le badge de messages épinglés
function updatePinnedBadge() {
    const badge = document.getElementById('pinnedBadge');
    if (!badge) return;
    
    if (pinnedMessages.length > 0) {
        badge.textContent = pinnedMessages.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Afficher le panneau des messages épinglés
function showPinnedPanel() {
    if (pinnedMessages.length === 0) {
        showToast('Aucun message épinglé', 'info');
        return;
    }
    
    // Créer ou afficher le panneau
    let panel = document.getElementById('pinnedPanel');
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'pinnedPanel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -4px 0 12px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(panel);
    }
    
    // Remplir le panneau
    panel.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; background: #1976d2; color: white;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-thumbtack"></i>
                Messages épinglés (${pinnedMessages.length})
            </h3>
            <button onclick="closePinnedPanel()" style="background: transparent; border: none; color: white; cursor: pointer; padding: 5px; font-size: 1.2rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div style="flex: 1; overflow-y: auto; padding: 15px;">
            ${pinnedMessages.map(msg => renderPinnedMessage(msg)).join('')}
        </div>
    `;
    
    panel.style.display = 'flex';
    showingPinnedPanel = true;
}

// Fermer le panneau des messages épinglés
window.closePinnedPanel = function() {
    const panel = document.getElementById('pinnedPanel');
    if (panel) {
        panel.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
    showingPinnedPanel = false;
}

// Rendre un message épinglé
function renderPinnedMessage(msg) {
    const sender = msg.sender || {};
    const initials = sender.email ? sender.email.substring(0, 2).toUpperCase() : '??';
    const date = new Date(msg.created_at).toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Formater le contenu avec formatage + mentions
    let formattedContent = msg.content;
    
    // Appliquer le formatage de texte
    if (window.textFormatting) {
        formattedContent = window.textFormatting.format(formattedContent);
    }
    
    // Les mentions sont déjà dans le HTML formaté
    
    return `
        <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #1976d2; position: relative;">
            <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; color: #666; font-weight: 600; flex-shrink: 0;">
                    ${initials}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                        <div>
                            <div style="font-weight: 600; color: #333;">${sender.email || 'Inconnu'}</div>
                            <div style="font-size: 0.8rem; color: #999;">${date}</div>
                        </div>
                        <button onclick="unpinMessage('${msg.id}')" 
                                style="background: transparent; border: none; color: #f44336; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;"
                                onmouseenter="this.style.background='#ffebee'"
                                onmouseleave="this.style.background='transparent'"
                                title="Désépingler">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="color: #333; line-height: 1.5; word-wrap: break-word;">
                        ${formattedContent}
                    </div>
                </div>
            </div>
            <button onclick="jumpToPinnedMessage('${msg.id}')" 
                    style="width: 100%; padding: 8px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 10px; transition: background 0.2s;"
                    onmouseenter="this.style.background='#1565c0'"
                    onmouseleave="this.style.background='#1976d2'">
                <i class="fas fa-arrow-right"></i> Aller au message
            </button>
        </div>
    `;
}

// Aller à un message épinglé
window.jumpToPinnedMessage = function(messageId) {
    closePinnedPanel();
    
    // Attendre un peu puis scroller vers le message
    setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Mettre en évidence
            messageElement.style.background = '#fff3cd';
            setTimeout(() => {
                messageElement.style.transition = 'background 1s';
                messageElement.style.background = 'transparent';
            }, 2000);
        }
    }, 300);
}

// Vérifier si un message est épinglé
function isMessagePinned(messageId) {
    return pinnedMessages.some(msg => msg.id === messageId);
}

// Ajouter le bouton d'épinglage dans l'en-tête
function addPinnedButton() {
    setTimeout(() => {
        const header = document.getElementById('chatHeader');
        if (!header || document.getElementById('pinnedButton')) return;
        
        const button = document.createElement('button');
        button.id = 'pinnedButton';
        button.innerHTML = `
            <i class="fas fa-thumbtack"></i>
            <span id="pinnedBadge" style="display: none; background: #f44336; color: white; border-radius: 10px; padding: 2px 6px; font-size: 0.75rem; margin-left: 5px;"></span>
        `;
        button.title = 'Messages épinglés';
        button.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            color: #666;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        button.onmouseenter = () => {
            button.style.background = '#f5f5f5';
            button.style.borderColor = '#1976d2';
            button.style.color = '#1976d2';
        };
        button.onmouseleave = () => {
            button.style.background = 'white';
            button.style.borderColor = '#e0e0e0';
            button.style.color = '#666';
        };
        button.onclick = showPinnedPanel;
        
        header.appendChild(button);
    }, 500);
}

// Ajouter les styles CSS pour les animations
function addPinnedStyles() {
    if (document.getElementById('pinnedStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'pinnedStyles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
            }
            to {
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
            }
            to {
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialiser le système de messages épinglés
function initPinnedMessages() {
    console.log('📌 Initialisation des messages épinglés...');
    addPinnedStyles();
    addPinnedButton();
}

// Exporter les fonctions
window.pinnedMessages = {
    init: initPinnedMessages,
    pin: pinMessage,
    unpin: unpinMessage,
    load: loadPinnedMessages,
    show: showPinnedPanel,
    isPinned: isMessagePinned
};
