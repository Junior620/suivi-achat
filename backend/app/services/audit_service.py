"""
Service pour gérer les logs d'audit
"""
from sqlalchemy.orm import Session
from ..models import AuditLog, User
from typing import Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """Service pour enregistrer et consulter les logs d'audit"""
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user: Optional[User] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None
    ) -> AuditLog:
        """
        Enregistrer une action dans le journal d'audit
        
        Args:
            action: Type d'action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
            entity_type: Type d'entité (Planter, Delivery, Payment, etc.)
            entity_id: ID de l'entité
            user: Utilisateur qui effectue l'action
            changes: Dictionnaire des changements effectués
            ip_address: Adresse IP de l'utilisateur
            user_agent: User agent du navigateur
            reason: Raison de l'action (optionnel)
        """
        try:
            audit_log = AuditLog(
                user_id=user.id if user else None,
                user_email=user.email if user else "system",
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else None,
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent,
                reason=reason
            )
            
            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)
            
            logger.info(f"Audit log created: {action} {entity_type} by {user.email if user else 'system'}")
            return audit_log
            
        except Exception as e:
            logger.error(f"Error creating audit log: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def log_create(
        db: Session,
        entity_type: str,
        entity_id: str,
        entity_data: Dict[str, Any],
        user: Optional[User] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Logger une création d'entité"""
        return AuditService.log_action(
            db=db,
            action="CREATE",
            entity_type=entity_type,
            entity_id=entity_id,
            user=user,
            changes={"new": entity_data},
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def log_update(
        db: Session,
        entity_type: str,
        entity_id: str,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        user: Optional[User] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Logger une modification d'entité"""
        # Calculer les différences
        changes = {
            "old": old_data,
            "new": new_data,
            "diff": {}
        }
        
        for key in new_data:
            if key in old_data and old_data[key] != new_data[key]:
                changes["diff"][key] = {
                    "from": old_data[key],
                    "to": new_data[key]
                }
        
        return AuditService.log_action(
            db=db,
            action="UPDATE",
            entity_type=entity_type,
            entity_id=entity_id,
            user=user,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def log_delete(
        db: Session,
        entity_type: str,
        entity_id: str,
        entity_data: Dict[str, Any],
        user: Optional[User] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Logger une suppression d'entité"""
        return AuditService.log_action(
            db=db,
            action="DELETE",
            entity_type=entity_type,
            entity_id=entity_id,
            user=user,
            changes={"deleted": entity_data},
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def log_login(
        db: Session,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True
    ):
        """Logger une connexion"""
        return AuditService.log_action(
            db=db,
            action="LOGIN_SUCCESS" if success else "LOGIN_FAILED",
            entity_type="User",
            entity_id=str(user.id) if user else None,
            user=user,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def log_logout(
        db: Session,
        user: User,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Logger une déconnexion"""
        return AuditService.log_action(
            db=db,
            action="LOGOUT",
            entity_type="User",
            entity_id=str(user.id),
            user=user,
            ip_address=ip_address,
            user_agent=user_agent
        )
