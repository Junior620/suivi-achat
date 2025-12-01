from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.session import Session as SessionModel
from ..models.user import User
import secrets


class SessionService:
    
    @staticmethod
    def create_session(
        db: Session, 
        user_id: str, 
        user_agent: str = None, 
        ip_address: str = None,
        expires_days: int = 7
    ) -> SessionModel:
        """Créer une nouvelle session"""
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        session = SessionModel(
            user_id=user_id,
            session_token=session_token,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=expires_at
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return session
    
    @staticmethod
    def get_session(db: Session, session_token: str) -> SessionModel:
        """Récupérer une session par token"""
        return db.query(SessionModel).filter(
            SessionModel.session_token == session_token,
            SessionModel.is_active == True,
            SessionModel.expires_at > datetime.utcnow()
        ).first()
    
    @staticmethod
    def update_activity(db: Session, session_token: str):
        """Mettre à jour la dernière activité"""
        session = db.query(SessionModel).filter(
            SessionModel.session_token == session_token
        ).first()
        
        if session:
            session.last_activity = datetime.utcnow()
            db.commit()
    
    @staticmethod
    def revoke_session(db: Session, session_token: str):
        """Révoquer une session (logout)"""
        session = db.query(SessionModel).filter(
            SessionModel.session_token == session_token
        ).first()
        
        if session:
            session.is_active = False
            db.commit()
    
    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: str):
        """Révoquer toutes les sessions d'un utilisateur"""
        db.query(SessionModel).filter(
            SessionModel.user_id == user_id,
            SessionModel.is_active == True
        ).update({"is_active": False})
        db.commit()
    
    @staticmethod
    def get_user_sessions(db: Session, user_id: str):
        """Récupérer toutes les sessions actives d'un utilisateur"""
        return db.query(SessionModel).filter(
            SessionModel.user_id == user_id,
            SessionModel.is_active == True,
            SessionModel.expires_at > datetime.utcnow()
        ).order_by(SessionModel.last_activity.desc()).all()
    
    @staticmethod
    def cleanup_expired_sessions(db: Session):
        """Nettoyer les sessions expirées"""
        db.query(SessionModel).filter(
            SessionModel.expires_at < datetime.utcnow()
        ).delete()
        db.commit()
