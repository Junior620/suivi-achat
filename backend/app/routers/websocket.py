"""WebSocket pour la messagerie en temps réel"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Set
from uuid import UUID
import json
import logging
from datetime import datetime

from ..database import get_db
from ..models import User
from ..services.messaging_service import MessagingService

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Gestionnaire de connexions WebSocket"""
    
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # channel_id -> Set[user_id]
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        # conversation_id -> Set[user_id]
        self.conversation_subscriptions: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Connecter un utilisateur"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"Utilisateur {user_id} connecté au WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Déconnecter un utilisateur"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Nettoyer les souscriptions
                for channel_id in list(self.channel_subscriptions.keys()):
                    self.channel_subscriptions[channel_id].discard(user_id)
                    if not self.channel_subscriptions[channel_id]:
                        del self.channel_subscriptions[channel_id]
                
                for conv_id in list(self.conversation_subscriptions.keys()):
                    self.conversation_subscriptions[conv_id].discard(user_id)
                    if not self.conversation_subscriptions[conv_id]:
                        del self.conversation_subscriptions[conv_id]
        
        logger.info(f"Utilisateur {user_id} déconnecté du WebSocket")
    
    def subscribe_to_channel(self, user_id: str, channel_id: str):
        """S'abonner à un canal"""
        if channel_id not in self.channel_subscriptions:
            self.channel_subscriptions[channel_id] = set()
        
        self.channel_subscriptions[channel_id].add(user_id)
        logger.info(f"Utilisateur {user_id} abonné au canal {channel_id}")
    
    def unsubscribe_from_channel(self, user_id: str, channel_id: str):
        """Se désabonner d'un canal"""
        if channel_id in self.channel_subscriptions:
            self.channel_subscriptions[channel_id].discard(user_id)
            
            if not self.channel_subscriptions[channel_id]:
                del self.channel_subscriptions[channel_id]
        
        logger.info(f"Utilisateur {user_id} désabonné du canal {channel_id}")
    
    def subscribe_to_conversation(self, user_id: str, conversation_id: str):
        """S'abonner à une conversation"""
        if conversation_id not in self.conversation_subscriptions:
            self.conversation_subscriptions[conversation_id] = set()
        
        self.conversation_subscriptions[conversation_id].add(user_id)
        logger.info(f"Utilisateur {user_id} abonné à la conversation {conversation_id}")
    
    def unsubscribe_from_conversation(self, user_id: str, conversation_id: str):
        """Se désabonner d'une conversation"""
        if conversation_id in self.conversation_subscriptions:
            self.conversation_subscriptions[conversation_id].discard(user_id)
            
            if not self.conversation_subscriptions[conversation_id]:
                del self.conversation_subscriptions[conversation_id]
        
        logger.info(f"Utilisateur {user_id} désabonné de la conversation {conversation_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Envoyer un message à un utilisateur spécifique"""
        if user_id in self.active_connections:
            disconnected = set()
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Erreur lors de l'envoi à {user_id}: {e}")
                    disconnected.add(connection)
            
            # Nettoyer les connexions mortes
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)
    
    async def broadcast_to_channel(self, message: dict, channel_id: str, exclude_user: str = None):
        """Diffuser un message à tous les membres d'un canal"""
        if channel_id in self.channel_subscriptions:
            for user_id in self.channel_subscriptions[channel_id]:
                if user_id != exclude_user:
                    await self.send_personal_message(message, user_id)
    
    async def broadcast_to_conversation(self, message: dict, conversation_id: str, exclude_user: str = None):
        """Diffuser un message aux participants d'une conversation"""
        if conversation_id in self.conversation_subscriptions:
            for user_id in self.conversation_subscriptions[conversation_id]:
                if user_id != exclude_user:
                    await self.send_personal_message(message, user_id)
    
    async def broadcast_user_status(self, user_id: str, status: str):
        """Diffuser le statut d'un utilisateur à tous ses contacts"""
        message = {
            "type": "user_status",
            "data": {
                "user_id": user_id,
                "status": status,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Envoyer à tous les utilisateurs connectés (simplifié)
        for uid in list(self.active_connections.keys()):
            if uid != user_id:
                await self.send_personal_message(message, uid)


manager = ConnectionManager()


async def get_current_user_ws(
    token: str = Query(None),
    authorization: str = Query(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """Authentifier l'utilisateur via le token WebSocket
    
    Supporte deux méthodes:
    1. Query param: ?token=xxx (pour compatibilité)
    2. Query param: ?Authorization=Bearer xxx (plus sécurisé)
    """
    from ..utils.security import decode_token
    from fastapi import HTTPException, status
    
    # Extraire le token
    actual_token = None
    
    if authorization:
        # Format: "Bearer xxx"
        if authorization.startswith("Bearer "):
            actual_token = authorization[7:]
        else:
            actual_token = authorization
    elif token:
        actual_token = token
    
    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant. Utilisez ?token=xxx ou ?Authorization=Bearer xxx"
        )
    
    try:
        payload = decode_token(actual_token)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide"
            )
        
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilisateur non trouvé"
            )
        
        return user
    except Exception as e:
        logger.error(f"Erreur d'authentification WebSocket: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification échouée"
        )


@router.websocket("/ws/messaging")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
    authorization: str = Query(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Endpoint WebSocket pour la messagerie en temps réel
    
    Authentification:
    - Méthode 1 (legacy): ws://host/ws/messaging?token=xxx
    - Méthode 2 (recommandée): ws://host/ws/messaging?Authorization=Bearer xxx
    """
    try:
        # Authentifier l'utilisateur
        user = await get_current_user_ws(token, authorization, db)
        user_id = str(user.id)
        
        # Connecter l'utilisateur
        await manager.connect(websocket, user_id)
        
        # Mettre à jour le statut en ligne
        MessagingService.update_user_status(db, user.id, 'online')
        await manager.broadcast_user_status(user_id, 'online')
        
        try:
            while True:
                # Recevoir les messages du client
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "subscribe_channel":
                    # S'abonner à un canal
                    channel_id = data.get("channel_id")
                    if channel_id:
                        manager.subscribe_to_channel(user_id, channel_id)
                        await websocket.send_json({
                            "type": "subscribed",
                            "data": {"channel_id": channel_id}
                        })
                
                elif message_type == "unsubscribe_channel":
                    # Se désabonner d'un canal
                    channel_id = data.get("channel_id")
                    if channel_id:
                        manager.unsubscribe_from_channel(user_id, channel_id)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "data": {"channel_id": channel_id}
                        })
                
                elif message_type == "subscribe_conversation":
                    # S'abonner à une conversation
                    conversation_id = data.get("conversation_id")
                    if conversation_id:
                        manager.subscribe_to_conversation(user_id, conversation_id)
                        await websocket.send_json({
                            "type": "subscribed",
                            "data": {"conversation_id": conversation_id}
                        })
                
                elif message_type == "unsubscribe_conversation":
                    # Se désabonner d'une conversation
                    conversation_id = data.get("conversation_id")
                    if conversation_id:
                        manager.unsubscribe_from_conversation(user_id, conversation_id)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "data": {"conversation_id": conversation_id}
                        })
                
                elif message_type == "typing":
                    # Indicateur de frappe
                    channel_id = data.get("channel_id")
                    conversation_id = data.get("conversation_id")
                    is_typing = data.get("is_typing", False)
                    
                    typing_message = {
                        "type": "typing",
                        "data": {
                            "user_id": user_id,
                            "is_typing": is_typing,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                    
                    if channel_id:
                        typing_message["data"]["channel_id"] = channel_id
                        await manager.broadcast_to_channel(
                            typing_message, channel_id, exclude_user=user_id
                        )
                    elif conversation_id:
                        typing_message["data"]["conversation_id"] = conversation_id
                        await manager.broadcast_to_conversation(
                            typing_message, conversation_id, exclude_user=user_id
                        )
                
                elif message_type == "new_message":
                    # Nouveau message (diffuser aux autres)
                    message_data = data.get("data", {})
                    channel_id = message_data.get("channel_id")
                    conversation_id = message_data.get("conversation_id")
                    
                    broadcast_message = {
                        "type": "new_message",
                        "data": message_data
                    }
                    
                    if channel_id:
                        await manager.broadcast_to_channel(
                            broadcast_message, channel_id, exclude_user=user_id
                        )
                    elif conversation_id:
                        await manager.broadcast_to_conversation(
                            broadcast_message, conversation_id, exclude_user=user_id
                        )
                
                elif message_type == "message_read":
                    # Message lu
                    message_id = data.get("message_id")
                    channel_id = data.get("channel_id")
                    conversation_id = data.get("conversation_id")
                    
                    read_message = {
                        "type": "message_read",
                        "data": {
                            "message_id": message_id,
                            "user_id": user_id,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                    
                    if channel_id:
                        await manager.broadcast_to_channel(read_message, channel_id)
                    elif conversation_id:
                        await manager.broadcast_to_conversation(read_message, conversation_id)
                
                elif message_type == "ping":
                    # Répondre au ping
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket déconnecté pour l'utilisateur {user_id}")
        
        finally:
            # Déconnecter et mettre à jour le statut
            manager.disconnect(websocket, user_id)
            MessagingService.update_user_status(db, user.id, 'offline')
            await manager.broadcast_user_status(user_id, 'offline')
    
    except Exception as e:
        logger.error(f"Erreur WebSocket: {e}")
        try:
            await websocket.close(code=1008)
        except:
            pass
