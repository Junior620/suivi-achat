from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..database import Base

class MovementType(str, enum.Enum):
    ENTRY = "entry"  # Entrée (livraison)
    EXIT = "exit"    # Sortie (vente/expédition)
    TRANSFER = "transfer"  # Transfert entre entrepôts
    ADJUSTMENT = "adjustment"  # Ajustement d'inventaire
    LOSS = "loss"  # Perte (détérioration, vol)

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(SQLEnum(MovementType), nullable=False, index=True)
    quantity_kg = Column(Numeric(12, 2), nullable=False)  # Positif pour entrée, négatif pour sortie
    quality = Column(String, nullable=True)  # Grade A, B, C
    
    # Références optionnelles
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id", ondelete="SET NULL"), nullable=True)
    reference = Column(String, nullable=True)  # Numéro de bon, facture, etc.
    
    # Transfert
    from_warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    to_warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relations
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id], back_populates="stock_movements")
    delivery = relationship("Delivery", backref="stock_movements")
    creator = relationship("User")
