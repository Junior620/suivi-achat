// Module de traçabilité avec QR Code et Blockchain

let currentDeliveryId = null;
let qrScanner = null;

async function loadTraceabilityPage(container) {
    container.innerHTML = `
        <div class="traceability-container">
            <div class="page-header">
                <h2>🔗 Traçabilité & Blockchain</h2>
                <div class="header-actions">
                    <button onclick="showBlockchainStats()" class="btn btn-secondary">
                        📊 Statistiques Blockchain
                    </button>
                    <button onclick="verifyBlockchain()" class="btn btn-primary">
                        ✓ Vérifier l'intégrité
                    </button>
                </div>
            </div>

            <div class="traceability-tabs">
                <button class="tab-btn active" onclick="switchTraceabilityTab('scan')">
                    📷 Scanner QR Code
                </button>
                <button class="tab-btn" onclick="switchTraceabilityTab('search')">
                    🔍 Rechercher
                </button>
                <button class="tab-btn" onclick="switchTraceabilityTab('timeline')">
                    📅 Timeline
                </button>
            </div>

            <div id="scanTab" class="tab-content active">
                <div class="scan-section">
                    <div class="scan-card">
                        <h3>Scanner un QR Code</h3>
                        <div id="qrReader" style="width: 100%; max-width: 500px; margin: 20px auto;"></div>
                        <div class="scan-manual">
                            <p>Ou entrez le code manuellement:</p>
                            <input type="text" id="manualQrCode" placeholder="COCOA-xxxxx-xxxxx" class="form-control">
                            <button onclick="verifyManualQrCode()" class="btn btn-primary">Vérifier</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="searchTab" class="tab-content">
                <div class="search-section">
                    <h3>Rechercher une livraison</h3>
                    <div class="search-form">
                        <input type="text" id="deliverySearch" placeholder="ID de livraison ou QR Code" class="form-control">
                        <button onclick="searchDelivery()" class="btn btn-primary">Rechercher</button>
                    </div>
                </div>
            </div>

            <div id="timelineTab" class="tab-content">
                <div class="timeline-section">
                    <h3>Timeline de traçabilité</h3>
                    <div id="timelineContent">
                        <p class="text-muted">Sélectionnez une livraison pour voir sa timeline</p>
                    </div>
                </div>
            </div>

            <div id="verificationResult" class="verification-result" style="display: none;"></div>
        </div>
    `;

    // Initialiser le scanner QR Code
    initQrScanner();
}

function switchTraceabilityTab(tab) {
    // Désactiver tous les tabs
    document.querySelectorAll('.traceability-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Activer le tab sélectionné
    event.target.classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

function initQrScanner() {
    // Utiliser html5-qrcode library (à charger via CDN)
    if (typeof Html5Qrcode !== 'undefined') {
        const html5QrCode = new Html5Qrcode("qrReader");
        
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                html5QrCode.stop();
                verifyQrCode(decodedText);
            },
            (errorMessage) => {
                // Ignorer les erreurs de scan
            }
        ).catch(err => {
            console.log("Erreur d'initialisation du scanner:", err);
            document.getElementById('qrReader').innerHTML = `
                <div class="alert alert-warning">
                    <p>Impossible d'accéder à la caméra. Utilisez la saisie manuelle ci-dessous.</p>
                </div>
            `;
        });
        
        qrScanner = html5QrCode;
    } else {
        document.getElementById('qrReader').innerHTML = `
            <div class="alert alert-info">
                <p>Scanner QR Code non disponible. Utilisez la saisie manuelle ci-dessous.</p>
            </div>
        `;
    }
}

async function verifyManualQrCode() {
    const qrCode = document.getElementById('manualQrCode').value.trim();
    if (!qrCode) {
        showToast('Veuillez entrer un code QR', 'warning');
        return;
    }
    await verifyQrCode(qrCode);
}

