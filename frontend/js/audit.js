/**
 * Gestion du journal d'audit
 */

class AuditManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 20;
        this.filters = {};
    }

    async init() {
        await this.loadStats();
        await this.loadLogs();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportCSV();
        });
    }

    applyFilters() {
        this.filters = {
            action: document.getElementById('actionFilter').value,
            entity_type: document.getElementById('entityFilter').value,
            from_date: document.getElementById('fromDateFilter').value,
            to_date: document.getElementById('toDateFilter').value,
            search: document.getElementById('searchInput').value
        };
        
        this.currentPage = 0;
        this.loadLogs();
    }

    async loadStats() {
        try {
            const stats = await api.get('/audit/stats?days=30');
            
            document.getElementById('totalLogs').textContent = stats.total_logs.toLocaleString();
            document.getElementById('createCount').textContent = (stats.by_action.CREATE || 0).toLocaleString();
            document.getElementById('updateCount').textContent = (stats.by_action.UPDATE || 0).toLocaleString();
            document.getElementById('deleteCount').textContent = (stats.by_action.DELETE || 0).toLocaleString();
            
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    async loadLogs() {
        try {
            const params = new URLSearchParams({
                skip: this.currentPage * this.pageSize,
                limit: this.pageSize,
                ...this.filters
            });

            const response = await api.get(`/audit/logs?${params}`);
            
            this.displayLogs(response.logs);
            this.displayPagination(response.total);
            
        } catch (error) {
            console.error('Erreur chargement logs:', error);
            document.getElementById('auditLogs').innerHTML = `
                <div class="alert alert-danger">
                    Erreur lors du chargement des logs d'audit
                </div>
            `;
        }
    }

    displayLogs(logs) {
        const container = document.getElementById('auditLogs');
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Aucun log d'audit trouvé
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map(log => this.createLogCard(log)).join('');
        
        // Ajouter les event listeners pour les détails
        logs.forEach(log => {
            const card = document.getElementById(`log-${log.id}`);
            if (card) {
                card.addEventListener('click', () => this.showDetails(log));
            }
        });
    }

    createLogCard(log) {
        const date = new Date(log.created_at);
        const formattedDate = date.toLocaleString('fr-FR');
        
        const actionClass = `action-${log.action}`;
        const actionLabel = this.getActionLabel(log.action);
        
        let changesPreview = '';
        if (log.changes && log.changes.diff) {
            const diffKeys = Object.keys(log.changes.diff);
            if (diffKeys.length > 0) {
                changesPreview = `<small class="text-muted">${diffKeys.length} champ(s) modifié(s)</small>`;
            }
        }

        return `
            <div class="card audit-log-card" id="log-${log.id}" style="cursor: pointer;">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <small class="text-muted">${formattedDate}</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${log.user_email}</strong>
                        </div>
                        <div class="col-md-2">
                            <span class="badge ${actionClass} action-badge">${actionLabel}</span>
                        </div>
                        <div class="col-md-3">
                            <span class="text-primary">${log.entity_type}</span>
                            ${log.entity_id ? `<small class="text-muted">#${log.entity_id}</small>` : ''}
                        </div>
                        <div class="col-md-2">
                            ${log.ip_address ? `<small class="text-muted">IP: ${log.ip_address}</small>` : ''}
                        </div>
                        <div class="col-md-1 text-end">
                            ${changesPreview}
                        </div>
                    </div>
                    ${log.reason ? `<div class="mt-2"><small><strong>Raison:</strong> ${log.reason}</small></div>` : ''}
                </div>
            </div>
        `;
    }

    getActionLabel(action) {
        const labels = {
            'CREATE': 'Création',
            'UPDATE': 'Modification',
            'DELETE': 'Suppression',
            'LOGIN_SUCCESS': 'Connexion',
            'LOGIN_FAILED': 'Échec connexion',
            'LOGOUT': 'Déconnexion'
        };
        return labels[action] || action;
    }

    showDetails(log) {
        const modalBody = document.getElementById('modalBody');
        
        let changesHtml = '';
        if (log.changes) {
            if (log.changes.diff && Object.keys(log.changes.diff).length > 0) {
                changesHtml = '<h6>Modifications:</h6><div class="changes-diff">';
                for (const [key, value] of Object.entries(log.changes.diff)) {
                    changesHtml += `
                        <div class="mb-2">
                            <strong>${key}:</strong><br>
                            <span class="text-danger">- ${JSON.stringify(value.from)}</span><br>
                            <span class="text-success">+ ${JSON.stringify(value.to)}</span>
                        </div>
                    `;
                }
                changesHtml += '</div>';
            } else if (log.changes.new) {
                changesHtml = '<h6>Données créées:</h6><div class="changes-diff">';
                changesHtml += `<pre>${JSON.stringify(log.changes.new, null, 2)}</pre>`;
                changesHtml += '</div>';
            } else if (log.changes.deleted) {
                changesHtml = '<h6>Données supprimées:</h6><div class="changes-diff">';
                changesHtml += `<pre>${JSON.stringify(log.changes.deleted, null, 2)}</pre>`;
                changesHtml += '</div>';
            }
        }

        modalBody.innerHTML = `
            <div class="mb-3">
                <strong>ID:</strong> ${log.id}
            </div>
            <div class="mb-3">
                <strong>Date/Heure:</strong> ${new Date(log.created_at).toLocaleString('fr-FR')}
            </div>
            <div class="mb-3">
                <strong>Utilisateur:</strong> ${log.user_email}
            </div>
            <div class="mb-3">
                <strong>Action:</strong> <span class="badge action-${log.action}">${this.getActionLabel(log.action)}</span>
            </div>
            <div class="mb-3">
                <strong>Entité:</strong> ${log.entity_type} ${log.entity_id ? `#${log.entity_id}` : ''}
            </div>
            ${log.ip_address ? `<div class="mb-3"><strong>Adresse IP:</strong> ${log.ip_address}</div>` : ''}
            ${log.user_agent ? `<div class="mb-3"><strong>User Agent:</strong> <small>${log.user_agent}</small></div>` : ''}
            ${log.reason ? `<div class="mb-3"><strong>Raison:</strong> ${log.reason}</div>` : ''}
            ${changesHtml}
        `;

        // Afficher le modal
        const modalElement = document.getElementById('detailsModal');
        if (modalElement) {
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Ajouter backdrop
            let backdrop = document.querySelector('.modal-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
            }
            
            // Fermer au clic sur X ou backdrop
            const closeModal = () => {
                modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                document.body.classList.remove('modal-open');
                if (backdrop) backdrop.remove();
            };
            
            modalElement.querySelector('.close')?.addEventListener('click', closeModal);
            backdrop?.addEventListener('click', closeModal);
        }
    }

    displayPagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        
        if (totalPages <= 1) {
            document.getElementById('paginationNav').style.display = 'none';
            return;
        }

        document.getElementById('paginationNav').style.display = 'block';
        const pagination = document.getElementById('pagination');
        
        let html = '';
        
        // Bouton précédent
        html += `
            <li class="page-item ${this.currentPage === 0 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Précédent</a>
            </li>
        `;
        
        // Pages
        const startPage = Math.max(0, this.currentPage - 2);
        const endPage = Math.min(totalPages - 1, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i + 1}</a>
                </li>
            `;
        }
        
        // Bouton suivant
        html += `
            <li class="page-item ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Suivant</a>
            </li>
        `;
        
        pagination.innerHTML = html;
        
        // Event listeners
        pagination.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page >= 0 && page < totalPages) {
                    this.currentPage = page;
                    this.loadLogs();
                    window.scrollTo(0, 0);
                }
            });
        });
    }

    async exportCSV() {
        try {
            const params = new URLSearchParams(this.filters);
            const url = `${api.baseUrl}/audit/export/csv?${params}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) throw new Error('Erreur export');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            this.showNotification('Export CSV réussi', 'success');
            
        } catch (error) {
            console.error('Erreur export CSV:', error);
            this.showNotification('Erreur lors de l\'export CSV', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Utiliser le système de notifications existant si disponible
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Fonction pour charger la page d'audit dans l'app principale
async function loadAuditPage(container) {
    container.innerHTML = `
        <div class="audit-container">
            <div class="page-header">
                <h2>📋 Journal d'Audit</h2>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="kpi-content">
                        <div class="kpi-label" style="color: white;">Total Actions</div>
                        <div class="kpi-value" id="totalLogs" style="color: white;">0</div>
                    </div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <div class="kpi-content">
                        <div class="kpi-label" style="color: white;">Créations</div>
                        <div class="kpi-value" id="createCount" style="color: white;">0</div>
                    </div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <div class="kpi-content">
                        <div class="kpi-label" style="color: white;">Modifications</div>
                        <div class="kpi-value" id="updateCount" style="color: white;">0</div>
                    </div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <div class="kpi-content">
                        <div class="kpi-label" style="color: white;">Suppressions</div>
                        <div class="kpi-value" id="deleteCount" style="color: white;">0</div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>🔍 Filtres</h3>
                </div>
                <div class="card-body">
                    <div class="filter-grid">
                        <div class="form-group">
                            <label>Action</label>
                            <select id="actionFilter" class="form-control">
                                <option value="">Toutes les actions</option>
                                <option value="CREATE">Création</option>
                                <option value="UPDATE">Modification</option>
                                <option value="DELETE">Suppression</option>
                                <option value="LOGIN_SUCCESS">Connexion</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Type d'entité</label>
                            <select id="entityFilter" class="form-control">
                                <option value="">Toutes les entités</option>
                                <option value="Planter">Planteur</option>
                                <option value="Delivery">Livraison</option>
                                <option value="Payment">Paiement</option>
                                <option value="User">Utilisateur</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date début</label>
                            <input type="date" id="fromDateFilter" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Date fin</label>
                            <input type="date" id="toDateFilter" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Recherche</label>
                            <input type="text" id="searchInput" class="form-control" placeholder="Rechercher...">
                        </div>
                    </div>
                    <div class="mt-3">
                        <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
                        <button id="exportCsvBtn" class="btn btn-secondary">📥 Export CSV</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>📜 Logs d'Audit</h3>
                </div>
                <div class="card-body" id="auditLogs">
                    <div class="text-center">
                        <div class="spinner-border" role="status"></div>
                    </div>
                </div>
            </div>

            <nav id="paginationNav" style="display: none;">
                <ul class="pagination" id="pagination"></ul>
            </nav>
        </div>

        <!-- Modal pour les détails -->
        <div id="detailsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Détails du Log</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body" id="modalBody"></div>
            </div>
        </div>
    `;

    const auditManager = new AuditManager();
    await auditManager.init();
}

// Initialiser au chargement de la page (pour compatibilité avec audit.html)
let auditManager;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('auditPage')) {
        // Vérifier l'authentification
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        auditManager = new AuditManager();
        auditManager.init();
    }
});
