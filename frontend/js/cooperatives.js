// Gestion de la page Coopératives

async function loadCooperativesPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <h1>🏢 Coopératives</h1>
            <button class="btn btn-primary" onclick="refreshCooperatives()">
                🔄 Actualiser
            </button>
        </div>

        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card" style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border-left: 4px solid #8B4513; position: relative; overflow: hidden;">
                <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 3rem; opacity: 0.1;">🏢</div>
                <div class="stat-value" id="totalCooperatives" style="color: #8B4513; position: relative; z-index: 1;">-</div>
                <div class="stat-label" style="position: relative; z-index: 1;">Coopératives</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border-left: 4px solid #28a745; position: relative; overflow: hidden;">
                <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 3rem; opacity: 0.1;">👥</div>
                <div class="stat-value" id="totalMembres" style="color: #28a745; position: relative; z-index: 1;">-</div>
                <div class="stat-label" style="position: relative; z-index: 1;">Membres Total</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border-left: 4px solid #D2691E; position: relative; overflow: hidden;">
                <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 3rem; opacity: 0.1;">📦</div>
                <div class="stat-value" id="totalProduction" style="color: #D2691E; position: relative; z-index: 1;">-</div>
                <div class="stat-label" style="position: relative; z-index: 1;">Production (kg)</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header" style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 20px;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600;">📋 Liste des Coopératives</h2>
            </div>
            <div id="cooperativesTable"></div>
        </div>

        <!-- Modal détails coopérative -->
        <div id="cooperativeModal" class="modal">
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white;">
                    <h3 id="modalTitle" style="margin: 0;">Détails Coopérative</h3>
                    <span class="close" style="color: white;">&times;</span>
                </div>
                <div id="cooperativeDetails"></div>
            </div>
        </div>
    `;

    await loadCooperativesTable();
    setupModalHandlers();
}

async function loadCooperativesTable() {
    try {
        const cooperatives = await api.getCooperatives();
        
        // Mettre à jour les statistiques
        const totalCoops = cooperatives.length;
        const totalMembres = cooperatives.reduce((sum, c) => sum + c.nb_planteurs + c.nb_fournisseurs, 0);
        const totalProduction = cooperatives.reduce((sum, c) => sum + c.total_decharge_kg, 0);
        
        document.getElementById('totalCooperatives').textContent = totalCoops;
        document.getElementById('totalMembres').textContent = totalMembres;
        document.getElementById('totalProduction').textContent = totalProduction.toFixed(0);

        // Créer le tableau
        const tableContainer = document.getElementById('cooperativesTable');
        
        if (cooperatives.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <p>Aucune coopérative trouvée</p>
                    <small>Les coopératives apparaîtront automatiquement lorsque vous ajouterez des planteurs ou fournisseurs avec une coopérative</small>
                </div>
            `;
            return;
        }

        const table = new Tabulator(tableContainer, {
            data: cooperatives,
            layout: "fitColumns",
            responsiveLayout: "collapse",
            pagination: true,
            paginationSize: 20,
            placeholder: "Aucune coopérative",
            rowFormatter: (row) => {
                row.getElement().style.cursor = "pointer";
            },
            columns: [
                {
                    title: "🏢 Nom",
                    field: "nom",
                    headerFilter: "input",
                    widthGrow: 2,
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.5rem;">🏢</span>
                            <strong style="color: #8B4513; font-size: 1.05rem;">${value}</strong>
                        </div>`;
                    }
                },
                {
                    title: "👨‍🌾 Planteurs",
                    field: "nb_planteurs",
                    width: 130,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="badge" style="background: #e3f2fd; color: #1976d2; padding: 6px 12px; border-radius: 12px; font-weight: 600;">${value}</span>`;
                    }
                },
                {
                    title: "🏭 Fournisseurs",
                    field: "nb_fournisseurs",
                    width: 140,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<span class="badge" style="background: #f3e5f5; color: #7b1fa2; padding: 6px 12px; border-radius: 12px; font-weight: 600;">${value}</span>`;
                    }
                },
                {
                    title: "👥 Total",
                    field: "total_membres",
                    width: 100,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const total = row.nb_planteurs + row.nb_fournisseurs;
                        return `<strong style="color: #28a745; font-size: 1.1rem;">${total}</strong>`;
                    }
                },
                {
                    title: "📦 Déchargé (kg)",
                    field: "total_decharge_kg",
                    width: 150,
                    hozAlign: "right",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<strong style="color: #D2691E;">${value.toLocaleString('fr-FR')}</strong>`;
                    }
                },
                {
                    title: "📊 Pertes",
                    field: "pourcentage_pertes",
                    width: 110,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const value = cell.getValue();
                        let color = '#28a745';
                        let bgColor = '#d4edda';
                        if (value > 5) {
                            color = '#ffc107';
                            bgColor = '#fff3cd';
                        }
                        if (value > 10) {
                            color = '#dc3545';
                            bgColor = '#f8d7da';
                        }
                        return `<span style="background: ${bgColor}; color: ${color}; padding: 4px 10px; border-radius: 8px; font-weight: bold;">${value.toFixed(1)}%</span>`;
                    }
                },
                {
                    title: "Actions",
                    width: 100,
                    hozAlign: "center",
                    headerSort: false,
                    formatter: () => {
                        return '<button class="btn-icon" style="background: #8B4513; color: white; padding: 6px 12px; border-radius: 6px; font-size: 1.1rem;" title="Voir détails">👁️</button>';
                    },
                    cellClick: async (e, cell) => {
                        e.stopPropagation();
                        const cooperative = cell.getRow().getData();
                        await showCooperativeDetails(cooperative.nom);
                    }
                }
            ]
        });

        // Rendre les lignes cliquables
        table.on("rowClick", async (e, row) => {
            if (!e.target.classList.contains('btn-icon')) {
                const cooperative = row.getData();
                await showCooperativeDetails(cooperative.nom);
            }
        });

    } catch (error) {
        console.error('Erreur chargement coopératives:', error);
        showToast('Erreur lors du chargement des coopératives', 'error');
    }
}

