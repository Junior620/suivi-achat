from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class TraceabilityRecord(Base):
    """Enregistrement de traçabilité pour chaque livraison"""
    __tablename__ = "traceability_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey('deliveries.id'), nullable=False)
    
    # QR Code
    qr_code = Column(String(255), unique=True, nullable=False, index=True)
    qr_code_image = Column(Text)  # Base64 encoded image
    
    # Blockchain
    blockchain_hash = Column(String(64), unique=True, nullable=False)  # SHA-256
    previous_hash = Column(String(64))  # Hash du bloc précédent
    block_number = Column(Integer, nullable=False)
    
    # Données de traçabilité
    trace_data = Column(JSON)  # Toutes les infos de la livraison
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime)
    
    # Relations
    delivery = relationship("Delivery", back_populates="traceability")
    scans = relationship("TraceabilityScan", back_populates="record", cascade="all, delete-orphan")

class TraceabilityScan(Base):
    """Historique des scans de QR codes"""
    __tablename__ = "traceability_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey('traceability_records.id'), nullable=False)
    
    # Info du scan
    scanned_by = Column(String(255))  # Nom ou ID de la personne
    scan_location = Column(String(255))  # Lieu du scan
    scan_type = Column(String(50))  # 'verification', 'transfer', 'quality_check', etc.
    notes = Column(Text)
    
    # Géolocalisation
    latitude = Column(String(50))
    longitude = Column(String(50))
    
    # Timestamp
    scanned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relation
    record = relationship("TraceabilityRecord", back_populates="scans")
