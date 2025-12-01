async function loadDeliveriesPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📦 Livraisons</h2>
                <div class="actions">
                    <button id="exportExcelBtn" class="btn btn-success">📊 Export Excel</button>
                    <button id="exportPdfBtn" class="btn btn-danger">📄 Export PDF</button>
                    <button id="addDeliveryBtn" class="btn btn-primary">+ Nouvelle livraison</button>
                </div>
            </div>
            
            <div class="filters">
                <div class="filter-row">
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterFrom" class="filter-input">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterTo" class="filter-input">
                    </div>
                    <div class="form-group">
                        <label>Lieu chargement</label>
                        <select id="filterLoad" class="filter-input">
                            <option value="">Tous les lieux</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Lieu déchargement</label>
                        <select id="filterUnload" class="filter-input">
                            <option value="">Tous les lieux</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Qualité</label>
                        <select id="filterQuality" class="filter-input">
                            <option value="">Toutes les qualités</option>
                            <option value="Grade 1">Grade 1</option>
                            <option value="Grade 2">Grade 2</option>
                            <option value="Grade 3">Grade 3</option>
                            <option value="Premium">Premium</option>
                            <option value="Standard">Standard</option>
                        </select>
                    </div>
                </div>
                <button id="applyFiltersBtn" class="btn btn-primary">Appliquer les filtres</button>
            </div>
            
            <div id="deliveriesTable"></div>
        </div>
        
        <div id="deliveryModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Nouvelle livraison</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="deliveryForm">
                    <div class="form-group">
                        <label>Planteur *</label>
                        <select id="planterId" required></select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date livraison *</label>
                            <input type="date" id="date" required>
                        </div>
                        <div class="form-group">
                            <label>Quantité (kg) *</label>
                            <input type="number" id="quantityKg" step="0.01" min="0.01" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date chargement</label>
                            <input type="date" id="loadDate">
                        </div>
                        <div class="form-group">
                            <label>Date déchargement</label>
                            <input type="date" id="unloadDate">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Lieu chargement *</label>
                            <select id="loadLocationSelect" required>
                                <option value="">Sélectionner...</option>
                            </select>
                            <input type="text" id="loadLocationCustom" placeholder="Nouveau lieu..." style="display:none; margin-top: 5px;">
                        </div>
                        <div class="form-group">
                            <label>Lieu déchargement *</label>
                            <select id="unloadLocationSelect" required>
                                <option value="">Sélectionner...</option>
                            </select>
                            <input type="text" id="unloadLocationCustom" placeholder="Nouveau lieu..." style="display:none; margin-top: 5px;">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Qualité cacao *</label>
                        <select id="cocoaQuality" required>
                            <option value="Grade 1">Grade 1</option>
                            <option value="Grade 2">Grade 2</option>
                            <option value="Grade 3">Grade 3</option>
                            <option value="Premium">Premium</option>
                            <option value="Standard">Standard</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="notes" rows="3"></textarea>
                    </div>
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                        <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    let currentFilters = {};
    let table;

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
                customInput.required = true;
                e.target.required = false;
            } else {
                customInput.style.display = 'none';
                customInput.required = false;
                e.target.required = true;
            }
        }
        
        if (e.target.id === 'unloadLocationSelect') {
            const customInput = document.getElementById('unloadLocationCustom');
            if (e.target.value === '__other__') {
                customInput.style.display = 'block';
                customInput.required = true;
                e.target.required = false;
            } else {
                customInput.style.display = 'none';
                customInput.required = false;
                e.target.required = true;
            }
        }
    });

    async function loadPlantersSelect() {
        const planters = await api.getPlanters({ size: 1000 });
        const select = document.getElementById('planterId');
        select.innerHTML = '<option value="">Sélectionner...</option>';
        planters.items.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    async function loadTable() {
        const data = await api.getDeliveries({ ...currentFilters, size: 1000 });
        
        const planters = await api.getPlanters({ size: 1000 });
        
        // Mettre en cache les planteurs pour utilisation offline
        if (window.offlineManager && navigator.onLine) {
            window.offlineManager.cachePlanters(planters.items || planters);
        }
        
        const planterMap = {};
        (planters.items || planters).forEach(p => planterMap[p.id] = p.name);
        
        let tableData = data.items.map(d => ({
            ...d,
            planter_name: planterMap[d.planter_id] || 'N/A',
            synced: true
        }));
        
        // Ajouter les livraisons offline non synchronisées
        if (window.offlineManager) {
            const offlineDeliveries = await window.offlineManager.getOfflineDeliveries();
            const offlineData = offlineDeliveries.map(d => ({
                ...d,
                id: d.localId,
                planter_name: planterMap[d.planter_id] || 'N/A',
                synced: false
            }));
            tableData = [...offlineData, ...tableData];
        }

        if (table) {
            table.setData(tableData);
        } else {
            table = new Tabulator("#deliveriesTable", {
                data: tableData,
                layout: "fitColumns",
                pagination: true,
                paginationSize: 20,
                columns: [
                    {title: "Statut", field: "synced", width: 80, formatter: (cell) => {
                        return cell.getValue() ? '✅' : '⏳ Offline';
                    }},
                    {title: "Planteur", field: "planter_name"},
                    {title: "Date livr.", field: "date"},
                    {title: "Date charg.", field: "load_date", formatter: (cell) => cell.getValue() || '-'},
                    {title: "Date déch.", field: "unload_date", formatter: (cell) => cell.getValue() || '-'},
                    {title: "Qté (kg)", field: "quantity_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Lieu charg.", field: "load_location"},
                    {title: "Lieu déch.", field: "unload_location"},
                    {title: "Qualité", field: "cocoa_quality"},
                    {title: "Actions", formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const canEdit = currentUser.role !== 'viewer' && row.synced;
                        return canEdit ? '<button class="btn-edit">✏️</button> <button class="btn-delete">🗑️</button>' : '';
                    }, cellClick: handleTableAction}
                ]
            });
        }
    }

    function handleTableAction(e, cell) {
        const row = cell.getRow().getData();
        if (e.target.classList.contains('btn-edit')) {
            openEditModal(row);
        } else if (e.target.classList.contains('btn-delete')) {
            deleteDelivery(row.id);
        }
    }

    function openModal() {
        document.getElementById('deliveryModal').classList.add('show');
        loadPlantersSelect();
        loadLocationsAutocomplete();
    }

    function closeModal() {
        document.getElementById('deliveryModal').classList.remove('show');
        document.getElementById('deliveryForm').reset();
    }

    function openEditModal(delivery) {
        document.getElementById('modalTitle').textContent = 'Modifier la livraison';
        document.getElementById('planterId').value = delivery.planter_id;
        document.getElementById('date').value = delivery.date;
        document.getElementById('loadDate').value = delivery.load_date || '';
        document.getElementById('unloadDate').value = delivery.unload_date || '';
        document.getElementById('quantityKg').value = delivery.quantity_kg;
        
        // Gérer le lieu de chargement
        const loadSelect = document.getElementById('loadLocationSelect');
        const loadOption = Array.from(loadSelect.options).find(opt => opt.value === delivery.load_location);
        if (loadOption) {
            loadSelect.value = delivery.load_location;
        } else {
            loadSelect.value = '__other__';
            document.getElementById('loadLocationCustom').value = delivery.load_location;
            document.getElementById('loadLocationCustom').style.display = 'block';
            document.getElementById('loadLocationCustom').required = true;
            loadSelect.required = false;
        }
        
        // Gérer le lieu de déchargement
        const unloadSelect = document.getElementById('unloadLocationSelect');
        const unloadOption = Array.from(unloadSelect.options).find(opt => opt.value === delivery.unload_location);
        if (unloadOption) {
            unloadSelect.value = delivery.unload_location;
        } else {
            unloadSelect.value = '__other__';
            document.getElementById('unloadLocationCustom').value = delivery.unload_location;
            document.getElementById('unloadLocationCustom').style.display = 'block';
            document.getElementById('unloadLocationCustom').required = true;
            unloadSelect.required = false;
        }
        
        document.getElementById('cocoaQuality').value = delivery.cocoa_quality;
        document.getElementById('notes').value = delivery.notes || '';
        document.getElementById('deliveryForm').dataset.editId = delivery.id;
        openModal();
    }

    async function deleteDelivery(id) {
        if (!confirm('Supprimer cette livraison ?')) return;
        try {
            await api.deleteDelivery(id);
            showToast('Livraison supprimée');
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    document.getElementById('addDeliveryBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Nouvelle livraison';
        delete document.getElementById('deliveryForm').dataset.editId;
        openModal();
    });

    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    document.getElementById('deliveryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Récupérer les lieux (soit du select, soit du champ personnalisé)
        const loadLocationSelect = document.getElementById('loadLocationSelect').value;
        const loadLocation = loadLocationSelect === '__other__' 
            ? document.getElementById('loadLocationCustom').value 
            : loadLocationSelect;
            
        const unloadLocationSelect = document.getElementById('unloadLocationSelect').value;
        const unloadLocation = unloadLocationSelect === '__other__' 
            ? document.getElementById('unloadLocationCustom').value 
            : unloadLocationSelect;
        
        const loadDateValue = document.getElementById('loadDate').value;
        const unloadDateValue = document.getElementById('unloadDate').value;
        
        const formData = {
            planter_id: document.getElementById('planterId').value,
            date: document.getElementById('date').value,
            load_date: loadDateValue || null,
            unload_date: unloadDateValue || null,
            quantity_kg: parseFloat(document.getElementById('quantityKg').value),
            load_location: loadLocation,
            unload_location: unloadLocation,
            cocoa_quality: document.getElementById('cocoaQuality').value,
            notes: document.getElementById('notes').value || null
        };

        try {
            const editId = document.getElementById('deliveryForm').dataset.editId;
            if (editId) {
                await api.updateDelivery(editId, formData);
                showToast('Livraison modifiée');
            } else {
                // Vérifier si on est en mode offline
                if (!navigator.onLine && window.offlineManager) {
                    // Créer la livraison en mode offline
                    await window.offlineManager.createOfflineDelivery(formData);
                    showToast('✅ Livraison sauvegardée en mode offline. Elle sera synchronisée automatiquement.', 'warning');
                } else {
                    // Mode online normal
                    await api.createDelivery(formData);
                    showToast('Livraison créée');
                }
            }
            closeModal();
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined,
            load: document.getElementById('filterLoad').value || undefined,
            unload: document.getElementById('filterUnload').value || undefined,
            quality: document.getElementById('filterQuality').value || undefined
        };
        loadTable();
    });

    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        const url = api.getExportExcelUrl(currentFilters);
        api.downloadFile(url);
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
        const url = api.getExportPdfUrl(currentFilters);
        api.downloadFile(url);
    });

    if (currentUser.role === 'viewer') {
        document.getElementById('addDeliveryBtn').style.display = 'none';
    }

    // Charger les lieux pour les filtres
    async function loadFilterLocations() {
        try {
            const locations = await api.getUniqueLocations();
            const filterLoadSelect = document.getElementById('filterLoad');
            const filterUnloadSelect = document.getElementById('filterUnload');
            
            locations.load_locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc;
                option.textContent = loc;
                filterLoadSelect.appendChild(option);
            });
            
            locations.unload_locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc;
                option.textContent = loc;
                filterUnloadSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des lieux:', error);
        }
    }

    loadTable();
    loadFilterLocations();
}
