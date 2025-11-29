async function loadAnalyticsPlanterPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📊 Synthèse par Planteur</h2>
            </div>
            <div class="filters">
                <div class="filter-row">
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
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value" id="totalKg">0</div>
                    <div class="kpi-label">Total (kg)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="totalPlanters">0</div>
                    <div class="kpi-label">Nombre de planteurs</div>
                </div>
            </div>
            <div id="planterTable"></div>
            <canvas id="planterChart" style="max-height: 400px; margin-top: 20px;"></canvas>
        </div>
    `;

    let currentFilters = {};
    let table;
    let chart;

    async function loadData() {
        const data = await api.getSummaryPlanter(currentFilters);
        
        document.getElementById('totalKg').textContent = data.total_general.toFixed(2);
        document.getElementById('totalPlanters').textContent = data.items.length;

        if (table) {
            table.setData(data.items);
        } else {
            table = new Tabulator("#planterTable", {
                data: data.items,
                layout: "fitColumns",
                columns: [
                    {title: "Planteur", field: "planter"},
                    {title: "Total (kg)", field: "total_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)}
                ]
            });
        }

        const ctx = document.getElementById('planterChart').getContext('2d');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.items.map(i => i.planter),
                datasets: [{
                    label: 'Quantité (kg)',
                    data: data.items.map(i => i.total_kg),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined
        };
        loadData();
    });

    loadData();
}

async function loadAnalyticsZonesPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">🗺️ Synthèse par Zone</h2>
            </div>
            <div class="filters">
                <div class="filter-row">
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterFrom">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterTo">
                    </div>
                    <div class="form-group">
                        <label>Lieu chargement</label>
                        <select id="filterLoad">
                            <option value="">Tous les lieux</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Lieu déchargement</label>
                        <select id="filterUnload">
                            <option value="">Tous les lieux</option>
                        </select>
                    </div>
                </div>
                <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
            </div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value" id="totalLoaded">0</div>
                    <div class="kpi-label">Total chargé (kg)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="totalUnloaded">0</div>
                    <div class="kpi-label">Total déchargé (kg)</div>
                </div>
            </div>
            <div id="zonesTable"></div>
            <canvas id="zonesChart" style="max-height: 400px; margin-top: 20px;"></canvas>
        </div>
    `;

    // Charger les lieux dans les selects
    try {
        const locations = await api.getUniqueLocations();
        const loadSelect = document.getElementById('filterLoad');
        const unloadSelect = document.getElementById('filterUnload');
        
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
    } catch (error) {
        console.error('Erreur lors du chargement des lieux:', error);
    }

    let currentFilters = {};
    let table;
    let chart;

    async function loadData() {
        const data = await api.getSummaryZones(currentFilters);
        
        document.getElementById('totalLoaded').textContent = data.total_loaded.toFixed(2);
        document.getElementById('totalUnloaded').textContent = data.total_unloaded.toFixed(2);

        if (table) {
            table.setData(data.items);
        } else {
            table = new Tabulator("#zonesTable", {
                data: data.items,
                layout: "fitColumns",
                columns: [
                    {title: "Planteur", field: "planter", minWidth: 150},
                    {title: "Zone (Lieu)", field: "location", minWidth: 150},
                    {title: "Chargé (kg)", field: "total_loaded_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Déchargé (kg)", field: "total_unloaded_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Total (kg)", formatter: (cell) => {
                        const row = cell.getRow().getData();
                        const total = row.total_loaded_kg + row.total_unloaded_kg;
                        return total.toFixed(2);
                    }}
                ]
            });
        }

        const ctx = document.getElementById('zonesChart').getContext('2d');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.items.map(i => i.location),
                datasets: [
                    {
                        label: 'Chargé (kg)',
                        data: data.items.map(i => i.total_loaded_kg),
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Déchargé (kg)',
                        data: data.items.map(i => i.total_unloaded_kg),
                        backgroundColor: '#8b5cf6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined,
            load: document.getElementById('filterLoad').value || undefined,
            unload: document.getElementById('filterUnload').value || undefined
        };
        loadData();
    });

    loadData();
}

