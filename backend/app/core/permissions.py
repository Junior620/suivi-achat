"""
Système de permissions et rôles - CocoaTrack
"""
from enum import Enum
from typing import List, Set


class Role(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


class Permission(str, Enum):
    PLANTERS_VIEW = "planters:view"
    PLANTERS_CREATE = "planters:create"
    PLANTERS_EDIT = "planters:edit"
    PLANTERS_DELETE = "planters:delete"
    DELIVERIES_VIEW = "deliveries:view"
    DELIVERIES_CREATE = "deliveries:create"
    DELIVERIES_EDIT = "deliveries:edit"
    DELIVERIES_DELETE = "deliveries:delete"
    DELIVERIES_VALIDATE = "deliveries:validate"
    PAYMENTS_VIEW = "payments:view"
    PAYMENTS_CREATE = "payments:create"
    PAYMENTS_APPROVE = "payments:approve"
    PAYMENTS_DELETE = "payments:delete"
    INVOICES_VIEW = "invoices:view"
    INVOICES_CREATE = "invoices:create"
    INVOICES_EDIT = "invoices:edit"
    INVOICES_DELETE = "invoices:delete"
    INVOICES_EXPORT = "invoices:export"
    WAREHOUSES_VIEW = "warehouses:view"
    WAREHOUSES_CREATE = "warehouses:create"
    WAREHOUSES_EDIT = "warehouses:edit"
    WAREHOUSES_DELETE = "warehouses:delete"
    DOCUMENTS_VIEW = "documents:view"
    DOCUMENTS_CREATE = "documents:create"
    DOCUMENTS_DELETE = "documents:delete"
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"
    ANALYTICS_VIEW = "analytics:view"
    TRACEABILITY_VIEW = "traceability:view"
    TRACEABILITY_CREATE = "traceability:create"
    MESSAGING_VIEW = "messaging:view"
    MESSAGING_SEND = "messaging:send"
    MESSAGING_ADMIN = "messaging:admin"
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"
    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_EDIT = "users:edit"
    USERS_DELETE = "users:delete"
    USERS_CHANGE_ROLE = "users:change_role"
    SESSIONS_VIEW_OWN = "sessions:view_own"
    SESSIONS_VIEW_ALL = "sessions:view_all"
    SESSIONS_REVOKE_OWN = "sessions:revoke_own"
    SESSIONS_REVOKE_ALL = "sessions:revoke_all"
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_BACKUP = "system:backup"


ROLE_HIERARCHY = [Role.VIEWER, Role.MANAGER, Role.ADMIN, Role.SUPERADMIN]

VIEWER_PERMS = {
    Permission.PLANTERS_VIEW, Permission.DELIVERIES_VIEW, Permission.PAYMENTS_VIEW,
    Permission.INVOICES_VIEW, Permission.WAREHOUSES_VIEW, Permission.DOCUMENTS_VIEW,
    Permission.REPORTS_VIEW, Permission.TRACEABILITY_VIEW, Permission.MESSAGING_VIEW,
    Permission.MESSAGING_SEND, Permission.SESSIONS_VIEW_OWN, Permission.SESSIONS_REVOKE_OWN,
}

MANAGER_PERMS = VIEWER_PERMS | {
    Permission.PLANTERS_CREATE, Permission.PLANTERS_EDIT,
    Permission.DELIVERIES_CREATE, Permission.DELIVERIES_EDIT, Permission.DELIVERIES_VALIDATE,
    Permission.PAYMENTS_CREATE, Permission.INVOICES_CREATE, Permission.INVOICES_EDIT,
    Permission.INVOICES_EXPORT, Permission.WAREHOUSES_CREATE, Permission.WAREHOUSES_EDIT,
    Permission.DOCUMENTS_CREATE, Permission.REPORTS_EXPORT, Permission.ANALYTICS_VIEW,
    Permission.TRACEABILITY_CREATE,
}

ADMIN_PERMS = MANAGER_PERMS | {
    Permission.PLANTERS_DELETE, Permission.DELIVERIES_DELETE, Permission.PAYMENTS_APPROVE,
    Permission.PAYMENTS_DELETE, Permission.INVOICES_DELETE, Permission.WAREHOUSES_DELETE,
    Permission.DOCUMENTS_DELETE, Permission.MESSAGING_ADMIN, Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT, Permission.USERS_VIEW, Permission.USERS_CREATE,
    Permission.USERS_EDIT, Permission.USERS_DELETE, Permission.SESSIONS_VIEW_ALL,
    Permission.SESSIONS_REVOKE_ALL,
}

SUPERADMIN_PERMS = ADMIN_PERMS | {
    Permission.USERS_CHANGE_ROLE, Permission.SYSTEM_SETTINGS, Permission.SYSTEM_BACKUP,
}

ROLE_PERMISSIONS = {
    Role.VIEWER: VIEWER_PERMS,
    Role.MANAGER: MANAGER_PERMS,
    Role.ADMIN: ADMIN_PERMS,
    Role.SUPERADMIN: SUPERADMIN_PERMS,
}

SESSION_DURATION = {
    Role.VIEWER: 3600,
    Role.MANAGER: 14400,
    Role.ADMIN: 28800,
    Role.SUPERADMIN: 86400,
}


def get_role_level(role: str) -> int:
    try:
        return ROLE_HIERARCHY.index(Role(role))
    except (ValueError, KeyError):
        return -1


def has_permission(user_role: str, permission: Permission) -> bool:
    try:
        role = Role(user_role)
        return permission in ROLE_PERMISSIONS.get(role, set())
    except ValueError:
        return False


def has_any_permission(user_role: str, permissions: List[Permission]) -> bool:
    return any(has_permission(user_role, p) for p in permissions)


def can_manage_role(actor_role: str, target_role: str) -> bool:
    return get_role_level(actor_role) > get_role_level(target_role)


def can_assign_role(actor_role: str, new_role: str) -> bool:
    if new_role == Role.SUPERADMIN.value:
        return actor_role == Role.SUPERADMIN.value
    return get_role_level(actor_role) > get_role_level(new_role)


def get_user_permissions(user_role: str) -> List[str]:
    try:
        role = Role(user_role)
        return [p.value for p in ROLE_PERMISSIONS.get(role, set())]
    except ValueError:
        return []


def get_session_duration(role: str) -> int:
    try:
        return SESSION_DURATION.get(Role(role), 3600)
    except ValueError:
        return 3600
