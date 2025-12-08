"""Modèles pour le système de messagerie interne"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import uuid


class Channel(Base):
    """Modèle pour les canaux de messagerie"""
    __tablename__ = "channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(20), default='public')  # 'public', 'private'
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="channel", cascade="all, delete-orphan")
    pinned_messages = relationship("PinnedMessage", back_populates="channel", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Channel {self.name}>"


class ChannelMember(Base):
    """Modèle pour les membres des canaux"""
    __tablename__ = "channel_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default='member')  # 'admin', 'member'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True))
    notifications_enabled = Column(Boolean, default=True)

    # Relations
    channel = relationship("Channel", back_populates="members")
    user = relationship("User")

    def __repr__(self):
        return f"<ChannelMember {self.user_id} in {self.channel_id}>"


class DirectConversation(Base):
    """Modèle pour les conversations directes"""
    __tablename__ = "direct_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DirectConversation {self.user1_id} <-> {self.user2_id}>"


class Message(Base):
    """Modèle pour les messages"""
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("direct_conversations.id", ondelete="CASCADE"))
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default='text')  # 'text', 'file', 'system', 'command'
    attachments = Column(JSONB)  # [{name, url, size, type, thumbnail}]
    mentions = Column(JSONB)  # [user_ids]
    entity_references = Column(JSONB)  # [{type: 'livraison', id: '123'}]
    edited_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relations
    channel = relationship("Channel", back_populates="messages")
    conversation = relationship("DirectConversation", back_populates="messages")
    sender = relationship("User")
    reads = relationship("MessageRead", back_populates="message", cascade="all, delete-orphan")
    pinned = relationship("PinnedMessage", back_populates="message", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Message {self.id} by {self.sender_id}>"


class MessageRead(Base):
    """Modèle pour les lectures de messages"""
    __tablename__ = "message_reads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    message = relationship("Message", back_populates="reads")
    user = relationship("User")

    def __repr__(self):
        return f"<MessageRead {self.message_id} by {self.user_id}>"


class PinnedMessage(Base):
    """Modèle pour les messages épinglés"""
    __tablename__ = "pinned_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    pinned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    pinned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    message = relationship("Message", back_populates="pinned")
    channel = relationship("Channel", back_populates="pinned_messages")
    pinner = relationship("User")

    def __repr__(self):
        return f"<PinnedMessage {self.message_id} in {self.channel_id}>"


class UserStatus(Base):
    """Modèle pour le statut des utilisateurs"""
    __tablename__ = "user_status"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(20), default='offline')  # 'online', 'away', 'offline'
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    typing_in_channel = Column(UUID(as_uuid=True), ForeignKey("channels.id"))
    typing_in_conversation = Column(UUID(as_uuid=True), ForeignKey("direct_conversations.id"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relations
    user = relationship("User")
    typing_channel = relationship("Channel", foreign_keys=[typing_in_channel])
    typing_conversation = relationship("DirectConversation", foreign_keys=[typing_in_conversation])

    def __repr__(self):
        return f"<UserStatus {self.user_id}: {self.status}>"



