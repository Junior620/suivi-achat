// Gestion des notifications
let notificationCheckInterval = null;
let eventSource = null;

async function loadNotificationsPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>📬 Notifications</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="markAllNotificationsAsRead()">
                    ✓ Tout marquer comme lu
                </button>
                <button class="btn btn-primary" onclick="refreshNotifications()">
                    🔄 Actualiser
                </button>
            </div>
        </div>

        <div class="filters-section">
            <label>
                <input type="checkbox" id="unreadOnlyFilter" onchange="refreshNotifications()">
                Afficher uniquement les non lues
            </label>
        </div>

        <div id="notificationsList" class="notifications-list">
            <div class="loading">Chargement des notifications...</div>
        </div>
    `;

    await refreshNotifications();
    startNotificationPolling();
}

async function refreshNotifications() {
    const unreadOnly = document.getElementById('unreadOnlyFilter')?.checked || false;
    
    try {
        const notifications = await api.getNotifications(unreadOnly);
        displayNotifications(notifications);
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        showToast('Erreur lors du chargement des notifications', 'error');
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune notification</div>';
        return;
    }

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? 'read' : 'unread'} ${notif.type}" 
             data-id="${notif.id}">
            <div class="notification-icon">
                ${getNotificationIcon(notif.type)}
            </div>
            <div class="notification-content">
                <div class="notification-header">
                    <strong>${notif.title}</strong>
                    <span class="notification-time">${formatNotificationTime(notif.created_at)}</span>
                </div>
                <div class="notification-message">${notif.message}</div>
                ${notif.actor_email ? `<div class="notification-actor">Par: ${notif.actor_email}</div>` : ''}
            </div>
            <div class="notification-actions">
                ${!notif.is_read ? `
                    <button class="btn-icon" onclick="markNotificationAsRead('${notif.id}')" title="Marquer comme lu">
                        ✓
                    </button>
                ` : ''}
                <button class="btn-icon" onclick="deleteNotification('${notif.id}')" title="Supprimer">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'action': '📝',
        'alert': '⚠️',
        'system': 'ℹ️'
    };
    return icons[type] || '📬';
}

function formatNotificationTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function markNotificationAsRead(notificationId) {
    try {
        await api.markNotificationAsRead(notificationId);
        await refreshNotifications();
        await updateNotificationBadge();
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

async function markAllNotificationsAsRead() {
    try {
        await api.markAllNotificationsAsRead();
        await refreshNotifications();
        await updateNotificationBadge();
        showToast('Toutes les notifications ont été marquées comme lues', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

async function deleteNotification(notificationId) {
    if (!confirm('Supprimer cette notification ?')) return;
    
    try {
        await api.deleteNotification(notificationId);
        await refreshNotifications();
        await updateNotificationBadge();
        showToast('Notification supprimée', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function updateNotificationBadge() {
    try {
        const stats = await api.getNotificationStats();
        const badge = document.getElementById('notificationBadge');
        
        if (stats.unread > 0) {
            badge.textContent = stats.unread > 99 ? '99+' : stats.unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du badge:', error);
    }
}

function startNotificationPolling() {
    // Arrêter le polling existant
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    // Vérifier les nouvelles notifications toutes les 30 secondes
    notificationCheckInterval = setInterval(async () => {
        await updateNotificationBadge();
    }, 30000);
}

function stopNotificationPolling() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
    }
}

// Connexion SSE pour les notifications en temps réel
function connectNotificationStream() {
    // Fermer la connexion existante
    if (eventSource) {
        eventSource.close();
    }
    
    const token = api.getToken();
    if (!token) return;
    
    const API_BASE = `http://${window.location.hostname}:8000/api/v1`;
    eventSource = new EventSource(`${API_BASE}/sse/notifications?token=${token}`);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'notification') {
                // Nouvelle notification reçue
                handleNewNotification(data.data);
            } else if (data.type === 'connected') {
                console.log('✅ Connecté au stream de notifications');
            }
        } catch (error) {
            console.error('Erreur lors du traitement de la notification:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('Erreur SSE:', error);
        eventSource.close();
        
        // Reconnecter après 5 secondes
        setTimeout(() => {
            console.log('Reconnexion au stream de notifications...');
            connectNotificationStream();
        }, 5000);
    };
}

function disconnectNotificationStream() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

function handleNewNotification(notification) {
    console.log('📬 Nouvelle notification:', notification);
    
    // Mettre à jour le badge
    updateNotificationBadge();
    
    // Afficher une notification toast
    const icon = getNotificationIcon(notification.type);
    showToast(`${icon} ${notification.title}: ${notification.message}`, 
              notification.type === 'alert' ? 'warning' : 'info');
    
    // Jouer un son (optionnel)
    playNotificationSound();
    
    // Si on est sur la page notifications, rafraîchir la liste
    if (window.location.hash === '#notifications') {
        refreshNotifications();
    }
}

function playNotificationSound() {
    // Son simple de notification
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Ignorer les erreurs de son
    }
}

// Initialiser le badge au chargement
document.addEventListener('DOMContentLoaded', () => {
    updateNotificationBadge();
    connectNotificationStream();
});
