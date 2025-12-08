"""Schémas Pydantic pour le système de messagerie"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# Schémas pour les canaux
class ChannelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: str = Field(default='public', pattern='^(public|private)$')


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ChannelMemberInfo(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    last_read_at: Optional[datetime] = None
    notifications_enabled: bool
    
    # Info utilisateur
    user_email: Optional[str] = None
    user_role: Optional[str] = None

    class Config:
        from_attributes = True


class Channel(ChannelBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    
    # Informations supplémentaires
    member_count: Optional[int] = None
    unread_count: Optional[int] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    is_member: Optional[bool] = None
    
    class Config:
        from_attributes = True


# Schémas pour les messages
class MessageBase(BaseModel):
    content: str = Field(..., min_length=1)
    message_type: str = Field(default='text', pattern='^(text|file|system|command)$')
    attachments: Optional[List[Dict[str, Any]]] = None
    mentions: Optional[List[str]] = None  # Changé de UUID à str pour la sérialisation JSON
    entity_references: Optional[Dict[str, Any]] = None  # Changé de List à Dict pour supporter reply_to, reactions, etc.


class MessageCreate(MessageBase):
    channel_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None


class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class MessageSender(BaseModel):
    id: UUID
    email: str
    role: str
    
    class Config:
        from_attributes = True


class Message(MessageBase):
    id: UUID
    channel_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    sender_id: UUID
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    
    # Informations supplémentaires
    sender: Optional[MessageSender] = None
    is_read: Optional[bool] = None
    read_count: Optional[int] = None
    is_pinned: Optional[bool] = None
    
    class Config:
        from_attributes = True


# Schémas pour les conversations directes
class DirectConversationCreate(BaseModel):
    user_id: UUID


class ConversationParticipant(BaseModel):
    id: UUID
    email: str
    role: str
    status: Optional[str] = 'offline'
    
    class Config:
        from_attributes = True


class DirectConversation(BaseModel):
    id: UUID
    user1_id: UUID
    user2_id: UUID
    created_at: datetime
    
    # Informations supplémentaires
    other_user: Optional[ConversationParticipant] = None
    unread_count: Optional[int] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Schémas pour les actions
class MessageReadCreate(BaseModel):
    message_id: UUID


class PinMessageCreate(BaseModel):
    message_id: UUID
    channel_id: UUID


class TypingIndicator(BaseModel):
    channel_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    is_typing: bool


class UserStatusUpdate(BaseModel):
    status: str = Field(..., pattern='^(online|away|offline)$')


class UserStatusInfo(BaseModel):
    user_id: UUID
    status: str
    last_seen: datetime
    is_typing: bool = False
    typing_in: Optional[str] = None  # channel name or 'dm'
    
    class Config:
        from_attributes = True


# Schémas pour la recherche
class MessageSearchQuery(BaseModel):
    query: str = Field(..., min_length=1)
    channel_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    sender_id: Optional[UUID] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


class MessageSearchResult(BaseModel):
    messages: List[Message]
    total: int
    has_more: bool


# Schémas pour les statistiques
class UnreadCounts(BaseModel):
    total: int
    channels: Dict[str, int]  # channel_id -> count
    conversations: Dict[str, int]  # conversation_id -> count


class MessagingStats(BaseModel):
    total_messages: int
    total_channels: int
    total_conversations: int
    active_users: int
    messages_today: int


# Schémas WebSocket
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: Optional[datetime] = None


class WebSocketResponse(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)
