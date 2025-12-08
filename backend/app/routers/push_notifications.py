from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models.push_subscription import PushSubscription
from ..routers.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/push", tags=["push-notifications"])

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict  # {p256dh: str, auth: str}
    user_agent: str = None

class PushSubscriptionResponse(BaseModel):
    id: str
    endpoint: str
    created_at: str
    
    class Config:
        from_attributes = True
        json_encoders = {
            'datetime': lambda v: v.isoformat() if v else None
        }
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            endpoint=obj.endpoint,
            created_at=obj.created_at.isoformat() if obj.created_at else None
        )

@router.post("/subscribe", response_model=PushSubscriptionResponse)
def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Enregistrer une souscription push"""
    try:
        # Vérifier si la souscription existe déjà
        existing = db.query(PushSubscription).filter(
            PushSubscription.endpoint == subscription.endpoint
        ).first()
        
        if existing:
            # Mettre à jour l'utilisateur si différent
            if existing.user_id != current_user.id:
                existing.user_id = current_user.id
                db.commit()
            return PushSubscriptionResponse.from_orm(existing)
        
        # Créer nouvelle souscription
        new_subscription = PushSubscription(
            user_id=current_user.id,
            endpoint=subscription.endpoint,
            p256dh=subscription.keys.get('p256dh'),
            auth=subscription.keys.get('auth'),
            user_agent=subscription.user_agent
        )
        
        db.add(new_subscription)
        db.commit()
        db.refresh(new_subscription)
        
        logger.info(f"Push subscription created for user {current_user.id}")
        return PushSubscriptionResponse.from_orm(new_subscription)
        
    except Exception as e:
        logger.error(f"Error creating push subscription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/unsubscribe")
def unsubscribe_from_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Désinscrire d'une souscription push"""
    try:
        subscription = db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == current_user.id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        db.delete(subscription)
        db.commit()
        
        return {"message": "Unsubscribed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unsubscribing: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
def get_user_subscriptions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtenir toutes les souscriptions de l'utilisateur"""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).all()
    
    return [PushSubscriptionResponse.from_orm(sub) for sub in subscriptions]
