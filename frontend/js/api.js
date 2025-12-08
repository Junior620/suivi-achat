// Configuration automatique de l'URL du backend
// En production (Vercel), utilise l'URL Azure
// En développement local, utilise localhost:8000
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    
    console.log('🔍 Détection hostname:', hostname);
    
    // Si on est sur Vercel (domaine .vercel.app) - utiliser HTTPS
    if (hostname.includes('vercel.app')) {
        console.log('📍 Mode: Production (Vercel)');
        return 'https://cocoatrack-api-20251129203507.azurewebsites.net/api/v1';
    }
    
    // Si on est en local (localhost, 127.0.0.1, ou IP locale 192.168.x.x) - utiliser HTTP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('📍 Mode: Local (localhost)');
        return `http://localhost:8000/api/v1`;
    }
    
    // Si on accède via une IP locale (depuis mobile/réseau)
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        const backendUrl = `http://${hostname}:8000/api/v1`;
        console.log('📍 Mode: Réseau local');
        console.log('🌐 Backend URL:', backendUrl);
        return backendUrl;
    }
    
    // Par défaut, utiliser HTTPS
    console.log('📍 Mode: Production (défaut)');
    return 'https://cocoatrack-api-20251129203507.azurewebsites.net/api/v1';
};

const API_BASE = getApiBaseUrl();
console.log('✅ API Base URL configurée:', API_BASE);

class API {
    constructor() {
        this.baseUrl = API_BASE;
        this.refreshInterval = null;
        this.startTokenRefreshTimer();
    }

    getToken() {
        return localStorage.getItem('access_token');
    }
    
    startTokenRefreshTimer() {
        // Rafraîchir le token toutes les 50 minutes (avant expiration à 60 min)
        this.refreshInterval = setInterval(async () => {
            const token = this.getToken();
            if (token) {
                console.log('⏰ Rafraîchissement automatique du token...');
                await this.refreshToken();
            }
        }, 50 * 60 * 1000); // 50 minutes
    }
    
