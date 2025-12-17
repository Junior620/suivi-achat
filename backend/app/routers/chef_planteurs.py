from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from ..database import get_db
from ..schemas import ChefPlanteurCreate, ChefPlanteurUpdate, ChefPlanteurResponse, ChefPlanteurWithStats
from ..schemas.chef_planter import ChefPlanteurValidation
from ..services import chef_planter_service
from ..middleware.auth import require_role, get_current_user
from ..models import ChefPlanteur

router = APIRouter(prefix="/chef-planteurs", tags=["chef-planteurs"])

@router.get("", response_model=List[ChefPlanteurResponse])
def list_chef_planteurs(
    skip: int = 0, 
    limit: int = 100, 
    validation_status: Optional[str] = Query(None, description="Filtrer par statut: pending, validated, rejected"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(ChefPlanteur)
    
    # Filtrer par statut de validation
    if validation_status:
        query = query.filter(ChefPlanteur.validation_status == validation_status)
    
    # Les non-superadmins ne voient que les fournisseurs validés
    if current_user.role not in ['superadmin', 'admin']:
        query = query.filter(ChefPlanteur.validation_status == 'validated')
    
    return query.offset(skip).limit(limit).all()

@router.get("/stats", response_model=List[ChefPlanteurWithStats])
def list_chef_planteurs_with_stats(db: Session = Depends(get_db)):
    """Liste tous les chefs planteurs avec leurs statistiques"""
    chefs = chef_planter_service.get_chef_planteurs(db)
    return [chef_planter_service.get_production_stats(db, chef.id) for chef in chefs]

@router.get("/{chef_id}", response_model=ChefPlanteurResponse)
def get_chef_planteur(chef_id: UUID, db: Session = Depends(get_db)):
    return chef_planter_service.get_chef_planteur(db, chef_id)

@router.get("/{chef_id}/stats", response_model=ChefPlanteurWithStats)
def get_chef_planteur_stats(chef_id: UUID, db: Session = Depends(get_db)):
    return chef_planter_service.get_production_stats(db, chef_id)

@router.post("", response_model=ChefPlanteurResponse, dependencies=[Depends(require_role(["admin", "manager", "superadmin"]))])
def create_chef_planteur(chef_data: ChefPlanteurCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.create_chef_planteur(db, chef_data, current_user.id, current_user.role)


@router.post("/{chef_id}/validate", response_model=ChefPlanteurResponse, dependencies=[Depends(require_role(["superadmin"]))])
def validate_chef_planteur(
    chef_id: UUID, 
    validation: ChefPlanteurValidation,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Valider ou rejeter un fournisseur (superadmin uniquement)"""
    return chef_planter_service.validate_chef_planteur(
        db, chef_id, validation.action, current_user.id, validation.rejection_reason
    )


@router.get("/pending", response_model=List[ChefPlanteurResponse], dependencies=[Depends(require_role(["superadmin", "admin"]))])
def list_pending_chef_planteurs(db: Session = Depends(get_db)):
    """Liste les fournisseurs en attente de validation"""
    return db.query(ChefPlanteur).filter(ChefPlanteur.validation_status == 'pending').all()

@router.put("/{chef_id}", response_model=ChefPlanteurResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_chef_planteur(chef_id: UUID, chef_data: ChefPlanteurUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.update_chef_planteur(db, chef_id, chef_data, current_user.id)

@router.delete("/{chef_id}", dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_chef_planteur(chef_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.delete_chef_planteur(db, chef_id, current_user.id)
