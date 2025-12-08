from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
import os
import hashlib
import shutil
from pathlib import Path
from ..database import get_db
from ..models.document import Document, DocumentType, DocumentStatus
from ..schemas.document import DocumentResponse, DocumentUpdate, DocumentSignRequest, DocumentStats
from ..middleware.auth import get_current_user, require_role
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])

# Dossier de stockage des documents
UPLOAD_DIR = Path("/app/uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def calculate_file_hash(file_path: str) -> str:
    """Calculer le hash SHA-256 d'un fichier"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    document_type: str = Form(...),
    planter_id: Optional[str] = Form(None),
    chef_planteur_id: Optional[str] = Form(None),
    delivery_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload un document"""
    
    # Vérifier le type de fichier
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg", 
                     "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    # Générer un nom de fichier unique
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Sauvegarder le fichier
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Calculer la taille et le hash
    file_size = os.path.getsize(file_path)
    file_hash = calculate_file_hash(str(file_path))
    
    # Créer l'enregistrement en base
    document = Document(
        title=title,
        description=description,
        document_type=document_type,
        file_name=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type,
        file_hash=file_hash,
        planter_id=UUID(planter_id) if planter_id else None,
        chef_planteur_id=UUID(chef_planteur_id) if chef_planteur_id else None,
        delivery_id=UUID(delivery_id) if delivery_id else None,
        uploaded_by=current_user.id
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    planter_id: Optional[UUID] = None,
    chef_planteur_id: Optional[UUID] = None,
    delivery_id: Optional[UUID] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Liste les documents avec filtres"""
    query = db.query(Document)
    
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if status:
        query = query.filter(Document.status == status)
    if planter_id:
        query = query.filter(Document.planter_id == planter_id)
    if chef_planteur_id:
        query = query.filter(Document.chef_planteur_id == chef_planteur_id)
    if delivery_id:
        query = query.filter(Document.delivery_id == delivery_id)
    
    return query.order_by(Document.created_at.desc()).limit(limit).all()

@router.get("/stats", response_model=DocumentStats)
def get_document_stats(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Statistiques des documents"""
    total = db.query(func.count(Document.id)).scalar()
    
    # Par type
    by_type = {}
    for doc_type in DocumentType:
        count = db.query(func.count(Document.id)).filter(Document.document_type == doc_type).scalar()
        by_type[doc_type.value] = count
    
    # Par statut
    by_status = {}
    for status in DocumentStatus:
        count = db.query(func.count(Document.id)).filter(Document.status == status).scalar()
        by_status[status.value] = count
    
    # Taille totale
    total_size = db.query(func.sum(Document.file_size)).scalar() or 0
    total_size_mb = total_size / (1024 * 1024)
    
    # En attente de signature
    pending = db.query(func.count(Document.id)).filter(
        Document.status == DocumentStatus.PENDING_SIGNATURE
    ).scalar()
    
    return DocumentStats(
        total_documents=total,
        by_type=by_type,
        by_status=by_status,
        total_size_mb=round(total_size_mb, 2),
        pending_signatures=pending
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Obtenir un document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.get("/{document_id}/download")
def download_document(document_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Télécharger un document"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error(f"Document {document_id} not found in database")
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"Document found: {document.file_path}")
        
        if not os.path.exists(document.file_path):
            logger.error(f"File not found on disk: {document.file_path}")
            raise HTTPException(status_code=404, detail="File not found on server")
        
        logger.info(f"Sending file: {document.file_path}")
        return FileResponse(
            path=document.file_path,
            filename=document.file_name,
            media_type=document.mime_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mettre à jour un document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    for key, value in document_data.dict(exclude_unset=True).items():
        setattr(document, key, value)
    
    db.commit()
    db.refresh(document)
    return document

@router.post("/{document_id}/sign", response_model=DocumentResponse)
def sign_document(
    document_id: UUID,
    signature: DocumentSignRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Signer un document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.is_signed:
        raise HTTPException(status_code=400, detail="Document already signed")
    
    document.is_signed = True
    document.signed_at = datetime.utcnow()
    document.signed_by = current_user.id
    document.signature_data = signature.signature_data
    document.status = DocumentStatus.SIGNED
    
    db.commit()
    db.refresh(document)
    return document

@router.delete("/{document_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_document(document_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Supprimer un document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Supprimer le fichier physique
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    db.delete(document)
    db.commit()
    return {"message": "Document deleted"}
