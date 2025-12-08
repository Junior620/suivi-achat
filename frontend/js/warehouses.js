// Gestion des entrepôts et stocks

let warehousesTable = null;
let movementsTable = null;

async function loadWarehousesPage(container) {
    container.innerHTML = `
        <div class="warehouses-container">
            <div class="page-header">
                <h2>🏭 Gestion des Stocks</h2>
                <div class="header-actions">
                    <button onclick="showStockAlerts()" class="btn btn-warning">
                        🔔 Alertes Stock
                    </button>
                    <button onclick="openWarehouseModal()" class="btn btn-primary">
                        + Nouvel Entrepôt
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Stock Total</div>
                        <div class="kpi-value" id="totalStock">0 kg</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🏭</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Entrepôts Actifs</div>
                        <div class="kpi-value" id="activeWarehouses">0</div>
                    </div>
                </div>
                <div class="kpi-card alert">
                    <div class="kpi-icon">⚠️</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Alertes Stock Bas</div>
                        <div class="kpi-value" id="stockAlerts">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Taux de Remplissage</div>
                        <div class="kpi-value" id="fillRate">0%</div>
                    </div>
                </div>
            </div>

            <!-- Liste des entrepôts -->
            <div class="card">
                <div class="card-header">
                    <h3>📋 Entrepôts</h3>
                </div>
                <div id="warehousesTable"></div>
            </div>

            <!-- Mouvements récents -->
            <div class="card">
                <div class="card-header">
                    <h3>📝 Mouvements Récents</h3>
                    <button onclick="openMovementModal()" class="btn btn-secondary">
                        + Nouveau Mouvement
                    </button>
                </div>
                <div id="movementsTable"></div>
            </div>
        </div>

        <!-- Modal Entrepôt -->
        <div id="warehouseModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouvel Entrepôt</h3>
                    <span class="close" onclick="closeWarehouseModal()">&times;</span>
                </div>
                <form id="warehouseForm">
                    <div class="form-group">
                        <label>Nom *</label>
                        <input type="text" id="warehouseName" required>
                    </div>
                    <div class="form-group">
                        <label>Localisation *</label>
                        <input type="text" id="warehouseLocation" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Capacité (kg) *</label>
                            <input type="number" id="warehouseCapacity" required min="0">
                        </div>
                        <div class="form-group">
                            <label>Seuil d'alerte (kg) *</label>
                            <input type="number" id="warehouseThreshold" required min="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Responsable</label>
                            <input type="text" id="warehouseManager">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="warehousePhone">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="closeWarehouseModal()" class="btn btn-secondary">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Mouvement -->
        <div id="movementModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouveau Mouvement de Stock</h3>
                    <span class="close" onclick="closeMovementModal()">&times;</span>
                </div>
                <form id="movementForm">
                    <div class="form-group">
                        <label>Entrepôt *</label>
                        <select id="movementWarehouse" required></select>
                    </div>
                    <div class="form-group">
                        <label>Type de mouvement *</label>
                        <select id="movementType" required onchange="handleMovementTypeChange()">
                            <option value="entry">Entrée (Livraison)</option>
                            <option value="exit">Sortie (Vente/Expédition)</option>
                            <option value="transfer">Transfert</option>
                            <option value="adjustment">Ajustement</option>
                            <option value="loss">Perte</option>
                        </select>
                    </div>
                    <div id="transferFields" style="display: none;">
                        <div class="form-group">
                            <label>Vers l'entrepôt *</label>
                            <select id="toWarehouse"></select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Quantité (kg) *</label>
                            <input type="number" id="movementQuantity" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Qualité</label>
                            <select id="movementQuality">
                                <option value="">Non spécifié</option>
                                <option value="Grade A">Grade A</option>
                                <option value="Grade B">Grade B</option>
                                <option value="Grade C">Grade C</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="movementReference" placeholder="N° bon, facture...">
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="movementNotes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="closeMovementModal()" class="btn btn-secondary">Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadWarehouses();
    await loadRecentMovements();
    setupEventListeners();
}

async function loadWarehouses() {
    try {
        const warehouses = await api.request('/warehouses');
        
        // Calculer les KPIs
        const totalStock = warehouses.reduce((sum, w) => sum + w.current_stock_kg, 0);
        const activeWarehouses = warehouses.filter(w => w.is_active === 'true').length;
        const alerts = warehouses.filter(w => w.alert_status !== 'ok').length;
        const totalCapacity = warehouses.reduce((sum, w) => sum + w.capacity_kg, 0);
        const fillRate = totalCapacity > 0 ? (totalStock / totalCapacity * 100).toFixed(1) : 0;
        
        document.getElementById('totalStock').textContent = `${totalStock.toLocaleString('fr-FR')} kg`;
        document.getElementById('activeWarehouses').textContent = activeWarehouses;
        document.getElementById('stockAlerts').textContent = alerts;
        document.getElementById('fillRate').textContent = `${fillRate}%`;
        
        // Créer le tableau
        if (warehousesTable) {
            warehousesTable.setData(warehouses);
        } else {
            warehousesTable = new Tabulator("#warehousesTable", {
                data: warehouses,
                layout: "fitColumns",
                columns: [
                    {title: "Nom", field: "name", minWidth: 200},
                    {title: "Localisation", field: "location", minWidth: 150},
                    {title: "Stock Actuel", field: "current_stock_kg", formatter: (cell) => {
                        const value = cell.getValue();
                        return `${parseFloat(value).toLocaleString('fr-FR')} kg`;
                    }},
                    {title: "Capacité", field: "capacity_kg", formatter: (cell) => {
                        return `${parseFloat(cell.getValue()).toLocaleString('fr-FR')} kg`;
                    }},
                    {title: "Remplissage", field: "stock_percentage", formatter: (cell) => {
                        const value = cell.getValue();
                        const color = value > 80 ? '#dc3545' : value > 50 ? '#ffc107' : '#28a745';
                        return `<span style="color: ${color}; font-weight: bold;">${value.toFixed(1)}%</span>`;
                    }},
                    {title: "Statut", field: "alert_status", formatter: (cell) => {
                        const value = cell.getValue();
                        const badges = {
                            'ok': '<span class="badge badge-success">✓ OK</span>',
                            'warning': '<span class="badge badge-warning">⚠ Attention</span>',
                            'critical': '<span class="badge badge-danger">🔴 Critique</span>'
                        };
                        return badges[value] || value;
                    }},
                    {title: "Responsable", field: "manager_name", formatter: (cell) => cell.getValue() || '-'},
                    {
                        title: "Actions", 
                        width: 150,
                        hozAlign: "center",
                        headerSort: false,
                        formatter: (cell) => {
                            return `
                                <button class="btn-sm btn-primary btn-view" style="background: #007bff; color: white; border: none; padding: 5px 10px; margin: 2px; border-radius: 4px; cursor: pointer;">&#128065;</button>
                                <button class="btn-sm btn-warning btn-edit" style="background: #ffc107; color: white; border: none; padding: 5px 10px; margin: 2px; border-radius: 4px; cursor: pointer;">&#9998;</button>
                                <button class="btn-sm btn-danger btn-delete" style="background: #dc3545; color: white; border: none; padding: 5px 10px; margin: 2px; border-radius: 4px; cursor: pointer;">&#128465;</button>
                            `;
                        }, 
                        cellClick: async (e, cell) => {
                            const warehouse = cell.getRow().getData();
                            if (e.target.classList.contains('btn-view')) {
                                viewWarehouseDetails(warehouse);
                            } else if (e.target.classList.contains('btn-edit')) {
                                editWarehouse(warehouse);
                            } else if (e.target.classList.contains('btn-delete')) {
                                await deleteWarehouse(warehouse);
                            }
                        }
                    }
                ]
            });
        }
    } catch (error) {
        console.error('Erreur chargement entrepôts:', error);
        showToast('Erreur chargement des entrepôts', 'error');
    }
}

async function loadRecentMovements() {
    try {
        // Charger les mouvements de tous les entrepôts (à implémenter côté API)
        // Pour l'instant, on affiche un message
        document.getElementById('movementsTable').innerHTML = `
            <p class="text-muted">Sélectionnez un entrepôt pour voir ses mouvements</p>
        `;
    } catch (error) {
        console.error('Erreur chargement mouvements:', error);
    }
}

let editingWarehouseId = null;

function openWarehouseModal() {
    editingWarehouseId = null;
    document.querySelector('#warehouseModal h3').textContent = 'Nouvel Entrepôt';
    document.getElementById('warehouseModal').classList.add('show');
}

function closeWarehouseModal() {
    editingWarehouseId = null;
    document.getElementById('warehouseModal').classList.remove('show');
    document.getElementById('warehouseForm').reset();
}

function editWarehouse(warehouse) {
    editingWarehouseId = warehouse.id;
    document.querySelector('#warehouseModal h3').textContent = 'Modifier l\'Entrepôt';
    
    document.getElementById('warehouseName').value = warehouse.name;
    document.getElementById('warehouseLocation').value = warehouse.location;
    document.getElementById('warehouseCapacity').value = warehouse.capacity_kg;
    document.getElementById('warehouseThreshold').value = warehouse.alert_threshold_kg;
    document.getElementById('warehouseManager').value = warehouse.manager_name || '';
    document.getElementById('warehousePhone').value = warehouse.phone || '';
    
    document.getElementById('warehouseModal').classList.add('show');
}

async function deleteWarehouse(warehouse) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entrepôt "${warehouse.name}" ?\n\nCette action est irréversible et supprimera également tous les mouvements de stock associés.`)) {
        return;
    }
    
    try {
        await api.request(`/warehouses/${warehouse.id}`, {
            method: 'DELETE'
        });
        
        showToast('✅ Entrepôt supprimé avec succès', 'success');
        await loadWarehouses();
    } catch (error) {
        console.error('Erreur suppression entrepôt:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

function openMovementModal() {
    loadWarehouseOptions();
    document.getElementById('movementModal').classList.add('show');
}

function closeMovementModal() {
    document.getElementById('movementModal').classList.remove('show');
    document.getElementById('movementForm').reset();
}

async function loadWarehouseOptions() {
    try {
        const warehouses = await api.request('/warehouses');
        const select1 = document.getElementById('movementWarehouse');
        const select2 = document.getElementById('toWarehouse');
        
        const options = warehouses.map(w => 
            `<option value="${w.id}">${w.name}</option>`
        ).join('');
        
        select1.innerHTML = '<option value="">Sélectionner...</option>' + options;
        select2.innerHTML = '<option value="">Sélectionner...</option>' + options;
    } catch (error) {
        console.error('Erreur chargement options:', error);
    }
}

function handleMovementTypeChange() {
    const type = document.getElementById('movementType').value;
    const transferFields = document.getElementById('transferFields');
    transferFields.style.display = type === 'transfer' ? 'block' : 'none';
}

async function showStockAlerts() {
    try {
        const alerts = await api.request('/warehouses/alerts');
        
        if (alerts.length === 0) {
            showToast('✅ Aucune alerte de stock', 'success');
            return;
        }
        
        let html = '<div class="alerts-list">';
        alerts.forEach(alert => {
            const icon = alert.alert_level === 'critical' ? '🔴' : '⚠️';
            const color = alert.alert_level === 'critical' ? '#dc3545' : '#ffc107';
            html += `
                <div class="alert-item" style="border-left: 4px solid ${color}; padding: 15px; margin: 10px 0; background: #f8f9fa;">
                    <strong>${icon} ${alert.warehouse_name}</strong>
                    <p>${alert.message}</p>
                </div>
            `;
        });
        html += '</div>';
        
        showModal('Alertes de Stock', html);
    } catch (error) {
        console.error('Erreur chargement alertes:', error);
        showToast('Erreur chargement des alertes', 'error');
    }
}

async function viewWarehouseDetails(warehouse) {
    try {
        // Charger les mouvements de cet entrepôt
        const movements = await api.request(`/warehouses/${warehouse.id}/movements`);
        
        // Déterminer la couleur du statut
        const statusColors = {
            'ok': '#28a745',
            'warning': '#ffc107',
            'critical': '#dc3545'
        };
        const statusLabels = {
            'ok': '✓ Stock Normal',
            'warning': '⚠ Stock Faible',
            'critical': '🔴 Stock Critique'
        };
        const statusColor = statusColors[warehouse.alert_status] || '#6c757d';
        const statusLabel = statusLabels[warehouse.alert_status] || warehouse.alert_status;
        
        let html = `
            <div class="warehouse-details" style="padding: 20px;">
                <!-- En-tête avec badge de statut -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 25px;">
                    <div>
                        <h2 style="margin: 0 0 5px 0; color: #2D5016;">🏭 ${warehouse.name}</h2>
                        <p style="margin: 0; color: #666;">📍 ${warehouse.location}</p>
                    </div>
                    <div style="background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                        ${statusLabel}
                    </div>
                </div>
                
                <!-- KPIs en grille -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">📦 Stock Actuel</div>
                        <div style="font-size: 28px; font-weight: bold;">${warehouse.current_stock_kg.toLocaleString('fr-FR')}</div>
                        <div style="font-size: 12px; opacity: 0.8;">kilogrammes</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">📊 Capacité Max</div>
                        <div style="font-size: 28px; font-weight: bold;">${warehouse.capacity_kg.toLocaleString('fr-FR')}</div>
                        <div style="font-size: 12px; opacity: 0.8;">kilogrammes</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">📈 Taux Remplissage</div>
                        <div style="font-size: 28px; font-weight: bold;">${warehouse.stock_percentage.toFixed(1)}%</div>
                        <div style="font-size: 12px; opacity: 0.8;">de la capacité</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">⚠️ Seuil Alerte</div>
                        <div style="font-size: 28px; font-weight: bold;">${warehouse.alert_threshold_kg.toLocaleString('fr-FR')}</div>
                        <div style="font-size: 12px; opacity: 0.8;">kilogrammes</div>
                    </div>
                </div>
                
                <!-- Barre de progression visuelle -->
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: #333;">Niveau de Stock</span>
                        <span style="font-weight: 600; color: ${statusColor};">${warehouse.current_stock_kg.toLocaleString('fr-FR')} / ${warehouse.capacity_kg.toLocaleString('fr-FR')} kg</span>
                    </div>
                    <div style="background: #e9ecef; height: 30px; border-radius: 15px; overflow: hidden; position: relative;">
                        <div style="background: linear-gradient(90deg, ${statusColor}, ${statusColor}dd); height: 100%; width: ${Math.min(warehouse.stock_percentage, 100)}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: bold; font-size: 14px;">
                            ${warehouse.stock_percentage.toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <!-- Informations supplémentaires -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <strong style="color: #666;">👤 Responsable:</strong>
                            <span style="margin-left: 8px;">${warehouse.manager_name || 'Non assigné'}</span>
                        </div>
                        <div>
                            <strong style="color: #666;">📞 Contact:</strong>
                            <span style="margin-left: 8px;">${warehouse.phone || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Mouvements récents -->
                <div style="margin-top: 30px;">
                    <h3 style="color: #2D5016; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        📝 Mouvements Récents
                        <span style="background: #e9ecef; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: normal;">${movements.length}</span>
                    </h3>
                    
                    ${movements.length === 0 ? `
                        <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px; color: #666;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                            <p style="margin: 0;">Aucun mouvement enregistré</p>
                        </div>
                    ` : `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${movements.map(m => {
                                const typeLabels = {
                                    'entry': { icon: '📥', label: 'Entrée', color: '#28a745' },
                                    'exit': { icon: '📤', label: 'Sortie', color: '#dc3545' },
                                    'transfer': { icon: '🔄', label: 'Transfert', color: '#007bff' },
                                    'adjustment': { icon: '⚙️', label: 'Ajustement', color: '#6c757d' },
                                    'loss': { icon: '❌', label: 'Perte', color: '#dc3545' }
                                };
                                const type = typeLabels[m.movement_type] || { icon: '📦', label: m.movement_type, color: '#6c757d' };
                                const qtyColor = m.quantity_kg > 0 ? '#28a745' : '#dc3545';
                                
                                return `
                                    <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; transition: box-shadow 0.2s; cursor: pointer;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div style="flex: 1;">
                                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                                    <span style="background: ${type.color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                                        ${type.icon} ${type.label}
                                                    </span>
                                                    <span style="color: #666; font-size: 14px;">
                                                        ${new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div style="display: flex; gap: 20px; font-size: 14px; color: #666;">
                                                    ${m.quality ? `<span>⭐ ${m.quality}</span>` : ''}
                                                    ${m.reference ? `<span>📋 ${m.reference}</span>` : ''}
                                                    ${m.notes ? `<span>💬 ${m.notes}</span>` : ''}
                                                </div>
                                            </div>
                                            <div style="text-align: right;">
                                                <div style="font-size: 24px; font-weight: bold; color: ${qtyColor};">
                                                    ${m.quantity_kg > 0 ? '+' : ''}${parseFloat(m.quantity_kg).toLocaleString('fr-FR')}
                                                </div>
                                                <div style="font-size: 12px; color: #666;">kilogrammes</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        
        showModal(``, html);
    } catch (error) {
        console.error('Erreur chargement détails:', error);
        showToast('Erreur chargement des détails', 'error');
    }
}

function setupEventListeners() {
    const form = document.getElementById('warehouseForm');
    if (!form) return; // Pas sur la page warehouses
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('warehouseName').value,
            location: document.getElementById('warehouseLocation').value,
            capacity_kg: parseFloat(document.getElementById('warehouseCapacity').value),
            alert_threshold_kg: parseFloat(document.getElementById('warehouseThreshold').value),
            manager_name: document.getElementById('warehouseManager').value || null,
            phone: document.getElementById('warehousePhone').value || null
        };
        
        try {
            if (editingWarehouseId) {
                // Mode édition
                await api.request(`/warehouses/${editingWarehouseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showToast('✅ Entrepôt modifié avec succès', 'success');
            } else {
                // Mode création
                await api.request('/warehouses', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast('✅ Entrepôt créé avec succès', 'success');
            }
            
            closeWarehouseModal();
            await loadWarehouses();
        } catch (error) {
            console.error('Erreur sauvegarde entrepôt:', error);
            showToast('Erreur lors de la sauvegarde', 'error');
        }
    });
    
    document.getElementById('movementForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            warehouse_id: document.getElementById('movementWarehouse').value,
            movement_type: document.getElementById('movementType').value,
            quantity_kg: parseFloat(document.getElementById('movementQuantity').value),
            quality: document.getElementById('movementQuality').value || null,
            reference: document.getElementById('movementReference').value || null,
            notes: document.getElementById('movementNotes').value || null
        };
        
        if (data.movement_type === 'transfer') {
            data.to_warehouse_id = document.getElementById('toWarehouse').value;
        }
        
        try {
            await api.request('/warehouses/movements', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            showToast('✅ Mouvement enregistré', 'success');
            closeMovementModal();
            await loadWarehouses();
            await loadRecentMovements();
        } catch (error) {
            console.error('Erreur création mouvement:', error);
            showToast('Erreur lors de l\'enregistrement', 'error');
        }
    });
}

function showModal(title, content) {
    // Fonction utilitaire pour afficher un modal simple
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">${content}</div>
        </div>
    `;
    document.body.appendChild(modal);
}
