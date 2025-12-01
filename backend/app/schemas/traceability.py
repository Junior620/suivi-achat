from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

class TraceabilityScanCreate(BaseModel):
    scanned_by: str
    scan_location: Optional[str] = None
    scan_type: str = "verification"
    notes: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None

class TraceabilityScanResponse(BaseModel):
    id: UUID
    record_id: UUID
    scanned_by: str
    scan_location: Optional[str]
    scan_type: str
    notes: Optional[str]
    latitude: Optional[str]
    longitude: Optional[str]
    scanned_at: datetime

    class Config:
        from_attributes = True

class TraceabilityRecordResponse(BaseModel):
    id: UUID
    delivery_id: UUID
    qr_code: str
    qr_code_image: Optional[str]
    blockchain_hash: str
    previous_hash: Optional[str]
    block_number: int
    trace_data: Dict[str, Any]
    created_at: datetime
    verified_at: Optional[datetime]
    scans: List[TraceabilityScanResponse] = []

    class Config:
        from_attributes = True

class BlockchainVerificationResponse(BaseModel):
    is_valid: bool
    blockchain_hash: str
    block_number: int
    previous_hash: Optional[str]
    message: str
    trace_data: Dict[str, Any]
