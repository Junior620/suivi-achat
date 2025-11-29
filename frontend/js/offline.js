// Gestion du mode offline et PWA

let isOnline = navigator.onLine;
let deferredPrompt = null;

// Enregistrer le Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker enregistré:', registration.scope);
                
                // Vérifier les mises à jour
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('Nouvelle version disponible ! Rechargez la page.', 'info');
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('❌ Erreur Service Worker:', error);
            });
    });
}

// Gérer l'installation de la PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', installPWA);
    }
}

async function installPWA() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ PWA installée');
        showToast('Application installée avec succès !', 'success');
    }
    
    deferredPrompt = null;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'none';
}

// Créer l'indicateur de statut réseau
function createNetworkIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'networkIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    `;
    document.body.appendChild(indicator);
    updateNetworkIndicator();
}

function updateNetworkIndicator() {
    const indicator = document.getElementById('networkIndicator');
    if (!indicator) return;
    
    if (isOnline) {
        indicator.innerHTML = '🟢 En ligne';
        indicator.style.background = '#d4edda';
        indicator.style.color = '#155724';
    } else {
        indicator.innerHTML = '🔴 Hors ligne';
        indicator.style.background = '#f8d7da';
        indicator.style.color = '#721c24';
    }
}

// Écouter les changements de connexion
window.addEventListener('online', () => {
    console.log('✅ Connexion rétablie');
    isOnline = true;
    updateNetworkIndicator();
    showToast('Connexion rétablie ! Synchronisation en cours...', 'success');
    
    // Déclencher la synchronisation
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((registration) => {
            return registration.sync.register('sync-offline-data');
        }).catch((error) => {
            console.error('Erreur de synchronisation:', error);
            // Fallback : synchronisation manuelle
            syncOfflineDataManually();
        });
    } else {
        syncOfflineDataManually();
    }
});

window.addEventListener('offline', () => {
    console.log('❌ Connexion perdue');
    isOnline = false;
    updateNetworkIndicator();
    showToast('Mode hors ligne activé. Vos données seront synchronisées automatiquement.', 'warning');
});

// Synchronisation manuelle (fallback)
async function syncOfflineDataManually() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
            registration.active.postMessage({ type: 'SYNC_NOW' });
        }
    }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
    createNetworkIndicator();
    
    // Ajouter le bouton d'installation si pas déjà installé
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        const header = document.querySelector('.page-header') || document.querySelector('.sidebar-header');
        if (header) {
            const installBtn = document.createElement('button');
            installBtn.id = 'installBtn';
            installBtn.className = 'btn btn-secondary';
            installBtn.style.display = 'none';
            installBtn.innerHTML = '📱 Installer l\'app';
            installBtn.title = 'Installer CocoaTrack sur votre appareil';
            header.appendChild(installBtn);
        }
    }
});

// Fonction pour sauvegarder des données en local
async function saveToLocalDB(storeName, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CocoaTrackDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const addRequest = store.add(data);
            
            addRequest.onsuccess = () => resolve(addRequest.result);
            addRequest.onerror = () => reject(addRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Fonction pour récupérer des données locales
async function getFromLocalDB(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CocoaTrackDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const getRequest = store.getAll();
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

// Exporter les fonctions
window.offlineManager = {
    isOnline: () => isOnline,
    saveToLocalDB,
    getFromLocalDB,
    syncNow: syncOfflineDataManually
};
