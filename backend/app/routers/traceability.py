from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.traceability import TraceabilityRecord
from ..schemas.traceability import (
    TraceabilityRecordResponse,
    TraceabilityScanCreate,
    TraceabilityScanResponse,
    BlockchainVerificationResponse
)
from ..services.traceability_service import TraceabilityService, BlockchainService

router = APIRouter(prefix="/traceability", tags=["traceability"])

@router.get("/delivery/{delivery_id}", response_model=TraceabilityRecordResponse)
def get_delivery_traceability(
    delivery_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir l'enregistrement de traçabilité d'une livraison"""
    record = db.query(TraceabilityRecord).filter(
        TraceabilityRecord.delivery_id == delivery_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Enregistrement de traçabilité non trouvé")
    
    return record

@router.get("/verify/{qr_code}")
def verify_qr_code(qr_code: str, db: Session = Depends(get_db)):
    """Vérifier l'authenticité d'une livraison via son QR code (public)"""
    result = TraceabilityService.verify_traceability(db, qr_code)
    
    if not result:
        raise HTTPException(status_code=404, detail="QR code non trouvé")
    
    return result

@router.post("/scan/{qr_code}", response_model=TraceabilityScanResponse)
def scan_qr_code(
    qr_code: str,
    scan_data: TraceabilityScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enregistrer un scan de QR code"""
    try:
        scan = TraceabilityService.scan_qr_code(
            db=db,
            qr_code=qr_code,
            scanned_by=scan_data.scanned_by,
            scan_location=scan_data.scan_location,
            scan_type=scan_data.scan_type,
            notes=scan_data.notes,
            latitude=scan_data.latitude,
            longitude=scan_data.longitude
        )
        return scan
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/timeline/{delivery_id}")
def get_delivery_timeline(
    delivery_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir la timeline complète d'une livraison"""
    timeline = TraceabilityService.get_delivery_timeline(db, str(delivery_id))
    
    if not timeline:
        raise HTTPException(status_code=404, detail="Timeline non trouvée")
    
    return timeline

@router.get("/blockchain/verify")
def verify_blockchain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vérifier l'intégrité de toute la blockchain"""
    is_valid = BlockchainService.verify_chain(db)
    
    total_blocks = db.query(TraceabilityRecord).count()
    
    return {
        'is_valid': is_valid,
        'total_blocks': total_blocks,
        'message': 'Blockchain intègre' if is_valid else 'Blockchain compromise - Données altérées détectées'
    }

@router.get("/qr-code/{qr_code}/image")
def get_qr_code_image(
    qr_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir l'image du QR code"""
    record = db.query(TraceabilityRecord).filter(
        TraceabilityRecord.qr_code == qr_code
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="QR code non trouvé")
    
    return {
        'qr_code': record.qr_code,
        'image': record.qr_code_image
    }

@router.get("/stats")
def get_traceability_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistiques de traçabilité"""
    total_records = db.query(TraceabilityRecord).count()
    
    from ..models.traceability import TraceabilityScan
    total_scans = db.query(TraceabilityScan).count()
    
    is_blockchain_valid = BlockchainService.verify_chain(db)
    
    return {
        'total_deliveries_tracked': total_records,
        'total_scans': total_scans,
        'blockchain_valid': is_blockchain_valid,
        'average_scans_per_delivery': round(total_scans / total_records, 2) if total_records > 0 else 0
    }
