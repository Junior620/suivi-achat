from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import JWTError
from datetime import datetime, timedelta
from ..database import get_db
from ..schemas import LoginRequest, TokenResponse, RefreshRequest, UserResponse, UserCreate
from ..services import auth_service
from ..middleware.auth import get_current_user
from ..utils.security import decode_token
from ..models import User
from ..models.session import Session as SessionModel

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, login_data)
    tokens = auth_service.generate_tokens(user)
    
    # Créer un enregistrement de session
    try:
        # Vérifier si une session existe déjà avec ce token
        existing_session = db.query(SessionModel).filter(
            SessionModel.session_token == tokens['access_token'][:50]
        ).first()
        
        if existing_session:
            # Mettre à jour la session existante
            existing_session.last_activity = datetime.utcnow()
            existing_session.expires_at = datetime.utcnow() + timedelta(days=7)
            existing_session.is_active = True
            existing_session.ip_address = request.client.host if request.client else None
            existing_session.user_agent = request.headers.get('user-agent', 'Unknown')
        else:
            # Créer une nouvelle session
            session = SessionModel(
                user_id=user.id,  # UUID directement, pas de conversion string
                session_token=tokens['access_token'][:50],
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get('user-agent', 'Unknown'),
                expires_at=datetime.utcnow() + timedelta(days=7),
                is_active=True,
                last_activity=datetime.utcnow()
            )
            db.add(session)
        db.commit()
    except Exception as e:
        print(f"Error creating session record: {e}")
        db.rollback()
        # Ne pas bloquer le login si la création de session échoue
    
    # Enregistrer la connexion dans l'audit
    try:
        from ..services.audit_service import AuditService
        AuditService.log_login(
            db=db,
            user=user,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent'),
            success=True
        )
    except Exception as e:
        print(f"Error logging audit: {e}")
    
    return TokenResponse(**tokens)

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Public registration - always creates viewer role
    user_data.role = "viewer"
    user = auth_service.create_user(db, user_data)
    return user

@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_data: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        tokens = auth_service.generate_tokens(user)
        return TokenResponse(**tokens)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/sessions")
def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les sessions actives de l'utilisateur"""
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_active == True
    ).order_by(SessionModel.last_activity.desc()).all()
    
    return [{
        "id": s.id,
        "ip_address": s.ip_address,
        "user_agent": s.user_agent,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "last_activity": s.last_activity.isoformat() if s.last_activity else None,
        "is_current": False  # À améliorer avec le token actuel
    } for s in sessions]


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Révoquer une session spécifique"""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    session.is_active = False
    db.commit()
    
    return {"message": "Session révoquée"}


@router.post("/logout-all")
def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Déconnecter toutes les sessions de l'utilisateur"""
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_active == True
    ).all()
    
    count = len(sessions)
    for session in sessions:
        session.is_active = False
    
    db.commit()
    
    return {"message": f"{count} session(s) déconnectée(s)"}


@router.get("/admin/sessions")
def get_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les sessions actives (admin/superadmin uniquement)"""
    if current_user.role not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    try:
        # Jointure avec la table users pour récupérer email et nom
        sessions = db.query(SessionModel, User).outerjoin(
            User, SessionModel.user_id == User.id
        ).filter(
            SessionModel.is_active == True
        ).order_by(SessionModel.last_activity.desc()).all()
        
        return [{
            "id": s.id,
            "user_id": str(s.user_id) if s.user_id else None,
            "user_email": u.email if u else "Utilisateur supprimé",
            "user_role": u.role if u else "unknown",
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_activity": s.last_activity.isoformat() if s.last_activity else None
        } for s, u in sessions]
    except Exception as e:
        print(f"Error fetching admin sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.delete("/admin/sessions/{session_id}")
def admin_revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Révoquer une session (admin/superadmin uniquement)"""
    if current_user.role not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    session.is_active = False
    db.commit()
    
    return {"message": "Session révoquée"}

