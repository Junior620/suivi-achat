// Module Paiements - Version simplifiée

let paymentsTable = null;

async function loadPaymentsPage(container) {
    console.log('Loading payments page');
    
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
                        <select id="filterPlanter">
                            <option value="">Tous les planteurs</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Méthode</label>
                        <select id="filterMethode">
                            <option value="">Toutes</option>
                            <option value="Espèces">Espèces</option>
                            <option value="Mobile Money">Mobile Money</option>
                            <option value="Virement">Virement</option>
                            <option value="Chèque">Chèque</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="filterStatut">
                            <option value="">Tous</option>
                            <option value="Validé">Validé</option>
                            <option value="En attente">En attente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterDateFrom">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterDateTo">
                    </div>
                </div>
                <div class="actions">
                    <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
                    <button id="clearFiltersBtn" class="btn btn-secondary">Réinitialiser</button>
                </div>
            </div>
            
            <div id="paymentsTable"></div>
        </div>
        
        <div id="paymentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouveau Paiement</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="paymentForm">
                    <div class="form-group">
                        <label>Planteur *</label>
                        <select id="planterId" required>
                            <option value="">Sélectionner...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Montant (FCFA) *</label>
                        <input type="number" id="montant" required min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Méthode *</label>
                        <select id="methode" required>
                            <option value="CASH">Espèces</option>
                            <option value="MOBILE_MONEY">Mobile Money</option>
                            <option value="VIREMENT">Virement</option>
                            <option value="CHEQUE">Chèque</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="datePaiement" required>
                    </div>
                    <div class="form-group">
                        <label>Référence</label>
                        <input type="text" id="reference" placeholder="Numéro de transaction, chèque...">
                    </div>
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                        <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Charger les données
    await loadPlanters();
    await loadPaymentsTable();
    
    // Attacher les événements
    attachEventListeners();
}

async function loadPlanters() {
    try {
        const response = await api.getPlanters({ size: 1000 });
        const planters = response.items || response;
        
        if (Array.isArray(planters)) {
            // Remplir le select du formulaire
            const select = document.getElementById('planterId');
            if (select) {
                planters.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    select.appendChild(option);
                });
            }
            
            // Remplir le select des filtres
            const filterSelect = document.getElementById('filterPlanter');
            if (filterSelect) {
                planters.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    filterSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading planters:', error);
    }
}

async function loadPaymentsTable(filters = {}) {
    try {
        const response = await api.getPayments(filters);
        const payments = Array.isArray(response) ? response : (response.items || []);
        
        if (paymentsTable) {
            paymentsTable.replaceData(payments);
        } else {
            paymentsTable = new Tabulator("#paymentsTable", {
                data: payments,
                layout: "fitColumns",
                pagination: true,
                paginationSize: 20,
                columns: [
                    {title: "Date", field: "date_paiement", minWidth: 120},
                    {title: "Planteur", field: "planter_name", minWidth: 150},
                    {title: "Montant", field: "montant", minWidth: 120, formatter: (cell) => {
                        return parseFloat(cell.getValue()).toFixed(0) + ' FCFA';
                    }},
                    {title: "Méthode", field: "methode", minWidth: 120},
                    {title: "Référence", field: "reference", minWidth: 150, formatter: (cell) => cell.getValue() || '-'},
                    {title: "Statut", field: "statut", minWidth: 100},
                    {title: "Actions", minWidth: 100, formatter: () => {
                        return '<button class="btn-delete">🗑️</button>';
                    }, cellClick: async (e, cell) => {
                        if (e.target.classList.contains('btn-delete')) {
                            if (confirm('Supprimer ce paiement?')) {
                                try {
                                    await api.deletePayment(cell.getRow().getData().id);
                                    showToast('Paiement supprimé');
                                    await loadPaymentsTable();
                                } catch (error) {
                                    showToast('Erreur lors de la suppression', 'error');
                                }
                            }
                        }
                    }}
                ]
            });
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Erreur lors du chargement des paiements', 'error');
    }
}

function attachEventListeners() {
    console.log('Attaching event listeners');
    
    // Bouton nouveau paiement
    const addBtn = document.getElementById('addPaymentBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            console.log('Opening payment modal');
            document.getElementById('paymentModal').classList.add('show');
            document.getElementById('datePaiement').valueAsDate = new Date();
        };
    }
    
    // Bouton voir soldes
    const balancesBtn = document.getElementById('viewBalancesBtn');
    if (balancesBtn) {
        balancesBtn.onclick = showBalances;
    }
    
    // Boutons filtres
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) {
        applyBtn.onclick = () => {
            const filters = {
                planter_id: document.getElementById('filterPlanter').value || undefined,
                methode: document.getElementById('filterMethode').value || undefined,
                statut: document.getElementById('filterStatut').value || undefined,
                date_from: document.getElementById('filterDateFrom').value || undefined,
                date_to: document.getElementById('filterDateTo').value || undefined
            };
            loadPaymentsTable(filters);
        };
    }
    
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            document.getElementById('filterPlanter').value = '';
            document.getElementById('filterMethode').value = '';
            document.getElementById('filterStatut').value = '';
            document.getElementById('filterDateFrom').value = '';
            document.getElementById('filterDateTo').value = '';
            loadPaymentsTable();
        };
    }
    
    // Boutons fermer modal
    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.onclick = () => {
            document.getElementById('paymentModal').classList.remove('show');
            document.getElementById('paymentForm').reset();
        };
    });
    
    // Formulaire
    const form = document.getElementById('paymentForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await savePayment();
        };
    }
}

async function savePayment() {
    try {
        const data = {
            planter_id: document.getElementById('planterId').value,
            montant: parseFloat(document.getElementById('montant').value),
            methode: document.getElementById('methode').value,
            date_paiement: document.getElementById('datePaiement').value,
            reference: document.getElementById('reference').value || null,
            statut: 'completed'
        };
        
        await api.createPayment(data);
        showToast('Paiement enregistré');
        document.getElementById('paymentModal').classList.remove('show');
        document.getElementById('paymentForm').reset();
        await loadPaymentsTable();
    } catch (error) {
        console.error('Error saving payment:', error);
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}


async function showBalances() {
    try {
        const balances = await api.getPaymentBalances();
        
        let html = '<div class="modal show"><div class="modal-content" style="max-width: 800px;"><div class="modal-header"><h3>📊 Soldes des Planteurs</h3><span class="close-balances">&times;</span></div><div class="modal-body">';
        
        balances.forEach(b => {
            const color = b.solde < 0 ? '#dc3545' : '#28a745';
            html += `<div class="kpi-card"><div class="kpi-value" style="color: ${color}">${b.solde.toFixed(0)} FCFA</div><div class="kpi-label">${b.planter_name}</div></div>`;
        });
        
        html += '</div><div class="actions"><button class="close-balances btn btn-secondary">Fermer</button></div></div></div>';
        
        const modal = document.createElement('div');
        modal.innerHTML = html;
        document.body.appendChild(modal.firstChild);
        
        document.querySelectorAll('.close-balances').forEach(el => {
            el.onclick = () => document.querySelector('.modal.show').remove();
        });
    } catch (error) {
        showToast('Erreur lors du chargement des soldes', 'error');
    }
}
