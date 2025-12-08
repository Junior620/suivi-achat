/**
 * Guide d'aide pour les mentions
 */

function showMentionsHelp() {
    const helpModal = document.createElement('div');
    helpModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    helpModal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; padding: 30px; position: relative;">
            <button onclick="this.closest('div[style*=fixed]').remove()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
            
            <h2 style="margin: 0 0 20px 0; color: #333;">📢 Comment utiliser les mentions</h2>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1976d2; margin-bottom: 10px;">1. Mentionner quelqu'un</h3>
                <p style="color: #666; line-height: 1.6;">
                    Tapez <strong>@</strong> suivi du nom de la personne. Une liste s'affiche automatiquement.
                </p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <code style="color: #1976d2;">@jean</code> → Sélectionnez Jean dans la liste
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1976d2; margin-bottom: 10px;">2. Navigation dans l'autocomplete</h3>
                <ul style="color: #666; line-height: 1.8;">
                    <li><strong>↓ Flèche bas</strong> : Descendre dans la liste</li>
                    <li><strong>↑ Flèche haut</strong> : Remonter dans la liste</li>
                    <li><strong>Entrée ou Tab</strong> : Sélectionner</li>
                    <li><strong>Échap</strong> : Fermer la liste</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1976d2; margin-bottom: 10px;">3. Quand vous êtes mentionné</h3>
                <p style="color: #666; line-height: 1.6;">
                    Vous recevez :
                </p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>🔔 Une notification sonore spéciale (triple bip)</li>
                    <li>📢 Un toast "X vous a mentionné"</li>
                    <li>💻 Une notification de bureau (si activées)</li>
                    <li>✨ Votre nom en surbrillance bleue dans le message</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1976d2; margin-bottom: 10px;">4. Exemples d'utilisation</h3>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p style="margin: 0 0 10px 0;"><code>@marie peux-tu vérifier la livraison ?</code></p>
                    <p style="margin: 0 0 10px 0;"><code>@paul @sophie réunion à 14h</code></p>
                    <p style="margin: 0;"><code>Merci @admin pour l'aide !</code></p>
                </div>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #1976d2;">
                <strong style="color: #1976d2;">💡 Astuce :</strong>
                <p style="margin: 5px 0 0 0; color: #666;">
                    Utilisez les mentions pour attirer l'attention de quelqu'un dans un canal actif !
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
}

// Ajouter un bouton d'aide dans l'interface
function addMentionsHelpButton() {
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        const container = messageInput.parentElement;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('mentionsHelpBtn')) return;
        
        const helpBtn = document.createElement('button');
        helpBtn.id = 'mentionsHelpBtn';
        helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
        helpBtn.title = 'Aide sur les mentions @';
        helpBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: 10px;
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 5px;
            font-size: 1.1rem;
            transition: color 0.2s;
        `;
        helpBtn.onmouseenter = () => helpBtn.style.color = '#1976d2';
        helpBtn.onmouseleave = () => helpBtn.style.color = '#999';
        helpBtn.onclick = showMentionsHelp;
        
        container.appendChild(helpBtn);
    }, 1000);
}

// Initialiser
if (window.mentions) {
    addMentionsHelpButton();
}
