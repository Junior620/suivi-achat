from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import date
from ..models import Collecte, ChefPlanteur
from ..schemas.collecte import CollecteCreate, CollecteUpdate

def get_collectes(
    db: Session,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    chef_planteur_id: Optional[UUID] = None,
    page: int = 1,
    size: int = 50
) -> tuple[List[dict], int]:
    query = db.query(Collecte)
    
    if search:
        query = query.join(ChefPlanteur).filter(
            ChefPlanteur.name.ilike(f"%{search}%")
        )
    
    if from_date:
        query = query.filter(Collecte.date_collecte >= from_date)
    
    if to_date:
        query = query.filter(Collecte.date_collecte <= to_date)
    
    if chef_planteur_id:
        query = query.filter(Collecte.chef_planteur_id == chef_planteur_id)
    
    total = query.count()
    collectes = query.order_by(Collecte.date_collecte.desc()).offset((page - 1) * size).limit(size).all()
    
    # Enrichir avec les informations du fournisseur
    result = []
    for collecte in collectes:
        collecte_dict = {
            "id": collecte.id,
            "designation": collecte.designation,
            "chef_planteur_id": collecte.chef_planteur_id,
            "chef_planteur_name": collecte.chef_planteur.name if collecte.chef_planteur else None,
            "chef_planteur_cooperative": collecte.chef_planteur.cooperative if collecte.chef_planteur else None,
            "quantity_loaded_kg": float(collecte.quantity_loaded_kg),
            "load_date": collecte.load_date,
            "quantity_unloaded_kg": float(collecte.quantity_unloaded_kg),
            "unload_date": collecte.unload_date,
            "pertes_kg": collecte.pertes_kg,
            "pourcentage_pertes": collecte.pourcentage_pertes,
            "suivi": collecte.suivi,
            "date_collecte": collecte.date_collecte,
            "created_at": collecte.created_at,
            "updated_at": collecte.updated_at
        }
        result.append(collecte_dict)
    
    return result, total

def get_collecte(db: Session, collecte_id: UUID) -> Collecte:
    collecte = db.query(Collecte).filter(Collecte.id == collecte_id).first()
    if not collecte:
        raise HTTPException(status_code=404, detail="Collecte not found")
    return collecte

def create_collecte(db: Session, collecte_data: CollecteCreate, current_user_id: Optional[UUID] = None) -> Collecte:
    # Vérifier que le fournisseur existe
    chef = db.query(ChefPlanteur).filter(ChefPlanteur.id == collecte_data.chef_planteur_id).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Fournisseur not found")
    
    collecte = Collecte(**collecte_data.model_dump())
    db.add(collecte)
    db.commit()
    db.refresh(collecte)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'create', 'collecte', collecte.designation, collecte.id, current_user_id, ['admin']
        )
    
    return collecte

def update_collecte(db: Session, collecte_id: UUID, collecte_data: CollecteUpdate, current_user_id: Optional[UUID] = None) -> Collecte:
    collecte = get_collecte(db, collecte_id)
    
    for key, value in collecte_data.model_dump(exclude_unset=True).items():
        setattr(collecte, key, value)
    
    db.commit()
    db.refresh(collecte)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'update', 'collecte', collecte.designation, collecte.id, current_user_id, ['admin']
        )
    
    return collecte

def delete_collecte(db: Session, collecte_id: UUID, current_user_id: Optional[UUID] = None) -> None:
    collecte = get_collecte(db, collecte_id)
    collecte_designation = collecte.designation
    db.delete(collecte)
    db.commit()
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'delete', 'collecte', collecte_designation, collecte_id, current_user_id, ['admin']
        )
