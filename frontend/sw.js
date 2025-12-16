/**
 * Service Worker pour les notifications push
 */

self.addEventListener('install', (event) => {
    console.log('Service Worker installé');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activé');
    event.waitUntil(clients.claim());
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
