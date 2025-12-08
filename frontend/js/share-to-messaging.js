/**
 * Système de partage vers la messagerie
 */

class ShareToMessaging {
    constructor() {
        this.shareData = null;
    }
    
    // Partager une livraison
    shareDelivery(delivery) {
        const message = `📦 **Livraison #${delivery.id}**\n` +
                       `👨‍🌾 Planteur: ${delivery.planter_name || 'N/A'}\n` +
                       `⚖️ Poids: ${delivery.weight_kg}kg\n` +
                       `⭐ Qualité: ${delivery.quality || 'N/A'}\n` +
                       `📅 Date: ${new Date(delivery.delivery_date).toLocaleDateString('fr-FR')}\n` +
                       `🔗 [Voir la livraison](#delivery:${delivery.id})`;
        
        this.openMessagingWithContent(message, {
            type: 'delivery',
            id: delivery.id,
            data: delivery
        });
    }
    
    // Partager un planteur
    sharePlanter(planter) {
        const message = `👨‍🌾 **Planteur: ${planter.name}**\n` +
                       `📱 Tél: ${planter.phone || 'N/A'}\n` +
                       `📍 Zone: ${planter.zone || 'N/A'}\n` +
                       `🔗 [Voir la fiche](#planter:${planter.id})`;
        
        this.openMessagingWithContent(message, {
            type: 'planter',
            id: planter.id,
            data: planter
        });
    }
    
    // Partager un paiement
    sharePayment(payment) {
        const message = `💰 **Paiement #${payment.id}**\n` +
                       `👨‍🌾 Planteur: ${payment.planter_name || 'N/A'}\n` +
                       `💵 Montant: ${payment.amount} FCFA\n` +
                       `📅 Date: ${new Date(payment.payment_date).toLocaleDateString('fr-FR')}\n` +
                       `🔗 [Voir le paiement](#payment:${payment.id})`;
        
        this.openMessagingWithContent(message, {
            type: 'payment',
            id: payment.id,
            data: payment
        });
    }
    
    // Ouvrir la messagerie avec contenu pré-rempli
    openMessagingWithContent(message, entityRef) {
        // Sauvegarder les données
        this.shareData = {
            message,
            entityRef,
            timestamp: Date.now()
        };
        
        // Ouvrir la page messagerie
        if (typeof loadPage === 'function') {
            loadPage('messaging');
            
            // Attendre que la messagerie soit chargée
            setTimeout(() => {
                this.fillMessageInput();
            }, 500);
        } else {
            showToast('Impossible d\'ouvrir la messagerie', 'error');
        }
    }
    
    // Remplir le champ de message
    fillMessageInput() {
        if (!this.shareData) return;
        
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = this.shareData.message;
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
            input.focus();
            
            showToast('📤 Contenu prêt à partager', 'success');
        }
        
        // Nettoyer après 30 secondes
        setTimeout(() => {
            this.shareData = null;
        }, 30000);
    }
    
    // Gérer les clics sur les liens d'entités
    handleEntityLink(entityType, entityId) {
        switch(entityType) {
            case 'delivery':
                loadPage('deliveries');
                // TODO: Ouvrir le détail de la livraison
                showToast('📦 Ouverture de la livraison...', 'info');
                break;
            case 'planter':
                loadPage('planters');
                showToast('👨‍🌾 Ouverture de la fiche planteur...', 'info');
                break;
            case 'payment':
                loadPage('payments');
                showToast('💰 Ouverture du paiement...', 'info');
                break;
        }
    }
}

// Instance globale
window.shareToMessaging = new ShareToMessaging();

// Intercepter les clics sur les liens d'entités
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#delivery:"], a[href^="#planter:"], a[href^="#payment:"]');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        const match = href.match(/#(\w+):(.+)/);
        if (match) {
            window.shareToMessaging.handleEntityLink(match[1], match[2]);
        }
    }
});
