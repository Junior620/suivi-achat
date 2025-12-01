// Gestion des paiements aux planteurs

let paymentsTable = null;

async function loadPaymentsPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">💰 Gestion des Paiements</h2>
                <div class="actions">
                    <button id="viewBalancesBtn" class="btn btn-secondary">📊 Voir les Soldes</button>
                    <button id="addPaymentBtn" class="btn btn-primary">+ Nouveau Paiement</button>
                </div>
            </div>
            
            <div class="advanced-filters">
                <h4>🔍 Filtres</h4>
                <div class="filter-grid">
                    <div class="form-group">
                        <label>Planteur</label>
                        <select id="filterPlanter" class="filter-input">
                            <option value="">Tous les planteurs</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Méthode</label>
                        <select id="filterMethode" class="filter-input">
                            <option value="">Toutes</option>
                            <option value="virement">Virement</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Chèque</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="filterStatut" class="filter-input">
                            <option value="">Tous</option>
                            <option value="completed">Complété</option>
                            <option value="pending">En attente</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterDateFrom" class="filter-input">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterDateTo" class="filter-input">
                    </div>
                </div>
                <div class="filter-actions">
                    <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
                    <button id="clearFiltersBtn" class="btn btn-secondary">Réinitialiser</button>
                </div>
            </div>
            
            <div id="paymentsTable"></div>
        </div>
        
        <!-- Modal Nouveau Paiement -->
        <div id="paymentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouveau Paiement</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="paymentForm">
                    <div class="form-group">
                        <label>Planteur *</label>
                        <select id="planterId" required></select>
                    </div>
                    
                    <div class="form-group">
                        <label>Livraison associée (optionnel)</label>
                        <select id="deliveryId">
                            <option value="">Aucune</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Montant (FCFA) *</label>
                            <input type="number" id="montant" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Date de paiement *</label>
                            <input type="date" id="datePaiement" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Méthode *</label>
                            <select id="methode" required>
                                <option value="virement">Virement</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Chèque</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Référence (N° transaction/chèque)</label>
                            <input type="text" id="reference" placeholder="Ex: TRX123456">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="notes" rows="3" placeholder="Notes additionnelles..."></textarea>
                    </div>
                    
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal Soldes -->
        <div id="balancesModal" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>📊 Soldes des Planteurs</h3>
                    <span class="close">&times;</span>
                </div>
                <div id="balancesTable"></div>
            </div>
        </div>
    `;

    await loadPlantersSelect();
    await loadPaymentsTable();
    setupEventListeners();
}

async function loadPlantersSelect() {
    try {
        const planters = await api.getPlanters({ size: 1000 });
        const planterSelect = document.getElementById('planterId');
        const filterSelect = document.getElementById('filterPlanter');
        
        planterSelect.innerHTML = '<option value="">Sélectionner...</option>';
        filterSelect.innerHTML = '<option value="">Tous les planteurs</option>';
        
        (planters.items || planters).forEach(p => {
            planterSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            filterSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    } catch (error) {
        console.error('Erreur chargement planteurs:', error);
    }
}

async function loadPaymentsTable(filters = {}) {
    try {
        const payments = await api.getPayments(filters);
        
        if (paymentsTable) {
            paymentsTable.setData(payments);
        } else {
            paymentsTable = new Tabulator("#paymentsTable", {
                data: payments,
                layout: "fitColumns",
                pagination: true,
                paginationSize: 20,
                columns: [
                    {title: "Date", field: "date_paiement", sorter:"date"},
                    {title: "Planteur", field: "planter_name"},
                    {title: "Montant", field: "montant", formatter: (cell) => {
                        return `${parseFloat(cell.getValue()).toLocaleString('fr-FR')} FCFA`;
                    }},
                    {title: "Méthode", field: "methode", formatter: (cell) => {
                        const methode = cell.getValue();
                        const icons = {
                            'virement': '🏦',
                            'cash': '💵',
                            'cheque': '📝'
                        };
                        return `${icons[methode] || ''} ${methode}`;
                    }},
                    {title: "Référence", field: "reference", formatter: (cell) => cell.getValue() || '-'},
                    {title: "Statut", field: "statut", formatter: (cell) => {
                        const statut = cell.getValue();
                        const badges = {
                            'completed': '<span style="background: #27AE60; color: white; padding: 4px 8px; border-radius: 4px;">✓ Complété</span>',
                            'pending': '<span style="background: #F39C12; color: white; padding: 4px 8px; border-radius: 4px;">⏳ En attente</span>',
                            'cancelled': '<span style="background: #C0392B; color: white; padding: 4px 8px; border-radius: 4px;">✗ Annulé</span>'
                        };
                        return badges[statut] || statut;
                    }},
                    {title: "Actions", formatter: () => {
                        const canEdit = currentUser.role !== 'viewer';
                        return canEdit ? '<button class="btn-delete">🗑️</button>' : '';
                    }, cellClick: handleTableAction}
                ]
            });
        }
    } catch (error) {
        console.error('Erreur chargement paiements:', error);
        showToast('Erreur chargement des paiements', 'error');
    }
}

function setupEventListeners() {
    document.getElementById('addPaymentBtn').addEventListener('click', openPaymentModal);
    document.getElementById('viewBalancesBtn').addEventListener('click', showBalances);
    
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePayment();
    });
    
    document.getElementById('planterId').addEventListener('change', async (e) => {
        await loadDeliveriesForPlanter(e.target.value);
    });
    
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        const filters = {
            planter_id: document.getElementById('filterPlanter').value || undefined,
            methode: document.getElementById('filterMethode').value || undefined,
            statut: document.getElementById('filterStatut').value || undefined,
            date_from: document.getElementById('filterDateFrom').value || undefined,
            date_to: document.getElementById('filterDateTo').value || undefined
        };
        loadPaymentsTable(filters);
    });
    
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('filterPlanter').value = '';
        document.getElementById('filterMethode').value = '';
        document.getElementById('filterStatut').value = '';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        loadPaymentsTable();
    });
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
}

async function loadDeliveriesForPlanter(planterId) {
    const deliverySelect = document.getElementById('deliveryId');
    deliverySelect.innerHTML = '<option value="">Aucune</option>';
    
    if (!planterId) return;
    
    try {
        const deliveries = await api.getDeliveries({ planter_id: planterId, size: 100 });
        (deliveries.items || deliveries).forEach(d => {
            deliverySelect.innerHTML += `<option value="${d.id}">${d.date} - ${d.quantity_kg} kg</option>`;
        });
    } catch (error) {
        console.error('Erreur chargement livraisons:', error);
    }
}

function openPaymentModal() {
    document.getElementById('paymentModal').classList.add('show');
    document.getElementById('datePaiement').valueAsDate = new Date();
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('paymentForm').reset();
}

async function savePayment() {
    const formData = {
        planter_id: document.getElementById('planterId').value,
        delivery_id: document.getElementById('deliveryId').value || null,
        montant: parseFloat(document.getElementById('montant').value),
        methode: document.getElementById('methode').value,
        statut: 'completed',
        date_paiement: document.getElementById('datePaiement').value,
        reference: document.getElementById('reference').value || null,
        notes: document.getElementById('notes').value || null
    };
    
    try {
        await api.createPayment(formData);
        showToast('Paiement enregistré avec succès', 'success');
        closeModal();
        loadPaymentsTable();
    } catch (error) {
        console.error('Erreur enregistrement paiement:', error);
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function showBalances() {
    try {
        const balances = await api.getBalances();
        
        let html = `
            <table class="simple-table">
                <thead>
                    <tr>
                        <th>Planteur</th>
                        <th>Volume Total (kg)</th>
                        <th>Nb Livraisons</th>
                        <th>Total Paiements (FCFA)</th>
                        <th>Nb Paiements</th>
                        <th>Dernière Livraison</th>
                        <th>Dernier Paiement</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        balances.forEach(b => {
            html += `
                <tr>
                    <td><strong>${b.planter_name}</strong></td>
                    <td>${b.total_livraisons_kg.toLocaleString('fr-FR', {maximumFractionDigits: 0})}</td>
                    <td>${b.nombre_livraisons}</td>
                    <td>${b.total_paiements.toLocaleString('fr-FR', {maximumFractionDigits: 0})}</td>
                    <td>${b.nombre_paiements}</td>
                    <td>${b.derniere_livraison || '-'}</td>
                    <td>${b.dernier_paiement || '-'}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        document.getElementById('balancesTable').innerHTML = html;
        document.getElementById('balancesModal').classList.add('show');
    } catch (error) {
        console.error('Erreur chargement soldes:', error);
        showToast('Erreur chargement des soldes', 'error');
    }
}

async function handleTableAction(e, cell) {
    if (e.target.classList.contains('btn-delete')) {
        const row = cell.getRow().getData();
        if (confirm(`Supprimer ce paiement de ${row.montant} FCFA ?`)) {
            try {
                await api.deletePayment(row.id);
                showToast('Paiement supprimé', 'success');
                loadPaymentsTable();
            } catch (error) {
                showToast('Erreur suppression', 'error');
            }
        }
    }
}
