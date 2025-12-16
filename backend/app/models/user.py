from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="viewer")  # superadmin, admin, manager, viewer
    is_active = Column(Boolean, default=True, nullable=False)
    zone = Column(String(100), nullable=True)  # Zone geographique pour restriction
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=True)  # Qui a cree ce compte
    deactivated_at = Column(DateTime, nullable=True)
    deactivated_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Relations
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
