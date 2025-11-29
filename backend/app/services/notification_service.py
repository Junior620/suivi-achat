from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from uuid import UUID
from typing import List, Optional
import asyncio
from ..models.notification import Notification
from ..models.user import User
from ..schemas.notification import NotificationCreate, NotificationResponse, NotificationStats

def create_notification(db: Session, notification_data: NotificationCreate) -> Notification:
    """Créer une notification"""
    notification = Notification(**notification_data.model_dump())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def create_action_notification(
    db: Session,
    action: str,
    entity_type: str,
    entity_name: str,
    entity_id: UUID,
    action_by_id: UUID,
    target_roles: List[str] = None
):
    """Créer une notification d'action pour les rôles spécifiés"""
    if target_roles is None:
        target_roles = ['admin']
    
    # Récupérer l'utilisateur qui a fait l'action
    actor = db.query(User).filter(User.id == action_by_id).first()
    actor_email = actor.email if actor else "Utilisateur"
    
    # Messages selon l'action
    action_messages = {
        'create': f"a créé {entity_type} '{entity_name}'",
        'update': f"a modifié {entity_type} '{entity_name}'",
        'delete': f"a supprimé {entity_type} '{entity_name}'",
        'delivery': f"a ajouté une livraison pour {entity_type} '{entity_name}'"
    }
    
    title = f"Nouvelle action: {action}"
    message = f"{actor_email} {action_messages.get(action, f'a effectué une action sur {entity_type} {entity_name}')}"
    
    # Créer une notification pour chaque utilisateur avec le rôle approprié
    users = db.query(User).filter(User.role.in_(target_roles), User.id != action_by_id).all()
    
    for user in users:
        notification_data = NotificationCreate(
            user_id=user.id,
            type='action',
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_by=action_by_id
        )
        notif = create_notification(db, notification_data)
        
        # Envoyer en temps réel via SSE
        _send_sse_notification(user.id, notif, actor_email)

def create_alert_notification(
    db: Session,
    title: str,
    message: str,
    entity_type: str,
    entity_id: UUID,
    target_roles: List[str] = None
):
    """Créer une notification d'alerte (limite atteinte, etc.)"""
    if target_roles is None:
        target_roles = ['admin', 'manager']
    
    users = db.query(User).filter(User.role.in_(target_roles)).all()
    
    for user in users:
        notification_data = NotificationCreate(
            user_id=user.id,
            type='alert',
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id
        )
        notif = create_notification(db, notification_data)
        
        # Envoyer en temps réel via SSE
        _send_sse_notification(user.id, notif, None)

def get_user_notifications(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False
) -> List[NotificationResponse]:
    """Récupérer les notifications d'un utilisateur"""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    
    # Ajouter l'email de l'acteur
    result = []
    for notif in notifications:
        notif_dict = NotificationResponse.model_validate(notif).model_dump()
        if notif.action_by:
            actor = db.query(User).filter(User.id == notif.action_by).first()
            notif_dict['actor_email'] = actor.email if actor else None
        result.append(NotificationResponse(**notif_dict))
    
    return result

def get_notification_stats(db: Session, user_id: UUID) -> NotificationStats:
    """Obtenir les statistiques de notifications"""
    total = db.query(Notification).filter(Notification.user_id == user_id).count()
    unread = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
    
    return NotificationStats(total=total, unread=unread)

def mark_as_read(db: Session, notification_id: UUID, user_id: UUID) -> Optional[Notification]:
    """Marquer une notification comme lue"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if notification and not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
    
    return notification

def mark_all_as_read(db: Session, user_id: UUID) -> int:
    """Marquer toutes les notifications comme lues"""
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({
        'is_read': True,
        'read_at': datetime.utcnow()
    })
    db.commit()
    return count

def delete_notification(db: Session, notification_id: UUID, user_id: UUID) -> bool:
    """Supprimer une notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    
    if notification:
        db.delete(notification)
        db.commit()
        return True
    return False

def _send_sse_notification(user_id: UUID, notification: Notification, actor_email: Optional[str]):
    """Envoyer une notification via SSE (non-bloquant)"""
    try:
        from ..routers.sse import broadcast_notification
        
        notification_data = {
            'id': str(notification.id),
            'type': notification.type,
            'title': notification.title,
            'message': notification.message,
            'entity_type': notification.entity_type,
            'entity_id': str(notification.entity_id) if notification.entity_id else None,
            'actor_email': actor_email,
            'is_read': notification.is_read,
            'created_at': notification.created_at.isoformat()
        }
        
        # Créer une tâche asyncio pour envoyer la notification
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # Si pas de loop, on ne peut pas envoyer en temps réel
            return
        
        if loop.is_running():
            asyncio.create_task(broadcast_notification(str(user_id), notification_data))
    except Exception as e:
        # Ne pas bloquer si l'envoi SSE échoue
        print(f"Erreur lors de l'envoi SSE: {e}")
