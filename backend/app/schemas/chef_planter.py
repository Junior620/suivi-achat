from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class ChefPlanteurBase(BaseModel):
    name: str
    phone: Optional[str] = None
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    quantite_max_kg: float = Field(..., gt=0, description="Quantité maximale déclarée en kg")
    date_debut_contrat: Optional[date] = None
    date_fin_contrat: Optional[date] = None
    raison_fin_contrat: Optional[str] = None

class ChefPlanteurCreate(ChefPlanteurBase):
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude GPS")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude GPS")

class ChefPlanteurUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    quantite_max_kg: Optional[float] = Field(None, gt=0)
    date_debut_contrat: Optional[date] = None
    date_fin_contrat: Optional[date] = None
    raison_fin_contrat: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class ChefPlanteurResponse(ChefPlanteurBase):
    id: UUID
    cni: Optional[str] = None
    cooperative: Optional[str] = None
    region: Optional[str] = None
    departement: Optional[str] = None
    localite: Optional[str] = None
    date_debut_contrat: Optional[date] = None
    date_fin_contrat: Optional[date] = None
    raison_fin_contrat: Optional[str] = None
    # Géolocalisation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Validation
    validation_status: Optional[str] = "validated"
    validated_by: Optional[UUID] = None
    validated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChefPlanteurValidation(BaseModel):
    """Schema pour valider/rejeter un fournisseur"""
    action: str = Field(..., pattern="^(validate|reject)$")
    rejection_reason: Optional[str] = Field(None, max_length=500)

class ChefPlanteurWithStats(ChefPlanteurResponse):
    total_livre_kg: float
    total_limite_planteurs_kg: float  # Somme des limites des planteurs
    restant_kg: float
    pourcentage_utilise: float
    nombre_planteurs: int
    est_exploite: bool
    alerte: Optional[str] = None  # Message si limite planteurs > quantité déclarée
