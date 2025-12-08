"""Routes API pour le système de messagerie"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import os
import shutil
from pathlib import Path

from ..database import get_db
from ..models import User
from ..schemas.messaging import (
    Channel, ChannelCreate, ChannelUpdate,
    Message, MessageCreate, MessageUpdate,
    DirectConversation, DirectConversationCreate,
    MessageSearchQuery, MessageSearchResult,
    UnreadCounts, UserStatusUpdate, UserStatusInfo
)
from ..services.messaging_service import MessagingService
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/messaging", tags=["messaging"])

# Dossier pour les uploads de messagerie
UPLOAD_DIR = Path("uploads/messaging")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# Routes pour les canaux
@router.get("/channels", response_model=List[Channel])
async def get_user_channels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer tous les canaux de l'utilisateur"""
    from ..models import Message as MessageModel, MessageRead
    
    channels = MessagingService.get_user_channels(db, current_user.id)
    
    # Ajouter les informations supplémentaires
    result = []
    for channel in channels:
        # Calculer le nombre de messages non lus dans ce canal
        unread_count = db.query(MessageModel).outerjoin(
            MessageRead,
            and_(
                MessageRead.message_id == MessageModel.id,
                MessageRead.user_id == current_user.id
            )
        ).filter(
            MessageModel.channel_id == channel.id,
            MessageModel.sender_id != current_user.id,
            MessageModel.deleted_at.is_(None),
            MessageRead.id.is_(None)
        ).count()
        
        channel_dict = {
            "id": channel.id,
            "name": channel.name,
            "display_name": channel.display_name,
            "description": channel.description,
            "type": channel.type,
            "created_by": channel.created_by,
            "created_at": channel.created_at,
            "member_count": len(channel.members),
            "is_member": True,
            "unread_count": unread_count
        }
        result.append(channel_dict)
    
    return result


@router.get("/channels/public", response_model=List[Channel])
async def get_public_channels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer tous les canaux publics"""
    from ..models import Channel as ChannelModel, Message as MessageModel, MessageRead
    
    channels = db.query(ChannelModel).filter(
        ChannelModel.type == 'public'
    ).all()
    
    user_channels = MessagingService.get_user_channels(db, current_user.id)
    user_channel_ids = {ch.id for ch in user_channels}
    
    result = []
    for channel in channels:
        is_member = channel.id in user_channel_ids
        
        # Calculer le nombre de messages non lus seulement si membre
        unread_count = 0
        if is_member:
            unread_count = db.query(MessageModel).outerjoin(
                MessageRead,
                and_(
                    MessageRead.message_id == MessageModel.id,
                    MessageRead.user_id == current_user.id
                )
            ).filter(
                MessageModel.channel_id == channel.id,
                MessageModel.sender_id != current_user.id,
                MessageModel.deleted_at.is_(None),
                MessageRead.id.is_(None)
            ).count()
        
        channel_dict = {
            "id": channel.id,
            "name": channel.name,
            "display_name": channel.display_name,
            "description": channel.description,
            "type": channel.type,
            "created_by": channel.created_by,
            "created_at": channel.created_at,
            "member_count": len(channel.members),
            "is_member": is_member,
            "unread_count": unread_count
        }
        result.append(channel_dict)
    
    return result


@router.post("/channels", response_model=Channel, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_data: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer un nouveau canal"""
    # Vérifier que le nom n'existe pas déjà
    existing = MessagingService.get_channel_by_name(db, channel_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un canal avec ce nom existe déjà"
        )
    
    channel = MessagingService.create_channel(db, channel_data, current_user.id)
    return channel


