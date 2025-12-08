"""Service pour le système de messagerie interne"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from ..models import (
    Channel, ChannelMember, DirectConversation, Message, MessageRead, 
    PinnedMessage, UserStatus, User
)
from ..schemas.messaging import (
    ChannelCreate, MessageCreate, DirectConversationCreate,
    MessageSearchQuery
)
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MessagingService:
    """Service pour gérer la messagerie interne"""
    
    @staticmethod
    def get_user_channels(db: Session, user_id: UUID) -> List[Channel]:
        """Récupérer tous les canaux d'un utilisateur"""
        return db.query(Channel).join(
            ChannelMember, Channel.id == ChannelMember.channel_id
        ).filter(
            ChannelMember.user_id == user_id
        ).options(
            joinedload(Channel.members)
        ).order_by(Channel.name).all()
    
    @staticmethod
    def get_channel_by_name(db: Session, name: str) -> Optional[Channel]:
        """Récupérer un canal par son nom"""
        return db.query(Channel).filter(Channel.name == name).first()
    
    @staticmethod
    def create_channel(db: Session, channel_data: ChannelCreate, creator_id: UUID) -> Channel:
        """Créer un nouveau canal"""
        channel = Channel(
            **channel_data.dict(),
            created_by=creator_id
        )
        db.add(channel)
        db.flush()
        
        # Ajouter le créateur comme admin du canal
        member = ChannelMember(
            channel_id=channel.id,
            user_id=creator_id,
            role='admin'
        )
        db.add(member)
        db.commit()
        db.refresh(channel)
        
        # logger.info(f"Canal créé: {channel.name} par {creator_id}")
        return channel
    
    @staticmethod
    def join_channel(db: Session, channel_id: UUID, user_id: UUID) -> ChannelMember:
        """Rejoindre un canal"""
        # Vérifier si déjà membre
        existing = db.query(ChannelMember).filter(
            and_(
                ChannelMember.channel_id == channel_id,
                ChannelMember.user_id == user_id
            )
        ).first()
        
        if existing:
            return existing
        
        member = ChannelMember(
            channel_id=channel_id,
            user_id=user_id
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        
        # logger.info(f"Utilisateur {user_id} a rejoint le canal {channel_id}")
        return member
    
    @staticmethod
    def leave_channel(db: Session, channel_id: UUID, user_id: UUID) -> bool:
        """Quitter un canal"""
        member = db.query(ChannelMember).filter(
            and_(
                ChannelMember.channel_id == channel_id,
                ChannelMember.user_id == user_id
            )
        ).first()
        
        if member:
            db.delete(member)
            db.commit()
            # logger.info(f"Utilisateur {user_id} a quitté le canal {channel_id}")
            return True
        
        return False
    
    @staticmethod
    def get_channel_messages(
        db: Session, 
        channel_id: UUID, 
        user_id: UUID,
        limit: int = 50, 
        before: Optional[datetime] = None
    ) -> List[Message]:
        """Récupérer les messages d'un canal"""
        # Vérifier que l'utilisateur est membre du canal
        is_member = db.query(ChannelMember).filter(
            and_(
                ChannelMember.channel_id == channel_id,
                ChannelMember.user_id == user_id
            )
        ).first()
        
        if not is_member:
            return []
        
        query = db.query(Message).filter(
            Message.channel_id == channel_id,
            Message.deleted_at.is_(None)
        ).options(
            joinedload(Message.sender)
        ).order_by(Message.created_at.asc())
        
        if before:
            query = query.filter(Message.created_at < before)
        
        return query.limit(limit).all()
    
    @staticmethod
    def send_message(
        db: Session, 
        message_data: MessageCreate, 
        sender_id: UUID
    ) -> Message:
        """Envoyer un message"""
        # Vérifier les permissions
        if message_data.channel_id:
            is_member = db.query(ChannelMember).filter(
                and_(
                    ChannelMember.channel_id == message_data.channel_id,
                    ChannelMember.user_id == sender_id
                )
            ).first()
            
            if not is_member:
                raise ValueError("Vous n'êtes pas membre de ce canal")
        
        elif message_data.conversation_id:
            conversation = db.query(DirectConversation).filter(
                DirectConversation.id == message_data.conversation_id,
                or_(
                    DirectConversation.user1_id == sender_id,
                    DirectConversation.user2_id == sender_id
                )
            ).first()
            
            if not conversation:
                raise ValueError("Conversation non trouvée")
        
        message = Message(
            **message_data.dict(),
            sender_id=sender_id
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # logger.info(f"Message envoyé par {sender_id}")
        return message
    
    @staticmethod
    def get_or_create_conversation(
        db: Session, 
        user1_id: UUID, 
        user2_id: UUID
    ) -> DirectConversation:
        """Obtenir ou créer une conversation directe"""
        # Chercher conversation existante (dans les deux sens)
        conversation = db.query(DirectConversation).filter(
            or_(
                and_(
                    DirectConversation.user1_id == user1_id,
                    DirectConversation.user2_id == user2_id
                ),
                and_(
                    DirectConversation.user1_id == user2_id,
                    DirectConversation.user2_id == user1_id
                )
            )
        ).first()
        
        if conversation:
            return conversation
        
        # Créer nouvelle conversation
        conversation = DirectConversation(
            user1_id=user1_id,
            user2_id=user2_id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        # logger.info(f"Conversation créée entre {user1_id} et {user2_id}")
        return conversation
    
    @staticmethod
    def get_user_conversations(db: Session, user_id: UUID) -> List[DirectConversation]:
        """Récupérer toutes les conversations d'un utilisateur"""
        return db.query(DirectConversation).filter(
            or_(
                DirectConversation.user1_id == user_id,
                DirectConversation.user2_id == user_id
            )
        ).all()
    
    @staticmethod
    def mark_message_as_read(db: Session, message_id: UUID, user_id: UUID) -> MessageRead:
        """Marquer un message comme lu"""
        # Vérifier si déjà lu
        existing = db.query(MessageRead).filter(
            and_(
                MessageRead.message_id == message_id,
                MessageRead.user_id == user_id
            )
        ).first()
        
        if existing:
            return existing
        
        read = MessageRead(
            message_id=message_id,
            user_id=user_id
        )
        db.add(read)
        db.commit()
        db.refresh(read)
        
        return read
    
    @staticmethod
    def get_unread_counts(db: Session, user_id: UUID) -> Dict[str, Any]:
        """Obtenir le nombre de messages non lus"""
        # Messages non lus dans les canaux
        channel_unreads = db.query(
            Message.channel_id,
            func.count(Message.id).label('count')
        ).outerjoin(
            MessageRead,
            and_(
                MessageRead.message_id == Message.id,
                MessageRead.user_id == user_id
            )
        ).join(
            ChannelMember,
            and_(
                ChannelMember.channel_id == Message.channel_id,
                ChannelMember.user_id == user_id
            )
        ).filter(
            Message.sender_id != user_id,
            MessageRead.id.is_(None),
            Message.deleted_at.is_(None)
        ).group_by(Message.channel_id).all()
        
        # Messages non lus dans les conversations
        conversation_unreads = db.query(
            Message.conversation_id,
            func.count(Message.id).label('count')
        ).outerjoin(
            MessageRead,
            and_(
                MessageRead.message_id == Message.id,
                MessageRead.user_id == user_id
            )
        ).join(
            DirectConversation,
            DirectConversation.id == Message.conversation_id
        ).filter(
            or_(
                DirectConversation.user1_id == user_id,
                DirectConversation.user2_id == user_id
            ),
            Message.sender_id != user_id,
            MessageRead.id.is_(None),
            Message.deleted_at.is_(None)
        ).group_by(Message.conversation_id).all()
        
        return {
            'channels': {str(ch_id): count for ch_id, count in channel_unreads},
            'conversations': {str(conv_id): count for conv_id, count in conversation_unreads},
            'total': sum(count for _, count in channel_unreads) + sum(count for _, count in conversation_unreads)
        }
    
    @staticmethod
    def update_user_status(
        db: Session, 
        user_id: UUID, 
        status: str,
        typing_in_channel: Optional[UUID] = None,
        typing_in_conversation: Optional[UUID] = None
    ) -> UserStatus:
        """Mettre à jour le statut d'un utilisateur"""
        user_status = db.query(UserStatus).filter(
            UserStatus.user_id == user_id
        ).first()
        
        if not user_status:
            user_status = UserStatus(user_id=user_id)
            db.add(user_status)
        
        user_status.status = status
        user_status.last_seen = datetime.now()
        user_status.typing_in_channel = typing_in_channel
        user_status.typing_in_conversation = typing_in_conversation
        
        db.commit()
        db.refresh(user_status)
        
        return user_status
    
    @staticmethod
    def search_messages(
        db: Session, 
        user_id: UUID,
        query: MessageSearchQuery
    ) -> Dict[str, Any]:
        """Rechercher des messages"""
        base_query = db.query(Message).filter(
            Message.deleted_at.is_(None),
            Message.content.ilike(f'%{query.query}%')
        )
        
        # Filtrer par canal (si l'utilisateur est membre)
        if query.channel_id:
            base_query = base_query.join(
                ChannelMember,
                and_(
                    ChannelMember.channel_id == query.channel_id,
                    ChannelMember.user_id == user_id
                )
            ).filter(Message.channel_id == query.channel_id)
        
        # Filtrer par conversation
        if query.conversation_id:
            base_query = base_query.join(
                DirectConversation,
                DirectConversation.id == query.conversation_id
            ).filter(
                Message.conversation_id == query.conversation_id,
                or_(
                    DirectConversation.user1_id == user_id,
                    DirectConversation.user2_id == user_id
                )
            )
        
        # Filtrer par expéditeur
        if query.sender_id:
            base_query = base_query.filter(Message.sender_id == query.sender_id)
        
        # Filtrer par date
        if query.from_date:
            base_query = base_query.filter(Message.created_at >= query.from_date)
        if query.to_date:
            base_query = base_query.filter(Message.created_at <= query.to_date)
        
        # Compter le total
        total = base_query.count()
        
        # Récupérer les messages
        messages = base_query.options(
            joinedload(Message.sender)
        ).order_by(
            desc(Message.created_at)
        ).limit(query.limit).offset(query.offset).all()
        
        return {
            'messages': messages,
            'total': total,
            'has_more': total > (query.offset + query.limit)
        }
