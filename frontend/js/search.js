// Système de recherche globale et filtres avancés

class SearchManager {
    constructor() {
        this.searchResults = [];
        this.currentFilters = {};
    }

    // Recherche globale dans toutes les données
    async globalSearch(query) {
        if (!query || query.length < 2) {
            return { planteurs: [], livraisons: [], collectes: [], fournisseurs: [] };
        }

        const results = {
            planteurs: [],
            livraisons: [],
            collectes: [],
            fournisseurs: []
        };

        try {
            // Rechercher dans les planteurs
            const planters = await api.getPlanters({ size: 1000 });
            results.planteurs = (planters.items || planters).filter(p => 
                p.name?.toLowerCase().includes(query.toLowerCase()) ||
                p.code?.toLowerCase().includes(query.toLowerCase()) ||
                p.village?.toLowerCase().includes(query.toLowerCase())
            );

            // Rechercher dans les livraisons
            const deliveries = await api.getDeliveries({ size: 1000 });
            results.livraisons = (deliveries.items || deliveries).filter(d => 
                d.load_location?.toLowerCase().includes(query.toLowerCase()) ||
                d.unload_location?.toLowerCase().includes(query.toLowerCase()) ||
                d.cocoa_quality?.toLowerCase().includes(query.toLowerCase())
            );

            // Rechercher dans les collectes
            try {
                const collectes = await api.getCollectes({ size: 1000 });
                results.collectes = (collectes.items || collectes).filter(c => 
                    c.lieu?.toLowerCase().includes(query.toLowerCase()) ||
                    c.notes?.toLowerCase().includes(query.toLowerCase())
                );
            } catch (error) {
                console.log('Collectes non disponibles');
            }

            // Rechercher dans les fournisseurs
            try {
                const chefPlanters = await api.getChefPlanters({ size: 1000 });
                results.fournisseurs = (chefPlanters.items || chefPlanters).filter(f => 
                    f.nom?.toLowerCase().includes(query.toLowerCase()) ||
                    f.zone?.toLowerCase().includes(query.toLowerCase())
                );
            } catch (error) {
                console.log('Fournisseurs non disponibles');
            }

        } catch (error) {
            console.error('Erreur recherche globale:', error);
        }

        return results;
    }

