from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from ..database import get_db
from ..services import analytics_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary/planter")
def get_summary_planter(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return analytics_service.get_summary_by_planter(db, from_date, to_date)

@router.get("/summary/zones")
def get_summary_zones(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    load: Optional[str] = None,
    unload: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return analytics_service.get_summary_by_zones(db, from_date, to_date, load, unload)

@router.get("/summary/quality")
def get_summary_quality(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    quality: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return analytics_service.get_summary_by_quality(db, from_date, to_date, quality)

@router.get("/summary/fournisseur")
def get_summary_fournisseur(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return analytics_service.get_summary_by_fournisseur(db, from_date, to_date)
