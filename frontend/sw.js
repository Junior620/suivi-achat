/**
 * Service Worker pour PWA et notifications push
 */

const CACHE_NAME = 'cocoatrack-v1';
const urlsToCache = [
    '/app.html',
    '/index.html',
    '/css/style.css',
    '/css/mobile.css',
    '/js/app.js',
    '/js/api.js',
    '/js/config.js',
    '/js/mobile.js',
    '/assets/feve-de-cacao.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installé');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activé');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Ne pas cacher les requêtes API
    if (event.request.url.includes('/api/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('push', (event) => {
    console.log('Push notification reçue');
    
    let data = {
        title: 'Nouveau message',
        body: 'Vous avez reçu un nouveau message',
        icon: '/assets/feve-de-cacao.png',
        badge: '/assets/feve-de-cacao.png',
        tag: 'message-notification',
        requireInteraction: false
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            requireInteraction: data.requireInteraction,
            data: data.data || {}
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification cliquée');
    event.notification.close();
    
    // Ouvrir ou focus sur l'application
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si une fenêtre est déjà ouverte, la focus
            for (let client of clientList) {
                if (client.url.includes('/app.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Sinon, ouvrir une nouvelle fenêtre
            if (clients.openWindow) {
                return clients.openWindow('/app.html#messaging');
            }
        })
    );
});