    stopTokenRefreshTimer() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders()
        };

        try {
            const response = await fetch(url, config);
            if (response.status === 401) {
                // Si c'est la page de login, ne pas rediriger
                if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
                    // Essayer de rafraîchir le token
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Réessayer la requête avec le nouveau token
                        config.headers = this.getHeaders();
                        const retryResponse = await fetch(url, config);
                        if (retryResponse.ok) {
                            if (retryResponse.headers.get('content-type')?.includes('application/json')) {
                                return await retryResponse.json();
                            }
                            return retryResponse;
                        }
                    }
                    
                    // Si le refresh a échoué, déconnecter
                    console.log('❌ Token expiré et refresh échoué, déconnexion...');
                    if (typeof disconnectNotificationStream === 'function') {
                        disconnectNotificationStream();
                    }
                    localStorage.clear();
                    window.location.href = 'index.html';
                    return;
                }
            }
            if (!response.ok) {
                let errorMessage = `Erreur ${response.status}`;
                try {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || JSON.stringify(error);
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }
            if (response.headers.get('content-type')?.includes('application/json')) {
                return await response.json();
            }
            return response;
        } catch (error) {
            // Améliorer l'affichage de l'erreur
            let errorMessage = 'Erreur inconnue';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                errorMessage = JSON.stringify(error);
            }
            console.error('API Error:', errorMessage);
            console.error('Error details:', error);
            
            // Si offline et que c'est une requête GET, essayer le cache
            if (!navigator.onLine && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
                console.log('Mode offline : tentative de récupération depuis le cache');
                return this.getFromCache(endpoint);
            }
            
            throw error;
        }
    }
    
    async getFromCache(endpoint) {
        if (!window.offlineManager) {
            throw new Error('Offline manager non disponible');
        }
        
        // Déterminer quel store utiliser selon l'endpoint
        if (endpoint.includes('/planters')) {
            return await window.offlineManager.getFromLocalDB(window.offlineManager.STORES.PLANTERS);
        } else if (endpoint.includes('/chef-planteurs')) {
            return await window.offlineManager.getFromLocalDB(window.offlineManager.STORES.CHEF_PLANTERS);
        } else if (endpoint.includes('/cooperatives')) {
            return await window.offlineManager.getFromLocalDB(window.offlineManager.STORES.COOPERATIVES);
        }
        
        throw new Error('Données non disponibles en mode offline');
    }

    // Auth
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        // Récupérer et sauvegarder l'utilisateur
        try {
            const user = await this.getMe();
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.error('Error fetching user:', error);
        }
        
        return response;
    }

    async register(email, password) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, role: 'viewer' })
        });
        return response;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                console.warn('⚠️ Pas de refresh token disponible');
                return false;
            }

            console.log('🔄 Rafraîchissement du token...');
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
                console.log('✅ Token rafraîchi avec succès');
                return true;
            } else {
                console.warn('⚠️ Échec du rafraîchissement du token');
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur lors du rafraîchissement du token:', error);
            return false;
        }
    }

    // Planters
    async getPlanters(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        console.log('getPlanters URL:', `/planters?${query}`);
        console.log('getPlanters params:', params);
        return this.request(`/planters?${query}`);
    }

    async getPlantersWithStats(params = {}) {
        return this.getPlanters({ ...params, with_stats: true });
    }

    async createPlanter(data) {
        return this.request('/planters', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePlanter(id, data) {
        return this.request(`/planters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async assignChefToPlanter(planterId, chefId) {
        return this.updatePlanter(planterId, { chef_planteur_id: chefId });
    }

    async deletePlanter(id) {
        return this.request(`/planters/${id}`, {
            method: 'DELETE'
        });
    }

    // Deliveries
    async getDeliveries(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/deliveries?${query}`);
    }

    async createDelivery(data) {
        return this.request('/deliveries', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateDelivery(id, data) {
        return this.request(`/deliveries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteDelivery(id) {
        return this.request(`/deliveries/${id}`, {
            method: 'DELETE'
        });
    }

    async getUniqueLocations() {
        return this.request('/deliveries/locations/unique');
    }

    // Analytics
    async getSummaryPlanter(params = {}) {
        // Filtrer les valeurs undefined/null/vides
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/analytics/summary/planter?${query}`);
    }

    async getSummaryZones(params = {}) {
        // Filtrer les valeurs undefined/null/vides
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/analytics/summary/zones?${query}`);
    }

    async getSummaryQuality(params = {}) {
        // Filtrer les valeurs undefined/null/vides
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/analytics/summary/quality?${query}`);
    }

    async getSummaryFournisseur(params = {}) {
        // Filtrer les valeurs undefined/null/vides
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/analytics/summary/fournisseur?${query}`);
    }

    // Exports
    getExportExcelUrl(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return `${this.baseUrl}/exports/excel?${query}`;
    }

    getExportPdfUrl(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return `${this.baseUrl}/exports/pdf?${query}`;
    }

    async downloadFile(url) {
        const token = this.getToken();
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = url.includes('excel') ? 'export.xlsx' : 'export.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUserRole(id, role) {
        return this.request(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Chef Planteurs
    async getChefPlanteurs() {
        return this.request('/chef-planteurs');
    }

    async getChefPlanteursStats() {
        return this.request('/chef-planteurs/stats');
    }

    async getChefPlanteur(id) {
        return this.request(`/chef-planteurs/${id}`);
    }

    async createChefPlanteur(data) {
        return this.request('/chef-planteurs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateChefPlanteur(id, data) {
        return this.request(`/chef-planteurs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteChefPlanteur(id) {
        return this.request(`/chef-planteurs/${id}`, {
            method: 'DELETE'
        });
    }

    // Collectes
    async getCollectes(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/collectes?${query}`);
    }

    async createCollecte(data) {
        return this.request('/collectes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCollecte(id, data) {
        return this.request(`/collectes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCollecte(id) {
        return this.request(`/collectes/${id}`, {
            method: 'DELETE'
        });
    }

    // Notifications
    async getNotifications(unreadOnly = false) {
        const params = unreadOnly ? '?unread_only=true' : '';
        return this.request(`/notifications/${params}`);
    }

    async getNotificationStats() {
        return this.request('/notifications/stats');
    }

    async markNotificationAsRead(id) {
        return this.request(`/notifications/${id}/read`, {
            method: 'PUT'
        });
    }

    async markAllNotificationsAsRead() {
        return this.request('/notifications/read-all', {
            method: 'PUT'
        });
    }

    async deleteNotification(id) {
        return this.request(`/notifications/${id}`, {
            method: 'DELETE'
        });
    }

    // Cooperatives
    async getCooperatives() {
        return this.request('/cooperatives');
    }

    async getCooperativeNames() {
        return this.request('/cooperatives/names');
    }

    async getCooperativeDetails(nom) {
        return this.request(`/cooperatives/${encodeURIComponent(nom)}`);
    }

    // Payments
    async getPayments(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        return this.request(`/payments/${queryString ? '?' + queryString : ''}`);
    }

    async getPayment(id) {
        return this.request(`/payments/${id}/`);
    }

    async createPayment(data) {
        return this.request('/payments/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePayment(id, data) {
        return this.request(`/payments/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePayment(id) {
        return this.request(`/payments/${id}/`, {
            method: 'DELETE'
        });
    }

    async getBalances() {
        return this.request('/payments/balances/all/');
    }

    async getPlanterBalance(planterId) {
        return this.request(`/payments/balances/${planterId}/`);
    }

    // Invoices
    async getInvoices(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return this.request(`/invoices?${query}`);
    }

    async createInvoice(data) {
        return this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateInvoiceStatus(id, status) {
        return this.request(`/invoices/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    getInvoicePdfUrl(id) {
        const token = this.getToken();
        return `${this.baseUrl}/invoices/${id}/pdf?token=${token}`;
    }

    async downloadInvoicePdf(id) {
        const url = this.getInvoicePdfUrl(id);
        window.open(url, '_blank');
    }

    // Generic methods for flexibility
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

const api = new API();
