/**
 * Système de mentions @utilisateur avec autocomplete
 */

// Variables globales pour les mentions
let mentionsList = [];
let currentMentionSearch = '';
let selectedMentionIndex = 0;
let mentionStartPos = -1;

// Initialiser le système de mentions
function initMentions() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    // Écouter les touches pour détecter @
    messageInput.addEventListener('input', handleMentionInput);
    messageInput.addEventListener('keydown', handleMentionKeydown);
    
    // Fermer l'autocomplete si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#messageInput') && !e.target.closest('#mentionAutocomplete')) {
            closeMentionAutocomplete();
        }
    });
}

// Gérer l'input pour les mentions
async function handleMentionInput(e) {
    const input = e.target;
    const text = input.value;
    const cursorPos = input.selectionStart;
    
    // Chercher le dernier @ avant le curseur
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        // Vérifier qu'il n'y a pas d'espace entre @ et le curseur
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        
        if (!textAfterAt.includes(' ')) {
            // On est en train de taper une mention
            mentionStartPos = lastAtIndex;
            currentMentionSearch = textAfterAt.toLowerCase();
            
            // Charger les utilisateurs si nécessaire
            if (mentionsList.length === 0) {
                await loadUsersForMentions();
            }
            
            // Filtrer et afficher l'autocomplete
            showMentionAutocomplete(currentMentionSearch);
            return;
        }
    }
    
    // Fermer l'autocomplete si on n'est plus dans une mention
    closeMentionAutocomplete();
}

// Gérer les touches clavier pour l'autocomplete
function handleMentionKeydown(e) {
    const autocomplete = document.getElementById('mentionAutocomplete');
    if (!autocomplete || autocomplete.style.display === 'none') return;
    
    const items = autocomplete.querySelectorAll('.mention-item');
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedMentionIndex = Math.min(selectedMentionIndex + 1, items.length - 1);
            updateMentionSelection(items);
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            selectedMentionIndex = Math.max(selectedMentionIndex - 1, 0);
            updateMentionSelection(items);
            break;
            
        case 'Enter':
        case 'Tab':
            if (items.length > 0) {
                e.preventDefault();
                selectMention(items[selectedMentionIndex].dataset.userId);
            }
            break;
            
        case 'Escape':
            e.preventDefault();
            closeMentionAutocomplete();
            break;
    }
}

// Charger les utilisateurs pour les mentions
async function loadUsersForMentions() {
    try {
        const users = await api.get('/users');
        const currentUserId = getCurrentUserId();
        
        mentionsList = users
            .filter(u => u.id !== currentUserId)
            .map(u => ({
                id: u.id,
                email: u.email,
                name: u.email.split('@')[0],
                role: u.role
            }));
        
        console.log('👥 Utilisateurs chargés pour mentions:', mentionsList.length);
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
    }
}

