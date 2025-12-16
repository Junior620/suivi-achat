// Gestion du mode offline et PWA

let isOnline = navigator.onLine;
// Utiliser window.pwaInstallPrompt au lieu de deferredPrompt pour éviter les conflits
const DB_NAME = 'CocoaTrackDB';
const DB_VERSION = 2;

// Stores IndexedDB
const STORES = {
    PLANTERS: 'planters',
    CHEF_PLANTERS: 'chef_planters',
    COOPERATIVES: 'cooperatives',
    OFFLINE_DELIVERIES: 'offline_deliveries',
    PENDING_SYNC: 'pending_sync'
};

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
    window.pwaInstallPrompt = e;
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
    
    // Rafraîchir le cache
    if (window.offlineManager) {
        window.offlineManager.refreshCache();
    }
    
    // Déclencher la synchronisation après un court délai
    setTimeout(() => {
        showToast('Connexion rétablie ! Synchronisation en cours...', 'success');
        
        if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
            navigator.serviceWorker.ready.then((registration) => {
                return registration.sync.register('sync-offline-data');
            }).catch((error) => {
                console.error('Erreur de synchronisation:', error);
                syncOfflineDataManually();
            });
        } else {
            syncOfflineDataManually();
        }
    }, 1000);
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

// ==================== IndexedDB Manager ====================

// Initialiser la base de données
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store pour les planteurs
            if (!db.objectStoreNames.contains(STORES.PLANTERS)) {
                const plantersStore = db.createObjectStore(STORES.PLANTERS, { keyPath: 'id' });
                plantersStore.createIndex('nom', 'nom', { unique: false });
                plantersStore.createIndex('code', 'code', { unique: false });
            }
            
            // Store pour les chefs planteurs
            if (!db.objectStoreNames.contains(STORES.CHEF_PLANTERS)) {
                const chefStore = db.createObjectStore(STORES.CHEF_PLANTERS, { keyPath: 'id' });
                chefStore.createIndex('nom', 'nom', { unique: false });
            }
            
            // Store pour les coopératives
            if (!db.objectStoreNames.contains(STORES.COOPERATIVES)) {
                const coopStore = db.createObjectStore(STORES.COOPERATIVES, { keyPath: 'id' });
                coopStore.createIndex('nom', 'nom', { unique: false });
            }
            
            // Store pour les livraisons offline
            if (!db.objectStoreNames.contains(STORES.OFFLINE_DELIVERIES)) {
                const deliveriesStore = db.createObjectStore(STORES.OFFLINE_DELIVERIES, { 
                    keyPath: 'localId', 
                    autoIncrement: true 
                });
                deliveriesStore.createIndex('timestamp', 'timestamp', { unique: false });
                deliveriesStore.createIndex('synced', 'synced', { unique: false });
            }
            
            // Store pour les actions en attente de sync
            if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
                const syncStore = db.createObjectStore(STORES.PENDING_SYNC, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                syncStore.createIndex('type', 'type', { unique: false });
            }
        };
    });
}

// Sauvegarder des données
async function saveToLocalDB(storeName, data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        tx.oncomplete = () => db.close();
    });
}

// Sauvegarder plusieurs données
async function saveManyToLocalDB(storeName, dataArray) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        dataArray.forEach(data => store.put(data));
        
        tx.oncomplete = () => {
            db.close();
            resolve(dataArray.length);
        };
        tx.onerror = () => reject(tx.error);
    });
}

// Récupérer toutes les données
async function getFromLocalDB(storeName) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        tx.oncomplete = () => db.close();
    });
}

// Récupérer une donnée par ID
async function getByIdFromLocalDB(storeName, id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        tx.oncomplete = () => db.close();
    });
}

// Supprimer une donnée
async function deleteFromLocalDB(storeName, id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        tx.oncomplete = () => db.close();
    });
}

// Vider un store
async function clearLocalDB(storeName) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        tx.oncomplete = () => db.close();
    });
}

// ==================== Gestion des données offline ====================

// Sauvegarder les planteurs en cache
async function cachePlanters(planters) {
    try {
        await saveManyToLocalDB(STORES.PLANTERS, planters);
        console.log(`✅ ${planters.length} planteurs sauvegardés en cache`);
        localStorage.setItem('planters_cache_time', Date.now());
    } catch (error) {
        console.error('Erreur sauvegarde planteurs:', error);
    }
}

// Sauvegarder les chefs planteurs en cache
async function cacheChefPlanters(chefPlanters) {
    try {
        await saveManyToLocalDB(STORES.CHEF_PLANTERS, chefPlanters);
        console.log(`✅ ${chefPlanters.length} fournisseurs sauvegardés en cache`);
        localStorage.setItem('chef_planters_cache_time', Date.now());
    } catch (error) {
        console.error('Erreur sauvegarde fournisseurs:', error);
    }
}

// Sauvegarder les coopératives en cache
async function cacheCooperatives(cooperatives) {
    try {
        await saveManyToLocalDB(STORES.COOPERATIVES, cooperatives);
        console.log(`✅ ${cooperatives.length} coopératives sauvegardées en cache`);
        localStorage.setItem('cooperatives_cache_time', Date.now());
    } catch (error) {
        console.error('Erreur sauvegarde coopératives:', error);
    }
}

