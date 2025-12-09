// Dashboard amélioré avec KPIs et graphiques

let dashboardCharts = {};
let dashboardData = {};
let dashboardRefreshInterval = null;

async function loadDashboardPage(container) {
    // Afficher un loader pendant le chargement
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="loading-spinner"></div>
            <p>Chargement du dashboard...</p>
        </div>
    `;
    
    // Attendre un peu pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 300));
    
    container.innerHTML = `
        <div class="dashboard-container">
            <!-- Filtres Avancés -->
            <div class="filters-panel" id="filtersPanel">
                <div class="filters-header">
                    <h3>🔍 Filtres Avancés</h3>
                    <div class="filters-actions">
                        <span class="filter-count" id="filterCount">0 filtre(s) actif(s)</span>
                        <button class="btn-reset-filters" id="resetFilters">Réinitialiser</button>
                        <button class="btn-toggle-filters" id="toggleFilters">
                            <span>▼</span>
                        </button>
                    </div>
                </div>
                <div class="filters-content" id="filtersContent">
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label>📅 Période</label>
                            <div class="period-quick-buttons">
                                <button class="btn-period active" data-period="30">30 jours</button>
                                <button class="btn-period" data-period="90">90 jours</button>
                                <button class="btn-period" data-period="365">1 an</button>
                                <button class="btn-period" data-period="all">Tout</button>
                            </div>
                            <div class="custom-date-range">
                                <input type="date" id="filterDateFrom" class="date-input" placeholder="Du">
                                <span>à</span>
                                <input type="date" id="filterDateTo" class="date-input" placeholder="Au">
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label>👨‍🌾 Planteur</label>
                            <input type="text" id="planterSearch" class="filter-search" placeholder="Rechercher un planteur...">
                            <select id="filterPlanter" class="filter-select" multiple size="5">
                                <option value="">Tous les planteurs</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>🗺️ Zone</label>
                            <select id="filterZone" class="filter-select" multiple size="5">
                                <option value="">Toutes les zones</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>⭐ Qualité</label>
                            <select id="filterQuality" class="filter-select" multiple size="5">
                                <option value="">Toutes les qualités</option>
                            </select>
                        </div>
                    </div>
                    <div class="filters-footer">
                        <button class="btn-apply-filters" id="applyFilters">Appliquer les filtres</button>
                        <button class="btn-export-filtered" id="exportFiltered">📥 Exporter les données filtrées</button>
                    </div>
                </div>
            </div>

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

            <!-- Comparaisons Temporelles Section -->
            <div class="card">
                <div class="card-header">
                    <h3>📅 Comparaisons Temporelles</h3>
                    <div class="comparison-controls">
                        <button class="btn-comparison active" data-type="monthly">Mois par Mois</button>
                        <button class="btn-comparison" data-type="yearly">Année sur Année</button>
                        <button class="btn-comparison" data-type="custom">Personnalisé</button>
                    </div>
                </div>
                <div id="comparisonContent">
                    <!-- Contenu dynamique -->
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
    initTemporalComparisons();
    initAdvancedFilters();
    
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
    
    // Animer les KPIs avec compteur incrémental
    animateCounter(kpiVolume, 0, dashboardData.totalVolume, 1500, ' kg');
    animateCounter(kpiLivraisons, 0, dashboardData.totalLivraisons, 1200, '');
    animateCounter(kpiMoyenne, 0, dashboardData.moyenneParLivraison, 1300, ' kg', 1);
    animateCounter(kpiPlanteurs, 0, dashboardData.activePlanters, 1000, '');

    // Calculer les tendances (comparaison avec période précédente)
    calculateTrends();
}

