from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class Planter(Base):
    __tablename__ = "planters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    cni = Column(String, nullable=True)  # Numéro CNI
    cooperative = Column(String, nullable=True)  # Nom de la coopérative
    region = Column(String, nullable=True)  # Région
    departement = Column(String, nullable=True)  # Département
    localite = Column(String, nullable=True)  # Localité/Village
    statut_plantation = Column(String, nullable=True)  # Statut de la plantation (Propriétaire, Locataire, etc.)
    superficie_hectares = Column(Numeric(10, 2), nullable=True)  # Superficie du terrain du planteur
    chef_planteur_id = Column(UUID(as_uuid=True), ForeignKey("chef_planteurs.id", ondelete="SET NULL"), nullable=True, index=True)  # Optionnel
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    deliveries = relationship("Delivery", back_populates="planter", cascade="all, delete-orphan")
    chef_planteur = relationship("ChefPlanteur", back_populates="planteurs")
    
    @property
    def limite_production_kg(self):
        """Calcule la limite de production en kg (1 hectare = 1000 kg)"""
        if self.superficie_hectares:
            return float(self.superficie_hectares) * 1000
        return None
