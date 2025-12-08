from sqlalchemy import Column, String, Float, Date, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from ..database import Base

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    VIREMENT = "virement"
    CHEQUE = "cheque"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    planter_id = Column(UUID(as_uuid=True), ForeignKey("planters.id"), nullable=False)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id"), nullable=True)
    
    montant = Column(Float, nullable=False)
    methode = Column(String, nullable=False)
    statut = Column(String, default="COMPLETED")
    
    date_paiement = Column(Date, nullable=False)
    reference = Column(String, nullable=True)  # Numéro de transaction/chèque
    notes = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relations
    planter = relationship("Planter", back_populates="payments")
    delivery = relationship("Delivery", back_populates="payments")
    creator = relationship("User")
