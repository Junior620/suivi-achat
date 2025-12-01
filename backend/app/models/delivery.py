from sqlalchemy import Column, String, DateTime, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class Delivery(Base):
    __tablename__ = "deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    planter_id = Column(UUID(as_uuid=True), ForeignKey("planters.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # Date de livraison (pour compatibilité)
    load_date = Column(Date, nullable=True, index=True)  # Date de chargement
    unload_date = Column(Date, nullable=True, index=True)  # Date de déchargement
    quantity_loaded_kg = Column(Numeric(12, 2), nullable=False)  # Quantité chargée
    quantity_kg = Column(Numeric(12, 2), nullable=False)  # Quantité déchargée
    load_location = Column(String, nullable=False, index=True)
    unload_location = Column(String, nullable=False, index=True)
    cocoa_quality = Column(String, nullable=False, index=True)
    quality = Column(String, nullable=True, index=True)  # Alias pour compatibilité traçabilité
    vehicle = Column(String, nullable=True)  # Véhicule utilisé
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    planter = relationship("Planter", back_populates="deliveries")
    payments = relationship("Payment", back_populates="delivery", cascade="all, delete-orphan")
    traceability = relationship("TraceabilityRecord", back_populates="delivery", uselist=False, cascade="all, delete-orphan")
