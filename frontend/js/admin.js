/**
 * Page d'administration - CocoaTrack
 * Gestion des utilisateurs avec système de permissions
 */

async function loadAdminPage(container) {
    const role = window.userRole || currentUser?.role;
    const isSuperAdmin = role === 'superadmin';
    const isAdmin = role === 'admin' || isSuperAdmin;
    const canChangeRoles = hasPermission?.(Permissions?.USERS_CHANGE_ROLE) || isSuperAdmin;
    
    container.innerHTML = `
        <div class="admin-container">
            <h1 class="mb-4">⚙️ Administration</h1>
            
            <div class="admin-tabs mb-4">
                ${isAdmin ? '<button class="admin-tab active" data-tab="users">👥 Utilisateurs</button>' : ''}
                ${isAdmin ? '<button class="admin-tab" data-tab="audit">📋 Journal d\'Audit</button>' : ''}
                <button class="admin-tab" data-tab="sessions">🔐 Mes Sessions</button>
                ${isSuperAdmin ? '<button class="admin-tab" data-tab="system">🛠️ Système</button>' : ''}
            </div>
            
            <div id="adminTabContent"></div>
        </div>
        
        <style>
            .admin-tabs {
                display: flex;
                gap: 10px;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 10px;
                flex-wrap: wrap;
            }
            .admin-tab {
                padding: 10px 20px;
                border: none;
                background: #f5f5f5;
                cursor: pointer;
                border-radius: 8px 8px 0 0;
                font-weight: 500;
                transition: all 0.3s;
            }
            .admin-tab:hover { background: #e0e0e0; }
            .admin-tab.active { background: #667eea; color: white; }
            .user-card {
                background: white;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
            }
            .user-info { flex: 1; min-width: 200px; }
            .user-email { font-weight: 600; font-size: 1rem; }
            .user-meta { font-size: 0.85rem; color: #666; margin-top: 4px; }
            .user-actions { display: flex; gap: 8px; flex-wrap: wrap; }
            .status-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            .status-active { background: #d4edda; color: #155724; }
            .status-inactive { background: #f8d7da; color: #721c24; }
            .role-select {
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid #ddd;
                font-size: 0.9rem;
            }
            .btn-sm {
                padding: 6px 12px;
                font-size: 0.85rem;
                border-radius: 6px;
            }
            .filters-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
                align-items: center;
            }
            .filters-bar input, .filters-bar select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
            }
            .stats-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .stat-card {
                background: white;
                padding: 16px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .stat-value { font-size: 2rem; font-weight: 700; }
            .stat-label { font-size: 0.85rem; color: #666; }
        </style>
    `;

    let allUsers = [];
    const currentUserEmail = currentUser?.email || '';

    const tabs = container.querySelectorAll('.admin-tab');
    const tabContent = container.querySelector('#adminTabContent');
    
    function switchTab(tabName) {
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        
        switch(tabName) {
            case 'users': loadUsersTab(); break;
            case 'audit': loadAuditTab(); break;
            case 'sessions': loadSessionsTab(); break;
            case 'system': loadSystemTab(); break;
        }
    }

    
    async function loadUsersTab() {
        tabContent.innerHTML = `
            <div class="stats-row" id="userStats"></div>
            
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h2 class="card-title" style="margin: 0;">👥 Gestion des utilisateurs</h2>
                    <button id="addUserBtn" class="btn btn-primary" data-permission="users:create">+ Nouvel utilisateur</button>
                </div>
                
                <div class="filters-bar">
                    <input type="text" id="searchUsers" placeholder="🔍 Rechercher par email..." style="flex: 1; min-width: 200px;">
                    <select id="filterRole">
                        <option value="">Tous les rôles</option>
                        <option value="superadmin">👑 Super Admin</option>
                        <option value="admin">🔧 Admin</option>
                        <option value="manager">📊 Manager</option>
                        <option value="viewer">👁️ Viewer</option>
                    </select>
                    <select id="filterStatus">
                        <option value="">Tous les statuts</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Inactifs</option>
                    </select>
                </div>
                
                <div id="usersList"></div>
            </div>
            
            <!-- Modal création utilisateur -->
            <div id="userModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nouvel utilisateur</h3>
                        <span class="close">&times;</span>
                    </div>
                    <form id="userForm">
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="newEmail" required>
                        </div>
                        <div class="form-group">
                            <label>Nom complet</label>
                            <input type="text" id="newFullName">
                        </div>
                        <div class="form-group">
                            <label>Mot de passe *</label>
                            <input type="password" id="newPassword" required minlength="8">
                        </div>
                        <div class="form-group">
                            <label>Rôle *</label>
                            <select id="newRole" required>
                                <option value="viewer">👁️ Viewer</option>
                                <option value="manager">📊 Manager</option>
                                ${isAdmin ? '<option value="admin">🔧 Admin</option>' : ''}
                                ${isSuperAdmin ? '<option value="superadmin">👑 Super Admin</option>' : ''}
                            </select>
                        </div>
                        <div class="actions">
                            <button type="submit" class="btn btn-primary">Créer</button>
                            <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Modal changement de rôle -->
            <div id="roleModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Modifier le rôle</h3>
                        <span class="close">&times;</span>
                    </div>
                    <form id="roleForm">
                        <input type="hidden" id="editUserId">
                        <div class="form-group">
                            <label>Utilisateur</label>
                            <input type="text" id="editUserEmail" disabled style="background: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>Rôle actuel</label>
                            <div id="currentRoleBadge"></div>
                        </div>
                        <div class="form-group">
                            <label>Nouveau rôle *</label>
                            <select id="editRole" required>
                                <option value="viewer">👁️ Viewer</option>
                                <option value="manager">📊 Manager</option>
                                ${isAdmin ? '<option value="admin">🔧 Admin</option>' : ''}
                                ${isSuperAdmin ? '<option value="superadmin">👑 Super Admin</option>' : ''}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Raison du changement</label>
                            <textarea id="roleChangeReason" rows="2" placeholder="Optionnel..."></textarea>
                        </div>
                        <div class="actions">
                            <button type="submit" class="btn btn-primary">Modifier</button>
                            <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        await loadUsers();
        setupUsersEvents();
    }
    
    async function loadUsers() {
        try {
            allUsers = await api.get('/users');
            renderUsers(allUsers);
            renderStats(allUsers);
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
            showToast('Erreur chargement utilisateurs', 'error');
        }
    }
    
    function renderStats(users) {
        const stats = {
            total: users.length,
            superadmin: users.filter(u => u.role === 'superadmin').length,
            admin: users.filter(u => u.role === 'admin').length,
            manager: users.filter(u => u.role === 'manager').length,
            viewer: users.filter(u => u.role === 'viewer').length,
            active: users.filter(u => u.is_active !== false).length
        };
        
        document.getElementById('userStats').innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #9c27b0;">${stats.superadmin}</div>
                <div class="stat-label">👑 Super Admin</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #f44336;">${stats.admin}</div>
                <div class="stat-label">🔧 Admin</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #2196f3;">${stats.manager}</div>
                <div class="stat-label">📊 Manager</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #4caf50;">${stats.viewer}</div>
                <div class="stat-label">👁️ Viewer</div>
            </div>
        `;
    }

    
    function renderUsers(users) {
        const list = document.getElementById('usersList');
        if (!users.length) {
            list.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Aucun utilisateur trouvé</p>';
            return;
        }
        
        list.innerHTML = users.map(user => {
            const isCurrentUser = user.email === currentUserEmail;
            const canManage = canManageRole?.(role, user.role) || (isSuperAdmin && user.role !== 'superadmin');
            const roleBadge = typeof createRoleBadge === 'function' ? createRoleBadge(user.role) : user.role;
            const statusClass = user.is_active !== false ? 'status-active' : 'status-inactive';
            const statusText = user.is_active !== false ? 'Actif' : 'Inactif';
            
            return `
                <div class="user-card">
                    <div class="user-info">
                        <div class="user-email">${user.email} ${isCurrentUser ? '(vous)' : ''}</div>
                        <div class="user-meta">
                            ${roleBadge}
                            <span class="status-badge ${statusClass}" style="margin-left: 8px;">${statusText}</span>
                        </div>
                        <div class="user-meta">
                            Créé le ${new Date(user.created_at).toLocaleDateString('fr-FR')}
                            ${user.full_name ? ` • ${user.full_name}` : ''}
                        </div>
                    </div>
                    <div class="user-actions">
                        ${canChangeRoles && canManage && !isCurrentUser ? `
                            <button class="btn btn-sm btn-secondary change-role-btn" 
                                data-id="${user.id}" data-email="${user.email}" data-role="${user.role}">
                                🔄 Rôle
                            </button>
                        ` : ''}
                        ${canManage && !isCurrentUser ? `
                            <button class="btn btn-sm ${user.is_active !== false ? 'btn-warning' : 'btn-success'} toggle-status-btn"
                                data-id="${user.id}" data-active="${user.is_active !== false}">
                                ${user.is_active !== false ? '🚫 Désactiver' : '✅ Activer'}
                            </button>
                        ` : ''}
                        ${canManage && !isCurrentUser ? `
                            <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}" data-email="${user.email}">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function filterUsers() {
        const search = document.getElementById('searchUsers')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('filterRole')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        
        let filtered = allUsers;
        
        if (search) {
            filtered = filtered.filter(u => u.email.toLowerCase().includes(search));
        }
        if (roleFilter) {
            filtered = filtered.filter(u => u.role === roleFilter);
        }
        if (statusFilter === 'active') {
            filtered = filtered.filter(u => u.is_active !== false);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(u => u.is_active === false);
        }
        
        renderUsers(filtered);
    }
    
    function setupUsersEvents() {
        // Filtres
        document.getElementById('searchUsers')?.addEventListener('input', filterUsers);
        document.getElementById('filterRole')?.addEventListener('change', filterUsers);
        document.getElementById('filterStatus')?.addEventListener('change', filterUsers);
        
        // Bouton ajouter
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            document.getElementById('userModal').classList.add('show');
        });
        
        // Fermer modals
        tabContent.querySelectorAll('.close, .close-modal').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('userModal')?.classList.remove('show');
                document.getElementById('roleModal')?.classList.remove('show');
            });
        });
        
        // Créer utilisateur
        document.getElementById('userForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                email: document.getElementById('newEmail').value,
                full_name: document.getElementById('newFullName').value || undefined,
                password: document.getElementById('newPassword').value,
                role: document.getElementById('newRole').value
            };
            
            try {
                await api.post('/users', data);
                showToast('Utilisateur créé avec succès');
                document.getElementById('userModal').classList.remove('show');
                document.getElementById('userForm').reset();
                await loadUsers();
            } catch (error) {
                showToast(error.message || 'Erreur création', 'error');
            }
        });
        
        // Modifier rôle
        document.getElementById('roleForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('editUserId').value;
            const newRole = document.getElementById('editRole').value;
            const reason = document.getElementById('roleChangeReason').value;
            
            try {
                await api.patch(`/users/${userId}/role`, { role: newRole, reason });
                showToast('Rôle modifié avec succès');
                document.getElementById('roleModal').classList.remove('show');
                await loadUsers();
            } catch (error) {
                showToast(error.message || 'Erreur modification', 'error');
            }
        });
        
        // Event delegation pour les boutons
        document.getElementById('usersList')?.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            // Changer le rôle
            if (target.classList.contains('change-role-btn')) {
                const { id, email, role: userRole } = target.dataset;
                document.getElementById('editUserId').value = id;
                document.getElementById('editUserEmail').value = email;
                document.getElementById('editRole').value = userRole;
                document.getElementById('currentRoleBadge').innerHTML = createRoleBadge?.(userRole) || userRole;
                document.getElementById('roleChangeReason').value = '';
                document.getElementById('roleModal').classList.add('show');
            }
            
            // Toggle statut
            if (target.classList.contains('toggle-status-btn')) {
                const { id, active } = target.dataset;
                const isActive = active === 'true';
                const action = isActive ? 'désactiver' : 'activer';
                
                if (confirm(`Voulez-vous ${action} cet utilisateur ?`)) {
                    try {
                        await api.patch(`/users/${id}/status`, { is_active: !isActive });
                        showToast(`Utilisateur ${action === 'désactiver' ? 'désactivé' : 'activé'}`);
                        await loadUsers();
                    } catch (error) {
                        showToast(error.message || 'Erreur', 'error');
                    }
                }
            }
            
            // Supprimer
            if (target.classList.contains('delete-user-btn')) {
                const { id, email } = target.dataset;
                if (confirm(`Supprimer définitivement ${email} ?`)) {
                    try {
                        await api.delete(`/users/${id}`);
                        showToast('Utilisateur supprimé');
                        await loadUsers();
                    } catch (error) {
                        showToast(error.message || 'Erreur suppression', 'error');
                    }
                }
            }
        });
    }

    
    function loadAuditTab() {
        tabContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📋 Journal d'Audit</h2>
                </div>
                <div id="auditContent" style="padding: 20px;">
                    <p>Chargement...</p>
                </div>
            </div>
        `;
        
        // Charger les logs d'audit
        loadAuditLogs();
    }
    
    async function loadAuditLogs() {
        try {
            const response = await api.get('/audit/logs?limit=100');
            const content = document.getElementById('auditContent');
            
            // L'API retourne {total, skip, limit, logs: [...]}
            const logs = response?.logs || response || [];
            
            if (!logs || !logs.length) {
                content.innerHTML = '<p style="text-align: center; color: #666;">Aucun log d\'audit</p>';
                return;
            }
            
            content.innerHTML = `
                <div style="overflow-x: auto;">
                    <p style="margin-bottom: 10px; color: #666;">Total: ${response?.total || logs.length} logs</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Utilisateur</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Action</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Ressource</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px;">${new Date(log.created_at).toLocaleString('fr-FR')}</td>
                                    <td style="padding: 10px;">${log.user_email || 'Système'}</td>
                                    <td style="padding: 10px;">
                                        <span style="padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;
                                            background: ${getActionColor(log.action)}; color: white;">
                                            ${log.action}
                                        </span>
                                    </td>
                                    <td style="padding: 10px;">${log.entity_type || ''} ${log.entity_id || ''}</td>
                                    <td style="padding: 10px; font-family: monospace; font-size: 0.85rem;">${log.ip_address || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Erreur chargement audit:', error);
            document.getElementById('auditContent').innerHTML = '<p style="color: red;">Erreur chargement des logs</p>';
        }
    }
    
    function getActionColor(action) {
        const colors = {
            'CREATE': '#28a745',
            'UPDATE': '#ffc107',
            'DELETE': '#dc3545',
            'LOGIN': '#17a2b8',
            'LOGOUT': '#6c757d',
            'ROLE_CHANGE': '#9c27b0'
        };
        return colors[action] || '#666';
    }
    
    function loadSessionsTab() {
        tabContent.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="card-title">🔐 Mes Sessions Actives</h2>
                    <button id="logoutAllBtn" class="btn btn-danger">Déconnecter toutes les sessions</button>
                </div>
                <div id="sessionsContent" style="padding: 20px;">
                    <p>Chargement...</p>
                </div>
            </div>
        `;
        
        loadSessions();
        
        document.getElementById('logoutAllBtn')?.addEventListener('click', async () => {
            if (confirm('Déconnecter toutes vos sessions ? Vous serez redirigé vers la page de connexion.')) {
                try {
                    await api.post('/auth/logout-all');
                    showToast('Toutes les sessions déconnectées');
                    localStorage.clear();
                    window.location.href = 'index.html';
                } catch (error) {
                    showToast('Erreur', 'error');
                }
            }
        });
    }
    
    async function loadSessions() {
        try {
            const sessions = await api.get('/auth/sessions');
            const content = document.getElementById('sessionsContent');
            
            if (!sessions || !sessions.length) {
                content.innerHTML = '<p style="text-align: center; color: #666;">Aucune session active</p>';
                return;
            }
            
            content.innerHTML = sessions.map(session => `
                <div class="user-card">
                    <div class="user-info">
                        <div class="user-email">
                            ${session.is_current ? '🟢 Session actuelle' : '📱 Autre session'}
                        </div>
                        <div class="user-meta">
                            <strong>IP:</strong> ${session.ip_address || 'Inconnue'}<br>
                            <strong>Navigateur:</strong> ${parseUserAgent(session.user_agent)}<br>
                            <strong>Dernière activité:</strong> ${new Date(session.last_activity).toLocaleString('fr-FR')}
                        </div>
                    </div>
                    ${!session.is_current ? `
                        <button class="btn btn-sm btn-danger revoke-session-btn" data-id="${session.id}">
                            Révoquer
                        </button>
                    ` : ''}
                </div>
            `).join('');
            
            // Event listeners pour révoquer
            content.querySelectorAll('.revoke-session-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await api.delete(`/auth/sessions/${btn.dataset.id}`);
                        showToast('Session révoquée');
                        loadSessions();
                    } catch (error) {
                        showToast('Erreur', 'error');
                    }
                });
            });
        } catch (error) {
            console.error('Erreur chargement sessions:', error);
            document.getElementById('sessionsContent').innerHTML = '<p style="color: red;">Erreur chargement</p>';
        }
    }
    
    function parseUserAgent(ua) {
        if (!ua) return 'Inconnu';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return ua.substring(0, 50) + '...';
    }
    
    function loadSystemTab() {
        tabContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">🛠️ Paramètres Système</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="color: #666;">Cette section est réservée aux super administrateurs.</p>
                    <div class="stats-row" style="margin-top: 20px;">
                        <div class="stat-card">
                            <div class="stat-value">✅</div>
                            <div class="stat-label">API Status</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">v1.0</div>
                            <div class="stat-label">Version</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Event listeners pour les onglets
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Charger l'onglet par défaut
    switchTab(isAdmin ? 'users' : 'sessions');
}
