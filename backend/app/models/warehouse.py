from sqlalchemy import Column, String, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class Warehouse(Base):
    __tablename__ = "warehouses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True, index=True)
    location = Column(String, nullable=False)
    capacity_kg = Column(Numeric(12, 2), nullable=False)  # Capacité maximale
    alert_threshold_kg = Column(Numeric(12, 2), nullable=False, default=1000)  # Seuil d'alerte
    manager_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(String, nullable=False, default='true')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relations
    stock_movements = relationship("StockMovement", foreign_keys="[StockMovement.warehouse_id]", back_populates="warehouse")
