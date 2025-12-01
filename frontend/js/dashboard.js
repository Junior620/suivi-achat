// Dashboard amélioré avec KPIs et graphiques

let dashboardCharts = {};
let dashboardData = {};

async function loadDashboardPage(container) {
    container.innerHTML = `
        <div class="dashboard-container">
            <!-- KPIs Section -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Chiffre d'Affaires</div>
                        <div class="kpi-value" id="kpiCA">0 FCFA</div>
                        <div class="kpi-trend" id="kpiCATrend"></div>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Volume Total</div>
                        <div class="kpi-value" id="kpiVolume">0 kg</div>
                        <div class="kpi-trend" id="kpiVolumeTrend"></div>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-icon">📉</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Pertes</div>
                        <div class="kpi-value" id="kpiPertes">0 kg</div>
                        <div class="kpi-trend" id="kpiPertesTrend"></div>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-icon">👨‍🌾</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Planteurs Actifs</div>
                        <div class="kpi-value" id="kpiPlanteurs">0</div>
                        <div class="kpi-trend" id="kpiPlanteursTrend"></div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-grid">
                <div class="card">
                    <div class="card-header">
                        <h3>📊 Évolution des Livraisons</h3>
                        <select id="evolutionPeriod" class="period-selector">
                            <option value="7">7 derniers jours</option>
                            <option value="30" selected>30 derniers jours</option>
                            <option value="90">90 derniers jours</option>
                            <option value="365">1 an</option>
                        </select>
                    </div>
                    <canvas id="evolutionChart"></canvas>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>⭐ Répartition par Qualité</h3>
                    </div>
                    <canvas id="qualityChart"></canvas>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>🏆 Top 10 Planteurs</h3>
                    </div>
                    <canvas id="topPlantersChart"></canvas>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>🗺️ Répartition par Zone</h3>
                    </div>
                    <canvas id="zonesChart"></canvas>
                </div>

                <div class="card full-width">
                    <div class="card-header">
                        <h3>🔮 Prévisions (30 prochains jours)</h3>
                    </div>
                    <canvas id="forecastChart"></canvas>
                </div>
            </div>

            <!-- Top Planteurs Table -->
            <div class="card">
                <div class="card-header">
                    <h3>🏆 Classement des Planteurs</h3>
                </div>
                <div id="topPlantersTable"></div>
            </div>
        </div>
    `;

    await loadDashboardData();
    initDashboardCharts();
    
    // Rafraîchir toutes les 30 secondes
    setInterval(async () => {
        await loadDashboardData();
        updateDashboardCharts();
    }, 30000);

    // Gérer le changement de période
    document.getElementById('evolutionPeriod').addEventListener('change', async (e) => {
        await loadDashboardData(parseInt(e.target.value));
        updateEvolutionChart();
    });
}

async function loadDashboardData(days = 30) {
    try {
        // Charger les données
        const deliveries = await api.getDeliveries({ size: 10000 });
        const planters = await api.getPlanters({ size: 1000 });
        
        const allDeliveries = deliveries.items || deliveries;
        const allPlanters = planters.items || planters;

        // Filtrer par période
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const recentDeliveries = allDeliveries.filter(d => new Date(d.date) >= cutoffDate);

        // Calculer les KPIs
        dashboardData = {
            totalVolume: recentDeliveries.reduce((sum, d) => sum + d.quantity_kg, 0),
            totalCA: recentDeliveries.reduce((sum, d) => sum + (d.quantity_kg * 2500), 0), // Prix moyen 2500 FCFA/kg
            totalPertes: recentDeliveries.reduce((sum, d) => sum + (d.perte_kg || 0), 0),
            activePlanters: new Set(recentDeliveries.map(d => d.planter_id)).size,
            deliveries: recentDeliveries,
            planters: allPlanters,
            days: days
        };

        updateKPIs();
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur chargement des données', 'error');
    }
}

