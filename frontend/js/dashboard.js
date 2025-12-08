// Dashboard amélioré avec KPIs et graphiques

let dashboardCharts = {};
let dashboardData = {};
let dashboardRefreshInterval = null;

async function loadDashboardPage(container) {
    container.innerHTML = `
        <div class="dashboard-container">
            <!-- KPIs Section -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Volume Total</div>
                        <div class="kpi-value" id="kpiVolume">0 kg</div>
                        <div class="kpi-trend" id="kpiVolumeTrend"></div>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-icon">🚚</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Nombre de Livraisons</div>
                        <div class="kpi-value" id="kpiLivraisons">0</div>
                        <div class="kpi-trend" id="kpiLivraisonsTrend"></div>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Moyenne par Livraison</div>
                        <div class="kpi-value" id="kpiMoyenne">0 kg</div>
                        <div class="kpi-trend" id="kpiMoyenneTrend"></div>
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

    // Attendre que le DOM soit mis à jour
    await new Promise(resolve => setTimeout(resolve, 0));
    
    await loadDashboardData();
    initDashboardCharts();
    
    // Nettoyer l'ancien intervalle s'il existe
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }
    
    // Rafraîchir toutes les 30 secondes
    dashboardRefreshInterval = setInterval(async () => {
        // Vérifier que nous sommes toujours sur la page dashboard
        if (!document.getElementById('evolutionChart')) {
            clearInterval(dashboardRefreshInterval);
            dashboardRefreshInterval = null;
            return;
        }
        await loadDashboardData();
        updateDashboardCharts();
    }, 30000);

    // Gérer le changement de période
    const periodSelector = document.getElementById('evolutionPeriod');
    if (periodSelector) {
        periodSelector.addEventListener('change', async (e) => {
            await loadDashboardData(parseInt(e.target.value));
            updateEvolutionChart();
        });
    }
}

async function loadDashboardData(days = 30) {
    try {
        // Charger les données
        const deliveries = await api.getDeliveries({ size: 10000 });
        const planters = await api.getPlanters({ size: 1000 });
        
        // Vérifier que les données sont valides
        const allDeliveries = Array.isArray(deliveries) ? deliveries : 
                             (deliveries?.items && Array.isArray(deliveries.items)) ? deliveries.items : [];
        const allPlanters = Array.isArray(planters) ? planters :
                           (planters?.items && Array.isArray(planters.items)) ? planters.items : [];

        // Filtrer par période
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const recentDeliveries = allDeliveries.filter(d => new Date(d.date) >= cutoffDate);

        // Calculer les KPIs
        const totalVolume = recentDeliveries.reduce((sum, d) => sum + d.quantity_kg, 0);
        const totalLivraisons = recentDeliveries.length;
        const moyenneParLivraison = totalLivraisons > 0 ? totalVolume / totalLivraisons : 0;

        dashboardData = {
            totalVolume: totalVolume,
            totalLivraisons: totalLivraisons,
            moyenneParLivraison: moyenneParLivraison,
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
    // Vérifier que les éléments existent
    const kpiVolume = document.getElementById('kpiVolume');
    const kpiLivraisons = document.getElementById('kpiLivraisons');
    const kpiMoyenne = document.getElementById('kpiMoyenne');
    const kpiPlanteurs = document.getElementById('kpiPlanteurs');
    
    if (!kpiVolume || !kpiLivraisons || !kpiMoyenne || !kpiPlanteurs) {
        return;
    }
    
    // Volume
    kpiVolume.textContent = 
        `${dashboardData.totalVolume.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg`;
    
    // Livraisons
    kpiLivraisons.textContent = 
        dashboardData.totalLivraisons.toLocaleString('fr-FR');
    
    // Moyenne
    kpiMoyenne.textContent = 
        `${dashboardData.moyenneParLivraison.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`;
    
    // Planteurs
    kpiPlanteurs.textContent = dashboardData.activePlanters;

    // Calculer les tendances (comparaison avec période précédente)
    calculateTrends();
}

function calculateTrends() {
    // Diviser la période en deux pour comparer
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - dashboardData.days / 2);
    
    const recent = dashboardData.deliveries.filter(d => new Date(d.date) >= midPoint);
    const previous = dashboardData.deliveries.filter(d => new Date(d.date) < midPoint);
    
    // Tendance volume
    const recentVolume = recent.reduce((sum, d) => sum + d.quantity_kg, 0);
    const previousVolume = previous.reduce((sum, d) => sum + d.quantity_kg, 0);
    const volumeTrend = previousVolume > 0 ? ((recentVolume - previousVolume) / previousVolume * 100) : 0;
    updateTrendIndicator('kpiVolumeTrend', volumeTrend);
    
    // Tendance livraisons
    const livraisonsTrend = previous.length > 0 ? ((recent.length - previous.length) / previous.length * 100) : 0;
    updateTrendIndicator('kpiLivraisonsTrend', livraisonsTrend);
    
    // Tendance moyenne
    const recentMoyenne = recent.length > 0 ? recentVolume / recent.length : 0;
    const previousMoyenne = previous.length > 0 ? previousVolume / previous.length : 0;
    const moyenneTrend = previousMoyenne > 0 ? ((recentMoyenne - previousMoyenne) / previousMoyenne * 100) : 0;
    updateTrendIndicator('kpiMoyenneTrend', moyenneTrend);
    
    // Tendance planteurs
    const recentPlanters = new Set(recent.map(d => d.planter_id)).size;
    const previousPlanters = new Set(previous.map(d => d.planter_id)).size;
    const plantersTrend = previousPlanters > 0 ? ((recentPlanters - previousPlanters) / previousPlanters * 100) : 0;
    updateTrendIndicator('kpiPlanteursTrend', plantersTrend);
}

function updateTrendIndicator(elementId, trend, inverse = false) {
    const element = document.getElementById(elementId);
    const isPositive = inverse ? trend < 0 : trend > 0;
    const arrow = isPositive ? '↗' : '↘';
    const color = isPositive ? '#27AE60' : '#C0392B';
    
    element.innerHTML = `<span style="color: ${color}">${arrow} ${Math.abs(trend).toFixed(1)}%</span>`;
}

function initDashboardCharts() {
    // Vérifier que les éléments canvas existent
    const evolutionCanvas = document.getElementById('evolutionChart');
    if (!evolutionCanvas) {
        console.warn('Chart canvas elements not found, skipping initialization');
        return;
    }
    
    // Graphique d'évolution
    const evolutionCtx = evolutionCanvas.getContext('2d');
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
    // Vérifier que les graphiques sont initialisés et que nous sommes sur la page dashboard
    if (!dashboardCharts.evolution || !document.getElementById('evolutionChart')) {
        return;
    }
    
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
    
    // Si pas de données, utiliser la date actuelle
    if (sortedDates.length === 0) {
        sortedDates.push(new Date().toISOString().split('T')[0]);
    }
    
    const historicalValues = sortedDates.map(date => dailyData[date] || 0);

    // Calculer la moyenne pour les prévisions
    const avgVolume = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length || 0;
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
                moyenne: 0
            };
        }
        planterStats[d.planter_id].volume += d.quantity_kg;
        planterStats[d.planter_id].deliveries += 1;
    });
    
    // Calculer la moyenne
    Object.values(planterStats).forEach(stats => {
        stats.moyenne = stats.deliveries > 0 ? stats.volume / stats.deliveries : 0;
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
                    <th>Moyenne (kg)</th>
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
                <td>${stats.moyenne.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    
    const tableElement = document.getElementById('topPlantersTable');
    if (tableElement) {
        tableElement.innerHTML = html;
    }
}
