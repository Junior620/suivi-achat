from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class PlanterBase(BaseModel):
    name: str
    phone: Optional[str] = None
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    statut_plantation: Optional[str] = None

class PlanterCreate(PlanterBase):
    superficie_hectares: Optional[float] = Field(None, gt=0, description="Superficie en hectares (optionnel)")
    chef_planteur_id: Optional[UUID] = None  # Optionnel - peut être assigné plus tard

class PlanterUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    statut_plantation: Optional[str] = None
    superficie_hectares: Optional[float] = Field(None, gt=0, description="Superficie en hectares (optionnel)")
    chef_planteur_id: Optional[UUID] = None  # Optionnel - peut être modifié

class PlanterResponse(PlanterBase):
    id: UUID
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    statut_plantation: Optional[str] = None
    superficie_hectares: Optional[float] = None
    chef_planteur_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    chef_planteur_name: Optional[str] = None
    limite_production_kg: Optional[float] = None
    # Champs de statistiques (optionnels, présents seulement si with_stats=true)
    total_charge_kg: Optional[float] = None
    total_decharge_kg: Optional[float] = None
    pertes_kg: Optional[float] = None
    pourcentage_pertes: Optional[float] = None
    restant_kg: Optional[float] = None
    pourcentage_utilise: Optional[float] = None
    
    class Config:
        from_attributes = True

class PlanterWithStats(PlanterResponse):
    total_livre_kg: float
    restant_kg: Optional[float]
    pourcentage_utilise: Optional[float]
