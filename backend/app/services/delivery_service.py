from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from ..models import Delivery, Planter
from ..schemas import DeliveryCreate, DeliveryUpdate

def get_deliveries(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    planter_id: Optional[UUID] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None,
    min_qty: Optional[Decimal] = None,
    max_qty: Optional[Decimal] = None,
    page: int = 1,
    size: int = 50,
    sort: str = "date"
) -> tuple[List[Delivery], int]:
    query = db.query(Delivery)
    
    if from_date:
        query = query.filter(Delivery.date >= from_date)
    if to_date:
        query = query.filter(Delivery.date <= to_date)
    if planter_id:
        query = query.filter(Delivery.planter_id == planter_id)
    if load:
        query = query.filter(Delivery.load_location.ilike(f"%{load}%"))
    if unload:
        query = query.filter(Delivery.unload_location.ilike(f"%{unload}%"))
    if quality:
        query = query.filter(Delivery.cocoa_quality.ilike(f"%{quality}%"))
    if min_qty:
        query = query.filter(Delivery.quantity_kg >= min_qty)
    if max_qty:
        query = query.filter(Delivery.quantity_kg <= max_qty)
    
    if sort == "date":
        query = query.order_by(Delivery.date.desc())
    elif sort == "quantity":
        query = query.order_by(Delivery.quantity_kg.desc())
    
    total = query.count()
    deliveries = query.offset((page - 1) * size).limit(size).all()
    return deliveries, total

def get_delivery(db: Session, delivery_id: UUID) -> Delivery:
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery

def create_delivery(db: Session, delivery_data: DeliveryCreate, current_user_id: Optional[UUID] = None) -> Delivery:
    planter = db.query(Planter).filter(Planter.id == delivery_data.planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planter not found")
    
    # Note: La validation des limites est maintenant gérée côté frontend avec des avertissements
    # On permet la création même en cas de dépassement pour plus de flexibilité
    
    delivery = Delivery(**delivery_data.model_dump())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    
    # Générer automatiquement la traçabilité blockchain
    try:
        from .traceability_service import TraceabilityService
        TraceabilityService.create_traceability_record(db, delivery)
    except Exception as e:
        # Ne pas bloquer la création de livraison si la traçabilité échoue
        print(f"Erreur génération traçabilité: {e}")
    
    # Créer une notification d'action
    if current_user_id:
        from . import notification_service
        notification_service.create_action_notification(
            db, 'delivery', 'planteur', planter.name, planter.id, current_user_id, ['admin']
        )
    
    # Vérifier si la limite est atteinte ou dépassée
    if planter.superficie_hectares:
        from . import notification_service
        limite_kg = float(planter.superficie_hectares * 1000)
        total_decharge = db.query(func.sum(Delivery.quantity_kg)).filter(
            Delivery.planter_id == planter.id
        ).scalar() or 0
        total_decharge = float(total_decharge)
        
        pourcentage = (total_decharge / limite_kg * 100) if limite_kg > 0 else 0
        
        # Alerte si >= 90%
        if pourcentage >= 90:
            if pourcentage >= 100:
                message = f"Le planteur '{planter.name}' a dépassé sa limite de production ({total_decharge:.0f} kg / {limite_kg:.0f} kg - {pourcentage:.1f}%)"
            else:
                message = f"Le planteur '{planter.name}' approche de sa limite de production ({total_decharge:.0f} kg / {limite_kg:.0f} kg - {pourcentage:.1f}%)"
            
            notification_service.create_alert_notification(
                db,
                "Alerte limite de production",
                message,
                "planter",
                planter.id,
                ['admin', 'manager']
            )
    
    return delivery

def update_delivery(db: Session, delivery_id: UUID, delivery_data: DeliveryUpdate) -> Delivery:
    delivery = get_delivery(db, delivery_id)
    for key, value in delivery_data.model_dump().items():
        setattr(delivery, key, value)
    db.commit()
    db.refresh(delivery)
    return delivery

def delete_delivery(db: Session, delivery_id: UUID) -> None:
    delivery = get_delivery(db, delivery_id)
    db.delete(delivery)
    db.commit()

def get_unique_locations(db: Session) -> dict:
    """Récupère tous les lieux uniques de chargement et déchargement"""
    load_locations = db.query(Delivery.load_location).distinct().filter(Delivery.load_location.isnot(None)).all()
    unload_locations = db.query(Delivery.unload_location).distinct().filter(Delivery.unload_location.isnot(None)).all()
    
    return {
        "load_locations": sorted([loc[0] for loc in load_locations if loc[0]]),
        "unload_locations": sorted([loc[0] for loc in unload_locations if loc[0]])
    }
