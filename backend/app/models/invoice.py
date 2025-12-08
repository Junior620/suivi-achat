"""Modèle pour les factures"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
import enum

from ..database import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String, unique=True, nullable=False, index=True)
    
    # Relations
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    planter_id = Column(UUID(as_uuid=True), ForeignKey("planters.id"), nullable=False)
    
    # Montants
    amount = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=True)
    price_per_kg = Column(Float, nullable=True)
    
    # Statut et dates
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    paid_date = Column(DateTime, nullable=True)
    
    # Fichier PDF
    pdf_path = Column(String, nullable=True)
    
    # Métadonnées
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relations
    payment = relationship("Payment", backref="invoices")
    planter = relationship("Planter", backref="invoices")
    creator = relationship("User", foreign_keys=[created_by])