async function showCooperativeDetails(nomCooperative) {
    try {
        const details = await api.getCooperativeDetails(nomCooperative);
        
        const detailsContainer = document.getElementById('cooperativeDetails');
        
        const pertesColor = details.pourcentage_pertes > 10 ? '#dc3545' : details.pourcentage_pertes > 5 ? '#ffc107' : '#28a745';
        const pertesBg = details.pourcentage_pertes > 10 ? '#f8d7da' : details.pourcentage_pertes > 5 ? '#fff3cd' : '#d4edda';
        
        detailsContainer.innerHTML = `
            <div style="padding: 24px;">
                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; margin-bottom: 24px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🏢</div>
                    <h2 style="margin: 0; color: #8B4513; font-size: 1.75rem;">${details.nom}</h2>
                </div>
                
                <div class="stats-grid" style="margin: 24px 0; gap: 16px;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 8px;">👨‍🌾</div>
                            <div class="stat-value" style="color: #1976d2;">${details.nb_planteurs}</div>
                            <div class="stat-label" style="color: #1565c0;">Planteurs</div>
                        </div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 8px;">🏭</div>
                            <div class="stat-value" style="color: #7b1fa2;">${details.nb_fournisseurs}</div>
                            <div class="stat-label" style="color: #6a1b9a;">Fournisseurs</div>
                        </div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 8px;">📦</div>
                            <div class="stat-value" style="color: #D2691E;">${details.total_decharge_kg.toLocaleString('fr-FR')}</div>
                            <div class="stat-label" style="color: #bf360c;">Production (kg)</div>
                        </div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, ${pertesBg} 0%, ${pertesBg} 100%); border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 8px;">📊</div>
                            <div class="stat-value" style="color: ${pertesColor}">
                                ${details.pourcentage_pertes.toFixed(1)}%
                            </div>
                            <div class="stat-label" style="color: ${pertesColor};">Pertes</div>
                        </div>
                    </div>
                </div>

                ${details.planteurs.length > 0 ? `
                    <div style="margin-top: 32px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <h3 style="margin: 0 0 16px 0; color: #1976d2; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.5rem;">👨‍🌾</span>
                            Planteurs (${details.planteurs.length})
                        </h3>
                        <div class="table-responsive">
                            <table class="simple-table" style="background: white;">
                                <thead style="background: #1976d2;">
                                    <tr>
                                        <th style="color: white;">Nom</th>
                                        <th style="color: white;">Téléphone</th>
                                        <th style="color: white;">Localisation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.planteurs.map(p => `
                                        <tr style="transition: all 0.2s;">
                                            <td><strong style="color: #1976d2;">${p.name}</strong></td>
                                            <td>${p.phone || '<span style="color: #999;">-</span>'}</td>
                                            <td>${[p.localite, p.departement, p.region].filter(x => x).join(', ') || '<span style="color: #999;">-</span>'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                ${details.fournisseurs.length > 0 ? `
                    <div style="margin-top: 24px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
                        <h3 style="margin: 0 0 16px 0; color: #7b1fa2; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.5rem;">🏭</span>
                            Fournisseurs (${details.fournisseurs.length})
                        </h3>
                        <div class="table-responsive">
                            <table class="simple-table" style="background: white;">
                                <thead style="background: #7b1fa2;">
                                    <tr>
                                        <th style="color: white;">Nom</th>
                                        <th style="color: white;">Téléphone</th>
                                        <th style="color: white;">Localisation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.fournisseurs.map(f => `
                                        <tr style="transition: all 0.2s;">
                                            <td><strong style="color: #7b1fa2;">${f.name}</strong></td>
                                            <td>${f.phone || '<span style="color: #999;">-</span>'}</td>
                                            <td>${[f.localite, f.departement, f.region].filter(x => x).join(', ') || '<span style="color: #999;">-</span>'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('modalTitle').textContent = `Coopérative: ${details.nom}`;
        document.getElementById('cooperativeModal').classList.add('show');
        
    } catch (error) {
        console.error('Erreur chargement détails:', error);
        showToast('Erreur lors du chargement des détails', 'error');
    }
}

function setupModalHandlers() {
    const modal = document.getElementById('cooperativeModal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = () => modal.classList.remove('show');
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    };
}

async function refreshCooperatives() {
    await loadCooperativesTable();
    showToast('Coopératives actualisées', 'success');
}
