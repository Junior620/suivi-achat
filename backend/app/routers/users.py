from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..schemas import UserCreate, UserResponse, UserUpdate
from ..services import auth_service
from ..middleware.auth import require_role, get_current_user
from ..models import User

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserResponse, dependencies=[Depends(require_role(["admin"]))])
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    return auth_service.create_user(db, user_data)

@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = "", 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rechercher des utilisateurs par email (accessible à tous les utilisateurs authentifiés)"""
    if not q:
        # Retourner tous les utilisateurs si pas de recherche
        return db.query(User).limit(50).all()
    
    # Recherche par email (insensible à la casse)
    users = db.query(User).filter(
        User.email.ilike(f"%{q}%")
    ).limit(50).all()
    
    return users

@router.get("", response_model=List[UserResponse], dependencies=[Depends(require_role(["admin"]))])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role(["admin"]))])
def update_user_role(user_id: UUID, user_data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.role:
        if user_data.role not in ["admin", "manager", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = user_data.role
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
