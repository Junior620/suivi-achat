// Gestion des documents et contrats

let documentsTable = null;

async function loadDocumentsPage(container) {
    container.innerHTML = `
        <div class="documents-container">
            <div class="page-header">
                <h2>📄 Gestion des Documents</h2>
                <button onclick="openUploadModal()" class="btn btn-primary">
                    📤 Upload Document
                </button>
            </div>

            <!-- KPIs -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Total Documents</div>
                        <div class="kpi-value" id="totalDocs">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💾</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Espace utilisé</div>
                        <div class="kpi-value" id="totalSize">0 MB</div>
                    </div>
                </div>
            </div>

            <!-- Filtres -->
            <div class="card">
                <div class="card-header">
                    <h3>🔍 Filtres</h3>
                </div>
                <div class="filter-grid">
                    <select id="filterType" class="filter-input">
                        <option value="">Tous les types</option>
                        <option value="contract">Contrat</option>
                        <option value="certificate">Certificat</option>
                        <option value="invoice">Facture</option>
                        <option value="delivery_note">Bon de livraison</option>
                        <option value="id_card">Carte d'identité</option>
                        <option value="photo">Photo</option>
                    </select>
                    <select id="filterStatus" class="filter-input">
                        <option value="">Tous les statuts</option>
                        <option value="draft">Brouillon</option>
                        <option value="validated">Validé</option>
                    </select>
                    <button onclick="loadDocuments()" class="btn btn-primary">Appliquer</button>
                </div>
            </div>

            <!-- Liste des documents -->
            <div class="card">
                <div id="documentsTable"></div>
            </div>
        </div>

        <!-- Modal Upload -->
        <div id="uploadModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Upload Document</h3>
                    <span class="close" onclick="closeUploadModal()">&times;</span>
                </div>
                <form id="uploadForm">
                    <div class="form-group">
                        <label>Titre *</label>
                        <input type="text" id="docTitle" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="docDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="docType" required>
                            <option value="contract">Contrat</option>
                            <option value="certificate">Certificat</option>
                            <option value="invoice">Facture</option>
                            <option value="delivery_note">Bon de livraison</option>
                            <option value="id_card">Carte d'identité</option>
                            <option value="photo">Photo</option>
                            <option value="other">Autre</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fichier * (PDF, JPG, PNG, DOC)</label>
                        <div id="dropZone" style="border: 2px dashed #ccc; padding: 40px; text-align: center; border-radius: 8px; cursor: pointer;">
                            <p>📁 Glissez un fichier ici ou cliquez pour sélectionner</p>
                            <input type="file" id="docFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display: none;" required>
                            <div id="fileInfo" style="margin-top: 10px; color: #28a745; font-weight: bold;"></div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="closeUploadModal()" class="btn btn-secondary">Annuler</button>
                        <button type="submit" class="btn btn-primary">Upload</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadStats();
    await loadDocuments();
    setupDragDrop();
}

async function loadStats() {
    try {
        const stats = await api.request('/documents/stats');
        document.getElementById('totalDocs').textContent = stats.total_documents;
        document.getElementById('totalSize').textContent = `${stats.total_size_mb} MB`;
    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

async function loadDocuments() {
    try {
        const type = document.getElementById('filterType')?.value;
        const status = document.getElementById('filterStatus')?.value;
        
        let url = '/documents?limit=100';
        if (type) url += `&document_type=${type}`;
        if (status) url += `&status=${status}`;
        
        const documents = await api.request(url);
        
        if (documentsTable) {
            documentsTable.setData(documents);
        } else {
            documentsTable = new Tabulator("#documentsTable", {
                data: documents,
                layout: "fitColumns",
                columns: [
                    {title: "Type", field: "document_type", formatter: (cell) => {
                        const icons = {
                            'contract': '📝',
                            'certificate': '🏆',
                            'invoice': '💰',
                            'delivery_note': '📋',
                            'id_card': '🆔',
                            'photo': '📷',
                            'other': '📄'
                        };
                        return icons[cell.getValue()] || '📄';
                    }},
                    {title: "Titre", field: "title", minWidth: 200},
                    {title: "Statut", field: "status", formatter: (cell) => {
                        const badges = {
                            'draft': '<span class="badge badge-secondary">Brouillon</span>',
                            'validated': '<span class="badge badge-success">Validé</span>'
                        };
                        return badges[cell.getValue()] || cell.getValue();
                    }},
                    {title: "Taille", field: "file_size", formatter: (cell) => {
                        const bytes = cell.getValue();
                        return bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/(1024*1024)).toFixed(1)} MB`;
                    }},
                    {title: "Date", field: "created_at", formatter: (cell) => {
                        return new Date(cell.getValue()).toLocaleDateString('fr-FR');
                    }},
                    {
                        title: "Actions", 
                        width: 150,
                        hozAlign: "center",
                        headerSort: false,
                        formatter: () => {
                            return `
                                <button class="btn-sm btn-view" style="background: #007bff; color: white; border: none; padding: 5px 10px; margin: 2px; border-radius: 4px; cursor: pointer;">&#128065;</button>
                                <button class="btn-sm btn-delete" style="background: #dc3545; color: white; border: none; padding: 5px 10px; margin: 2px; border-radius: 4px; cursor: pointer;">&#128465;</button>
                            `;
                        }, 
                        cellClick: handleDocAction
                    }
                ]
            });
        }
    } catch (error) {
        console.error('Erreur chargement documents:', error);
        showToast('Erreur chargement des documents', 'error');
    }
}

