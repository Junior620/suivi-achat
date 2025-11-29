from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from typing import List, Optional
from uuid import UUID
from ..models import Planter, Delivery
from ..schemas import PlanterCreate, PlanterUpdate

def get_planters(db: Session, search: Optional[str] = None, page: int = 1, size: int = 50) -> tuple[List[Planter], int]:
    query = db.query(Planter)
    if search:
        query = query.filter(Planter.name.ilike(f"%{search}%"))
    
    total = query.count()
    planters = query.offset((page - 1) * size).limit(size).all()
    return planters, total

def get_planter(db: Session, planter_id: UUID) -> Planter:
    planter = db.query(Planter).filter(Planter.id == planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planter not found")
    return planter

def create_planter(db: Session, planter_data: PlanterCreate, current_user_id: Optional[UUID] = None) -> Planter:
    existing = db.query(Planter).filter(Planter.name == planter_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Planter name already exists")
    
    planter = Planter(**planter_data.model_dump())
    db.add(planter)
    db.commit()
    db.refresh(planter)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'create', 'planteur', planter.name, planter.id, current_user_id, ['admin']
        )
    
    return planter

def update_planter(db: Session, planter_id: UUID, planter_data: PlanterUpdate, current_user_id: Optional[UUID] = None) -> Planter:
    planter = get_planter(db, planter_id)
    # Mise à jour partielle : ne mettre à jour que les champs fournis
    for key, value in planter_data.model_dump(exclude_unset=True).items():
        setattr(planter, key, value)
    db.commit()
    db.refresh(planter)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'update', 'planteur', planter.name, planter.id, current_user_id, ['admin']
        )
    
    return planter

def delete_planter(db: Session, planter_id: UUID, current_user_id: Optional[UUID] = None) -> None:
    planter = get_planter(db, planter_id)
    planter_name = planter.name
    db.delete(planter)
    db.commit()
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'delete', 'planteur', planter_name, planter_id, current_user_id, ['admin']
        )

def get_planter_stats(db: Session, planter_id: UUID) -> dict:
    """Calcule les statistiques de production d'un planteur"""
    planter = get_planter(db, planter_id)
    
    # Calculer le total chargé
    total_charge = db.query(func.sum(Delivery.quantity_loaded_kg)).filter(
        Delivery.planter_id == planter_id
    ).scalar() or 0
    
    # Calculer le total déchargé
    total_decharge = db.query(func.sum(Delivery.quantity_kg)).filter(
        Delivery.planter_id == planter_id
    ).scalar() or 0
    
    total_charge = float(total_charge)
    total_decharge = float(total_decharge)
    
    # Calculer les pertes
    pertes_kg = total_charge - total_decharge
    pourcentage_pertes = (pertes_kg / total_charge * 100) if total_charge > 0 else 0
    
    # Calculer la limite (basée sur la quantité déchargée)
    limite_kg = float(planter.superficie_hectares * 1000) if planter.superficie_hectares else 0
    restant = max(0, limite_kg - total_decharge)
    pourcentage = (total_decharge / limite_kg * 100) if limite_kg > 0 else 0
    
    return {
        "id": planter.id,
        "name": planter.name,
        "phone": planter.phone,
        "cni": planter.cni,
        "cooperative": planter.cooperative,
        "region": planter.region,
        "departement": planter.departement,
        "localite": planter.localite,
        "statut_plantation": planter.statut_plantation,
        "superficie_hectares": float(planter.superficie_hectares) if planter.superficie_hectares else None,
        "limite_production_kg": limite_kg,
        "chef_planteur_id": planter.chef_planteur_id,
        "chef_planteur_name": planter.chef_planteur.name if planter.chef_planteur else None,
        "total_charge_kg": total_charge,
        "total_decharge_kg": total_decharge,
        "pertes_kg": pertes_kg,
        "pourcentage_pertes": round(pourcentage_pertes, 2),
        "restant_kg": restant,
        "pourcentage_utilise": round(pourcentage, 2),
        "created_at": planter.created_at,
        "updated_at": planter.updated_at
    }
