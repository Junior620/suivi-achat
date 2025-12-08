// Gestion des Push Notifications

// Clé publique VAPID
const VAPID_PUBLIC_KEY = 'BLNNvMNAVGsc5hcVAJ3U1Prv3xTrFZMt8mXEL2JWoxNIEWmKlvOdwo9DXXkhANw7z2pXnR5xAJrp1x7qErH7jZk';

class PushNotificationManager {
    constructor() {
        this.registration = null;
        this.subscription = null;
    }

    // Initialiser les push notifications
    async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker non supporté');
            return false;
        }

        if (!('PushManager' in window)) {
            console.warn('Push API non supportée');
            return false;
        }

        try {
            // Attendre que le service worker soit prêt
            this.registration = await navigator.serviceWorker.ready;
            console.log('✅ Service Worker prêt pour les push notifications');
            
            // Vérifier si déjà souscrit
            this.subscription = await this.registration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('✅ Déjà souscrit aux push notifications');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Erreur initialisation push:', error);
            return false;
        }
    }

    // Demander la permission et s'abonner
    async subscribe() {
        try {
            // Demander la permission
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                showToast('Permission de notification refusée', 'warning');
                return false;
            }

            // Convertir la clé VAPID en Uint8Array
            const vapidPublicKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            // S'abonner aux push notifications
            this.subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey
            });

            console.log('✅ Souscription push créée:', this.subscription);

            // Envoyer la souscription au serveur
            await this.sendSubscriptionToServer(this.subscription);

            showToast('✅ Notifications activées', 'success');
            return true;

        } catch (error) {
            console.error('Erreur souscription push:', error);
            showToast('Erreur lors de l\'activation des notifications', 'error');
            return false;
        }
    }

    // Se désabonner
    async unsubscribe() {
        try {
            if (!this.subscription) {
                return true;
            }

            // Désabonner du push manager
            await this.subscription.unsubscribe();

            // Informer le serveur
            await this.removeSubscriptionFromServer(this.subscription.endpoint);

            this.subscription = null;
            showToast('✅ Notifications désactivées', 'success');
            return true;

        } catch (error) {
            console.error('Erreur désinscription push:', error);
            showToast('Erreur lors de la désactivation', 'error');
            return false;
        }
    }

    // Envoyer la souscription au serveur
    async sendSubscriptionToServer(subscription) {
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                auth: this.arrayBufferToBase64(subscription.getKey('auth'))
            },
            user_agent: navigator.userAgent
        };

        const response = await api.request('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscriptionData)
        });

        return response;
    }

    // Supprimer la souscription du serveur
    async removeSubscriptionFromServer(endpoint) {
        await api.request(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
            method: 'DELETE'
        });
    }

    // Vérifier le statut de la permission
    getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }

    // Afficher une notification de test
    async showTestNotification() {
        if (Notification.permission !== 'granted') {
            await this.subscribe();
        }

        if (this.registration) {
            await this.registration.showNotification('CocoaTrack', {
                body: 'Les notifications sont activées! 🎉',
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                vibrate: [200, 100, 200],
                tag: 'test-notification',
                requireInteraction: false
            });
        }
    }

    // Utilitaires
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

// Créer une instance globale
window.pushManager = new PushNotificationManager();

// Initialiser au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pushManager.init();
    });
} else {
    window.pushManager.init();
}

// Activer automatiquement les notifications au premier chargement
async function autoEnableNotifications() {
    await window.pushManager.init();
    
    // Si pas encore souscrit, demander automatiquement
    if (!window.pushManager.subscription && Notification.permission === 'default') {
        console.log('🔔 Activation automatique des notifications...');
        await window.pushManager.subscribe();
    }
}

// Activer au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoEnableNotifications);
} else {
    autoEnableNotifications();
}
