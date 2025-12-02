from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json
from typing import AsyncGenerator
from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.user import User
from ..services import notification_service

router = APIRouter(prefix="/sse", tags=["sse"])

# Dictionnaire pour stocker les connexions actives par user_id
active_connections: dict[str, list[asyncio.Queue]] = {}
MAX_CONNECTIONS_PER_USER = 3  # Limiter les connexions par utilisateur

async def event_generator(user_id: str, db: Session) -> AsyncGenerator[str, None]:
    """Générateur d'événements SSE pour un utilisateur"""
    queue: asyncio.Queue = asyncio.Queue(maxsize=10)  # Limiter la taille de la queue
    
    # Ajouter cette connexion à la liste des connexions actives
    if user_id not in active_connections:
        active_connections[user_id] = []
    
    # Limiter le nombre de connexions par utilisateur
    if len(active_connections[user_id]) >= MAX_CONNECTIONS_PER_USER:
        # Fermer la plus ancienne connexion
        old_queue = active_connections[user_id].pop(0)
        try:
            await old_queue.put({'type': 'disconnect', 'reason': 'max_connections'})
        except:
            pass
    
    active_connections[user_id].append(queue)
    
    try:
        # Envoyer un message de connexion initial
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to notification stream'})}\n\n"
        
        # Boucle avec timeout pour éviter les connexions infinies
        max_duration = 3600  # 1 heure maximum
        start_time = asyncio.get_event_loop().time()
        
        while True:
            # Vérifier le timeout global
            if asyncio.get_event_loop().time() - start_time > max_duration:
                yield f"data: {json.dumps({'type': 'disconnect', 'reason': 'timeout'})}\n\n"
                break
            
            # Attendre un événement dans la queue
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                if event.get('type') == 'disconnect':
                    break
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Envoyer un ping toutes les 30 secondes pour maintenir la connexion
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        # Nettoyer la connexion
        if user_id in active_connections:
            active_connections[user_id].remove(queue)
            if not active_connections[user_id]:
                del active_connections[user_id]

@router.get("/notifications")
async def notification_stream(
    token: str,
    db: Session = Depends(get_db)
):
    """Stream SSE pour les notifications en temps réel"""
    # Valider le token manuellement car EventSource ne supporte pas les headers
    from ..utils.security import decode_token
    from jose import JWTError
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("Invalid token")
        
        # Vérifier que l'utilisateur existe
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise JWTError("User not found")
        
        return StreamingResponse(
            event_generator(str(user.id), db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except JWTError:
        return StreamingResponse(
            iter(["data: {\"error\": \"Unauthorized\"}\n\n"]),
            media_type="text/event-stream",
            status_code=401
        )

async def broadcast_notification(user_id: str, notification_data: dict):
    """Envoyer une notification à un utilisateur spécifique"""
    if user_id in active_connections:
        for queue in active_connections[user_id]:
            await queue.put({
                'type': 'notification',
                'data': notification_data
            })

async def broadcast_to_roles(db: Session, roles: list[str], notification_data: dict):
    """Envoyer une notification à tous les utilisateurs avec certains rôles"""
    from ..models.user import User
    users = db.query(User).filter(User.role.in_(roles)).all()
    
    for user in users:
        await broadcast_notification(str(user.id), notification_data)