// Fonction d'animation de compteur
function animateCounter(element, start, end, duration, suffix = '', decimals = 0) {
    const startTime = performance.now();
    const range = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + (range * easeOut);
        
        element.textContent = current.toLocaleString('fr-FR', { 
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals 
        }) + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
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
    
    // Configuration d'animation commune
    const animationConfig = {
        duration: 1500,
        easing: 'easeInOutQuart',
        delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
                delay = context.dataIndex * 50;
            }
            return delay;
        }
    };
    
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
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#2D5016',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#E67E22',
                pointHoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: animationConfig,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { 
                    display: true,
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#333'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
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
                backgroundColor: ['#2D5016', '#4A7C2A', '#E67E22', '#F39C12', '#8B6914'],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 15,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { 
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#333',
                        boxWidth: 15,
                        boxHeight: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString()} kg (${percentage}%)`;
                        }
                    }
                }
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
                backgroundColor: (context) => {
                    const index = context.dataIndex;
                    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#E67E22', '#E67E22'];
                    return colors[index] || '#E67E22';
                },
                borderRadius: 8,
                borderSkipped: false,
                hoverBackgroundColor: '#2D5016'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart',
                delay: (context) => context.dataIndex * 100
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `Volume: ${context.parsed.x.toLocaleString()} kg`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
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


// ============================================
// COMPARAISONS TEMPORELLES
// ============================================

let comparisonChart = null;
let currentComparisonType = 'monthly';

function initTemporalComparisons() {
    // Gérer les boutons de comparaison
    document.querySelectorAll('.btn-comparison').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-comparison').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentComparisonType = e.target.dataset.type;
            loadComparisonData();
        });
    });
    
    // Charger la comparaison par défaut
    loadComparisonData();
}

async function loadComparisonData() {
    const container = document.getElementById('comparisonContent');
    
    if (currentComparisonType === 'monthly') {
        await loadMonthlyComparison(container);
    } else if (currentComparisonType === 'yearly') {
        await loadYearlyComparison(container);
    } else if (currentComparisonType === 'custom') {
        await loadCustomComparison(container);
    }
}

async function loadMonthlyComparison(container) {
    container.innerHTML = `
        <div class="comparison-section">
            <div class="comparison-header">
                <h4>📊 Comparaison Mensuelle ${new Date().getFullYear()}</h4>
                <select id="monthlyYear" class="period-selector">
                    <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
                    <option value="${new Date().getFullYear() - 1}">${new Date().getFullYear() - 1}</option>
                    <option value="${new Date().getFullYear() - 2}">${new Date().getFullYear() - 2}</option>
                </select>
            </div>
            <canvas id="monthlyComparisonChart"></canvas>
            <div id="monthlyStats" class="comparison-stats"></div>
        </div>
    `;
    
    // Écouter le changement d'année
    document.getElementById('monthlyYear').addEventListener('change', (e) => {
        updateMonthlyComparison(parseInt(e.target.value));
    });
    
    await updateMonthlyComparison(new Date().getFullYear());
}

async function updateMonthlyComparison(year) {
    // Grouper les livraisons par mois
    const monthlyData = Array(12).fill(0);
    const monthlyDeliveries = Array(12).fill(0);
    
    dashboardData.deliveries.forEach(d => {
        const date = new Date(d.date);
        if (date.getFullYear() === year) {
            const month = date.getMonth();
            monthlyData[month] += d.quantity_kg;
            monthlyDeliveries[month]++;
        }
    });
    
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    // Créer ou mettre à jour le graphique
    const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Volume (kg)',
                data: monthlyData,
                backgroundColor: months.map((_, i) => {
                    const currentMonth = new Date().getMonth();
                    return i === currentMonth ? '#E67E22' : '#2D5016';
                }),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const volume = context.parsed.y;
                            const deliveries = monthlyDeliveries[context.dataIndex];
                            return [
                                `Volume: ${volume.toLocaleString()} kg`,
                                `Livraisons: ${deliveries}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
    
    // Afficher les statistiques
    const totalVolume = monthlyData.reduce((a, b) => a + b, 0);
    const avgVolume = totalVolume / 12;
    const maxMonth = monthlyData.indexOf(Math.max(...monthlyData));
    const minMonth = monthlyData.indexOf(Math.min(...monthlyData.filter(v => v > 0)));
    
    document.getElementById('monthlyStats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Volume Total ${year}</div>
                <div class="stat-value">${totalVolume.toLocaleString()} kg</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Moyenne Mensuelle</div>
                <div class="stat-value">${avgVolume.toLocaleString(undefined, {maximumFractionDigits: 0})} kg</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Meilleur Mois</div>
                <div class="stat-value">${months[maxMonth]} (${monthlyData[maxMonth].toLocaleString()} kg)</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Mois le Plus Faible</div>
                <div class="stat-value">${months[minMonth]} (${monthlyData[minMonth].toLocaleString()} kg)</div>
            </div>
        </div>
    `;
}

async function loadYearlyComparison(container) {
    container.innerHTML = `
        <div class="comparison-section">
            <div class="comparison-header">
                <h4>📈 Comparaison Année sur Année</h4>
                <div class="year-selector-group">
                    <label>Comparer:</label>
                    <select id="year1" class="period-selector">
                        <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
                        <option value="${new Date().getFullYear() - 1}">${new Date().getFullYear() - 1}</option>
                        <option value="${new Date().getFullYear() - 2}">${new Date().getFullYear() - 2}</option>
                    </select>
                    <span>vs</span>
                    <select id="year2" class="period-selector">
                        <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
                        <option value="${new Date().getFullYear() - 1}" selected>${new Date().getFullYear() - 1}</option>
                        <option value="${new Date().getFullYear() - 2}">${new Date().getFullYear() - 2}</option>
                    </select>
                </div>
            </div>
            <canvas id="yearlyComparisonChart"></canvas>
            <div id="yearlyStats" class="comparison-stats"></div>
        </div>
    `;
    
    // Écouter les changements
    document.getElementById('year1').addEventListener('change', updateYearlyComparison);
    document.getElementById('year2').addEventListener('change', updateYearlyComparison);
    
    await updateYearlyComparison();
}

async function updateYearlyComparison() {
    const year1 = parseInt(document.getElementById('year1').value);
    const year2 = parseInt(document.getElementById('year2').value);
    
    // Grouper par mois pour chaque année
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const year1Data = Array(12).fill(0);
    const year2Data = Array(12).fill(0);
    
    dashboardData.deliveries.forEach(d => {
        const date = new Date(d.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        if (year === year1) {
            year1Data[month] += d.quantity_kg;
        } else if (year === year2) {
            year2Data[month] += d.quantity_kg;
        }
    });
    
    const ctx = document.getElementById('yearlyComparisonChart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: year1.toString(),
                    data: year1Data,
                    borderColor: '#2D5016',
                    backgroundColor: 'rgba(45, 80, 22, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: year2.toString(),
                    data: year2Data,
                    borderColor: '#E67E22',
                    backgroundColor: 'rgba(230, 126, 34, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { 
                            size: 16,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#333',
                        boxWidth: 20,
                        boxHeight: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
    
    // Calculer les statistiques
    const total1 = year1Data.reduce((a, b) => a + b, 0);
    const total2 = year2Data.reduce((a, b) => a + b, 0);
    const diff = total1 - total2;
    const diffPercent = total2 > 0 ? ((diff / total2) * 100) : 0;
    const isPositive = diff > 0;
    
    document.getElementById('yearlyStats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Total ${year1}</div>
                <div class="stat-value">${total1.toLocaleString()} kg</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total ${year2}</div>
                <div class="stat-value">${total2.toLocaleString()} kg</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Différence</div>
                <div class="stat-value" style="color: ${isPositive ? '#27AE60' : '#C0392B'}">
                    ${isPositive ? '↗' : '↘'} ${Math.abs(diff).toLocaleString()} kg
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Variation</div>
                <div class="stat-value" style="color: ${isPositive ? '#27AE60' : '#C0392B'}">
                    ${isPositive ? '+' : ''}${diffPercent.toFixed(1)}%
                </div>
            </div>
        </div>
    `;
}

async function loadCustomComparison(container) {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    container.innerHTML = `
        <div class="comparison-section">
            <div class="comparison-header">
                <h4>🎯 Comparaison Personnalisée</h4>
            </div>
            <div class="custom-period-selector">
                <div class="period-group">
                    <label>Période 1:</label>
                    <input type="date" id="period1Start" class="date-input" value="${monthAgo}">
                    <span>à</span>
                    <input type="date" id="period1End" class="date-input" value="${today}">
                </div>
                <div class="period-group">
                    <label>Période 2:</label>
                    <input type="date" id="period2Start" class="date-input" value="${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                    <span>à</span>
                    <input type="date" id="period2End" class="date-input" value="${monthAgo}">
                </div>
                <button id="compareBtn" class="btn btn-primary">Comparer</button>
            </div>
            <div class="quick-compare-buttons">
                <button class="btn-quick" data-type="month">Ce mois vs Mois dernier</button>
                <button class="btn-quick" data-type="quarter">Ce trimestre vs Trimestre dernier</button>
                <button class="btn-quick" data-type="year">Cette année vs Année dernière</button>
            </div>
            <canvas id="customComparisonChart"></canvas>
            <div id="customStats" class="comparison-stats"></div>
        </div>
    `;
    
    // Boutons rapides
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            setQuickPeriod(type);
        });
    });
    
    // Bouton comparer
    document.getElementById('compareBtn').addEventListener('click', updateCustomComparison);
    
    // Charger la comparaison par défaut
    await updateCustomComparison();
}

