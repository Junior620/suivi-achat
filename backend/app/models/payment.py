from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
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

    id = Column(Integer, primary_key=True, index=True)
    planter_id = Column(Integer, ForeignKey("planters.id"), nullable=False)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    
    montant = Column(Float, nullable=False)
    methode = Column(Enum(PaymentMethod), default=PaymentMethod.VIREMENT)
    statut = Column(Enum(PaymentStatus), default=PaymentStatus.COMPLETED)
    
    date_paiement = Column(Date, nullable=False)
    reference = Column(String, nullable=True)  # Numéro de transaction/chèque
    notes = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relations
    planter = relationship("Planter", back_populates="payments")
    delivery = relationship("Delivery", back_populates="payments")
    creator = relationship("User")
