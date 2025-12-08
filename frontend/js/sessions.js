/**
 * Gestion des sessions utilisateur
 */

class SessionsManager {
    constructor() {
        this.currentSessionToken = localStorage.getItem('access_token');
    }

    async init() {
        await this.loadStats();
        await this.loadActiveSessions();
        await this.loadAllSessions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.init();
        });

        document.getElementById('revokeAllBtn').addEventListener('click', () => {
            this.revokeAllSessions();
        });
    }

    async loadStats() {
        try {
            // Vérifier si l'utilisateur est admin
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            
            let stats;
            if (isAdmin) {
                // Pour les admins, charger les stats globales
                const allSessions = await api.get('/sessions/admin/all?limit=1000');
                const now = new Date();
                stats = {
                    total: allSessions.total,
                    active: allSessions.sessions.filter(s => s.is_active && new Date(s.expires_at) > now).length,
                    expired: allSessions.sessions.filter(s => new Date(s.expires_at) <= now).length,
                    revoked: allSessions.sessions.filter(s => !s.is_active).length
                };
            } else {
                stats = await api.get('/sessions/stats');
            }
            
            document.getElementById('totalSessions').textContent = stats.total;
            document.getElementById('activeSessions').textContent = stats.active;
            document.getElementById('expiredSessions').textContent = stats.expired;
            document.getElementById('revokedSessions').textContent = stats.revoked;
            
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    async loadActiveSessions() {
        try {
            // Vérifier si l'utilisateur est admin
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            
            let sessions;
            if (isAdmin) {
                // Pour les admins, charger toutes les sessions actives
                const response = await api.get('/sessions/admin/all?active_only=true&limit=100');
                sessions = response.sessions;
            } else {
                const response = await api.get('/sessions/active');
                sessions = response.sessions;
            }
            
            this.displayActiveSessions(sessions, isAdmin);
            
        } catch (error) {
            console.error('Erreur chargement sessions actives:', error);
            document.getElementById('activeSessionsList').innerHTML = `
                <div class="alert alert-danger">
                    Erreur lors du chargement des sessions actives
                </div>
            `;
        }
    }

    async loadAllSessions() {
        try {
            // Vérifier si l'utilisateur est admin
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'admin';
            
            let sessions;
            if (isAdmin) {
                // Pour les admins, charger toutes les sessions de tous les utilisateurs
                const response = await api.get('/sessions/admin/all?limit=100');
                sessions = response.sessions;
            } else {
                const response = await api.get('/sessions/all?limit=50');
                sessions = response.sessions;
            }
            
            this.displayAllSessions(sessions, isAdmin);
            
        } catch (error) {
            console.error('Erreur chargement toutes sessions:', error);
            document.getElementById('allSessionsList').innerHTML = `
                <div class="alert alert-danger">
                    Erreur lors du chargement de l'historique
                </div>
            `;
        }
    }

    displayActiveSessions(sessions, isAdmin = false) {
        const container = document.getElementById('activeSessionsList');
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Aucune session active
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => this.createSessionCard(session, true, isAdmin)).join('');
        
        // Ajouter les event listeners pour les boutons de révocation
        sessions.forEach(session => {
            const btn = document.getElementById(`revoke-${session.id}`);
            if (btn) {
                btn.addEventListener('click', () => this.revokeSession(session.id, isAdmin));
            }
        });
    }

    displayAllSessions(sessions, isAdmin = false) {
        const container = document.getElementById('allSessionsList');
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    Aucune session trouvée
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => this.createSessionCard(session, false, isAdmin)).join('');
        
        // Ajouter les event listeners pour les boutons de révocation
        sessions.forEach(session => {
            const btn = document.getElementById(`revoke-${session.id}`);
            if (btn && session.is_active) {
                btn.addEventListener('click', () => this.revokeSession(session.id, isAdmin));
            }
        });
    }

    createSessionCard(session, isActiveList, isAdmin = false) {
        const createdDate = new Date(session.created_at);
        const lastActivity = new Date(session.last_activity);
        const expiresDate = new Date(session.expires_at);
        
        const isExpired = expiresDate < new Date();
        const isActive = session.is_active && !isExpired;
        
        let statusClass = 'session-card';
        let statusBadge = '';
        
        if (isActive) {
            statusClass += ' session-active';
            statusBadge = '<span class="badge bg-success">Active</span>';
        } else if (isExpired) {
            statusClass += ' session-expired';
            statusBadge = '<span class="badge bg-danger">Expirée</span>';
        } else {
            statusBadge = '<span class="badge bg-warning">Révoquée</span>';
        }

        // Déterminer si c'est la session actuelle
        const isCurrent = this.isCurrentSession(session);
        if (isCurrent) {
            statusClass += ' session-current';
            statusBadge = '<span class="badge bg-light text-dark">Session Actuelle</span>';
        }

        // Extraire des infos du user agent
        const deviceInfo = this.parseUserAgent(session.user_agent);

        return `
            <div class="card ${statusClass} mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="mb-2">
                                ${deviceInfo.icon} ${deviceInfo.browser} sur ${deviceInfo.os}
                                ${statusBadge}
                            </h6>
                            ${isAdmin && session.user_email ? `
                                <small class="text-muted d-block">
                                    <strong>👤 Utilisateur:</strong> ${session.user_email}
                                </small>
                            ` : ''}
                            <small class="text-muted d-block">
                                <strong>IP:</strong> ${session.ip_address || 'N/A'}
                            </small>
                            <small class="text-muted d-block">
                                <strong>Créée:</strong> ${createdDate.toLocaleString('fr-FR')}
                            </small>
                            <small class="text-muted d-block">
                                <strong>Dernière activité:</strong> ${lastActivity.toLocaleString('fr-FR')}
                            </small>
                            <small class="text-muted d-block">
                                <strong>Expire:</strong> ${expiresDate.toLocaleString('fr-FR')}
                            </small>
                        </div>
                        <div class="col-md-6 text-end">
                            ${isActive && !isCurrent ? `
                                <button class="btn btn-sm btn-danger" id="revoke-${session.id}">
                                    🚫 Révoquer
                                </button>
                            ` : ''}
                            ${isCurrent ? `
                                <span class="text-muted">
                                    <small>Vous utilisez actuellement cette session</small>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    parseUserAgent(userAgent) {
        if (!userAgent) {
            return { icon: '💻', browser: 'Inconnu', os: 'Inconnu' };
        }

        let browser = 'Navigateur';
        let os = 'Système';
        let icon = '💻';

        // Détecter le navigateur
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';

        // Détecter l'OS
        if (userAgent.includes('Windows')) { os = 'Windows'; icon = '🖥️'; }
        else if (userAgent.includes('Mac')) { os = 'macOS'; icon = '🍎'; }
        else if (userAgent.includes('Linux')) { os = 'Linux'; icon = '🐧'; }
        else if (userAgent.includes('Android')) { os = 'Android'; icon = '📱'; }
        else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) { os = 'iOS'; icon = '📱'; }

        return { icon, browser, os };
    }

    isCurrentSession(session) {
        // Comparer avec le token actuel (simplifié)
        // Dans une vraie implémentation, il faudrait décoder le JWT
        return false; // Pour l'instant, on ne peut pas déterminer facilement
    }

    async revokeSession(sessionId, isAdmin = false) {
        if (!confirm('Êtes-vous sûr de vouloir révoquer cette session ?')) {
            return;
        }

        try {
            if (isAdmin) {
                await api.delete(`/sessions/admin/${sessionId}`);
            } else {
                await api.delete(`/sessions/${sessionId}`);
            }
            this.showNotification('Session révoquée avec succès', 'success');
            await this.init();
            
        } catch (error) {
            console.error('Erreur révocation session:', error);
            this.showNotification('Erreur lors de la révocation de la session', 'error');
        }
    }

    async revokeAllSessions() {
        if (!confirm('Êtes-vous sûr de vouloir révoquer toutes les autres sessions ? Vous resterez connecté sur cet appareil.')) {
            return;
        }

        try {
            const response = await api.delete('/sessions/revoke-all?except_current=true');
            this.showNotification(response.message, 'success');
            await this.init();
            
        } catch (error) {
            console.error('Erreur révocation sessions:', error);
            this.showNotification('Erreur lors de la révocation des sessions', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Fonction pour charger la page des sessions dans l'app principale
async function loadSessionsPage(container) {
    container.innerHTML = `
        <div class="sessions-container">
            <div class="page-header">
                <h2>🔐 Gestion des Sessions</h2>
                <div class="header-actions">
                    <button id="refreshBtn" class="btn btn-secondary">🔄 Actualiser</button>
                    <button id="revokeAllBtn" class="btn btn-warning">⚠️ Révoquer toutes les autres sessions</button>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Total Sessions</div>
                        <div class="kpi-value" id="totalSessions">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">✅</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Sessions Actives</div>
                        <div class="kpi-value" id="activeSessions">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">⏰</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Sessions Expirées</div>
                        <div class="kpi-value" id="expiredSessions">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🚫</div>
                    <div class="kpi-content">
                        <div class="kpi-label">Sessions Révoquées</div>
                        <div class="kpi-value" id="revokedSessions">0</div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>✅ Sessions Actives</h3>
                </div>
                <div class="card-body" id="activeSessionsList">
                    <div class="text-center">
                        <div class="spinner-border" role="status"></div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>📋 Historique des Sessions</h3>
                </div>
                <div class="card-body" id="allSessionsList">
                    <div class="text-center">
                        <div class="spinner-border" role="status"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const sessionsManager = new SessionsManager();
    await sessionsManager.init();
}

// Initialiser au chargement de la page (pour compatibilité avec sessions.html)
let sessionsManager;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sessionsPage')) {
        // Vérifier l'authentification
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        sessionsManager = new SessionsManager();
        sessionsManager.init();
    }
});
