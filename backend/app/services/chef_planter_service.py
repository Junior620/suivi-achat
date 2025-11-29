from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from typing import Optional
from uuid import UUID
from ..models import ChefPlanteur, Planter, Delivery
from ..schemas import ChefPlanteurCreate, ChefPlanteurUpdate

def get_chef_planteurs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ChefPlanteur).offset(skip).limit(limit).all()

def get_chef_planteur(db: Session, chef_id: UUID):
    chef = db.query(ChefPlanteur).filter(ChefPlanteur.id == chef_id).first()
    if not chef:
        raise HTTPException(status_code=404, detail="Chef planteur not found")
    return chef

def create_chef_planteur(db: Session, chef_data: ChefPlanteurCreate, current_user_id: Optional[UUID] = None):
    existing = db.query(ChefPlanteur).filter(ChefPlanteur.name == chef_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un chef planteur avec ce nom existe déjà")
    
    chef = ChefPlanteur(**chef_data.model_dump())
    db.add(chef)
    db.commit()
    db.refresh(chef)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'create', 'fournisseur', chef.name, chef.id, current_user_id, ['admin']
        )
    
    return chef

def update_chef_planteur(db: Session, chef_id: UUID, chef_data: ChefPlanteurUpdate, current_user_id: Optional[UUID] = None):
    chef = get_chef_planteur(db, chef_id)
    
    if chef_data.name != chef.name:
        existing = db.query(ChefPlanteur).filter(ChefPlanteur.name == chef_data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Un chef planteur avec ce nom existe déjà")
    
    for key, value in chef_data.model_dump().items():
        setattr(chef, key, value)
    
    db.commit()
    db.refresh(chef)
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'update', 'fournisseur', chef.name, chef.id, current_user_id, ['admin']
        )
    
    return chef

def delete_chef_planteur(db: Session, chef_id: UUID, current_user_id: Optional[UUID] = None):
    chef = get_chef_planteur(db, chef_id)
    chef_name = chef.name
    db.delete(chef)
    db.commit()
    
    # Créer une notification
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'delete', 'fournisseur', chef_name, chef_id, current_user_id, ['admin']
        )
    
    return {"message": "Chef planteur supprimé avec succès"}

def get_production_stats(db: Session, chef_id: UUID):
    """Calcule les statistiques de production d'un chef planteur"""
    chef = get_chef_planteur(db, chef_id)
    
    # Récupérer tous les planteurs de ce chef
    planteurs = db.query(Planter).filter(Planter.chef_planteur_id == chef_id).all()
    planteur_ids = [p.id for p in planteurs]
    
    # Calculer le total livré par tous les planteurs
    total_livre = db.query(func.sum(Delivery.quantity_kg)).filter(
        Delivery.planter_id.in_(planteur_ids)
    ).scalar() or 0
    
    total_livre = float(total_livre)
    
    # Calculer la somme des limites individuelles des planteurs
    total_limite_planteurs = sum(
        float(p.superficie_hectares) * 1000 
        for p in planteurs 
        if p.superficie_hectares
    )
    
    # Quantité maximale déclarée par le chef
    quantite_max_chef = float(chef.quantite_max_kg)
    restant = max(0, quantite_max_chef - total_livre)
    pourcentage = (total_livre / quantite_max_chef * 100) if quantite_max_chef > 0 else 0
    
    # Alerte si la quantité chargée dépasse la quantité déclarée du fournisseur
    alerte = None
    if total_livre > quantite_max_chef:
        depassement = total_livre - quantite_max_chef
        alerte = f"⚠️ Fournisseur '{chef.name}' : Dépassement de {depassement:.0f} kg ! Chargé: {total_livre:.0f} kg / Déclaré: {quantite_max_chef:.0f} kg"
    
    return {
        "id": chef.id,
        "name": chef.name,
        "phone": chef.phone,
        "quantite_max_kg": quantite_max_chef,
        "total_livre_kg": total_livre,
        "total_limite_planteurs_kg": total_limite_planteurs,
        "restant_kg": restant,
        "pourcentage_utilise": round(pourcentage, 2),
        "nombre_planteurs": len(planteurs),
        "alerte": alerte,
        "created_at": chef.created_at,
        "updated_at": chef.updated_at
    }
