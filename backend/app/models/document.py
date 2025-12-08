from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..database import Base

class DocumentType(str, enum.Enum):
    CONTRACT = "contract"  # Contrat
    CERTIFICATE = "certificate"  # Certificat
    INVOICE = "invoice"  # Facture
    DELIVERY_NOTE = "delivery_note"  # Bon de livraison
    ID_CARD = "id_card"  # Carte d'identité
    PHOTO = "photo"  # Photo
    OTHER = "other"  # Autre

class DocumentStatus(str, enum.Enum):
    DRAFT = "draft"  # Brouillon
    PENDING_SIGNATURE = "pending_signature"  # En attente de signature
    SIGNED = "signed"  # Signé
    VALIDATED = "validated"  # Validé
    ARCHIVED = "archived"  # Archivé
    REJECTED = "rejected"  # Rejeté

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    status = Column(SQLEnum(DocumentStatus), nullable=False, default=DocumentStatus.DRAFT, index=True)
    
    # Fichier
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Chemin sur le serveur
    file_size = Column(Integer, nullable=False)  # Taille en bytes
    mime_type = Column(String, nullable=False)  # application/pdf, image/jpeg, etc.
    file_hash = Column(String, nullable=True)  # SHA-256 pour vérification intégrité
    
    # Associations
    planter_id = Column(UUID(as_uuid=True), ForeignKey("planters.id", ondelete="CASCADE"), nullable=True, index=True)
    chef_planteur_id = Column(UUID(as_uuid=True), ForeignKey("chef_planteurs.id", ondelete="CASCADE"), nullable=True, index=True)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Métadonnées
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Signature
    is_signed = Column(Boolean, default=False, nullable=False)
    signed_at = Column(DateTime, nullable=True)
    signed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    signature_data = Column(Text, nullable=True)  # Données de signature (base64)
    
    # Relations
    uploader = relationship("User", foreign_keys=[uploaded_by])
    signer = relationship("User", foreign_keys=[signed_by])
    planter = relationship("Planter", backref="documents")
    chef_planteur = relationship("ChefPlanteur", backref="documents")
    delivery = relationship("Delivery", backref="documents")
