from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr
    role: str = "viewer"

class UserCreate(UserBase):
    password: str
    zone: Optional[str] = None

class UserUpdate(BaseModel):
    role: Optional[str] = None
    zone: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool = True
    zone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deactivated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserWithPermissions(UserResponse):
    permissions: List[str] = []
