"""Routes API pour les fonctionnalités avancées de messagerie:
- Réactions emoji
- Recherche de messages
- Notifications push
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models import User
from ..models.messaging import Message, MessageReaction, PushSubscription, Channel, DirectConversation
from ..middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/messaging", tags=["messaging-features"])


# ============================================
# SCHEMAS
# ============================================

class ReactionCreate(BaseModel):
    emoji: str

class ReactionResponse(BaseModel):
    id: UUID
    message_id: UUID
    user_id: UUID
    emoji: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageSearchQuery(BaseModel):
    query: str
    channel_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    limit: int = 50

class MessageSearchResult(BaseModel):
    id: UUID
    content: str
    sender_id: UUID
    sender_email: str
    channel_id: Optional[UUID]
    conversation_id: Optional[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str
    user_agent: Optional[str] = None

class PushSubscriptionResponse(BaseModel):
    id: UUID
    endpoint: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# RÉACTIONS EMOJI
# ============================================

@router.post("/messages/{message_id}/reactions", response_model=ReactionResponse)
async def add_reaction(
    message_id: UUID,
    reaction: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ajouter une réaction emoji à un message"""
    # Vérifier que le message existe
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Vérifier si l'utilisateur a déjà réagi avec cet emoji
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == reaction.emoji
    ).first()
    
    if existing:
        # Supprimer la réaction existante (toggle)
        db.delete(existing)
        db.commit()
        raise HTTPException(status_code=204, detail="Réaction supprimée")
    
    # Créer la nouvelle réaction
    new_reaction = MessageReaction(
        message_id=message_id,
        user_id=current_user.id,
        emoji=reaction.emoji
    )
    db.add(new_reaction)
    db.commit()
    db.refresh(new_reaction)
    
    return new_reaction


@router.get("/messages/{message_id}/reactions", response_model=List[ReactionResponse])
async def get_message_reactions(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les réactions d'un message"""
    reactions = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id
    ).all()
    
    return reactions


@router.delete("/messages/{message_id}/reactions/{reaction_id}")
async def delete_reaction(
    message_id: UUID,
    reaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer une réaction"""
    reaction = db.query(MessageReaction).filter(
        MessageReaction.id == reaction_id,
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id
    ).first()
    
    if not reaction:
        raise HTTPException(status_code=404, detail="Réaction non trouvée")
    
    db.delete(reaction)
    db.commit()
    
    return {"message": "Réaction supprimée"}


# ============================================
# RECHERCHE DE MESSAGES
# ============================================

@router.get("/messages/search", response_model=List[MessageSearchResult])
async def search_messages(
    q: str = Query(..., min_length=2, description="Terme de recherche"),
    channel_id: Optional[UUID] = Query(None, description="Filtrer par canal"),
    conversation_id: Optional[UUID] = Query(None, description="Filtrer par conversation"),
    limit: int = Query(50, le=100, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rechercher des messages par contenu"""
    # Construire la requête de base
    query = db.query(Message).filter(
        Message.deleted_at.is_(None),
        Message.content.ilike(f"%{q}%")
    )
    
    # Filtrer par canal ou conversation
    if channel_id:
        # Vérifier que l'utilisateur est membre du canal
        from ..models.messaging import ChannelMember
        is_member = db.query(ChannelMember).filter(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == current_user.id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Accès refusé à ce canal")
        
        query = query.filter(Message.channel_id == channel_id)
    
    elif conversation_id:
        # Vérifier que l'utilisateur fait partie de la conversation
        conversation = db.query(DirectConversation).filter(
            DirectConversation.id == conversation_id,
            or_(
                DirectConversation.user1_id == current_user.id,
                DirectConversation.user2_id == current_user.id
            )
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=403, detail="Accès refusé à cette conversation")
        
        query = query.filter(Message.conversation_id == conversation_id)
    
    else:
        # Rechercher dans tous les canaux/conversations de l'utilisateur
        from ..models.messaging import ChannelMember
        
        user_channel_ids = db.query(ChannelMember.channel_id).filter(
            ChannelMember.user_id == current_user.id
        ).subquery()
        
        user_conversation_ids = db.query(DirectConversation.id).filter(
            or_(
                DirectConversation.user1_id == current_user.id,
                DirectConversation.user2_id == current_user.id
            )
        ).subquery()
        
        query = query.filter(
            or_(
                Message.channel_id.in_(user_channel_ids),
                Message.conversation_id.in_(user_conversation_ids)
            )
        )
    
    # Trier par pertinence (date décroissante)
    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    
    # Formater les résultats
    results = []
    for msg in messages:
        results.append({
            "id": msg.id,
            "content": msg.content,
            "sender_id": msg.sender_id,
            "sender_email": msg.sender.email if msg.sender else "Inconnu",
            "channel_id": msg.channel_id,
            "conversation_id": msg.conversation_id,
            "created_at": msg.created_at
        })
    
    return results


# ============================================
# NOTIFICATIONS PUSH
# ============================================

@router.post("/push/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_push(
    subscription: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """S'abonner aux notifications push"""
    # Vérifier si une souscription existe déjà pour cet endpoint
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()
    
    if existing:
        # Mettre à jour l'utilisateur et les clés
        existing.user_id = current_user.id
        existing.p256dh_key = subscription.p256dh_key
        existing.auth_key = subscription.auth_key
        existing.user_agent = subscription.user_agent
        existing.last_used_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Créer une nouvelle souscription
    new_subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        p256dh_key=subscription.p256dh_key,
        auth_key=subscription.auth_key,
        user_agent=subscription.user_agent
    )
    db.add(new_subscription)
    db.commit()
    db.refresh(new_subscription)
    
    return new_subscription


@router.delete("/push/unsubscribe")
async def unsubscribe_push(
    endpoint: str = Query(..., description="Endpoint de la souscription"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Se désabonner des notifications push"""
    subscription = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Souscription non trouvée")
    
    db.delete(subscription)
    db.commit()
    
    return {"message": "Désabonnement réussi"}


@router.get("/push/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_push_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les souscriptions push de l'utilisateur"""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).all()
    
    return subscriptions


# ============================================
# STATISTIQUES
# ============================================

@router.get("/stats/reactions")
async def get_reaction_stats(
    channel_id: Optional[UUID] = Query(None),
    conversation_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Statistiques sur les réactions les plus utilisées"""
    query = db.query(
        MessageReaction.emoji,
        func.count(MessageReaction.id).label('count')
    )
    
    if channel_id:
        query = query.join(Message).filter(Message.channel_id == channel_id)
    elif conversation_id:
        query = query.join(Message).filter(Message.conversation_id == conversation_id)
    
    stats = query.group_by(MessageReaction.emoji).order_by(func.count(MessageReaction.id).desc()).limit(10).all()
    
    return [{"emoji": emoji, "count": count} for emoji, count in stats]
