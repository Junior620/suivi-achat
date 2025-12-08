from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class WarehouseBase(BaseModel):
    name: str
    location: str
    capacity_kg: float
    alert_threshold_kg: float = 1000
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: str = 'true'

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    capacity_kg: Optional[float] = None
    alert_threshold_kg: Optional[float] = None
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[str] = None

class WarehouseResponse(WarehouseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class WarehouseWithStock(WarehouseResponse):
    current_stock_kg: float
    stock_percentage: float
    alert_status: str  # 'ok', 'warning', 'critical'
    
class StockMovementBase(BaseModel):
    warehouse_id: UUID
    movement_type: str
    quantity_kg: float
    quality: Optional[str] = None
    delivery_id: Optional[UUID] = None
    reference: Optional[str] = None
    from_warehouse_id: Optional[UUID] = None
    to_warehouse_id: Optional[UUID] = None
    notes: Optional[str] = None

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementResponse(StockMovementBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True

class StockAlert(BaseModel):
    warehouse_id: UUID
    warehouse_name: str
    current_stock_kg: float
    alert_threshold_kg: float
    alert_level: str  # 'warning', 'critical'
    message: str
