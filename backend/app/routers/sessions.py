"""
Routes pour la gestion des sessions utilisateur
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import desc
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models import Session, User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/active")
async def get_active_sessions(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer toutes les sessions actives de l'utilisateur connecté
    """
    try:
        sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id),
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        ).order_by(desc(Session.last_activity)).all()
        
        return {
            "total": len(sessions),
            "sessions": [
                {
                    "id": session.id,
                    "user_agent": session.user_agent,
                    "ip_address": session.ip_address,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                    "expires_at": session.expires_at.isoformat() if session.expires_at else None
                }
                for session in sessions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching active sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
async def get_all_sessions(
    skip: int = 0,
    limit: int = 50,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer toutes les sessions de l'utilisateur (actives et inactives)
    """
    try:
        sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id)
        ).order_by(desc(Session.created_at)).offset(skip).limit(limit).all()
        
        total = db.query(Session).filter(
            Session.user_id == str(current_user.id)
        ).count()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "sessions": [
                {
                    "id": session.id,
                    "user_agent": session.user_agent,
                    "ip_address": session.ip_address,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                    "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                    "is_active": session.is_active
                }
                for session in sessions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching all sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def revoke_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Révoquer une session spécifique
    """
    try:
        session = db.query(Session).filter(
            Session.id == session_id,
            Session.user_id == str(current_user.id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.is_active = False
        db.commit()
        
        logger.info(f"Session {session_id} revoked by user {current_user.email}")
        
        return {"message": "Session revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking session: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/revoke-all")
async def revoke_all_sessions(
    except_current: bool = True,
    request: Request = None,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Révoquer toutes les sessions de l'utilisateur
    
    - except_current: Si True, garde la session actuelle active
    """
    try:
        query = db.query(Session).filter(
            Session.user_id == str(current_user.id),
            Session.is_active == True
        )
        
        # Si on veut garder la session actuelle
        if except_current and request:
            # Extraire le token de la requête
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                current_token = auth_header.split(" ")[1]
                query = query.filter(Session.session_token != current_token)
        
        count = query.update({"is_active": False})
        db.commit()
        
        logger.info(f"Revoked {count} sessions for user {current_user.email}")
        
        return {
            "message": f"{count} session(s) revoked successfully",
            "count": count
        }
        
    except Exception as e:
        logger.error(f"Error revoking all sessions: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_session_stats(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtenir les statistiques des sessions
    """
    try:
        total_sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id)
        ).count()
        
        active_sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id),
            Session.is_active == True,
            Session.expires_at > datetime.utcnow()
        ).count()
        
        expired_sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id),
            Session.expires_at <= datetime.utcnow()
        ).count()
        
        revoked_sessions = db.query(Session).filter(
            Session.user_id == str(current_user.id),
            Session.is_active == False
        ).count()
        
        return {
            "total": total_sessions,
            "active": active_sessions,
            "expired": expired_sessions,
            "revoked": revoked_sessions
        }
        
    except Exception as e:
        logger.error(f"Error fetching session stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/all")
async def admin_get_all_sessions(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    [Admin] Récupérer toutes les sessions de tous les utilisateurs
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    try:
        query = db.query(Session)
        
        if active_only:
            query = query.filter(
                Session.is_active == True,
                Session.expires_at > datetime.utcnow()
            )
        
        sessions = query.order_by(desc(Session.last_activity)).offset(skip).limit(limit).all()
        total = query.count()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "sessions": [
                {
                    "id": session.id,
                    "user_id": session.user_id,
                    "user_email": session.user.email if session.user else None,
                    "user_agent": session.user_agent,
                    "ip_address": session.ip_address,
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                    "expires_at": session.expires_at.isoformat() if session.expires_at else None,
                    "is_active": session.is_active
                }
                for session in sessions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching all sessions (admin): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/{session_id}")
async def admin_revoke_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    [Admin] Révoquer n'importe quelle session
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.is_active = False
        db.commit()
        
        logger.info(f"Session {session_id} revoked by admin {current_user.email}")
        
        return {"message": "Session revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking session (admin): {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
