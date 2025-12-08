"""Routes API pour les factures"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..models import User
from ..middleware.auth import get_current_user, require_role
from ..schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceStatus
from ..services.invoice_service import InvoiceService
from ..models.invoice import Invoice
from ..models.planter import Planter
import os

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=InvoiceResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle facture"""
    invoice = InvoiceService.create_invoice(
        db=db,
        planter_id=invoice_data.planter_id,
        amount=invoice_data.amount,
        user_id=current_user.id,
        payment_id=invoice_data.payment_id,
        weight_kg=invoice_data.weight_kg,
        price_per_kg=invoice_data.price_per_kg,
        notes=invoice_data.notes
    )
    
    # Enrichir avec les données du planteur
    response = InvoiceResponse.from_orm(invoice)
    if invoice.planter:
        response.planter_name = invoice.planter.name
        response.planter_phone = invoice.planter.phone
    
    return response


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    status: Optional[InvoiceStatus] = None,
    planter_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Liste des factures avec filtres"""
    invoices = InvoiceService.get_invoices(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        planter_id=planter_id
    )
    
    # Enrichir avec les données des planteurs
    result = []
    for invoice in invoices:
        response = InvoiceResponse.from_orm(invoice)
        if invoice.planter:
            response.planter_name = invoice.planter.name
            response.planter_phone = invoice.planter.phone
        result.append(response)
    
    return result


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer une facture par ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    response = InvoiceResponse.from_orm(invoice)
    if invoice.planter:
        response.planter_name = invoice.planter.name
        response.planter_phone = invoice.planter.phone
    
    return response


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Télécharger le PDF d'une facture"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="PDF non trouvé")
    
    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        filename=f"Facture_{invoice.invoice_number}.pdf"
    )


@router.put("/{invoice_id}/status", response_model=InvoiceResponse, dependencies=[Depends(require_role(["admin", "manager"]))])
def update_invoice_status(
    invoice_id: UUID,
    update_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour le statut d'une facture"""
    if not update_data.status:
        raise HTTPException(status_code=400, detail="Statut requis")
    
    invoice = InvoiceService.update_status(db, invoice_id, update_data.status)
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    response = InvoiceResponse.from_orm(invoice)
    if invoice.planter:
        response.planter_name = invoice.planter.name
        response.planter_phone = invoice.planter.phone
    
    return response


@router.delete("/{invoice_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Annuler une facture (soft delete)"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    invoice.status = InvoiceStatus.CANCELLED
    db.commit()
    
    return {"message": "Facture annulée"}
