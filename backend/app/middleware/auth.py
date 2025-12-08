from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import User
from ..models.session import Session as SessionModel
from ..utils.security import decode_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    request: Request = None
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    # Stocker l'utilisateur dans le request state pour le middleware d'audit
    if request:
        request.state.user = user
    
    # Vérifier si la session est toujours active (optionnel - ne bloque pas si pas trouvée)
    try:
        token_prefix = token[:50]
        # Chercher une session active pour cet utilisateur avec ce token
        session = db.query(SessionModel).filter(
            SessionModel.user_id == str(user_id),
            SessionModel.session_token == token_prefix,
            SessionModel.is_active == True
        ).first()
        
        if session:
            # Vérifier si la session est expirée
            if session.expires_at < datetime.utcnow():
                # Marquer comme inactive
                session.is_active = False
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Session has expired. Please login again."
                )
            
            # Mettre à jour la dernière activité
            session.last_activity = datetime.utcnow()
            db.commit()
        # Si pas de session trouvée, on laisse passer (pour compatibilité avec anciennes sessions)
    except HTTPException:
        raise
    except Exception as e:
        # En cas d'erreur de vérification de session, on laisse passer
        print(f"Session check error: {e}")
    
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
