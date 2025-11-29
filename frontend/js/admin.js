async function loadAdminPage(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">⚙️ Administration des utilisateurs</h2>
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
        document.getElementById('userModal').classList.remove('show');
        document.getElementById('roleModal').classList.remove('show');
        document.getElementById('userForm').reset();
        document.getElementById('roleForm').reset();
    }

    document.getElementById('addUserBtn').addEventListener('click', openModal);

    document.querySelectorAll('.close, .close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    // Créer un utilisateur
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('role').value
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

    // Modifier le rôle
    document.getElementById('roleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const newRole = document.getElementById('editRole').value;

        try {
            await api.updateUserRole(userId, newRole);
            showToast('Rôle modifié avec succès');
            closeModal();
            loadTable();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Event delegation pour les boutons d'action
    document.getElementById('usersTable').addEventListener('click', async (e) => {
        // Modifier le rôle
        if (e.target.classList.contains('edit-role')) {
            const userId = e.target.dataset.id;
            const userEmail = e.target.dataset.email;
            const userRole = e.target.dataset.role;

            document.getElementById('editUserId').value = userId;
            document.getElementById('editUserEmail').value = userEmail;
            document.getElementById('editRole').value = userRole;
            document.getElementById('roleModal').classList.add('show');
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

    loadTable();
}