    // Afficher les résultats de recherche
    displaySearchResults(results, container) {
        const totalResults = 
            results.planteurs.length + 
            results.livraisons.length + 
            results.collectes.length + 
            results.fournisseurs.length;

        if (totalResults === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Aucun résultat trouvé</p>
                </div>
            `;
            return;
        }

        let html = `<div class="search-results">`;

        // Planteurs
        if (results.planteurs.length > 0) {
            html += `
                <div class="result-section">
                    <h3>👨‍🌾 Planteurs (${results.planteurs.length})</h3>
                    <div class="result-list">
            `;
            results.planteurs.forEach(p => {
                html += `
                    <div class="result-item" onclick="loadPage('planters')">
                        <div class="result-title">${p.name}</div>
                        <div class="result-details">
                            Code: ${p.code || 'N/A'} | Village: ${p.village || 'N/A'}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Livraisons
        if (results.livraisons.length > 0) {
            html += `
                <div class="result-section">
                    <h3>📦 Livraisons (${results.livraisons.length})</h3>
                    <div class="result-list">
            `;
            results.livraisons.forEach(d => {
                html += `
                    <div class="result-item" onclick="loadPage('deliveries')">
                        <div class="result-title">${d.date} - ${d.quantity_kg} kg</div>
                        <div class="result-details">
                            ${d.load_location} → ${d.unload_location} | ${d.cocoa_quality}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Collectes
        if (results.collectes.length > 0) {
            html += `
                <div class="result-section">
                    <h3>🚚 Collectes (${results.collectes.length})</h3>
                    <div class="result-list">
            `;
            results.collectes.forEach(c => {
                html += `
                    <div class="result-item" onclick="loadPage('collectes')">
                        <div class="result-title">${c.date} - ${c.quantite_kg} kg</div>
                        <div class="result-details">
                            Lieu: ${c.lieu || 'N/A'}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Fournisseurs
        if (results.fournisseurs.length > 0) {
            html += `
                <div class="result-section">
                    <h3>👨‍🌾 Fournisseurs (${results.fournisseurs.length})</h3>
                    <div class="result-list">
            `;
            results.fournisseurs.forEach(f => {
                html += `
                    <div class="result-item" onclick="loadPage('chef-planteurs')">
                        <div class="result-title">${f.nom}</div>
                        <div class="result-details">
                            Zone: ${f.zone || 'N/A'}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    }

    // Filtres avancés pour les livraisons
    applyAdvancedFilters(data, filters) {
        let filtered = [...data];

        // Filtre par date
        if (filters.dateFrom) {
            filtered = filtered.filter(item => item.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            filtered = filtered.filter(item => item.date <= filters.dateTo);
        }

        // Filtre par zone/lieu
        if (filters.zone) {
            filtered = filtered.filter(item => 
                item.load_location?.toLowerCase().includes(filters.zone.toLowerCase()) ||
                item.unload_location?.toLowerCase().includes(filters.zone.toLowerCase())
            );
        }

        // Filtre par qualité
        if (filters.quality && filters.quality !== '') {
            filtered = filtered.filter(item => item.cocoa_quality === filters.quality);
        }

        // Filtre par fournisseur
        if (filters.fournisseur) {
            filtered = filtered.filter(item => item.chef_planteur_id === parseInt(filters.fournisseur));
        }

        // Filtre par quantité min/max
        if (filters.quantityMin) {
            filtered = filtered.filter(item => item.quantity_kg >= parseFloat(filters.quantityMin));
        }
        if (filters.quantityMax) {
            filtered = filtered.filter(item => item.quantity_kg <= parseFloat(filters.quantityMax));
        }

        return filtered;
    }

    // Exporter les données filtrées
    async exportFiltered(data, format = 'excel') {
        if (data.length === 0) {
            showToast('Aucune donnée à exporter', 'warning');
            return;
        }

        try {
            if (format === 'excel') {
                await this.exportToExcel(data);
            } else if (format === 'pdf') {
                await this.exportToPDF(data);
            }
        } catch (error) {
            console.error('Erreur export:', error);
            showToast('Erreur lors de l\'export', 'error');
        }
    }

    async exportToExcel(data) {
        // Utiliser l'API existante pour l'export Excel
        const response = await fetch(`${API_BASE}/deliveries/export/excel`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify({ data })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_filtre_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            showToast('Export Excel réussi', 'success');
        }
    }

    async exportToPDF(data) {
        // Utiliser l'API existante pour l'export PDF
        const response = await fetch(`${API_BASE}/deliveries/export/pdf`, {
            method: 'POST',
            headers: api.getHeaders(),
            body: JSON.stringify({ data })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_filtre_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            showToast('Export PDF réussi', 'success');
        }
    }
}

// Instance globale
window.searchManager = new SearchManager();

// Fonction pour afficher la page de recherche
async function loadSearchPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">🔍 Recherche Globale</h2>
            </div>
            
            <div style="padding: 20px;">
                <div class="form-group">
                    <input 
                        type="text" 
                        id="globalSearchInput" 
                        placeholder="Rechercher un planteur, livraison, collecte..." 
                        style="font-size: 1.1rem; padding: 16px;"
                    >
                </div>
                
                <div id="searchResultsContainer"></div>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('globalSearchInput');
    const resultsContainer = document.getElementById('searchResultsContainer');

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                resultsContainer.innerHTML = '<div class="spinner"></div>';
                const results = await window.searchManager.globalSearch(query);
                window.searchManager.displaySearchResults(results, resultsContainer);
            } else {
                resultsContainer.innerHTML = '';
            }
        }, 300);
    });

    searchInput.focus();
}
