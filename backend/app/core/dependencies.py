"""
Dépendances FastAPI pour les permissions
"""
from fastapi import Depends, HTTPException, status
from typing import List, Callable
from ..routers.auth import get_current_user
from ..models import User
from .permissions import Permission, Role, has_permission, has_any_permission, can_manage_role


def require_permission(permission: Permission):
    """Dépendance qui vérifie une permission spécifique"""
    def dependency(current_user: User = Depends(get_current_user)):
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé"
            )
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission requise: {permission.value}"
            )
        return current_user
    return dependency


def require_any_permission(permissions: List[Permission]):
    """Dépendance qui vérifie au moins une permission"""
    def dependency(current_user: User = Depends(get_current_user)):
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé"
            )
        if not has_any_permission(current_user.role, permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes"
            )
        return current_user
    return dependency


def require_role(min_role: Role):
    """Dépendance qui vérifie un rôle minimum"""
    from .permissions import get_role_level, ROLE_HIERARCHY
    
    def dependency(current_user: User = Depends(get_current_user)):
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé"
            )
        user_level = get_role_level(current_user.role)
        required_level = ROLE_HIERARCHY.index(min_role)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle minimum requis: {min_role.value}"
            )
        return current_user
    return dependency


def require_active_user(current_user: User = Depends(get_current_user)):
    """Vérifie que l'utilisateur est actif"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    return current_user
