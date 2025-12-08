"""Schémas Pydantic pour les factures"""
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    CANCELLED = "cancelled"


class InvoiceCreate(BaseModel):
    payment_id: Optional[UUID] = None
    planter_id: UUID
    amount: float
    weight_kg: Optional[float] = None
    price_per_kg: Optional[float] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None
    paid_date: Optional[datetime] = None


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    payment_id: Optional[UUID]
    planter_id: UUID
    amount: float
    weight_kg: Optional[float]
    price_per_kg: Optional[float]
    status: InvoiceStatus
    issue_date: datetime
    due_date: Optional[datetime]
    paid_date: Optional[datetime]
    pdf_path: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    # Données enrichies
    planter_name: Optional[str] = None
    planter_phone: Optional[str] = None
    
    class Config:
        from_attributes = True
