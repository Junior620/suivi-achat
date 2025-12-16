from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from ..database import get_db
from ..schemas import UserCreate, UserResponse, UserUpdate
from ..services import auth_service
from ..middleware.auth import get_current_user
from ..models import User, RoleChangeLog
from ..core.permissions import (
    Role, Permission, has_permission, can_manage_role, 
    can_assign_role, get_user_permissions
)
from ..core.dependencies import require_permission, require_role

router = APIRouter(prefix="/users", tags=["users"])


class RoleChangeRequest(BaseModel):
    role: str
    reason: Optional[str] = None


class UserStatusRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = None


@router.post("", response_model=UserResponse)
def create_user(
    user_data: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_CREATE))
):
    """Créer un utilisateur (admin+)"""
    # Vérifier si le rôle peut être assigné
    if user_data.role and not can_assign_role(current_user.role, user_data.role):
        raise HTTPException(
            status_code=403, 
            detail=f"Vous ne pouvez pas créer un utilisateur avec le rôle {user_data.role}"
        )
    
    new_user = auth_service.create_user(db, user_data)
    
    # Logger le changement
    log = RoleChangeLog(
        user_id=new_user.id,
        user_email=new_user.email,
        old_role=None,
        new_role=new_user.role,
        changed_by_id=current_user.id,
        changed_by_email=current_user.email,
        reason="Création de compte"
    )
    db.add(log)
    db.commit()
    
    return new_user


@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = "", 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rechercher des utilisateurs par email"""
    query = db.query(User)
    
    # Filtrer par zone si l'utilisateur n'est pas admin+
    if current_user.role not in [Role.ADMIN.value, Role.SUPERADMIN.value]:
        if current_user.zone:
            query = query.filter(User.zone == current_user.zone)
    
    if q:
        query = query.filter(User.email.ilike(f"%{q}%"))
    
    return query.limit(50).all()


@router.get("/me/permissions")
def get_my_permissions(current_user: User = Depends(get_current_user)):
    """Obtenir ses propres permissions"""
    return {
        "role": current_user.role,
        "permissions": get_user_permissions(current_user.role),
        "is_active": current_user.is_active,
        "zone": current_user.zone
    }


@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_VIEW))
):
    """Lister tous les utilisateurs (admin+)"""
    query = db.query(User)
    
    # Un admin ne voit pas les superadmins
    if current_user.role == Role.ADMIN.value:
        query = query.filter(User.role != Role.SUPERADMIN.value)
    
    return query.all()


@router.get("/role-history/{user_id}")
def get_role_history(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_VIEW))
):
    """Historique des changements de rôle d'un utilisateur"""
    logs = db.query(RoleChangeLog).filter(
        RoleChangeLog.user_id == user_id
    ).order_by(RoleChangeLog.created_at.desc()).all()
    
    return [{
        "id": str(log.id),
        "old_role": log.old_role,
        "new_role": log.new_role,
        "changed_by": log.changed_by_email,
        "reason": log.reason,
        "created_at": log.created_at.isoformat()
    } for log in logs]


@router.patch("/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: UUID,
    request: RoleChangeRequest,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_CHANGE_ROLE))
):
    """Changer le rôle d'un utilisateur (superadmin pour tous, admin pour manager/viewer)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier qu'on peut gérer cet utilisateur
    if not can_manage_role(current_user.role, user.role):
        raise HTTPException(
            status_code=403, 
            detail="Vous ne pouvez pas modifier cet utilisateur"
        )
    
    # Vérifier qu'on peut assigner ce rôle
    if not can_assign_role(current_user.role, request.role):
        raise HTTPException(
            status_code=403, 
            detail=f"Vous ne pouvez pas assigner le rôle {request.role}"
        )
    
    # Valider le rôle
    valid_roles = [r.value for r in Role]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Valides: {valid_roles}")
    
    old_role = user.role
    user.role = request.role
    user.updated_at = datetime.utcnow()
    
    # Logger le changement
    log = RoleChangeLog(
        user_id=user.id,
        user_email=user.email,
        old_role=old_role,
        new_role=request.role,
        changed_by_id=current_user.id,
        changed_by_email=current_user.email,
        reason=request.reason,
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
def change_user_status(
    user_id: UUID,
    request: UserStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_EDIT))
):
    """Activer/désactiver un utilisateur"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier qu'on peut gérer cet utilisateur
    if not can_manage_role(current_user.role, user.role):
        raise HTTPException(
            status_code=403, 
            detail="Vous ne pouvez pas modifier cet utilisateur"
        )
    
    user.is_active = request.is_active
    user.updated_at = datetime.utcnow()
    
    if not request.is_active:
        user.deactivated_at = datetime.utcnow()
        user.deactivated_by = current_user.id
    else:
        user.deactivated_at = None
        user.deactivated_by = None
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.USERS_DELETE))
):
    """Supprimer un utilisateur"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier qu'on peut gérer cet utilisateur
    if not can_manage_role(current_user.role, user.role):
        raise HTTPException(
            status_code=403, 
            detail="Vous ne pouvez pas supprimer cet utilisateur"
        )
    
    # Ne pas permettre de se supprimer soi-même
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400, 
            detail="Vous ne pouvez pas supprimer votre propre compte"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "Utilisateur supprimé"}
