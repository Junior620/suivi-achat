from sqlalchemy import Column, String, DateTime, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base
import sqlalchemy as sa

class ChefPlanteur(Base):
    __tablename__ = "chef_planteurs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True, index=True)
    phone = Column(String, nullable=True)
    cni = Column(String, nullable=True)  # Numéro CNI
    cooperative = Column(String, nullable=True)  # Nom de la coopérative
    region = Column(String, nullable=True)  # Région
    departement = Column(String, nullable=True)  # Département
    localite = Column(String, nullable=True)  # Localité/Village
    quantite_max_kg = Column(Numeric(12, 2), nullable=False)  # Quantité maximale déclarée en kg
    date_debut_contrat = Column(sa.Date, nullable=True)  # Date de début du contrat
    date_fin_contrat = Column(sa.Date, nullable=True)  # Date de fin du contrat
    raison_fin_contrat = Column(String, nullable=True)  # Raison de fin de contrat
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relation avec les planteurs
    planteurs = relationship("Planter", back_populates="chef_planteur")
