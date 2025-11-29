from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None

class NotificationCreate(NotificationBase):
    user_id: UUID
    action_by: Optional[UUID] = None

class NotificationResponse(NotificationBase):
    id: UUID
    user_id: UUID
    action_by: Optional[UUID] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    actor_email: Optional[str] = None

    class Config:
        from_attributes = True

class NotificationStats(BaseModel):
    total: int
    unread: int
