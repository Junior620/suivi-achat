"""
Middleware pour l'audit automatique des requêtes - Version améliorée
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from ..services.audit_service import AuditService
from ..database import SessionLocal
import json
import logging
import time
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any

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
        
        # Mesurer le temps de réponse
        start_time = time.time()
        
        # Capturer le body de la requête si présent
        body = None
        body_bytes = b""
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
        
        # Calculer le temps de réponse
        response_time = time.time() - start_time
        
        # Enregistrer l'audit (succès et échecs importants)
        try:
            self._log_audit_enhanced(
                request=request,
                response=response,
                body=body,
                response_time=response_time,
                body_size=len(body_bytes)
            )
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
    
    def _log_audit_enhanced(
        self,
        request: Request,
        response: Response,
        body: dict = None,
        response_time: float = 0,
        body_size: int = 0
    ):
        """Enregistrer l'action dans le journal d'audit avec détails enrichis"""
        db = SessionLocal()
        try:
            # Déterminer l'action
            action = self._get_action(request.method)
            
            # Déterminer le type d'entité et l'ID
            entity_type, entity_id = self._parse_entity(request.url.path)
            
            # Récupérer l'utilisateur depuis le state
            user = getattr(request.state, "user", None)
            
            # Récupérer l'IP (avec support proxy)
            ip_address = self._get_client_ip(request)
            
            # Récupérer le user agent
            user_agent = request.headers.get("user-agent", "")[:500]
            
            # Préparer les changements enrichis
            changes = self._prepare_changes(
                body=body,
                request=request,
                response=response,
                response_time=response_time,
                body_size=body_size
            )
            
            # Déterminer le niveau de sévérité
            severity = self._get_severity(action, response.status_code, entity_type)
            
            # Ajouter la sévérité aux changements
            if changes:
                changes["_meta"] = {
                    "severity": severity,
                    "response_time_ms": round(response_time * 1000, 2),
                    "status_code": response.status_code,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
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
            
            # Log structuré pour Azure Application Insights
            self._log_to_insights(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                user=user,
                ip_address=ip_address,
                response_time=response_time,
                status_code=response.status_code,
                severity=severity
            )
            
        except Exception as e:
            logger.error(f"Error in audit logging: {e}")
        finally:
            db.close()
    
    def _get_client_ip(self, request: Request) -> str:
        """Récupérer l'IP du client avec support proxy"""
        # X-Forwarded-For pour les proxies
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # X-Real-IP pour nginx
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # IP directe
        return request.client.host if request.client else "unknown"
    
    def _prepare_changes(
        self,
        body: dict,
        request: Request,
        response: Response,
        response_time: float,
        body_size: int
    ) -> Optional[Dict[str, Any]]:
        """Préparer les changements avec masquage des données sensibles"""
        if not body:
            return None
        
        # Copier le body
        changes = {"data": self._mask_sensitive_data(body.copy())}
        
        # Ajouter des métadonnées
        changes["request"] = {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.query_params) if request.query_params else None,
            "body_size": body_size
        }
        
        return changes
    
    def _mask_sensitive_data(self, data: dict) -> dict:
        """Masquer les données sensibles dans les logs"""
        sensitive_fields = [
            "password", "mot_de_passe", "secret", "token",
            "api_key", "apikey", "credit_card", "carte",
            "cvv", "pin", "ssn", "cni"
        ]
        
        if isinstance(data, dict):
            masked = {}
            for key, value in data.items():
                key_lower = key.lower()
                if any(sf in key_lower for sf in sensitive_fields):
                    masked[key] = "***MASKED***"
                elif isinstance(value, dict):
                    masked[key] = self._mask_sensitive_data(value)
                elif isinstance(value, list):
                    masked[key] = [
                        self._mask_sensitive_data(item) if isinstance(item, dict) else item
                        for item in value
                    ]
                else:
                    masked[key] = value
            return masked
        return data
    
    def _get_severity(self, action: str, status_code: int, entity_type: str) -> str:
        """Déterminer le niveau de sévérité de l'action"""
        # Erreurs
        if status_code >= 400:
            return "error" if status_code >= 500 else "warning"
        
        # Actions critiques
        critical_entities = ["Utilisateur", "Session", "Authentification"]
        if entity_type in critical_entities:
            return "high"
        
        # Suppressions
        if action == "DELETE":
            return "high"
        
        # Modifications
        if action == "UPDATE":
            return "medium"
        
        # Créations
        return "low"
    
    def _log_to_insights(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        user: Any,
        ip_address: str,
        response_time: float,
        status_code: int,
        severity: str
    ):
        """Log structuré pour Azure Application Insights"""
        logger.info(
            f"AUDIT: {action} {entity_type}",
            extra={
                "custom_dimensions": {
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "user_id": str(user.id) if user else None,
                    "user_email": user.email if user else None,
                    "ip_address": ip_address,
                    "response_time_ms": round(response_time * 1000, 2),
                    "status_code": status_code,
                    "severity": severity,
                    "event_type": "audit_log"
                }
            }
        )
    
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
