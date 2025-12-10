let currentUser = null;

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    toast.style.cssText = `
        background: white;
        border-left: 4px solid ${colors[type]};
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
    `;
    
    toast.innerHTML = `
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${colors[type]};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            flex-shrink: 0;
        ">${icons[type]}</div>
        <div style="flex: 1; color: #333; font-size: 14px;">${message}</div>
        <button style="
            background: none;
            border: none;
            color: #999;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
        " onclick="this.parentElement.remove()">×</button>
    `;
    
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
            .toast:hover {
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                transform: translateY(-2px);
                transition: all 0.2s;
            }
        `;
        document.head.appendChild(style);
    }
    
    container.appendChild(toast);
    
    toast.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }
    });
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

async function init() {
    if (!api.getToken()) {
        window.location.href = 'index.html';
        return;
    }

    try {
        currentUser = await api.getMe();
        document.getElementById('userInfo').innerHTML = `
            <div><strong>${currentUser.email}</strong></div>
            <div style="font-size: 0.8rem; opacity: 0.8;">${currentUser.role}</div>
        `;

        if (currentUser.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Rafraîchir le cache des données pour le mode offline
        if (window.offlineManager && navigator.onLine) {
            console.log('🔄 Rafraîchissement du cache pour le mode offline...');
            window.offlineManager.refreshCache().catch(err => {
                console.error('Erreur rafraîchissement cache:', err);
            });
        }
        
        // Mettre à jour le badge de synchronisation
        if (window.offlineManager) {
            window.offlineManager.updateSyncBadge?.();
        }

        setupNavigation();
        loadPage('dashboard');
    } catch (error) {
        console.error('Init error:', error);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        // Déconnecter le stream SSE
        if (typeof disconnectNotificationStream === 'function') {
            disconnectNotificationStream();
        }
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

function loadPage(page) {
    const content = document.getElementById('pageContent');
    
    // Arrêter le polling des notifications si on quitte la page notifications
    if (page !== 'notifications' && typeof stopNotificationPolling === 'function') {
        stopNotificationPolling();
    }
    
    // Nettoyer la messagerie si on quitte la page
    if (page !== 'messaging' && window.messagingApp) {
        console.log('🧹 Nettoyage messagerie');
        if (typeof window.messagingApp.disconnect === 'function') {
            window.messagingApp.disconnect();
        }
        window.messagingApp = null;
    }
    
    switch(page) {
        case 'dashboard':
            loadDashboardPage(content);
            break;
        case 'search':
            loadSearchPage(content);
            break;
        case 'deliveries':
            loadDeliveriesPage(content);
            break;
        case 'payments':
            loadPaymentsPage(content);
            break;
        case 'planters':
            loadPlantersPage(content);
            break;
        case 'chef-planteurs':
            loadChefPlanteursPage(content);
            break;
        case 'analytics-planter':
            loadAnalyticsPlanterPage(content);
            break;
        case 'analytics-zones':
            loadAnalyticsZonesPage(content);
            break;
        case 'analytics-quality':
            loadAnalyticsQualityPage(content);
            break;
        case 'analytics-fournisseur':
            loadAnalyticsFournisseurPage(content);
            break;
        case 'collectes':
            loadCollectesPage(content);
            break;
        case 'cooperatives':
            loadCooperativesPage(content);
            break;
        case 'traceability':
            loadTraceabilityPage(content);
            break;
        case 'warehouses':
            loadWarehousesPage(content);
            break;
        case 'documents':
            loadDocumentsPage(content);
            break;
        case 'notifications':
            if (typeof loadNotificationsPage === 'function') {
                loadNotificationsPage(content);
            } else {
                content.innerHTML = '<div class="container"><h2>Notifications</h2><p>Fonctionnalité en cours de développement...</p></div>';
            }
            break;
        case 'messaging':
            loadMessagingPage(content);
            break;
        case 'admin':
            loadAdminPage(content);
            break;
    }
}

function loadMessagingPage(content) {
    content.innerHTML = renderMessagingPage();
    initMessaging();
}

document.addEventListener('DOMContentLoaded', init);
