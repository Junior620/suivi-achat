// Service Worker pour CocoaTrack PWA
const CACHE_NAME = 'cocoatrack-v1';
const OFFLINE_QUEUE = 'offline-queue';

// Fichiers à mettre en cache
const STATIC_ASSETS = [
    '/',
    '/app.html',
    '/index.html',
    '/css/styles.css',
    '/css/auth.css',
    '/js/api.js',
    '/js/app.js',
    '/js/auth.js',
    '/js/planters.js',
    '/js/chef_planteurs.js',
    '/js/deliveries.js',
    '/js/collectes.js',
    '/js/cooperatives.js',
    '/js/analytics.js',
    '/js/admin.js',
    '/js/notifications.js',
    '/js/offline.js',
    '/assets/feve-de-cacao.png',
    '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache des fichiers statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') {
        // Pour les POST/PUT/DELETE, gérer la queue offline
        if (!navigator.onLine) {
            event.respondWith(handleOfflineRequest(request));
        }
        return;
    }

    // Stratégie : Network First, puis Cache
    if (url.origin === location.origin) {
        // Fichiers statiques : Cache First
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((response) => {
                        // Mettre en cache la nouvelle réponse
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    });
                })
                .catch(() => {
                    // Page offline de secours
                    return new Response(
                        '<h1>Mode Offline</h1><p>Vous êtes hors ligne. Les données seront synchronisées dès le retour de la connexion.</p>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                })
        );
    } else {
        // Requêtes API : Network First
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'offline', message: 'Requête mise en file d\'attente' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
    }
});

// Gérer les requêtes offline (POST/PUT/DELETE)
async function handleOfflineRequest(request) {
    const requestData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.text(),
        timestamp: Date.now()
    };

    // Stocker dans IndexedDB
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
    await tx.objectStore(OFFLINE_QUEUE).add(requestData);

    return new Response(
        JSON.stringify({ 
            success: true, 
            offline: true, 
            message: 'Données enregistrées. Synchronisation automatique dès le retour de la connexion.' 
        }),
        { 
            status: 202,
            headers: { 'Content-Type': 'application/json' } 
        }
    );
}

// Ouvrir IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CocoaTrackDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_QUEUE)) {
                db.createObjectStore(OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
    console.log('[SW] Synchronisation en arrière-plan:', event.tag);
    
    if (event.tag === 'sync-offline-data') {
        event.waitUntil(syncOfflineData());
    }
});

// Synchroniser les données offline
async function syncOfflineData() {
    console.log('[SW] Début de la synchronisation...');
    
    const db = await openDB();
    const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
    const store = tx.objectStore(OFFLINE_QUEUE);
    const requests = await store.getAll();

    console.log(`[SW] ${requests.length} requêtes à synchroniser`);

    for (const req of requests) {
        try {
            const response = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body
            });

            if (response.ok) {
                // Supprimer de la queue
                const deleteTx = db.transaction(OFFLINE_QUEUE, 'readwrite');
                await deleteTx.objectStore(OFFLINE_QUEUE).delete(req.id);
                console.log('[SW] Requête synchronisée:', req.url);
            }
        } catch (error) {
            console.error('[SW] Erreur de synchronisation:', error);
        }
    }

    console.log('[SW] Synchronisation terminée');
}

// Écouter les messages du client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_NOW') {
        syncOfflineData();
    }
});
