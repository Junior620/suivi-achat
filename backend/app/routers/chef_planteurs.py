from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..schemas import ChefPlanteurCreate, ChefPlanteurUpdate, ChefPlanteurResponse, ChefPlanteurWithStats
from ..services import chef_planter_service
from ..middleware.auth import require_role, get_current_user

router = APIRouter(prefix="/chef-planteurs", tags=["chef-planteurs"])

@router.get("", response_model=List[ChefPlanteurResponse])
def list_chef_planteurs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return chef_planter_service.get_chef_planteurs(db, skip, limit)

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

@router.post("", response_model=ChefPlanteurResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_chef_planteur(chef_data: ChefPlanteurCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.create_chef_planteur(db, chef_data, current_user.id)

@router.put("/{chef_id}", response_model=ChefPlanteurResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_chef_planteur(chef_id: UUID, chef_data: ChefPlanteurUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.update_chef_planteur(db, chef_id, chef_data, current_user.id)

@router.delete("/{chef_id}", dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_chef_planteur(chef_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chef_planter_service.delete_chef_planteur(db, chef_id, current_user.id)
