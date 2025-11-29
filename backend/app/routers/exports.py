from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID
from ..database import get_db
from ..services import export_service
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/exports", tags=["exports"])

@router.get("/excel")
def export_excel(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    planter_id: Optional[UUID] = None,
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    output = export_service.export_excel(db, from_date, to_date, planter_id, load, unload, quality)
    filename = f"livraisons_cacao_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/pdf")
def export_pdf(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    load: Optional[str] = None,
    unload: Optional[str] = None,
    quality: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    output = export_service.export_pdf(db, from_date, to_date, load, unload, quality)
    filename = f"synthese_cacao_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
