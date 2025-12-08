from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: str
    planter_id: Optional[UUID] = None
    chef_planteur_id: Optional[UUID] = None
    delivery_id: Optional[UUID] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: UUID
    status: str
    file_name: str
    file_size: int
    mime_type: str
    is_signed: bool
    signed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DocumentSignRequest(BaseModel):
    signature_data: str  # Base64 encoded signature image
    
class DocumentStats(BaseModel):
    total_documents: int
    by_type: dict
    by_status: dict
    total_size_mb: float
    pending_signatures: int
