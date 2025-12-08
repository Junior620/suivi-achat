/**
 * Système de formatage de texte pour la messagerie
 * Supporte : gras, italique, code, listes, liens
 */

// Formater le texte avec Markdown
function formatText(text) {
    if (!text) return '';
    
    // Échapper le HTML pour éviter les injections
    let formatted = escapeHtml(text);
    
    // 1. Code blocks (```)
    formatted = formatted.replace(/```([^`]+)```/g, '<pre style="background: #f5f5f5; padding: 10px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>$1</code></pre>');
    
    // 2. Code inline (`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #d63384;">$1</code>');
    
    // 3. Gras (**texte** ou __texte__)
    formatted = formatted.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // 4. Italique (*texte* ou _texte_)
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // 5. Barré (~~texte~~)
    formatted = formatted.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // 6. Liens automatiques
    formatted = autoLinkUrls(formatted);
    
    // 7. Listes à puces (- item ou * item)
    formatted = formatLists(formatted);
    
    // 8. Sauts de ligne
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Convertir les URLs en liens cliquables
function autoLinkUrls(text) {
    // Regex pour détecter les URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    
    return text.replace(urlRegex, (url) => {
        // Nettoyer l'URL (enlever les caractères de ponctuation à la fin)
        let cleanUrl = url.replace(/[.,;:!?)]$/, '');
        
        // Déterminer le texte à afficher (raccourci si trop long)
        let displayText = cleanUrl;
        if (cleanUrl.length > 50) {
            displayText = cleanUrl.substring(0, 47) + '...';
        }
        
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: underline;">${displayText}</a>`;
    });
}

// Formater les listes
function formatLists(text) {
    const lines = text.split('<br>');
    let inList = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Détecter une ligne de liste (- ou *)
        if (line.match(/^[-*]\s+(.+)/)) {
            const content = line.replace(/^[-*]\s+/, '');
            
            if (!inList) {
                result.push('<ul style="margin: 8px 0; padding-left: 20px;">');
                inList = true;
            }
            
            result.push(`<li style="margin: 4px 0;">${content}</li>`);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            
            if (line) {
                result.push(line);
            }
        }
    }
    
    // Fermer la liste si elle est encore ouverte
    if (inList) {
        result.push('</ul>');
    }
    
    return result.join('<br>');
}

// Afficher l'aide du formatage
function showFormattingHelp() {
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
        <div style="background: white; border-radius: 12px; max-width: 700px; max-height: 80vh; overflow-y: auto; padding: 30px; position: relative;">
            <button onclick="this.closest('div[style*=fixed]').remove()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
            
            <h2 style="margin: 0 0 20px 0; color: #333;">✨ Guide de formatage</h2>
            
            <div style="display: grid; gap: 20px;">
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Texte en gras</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        **texte en gras** ou __texte en gras__
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <strong>texte en gras</strong>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Texte en italique</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        *texte en italique* ou _texte en italique_
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <em>texte en italique</em>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Texte barré</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        ~~texte barré~~
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <del>texte barré</del>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Code inline</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        \`code ici\`
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">code ici</code>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Bloc de code</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        \`\`\`<br>
                        function hello() {<br>
                        &nbsp;&nbsp;console.log("Hello!");<br>
                        }<br>
                        \`\`\`
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <pre style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin: 0;"><code>function hello() {
  console.log("Hello!");
}</code></pre>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Listes à puces</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        - Premier élément<br>
                        - Deuxième élément<br>
                        - Troisième élément
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat :<br>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>Premier élément</li>
                            <li>Deuxième élément</li>
                            <li>Troisième élément</li>
                        </ul>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Liens automatiques</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        https://example.com
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <a href="https://example.com" style="color: #1976d2; text-decoration: underline;">https://example.com</a>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #1976d2; margin-bottom: 10px;">Combinaisons</h3>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-family: monospace;">
                        **Urgent:** Vérifier le \`code\` sur https://github.com
                    </div>
                    <div style="margin-top: 8px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        Résultat : <strong>Urgent:</strong> Vérifier le <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">code</code> sur <a href="https://github.com" style="color: #1976d2;">https://github.com</a>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <strong style="color: #856404;">💡 Astuce :</strong>
                <p style="margin: 5px 0 0 0; color: #856404;">
                    Vous pouvez combiner plusieurs formatages dans le même message !
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
}

// Ajouter un bouton d'aide pour le formatage
function addFormattingHelpButton() {
    setTimeout(() => {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        const container = messageInput.parentElement;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('formattingHelpBtn')) return;
        
        const helpBtn = document.createElement('button');
        helpBtn.id = 'formattingHelpBtn';
        helpBtn.innerHTML = '<i class="fas fa-font"></i>';
        helpBtn.title = 'Guide de formatage';
        helpBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 8px;
            font-size: 1rem;
            transition: color 0.2s;
        `;
        helpBtn.onmouseenter = () => helpBtn.style.color = '#1976d2';
        helpBtn.onmouseleave = () => helpBtn.style.color = '#666';
        helpBtn.onclick = (e) => {
            e.preventDefault();
            showFormattingHelp();
        };
        
        // Insérer avant le bouton d'attachement
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            container.insertBefore(helpBtn, attachBtn);
        }
    }, 1000);
}

// Initialiser le système de formatage
function initTextFormatting() {
    console.log('✨ Initialisation du formatage de texte...');
    addFormattingHelpButton();
}

// Exporter les fonctions
window.textFormatting = {
    init: initTextFormatting,
    format: formatText,
    showHelp: showFormattingHelp
};
