from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class CollecteBase(BaseModel):
    designation: str = Field(..., description="Description de l'opération")
    chef_planteur_id: UUID = Field(..., description="ID du fournisseur")
    quantity_loaded_kg: float = Field(..., gt=0, description="Quantité chargée en kg")
    load_date: date = Field(..., description="Date de chargement")
    quantity_unloaded_kg: float = Field(..., gt=0, description="Quantité déchargée en kg")
    unload_date: date = Field(..., description="Date de déchargement")
    suivi: Optional[str] = Field(None, description="Notes de suivi")
    date_collecte: date = Field(..., description="Date de collecte")

class CollecteCreate(CollecteBase):
    pass

class CollecteUpdate(BaseModel):
    designation: Optional[str] = None
    chef_planteur_id: Optional[UUID] = None
    quantity_loaded_kg: Optional[float] = Field(None, gt=0)
    load_date: Optional[date] = None
    quantity_unloaded_kg: Optional[float] = Field(None, gt=0)
    unload_date: Optional[date] = None
    suivi: Optional[str] = None
    date_collecte: Optional[date] = None

class CollecteResponse(CollecteBase):
    id: UUID
    chef_planteur_name: Optional[str] = None
    chef_planteur_cooperative: Optional[str] = None
    pertes_kg: float
    pourcentage_pertes: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