async function loadAnalyticsQualityPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">⭐ Synthèse par Qualité</h2>
            </div>
            <div class="filters">
                <div class="filter-row">
                    <div class="form-group">
                        <label>Date début</label>
                        <input type="date" id="filterFrom">
                    </div>
                    <div class="form-group">
                        <label>Date fin</label>
                        <input type="date" id="filterTo">
                    </div>
                    <div class="form-group">
                        <label>Qualité</label>
                        <select id="filterQuality">
                            <option value="">Toutes</option>
                            <option value="Grade 1">Grade 1</option>
                            <option value="Grade 2">Grade 2</option>
                            <option value="Grade 3">Grade 3</option>
                            <option value="Premium">Premium</option>
                            <option value="Standard">Standard</option>
                        </select>
                    </div>
                </div>
                <button id="applyFiltersBtn" class="btn btn-primary">Appliquer</button>
            </div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value" id="totalKg">0</div>
                    <div class="kpi-label">Total (kg)</div>
                </div>
            </div>
            <div id="qualityTable"></div>
            <canvas id="qualityChart" style="max-height: 400px; margin-top: 20px;"></canvas>
        </div>
    `;

    let currentFilters = {};
    let table;
    let chart;

    async function loadData() {
        const data = await api.getSummaryQuality(currentFilters);
        
        document.getElementById('totalKg').textContent = data.total.toFixed(2);

        if (table) {
            table.setData(data.items);
        } else {
            table = new Tabulator("#qualityTable", {
                data: data.items,
                layout: "fitColumns",
                columns: [
                    {title: "Qualité", field: "quality", minWidth: 120},
                    {title: "Planteur", field: "planter", minWidth: 150},
                    {title: "Total (kg)", field: "total_unloaded_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)}
                ]
            });
        }

        const ctx = document.getElementById('qualityChart').getContext('2d');
        if (chart) chart.destroy();
        
        // Grouper par qualité pour le graphique
        const qualityTotals = {};
        data.items.forEach(item => {
            if (!qualityTotals[item.quality]) {
                qualityTotals[item.quality] = 0;
            }
            qualityTotals[item.quality] += item.total_unloaded_kg;
        });
        
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(qualityTotals),
                datasets: [{
                    label: 'Quantité (kg)',
                    data: Object.values(qualityTotals),
                    backgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined,
            quality: document.getElementById('filterQuality').value || undefined
        };
        loadData();
    });

    loadData();
}


async function loadAnalyticsFournisseurPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">🏢 Synthèse par Fournisseur</h2>
            </div>
            <div class="filters">
                <div class="filter-row">
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
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-value" id="totalLoaded">0</div>
                    <div class="kpi-label">Total chargé (kg)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="totalUnloaded">0</div>
                    <div class="kpi-label">Total déchargé (kg)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="totalPertes">0</div>
                    <div class="kpi-label">Total pertes (kg)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" id="pctUtilisation">0%</div>
                    <div class="kpi-label">Utilisation globale</div>
                </div>
            </div>
            <div id="fournisseurTable"></div>
            <canvas id="fournisseurChart" style="max-height: 400px; margin-top: 20px;"></canvas>
        </div>
    `;

    let currentFilters = {};
    let table;
    let chart;

    async function loadData() {
        const data = await api.getSummaryFournisseur(currentFilters);
        
        document.getElementById('totalLoaded').textContent = data.total_loaded.toFixed(2);
        document.getElementById('totalUnloaded').textContent = data.total_unloaded.toFixed(2);
        document.getElementById('totalPertes').textContent = data.total_pertes.toFixed(2);
        document.getElementById('pctUtilisation').textContent = data.pct_utilisation_global.toFixed(1) + '%';

        if (table) {
            table.setData(data.items);
        } else {
            table = new Tabulator("#fournisseurTable", {
                data: data.items,
                layout: "fitColumns",
                columns: [
                    {title: "Fournisseur", field: "fournisseur", minWidth: 150},
                    {title: "Chargé (kg)", field: "total_loaded_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Déchargé (kg)", field: "total_unloaded_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Pertes (kg)", field: "pertes_kg", formatter: (cell) => {
                        const val = parseFloat(cell.getValue());
                        const pct = cell.getRow().getData().pct_pertes;
                        let color = '#28a745';
                        if (pct > 5) color = '#ffc107';
                        if (pct > 10) color = '#dc3545';
                        return `<span style="color: ${color}; font-weight: bold;">${val.toFixed(2)}</span>`;
                    }},
                    {title: "% Pertes", field: "pct_pertes", formatter: (cell) => {
                        const val = parseFloat(cell.getValue());
                        let color = '#28a745';
                        if (val > 5) color = '#ffc107';
                        if (val > 10) color = '#dc3545';
                        return `<span style="color: ${color}; font-weight: bold;">${val.toFixed(1)}%</span>`;
                    }},
                    {title: "Max (kg)", field: "quantite_max_kg", formatter: (cell) => parseFloat(cell.getValue()).toFixed(2)},
                    {title: "Utilisation", field: "pct_utilisation", formatter: (cell) => {
                        const val = parseFloat(cell.getValue());
                        const row = cell.getRow().getData();
                        let color = '#28a745';
                        if (val > 80) color = '#ffc107';
                        if (val > 100) color = '#dc3545';
                        
                        return `
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="flex: 1; background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden;">
                                    <div style="width: ${Math.min(val, 100)}%; background: ${color}; height: 100%; transition: width 0.3s;"></div>
                                </div>
                                <span style="color: ${color}; font-weight: bold; min-width: 50px;">${val.toFixed(1)}%</span>
                            </div>
                        `;
                    }},
                    {title: "Livraisons", field: "nombre_livraisons"}
                ]
            });
        }

        const ctx = document.getElementById('fournisseurChart').getContext('2d');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.items.map(i => i.fournisseur),
                datasets: [
                    {
                        label: 'Chargé (kg)',
                        data: data.items.map(i => i.total_loaded_kg),
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Déchargé (kg)',
                        data: data.items.map(i => i.total_unloaded_kg),
                        backgroundColor: '#8b5cf6'
                    },
                    {
                        label: 'Max (kg)',
                        data: data.items.map(i => i.quantite_max_kg),
                        backgroundColor: '#ef4444',
                        type: 'line',
                        borderColor: '#ef4444',
                        borderWidth: 3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            from: document.getElementById('filterFrom').value || undefined,
            to: document.getElementById('filterTo').value || undefined
        };
        loadData();
    });

    loadData();
}