function updateKPIs() {
    // Volume
    document.getElementById('kpiVolume').textContent = 
        `${dashboardData.totalVolume.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg`;
    
    // CA
    document.getElementById('kpiCA').textContent = 
        `${dashboardData.totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
    
    // Pertes
    document.getElementById('kpiPertes').textContent = 
        `${dashboardData.totalPertes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg`;
    
    // Planteurs
    document.getElementById('kpiPlanteurs').textContent = dashboardData.activePlanters;

    // Calculer les tendances (comparaison avec période précédente)
    calculateTrends();
}

function calculateTrends() {
    // Diviser la période en deux pour comparer
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - dashboardData.days / 2);
    
    const recent = dashboardData.deliveries.filter(d => new Date(d.date) >= midPoint);
    const previous = dashboardData.deliveries.filter(d => new Date(d.date) < midPoint);
    
    const recentVolume = recent.reduce((sum, d) => sum + d.quantity_kg, 0);
    const previousVolume = previous.reduce((sum, d) => sum + d.quantity_kg, 0);
    
    const volumeTrend = previousVolume > 0 ? ((recentVolume - previousVolume) / previousVolume * 100) : 0;
    
    updateTrendIndicator('kpiVolumeTrend', volumeTrend);
    updateTrendIndicator('kpiCATrend', volumeTrend); // Même tendance pour le CA
    
    const recentPertes = recent.reduce((sum, d) => sum + (d.perte_kg || 0), 0);
    const previousPertes = previous.reduce((sum, d) => sum + (d.perte_kg || 0), 0);
    const pertesTrend = previousPertes > 0 ? ((recentPertes - previousPertes) / previousPertes * 100) : 0;
    
    updateTrendIndicator('kpiPertesTrend', pertesTrend, true); // Inversé pour les pertes
}

function updateTrendIndicator(elementId, trend, inverse = false) {
    const element = document.getElementById(elementId);
    const isPositive = inverse ? trend < 0 : trend > 0;
    const arrow = isPositive ? '↗' : '↘';
    const color = isPositive ? '#27AE60' : '#C0392B';
    
    element.innerHTML = `<span style="color: ${color}">${arrow} ${Math.abs(trend).toFixed(1)}%</span>`;
}

function initDashboardCharts() {
    // Graphique d'évolution
    const evolutionCtx = document.getElementById('evolutionChart').getContext('2d');
    dashboardCharts.evolution = new Chart(evolutionCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Volume (kg)',
                data: [],
                borderColor: '#2D5016',
                backgroundColor: 'rgba(45, 80, 22, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Graphique qualité
    const qualityCtx = document.getElementById('qualityChart').getContext('2d');
    dashboardCharts.quality = new Chart(qualityCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#2D5016', '#4A7C2A', '#E67E22', '#F39C12', '#8B6914']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Graphique top planteurs
    const topPlantersCtx = document.getElementById('topPlantersChart').getContext('2d');
    dashboardCharts.topPlanters = new Chart(topPlantersCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Volume (kg)',
                data: [],
                backgroundColor: '#E67E22'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });

    // Graphique zones
    const zonesCtx = document.getElementById('zonesChart').getContext('2d');
    dashboardCharts.zones = new Chart(zonesCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#2D5016', '#4A7C2A', '#E67E22', '#F39C12', '#8B6914', '#27AE60']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Graphique prévisions
    const forecastCtx = document.getElementById('forecastChart').getContext('2d');
    dashboardCharts.forecast = new Chart(forecastCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Historique',
                    data: [],
                    borderColor: '#2D5016',
                    backgroundColor: 'rgba(45, 80, 22, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Prévision',
                    data: [],
                    borderColor: '#E67E22',
                    backgroundColor: 'rgba(230, 126, 34, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    updateDashboardCharts();
}

function updateDashboardCharts() {
    updateEvolutionChart();
    updateQualityChart();
    updateTopPlantersChart();
    updateZonesChart();
    updateForecastChart();
    updateTopPlantersTable();
}

function updateEvolutionChart() {
    // Grouper par jour
    const dailyData = {};
    dashboardData.deliveries.forEach(d => {
        const date = d.date;
        dailyData[date] = (dailyData[date] || 0) + d.quantity_kg;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const values = sortedDates.map(date => dailyData[date]);

    dashboardCharts.evolution.data.labels = sortedDates;
    dashboardCharts.evolution.data.datasets[0].data = values;
    dashboardCharts.evolution.update();
}

function updateQualityChart() {
    const qualityData = {};
    dashboardData.deliveries.forEach(d => {
        const quality = d.cocoa_quality || 'Non spécifié';
        qualityData[quality] = (qualityData[quality] || 0) + d.quantity_kg;
    });

    dashboardCharts.quality.data.labels = Object.keys(qualityData);
    dashboardCharts.quality.data.datasets[0].data = Object.values(qualityData);
    dashboardCharts.quality.update();
}

function updateTopPlantersChart() {
    // Calculer le volume par planteur
    const planterVolumes = {};
    dashboardData.deliveries.forEach(d => {
        planterVolumes[d.planter_id] = (planterVolumes[d.planter_id] || 0) + d.quantity_kg;
    });

    // Trier et prendre le top 10
    const sorted = Object.entries(planterVolumes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Récupérer les noms
    const planterMap = {};
    dashboardData.planters.forEach(p => planterMap[p.id] = p.name);

    const labels = sorted.map(([id]) => planterMap[id] || `Planteur ${id}`);
    const values = sorted.map(([, volume]) => volume);

    dashboardCharts.topPlanters.data.labels = labels;
    dashboardCharts.topPlanters.data.datasets[0].data = values;
    dashboardCharts.topPlanters.update();
}

function updateZonesChart() {
    const zoneData = {};
    dashboardData.deliveries.forEach(d => {
        const zone = d.load_location || 'Non spécifié';
        zoneData[zone] = (zoneData[zone] || 0) + d.quantity_kg;
    });

    dashboardCharts.zones.data.labels = Object.keys(zoneData);
    dashboardCharts.zones.data.datasets[0].data = Object.values(zoneData);
    dashboardCharts.zones.update();
}

function updateForecastChart() {
    // Calculer la moyenne mobile sur 7 jours
    const dailyData = {};
    dashboardData.deliveries.forEach(d => {
        dailyData[d.date] = (dailyData[d.date] || 0) + d.quantity_kg;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const historicalValues = sortedDates.map(date => dailyData[date]);

    // Calculer la moyenne pour les prévisions
    const avgVolume = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const trend = historicalValues.length > 1 ? 
        (historicalValues[historicalValues.length - 1] - historicalValues[0]) / historicalValues.length : 0;

    // Générer 30 jours de prévisions
    const forecastDates = [];
    const forecastValues = [];
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    
    for (let i = 1; i <= 30; i++) {
        const date = new Date(lastDate);
        date.setDate(date.getDate() + i);
        forecastDates.push(date.toISOString().split('T')[0]);
        forecastValues.push(Math.max(0, avgVolume + (trend * i)));
    }

    // Combiner historique et prévisions
    const allDates = [...sortedDates.slice(-30), ...forecastDates];
    const historicalData = [...historicalValues.slice(-30), ...Array(30).fill(null)];
    const forecastData = [...Array(Math.min(30, sortedDates.length)).fill(null), ...forecastValues];

    dashboardCharts.forecast.data.labels = allDates;
    dashboardCharts.forecast.data.datasets[0].data = historicalData;
    dashboardCharts.forecast.data.datasets[1].data = forecastData;
    dashboardCharts.forecast.update();
}

function updateTopPlantersTable() {
    // Calculer les stats par planteur
    const planterStats = {};
    dashboardData.deliveries.forEach(d => {
        if (!planterStats[d.planter_id]) {
            planterStats[d.planter_id] = {
                volume: 0,
                deliveries: 0,
                ca: 0
            };
        }
        planterStats[d.planter_id].volume += d.quantity_kg;
        planterStats[d.planter_id].deliveries += 1;
        planterStats[d.planter_id].ca += d.quantity_kg * 2500;
    });

    // Trier par volume
    const sorted = Object.entries(planterStats)
        .sort((a, b) => b[1].volume - a[1].volume)
        .slice(0, 10);

    // Récupérer les noms
    const planterMap = {};
    dashboardData.planters.forEach(p => planterMap[p.id] = p.name);

    let html = `
        <table class="simple-table">
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Planteur</th>
                    <th>Volume (kg)</th>
                    <th>Livraisons</th>
                    <th>CA (FCFA)</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(([id, stats], index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        html += `
            <tr>
                <td>${medal} ${index + 1}</td>
                <td>${planterMap[id] || `Planteur ${id}`}</td>
                <td>${stats.volume.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                <td>${stats.deliveries}</td>
                <td>${stats.ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById('topPlantersTable').innerHTML = html;
}
