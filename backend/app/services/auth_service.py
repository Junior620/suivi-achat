from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models import User
from ..schemas import LoginRequest, UserCreate
from ..utils.security import hash_password, verify_password, create_access_token, create_refresh_token

def authenticate_user(db: Session, login_data: LoginRequest) -> User:
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    return user

def create_user(db: Session, user_data: UserCreate) -> User:
    if user_data.role not in ["admin", "manager", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def generate_tokens(user: User) -> dict:
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return {"access_token": access_token, "refresh_token": refresh_token}
