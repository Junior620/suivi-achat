async function loadPlantersPage(container) {
    console.log('=== CHARGEMENT PAGE PLANTEURS ===');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">👨‍🌾 Planteurs</h2>
                <button id="addPlanterBtn" class="btn btn-primary">+ Nouveau planteur</button>
            </div>
            <div id="plantersTable"></div>
        </div>
        
        <div id="planterModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Nouveau planteur</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="planterForm">
                    <div id="planterModeSelector" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600;">Mode :</label>
                        <div style="display: flex; gap: 10px;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="planterMode" value="new" checked style="margin-right: 5px;">
                                Nouveau planteur
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="planterMode" value="existing" style="margin-right: 5px;">
                                Planteur existant
                            </label>
                        </div>
                    </div>
                    
                    <div id="newPlanterSection">
                        <h4 style="margin-top: 0; color: var(--primary);">Informations du Planteur</h4>
                        <div class="form-group">
                            <label>Nom *</label>
                            <input type="text" id="name" required>
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="phone">
                        </div>
                        <div class="form-group">
                            <label>CNI (Carte Nationale d'Identité)</label>
                            <input type="text" id="cni" placeholder="Ex: 123456789">
                        </div>
                        <div class="form-group">
                            <label>Coopérative</label>
                            <input type="text" id="cooperative" list="cooperativesList" placeholder="Nom de la coopérative">
                            <datalist id="cooperativesList"></datalist>
                            <small>Sélectionnez une coopérative existante ou saisissez-en une nouvelle</small>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Région</label>
                                <input type="text" id="region" placeholder="Ex: Centre">
                            </div>
                            <div class="form-group">
                                <label>Département</label>
                                <input type="text" id="departement" placeholder="Ex: Mfoundi">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Localité / Village</label>
                            <input type="text" id="localite" placeholder="Ex: Yaoundé">
                        </div>
                        <div class="form-group">
                            <label>Statut de la plantation</label>
                            <select id="statut_plantation">
                                <option value="">Sélectionner...</option>
                                <option value="Propriétaire">Propriétaire</option>
                                <option value="Locataire">Locataire</option>
                                <option value="Métayer">Métayer</option>
                                <option value="Gérant">Gérant</option>
                                <option value="Autre">Autre</option>
                            </select>
                            <small>Indique si le champ appartient au planteur ou non</small>
                        </div>
                        <div class="form-group">
                            <label>Superficie (hectares)</label>
                            <input type="number" id="superficie" step="0.01" min="0.01">
                            <small>1 hectare = 1000 kg de production maximale (optionnel)</small>
                        </div>
                        <div class="form-group">
                            <label>Fournisseur</label>
                            <select id="chefPlanteurId">
                                <option value="">Aucun (peut être assigné plus tard)</option>
                            </select>
                            <small>Associer ce planteur à un fournisseur (optionnel)</small>
                        </div>
                    </div>
                    
                    <div id="existingPlanterSection" style="display: none;">
                        <h4 style="margin-top: 0; color: var(--primary);">Sélectionner un Planteur</h4>
                        <div class="form-group">
                            <label>Planteur *</label>
                            <select id="existingPlanterId" required>
                                <option value="">Sélectionner un planteur...</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="deliverySection">
                        <hr style="margin: 20px 0; border: 1px solid #e0e0e0;">
                        <h4 style="color: var(--primary);">Première Livraison (Optionnel)</h4>
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                            Vous pouvez ajouter directement la première livraison du planteur
                        </p>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de chargement</label>
                                <input type="date" id="loadDate">
                            </div>
                            <div class="form-group">
                                <label>Lieu de chargement</label>
                                <select id="loadLocationSelect">
                                    <option value="">Sélectionner...</option>
                                </select>
                                <input type="text" id="loadLocationCustom" placeholder="Nouveau lieu..." style="display:none; margin-top: 5px;">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de déchargement</label>
                                <input type="date" id="unloadDate">
                            </div>
                            <div class="form-group">
                                <label>Lieu de déchargement</label>
                                <select id="unloadLocationSelect">
                                    <option value="">Sélectionner...</option>
                                </select>
                                <input type="text" id="unloadLocationCustom" placeholder="Nouveau lieu..." style="display:none; margin-top: 5px;">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantité chargée (kg)</label>
                                <input type="number" id="quantityLoadedKg" step="0.01" min="0" placeholder="Ex: 1550.00">
                            </div>
                            <div class="form-group">
                                <label>Quantité déchargée (kg)</label>
                                <input type="number" id="quantityKg" step="0.01" min="0" placeholder="Ex: 1500.50">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Qualité du cacao</label>
                                <select id="cocoaQuality">
                                    <option value="">Sélectionner...</option>
                                    <option value="Grade 1">Grade 1</option>
                                    <option value="Grade 2">Grade 2</option>
                                    <option value="Grade 3">Grade 3</option>
                                    <option value="Premium">Premium</option>
                                    <option value="Standard">Standard</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Pertes (kg)</label>
                                <input type="number" id="pertesKg" step="0.01" readonly style="background: #f5f5f5;" placeholder="Calculé automatiquement">
                                <small>Pertes = Chargé - Déchargé</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="deliveryNotes" rows="2" placeholder="Notes sur la livraison..."></textarea>
                        </div>
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

    function getProgressBar(pourcentage) {
        let color = '#28a745'; // Vert
        if (pourcentage >= 90) color = '#dc3545'; // Rouge
        else if (pourcentage >= 70) color = '#ffc107'; // Orange
        
        return `
            <div style="width: 100%; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                <div style="width: ${Math.min(pourcentage, 100)}%; background: ${color}; height: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
                    ${pourcentage.toFixed(1)}%
                </div>
            </div>
        `;
    }

    async function loadTable() {
        try {
            const data = await api.getPlanters({ size: 1000, with_stats: true });
            console.log('Planteurs chargés:', data.items.length);
            
            if (table) {
                // Forcer le rechargement des données
                table.replaceData(data.items);
            } else {
                table = new Tabulator("#plantersTable", {
                    data: data.items,
                    layout: "fitColumns",
                    pagination: true,
                    paginationSize: 20,
                    columns: [
                        {title: "Nom", field: "name", minWidth: 150},
                        {title: "Téléphone", field: "phone", minWidth: 130, formatter: (cell) => cell.getValue() || '-'},
                        {title: "CNI", field: "cni", minWidth: 120, formatter: (cell) => cell.getValue() || '-'},
                        {title: "Coopérative", field: "cooperative", minWidth: 150, formatter: (cell) => cell.getValue() || '-'},
                        {title: "Superficie (ha)", field: "superficie_hectares", minWidth: 120, formatter: (cell) => {
                            const val = cell.getValue();
                            return val ? parseFloat(val).toFixed(2) : '-';
                        }},
                        {title: "Limite (kg)", field: "limite_production_kg", minWidth: 110, formatter: (cell) => {
                            const val = cell.getValue();
                            return val ? parseFloat(val).toFixed(0) : '-';
                        }},
                        {title: "Chargé (kg)", field: "total_charge_kg", minWidth: 110, formatter: (cell) => {
                            const val = cell.getValue();
                            return val !== undefined ? parseFloat(val).toFixed(2) : '0.00';
                        }},
                        {title: "Déchargé (kg)", field: "total_decharge_kg", minWidth: 110, formatter: (cell) => {
                            const val = cell.getValue();
                            return val !== undefined ? parseFloat(val).toFixed(2) : '0.00';
                        }},
                        {title: "Pertes (kg)", field: "pertes_kg", minWidth: 100, formatter: (cell) => {
                            const val = cell.getValue();
                            if (val === undefined || val === null) return '-';
                            const row = cell.getRow().getData();
                            const pourcentage = row.pourcentage_pertes || 0;
                            let color = '#28a745'; // Vert
                            if (pourcentage > 10) color = '#dc3545'; // Rouge si > 10%
                            else if (pourcentage > 5) color = '#ffc107'; // Orange si > 5%
                            return `<span style="color: ${color}; font-weight: bold;">${parseFloat(val).toFixed(2)}</span>`;
                        }},
                        {title: "Restant (kg)", field: "restant_kg", minWidth: 120, formatter: (cell) => {
                            const val = cell.getValue();
                            if (val === undefined || val === null) return '-';
                            const color = val < 200 ? '#dc3545' : val < 500 ? '#ffc107' : '#28a745';
                            return `<span style="color: ${color}; font-weight: bold;">${parseFloat(val).toFixed(2)}</span>`;
                        }},
                        {title: "Utilisation", minWidth: 150, formatter: (cell) => {
                            const row = cell.getRow().getData();
                            if (row.pourcentage_utilise === undefined) return '-';
                            return getProgressBar(row.pourcentage_utilise);
                        }},
                        {title: "Fournisseur", field: "chef_planteur_name", minWidth: 150, formatter: (cell) => {
                            const value = cell.getValue();
                            if (!value) return '<span style="color: #999; font-style: italic;">Aucun</span>';
                            return `<span style="color: #8B4513; font-weight: 500;">👨‍🌾 ${value}</span>`;
                        }},
                        {title: "Actions", minWidth: 120, formatter: () => {
                            const canEdit = currentUser.role !== 'viewer';
                            return canEdit ? '<button class="btn-edit" title="Modifier">✏️</button> <button class="btn-delete" title="Supprimer">❌</button>' : '';
                        }, cellClick: handleTableAction}
                    ]
                });
                
                // Ajouter l'événement de clic sur les lignes après la création du tableau
                table.on("rowClick", function(e, row) {
                    console.log('Planter row clicked:', e.target.classList);
                    // Ne pas ouvrir le modal si on clique sur un bouton d'action
                    if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
                        console.log('Opening view modal for planter:', row.getData().name);
                        openViewModal(row.getData());
                    }
                });
            }
        } catch (error) {
            console.error('Erreur chargement planteurs:', error);
            showToast('Erreur lors du chargement des planteurs', 'error');
        }
    }

    function handleTableAction(e, cell) {
        const row = cell.getRow().getData();
        if (e.target.classList.contains('btn-edit')) {
            e.stopPropagation(); // Empêcher l'ouverture du modal de visualisation
            openEditModal(row);
        } else if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation(); // Empêcher l'ouverture du modal de visualisation
            deletePlanter(row.id);
        }
    }
    
    async function openViewModal(planter) {
        console.log('openViewModal called for planter:', planter);
        // Créer le modal de visualisation
        const existingModal = document.getElementById('viewPlanterModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'viewPlanterModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>📋 Détails du Planteur</h3>
                    <span class="close-view">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="kpi-grid" style="margin-bottom: 20px;">
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.name}</div>
                            <div class="kpi-label">Nom</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.phone || '-'}</div>
                            <div class="kpi-label">Téléphone</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.cni || '-'}</div>
                            <div class="kpi-label">CNI</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.cooperative || '-'}</div>
                            <div class="kpi-label">Coopérative</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.superficie_hectares ? parseFloat(planter.superficie_hectares).toFixed(2) : '-'}</div>
                            <div class="kpi-label">Superficie (ha)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.chef_planteur_name || 'Aucun'}</div>
                            <div class="kpi-label">Fournisseur</div>
                        </div>
                    </div>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">📊 Statistiques de Production</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value">${planter.limite_production_kg ? parseFloat(planter.limite_production_kg).toFixed(0) : '-'}</div>
                            <div class="kpi-label">Limite Production (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: #8B4513">${planter.total_charge_kg !== undefined ? parseFloat(planter.total_charge_kg).toFixed(2) : '0.00'}</div>
                            <div class="kpi-label">Total Chargé (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: #D2691E">${planter.total_decharge_kg !== undefined ? parseFloat(planter.total_decharge_kg).toFixed(2) : '0.00'}</div>
                            <div class="kpi-label">Total Déchargé (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${planter.restant_kg < 200 ? '#dc3545' : planter.restant_kg < 500 ? '#ffc107' : '#28a745'}">${planter.restant_kg !== undefined ? parseFloat(planter.restant_kg).toFixed(2) : '-'}</div>
                            <div class="kpi-label">Restant (kg)</div>
                        </div>
                    </div>
                    
                    ${planter.pertes_kg !== undefined && planter.pertes_kg !== null ? `
                    <h4 style="color: var(--primary); margin-top: 20px;">📉 Pertes</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${planter.pourcentage_pertes > 10 ? '#dc3545' : planter.pourcentage_pertes > 5 ? '#ffc107' : '#28a745'}">${parseFloat(planter.pertes_kg).toFixed(2)}</div>
                            <div class="kpi-label">Pertes (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${planter.pourcentage_pertes > 10 ? '#dc3545' : planter.pourcentage_pertes > 5 ? '#ffc107' : '#28a745'}">${planter.pourcentage_pertes !== undefined ? parseFloat(planter.pourcentage_pertes).toFixed(1) : '0.0'}%</div>
                            <div class="kpi-label">% Pertes</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${planter.pourcentage_utilise !== undefined ? `
                    <h4 style="color: var(--primary); margin-top: 20px;">📈 Utilisation de la Limite</h4>
                    <div style="margin: 15px 0;">
                        ${getProgressBar(planter.pourcentage_utilise)}
                    </div>
                    <p style="text-align: center; color: #666; margin-top: 10px;">
                        ${planter.pourcentage_utilise.toFixed(1)}% de la limite de production utilisée
                    </p>
                    ` : ''}
                </div>
                <div class="actions" style="margin-top: 20px;">
                    <button class="close-view btn btn-secondary">Fermer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-view').forEach(el => {
            el.addEventListener('click', () => {
                modal.remove();
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async function loadChefPlanteurs() {
        try {
            const chefs = await api.getChefPlanteurs();
            const select = document.getElementById('chefPlanteurId');
            select.innerHTML = '<option value="">Sélectionner un fournisseur...</option>';
            chefs.forEach(chef => {
                const option = document.createElement('option');
                option.value = chef.id;
                option.textContent = `${chef.name} (${chef.quantite_max_kg} kg max)`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur chargement chefs planteurs:', error);
        }
    }

    async function openModal() {
        await loadChefPlanteurs();
        await loadCooperativesList();
        document.getElementById('planterModal').classList.add('show');
    }
    
    async function loadCooperativesList() {
        try {
            const cooperatives = await api.getCooperativeNames();
            const datalist = document.getElementById('cooperativesList');
            datalist.innerHTML = cooperatives.map(name => `<option value="${name}">`).join('');
        } catch (error) {
            console.error('Erreur chargement coopératives:', error);
        }
    }

    function closeModal() {
        document.getElementById('planterModal').classList.remove('show');
        document.getElementById('planterForm').reset();
    }

    async function openEditModal(planter) {
        document.getElementById('modalTitle').textContent = 'Modifier le planteur';
        document.getElementById('name').value = planter.name;
        document.getElementById('phone').value = planter.phone || '';
        document.getElementById('cni').value = planter.cni || '';
        document.getElementById('cooperative').value = planter.cooperative || '';
        document.getElementById('region').value = planter.region || '';
        document.getElementById('departement').value = planter.departement || '';
        document.getElementById('localite').value = planter.localite || '';
        document.getElementById('statut_plantation').value = planter.statut_plantation || '';
        document.getElementById('superficie').value = planter.superficie_hectares || '';
        document.getElementById('planterForm').dataset.editId = planter.id;
        
        // Charger les chefs planteurs et sélectionner celui du planteur
        await loadChefPlanteurs();
        if (planter.chef_planteur_id) {
            document.getElementById('chefPlanteurId').value = planter.chef_planteur_id;
        }
        
        // Masquer la section livraison en mode édition
        document.getElementById('deliverySection').style.display = 'none';
        // Masquer le sélecteur de mode en mode édition
        document.getElementById('planterModeSelector').style.display = 'none';
        // Afficher la section nouveau planteur
        document.getElementById('newPlanterSection').style.display = 'block';
        document.getElementById('existingPlanterSection').style.display = 'none';
        openModal();
    }

    async function deletePlanter(id) {
        if (!confirm('Supprimer ce planteur ? Toutes ses livraisons seront également supprimées.')) return;
        try {
            await api.deletePlanter(id);
            showToast('Planteur supprimé');
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    const addBtn = document.getElementById('addPlanterBtn');
    console.log('Bouton ajouter trouvé:', !!addBtn);
    
    addBtn.addEventListener('click', async () => {
        console.log('=== CLIC SUR AJOUTER PLANTEUR ===');
        document.getElementById('modalTitle').textContent = 'Ajouter Planteur / Livraison';
        delete document.getElementById('planterForm').dataset.editId;
        // Réafficher la section livraison en mode création
        document.getElementById('deliverySection').style.display = 'block';
        // Réafficher le sélecteur de mode
        document.getElementById('planterModeSelector').style.display = 'block';
        // Réinitialiser le mode à "nouveau"
        document.querySelector('input[name="planterMode"][value="new"]').checked = true;
        
        // Charger la liste des planteurs pour le sélecteur
        await loadPlantersSelect();
        
        // Charger l'autocomplétion des lieux
        await loadLocationsAutocomplete();
        
        // Appliquer le mode "nouveau" (important pour les champs required)
        switchPlanterMode('new');
        
        openModal();
    });
    
    // Gérer le changement de mode
    function switchPlanterMode(mode) {
        console.log('Changement de mode:', mode);
        if (mode === 'new') {
            document.getElementById('newPlanterSection').style.display = 'block';
            document.getElementById('existingPlanterSection').style.display = 'none';
            document.getElementById('name').required = true;
            document.getElementById('name').disabled = false;
            document.getElementById('phone').disabled = false;
            document.getElementById('existingPlanterId').required = false;
            document.getElementById('existingPlanterId').disabled = true;
        } else {
            document.getElementById('newPlanterSection').style.display = 'none';
            document.getElementById('existingPlanterSection').style.display = 'block';
            document.getElementById('name').required = false;
            document.getElementById('name').disabled = true;
            document.getElementById('phone').disabled = true;
            document.getElementById('existingPlanterId').required = true;
            document.getElementById('existingPlanterId').disabled = false;
        }
    }
    
    // Initialiser le mode au chargement
    switchPlanterMode('new');
    
    document.addEventListener('change', (e) => {
        if (e.target.name === 'planterMode') {
            switchPlanterMode(e.target.value);
        }
    });
    
    async function loadPlantersSelect() {
        try {
            const data = await api.getPlanters({ size: 1000 });
            const select = document.getElementById('existingPlanterId');
            select.innerHTML = '<option value="">Sélectionner un planteur...</option>';
            data.items.forEach(planter => {
                const option = document.createElement('option');
                option.value = planter.id;
                option.textContent = `${planter.name}${planter.phone ? ' - ' + planter.phone : ''}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur chargement planteurs:', error);
        }
    }

    async function loadLocationsAutocomplete() {
        try {
            const locations = await api.getUniqueLocations();
            const loadSelect = document.getElementById('loadLocationSelect');
            const unloadSelect = document.getElementById('unloadLocationSelect');
            
            // Réinitialiser les selects
            loadSelect.innerHTML = '<option value="">Sélectionner...</option>';
            unloadSelect.innerHTML = '<option value="">Sélectionner...</option>';
            
            // Ajouter les lieux existants
            locations.load_locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc;
                option.textContent = loc;
                loadSelect.appendChild(option);
            });
            
            locations.unload_locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc;
                option.textContent = loc;
                unloadSelect.appendChild(option);
            });
            
            // Ajouter l'option "Autre..."
            const otherLoadOption = document.createElement('option');
            otherLoadOption.value = '__other__';
            otherLoadOption.textContent = '➕ Autre...';
            loadSelect.appendChild(otherLoadOption);
            
            const otherUnloadOption = document.createElement('option');
            otherUnloadOption.value = '__other__';
            otherUnloadOption.textContent = '➕ Autre...';
            unloadSelect.appendChild(otherUnloadOption);
            
        } catch (error) {
            console.error('Erreur lors du chargement des lieux:', error);
        }
    }
    
    // Gérer le changement de sélection pour afficher le champ personnalisé
    document.addEventListener('change', (e) => {
        if (e.target.id === 'loadLocationSelect') {
            const customInput = document.getElementById('loadLocationCustom');
            if (e.target.value === '__other__') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
                customInput.value = '';
            }
        }
        
        if (e.target.id === 'unloadLocationSelect') {
            const customInput = document.getElementById('unloadLocationCustom');
            if (e.target.value === '__other__') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
                customInput.value = '';
            }
        }
    });
    
    // Calculer automatiquement les pertes
    document.addEventListener('input', (e) => {
        if (e.target.id === 'quantityLoadedKg' || e.target.id === 'quantityKg') {
            const loaded = parseFloat(document.getElementById('quantityLoadedKg').value) || 0;
            const unloaded = parseFloat(document.getElementById('quantityKg').value) || 0;
            const pertes = loaded - unloaded;
            const pertesField = document.getElementById('pertesKg');
            if (pertesField) {
                pertesField.value = pertes > 0 ? pertes.toFixed(2) : '0.00';
                // Changer la couleur selon les pertes
                if (pertes > loaded * 0.1) { // Plus de 10% de pertes
                    pertesField.style.color = '#dc3545'; // Rouge
                } else if (pertes > loaded * 0.05) { // Plus de 5% de pertes
                    pertesField.style.color = '#ffc107'; // Orange
                } else {
                    pertesField.style.color = '#28a745'; // Vert
                }
            }
        }
    });

    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    const planterForm = document.getElementById('planterForm');
    console.log('Formulaire planteur trouvé:', !!planterForm);
    
    planterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('=== SOUMISSION FORMULAIRE PLANTEUR ===');

        try {
            const editId = document.getElementById('planterForm').dataset.editId;
            
            if (editId) {
                // Mode édition - seulement mettre à jour le planteur
                const chefId = document.getElementById('chefPlanteurId').value || null;
                const superficieValue = document.getElementById('superficie').value;
                const planterData = {
                    name: document.getElementById('name').value,
                    phone: document.getElementById('phone').value || null,
                    cni: document.getElementById('cni').value || null,
                    cooperative: document.getElementById('cooperative').value || null,
                    region: document.getElementById('region').value || null,
                    departement: document.getElementById('departement').value || null,
                    localite: document.getElementById('localite').value || null,
                    statut_plantation: document.getElementById('statut_plantation').value || null,
                    superficie_hectares: superficieValue ? parseFloat(superficieValue) : null,
                    chef_planteur_id: chefId
                };
                const result = await api.updatePlanter(editId, planterData);
                console.log('Planteur modifié:', result);
                showToast('Planteur modifié');
            } else {
                // Mode création - vérifier le mode sélectionné
                const mode = document.querySelector('input[name="planterMode"]:checked').value;
                let planterId;
                
                if (mode === 'new') {
                    // Créer un nouveau planteur
                    const chefId = document.getElementById('chefPlanteurId').value || null;
                    const superficieValue = document.getElementById('superficie').value;
                    const planterData = {
                        name: document.getElementById('name').value,
                        phone: document.getElementById('phone').value || null,
                        cni: document.getElementById('cni').value || null,
                        cooperative: document.getElementById('cooperative').value || null,
                        region: document.getElementById('region').value || null,
                        departement: document.getElementById('departement').value || null,
                        localite: document.getElementById('localite').value || null,
                        statut_plantation: document.getElementById('statut_plantation').value || null,
                        superficie_hectares: superficieValue ? parseFloat(superficieValue) : null,
                        chef_planteur_id: chefId
                    };
                    console.log('Création nouveau planteur:', planterData);
                    const planterResult = await api.createPlanter(planterData);
                    console.log('Planteur créé:', planterResult);
                    planterId = planterResult.id;
                } else {
                    // Utiliser un planteur existant
                    planterId = document.getElementById('existingPlanterId').value;
                    if (!planterId) {
                        showToast('Veuillez sélectionner un planteur', 'error');
                        return;
                    }
                    console.log('Utilisation planteur existant:', planterId);
                }
                
                // Vérifier si une livraison doit être créée
                const loadDate = document.getElementById('loadDate').value;
                const loadLocationSelect = document.getElementById('loadLocationSelect').value;
                const loadLocation = loadLocationSelect === '__other__' 
                    ? document.getElementById('loadLocationCustom').value 
                    : loadLocationSelect;
                    
                const unloadDate = document.getElementById('unloadDate').value;
                const unloadLocationSelect = document.getElementById('unloadLocationSelect').value;
                const unloadLocation = unloadLocationSelect === '__other__' 
                    ? document.getElementById('unloadLocationCustom').value 
                    : unloadLocationSelect;
                    
                const quantityLoadedKg = document.getElementById('quantityLoadedKg').value;
                const quantityKg = document.getElementById('quantityKg').value;
                const cocoaQuality = document.getElementById('cocoaQuality').value;
                
                // Si au moins la date et les quantités sont renseignées, créer la livraison
                if (loadDate && quantityLoadedKg && quantityKg && parseFloat(quantityKg) > 0 && parseFloat(quantityLoadedKg) > 0) {
                    // Vérifier si le fournisseur sera dépassé
                    const chefId = mode === 'new' ? document.getElementById('chefPlanteurId').value : null;
                    let warningMessage = '';
                    
                    if (chefId) {
                        try {
                            const chefStats = await api.getChefPlanteurStats(chefId);
                            const nouvelleQuantite = chefStats.total_livre_kg + parseFloat(quantityLoadedKg);
                            
                            if (nouvelleQuantite > chefStats.quantite_max_kg) {
                                const depassement = nouvelleQuantite - chefStats.quantite_max_kg;
                                const nouveauPourcentage = (nouvelleQuantite / chefStats.quantite_max_kg * 100).toFixed(1);
                                warningMessage = `⚠️ ATTENTION : Cette livraison fera dépasser la capacité du fournisseur de ${depassement.toFixed(0)} kg (${nouveauPourcentage}% d'utilisation)`;
                            }
                        } catch (error) {
                            console.error('Erreur vérification fournisseur:', error);
                        }
                    }
                    
                    const deliveryData = {
                        planter_id: planterId,
                        date: unloadDate || loadDate,
                        quantity_loaded_kg: parseFloat(quantityLoadedKg),
                        quantity_kg: parseFloat(quantityKg),
                        load_location: loadLocation || 'Non spécifié',
                        unload_location: unloadLocation || 'Non spécifié',
                        quality: cocoaQuality || 'Standard',
                        notes: document.getElementById('deliveryNotes').value || `Chargement: ${loadDate}${loadLocation ? ' à ' + loadLocation : ''}`
                    };
                    
                    console.log('Création livraison:', deliveryData);
                    
                    try {
                        const deliveryResult = await api.createDelivery(deliveryData);
                        console.log('Livraison créée:', deliveryResult);
                        
                        if (mode === 'new') {
                            showToast(warningMessage || 'Planteur et livraison créés avec succès', warningMessage ? 'warning' : 'success');
                        } else {
                            showToast(warningMessage || 'Livraison ajoutée avec succès', warningMessage ? 'warning' : 'success');
                        }
                    } catch (deliveryError) {
                        console.error('Erreur création livraison:', deliveryError);
                        if (mode === 'new') {
                            showToast('Planteur créé, mais erreur lors de la création de la livraison', 'error');
                        } else {
                            showToast('Erreur lors de la création de la livraison', 'error');
                        }
                    }
                } else {
                    if (mode === 'new') {
                        showToast('Planteur créé');
                    } else {
                        showToast('Aucune livraison à ajouter (date et quantité requises)', 'error');
                    }
                }
            }
            
            closeModal();
            await new Promise(resolve => setTimeout(resolve, 300));
            await loadTable();
        } catch (error) {
            console.error('Erreur soumission planteur:', error);
            
            if (error.message && error.message.includes('already exists')) {
                showToast('Ce planteur existe déjà. Utilisez le mode "Planteur existant" pour ajouter une livraison.', 'error');
            } else {
                showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
            }
        }
    });

    // Vérifier les permissions
    if (currentUser.role === 'viewer') {
        const btn = document.getElementById('addPlanterBtn');
        if (btn) {
            btn.style.display = 'none';
        }
    }

    // Charger la table
    loadTable();
}

// Debug: Log pour vérifier que la fonction est appelée
console.log('Planters page loaded');
