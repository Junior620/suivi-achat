from sqlalchemy import Column, String, DateTime, Date, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class Collecte(Base):
    __tablename__ = "collectes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    designation = Column(String, nullable=False)  # Description de l'opération
    chef_planteur_id = Column(UUID(as_uuid=True), ForeignKey("chef_planteurs.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_loaded_kg = Column(Numeric(12, 2), nullable=False)  # Quantité chargée
    load_date = Column(Date, nullable=False, index=True)  # Date de chargement
    quantity_unloaded_kg = Column(Numeric(12, 2), nullable=False)  # Quantité déchargée
    unload_date = Column(Date, nullable=False, index=True)  # Date de déchargement
    suivi = Column(Text, nullable=True)  # Notes de suivi
    date_collecte = Column(Date, nullable=False, index=True)  # Date de collecte
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relation avec le fournisseur
    chef_planteur = relationship("ChefPlanteur", backref="collectes")
    
    @property
    def pertes_kg(self):
        """Calcule les pertes"""
        return float(self.quantity_loaded_kg) - float(self.quantity_unloaded_kg)
    
    @property
    def pourcentage_pertes(self):
        """Calcule le pourcentage de pertes"""
        if self.quantity_loaded_kg > 0:
            return (self.pertes_kg / float(self.quantity_loaded_kg)) * 100
        return 0
