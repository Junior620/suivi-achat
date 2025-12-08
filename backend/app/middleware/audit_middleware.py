"""
Middleware pour l'audit automatique des requêtes
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from ..services.audit_service import AuditService
from ..database import SessionLocal
import json
import logging

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware pour enregistrer automatiquement les actions dans le journal d'audit"""
    
    # Méthodes HTTP à auditer
    AUDITED_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
    
    # Endpoints à exclure de l'audit
    EXCLUDED_PATHS = [
        "/docs",
        "/openapi.json",
        "/redoc",
        "/health",
        "/audit/logs",  # Éviter la récursion
        "/notifications",  # Trop fréquent
        "/ws/",  # WebSocket
    ]
    
    # Mapping des endpoints vers les types d'entités
    ENTITY_MAPPING = {
        "planters": "Planteur",
        "deliveries": "Livraison",
        "payments": "Paiement",
        "chef-planteurs": "Chef Planteur",
        "cooperatives": "Coopérative",
        "users": "Utilisateur",
        "warehouses": "Entrepôt",
        "documents": "Document",
        "collectes": "Collecte",
        "sessions": "Session",
        "auth": "Authentification",
        "messaging": "Message",
        "notifications": "Notification",
        "traceability": "Traçabilité",
        "analytics": "Analytique",
        "exports": "Export",
        "invoices": "Facture",
        "audit": "Audit",
    }
    
    async def dispatch(self, request: Request, call_next):
        # Vérifier si la requête doit être auditée
        if not self._should_audit(request):
            return await call_next(request)
        
        # Capturer le body de la requête si présent
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body = json.loads(body_bytes.decode())
                # Recréer le body pour que les endpoints puissent le lire
                async def receive():
                    return {"type": "http.request", "body": body_bytes}
                request._receive = receive
            except:
                pass
        
        # Exécuter la requête
        response = await call_next(request)
        
        # Enregistrer l'audit après une réponse réussie
        if 200 <= response.status_code < 300:
            try:
                self._log_audit(request, response, body)
            except Exception as e:
                logger.error(f"Error logging audit: {e}")
        
        return response
    
    def _should_audit(self, request: Request) -> bool:
        """Déterminer si la requête doit être auditée"""
        # Vérifier la méthode HTTP
        if request.method not in self.AUDITED_METHODS:
            return False
        
        # Vérifier les chemins exclus
        path = request.url.path
        for excluded in self.EXCLUDED_PATHS:
            if excluded in path:
                return False
        
        return True
    
    def _log_audit(self, request: Request, response: Response, body: dict = None):
        """Enregistrer l'action dans le journal d'audit"""
        db = SessionLocal()
        try:
            # Déterminer l'action
            action = self._get_action(request.method)
            
            # Déterminer le type d'entité et l'ID
            entity_type, entity_id = self._parse_entity(request.url.path)
            
            # Récupérer l'utilisateur depuis le state (ajouté par le middleware d'auth)
            user = getattr(request.state, "user", None)
            
            # Récupérer l'IP
            ip_address = request.client.host if request.client else None
            
            # Récupérer le user agent
            user_agent = request.headers.get("user-agent")
            
            # Préparer les changements
            changes = None
            if body:
                changes = {"data": body}
            
            # Enregistrer dans le journal d'audit
            AuditService.log_action(
                db=db,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                user=user,
                changes=changes,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
        except Exception as e:
            logger.error(f"Error in audit logging: {e}")
        finally:
            db.close()
    
    def _get_action(self, method: str) -> str:
        """Convertir la méthode HTTP en action d'audit"""
        mapping = {
            "POST": "CREATE",
            "PUT": "UPDATE",
            "PATCH": "UPDATE",
            "DELETE": "DELETE"
        }
        return mapping.get(method, method)
    
    def _parse_entity(self, path: str) -> tuple:
        """Parser le chemin pour extraire le type d'entité et l'ID"""
        # Enlever /api/v1 du début
        path = path.replace("/api/v1/", "")
        parts = path.strip("/").split("/")
        
        # Trouver le type d'entité
        entity_type = "Unknown"
        for endpoint, entity in self.ENTITY_MAPPING.items():
            if parts and parts[0] == endpoint:
                entity_type = entity
                break
        
        # Trouver l'ID (généralement le deuxième segment si c'est un UUID ou un nombre)
        entity_id = None
        if len(parts) > 1:
            # Vérifier le deuxième élément (après le nom de l'entité)
            if self._is_id(parts[1]):
                entity_id = parts[1]
            # Sinon vérifier le dernier élément
            elif self._is_id(parts[-1]):
                entity_id = parts[-1]
        
        return entity_type, entity_id
    
    def _is_id(self, value: str) -> bool:
        """Vérifier si une valeur ressemble à un ID"""
        # UUID pattern
        if len(value) == 36 and value.count("-") == 4:
            return True
        # Nombre
        if value.isdigit():
            return True
        return False