// Afficher l'autocomplete des mentions
function showMentionAutocomplete(search) {
    // Filtrer les utilisateurs
    const filtered = mentionsList.filter(u => 
        u.name.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
    ).slice(0, 5); // Max 5 résultats
    
    if (filtered.length === 0) {
        closeMentionAutocomplete();
        return;
    }
    
    // Créer ou mettre à jour l'autocomplete
    let autocomplete = document.getElementById('mentionAutocomplete');
    
    if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'mentionAutocomplete';
        autocomplete.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            margin-bottom: 10px;
        `;
        
        const inputContainer = document.getElementById('messageInput').parentElement;
        inputContainer.style.position = 'relative';
        inputContainer.appendChild(autocomplete);
    }
    
    // Remplir avec les résultats
    autocomplete.innerHTML = filtered.map((user, index) => {
        const initials = user.email.substring(0, 2).toUpperCase();
        return `
            <div class="mention-item" 
                 data-user-id="${user.id}"
                 data-user-name="${user.name}"
                 style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.2s; ${index === selectedMentionIndex ? 'background: #e3f2fd;' : ''}"
                 onmouseenter="this.style.background='#f5f5f5'"
                 onmouseleave="this.style.background='${index === selectedMentionIndex ? '#e3f2fd' : 'transparent'}'"
                 onclick="selectMention('${user.id}')">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; color: #666; font-weight: 600; font-size: 0.9rem;">
                    ${initials}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #333;">@${user.name}</div>
                    <div style="font-size: 0.85rem; color: #666;">${user.email}</div>
                </div>
            </div>
        `;
    }).join('');
    
    autocomplete.style.display = 'block';
    selectedMentionIndex = 0;
}

// Mettre à jour la sélection dans l'autocomplete
function updateMentionSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedMentionIndex) {
            item.style.background = '#e3f2fd';
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.style.background = 'transparent';
        }
    });
}

// Sélectionner une mention
window.selectMention = function(userId) {
    const user = mentionsList.find(u => u.id === userId);
    if (!user) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value;
    
    // Remplacer @search par @username
    const beforeMention = text.substring(0, mentionStartPos);
    const afterCursor = text.substring(input.selectionStart);
    
    const newText = beforeMention + `@${user.name} ` + afterCursor;
    input.value = newText;
    
    // Placer le curseur après la mention
    const newCursorPos = beforeMention.length + user.name.length + 2;
    input.setSelectionRange(newCursorPos, newCursorPos);
    
    // Fermer l'autocomplete
    closeMentionAutocomplete();
    
    // Focus sur l'input
    input.focus();
}

// Fermer l'autocomplete
function closeMentionAutocomplete() {
    const autocomplete = document.getElementById('mentionAutocomplete');
    if (autocomplete) {
        autocomplete.style.display = 'none';
    }
    mentionStartPos = -1;
    currentMentionSearch = '';
    selectedMentionIndex = 0;
}

// Extraire les mentions d'un message
function extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        const user = mentionsList.find(u => u.name === username);
        if (user) {
            mentions.push(user.id);
        }
    }
    
    return mentions;
}

// Formater le texte avec les mentions en surbrillance
function formatMentions(text, currentUserId) {
    const currentUser = mentionsList.find(u => u.id === currentUserId);
    const currentUsername = currentUser ? currentUser.name : '';
    
    return text.replace(/@(\w+)/g, (match, username) => {
        const isMentioningMe = username === currentUsername;
        const color = isMentioningMe ? '#1976d2' : '#2196f3';
        const bgColor = isMentioningMe ? '#e3f2fd' : 'transparent';
        const fontWeight = isMentioningMe ? '600' : '500';
        
        return `<span style="color: ${color}; background: ${bgColor}; padding: 2px 4px; border-radius: 3px; font-weight: ${fontWeight};">@${username}</span>`;
    });
}

// Vérifier si un message mentionne l'utilisateur actuel
function isMentioningMe(text, currentUserId) {
    const currentUser = mentionsList.find(u => u.id === currentUserId);
    if (!currentUser) return false;
    
    const mentionRegex = new RegExp(`@${currentUser.name}\\b`, 'i');
    return mentionRegex.test(text);
}

// Envoyer une notification pour une mention
function notifyMention(senderName, messagePreview) {
    // Son de notification spécial pour les mentions
    playMentionSound();
    
    // Toast
    showToast(`📢 ${senderName} vous a mentionné`, 'info');
    
    // Notification de bureau
    if (window.messagingEnhancements) {
        window.messagingEnhancements.showDesktopNotification(
            `${senderName} vous a mentionné`,
            messagePreview
        );
    }
}

// Son spécial pour les mentions
function playMentionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Triple bip plus aigu pour les mentions
        [0, 0.15, 0.3].forEach((delay, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1200 + (index * 100);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.1);
            
            oscillator.start(audioContext.currentTime + delay);
            oscillator.stop(audioContext.currentTime + delay + 0.1);
        });
    } catch (error) {
        console.log('Son de mention désactivé');
    }
}

// Exporter les fonctions
window.mentions = {
    init: initMentions,
    extract: extractMentions,
    format: formatMentions,
    isMentioningMe: isMentioningMe,
    notify: notifyMention,
    loadUsers: loadUsersForMentions
};
