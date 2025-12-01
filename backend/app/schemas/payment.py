from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from uuid import UUID

class PaymentBase(BaseModel):
    planter_id: UUID
    delivery_id: Optional[UUID] = None
    montant: float = Field(..., gt=0, description="Montant du paiement")
    methode: str = Field(..., description="Méthode de paiement: cash, virement, cheque")
    statut: str = Field(default="completed", description="Statut: pending, completed, cancelled")
    date_paiement: date
    reference: Optional[str] = Field(None, description="Numéro de transaction ou chèque")
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    montant: Optional[float] = Field(None, gt=0)
    methode: Optional[str] = None
    statut: Optional[str] = None
    date_paiement: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

class Payment(PaymentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True

class PaymentWithDetails(Payment):
    planter_name: Optional[str] = None
    delivery_date: Optional[date] = None
    delivery_quantity: Optional[float] = None

class PlanterBalance(BaseModel):
    planter_id: UUID
    planter_name: str
    total_livraisons_kg: float
    total_paiements: float
    solde: float  # Positif = dette envers le planteur, Négatif = avance du planteur
    nombre_livraisons: int
    nombre_paiements: int
    derniere_livraison: Optional[date] = None
    dernier_paiement: Optional[date] = None
