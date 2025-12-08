from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

class DeliveryBase(BaseModel):
    planter_id: UUID
    date: date
    load_date: Optional[date] = None
    unload_date: Optional[date] = None
    quantity_loaded_kg: float = Field(..., gt=0, description="Quantité chargée en kg")
    quantity_kg: float = Field(..., gt=0, description="Quantité déchargée en kg")
    load_location: str
    unload_location: str
    quality: str
    notes: Optional[str] = None

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryUpdate(DeliveryBase):
    pass

class DeliveryResponse(DeliveryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DeliveryWithPlanter(DeliveryResponse):
    planter_name: str