function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('docFile');
    
    dropZone.onclick = () => fileInput.click();
    
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#28a745';
        dropZone.style.background = '#f0f8f0';
    };
    
    dropZone.ondragleave = () => {
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = 'white';
    };
    
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = 'white';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            showFileInfo(e.dataTransfer.files[0]);
        }
    };
    
    fileInput.onchange = () => {
        if (fileInput.files.length) {
            showFileInfo(fileInput.files[0]);
        }
    };
    
    document.getElementById('uploadForm').onsubmit = async (e) => {
        e.preventDefault();
        await uploadDocument();
    };
}

function showFileInfo(file) {
    const info = document.getElementById('fileInfo');
    info.textContent = `✓ ${file.name} (${(file.size/(1024*1024)).toFixed(2)} MB)`;
}

async function uploadDocument() {
    const formData = new FormData();
    formData.append('file', document.getElementById('docFile').files[0]);
    formData.append('title', document.getElementById('docTitle').value);
    formData.append('description', document.getElementById('docDescription').value);
    formData.append('document_type', document.getElementById('docType').value);
    
    try {
        const response = await fetch(`${api.baseUrl}/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api.getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        showToast('✅ Document uploadé avec succès', 'success');
        closeUploadModal();
        await loadDocuments();
        await loadStats();
    } catch (error) {
        console.error('Erreur upload:', error);
        showToast('Erreur lors de l\'upload', 'error');
    }
}

function handleDocAction(e, cell) {
    const doc = cell.getRow().getData();
    if (e.target.classList.contains('btn-view')) {
        viewDocument(doc);
    } else if (e.target.classList.contains('btn-delete')) {
        deleteDocument(doc);
    }
}

async function deleteDocument(doc) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${doc.title}" ?`)) {
        return;
    }
    
    try {
        await api.request(`/documents/${doc.id}`, {
            method: 'DELETE'
        });
        
        showToast('✅ Document supprimé', 'success');
        await loadDocuments();
        await loadStats();
    } catch (error) {
        console.error('Erreur suppression:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function viewDocument(doc) {
    try {
        const response = await fetch(`${api.baseUrl}/documents/${doc.id}/download`, {
            headers: {
                'Authorization': `Bearer ${api.getToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Erreur téléchargement:', error);
        showToast('Erreur lors du téléchargement', 'error');
    }
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('show');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('show');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileInfo').textContent = '';
}
