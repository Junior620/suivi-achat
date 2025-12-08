/**
 * Système de partage de localisation GPS
 */

console.log('📍 Module location-share chargé');

let currentLocation = null;

// Obtenir la position actuelle
async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur'));
            return;
        }
        
        showToast('📍 Obtention de votre position...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                });
            },
            (error) => {
                let message = 'Erreur de géolocalisation';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Permission de géolocalisation refusée';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Position indisponible';
                        break;
                    case error.TIMEOUT:
                        message = 'Délai d\'attente dépassé';
                        break;
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Partager la localisation
async function shareLocation() {
    try {
        const location = await getCurrentPosition();
        currentLocation = location;
        
        showToast('✅ Position obtenue', 'success');
        
        // Créer le message avec la localisation
        await sendLocationMessage(location);
        
    } catch (error) {
        console.error('❌ Erreur localisation:', error);
        showToast(error.message, 'error');
    }
}

// Envoyer un message avec la localisation
async function sendLocationMessage(location) {
    const messageContent = `📍 Position partagée\nLat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}`;
    
    const messageData = {
        content: messageContent,
        channel_id: currentChannelId,
        conversation_id: currentConversationId,
        message_type: 'text',  // Utiliser 'text' au lieu de 'location'
        entity_references: {
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                timestamp: location.timestamp
            }
        }
    };
    
    try {
        await api.post('/messaging/messages', messageData);
        showToast('📍 Localisation partagée', 'success');
        
        // Recharger les messages
        if (currentChannelId) {
            const channelName = document.getElementById('chatTitle').textContent;
            await openChannel(currentChannelId, channelName, true);
        } else if (currentConversationId) {
            const userName = document.getElementById('chatTitle').textContent;
            await openConversation(currentConversationId, userName, true);
        }
        
    } catch (error) {
        console.error('❌ Erreur envoi localisation:', error);
        showToast('Erreur lors du partage de localisation', 'error');
    }
}

// Afficher une localisation sur une carte
function renderLocationMap(location) {
    const { latitude, longitude, accuracy } = location;
    
    // Créer l'URL Google Maps
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x200&markers=color:red%7C${latitude},${longitude}&key=YOUR_API_KEY`;
    
    // Utiliser OpenStreetMap comme alternative gratuite
    const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
    
    return `
        <div style="background: #f5f5f5; border-radius: 8px; padding: 12px; margin-top: 8px; border-left: 3px solid #4caf50;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-map-marker-alt" style="color: #4caf50; font-size: 1.5rem;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">📍 Position GPS</div>
                    <div style="font-size: 0.85rem; color: #666;">
                        Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}
                    </div>
                    ${accuracy ? `<div style="font-size: 0.8rem; color: #999;">Précision: ±${Math.round(accuracy)}m</div>` : ''}
                </div>
            </div>
            
            <div style="position: relative; width: 100%; height: 200px; background: #e0e0e0; border-radius: 6px; overflow: hidden; margin-bottom: 10px;">
                <iframe 
                    width="100%" 
                    height="200" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    src="https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}"
                    style="border: none;">
                </iframe>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <a href="${osmUrl}" target="_blank" rel="noopener noreferrer" 
                   style="flex: 1; padding: 10px; background: #4caf50; color: white; text-decoration: none; border-radius: 6px; text-align: center; font-size: 0.9rem; transition: background 0.2s;"
                   onmouseenter="this.style.background='#45a049'"
                   onmouseleave="this.style.background='#4caf50'">
                    <i class="fas fa-map"></i> Voir sur OpenStreetMap
                </a>
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" 
                   style="flex: 1; padding: 10px; background: #1976d2; color: white; text-decoration: none; border-radius: 6px; text-align: center; font-size: 0.9rem; transition: background 0.2s;"
                   onmouseenter="this.style.background='#1565c0'"
                   onmouseleave="this.style.background='#1976d2'">
                    <i class="fas fa-map-marked-alt"></i> Voir sur Google Maps
                </a>
            </div>
            
            <button onclick="getDirections(${latitude}, ${longitude})" 
                    style="width: 100%; margin-top: 10px; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s;"
                    onmouseenter="this.style.background='#f57c00'"
                    onmouseleave="this.style.background='#ff9800'">
                <i class="fas fa-directions"></i> Obtenir l'itinéraire
            </button>
        </div>
    `;
}

// Obtenir l'itinéraire vers une position
window.getDirections = async function(targetLat, targetLon) {
    try {
        const myLocation = await getCurrentPosition();
        const directionsUrl = `https://www.google.com/maps/dir/${myLocation.latitude},${myLocation.longitude}/${targetLat},${targetLon}`;
        window.open(directionsUrl, '_blank');
    } catch (error) {
        // Si on ne peut pas obtenir la position, ouvrir juste la destination
        const directionsUrl = `https://www.google.com/maps/dir//${targetLat},${targetLon}`;
        window.open(directionsUrl, '_blank');
    }
}

// Ajouter le bouton de partage de localisation
function addLocationButton() {
    setTimeout(() => {
        const attachBtn = document.getElementById('attachBtn');
        if (!attachBtn) return;
        
        const container = attachBtn.parentElement;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('locationBtn')) return;
        
        const locationBtn = document.createElement('button');
        locationBtn.id = 'locationBtn';
        locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        locationBtn.title = 'Partager ma position';
        locationBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 8px;
            font-size: 1rem;
            transition: color 0.2s;
        `;
        locationBtn.onmouseenter = () => locationBtn.style.color = '#4caf50';
        locationBtn.onmouseleave = () => locationBtn.style.color = '#666';
        locationBtn.onclick = (e) => {
            e.preventDefault();
            shareLocation();
        };
        
        // Insérer après le bouton de formatage
        const formattingBtn = document.getElementById('formattingHelpBtn');
        if (formattingBtn) {
            container.insertBefore(locationBtn, formattingBtn.nextSibling);
        } else {
            container.insertBefore(locationBtn, attachBtn);
        }
    }, 1000);
}

// Initialiser le système de partage de localisation
function initLocationSharing() {
    console.log('📍 Initialisation du partage de localisation...');
    addLocationButton();
}

// Exporter les fonctions
window.locationSharing = {
    init: initLocationSharing,
    share: shareLocation,
    renderMap: renderLocationMap,
    getCurrentPosition: getCurrentPosition
};