// Créer une livraison offline
async function createOfflineDelivery(deliveryData) {
    try {
        const offlineDelivery = {
            ...deliveryData,
            timestamp: Date.now(),
            synced: false,
            localId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        await saveToLocalDB(STORES.OFFLINE_DELIVERIES, offlineDelivery);
        
        // Ajouter à la file de synchronisation
        await addToPendingSync({
            type: 'CREATE_DELIVERY',
            data: offlineDelivery,
            timestamp: Date.now()
        });
        
        console.log('✅ Livraison sauvegardée en mode offline:', offlineDelivery.localId);
        return offlineDelivery;
    } catch (error) {
        console.error('Erreur création livraison offline:', error);
        throw error;
    }
}

// Ajouter une action à la file de synchronisation
async function addToPendingSync(action) {
    try {
        await saveToLocalDB(STORES.PENDING_SYNC, action);
        updateSyncBadge();
    } catch (error) {
        console.error('Erreur ajout à la file de sync:', error);
    }
}

// Obtenir les actions en attente de sync
async function getPendingSync() {
    try {
        return await getFromLocalDB(STORES.PENDING_SYNC);
    } catch (error) {
        console.error('Erreur récupération actions en attente:', error);
        return [];
    }
}

// Obtenir les livraisons offline
async function getOfflineDeliveries() {
    try {
        return await getFromLocalDB(STORES.OFFLINE_DELIVERIES);
    } catch (error) {
        console.error('Erreur récupération livraisons offline:', error);
        return [];
    }
}

// Mettre à jour le badge de synchronisation
async function updateSyncBadge() {
    const pending = await getPendingSync();
    const badge = document.getElementById('syncBadge');
    if (badge) {
        if (pending.length > 0) {
            badge.textContent = pending.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ==================== Synchronisation ====================

// Synchronisation manuelle (fallback)
async function syncOfflineDataManually() {
    if (!isOnline) {
        showToast('Impossible de synchroniser : pas de connexion', 'warning');
        return;
    }
    
    console.log('🔄 Début de la synchronisation...');
    showToast('Synchronisation en cours...', 'info');
    
    try {
        const pendingActions = await getPendingSync();
        
        if (pendingActions.length === 0) {
            showToast('Aucune donnée à synchroniser', 'info');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const action of pendingActions) {
            try {
                await syncAction(action);
                await deleteFromLocalDB(STORES.PENDING_SYNC, action.id);
                successCount++;
            } catch (error) {
                console.error('Erreur sync action:', error);
                errorCount++;
            }
        }
        
        updateSyncBadge();
        
        if (errorCount === 0) {
            showToast(`✅ ${successCount} action(s) synchronisée(s)`, 'success');
        } else {
            showToast(`⚠️ ${successCount} réussie(s), ${errorCount} échouée(s)`, 'warning');
        }
        
        // Recharger les données
        if (typeof loadPage === 'function') {
            const currentPage = document.querySelector('.nav-item.active')?.dataset.page;
            if (currentPage) {
                loadPage(currentPage);
            }
        }
        
    } catch (error) {
        console.error('Erreur synchronisation:', error);
        showToast('Erreur lors de la synchronisation', 'error');
    }
}

// Synchroniser une action spécifique
async function syncAction(action) {
    switch (action.type) {
        case 'CREATE_DELIVERY':
            return await syncCreateDelivery(action.data);
        default:
            console.warn('Type d\'action inconnu:', action.type);
    }
}

// Synchroniser une création de livraison
async function syncCreateDelivery(deliveryData) {
    const { localId, timestamp, synced, ...cleanData } = deliveryData;
    
    const response = await fetch(`${API_URL}/deliveries`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cleanData)
    });
    
    if (!response.ok) {
        throw new Error('Erreur lors de la synchronisation de la livraison');
    }
    
    const result = await response.json();
    
    // Marquer comme synchronisée
    await deleteFromLocalDB(STORES.OFFLINE_DELIVERIES, localId);
    
    console.log('✅ Livraison synchronisée:', result);
    return result;
}

// ==================== Rafraîchissement du cache ====================

// Rafraîchir le cache des données
async function refreshCache() {
    if (!isOnline) {
        console.log('Mode offline : utilisation du cache existant');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Rafraîchir les planteurs
        try {
            const plantersResponse = await fetch(`${API_URL}/planters`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (plantersResponse.ok) {
                const planters = await plantersResponse.json();
                await cachePlanters(planters);
            }
        } catch (error) {
            console.error('Erreur rafraîchissement planteurs:', error);
        }
        
        // Rafraîchir les chefs planteurs
        try {
            const chefResponse = await fetch(`${API_URL}/chef-planteurs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (chefResponse.ok) {
                const chefPlanters = await chefResponse.json();
                await cacheChefPlanters(chefPlanters);
            }
        } catch (error) {
            console.error('Erreur rafraîchissement fournisseurs:', error);
        }
        
        // Rafraîchir les coopératives
        try {
            const coopResponse = await fetch(`${API_URL}/cooperatives`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (coopResponse.ok) {
                const cooperatives = await coopResponse.json();
                await cacheCooperatives(cooperatives);
            }
        } catch (error) {
            console.error('Erreur rafraîchissement coopératives:', error);
        }
        
        console.log('✅ Cache rafraîchi');
    } catch (error) {
        console.error('Erreur rafraîchissement cache:', error);
    }
}

// Vérifier si le cache est périmé (plus de 24h)
function isCacheStale(cacheKey) {
    const cacheTime = localStorage.getItem(cacheKey);
    if (!cacheTime) return true;
    
    const age = Date.now() - parseInt(cacheTime);
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures
    
    return age > maxAge;
}

// Exporter les fonctions
window.offlineManager = {
    isOnline: () => isOnline,
    saveToLocalDB,
    getFromLocalDB,
    getByIdFromLocalDB,
    deleteFromLocalDB,
    clearLocalDB,
    syncNow: syncOfflineDataManually,
    
    // Cache
    cachePlanters,
    cacheChefPlanters,
    cacheCooperatives,
    refreshCache,
    isCacheStale,
    
    // Offline operations
    createOfflineDelivery,
    getOfflineDeliveries,
    getPendingSync,
    updateSyncBadge,
    
    // Stores
    STORES
};
