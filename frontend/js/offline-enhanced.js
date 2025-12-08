// Améliorations du mode offline

// Indicateur visuel de statut de connexion
// Désactivé - doublon avec networkIndicator dans offline.js
/*
function createConnectionIndicator() {*/
function createConnectionIndicatorDisabled() {
    const indicator = document.createElement('div');
    indicator.id = 'connection-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    `;
    document.body.appendChild(indicator);
    updateConnectionIndicator();
}

function updateConnectionIndicator() {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    
    if (navigator.onLine) {
        indicator.innerHTML = '🟢 En ligne';
        indicator.style.backgroundColor = '#d4edda';
        indicator.style.color = '#155724';
    } else {
        indicator.innerHTML = '🔴 Hors ligne';
        indicator.style.backgroundColor = '#f8d7da';
        indicator.style.color = '#721c24';
    }
}

// Badge de synchronisation
function createSyncBadge() {
    const badge = document.createElement('div');
    badge.id = 'sync-badge';
    badge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
        display: none;
        z-index: 9999;
        transition: all 0.3s ease;
    `;
    badge.innerHTML = '⏳ 0 en attente';
    badge.onclick = () => {
        if (navigator.onLine && window.offlineManager) {
            window.offlineManager.syncOfflineData();
        } else {
            showToast('Impossible de synchroniser en mode hors ligne', 'warning');
        }
    };
    document.body.appendChild(badge);
}

async function updateSyncBadgeEnhanced() {
    const badge = document.getElementById('sync-badge');
    if (!badge) return;
    
    try {
        const pending = await window.offlineManager.getPendingSync();
        const offlineDeliveries = await window.offlineManager.getOfflineDeliveries();
        const total = pending.length + offlineDeliveries.length;
        
        if (total > 0) {
            badge.style.display = 'block';
            badge.innerHTML = `⏳ ${total} en attente`;
            badge.style.animation = 'pulse 2s infinite';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur mise à jour badge sync:', error);
    }
}

// Animation pulse pour le badge
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    #sync-badge:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0,123,255,0.4);
    }
`;
document.head.appendChild(style);

// Gestion des conflits de synchronisation
async function handleSyncConflict(localData, serverData) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
                <h3 style="margin-top: 0; color: #dc3545;">⚠️ Conflit de Synchronisation</h3>
                <p>Les données locales et serveur sont différentes. Que voulez-vous faire ?</p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="useLocal" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Utiliser Local
                    </button>
                    <button id="useServer" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Utiliser Serveur
                    </button>
                    <button id="cancel" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Annuler
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#useLocal').onclick = () => {
            document.body.removeChild(modal);
            resolve('local');
        };
        
        modal.querySelector('#useServer').onclick = () => {
            document.body.removeChild(modal);
            resolve('server');
        };
        
        modal.querySelector('#cancel').onclick = () => {
            document.body.removeChild(modal);
            resolve('cancel');
        };
    });
}

// Synchronisation améliorée avec retry
async function syncWithRetry(action, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await window.offlineManager.syncAction(action);
            return true;
        } catch (error) {
            lastError = error;
            console.warn(`Tentative ${i + 1}/${maxRetries} échouée:`, error);
            
            if (i < maxRetries - 1) {
                // Attendre avant de réessayer (backoff exponentiel)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
}

// Initialisation des améliorations
function initOfflineEnhancements() {
    // Créer les indicateurs visuels
    // createConnectionIndicator(); // Désactivé - doublon
    createSyncBadge();
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
        updateConnectionIndicator();
        showToast('✅ Connexion rétablie', 'success');
        
        // Synchroniser automatiquement
        setTimeout(() => {
            if (window.offlineManager) {
                window.offlineManager.syncOfflineData();
            }
        }, 1000);
    });
    
    window.addEventListener('offline', () => {
        updateConnectionIndicator();
        showToast('⚠️ Mode hors ligne activé', 'warning');
    });
    
    // Mettre à jour le badge périodiquement
    setInterval(updateSyncBadgeEnhanced, 5000);
    updateSyncBadgeEnhanced();
}

// Exporter les fonctions
window.offlineEnhancements = {
    updateSyncBadge: updateSyncBadgeEnhanced,
    handleSyncConflict,
    syncWithRetry
};

// Initialiser au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOfflineEnhancements);
} else {
    initOfflineEnhancements();
}
