from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID
from ..database import get_db
from ..schemas.collecte import CollecteCreate, CollecteUpdate, CollecteResponse
from ..services import collecte_service
from ..middleware.auth import require_role, get_current_user
from ..utils.pagination import PaginatedResponse

router = APIRouter(prefix="/collectes", tags=["collectes"])

@router.get("", response_model=PaginatedResponse[CollecteResponse])
def list_collectes(
    search: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    chef_planteur_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    collectes, total = collecte_service.get_collectes(
        db, search, from_date, to_date, chef_planteur_id, page, size
    )
    return PaginatedResponse(items=collectes, page=page, size=size, total=total)

@router.get("/{collecte_id}", response_model=CollecteResponse)
def get_collecte(
    collecte_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return collecte_service.get_collecte(db, collecte_id)

@router.post("", response_model=CollecteResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_collecte(
    collecte_data: CollecteCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return collecte_service.create_collecte(db, collecte_data, current_user.id)

@router.put("/{collecte_id}", response_model=CollecteResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_collecte(
    collecte_id: UUID,
    collecte_data: CollecteUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return collecte_service.update_collecte(db, collecte_id, collecte_data, current_user.id)

@router.delete("/{collecte_id}", dependencies=[Depends(require_role(["admin", "manager"]))])
def delete_collecte(
    collecte_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    collecte_service.delete_collecte(db, collecte_id, current_user.id)
    return {"message": "Collecte deleted successfully"}
