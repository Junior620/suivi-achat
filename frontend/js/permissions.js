/**
 * Système de permissions côté client - CocoaTrack
 */

const Roles = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    VIEWER: 'viewer'
};

const RoleHierarchy = [Roles.VIEWER, Roles.MANAGER, Roles.ADMIN, Roles.SUPERADMIN];

const RoleLabels = {
    superadmin: '👑 Super Admin',
    admin: '🔧 Administrateur',
    manager: '📊 Manager',
    viewer: '👁️ Lecteur'
};

const RoleColors = {
    superadmin: '#9c27b0',
    admin: '#f44336',
    manager: '#2196f3',
    viewer: '#4caf50'
};

// Permissions par module
const Permissions = {
    // Planteurs
    PLANTERS_VIEW: 'planters:view',
    PLANTERS_CREATE: 'planters:create',
    PLANTERS_EDIT: 'planters:edit',
    PLANTERS_DELETE: 'planters:delete',
    // Livraisons
    DELIVERIES_VIEW: 'deliveries:view',
    DELIVERIES_CREATE: 'deliveries:create',
    DELIVERIES_EDIT: 'deliveries:edit',
    DELIVERIES_DELETE: 'deliveries:delete',
    // Paiements
    PAYMENTS_VIEW: 'payments:view',
    PAYMENTS_CREATE: 'payments:create',
    PAYMENTS_APPROVE: 'payments:approve',
    // Factures
    INVOICES_VIEW: 'invoices:view',
    INVOICES_CREATE: 'invoices:create',
    INVOICES_DELETE: 'invoices:delete',
    // Utilisateurs
    USERS_VIEW: 'users:view',
    USERS_CREATE: 'users:create',
    USERS_EDIT: 'users:edit',
    USERS_DELETE: 'users:delete',
    USERS_CHANGE_ROLE: 'users:change_role',
    // Audit
    AUDIT_VIEW: 'audit:view',
};


// Cache des permissions utilisateur
let userPermissions = [];
let userRole = null;

async function loadUserPermissions() {
    try {
        const response = await api.get('/users/me/permissions');
        userPermissions = response.permissions || [];
        userRole = response.role;
        window.userPermissions = userPermissions;
        window.userRole = userRole;
        return response;
    } catch (error) {
        console.error('Erreur chargement permissions:', error);
        return null;
    }
}

function hasPermission(permission) {
    return userPermissions.includes(permission);
}

function hasAnyPermission(permissions) {
    return permissions.some(p => userPermissions.includes(p));
}

function getRoleLevel(role) {
    return RoleHierarchy.indexOf(role);
}

function canManageRole(actorRole, targetRole) {
    return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

function canAssignRole(actorRole, newRole) {
    if (newRole === Roles.SUPERADMIN) {
        return actorRole === Roles.SUPERADMIN;
    }
    return getRoleLevel(actorRole) > getRoleLevel(newRole);
}

// Appliquer les permissions à l'interface
function applyPermissions() {
    // Masquer les éléments selon les permissions
    document.querySelectorAll('[data-permission]').forEach(el => {
        const permission = el.dataset.permission;
        if (!hasPermission(permission)) {
            el.style.display = 'none';
        }
    });
    
    // Masquer selon le rôle minimum
    document.querySelectorAll('[data-min-role]').forEach(el => {
        const minRole = el.dataset.minRole;
        if (getRoleLevel(userRole) < getRoleLevel(minRole)) {
            el.style.display = 'none';
        }
    });
    
    // Désactiver les boutons d'action
    document.querySelectorAll('[data-action-permission]').forEach(el => {
        const permission = el.dataset.actionPermission;
        if (!hasPermission(permission)) {
            el.disabled = true;
            el.title = 'Permission insuffisante';
            el.classList.add('disabled');
        }
    });
}

// Créer un badge de rôle
function createRoleBadge(role) {
    const label = RoleLabels[role] || role;
    const color = RoleColors[role] || '#666';
    return `<span class="role-badge" style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:0.8rem;">${label}</span>`;
}

// Exposer globalement
window.Roles = Roles;
window.Permissions = Permissions;
window.RoleLabels = RoleLabels;
window.RoleColors = RoleColors;
window.loadUserPermissions = loadUserPermissions;
window.hasPermission = hasPermission;
window.hasAnyPermission = hasAnyPermission;
window.canManageRole = canManageRole;
window.canAssignRole = canAssignRole;
window.applyPermissions = applyPermissions;
window.createRoleBadge = createRoleBadge;

console.log('✅ Module Permissions chargé');
