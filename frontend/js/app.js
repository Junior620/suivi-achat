let currentUser = null;

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
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
        case 'notifications':
            loadNotificationsPage(content);
            break;
        case 'admin':
            loadAdminPage(content);
            break;
    }
}

document.addEventListener('DOMContentLoaded', init);