@router.post("/channels/{channel_id}/join")
async def join_channel(
    channel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rejoindre un canal"""
    from ..models import Channel as ChannelModel
    channel = db.query(ChannelModel).filter(ChannelModel.id == channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canal non trouvé"
        )
    
    if channel.type == 'private':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce canal est privé"
        )
    
    member = MessagingService.join_channel(db, channel_id, current_user.id)
    return {"message": "Canal rejoint avec succès"}


@router.post("/channels/{channel_id}/leave")
async def leave_channel(
    channel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quitter un canal"""
    success = MessagingService.leave_channel(db, channel_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vous n'êtes pas membre de ce canal"
        )
    
    return {"message": "Canal quitté avec succès"}


# Routes pour les messages
@router.get("/channels/{channel_id}/messages", response_model=List[Message])
async def get_channel_messages(
    channel_id: UUID,
    limit: int = Query(50, le=100),
    before: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les messages d'un canal"""
    messages = MessagingService.get_channel_messages(
        db, channel_id, current_user.id, limit, before
    )
    
    # Enrichir avec les informations de lecture
    result = []
    for msg in messages:
        msg_dict = {
            "id": msg.id,
            "channel_id": msg.channel_id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "message_type": msg.message_type,
            "attachments": msg.attachments,
            "mentions": msg.mentions,
            "entity_references": msg.entity_references,
            "edited_at": msg.edited_at,
            "deleted_at": msg.deleted_at,
            "created_at": msg.created_at,
            "sender": {
                "id": msg.sender.id,
                "email": msg.sender.email,
                "role": msg.sender.role
            } if msg.sender else None
        }
        result.append(msg_dict)
    
    return result


@router.post("/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoyer un message"""
    try:
        message = MessagingService.send_message(db, message_data, current_user.id)
        return message
    except ValueError as e:
        error_msg = str(e)
        
        # Messages d'erreur plus clairs
        if "pas membre" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas membre de ce canal. Rejoignez-le d'abord pour envoyer des messages."
            )
        elif "conversation non trouvée" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cette conversation n'existe pas ou a été supprimée."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )


@router.put("/messages/{message_id}", response_model=Message)
async def update_message(
    message_id: UUID,
    message_data: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modifier un message"""
    from ..models import Message as MessageModel
    message = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non trouvé"
        )
    
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez modifier que vos propres messages"
        )
    
    message.content = message_data.content
    message.edited_at = datetime.now()
    db.commit()
    db.refresh(message)
    
    return message


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer un message"""
    from ..models import Message as MessageModel
    message = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non trouvé"
        )
    
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez supprimer que vos propres messages"
        )
    
    message.deleted_at = datetime.now()
    db.commit()
    
    return {"message": "Message supprimé avec succès"}


# Routes pour les conversations directes
@router.get("/conversations", response_model=List[DirectConversation])
async def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les conversations de l'utilisateur"""
    conversations = MessagingService.get_user_conversations(db, current_user.id)
    
    result = []
    for conv in conversations:
        other_user_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        # Calculer le nombre de messages non lus
        from ..models import Message as MessageModel, MessageRead
        unread_count = db.query(MessageModel).outerjoin(
            MessageRead,
            and_(
                MessageRead.message_id == MessageModel.id,
                MessageRead.user_id == current_user.id
            )
        ).filter(
            MessageModel.conversation_id == conv.id,
            MessageModel.sender_id != current_user.id,
            MessageModel.deleted_at.is_(None),
            MessageRead.id.is_(None)
        ).count()
        
        # Récupérer le dernier message
        last_message = db.query(MessageModel).filter(
            MessageModel.conversation_id == conv.id,
            MessageModel.deleted_at.is_(None)
        ).order_by(MessageModel.created_at.desc()).first()
        
        conv_dict = {
            "id": conv.id,
            "user1_id": conv.user1_id,
            "user2_id": conv.user2_id,
            "created_at": conv.created_at,
            "other_user": {
                "id": other_user.id,
                "email": other_user.email,
                "role": other_user.role
            } if other_user else None,
            "unread_count": unread_count,
            "last_message": last_message.content[:50] + "..." if last_message and len(last_message.content) > 50 else (last_message.content if last_message else None),
            "last_message_at": last_message.created_at if last_message else None
        }
        result.append(conv_dict)
    
    return result


@router.post("/conversations", response_model=DirectConversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: DirectConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer ou récupérer une conversation directe"""
    if conversation_data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas créer une conversation avec vous-même"
        )
    
    # Vérifier que l'utilisateur existe
    other_user = db.query(User).filter(User.id == conversation_data.user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    conversation = MessagingService.get_or_create_conversation(
        db, current_user.id, conversation_data.user_id
    )
    
    return conversation


@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(50, le=100),
    before: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les messages d'une conversation"""
    from ..models import DirectConversation as ConversationModel, Message as MessageModel
    from sqlalchemy import or_, desc
    
    # Vérifier que l'utilisateur fait partie de la conversation
    conversation = db.query(ConversationModel).filter(
        ConversationModel.id == conversation_id,
        or_(
            ConversationModel.user1_id == current_user.id,
            ConversationModel.user2_id == current_user.id
        )
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation non trouvée"
        )
    
    query = db.query(MessageModel).filter(
        MessageModel.conversation_id == conversation_id,
        MessageModel.deleted_at.is_(None)
    ).order_by(MessageModel.created_at.asc())
    
    if before:
        query = query.filter(MessageModel.created_at < before)
    
    messages = query.limit(limit).all()
    
    return messages


# Routes pour les actions
@router.post("/messages/{message_id}/read")
async def mark_message_as_read(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marquer un message comme lu"""
    MessagingService.mark_message_as_read(db, message_id, current_user.id)
    return {"message": "Message marqué comme lu"}


@router.get("/unread", response_model=UnreadCounts)
async def get_unread_counts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir le nombre de messages non lus"""
    counts = MessagingService.get_unread_counts(db, current_user.id)
    return counts


@router.post("/search", response_model=MessageSearchResult)
async def search_messages(
    search_query: MessageSearchQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rechercher des messages"""
    result = MessagingService.search_messages(db, current_user.id, search_query)
    return result


@router.put("/status", response_model=UserStatusInfo)
async def update_user_status(
    status_data: UserStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour le statut de l'utilisateur"""
    user_status = MessagingService.update_user_status(
        db, current_user.id, status_data.status
    )
    
    return {
        "user_id": user_status.user_id,
        "status": user_status.status,
        "last_seen": user_status.last_seen,
        "is_typing": False
    }


# Routes pour les fichiers
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploader un fichier pour la messagerie"""
    try:
        # Générer un nom de fichier unique
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.id}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Retourner les informations du fichier
        file_size = os.path.getsize(file_path)
        
        return {
            "filename": file.filename,
            "stored_filename": unique_filename,
            "url": f"/api/v1/messaging/files/{unique_filename}",
            "size": file_size,
            "type": file.content_type,
            "uploaded_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload: {str(e)}"
        )


@router.get("/files/{filename}")
async def download_file(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Télécharger un fichier de la messagerie"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouvé"
        )
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )


# Routes pour les réactions
@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: UUID,
    reaction_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ajouter une réaction à un message"""
    from ..models import Message as MessageModel
    
    message = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non trouvé"
        )
    
    # Récupérer les réactions existantes
    reactions = message.entity_references or {}
    if 'reactions' not in reactions:
        reactions['reactions'] = []
    
    emoji = reaction_data.get('emoji')
    user_id_str = str(current_user.id)
    
    # Vérifier si l'utilisateur a déjà réagi avec cet emoji
    existing_reaction = next(
        (r for r in reactions['reactions'] if r.get('emoji') == emoji and r.get('user_id') == user_id_str),
        None
    )
    
    if existing_reaction:
        # Retirer la réaction
        reactions['reactions'].remove(existing_reaction)
    else:
        # Ajouter la réaction
        reactions['reactions'].append({
            'emoji': emoji,
            'user_id': user_id_str,
            'created_at': datetime.now().isoformat()
        })
    
    message.entity_references = reactions
    db.commit()
    
    return {"message": "Réaction mise à jour", "reactions": reactions['reactions']}


@router.get("/messages/{message_id}/reactions")
async def get_reactions(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir les réactions d'un message"""
    from ..models import Message as MessageModel
    
    message = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non trouvé"
        )
    
    reactions = message.entity_references or {}
    return reactions.get('reactions', [])


# Routes pour les messages épinglés
@router.post("/messages/{message_id}/pin")
async def pin_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Épingler un message"""
    from ..models import Message as MessageModel, PinnedMessage
    
    message = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non trouvé"
        )
    
    # Vérifier si déjà épinglé
    existing = db.query(PinnedMessage).filter(
        PinnedMessage.message_id == message_id
    ).first()
    
    if existing:
        return {"message": "Message déjà épinglé", "pinned_message": existing}
    
    # Vérifier que le message est dans un canal (pas une conversation directe)
    if not message.channel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seuls les messages de canaux peuvent être épinglés"
        )
    
    # Créer l'épinglage
    pinned = PinnedMessage(
        message_id=message_id,
        channel_id=message.channel_id,
        pinned_by=current_user.id
    )
    db.add(pinned)
    db.commit()
    db.refresh(pinned)
    
    return {"message": "Message épinglé", "pinned_message": pinned}


@router.delete("/messages/{message_id}/pin")
async def unpin_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Désépingler un message"""
    from ..models import PinnedMessage
    
    pinned = db.query(PinnedMessage).filter(
        PinnedMessage.message_id == message_id
    ).first()
    
    if not pinned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message non épinglé"
        )
    
    db.delete(pinned)
    db.commit()
    
    return {"message": "Message désépinglé"}







@router.get("/channels/{channel_id}/pinned")
async def get_channel_pinned_messages(
    channel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir les messages épinglés d'un canal"""
    from ..models import PinnedMessage, Message as MessageModel
    from sqlalchemy.orm import joinedload
    
    pinned_messages = db.query(MessageModel).join(
        PinnedMessage,
        PinnedMessage.message_id == MessageModel.id
    ).options(
        joinedload(MessageModel.sender)
    ).filter(
        PinnedMessage.channel_id == channel_id
    ).order_by(PinnedMessage.pinned_at.desc()).all()
    
    return pinned_messages



