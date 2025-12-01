from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date
from uuid import UUID

from ..database import get_db
from ..models import Payment, Planter, Delivery, User
from ..schemas.payment import (
    Payment as PaymentSchema,
    PaymentCreate,
    PaymentUpdate,
    PaymentWithDetails,
    PlanterBalance
)
from ..routers.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/", response_model=PaymentSchema)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Créer un nouveau paiement"""
    # Vérifier que le planteur existe
    planter = db.query(Planter).filter(Planter.id == payment.planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planteur non trouvé")
    
    # Vérifier la livraison si spécifiée
    if payment.delivery_id:
        delivery = db.query(Delivery).filter(Delivery.id == payment.delivery_id).first()
        if not delivery:
            raise HTTPException(status_code=404, detail="Livraison non trouvée")
        if delivery.planter_id != payment.planter_id:
            raise HTTPException(status_code=400, detail="La livraison n'appartient pas à ce planteur")
    
    db_payment = Payment(**payment.dict(), created_by=current_user.id)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.get("/", response_model=List[PaymentWithDetails])
def get_payments(
    skip: int = 0,
    limit: int = 100,
    planter_id: Optional[UUID] = None,
    methode: Optional[str] = None,
    statut: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer la liste des paiements avec filtres"""
    query = db.query(Payment).join(Planter)
    
    if planter_id:
        query = query.filter(Payment.planter_id == planter_id)
    if methode:
        query = query.filter(Payment.methode == methode)
    if statut:
        query = query.filter(Payment.statut == statut)
    if date_from:
        query = query.filter(Payment.date_paiement >= date_from)
    if date_to:
        query = query.filter(Payment.date_paiement <= date_to)
    
    payments = query.order_by(desc(Payment.date_paiement)).offset(skip).limit(limit).all()
    
    # Enrichir avec les détails
    result = []
    for payment in payments:
        payment_dict = PaymentWithDetails.from_orm(payment).dict()
        payment_dict['planter_name'] = payment.planter.name if payment.planter else None
        if payment.delivery:
            payment_dict['delivery_date'] = payment.delivery.date
            payment_dict['delivery_quantity'] = float(payment.delivery.quantity_kg)
        result.append(PaymentWithDetails(**payment_dict))
    
    return result

@router.get("/{payment_id}", response_model=PaymentWithDetails)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer un paiement par ID"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    payment_dict = PaymentWithDetails.from_orm(payment).dict()
    payment_dict['planter_name'] = payment.planter.name if payment.planter else None
    if payment.delivery:
        payment_dict['delivery_date'] = payment.delivery.date
        payment_dict['delivery_quantity'] = float(payment.delivery.quantity_kg)
    
    return PaymentWithDetails(**payment_dict)

@router.put("/{payment_id}", response_model=PaymentSchema)
def update_payment(
    payment_id: UUID,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour un paiement"""
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    update_data = payment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

@router.delete("/{payment_id}")
def delete_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer un paiement"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Permission refusée")
    
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    db.delete(db_payment)
    db.commit()
    return {"message": "Paiement supprimé"}

@router.get("/balances/all", response_model=List[PlanterBalance])
def get_all_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculer les soldes de tous les planteurs"""
    planters = db.query(Planter).all()
    balances = []
    
    for planter in planters:
        # Total des livraisons (en supposant un prix moyen, à ajuster selon vos besoins)
        deliveries = db.query(Delivery).filter(Delivery.planter_id == planter.id).all()
        total_kg = sum(float(d.quantity_kg) for d in deliveries)
        
        # Total des paiements
        payments = db.query(Payment).filter(Payment.planter_id == planter.id).all()
        total_paiements = sum(p.montant for p in payments)
        
        # Dates
        derniere_livraison = max([d.date for d in deliveries]) if deliveries else None
        dernier_paiement = max([p.date_paiement for p in payments]) if payments else None
        
        # Solde (on ne peut pas calculer sans prix, donc on met juste les paiements)
        balances.append(PlanterBalance(
            planter_id=planter.id,
            planter_name=planter.name,
            total_livraisons_kg=total_kg,
            total_paiements=total_paiements,
            solde=0,  # À calculer avec les prix réels
            nombre_livraisons=len(deliveries),
            nombre_paiements=len(payments),
            derniere_livraison=derniere_livraison,
            dernier_paiement=dernier_paiement
        ))
    
    return sorted(balances, key=lambda x: x.total_livraisons_kg, reverse=True)

@router.get("/balances/{planter_id}", response_model=PlanterBalance)
def get_planter_balance(
    planter_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculer le solde d'un planteur spécifique"""
    planter = db.query(Planter).filter(Planter.id == planter_id).first()
    if not planter:
        raise HTTPException(status_code=404, detail="Planteur non trouvé")
    
    # Total des livraisons
    deliveries = db.query(Delivery).filter(Delivery.planter_id == planter_id).all()
    total_kg = sum(float(d.quantity_kg) for d in deliveries)
    
    # Total des paiements
    payments = db.query(Payment).filter(Payment.planter_id == planter_id).all()
    total_paiements = sum(p.montant for p in payments)
    
    # Dates
    derniere_livraison = max([d.date for d in deliveries]) if deliveries else None
    dernier_paiement = max([p.date_paiement for p in payments]) if payments else None
    
    return PlanterBalance(
        planter_id=planter.id,
        planter_name=planter.name,
        total_livraisons_kg=total_kg,
        total_paiements=total_paiements,
        solde=0,  # À calculer avec les prix réels
        nombre_livraisons=len(deliveries),
        nombre_paiements=len(payments),
        derniere_livraison=derniere_livraison,
        dernier_paiement=dernier_paiement
    )
