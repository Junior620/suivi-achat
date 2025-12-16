async function loadChefPlanteursPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🏢 Fournisseurs</h1>
            <button id="addChefBtn" class="btn btn-primary">+ Nouveau fournisseur</button>
        </div>

        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card" style="border-left: 4px solid #28a745;">
                <div class="stat-value" id="totalFournisseurs" style="color: #28a745;">-</div>
                <div class="stat-label">Total Fournisseurs</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #28a745;">
                <div class="stat-value" id="fournisseursExploites" style="color: #28a745;">-</div>
                <div class="stat-label">✅ Exploités</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #dc3545;">
                <div class="stat-value" id="fournisseursNonExploites" style="color: #dc3545;">-</div>
                <div class="stat-label">❌ Non Exploités</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Liste des Fournisseurs</h2>
                <div style="display: flex; gap: 12px;">
                    <select id="statutFilter" style="padding: 8px 12px; border-radius: 4px; border: 1px solid #ddd;">
                        <option value="tous">Tous</option>
                        <option value="exploites">Exploités</option>
                        <option value="non-exploites">Non Exploités</option>
                    </select>
                </div>
            </div>
            <div id="chefsTable"></div>
        </div>
        
        <div id="chefModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Nouveau fournisseur</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="chefForm">
                    <h4 style="margin-top: 0; color: var(--primary);">Informations du Fournisseur</h4>
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
                        <label>Quantité maximale (kg) *</label>
                        <input type="number" id="quantite_max" step="1" min="1" required>
                        <small>Quantité maximale que le fournisseur peut fournir</small>
                    </div>
                    
                    <hr style="margin: 20px 0; border: 1px solid #e0e0e0;">
                    <h4 style="color: var(--primary);">📅 Informations Contrat</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date début contrat</label>
                            <input type="date" id="date_debut_contrat">
                        </div>
                        <div class="form-group">
                            <label>Date fin contrat</label>
                            <input type="date" id="date_fin_contrat">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Raison fin de contrat</label>
                        <textarea id="raison_fin_contrat" rows="3" placeholder="Ex: Fin de contrat, Résiliation, etc."></textarea>
                        <small>À remplir uniquement si le contrat est terminé</small>
                    </div>
                    
                    <hr style="margin: 20px 0; border: 1px solid #e0e0e0;">
                    <h4 style="color: var(--primary);">Planteurs Associés (Optionnel)</h4>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                        Vous pouvez assigner des planteurs à ce fournisseur maintenant ou plus tard
                    </p>
                    
                    <div class="form-group">
                        <label>Sélectionner des planteurs</label>
                        <select id="planteursSelect" multiple size="6" style="width: 100%; padding: 8px;">
                            <option value="">Chargement...</option>
                        </select>
                        <small>Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs planteurs</small>
                    </div>
                    
                    <hr style="margin: 20px 0; border: 1px solid #e0e0e0;">
                    <h4 style="color: var(--primary);">Première Livraison (Optionnel)</h4>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                        Vous pouvez ajouter directement la première livraison d'un planteur
                    </p>
                    
                    <div class="form-group">
                        <label>Planteur pour la livraison</label>
                        <select id="planteurLivraisonSelect">
                            <option value="">Sélectionner un planteur...</option>
                        </select>
                        <small>Choisir le planteur qui effectue cette livraison</small>
                    </div>
                    
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

    function getProgressBar(pourcentage) {
        let color = '#28a745'; // Vert
        let barWidth = Math.min(pourcentage, 100);
        
        if (pourcentage > 100) {
            // Dépassement : barre rouge pleine avec bordure et texte en gras
            color = '#dc3545';
            return `
                <div style="width: 100%; background: #ff9999; border-radius: 4px; overflow: hidden; border: 3px solid ${color};">
                    <div style="width: 100%; background: ${color}; height: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold;">
                        ⚠️ ${pourcentage.toFixed(1)}%
                    </div>
                </div>
            `;
        } else if (pourcentage >= 90) {
            color = '#dc3545'; // Rouge
        } else if (pourcentage >= 70) {
            color = '#ffc107'; // Orange
        }
        
        return `
            <div style="width: 100%; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                <div style="width: ${barWidth}%; background: ${color}; height: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
                    ${pourcentage.toFixed(1)}%
                </div>
            </div>
        `;
    }

    async function loadTable() {
        try {
            const response = await api.getChefPlanteursStats();
            console.log('Chef Planteurs - Response:', response);
            
            // Gérer différents formats de réponse
            let data = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response && Array.isArray(response.items)) {
                data = response.items;
            } else if (response && response.data && Array.isArray(response.data)) {
                data = response.data;
            } else {
                console.warn('Unexpected response format:', response);
                data = [];
            }
            
            console.log('Chef Planteurs - Data array:', data);
        
        // Ajouter des valeurs par défaut pour les champs manquants
        data.forEach(chef => {
            // Valeurs par défaut si les champs n'existent pas
            chef.quantite_max_kg = chef.quantite_max_kg || 0;
            chef.total_livre_kg = chef.total_livre_kg || 0;
            chef.total_limite_planteurs_kg = chef.total_limite_planteurs_kg || 0;
            chef.restant_kg = chef.quantite_max_kg - chef.total_livre_kg;
            chef.nombre_planteurs = chef.nombre_planteurs || 0;
            chef.pourcentage_utilise = chef.quantite_max_kg > 0 
                ? (chef.total_livre_kg / chef.quantite_max_kg) * 100 
                : 0;
            
            // Un fournisseur est exploité s'il a livré du cacao (total_livre_kg > 0)
            chef.est_exploite = chef.total_livre_kg > 0;
            
            if (chef.alerte) {
                showToast(chef.alerte, 'warning');
            }
        });
        
        // Calculer les statistiques
        const totalFournisseurs = data.length;
        const exploites = data.filter(c => c.est_exploite).length;
        const nonExploites = totalFournisseurs - exploites;
        
        document.getElementById('totalFournisseurs').textContent = totalFournisseurs;
        document.getElementById('fournisseursExploites').textContent = exploites;
        document.getElementById('fournisseursNonExploites').textContent = nonExploites;
        
        if (table) {
            table.setData(data);
        } else {
            table = new Tabulator("#chefsTable", {
                data: data,
                layout: "fitColumns",
                rowFormatter: function(row) {
                    const data = row.getData();
                    // Colorer les non exploités en rouge clair
                    if (!data.est_exploite) {
                        row.getElement().style.backgroundColor = "#ffe6e6";
                        row.getElement().style.borderLeft = "4px solid #dc3545";
                    }
                    // Colorer les dépassements en rouge foncé
                    if (data.pourcentage_utilise > 100) {
                        row.getElement().style.backgroundColor = "#ff9999";
                        row.getElement().style.borderLeft = "6px solid #dc3545";
                        row.getElement().style.fontWeight = "600";
                        row.getElement().style.boxShadow = "0 3px 10px rgba(220, 53, 69, 0.3)";
                    }
                },
                columns: [
                    {title: "Statut", field: "est_exploite", minWidth: 100, hozAlign: "center", formatter: (cell) => {
                        const value = cell.getValue();
                        if (value) {
                            return '<span style="background: #d4edda; color: #155724; padding: 4px 10px; border-radius: 12px; font-weight: 600;">✅ Exploité</span>';
                        } else {
                            return '<span style="background: #f8d7da; color: #721c24; padding: 4px 10px; border-radius: 12px; font-weight: 600;">❌ Non Exploité</span>';
                        }
                    }},
                    {title: "Nom", field: "name", minWidth: 150, formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const color = row.est_exploite ? '#000' : '#dc3545';
                        return `<strong style="color: ${color};">${cell.getValue()}</strong>`;
                    }},
                    {title: "Téléphone", field: "phone", minWidth: 120, formatter: (cell) => cell.getValue() || '-'},
                    {title: "CNI", field: "cni", minWidth: 120, formatter: (cell) => cell.getValue() || '-'},
                    {title: "Coopérative", field: "cooperative", minWidth: 150, formatter: (cell) => cell.getValue() || '-'},
                    {title: "Quantité Max (kg)", field: "quantite_max_kg", minWidth: 130, formatter: (cell) => parseFloat(cell.getValue() || 0).toFixed(0)},
                    {title: "Livré (kg)", field: "total_livre_kg", minWidth: 110, formatter: (cell) => parseFloat(cell.getValue() || 0).toFixed(2)},
                    {title: "Limite Planteurs (kg)", field: "total_limite_planteurs_kg", minWidth: 150, formatter: (cell) => {
                        const val = parseFloat(cell.getValue() || 0);
                        const row = cell.getRow().getData();
                        const color = val > row.quantite_max_kg ? '#dc3545' : '#28a745';
                        return `<span style="color: ${color}; font-weight: bold;">${val.toFixed(0)}</span>`;
                    }},
                    {title: "Restant (kg)", field: "restant_kg", minWidth: 120, formatter: (cell) => {
                        const val = parseFloat(cell.getValue() || 0);
                        const color = val < 500 ? '#dc3545' : val < 1000 ? '#ffc107' : '#28a745';
                        return `<span style="color: ${color}; font-weight: bold;">${val.toFixed(2)}</span>`;
                    }},
                    {title: "Planteurs", field: "nombre_planteurs", minWidth: 90},
                    {title: "Utilisation", minWidth: 150, formatter: (cell) => {
                        const row = cell.getRow().getData();
                        return getProgressBar(row.pourcentage_utilise);
                    }},
                    {title: "Actions", minWidth: 100, formatter: (cell) => {
                        const canEdit = currentUser.role !== 'viewer';
                        return canEdit ? '<button class="btn-edit">✏️</button> <button class="btn-delete">🗑️</button>' : '';
                    }, cellClick: handleTableAction}
                ]
            });
            
            // Ajouter l'événement de clic sur les lignes après la création du tableau
            table.on("rowClick", function(e, row) {
                console.log('Row clicked:', e.target.classList);
                // Ne pas ouvrir le modal si on clique sur un bouton d'action
                if (!e.target.classList.contains('btn-edit') && !e.target.classList.contains('btn-delete')) {
                    console.log('Opening view modal for:', row.getData().name);
                    openViewModal(row.getData());
                }
            });
        }
        } catch (error) {
            console.error('Erreur lors du chargement des fournisseurs:', error);
            showToast('Erreur lors du chargement des fournisseurs', 'error');
            
            // Initialiser avec un tableau vide en cas d'erreur
            document.getElementById('totalFournisseurs').textContent = '0';
            document.getElementById('fournisseursExploites').textContent = '0';
            document.getElementById('fournisseursNonExploites').textContent = '0';
        }
    }

    function handleTableAction(e, cell) {
        const row = cell.getRow().getData();
        if (e.target.classList.contains('btn-edit')) {
            e.stopPropagation(); // Empêcher l'ouverture du modal de visualisation
            openEditModal(row);
        } else if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation(); // Empêcher l'ouverture du modal de visualisation
            deleteChef(row.id);
        }
    }
    
    async function openViewModal(chef) {
        console.log('openViewModal called with:', chef);
        // Créer le modal de visualisation
        const existingModal = document.getElementById('viewChefModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'viewChefModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>📋 Détails du Fournisseur</h3>
                    <span class="close-view">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="kpi-grid" style="margin-bottom: 20px;">
                        <div class="kpi-card">
                            <div class="kpi-value">${chef.name}</div>
                            <div class="kpi-label">Nom</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${chef.phone || '-'}</div>
                            <div class="kpi-label">Téléphone</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${chef.cni || '-'}</div>
                            <div class="kpi-label">CNI</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${chef.cooperative || '-'}</div>
                            <div class="kpi-label">Coopérative</div>
                        </div>
                    </div>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">📊 Statistiques</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value">${parseFloat(chef.quantite_max_kg).toFixed(0)}</div>
                            <div class="kpi-label">Quantité Max (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${chef.total_livre_kg > chef.quantite_max_kg ? '#dc3545' : '#28a745'}">${parseFloat(chef.total_livre_kg).toFixed(2)}</div>
                            <div class="kpi-label">Total Livré (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value" style="color: ${chef.restant_kg < 500 ? '#dc3545' : chef.restant_kg < 1000 ? '#ffc107' : '#28a745'}">${parseFloat(chef.restant_kg).toFixed(2)}</div>
                            <div class="kpi-label">Restant (kg)</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-value">${chef.nombre_planteurs}</div>
                            <div class="kpi-label">Planteurs Associés</div>
                        </div>
                    </div>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">📈 Utilisation</h4>
                    <div style="margin: 15px 0;">
                        ${getProgressBar(chef.pourcentage_utilise)}
                    </div>
                    <p style="text-align: center; color: #666; margin-top: 10px;">
                        ${chef.pourcentage_utilise.toFixed(1)}% de la capacité maximale utilisée
                    </p>
                    
                    <h4 style="color: var(--primary); margin-top: 20px;">⚠️ Quantités Chargées des Planteurs</h4>
                    <div class="kpi-card">
                        <div class="kpi-value" style="color: ${chef.total_livre_kg > chef.quantite_max_kg ? '#dc3545' : '#28a745'}">${parseFloat(chef.total_livre_kg).toFixed(0)}</div>
                        <div class="kpi-label">Total Quantités Chargées (kg)</div>
                        ${chef.total_livre_kg > chef.quantite_max_kg ? '<p style="color: #dc3545; margin-top: 10px; font-size: 0.9rem;">⚠️ Les quantités chargées des planteurs dépassent la capacité déclarée du fournisseur</p>' : ''}
                    </div>
                    
                    ${chef.alerte ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
                        <strong>⚠️ Alerte:</strong> ${chef.alerte}
                    </div>` : ''}
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

    async function loadPlanteurs() {
        try {
            const data = await api.getPlanters({ size: 1000 });
            const select = document.getElementById('planteursSelect');
            const livraisonSelect = document.getElementById('planteurLivraisonSelect');
            
            select.innerHTML = '';
            livraisonSelect.innerHTML = '<option value="">Sélectionner un planteur...</option>';
            
            if (data.items.length === 0) {
                select.innerHTML = '<option value="">Aucun planteur disponible</option>';
                return;
            }
            
            data.items.forEach(planter => {
                // Pour la sélection multiple d'assignation
                const option = document.createElement('option');
                option.value = planter.id;
                option.textContent = `${planter.name}${planter.phone ? ' - ' + planter.phone : ''}${planter.chef_planteur_name ? ' (déjà assigné à ' + planter.chef_planteur_name + ')' : ''}`;
                select.appendChild(option);
                
                // Pour la sélection de livraison
                const livraisonOption = document.createElement('option');
                livraisonOption.value = planter.id;
                livraisonOption.textContent = `${planter.name}${planter.phone ? ' - ' + planter.phone : ''}`;
                livraisonSelect.appendChild(livraisonOption);
            });
        } catch (error) {
            console.error('Erreur chargement planteurs:', error);
        }
    }

    async function openModal() {
        document.getElementById('chefModal').classList.add('show');
        document.getElementById('modalTitle').textContent = 'Nouveau fournisseur';
        document.getElementById('chefForm').reset();
        delete document.getElementById('chefForm').dataset.editId;
        await loadPlanteurs();
        await loadCooperativesList();
        initChefPlanteurFormValidation();
    }
    
    // Fonction pour initialiser la validation du formulaire fournisseur
    function initChefPlanteurFormValidation() {
        // Validation en temps réel pour le nom
        Validation.addRealtimeValidation('name', [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'Le nom est obligatoire'
            },
            {
                validate: (value) => Validation.minLength(value, 2),
                message: 'Le nom doit contenir au moins 2 caractères'
            }
        ]);

        // Validation en temps réel pour le téléphone
        Validation.addRealtimeValidation('phone', [
            {
                validate: (value) => !value || Validation.isValidPhone(value),
                message: 'Format de téléphone invalide (ex: 0712345678)'
            }
        ]);

        // Validation pour la quantité maximale
        Validation.addRealtimeValidation('quantite_max', [
            {
                validate: (value) => Validation.isRequired(value),
                message: 'La quantité maximale est obligatoire'
            },
            {
                validate: (value) => Validation.isValidQuantity(value),
                message: 'La quantité doit être un nombre positif'
            }
        ]);

        // Empêcher les valeurs négatives pour la quantité maximale
        Validation.preventNegative('quantite_max');

        // Empêcher les valeurs négatives pour les quantités de livraison
        if (document.getElementById('quantityLoadedKg')) {
            Validation.preventNegative('quantityLoadedKg');
        }
        if (document.getElementById('quantityKg')) {
            Validation.preventNegative('quantityKg');
        }

        // Formater automatiquement le téléphone
        Validation.formatPhone('phone');
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

    async function openEditModal(chef) {
        document.getElementById('chefModal').classList.add('show');
        document.getElementById('modalTitle').textContent = 'Modifier le fournisseur';
        document.getElementById('name').value = chef.name;
        document.getElementById('phone').value = chef.phone || '';
        document.getElementById('cni').value = chef.cni || '';
        document.getElementById('cooperative').value = chef.cooperative || '';
        document.getElementById('region').value = chef.region || '';
        document.getElementById('departement').value = chef.departement || '';
        document.getElementById('localite').value = chef.localite || '';
        document.getElementById('quantite_max').value = chef.quantite_max_kg;
        document.getElementById('date_debut_contrat').value = chef.date_debut_contrat || '';
        document.getElementById('date_fin_contrat').value = chef.date_fin_contrat || '';
        document.getElementById('raison_fin_contrat').value = chef.raison_fin_contrat || '';
        document.getElementById('chefForm').dataset.editId = chef.id;
        
        // Charger les planteurs et sélectionner ceux déjà assignés
        await loadPlanteurs();
        
        // Initialiser la validation
        initChefPlanteurFormValidation();
        
        // Sélectionner les planteurs déjà assignés à ce chef
        try {
            const data = await api.getPlanters({ size: 1000 });
            const select = document.getElementById('planteursSelect');
            data.items.forEach(planter => {
                if (planter.chef_planteur_id === chef.id) {
                    const option = select.querySelector(`option[value="${planter.id}"]`);
                    if (option) option.selected = true;
                }
            });
        } catch (error) {
            console.error('Erreur chargement planteurs assignés:', error);
        }
    }

    function closeModal() {
        document.getElementById('chefModal').classList.remove('show');
        document.getElementById('chefForm').reset();
    }

    // Charger les lieux pour l'autocomplétion
    async function loadLocationsAutocomplete() {
        try {
            const locations = await api.getUniqueLocations();
            const loadSelect = document.getElementById('loadLocationSelect');
            const unloadSelect = document.getElementById('unloadLocationSelect');
            
            loadSelect.innerHTML = '<option value="">Sélectionner...</option>';
            unloadSelect.innerHTML = '<option value="">Sélectionner...</option>';
            
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
            
            const otherLoadOption = document.createElement('option');
            otherLoadOption.value = '__other__';
            otherLoadOption.textContent = '➕ Autre...';
            loadSelect.appendChild(otherLoadOption);
            
            const otherUnloadOption = document.createElement('option');
            otherUnloadOption.value = '__other__';
            otherUnloadOption.textContent = '➕ Autre...';
            unloadSelect.appendChild(otherUnloadOption);
        } catch (error) {
            console.error('Erreur chargement lieux:', error);
        }
    }

    document.getElementById('addChefBtn').addEventListener('click', async () => {
        await openModal();
        await loadLocationsAutocomplete();
        initChefPlanteurFormValidation();
    });
    
    // Gestion du filtre de statut
    document.getElementById('statutFilter').addEventListener('change', (e) => {
        const filtre = e.target.value;
        
        if (filtre === 'tous') {
            table.clearFilter();
        } else if (filtre === 'exploites') {
            table.setFilter('est_exploite', '=', true);
        } else if (filtre === 'non-exploites') {
            table.setFilter('est_exploite', '=', false);
        }
    });

    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });
    
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
                if (pertes > loaded * 0.1) {
                    pertesField.style.color = '#dc3545';
                } else if (pertes > loaded * 0.05) {
                    pertesField.style.color = '#ffc107';
                } else {
                    pertesField.style.color = '#28a745';
                }
            }
        }
    });

    document.getElementById('chefForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Valider le formulaire avant soumission
        const validation = Validation.validateForm('chefForm', {
            name: [
                {
                    validate: (value) => Validation.isRequired(value),
                    message: 'Le nom est obligatoire'
                },
                {
                    validate: (value) => Validation.minLength(value, 2),
                    message: 'Le nom doit contenir au moins 2 caractères'
                }
            ],
            phone: [
                {
                    validate: (value) => !value || Validation.isValidPhone(value),
                    message: 'Format de téléphone invalide (ex: 0712345678)'
                }
            ],
            quantite_max: [
                {
                    validate: (value) => Validation.isRequired(value),
                    message: 'La quantité maximale est obligatoire'
                },
                {
                    validate: (value) => Validation.isValidQuantity(value),
                    message: 'La quantité doit être un nombre positif'
                }
            ]
        });

        if (!validation.isValid) {
            showToast('Veuillez corriger les erreurs dans le formulaire', 'error');
            return;
        }
        
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value || null,
            cni: document.getElementById('cni').value || null,
            cooperative: document.getElementById('cooperative').value || null,
            region: document.getElementById('region').value || null,
            departement: document.getElementById('departement').value || null,
            localite: document.getElementById('localite').value || null,
            quantite_max_kg: parseFloat(document.getElementById('quantite_max').value),
            date_debut_contrat: document.getElementById('date_debut_contrat').value || null,
            date_fin_contrat: document.getElementById('date_fin_contrat').value || null,
            raison_fin_contrat: document.getElementById('raison_fin_contrat').value || null
        };

        // Récupérer les planteurs sélectionnés
        const select = document.getElementById('planteursSelect');
        const selectedPlanteurs = Array.from(select.selectedOptions).map(option => option.value);

        try {
            const editId = document.getElementById('chefForm').dataset.editId;
            let chefId;
            
            if (editId) {
                await api.updateChefPlanteur(editId, formData);
                chefId = editId;
                showToast('Fournisseur modifié avec succès');
            } else {
                const result = await api.createChefPlanteur(formData);
                chefId = result.id;
                showToast('Fournisseur créé avec succès');
            }
            
            // Assigner les planteurs sélectionnés au chef
            if (selectedPlanteurs.length > 0) {
                let successCount = 0;
                for (const planterId of selectedPlanteurs) {
                    try {
                        await api.updatePlanter(planterId, { chef_planteur_id: chefId });
                        successCount++;
                    } catch (error) {
                        console.error(`Erreur assignation planteur ${planterId}:`, error);
                    }
                }
                if (successCount > 0) {
                    showToast(`${successCount} planteur(s) assigné(s) avec succès`);
                }
            }
            
            // Créer la livraison si les champs sont remplis
            const planteurLivraisonId = document.getElementById('planteurLivraisonSelect').value;
            const loadDate = document.getElementById('loadDate').value;
            const quantityLoadedKg = document.getElementById('quantityLoadedKg').value;
            const quantityKg = document.getElementById('quantityKg').value;
            
            if (planteurLivraisonId && loadDate && quantityLoadedKg && quantityKg) {
                const loadLocationSelect = document.getElementById('loadLocationSelect').value;
                const loadLocation = loadLocationSelect === '__other__' 
                    ? document.getElementById('loadLocationCustom').value 
                    : loadLocationSelect;
                    
                const unloadDate = document.getElementById('unloadDate').value;
                const unloadLocationSelect = document.getElementById('unloadLocationSelect').value;
                const unloadLocation = unloadLocationSelect === '__other__' 
                    ? document.getElementById('unloadLocationCustom').value 
                    : unloadLocationSelect;
                    
                const cocoaQuality = document.getElementById('cocoaQuality').value;
                
                const deliveryData = {
                    planter_id: planteurLivraisonId,
                    date: unloadDate || loadDate,
                    quantity_loaded_kg: parseFloat(quantityLoadedKg),
                    quantity_kg: parseFloat(quantityKg),
                    load_location: loadLocation || 'Non spécifié',
                    unload_location: unloadLocation || 'Non spécifié',
                    cocoa_quality: cocoaQuality || 'Standard',
                    notes: document.getElementById('deliveryNotes').value || `Première livraison du chef`
                };
                
                try {
                    await api.createDelivery(deliveryData);
                    showToast('Livraison créée avec succès');
                } catch (deliveryError) {
                    console.error('Erreur création livraison:', deliveryError);
                    showToast('Erreur lors de la création de la livraison', 'error');
                }
            }
            
            closeModal();
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    async function deleteChef(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
            try {
                await api.deleteChefPlanteur(id);
                showToast('Fournisseur supprimé avec succès');
                loadTable();
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    }

    if (currentUser.role === 'viewer') {
        document.getElementById('addChefBtn').style.display = 'none';
    }

    loadTable();
}