async function verifyQrCode(qrCode) {
    try {
        const response = await fetch(`${api.baseUrl}/traceability/verify/${qrCode}`, {
            headers: api.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('QR Code non trouvé');
        }
        
        const result = await response.json();
        displayVerificationResult(result);
    } catch (error) {
        showToast('Erreur lors de la vérification: ' + error.message, 'error');
    }
}

function displayVerificationResult(result) {
    const resultDiv = document.getElementById('verificationResult');
    
    const statusClass = result.is_valid ? 'success' : 'danger';
    const statusIcon = result.is_valid ? '✓' : '✗';
    
    resultDiv.innerHTML = `
        <div class="verification-card ${statusClass}">
            <div class="verification-header">
                <span class="status-icon">${statusIcon}</span>
                <h3>${result.message}</h3>
            </div>
            
            <div class="blockchain-info">
                <h4>🔗 Informations Blockchain</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Hash Blockchain:</label>
                        <code>${result.blockchain_hash}</code>
                    </div>
                    <div class="info-item">
                        <label>Numéro de Bloc:</label>
                        <span>#${result.block_number}</span>
                    </div>
                    ${result.previous_hash ? `
                        <div class="info-item">
                            <label>Hash Précédent:</label>
                            <code>${result.previous_hash}</code>
                        </div>
                    ` : ''}
                    <div class="info-item">
                        <label>Date d'enregistrement:</label>
                        <span>${new Date(result.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <div class="info-item">
                        <label>Nombre de scans:</label>
                        <span>${result.scans_count}</span>
                    </div>
                </div>
            </div>
            
            <div class="delivery-info">
                <h4>📦 Informations de Livraison</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Planteur:</label>
                        <span>${result.trace_data.planter_name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <label>Date:</label>
                        <span>${new Date(result.trace_data.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="info-item">
                        <label>Quantité:</label>
                        <span>${result.trace_data.quantity_kg} kg</span>
                    </div>
                    <div class="info-item">
                        <label>Qualité:</label>
                        <span class="quality-badge">${result.trace_data.quality}</span>
                    </div>
                    <div class="info-item">
                        <label>Chargement:</label>
                        <span>${result.trace_data.load_location}</span>
                    </div>
                    <div class="info-item">
                        <label>Déchargement:</label>
                        <span>${result.trace_data.unload_location}</span>
                    </div>
                </div>
            </div>
            
            <div class="verification-actions">
                <button onclick="viewTimeline('${result.trace_data.delivery_id}')" class="btn btn-primary">
                    📅 Voir la Timeline
                </button>
                <button onclick="downloadQrCode('${result.trace_data.delivery_id}')" class="btn btn-secondary">
                    📥 Télécharger QR Code
                </button>
                <button onclick="recordScan('${result.trace_data.delivery_id}')" class="btn btn-secondary">
                    📝 Enregistrer un Scan
                </button>
            </div>
        </div>
    `;
    
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

async function viewTimeline(deliveryId) {
    try {
        const response = await fetch(`${api.baseUrl}/traceability/timeline/${deliveryId}`, {
            headers: api.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Timeline non trouvée');
        }
        
        const timeline = await response.json();
        displayTimeline(timeline);
        
        // Switcher vers l'onglet timeline
        document.querySelector('[onclick="switchTraceabilityTab(\'timeline\')"]').click();
    } catch (error) {
        showToast('Erreur lors du chargement de la timeline: ' + error.message, 'error');
    }
}

function displayTimeline(timeline) {
    const timelineContent = document.getElementById('timelineContent');
    
    timelineContent.innerHTML = `
        <div class="timeline-header">
            <h4>Timeline de la livraison</h4>
            <div class="timeline-meta">
                <span>QR Code: <code>${timeline.qr_code}</code></span>
                <span>Bloc #${timeline.block_number}</span>
                <span>${timeline.total_scans} scans</span>
            </div>
        </div>
        
        <div class="timeline-events">
            ${timeline.timeline.map((event, index) => `
                <div class="timeline-event ${event.type}">
                    <div class="timeline-marker">${index + 1}</div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <h5>${event.title}</h5>
                            <span class="timeline-date">${new Date(event.timestamp).toLocaleString('fr-FR')}</span>
                        </div>
                        <p>${event.description}</p>
                        ${event.location ? `<p class="timeline-location">📍 ${event.location}</p>` : ''}
                        ${event.scanned_by ? `<p class="timeline-user">👤 ${event.scanned_by}</p>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function recordScan(deliveryId) {
    // Obtenir le QR code de la livraison
    try {
        const traceResponse = await fetch(`${api.baseUrl}/traceability/delivery/${deliveryId}`, {
            headers: api.getHeaders()
        });
        
        if (!traceResponse.ok) {
            throw new Error('Livraison non trouvée');
        }
        
        const trace = await traceResponse.json();
        
        // Afficher le formulaire de scan
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📝 Enregistrer un Scan</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="scanForm">
                        <div class="form-group">
                            <label>Scanné par *</label>
                            <input type="text" id="scannedBy" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Type de scan *</label>
                            <select id="scanType" class="form-control" required>
                                <option value="verification">Vérification</option>
                                <option value="transfer">Transfert</option>
                                <option value="quality_check">Contrôle qualité</option>
                                <option value="loading">Chargement</option>
                                <option value="unloading">Déchargement</option>
                                <option value="storage">Entreposage</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Lieu</label>
                            <input type="text" id="scanLocation" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="scanNotes" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="useGeolocation">
                                Utiliser ma position actuelle
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">Annuler</button>
                    <button onclick="submitScan('${trace.qr_code}')" class="btn btn-primary">Enregistrer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function submitScan(qrCode) {
    const scannedBy = document.getElementById('scannedBy').value;
    const scanType = document.getElementById('scanType').value;
    const scanLocation = document.getElementById('scanLocation').value;
    const scanNotes = document.getElementById('scanNotes').value;
    const useGeolocation = document.getElementById('useGeolocation').checked;
    
    if (!scannedBy) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }
    
    const scanData = {
        scanned_by: scannedBy,
        scan_type: scanType,
        scan_location: scanLocation || null,
        notes: scanNotes || null
    };
    
    // Obtenir la géolocalisation si demandé
    if (useGeolocation && navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            scanData.latitude = position.coords.latitude.toString();
            scanData.longitude = position.coords.longitude.toString();
        } catch (error) {
            console.log('Géolocalisation non disponible');
        }
    }
    
    try {
        const response = await fetch(`${api.baseUrl}/traceability/scan/${qrCode}`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify(scanData)
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de l\'enregistrement du scan');
        }
        
        showToast('✓ Scan enregistré avec succès', 'success');
        document.querySelector('.modal').remove();
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function downloadQrCode(deliveryId) {
    try {
        const traceResponse = await fetch(`${api.baseUrl}/traceability/delivery/${deliveryId}`, {
            headers: api.getHeaders()
        });
        
        if (!traceResponse.ok) {
            throw new Error('Livraison non trouvée');
        }
        
        const trace = await traceResponse.json();
        
        // Créer un lien de téléchargement
        const link = document.createElement('a');
        link.href = trace.qr_code_image;
        link.download = `QR_${trace.qr_code}.png`;
        link.click();
        
        showToast('✓ QR Code téléchargé', 'success');
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function showBlockchainStats() {
    try {
        const response = await fetch(`${api.baseUrl}/traceability/stats`, {
            headers: api.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des statistiques');
        }
        
        const stats = await response.json();
        
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Statistiques Blockchain</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.total_deliveries_tracked}</div>
                            <div class="stat-label">Livraisons tracées</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.total_scans}</div>
                            <div class="stat-label">Scans totaux</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.average_scans_per_delivery}</div>
                            <div class="stat-label">Scans par livraison</div>
                        </div>
                        <div class="stat-card ${stats.blockchain_valid ? 'success' : 'danger'}">
                            <div class="stat-value">${stats.blockchain_valid ? '✓' : '✗'}</div>
                            <div class="stat-label">Blockchain ${stats.blockchain_valid ? 'Intègre' : 'Compromise'}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-primary">Fermer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

async function verifyBlockchain() {
    try {
        const response = await fetch(`${api.baseUrl}/traceability/blockchain/verify`, {
            headers: api.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la vérification');
        }
        
        const result = await response.json();
        
        const statusClass = result.is_valid ? 'success' : 'danger';
        const statusIcon = result.is_valid ? '✓' : '✗';
        
        showToast(`${statusIcon} ${result.message} (${result.total_blocks} blocs)`, statusClass);
    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    }
}

// Fonction pour générer automatiquement la traçabilité lors de la création d'une livraison
async function generateTraceabilityForDelivery(deliveryId) {
    try {
        // La traçabilité est générée automatiquement côté backend
        // Cette fonction peut être appelée pour vérifier ou afficher le QR code
        const response = await fetch(`${api.baseUrl}/traceability/delivery/${deliveryId}`, {
            headers: api.getHeaders()
        });
        
        if (response.ok) {
            const trace = await response.json();
            return trace;
        }
    } catch (error) {
        console.error('Erreur génération traçabilité:', error);
    }
    return null;
}
