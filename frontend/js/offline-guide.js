// Guide du mode offline

function showOfflineGuide() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>📱 Mode Offline - Guide d'utilisation</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--primary); margin-bottom: 10px;">✅ Fonctionnalités disponibles</h4>
                    <ul style="line-height: 1.8;">
                        <li>📋 Consulter les planteurs, fournisseurs et coopératives en cache</li>
                        <li>📦 Créer de nouvelles livraisons (synchronisation automatique)</li>
                        <li>👁️ Voir les livraisons en attente de synchronisation</li>
                    </ul>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--secondary); margin-bottom: 10px;">🔄 Synchronisation</h4>
                    <p style="line-height: 1.6;">
                        Les données créées en mode offline sont automatiquement synchronisées 
                        dès que la connexion est rétablie. Vous pouvez aussi forcer la 
                        synchronisation en cliquant sur le bouton 🔄 dans le header.
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--info); margin-bottom: 10px;">💡 Indicateurs</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>🟢 En ligne</strong> - Connexion active
                        </div>
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>🔴 Hors ligne</strong> - Mode offline activé
                        </div>
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>⏳ Offline</strong> - Livraison en attente de synchronisation
                        </div>
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>🔄 Badge orange</strong> - Nombre d'actions à synchroniser
                        </div>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid var(--warning);">
                    <strong>⚠️ Important :</strong> Connectez-vous en ligne au moins une fois 
                    pour initialiser le cache. Le cache est rafraîchi automatiquement toutes les 24h.
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// NE PLUS afficher automatiquement - uniquement via bouton
// L'utilisateur peut afficher le guide en cliquant sur le bouton dans le header

// Exporter la fonction pour l'utiliser via le bouton
window.showOfflineGuide = showOfflineGuide;
