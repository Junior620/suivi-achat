from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..models.warehouse import Warehouse
from ..models.stock_movement import StockMovement
from ..schemas.warehouse import (
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    WarehouseWithStock, StockMovementCreate, StockMovementResponse,
    StockAlert
)
from ..services.warehouse_service import WarehouseService
from ..middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/warehouses", tags=["warehouses"])

@router.get("", response_model=List[WarehouseWithStock])
def list_warehouses(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Liste tous les entrepôts avec leur stock actuel"""
    return WarehouseService.get_all_warehouses_with_stock(db)

@router.get("/alerts", response_model=List[StockAlert])
def get_stock_alerts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Obtenir les alertes de stock bas"""
    return WarehouseService.get_stock_alerts(db)

@router.get("/{warehouse_id}", response_model=WarehouseWithStock)
def get_warehouse(warehouse_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Obtenir un entrepôt spécifique avec son stock"""
    warehouse = WarehouseService.get_warehouse_with_stock(db, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.post("", response_model=WarehouseResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Créer un nouvel entrepôt"""
    new_warehouse = Warehouse(**warehouse.dict())
    db.add(new_warehouse)
    db.commit()
    db.refresh(new_warehouse)
    return new_warehouse

@router.put("/{warehouse_id}", response_model=WarehouseResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_warehouse(
    warehouse_id: UUID,
    warehouse_data: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mettre à jour un entrepôt"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    for key, value in warehouse_data.dict(exclude_unset=True).items():
        setattr(warehouse, key, value)
    
    db.commit()
    db.refresh(warehouse)
    return warehouse

@router.delete("/{warehouse_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_warehouse(warehouse_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Supprimer un entrepôt"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    db.delete(warehouse)
    db.commit()
    return {"message": "Warehouse deleted"}

# ==================== MOUVEMENTS DE STOCK ====================

@router.get("/{warehouse_id}/movements", response_model=List[StockMovementResponse])
def get_warehouse_movements(
    warehouse_id: UUID,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtenir l'historique des mouvements d'un entrepôt"""
    movements = db.query(StockMovement).filter(
        StockMovement.warehouse_id == warehouse_id
    ).order_by(StockMovement.created_at.desc()).limit(limit).all()
    return movements

@router.post("/movements", response_model=StockMovementResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_movement(
    movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Créer un mouvement de stock"""
    new_movement = WarehouseService.create_movement(
        db,
        movement.warehouse_id,
        movement.movement_type,
        movement.quantity_kg,
        current_user.id,
        quality=movement.quality,
        delivery_id=movement.delivery_id,
        reference=movement.reference,
        notes=movement.notes
    )
    return new_movement

@router.post("/transfer", dependencies=[Depends(require_role(["admin", "manager"]))])
def transfer_stock(
    from_warehouse_id: UUID,
    to_warehouse_id: UUID,
    quantity_kg: float,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Transférer du stock entre deux entrepôts"""
    WarehouseService.transfer_stock(
        db, from_warehouse_id, to_warehouse_id, quantity_kg, current_user.id, notes
    )
    return {"message": "Transfer completed"}