function setQuickPeriod(type) {
    const now = new Date();
    let p1Start, p1End, p2Start, p2End;
    
    if (type === 'month') {
        // Ce mois
        p1Start = new Date(now.getFullYear(), now.getMonth(), 1);
        p1End = now;
        // Mois dernier
        p2Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        p2End = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'quarter') {
        // Ce trimestre
        const currentQuarter = Math.floor(now.getMonth() / 3);
        p1Start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        p1End = now;
        // Trimestre dernier
        p2Start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        p2End = new Date(now.getFullYear(), currentQuarter * 3, 0);
    } else if (type === 'year') {
        // Cette année
        p1Start = new Date(now.getFullYear(), 0, 1);
        p1End = now;
        // Année dernière
        p2Start = new Date(now.getFullYear() - 1, 0, 1);
        p2End = new Date(now.getFullYear() - 1, 11, 31);
    }
    
    document.getElementById('period1Start').value = p1Start.toISOString().split('T')[0];
    document.getElementById('period1End').value = p1End.toISOString().split('T')[0];
    document.getElementById('period2Start').value = p2Start.toISOString().split('T')[0];
    document.getElementById('period2End').value = p2End.toISOString().split('T')[0];
    
    updateCustomComparison();
}

async function updateCustomComparison() {
    const p1Start = new Date(document.getElementById('period1Start').value);
    const p1End = new Date(document.getElementById('period1End').value);
    const p2Start = new Date(document.getElementById('period2Start').value);
    const p2End = new Date(document.getElementById('period2End').value);
    
    // Filtrer les livraisons
    const period1Deliveries = dashboardData.deliveries.filter(d => {
        const date = new Date(d.date);
        return date >= p1Start && date <= p1End;
    });
    
    const period2Deliveries = dashboardData.deliveries.filter(d => {
        const date = new Date(d.date);
        return date >= p2Start && date <= p2End;
    });
    
    // Calculer les totaux
    const p1Volume = period1Deliveries.reduce((sum, d) => sum + d.quantity_kg, 0);
    const p2Volume = period2Deliveries.reduce((sum, d) => sum + d.quantity_kg, 0);
    const p1Count = period1Deliveries.length;
    const p2Count = period2Deliveries.length;
    
    const ctx = document.getElementById('customComparisonChart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Volume (kg)', 'Nombre de Livraisons'],
            datasets: [
                {
                    label: 'Période 1',
                    data: [p1Volume, p1Count],
                    backgroundColor: '#2D5016',
                    borderRadius: 8
                },
                {
                    label: 'Période 2',
                    data: [p2Volume, p2Count],
                    backgroundColor: '#E67E22',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#333',
                        padding: 20,
                        boxWidth: 20,
                        boxHeight: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });
    
    // Statistiques
    const volumeDiff = p1Volume - p2Volume;
    const volumePercent = p2Volume > 0 ? ((volumeDiff / p2Volume) * 100) : 0;
    const countDiff = p1Count - p2Count;
    const countPercent = p2Count > 0 ? ((countDiff / p2Count) * 100) : 0;
    
    document.getElementById('customStats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Période 1 - Volume</div>
                <div class="stat-value">${p1Volume.toLocaleString()} kg</div>
                <div class="stat-change" style="color: ${volumeDiff >= 0 ? '#27AE60' : '#C0392B'}">
                    ${volumeDiff >= 0 ? '↗' : '↘'} ${volumePercent.toFixed(1)}%
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Période 2 - Volume</div>
                <div class="stat-value">${p2Volume.toLocaleString()} kg</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Période 1 - Livraisons</div>
                <div class="stat-value">${p1Count}</div>
                <div class="stat-change" style="color: ${countDiff >= 0 ? '#27AE60' : '#C0392B'}">
                    ${countDiff >= 0 ? '↗' : '↘'} ${countPercent.toFixed(1)}%
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Période 2 - Livraisons</div>
                <div class="stat-value">${p2Count}</div>
            </div>
        </div>
    `;
}


// ============================================
// FILTRES AVANCÉS
// ============================================

let activeFilters = {
    period: 30,
    dateFrom: null,
    dateTo: null,
    planters: [],
    zones: [],
    qualities: []
};

let allDeliveries = [];
let filteredDeliveries = [];

function initAdvancedFilters() {
    // Stocker toutes les livraisons
    allDeliveries = [...dashboardData.deliveries];
    
    // Peupler les filtres
    populateFilterOptions();
    
    // Toggle filters panel
    document.getElementById('toggleFilters').addEventListener('click', toggleFiltersPanel);
    
    // Boutons de période rapide
    document.querySelectorAll('.btn-period').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeFilters.period = e.target.dataset.period;
            
            // Réinitialiser les dates personnalisées
            document.getElementById('filterDateFrom').value = '';
            document.getElementById('filterDateTo').value = '';
            activeFilters.dateFrom = null;
            activeFilters.dateTo = null;
        });
    });
    
    // Dates personnalisées
    document.getElementById('filterDateFrom').addEventListener('change', (e) => {
        activeFilters.dateFrom = e.target.value;
        activeFilters.period = 'custom';
        document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    });
    
    document.getElementById('filterDateTo').addEventListener('change', (e) => {
        activeFilters.dateTo = e.target.value;
        activeFilters.period = 'custom';
        document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    });
    
    // Recherche de planteur
    document.getElementById('planterSearch').addEventListener('input', (e) => {
        filterPlanterOptions(e.target.value);
    });
    
    // Appliquer les filtres
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    
    // Réinitialiser les filtres
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Export filtré
    document.getElementById('exportFiltered').addEventListener('click', exportFilteredData);
    
    // Appliquer les filtres par défaut
    applyFilters();
}

function populateFilterOptions() {
    // Planteurs
    const planterSelect = document.getElementById('filterPlanter');
    const planters = [...new Set(allDeliveries.map(d => d.planter_id))];
    const planterMap = {};
    dashboardData.planters.forEach(p => planterMap[p.id] = p.name);
    
    planters.forEach(planterId => {
        const option = document.createElement('option');
        option.value = planterId;
        option.textContent = planterMap[planterId] || `Planteur ${planterId}`;
        planterSelect.appendChild(option);
    });
    
    // Zones
    const zoneSelect = document.getElementById('filterZone');
    const zones = [...new Set(allDeliveries.map(d => d.load_location))].filter(z => z);
    zones.sort();
    
    zones.forEach(zone => {
        const option = document.createElement('option');
        option.value = zone;
        option.textContent = zone;
        zoneSelect.appendChild(option);
    });
    
    // Qualités
    const qualitySelect = document.getElementById('filterQuality');
    const qualities = [...new Set(allDeliveries.map(d => d.quality))].filter(q => q);
    qualities.sort();
    
    qualities.forEach(quality => {
        const option = document.createElement('option');
        option.value = quality;
        option.textContent = quality;
        qualitySelect.appendChild(option);
    });
}

function filterPlanterOptions(searchTerm) {
    const planterSelect = document.getElementById('filterPlanter');
    const options = planterSelect.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === '') return;
        const text = option.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        option.style.display = matches ? '' : 'none';
    });
}

function toggleFiltersPanel() {
    const content = document.getElementById('filtersContent');
    const button = document.getElementById('toggleFilters');
    const isVisible = content.style.display !== 'none';
    
    content.style.display = isVisible ? 'none' : 'block';
    button.querySelector('span').textContent = isVisible ? '▶' : '▼';
}

function applyFilters() {
    // Récupérer les valeurs des filtres
    const planterSelect = document.getElementById('filterPlanter');
    const zoneSelect = document.getElementById('filterZone');
    const qualitySelect = document.getElementById('filterQuality');
    
    activeFilters.planters = Array.from(planterSelect.selectedOptions)
        .map(opt => opt.value)
        .filter(v => v !== '');
    
    activeFilters.zones = Array.from(zoneSelect.selectedOptions)
        .map(opt => opt.value)
        .filter(v => v !== '');
    
    activeFilters.qualities = Array.from(qualitySelect.selectedOptions)
        .map(opt => opt.value)
        .filter(v => v !== '');
    
    // Filtrer les livraisons
    filteredDeliveries = allDeliveries.filter(delivery => {
        // Filtre par période
        const deliveryDate = new Date(delivery.date);
        
        if (activeFilters.period === 'custom') {
            if (activeFilters.dateFrom) {
                const fromDate = new Date(activeFilters.dateFrom);
                if (deliveryDate < fromDate) return false;
            }
            if (activeFilters.dateTo) {
                const toDate = new Date(activeFilters.dateTo);
                if (deliveryDate > toDate) return false;
            }
        } else if (activeFilters.period !== 'all') {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(activeFilters.period));
            if (deliveryDate < cutoffDate) return false;
        }
        
        // Filtre par planteur
        if (activeFilters.planters.length > 0) {
            if (!activeFilters.planters.includes(delivery.planter_id)) return false;
        }
        
        // Filtre par zone
        if (activeFilters.zones.length > 0) {
            if (!activeFilters.zones.includes(delivery.load_location)) return false;
        }
        
        // Filtre par qualité
        if (activeFilters.qualities.length > 0) {
            if (!activeFilters.qualities.includes(delivery.quality)) return false;
        }
        
        return true;
    });
    
    // Mettre à jour dashboardData avec les données filtrées
    dashboardData.deliveries = filteredDeliveries;
    
    // Recalculer les KPIs et mettre à jour les graphiques
    const totalVolume = filteredDeliveries.reduce((sum, d) => sum + d.quantity_kg, 0);
    const totalLivraisons = filteredDeliveries.length;
    const moyenneParLivraison = totalLivraisons > 0 ? totalVolume / totalLivraisons : 0;
    
    dashboardData.totalVolume = totalVolume;
    dashboardData.totalLivraisons = totalLivraisons;
    dashboardData.moyenneParLivraison = moyenneParLivraison;
    dashboardData.activePlanters = new Set(filteredDeliveries.map(d => d.planter_id)).size;
    
    // Mettre à jour l'affichage
    updateKPIs();
    updateDashboardCharts();
    
    // Mettre à jour le compteur de filtres
    updateFilterCount();
    
    // Afficher une notification
    showToast(`${filteredDeliveries.length} livraison(s) trouvée(s)`, 'success');
}

function resetFilters() {
    // Réinitialiser les valeurs
    activeFilters = {
        period: 30,
        dateFrom: null,
        dateTo: null,
        planters: [],
        zones: [],
        qualities: []
    };
    
    // Réinitialiser l'interface
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-period[data-period="30"]').classList.add('active');
    
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('planterSearch').value = '';
    
    document.getElementById('filterPlanter').selectedIndex = -1;
    document.getElementById('filterZone').selectedIndex = -1;
    document.getElementById('filterQuality').selectedIndex = -1;
    
    // Réafficher toutes les options de planteurs
    document.querySelectorAll('#filterPlanter option').forEach(opt => {
        opt.style.display = '';
    });
    
    // Restaurer toutes les données
    dashboardData.deliveries = [...allDeliveries];
    
    // Réappliquer
    applyFilters();
    
    showToast('Filtres réinitialisés', 'info');
}

function updateFilterCount() {
    let count = 0;
    
    if (activeFilters.period === 'custom' && (activeFilters.dateFrom || activeFilters.dateTo)) {
        count++;
    }
    if (activeFilters.planters.length > 0) count++;
    if (activeFilters.zones.length > 0) count++;
    if (activeFilters.qualities.length > 0) count++;
    
    const countElement = document.getElementById('filterCount');
    countElement.textContent = `${count} filtre(s) actif(s)`;
    countElement.style.color = count > 0 ? '#E67E22' : '#666';
    countElement.style.fontWeight = count > 0 ? 'bold' : 'normal';
}

async function exportFilteredData() {
    if (filteredDeliveries.length === 0) {
        showToast('Aucune donnée à exporter', 'warning');
        return;
    }
    
    try {
        // Créer un CSV
        const headers = ['Date', 'Planteur', 'Zone', 'Qualité', 'Volume (kg)', 'Véhicule'];
        const planterMap = {};
        dashboardData.planters.forEach(p => planterMap[p.id] = p.name);
        
        const rows = filteredDeliveries.map(d => [
            d.date,
            planterMap[d.planter_id] || d.planter_id,
            d.load_location,
            d.quality,
            d.quantity_kg,
            d.vehicle || 'N/A'
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        // Télécharger
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `livraisons_filtrees_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Export réussi', 'success');
    } catch (error) {
        console.error('Erreur export:', error);
        showToast('Erreur lors de l\'export', 'error');
    }
}
