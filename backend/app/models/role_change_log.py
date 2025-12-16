"""
Journal des changements de rôles
"""
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..database import Base


class RoleChangeLog(Base):
    """Historique des changements de rôles utilisateurs"""
    __tablename__ = "role_change_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_email = Column(String, nullable=False)
    old_role = Column(String(50), nullable=True)
    new_role = Column(String(50), nullable=False)
    changed_by_id = Column(UUID(as_uuid=True), nullable=False)
    changed_by_email = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<RoleChangeLog {self.user_email}: {self.old_role} -> {self.new_role}>"
