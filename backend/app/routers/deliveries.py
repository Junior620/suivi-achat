from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from ..database import get_db
from ..schemas import DeliveryCreate, DeliveryUpdate, DeliveryResponse
from ..services import delivery_service
from ..middleware.auth import require_role, get_current_user
from ..utils.pagination import PaginatedResponse

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

@router.get("", response_model=PaginatedResponse[DeliveryResponse])
def list_deliveries(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    planter_id: Optional[UUID] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None,
    min_qty: Optional[Decimal] = None,
    max_qty: Optional[Decimal] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=10000),
    sort: str = Query("date"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    deliveries, total = delivery_service.get_deliveries(
        db, from_date, to_date, planter_id, load, unload, quality, min_qty, max_qty, page, size, sort
    )
    return PaginatedResponse(items=deliveries, page=page, size=size, total=total)

@router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(
    delivery_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return delivery_service.get_delivery(db, delivery_id)

@router.post("", response_model=DeliveryResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_delivery(delivery_data: DeliveryCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return delivery_service.create_delivery(db, delivery_data, current_user.id)

@router.put("/{delivery_id}", response_model=DeliveryResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_delivery(delivery_id: UUID, delivery_data: DeliveryUpdate, db: Session = Depends(get_db)):
    return delivery_service.update_delivery(db, delivery_id, delivery_data)

@router.delete("/{delivery_id}", dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_delivery(delivery_id: UUID, db: Session = Depends(get_db)):
    delivery_service.delete_delivery(db, delivery_id)
    return {"message": "Delivery deleted successfully"}

@router.get("/locations/unique")
def get_unique_locations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Récupère tous les lieux uniques pour l'autocomplétion"""
    return delivery_service.get_unique_locations(db)
