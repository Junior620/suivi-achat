async function loadAdminPage(container) {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager';
    
    container.innerHTML = `
        <div class="admin-container">
            <h1 class="mb-4">⚙️ Administration</h1>
            
            <!-- Menu de navigation -->
            <div class="admin-tabs mb-4">
                ${isAdmin ? '<button class="admin-tab active" data-tab="users">👥 Utilisateurs</button>' : ''}
                ${isAdmin || isManager ? '<button class="admin-tab" data-tab="audit">📋 Journal d\'Audit</button>' : ''}
                <button class="admin-tab" data-tab="sessions">🔐 Mes Sessions</button>
                ${isAdmin || isManager ? '<button class="admin-tab" data-tab="reports">📊 Rapports</button>' : ''}
            </div>
            
            <!-- Contenu des onglets -->
            <div id="adminTabContent"></div>
        </div>
        
        <style>
            .admin-tabs {
                display: flex;
                gap: 10px;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 10px;
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
            
            .admin-tab:hover {
                background: #e0e0e0;
            }
            
            .admin-tab.active {
                background: #667eea;
                color: white;
            }
        </style>
        
        <div id="userModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nouvel utilisateur</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="userForm">
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label>Mot de passe *</label>
                        <input type="password" id="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Rôle *</label>
                        <select id="role" required>
                            <option value="viewer">Viewer (Lecture seule)</option>
                            <option value="manager">Manager (CRUD)</option>
                            <option value="admin">Admin (Complet)</option>
                        </select>
                    </div>
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Créer</button>
                        <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="roleModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Modifier le rôle</h3>
                    <span class="close">&times;</span>
                </div>
                <form id="roleForm">
                    <input type="hidden" id="editUserId">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="text" id="editUserEmail" disabled>
                    </div>
                    <div class="form-group">
                        <label>Nouveau rôle *</label>
                        <select id="editRole" required>
                            <option value="viewer">Viewer (Lecture seule)</option>
                            <option value="manager">Manager (CRUD)</option>
                            <option value="admin">Admin (Complet)</option>
                        </select>
                    </div>
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">Modifier</button>
                        <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    let table;
    const currentUser = JSON.parse(localStorage.getItem('user')) || { email: '' };

    function getRoleBadge(role) {
        const badges = {
            admin: '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Admin</span>',
            manager: '<span style="background: #ffc107; color: black; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Manager</span>',
            viewer: '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Viewer</span>'
        };
        return badges[role] || role;
    }

    async function loadTable() {
        const data = await api.getUsers();
        
        if (table) {
            table.setData(data);
        } else {
            table = new Tabulator("#usersTable", {
                data: data,
                layout: "fitColumns",
                columns: [
                    {title: "Email", field: "email", width: 250},
                    {
                        title: "Rôle", 
                        field: "role",
                        width: 150,
                        formatter: (cell) => getRoleBadge(cell.getValue())
                    },
                    {
                        title: "Date création", 
                        field: "created_at", 
                        width: 150,
                        formatter: (cell) => new Date(cell.getValue()).toLocaleDateString('fr-FR')
                    },
                    {
                        title: "Actions",
                        width: 200,
                        formatter: (cell) => {
                            const user = cell.getRow().getData();
                            const isCurrentUser = user.email === currentUser.email;
                            return `
                                <button class="btn-icon edit-role" data-id="${user.id}" data-email="${user.email}" data-role="${user.role}" title="Modifier le rôle">
                                    🔄
                                </button>
                                <button class="btn-icon delete-user" data-id="${user.id}" data-email="${user.email}" 
                                    ${isCurrentUser ? 'disabled title="Vous ne pouvez pas vous supprimer"' : 'title="Supprimer"'}>
                                    🗑️
                                </button>
                            `;
                        }
                    }
                ]
            });
        }
    }

    function openModal() {
        document.getElementById('userModal').classList.add('show');
    }

    function closeModal() {
        const userModal = container.querySelector('#userModal');
        const roleModal = container.querySelector('#roleModal');
        const userForm = container.querySelector('#userForm');
        const roleForm = container.querySelector('#roleForm');
        
        if (userModal) userModal.classList.remove('show');
        if (roleModal) roleModal.classList.remove('show');
        if (userForm) userForm.reset();
        if (roleForm) roleForm.reset();
    }

    // Gestion des onglets
    const tabs = container.querySelectorAll('.admin-tab');
    const tabContent = container.querySelector('#adminTabContent');
    
    function switchTab(tabName) {
        // Mettre à jour les onglets actifs
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Charger le contenu approprié
        switch(tabName) {
            case 'users':
                loadUsersTab();
                break;
            case 'audit':
                loadAuditTab();
                break;
            case 'sessions':
                loadSessionsTab();
                break;
            case 'reports':
                loadReportsTab();
                break;
        }
    }
    
    function loadUsersTab() {
        tabContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">👥 Gestion des utilisateurs</h2>
                    <button id="addUserBtn" class="btn btn-primary">+ Nouvel utilisateur</button>
                </div>
                <div id="usersTable"></div>
            </div>
            
            <div id="userModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nouvel utilisateur</h3>
                        <span class="close">&times;</span>
                    </div>
                    <form id="userForm">
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="email" required>
                        </div>
                        <div class="form-group">
                            <label>Mot de passe *</label>
                            <input type="password" id="password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Rôle *</label>
                            <select id="role" required>
                                <option value="viewer">Viewer (Lecture seule)</option>
                                <option value="manager">Manager (CRUD)</option>
                                <option value="admin">Admin (Complet)</option>
                            </select>
                        </div>
                        <div class="actions">
                            <button type="submit" class="btn btn-primary">Créer</button>
                            <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="roleModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Modifier le rôle</h3>
                        <span class="close">&times;</span>
                    </div>
                    <form id="roleForm">
                        <input type="hidden" id="editUserId">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="text" id="editUserEmail" disabled>
                        </div>
                        <div class="form-group">
                            <label>Nouveau rôle *</label>
                            <select id="editRole" required>
                                <option value="viewer">Viewer (Lecture seule)</option>
                                <option value="manager">Manager (CRUD)</option>
                                <option value="admin">Admin (Complet)</option>
                            </select>
                        </div>
                        <div class="actions">
                            <button type="submit" class="btn btn-primary">Modifier</button>
                            <button type="button" class="close-modal btn btn-secondary">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Attacher les event listeners après création du DOM
        const addUserBtn = tabContent.querySelector('#addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', openModal);
        }
        
        tabContent.querySelectorAll('.close, .close-modal').forEach(el => {
            el.addEventListener('click', closeModal);
        });
        
        // Créer un utilisateur
        const userForm = tabContent.querySelector('#userForm');
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    email: tabContent.querySelector('#email').value,
                    password: tabContent.querySelector('#password').value,
                    role: tabContent.querySelector('#role').value
                };

                try {
                    await api.createUser(formData);
                    showToast('Utilisateur créé avec succès');
                    closeModal();
                    loadTable();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
        
        // Modifier le rôle
        const roleForm = tabContent.querySelector('#roleForm');
        if (roleForm) {
            roleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userId = tabContent.querySelector('#editUserId').value;
                const newRole = tabContent.querySelector('#editRole').value;

                try {
                    await api.updateUserRole(userId, newRole);
                    showToast('Rôle modifié avec succès');
                    closeModal();
                    loadTable();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
        
        // Event delegation pour les boutons d'action
        const usersTable = tabContent.querySelector('#usersTable');
        if (usersTable) {
            usersTable.addEventListener('click', async (e) => {
                // Modifier le rôle
                if (e.target.classList.contains('edit-role')) {
                    const userId = e.target.dataset.id;
                    const userEmail = e.target.dataset.email;
                    const userRole = e.target.dataset.role;

                    tabContent.querySelector('#editUserId').value = userId;
                    tabContent.querySelector('#editUserEmail').value = userEmail;
                    tabContent.querySelector('#editRole').value = userRole;
                    tabContent.querySelector('#roleModal').classList.add('show');
                }

                // Supprimer l'utilisateur
                if (e.target.classList.contains('delete-user') && !e.target.disabled) {
                    const userId = e.target.dataset.id;
                    const userEmail = e.target.dataset.email;

                    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ?`)) {
                        try {
                            await api.deleteUser(userId);
                            showToast('Utilisateur supprimé avec succès');
                            loadTable();
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    }
                }
            });
        }
        
        loadTable();
    }
    
    function loadAuditTab() {
        tabContent.innerHTML = '<iframe src="audit.html" style="width: 100%; height: 800px; border: none;"></iframe>';
    }
    
    function loadSessionsTab() {
        tabContent.innerHTML = '<iframe src="sessions.html" style="width: 100%; height: 800px; border: none;"></iframe>';
    }
    
    function loadReportsTab() {
        tabContent.innerHTML = '<iframe src="reports.html" style="width: 100%; height: 800px; border: none;"></iframe>';
    }
    
    // Event listeners pour les onglets
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // Charger l'onglet par défaut
    const defaultTab = isAdmin ? 'users' : 'sessions';
    switchTab(defaultTab);
}
