async function loadCollectesPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📦 Collectes</h2>
                <button id="addCollecteBtn" class="btn btn-primary">+ Nouvelle collecte</button>
            </div>
            <div class="filters">
                <div class="filter-row">
                    <div class="form-group">
                        <label>Rechercher</label>
                        <input type="text" id="searchInput" placeholder="Nom du fournisseur...">
                    </div>
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterFrom">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterTo">
                    </div>
                </div>
                <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
            </div>
            <div id="collectesTable"></div>
        </div>
        
        <div id="collecteModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Nouvelle collecte</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="collecteForm">
                    <div class="form-group">
                        <label>Désignation *</label>
                        <input type="text" id="designation" required placeholder="Ex: Achat cacao Grade 1">
                    </div>
                    
                    <div class="form-group">
                        <label>Fournisseur *</label>
                        <select id="chefPlanteurId" required>
                            <option value="">Sélectionner un fournisseur...</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Quantité chargée (kg) *</label>
                            <input type="number" id="quantityLoaded" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Date de chargement *</label>
                            <input type="date" id="loadDate" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Quantité déchargée (kg) *</label>
                            <input type="number" id="quantityUnloaded" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Date de déchargement *</label>
                            <input type="date" id="unloadDate" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Pertes (kg)</label>
                            <input type="number" id="pertes" readonly style="background: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>Date de collecte *</label>
                            <input type="date" id="dateCollecte" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Suivi / Notes</label>
                        <textarea id="suivi" rows="3" placeholder="Notes sur la collecte..."></textarea>
                    </div>
                    
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                        <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    let table;
    const currentUser = JSON.parse(localStorage.getItem('user'));
    let currentFilters = {};

    async function loadTable() {
        const data = await api.getCollectes(currentFilters);
        
        if (table) {
            table.setData(data.items);
        } else {
            table = new Tabulator("#collectesTable", {
                data: data.items,
                layout: "fitColumns",
                pagination: true,
                paginationSize: 20,
                rowClick: function(e, row) {
                    if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
                        openViewModal(row.getData());
                    }
                },
                columns: [
                    {title: "Désignation", field: "designation", minWidth: 200},
                    {title: "Fournisseur", field: "chef_planteur_name", minWidth: 150},
                    {title: "Coopérative", field: "chef_planteur_cooperative", minWidth: 150, formatter: (cell) => cell.getValue() || '-'},
                    {title: "Chargé (kg)", field: "quantity_loaded_kg", minWidth: 110, formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Date chargement", field: "load_date", minWidth: 130},
                    {title: "Déchargé (kg)", field: "quantity_unloaded_kg", minWidth: 110, formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Date déchargement", field: "unload_date", minWidth: 130},
                    {title: "Pertes (kg)", field: "pertes_kg", minWidth: 100, formatter: (cell) => {
                        const val = parseFloat(cell.getValue());
                        const row = cell.getRow().getData();
                        const pct = row.pourcentage_pertes;
                        let color = '#28a745';
                        if (pct > 10) color = '#dc3545';
                        else if (pct > 5) color = '#ffc107';
                        return `<span style="color: ${color}; font-weight: bold;">${val.toFixed(2)}</span>`;
                    }},
                    {title: "Date collecte", field: "date_collecte", minWidth: 120},
                    {title: "Actions", minWidth: 100, formatter: () => {
                        const canEdit = currentUser.role !== 'viewer';
                        return canEdit ? '<button class="btn-edit">✏️</button> <button class="btn-delete">🗑️</button>' : '';
                    }, cellClick: handleTableAction}
                ]
            });
            
            table.on("rowClick", function(e, row) {
                if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
                    openViewModal(row.getData());
                }
            });
        }
    }

    function handleTableAction(e, cell) {
        const row = cell.getRow().getData();
        if (e.target.classList.contains('btn-edit')) {
            e.stopPropagation();
            openEditModal(row);
        } else if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation();
            deleteCollecte(row.id);
        }
    }

    async function openViewModal(collecte) {
        const existingModal = document.getElementById('viewCollecteModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'viewCollecteModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>📋 Détails de la Collecte</h3>
                    <span class="close-view">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="kpi-grid" style="margin-bottom: 20px;">
                        <div class="kpi-card">
                            <div class="kpi-value">${collecte.designation}</div>
                            <div class="kpi-label">Désignation</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${collecte.date_collecte}</div>
                            <div class="kpi-label">Date de Collecte</div>
                        </div>
                    </div>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">👨‍🌾 Fournisseur</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value">${collecte.chef_planteur_name}</div>
                            <div class="kpi-label">Nom</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${collecte.chef_planteur_cooperative || '-'}</div>
                            <div class="kpi-label">Coopérative</div>
                        </div>
                    </div>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">📊 Quantités</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: #8B4513">${parseFloat(collecte.quantity_loaded_kg).toFixed(2)}</div>
                            <div class="kpi-label">Chargé (kg)</div>
                            <small>${collecte.load_date}</small>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: #D2691E">${parseFloat(collecte.quantity_unloaded_kg).toFixed(2)}</div>
                            <div class="kpi-label">Déchargé (kg)</div>
                            <small>${collecte.unload_date}</small>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${collecte.pourcentage_pertes > 10 ? '#dc3545' : collecte.pourcentage_pertes > 5 ? '#ffc107' : '#28a745'}">${parseFloat(collecte.pertes_kg).toFixed(2)}</div>
                            <div class="kpi-label">Pertes (kg)</div>
                            <small>${collecte.pourcentage_pertes.toFixed(1)}%</small>
                        </div>
                    </div>
                    
                    ${collecte.suivi ? `
                    <h4 style="color: var(--primary); margin-top: 20px;">📝 Suivi</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <p style="margin: 0; white-space: pre-wrap;">${collecte.suivi}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="actions" style="margin-top: 20px;">
                    <button class="close-view btn btn-secondary">Fermer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-view').forEach(el => {
            el.addEventListener('click', () => modal.remove());
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async function loadFournisseurs() {
        const data = await api.getChefPlanteurs();
        const select = document.getElementById('chefPlanteurId');
        select.innerHTML = '<option value="">Sélectionner un fournisseur...</option>';
        data.forEach(chef => {
            const option = document.createElement('option');
            option.value = chef.id;
            option.textContent = `${chef.name}${chef.cooperative ? ' - ' + chef.cooperative : ''}`;
            select.appendChild(option);
        });
    }

    function openModal() {
        document.getElementById('collecteModal').classList.add('show');
        document.getElementById('modalTitle').textContent = 'Nouvelle collecte';
        document.getElementById('collecteForm').reset();
        delete document.getElementById('collecteForm').dataset.editId;
        loadFournisseurs();
        
        // Définir la date de collecte par défaut à aujourd'hui
        document.getElementById('dateCollecte').valueAsDate = new Date();
    }

    async function openEditModal(collecte) {
        document.getElementById('collecteModal').classList.add('show');
        document.getElementById('modalTitle').textContent = 'Modifier la collecte';
        document.getElementById('designation').value = collecte.designation;
        document.getElementById('quantityLoaded').value = collecte.quantity_loaded_kg;
        document.getElementById('loadDate').value = collecte.load_date;
        document.getElementById('quantityUnloaded').value = collecte.quantity_unloaded_kg;
        document.getElementById('unloadDate').value = collecte.unload_date;
        document.getElementById('dateCollecte').value = collecte.date_collecte;
        document.getElementById('suivi').value = collecte.suivi || '';
        document.getElementById('collecteForm').dataset.editId = collecte.id;
        
        await loadFournisseurs();
        document.getElementById('chefPlanteurId').value = collecte.chef_planteur_id;
        
        // Calculer les pertes
        calculatePertes();
    }

    function closeModal() {
        document.getElementById('collecteModal').classList.remove('show');
    }

    function calculatePertes() {
        const loaded = parseFloat(document.getElementById('quantityLoaded').value) || 0;
        const unloaded = parseFloat(document.getElementById('quantityUnloaded').value) || 0;
        const pertes = loaded - unloaded;
        document.getElementById('pertes').value = pertes > 0 ? pertes.toFixed(2) : '0.00';
        
        const pertesField = document.getElementById('pertes');
        const pct = loaded > 0 ? (pertes / loaded) * 100 : 0;
        if (pct > 10) {
            pertesField.style.color = '#dc3545';
        } else if (pct > 5) {
            pertesField.style.color = '#ffc107';
        } else {
            pertesField.style.color = '#28a745';
        }
    }

    document.getElementById('addCollecteBtn').addEventListener('click', openModal);
    
    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });
    
    document.addEventListener('input', (e) => {
        if (e.target.id === 'quantityLoaded' || e.target.id === 'quantityUnloaded') {
            calculatePertes();
        }
    });

    document.getElementById('collecteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            designation: document.getElementById('designation').value,
            chef_planteur_id: document.getElementById('chefPlanteurId').value,
            quantity_loaded_kg: parseFloat(document.getElementById('quantityLoaded').value),
            load_date: document.getElementById('loadDate').value,
            quantity_unloaded_kg: parseFloat(document.getElementById('quantityUnloaded').value),
            unload_date: document.getElementById('unloadDate').value,
            date_collecte: document.getElementById('dateCollecte').value,
            suivi: document.getElementById('suivi').value || null
        };

        try {
            const editId = document.getElementById('collecteForm').dataset.editId;
            if (editId) {
                await api.updateCollecte(editId, formData);
                showToast('Collecte modifiée');
            } else {
                await api.createCollecte(formData);
                showToast('Collecte créée');
            }
            closeModal();
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    async function deleteCollecte(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette collecte ?')) {
            try {
                await api.deleteCollecte(id);
                showToast('Collecte supprimée');
                loadTable();
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    }

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            search: document.getElementById('searchInput').value || undefined,
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined
        };
        loadTable();
    });

    if (currentUser.role === 'viewer') {
        document.getElementById('addCollecteBtn').style.display = 'none';
    }

    loadTable();
}
