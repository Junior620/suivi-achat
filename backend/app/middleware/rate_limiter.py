"""
Rate Limiter Middleware - Protection contre les abus
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio
import hashlib
import logging

logger = logging.getLogger(__name__)


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Trop de requêtes. Veuillez réessayer plus tard.",
                "retry_after": retry_after
            }
        )


class RateLimiter:
    """
    Rate limiter en mémoire avec différentes limites par endpoint
    """
    
    def __init__(self):
        # Stockage des requêtes: {client_key: [(timestamp, endpoint), ...]}
        self.requests = defaultdict(list)
        # Stockage des blocages temporaires
        self.blocked = {}
        # Lock pour thread safety
        self.lock = asyncio.Lock()
        
        # Configuration des limites par type d'endpoint
        self.limits = {
            # Auth endpoints - plus restrictifs
            "auth": {"requests": 10, "window": 60, "block_duration": 300},
            # API lecture - modéré
            "read": {"requests": 100, "window": 60, "block_duration": 60},
            # API écriture - plus restrictif
            "write": {"requests": 30, "window": 60, "block_duration": 120},
            # Upload fichiers - très restrictif
            "upload": {"requests": 10, "window": 60, "block_duration": 300},
            # WebSocket - permissif
            "websocket": {"requests": 200, "window": 60, "block_duration": 30},
            # Default
            "default": {"requests": 60, "window": 60, "block_duration": 60}
        }
    
    def _get_client_key(self, request: Request) -> str:
        """Génère une clé unique pour le client"""
        # Utiliser X-Forwarded-For si derrière un proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        # Ajouter le user-agent pour différencier les clients
        user_agent = request.headers.get("User-Agent", "")[:50]
        
        # Hash pour anonymiser
        key = f"{ip}:{user_agent}"
        return hashlib.md5(key.encode()).hexdigest()[:16]
    
    def _get_endpoint_type(self, path: str, method: str) -> str:
        """Détermine le type d'endpoint pour appliquer les bonnes limites"""
        path_lower = path.lower()
        
        # Auth endpoints
        if "/auth/" in path_lower or "/login" in path_lower or "/register" in path_lower:
            return "auth"
        
        # Upload endpoints
        if "/upload" in path_lower or "/files" in path_lower:
            return "upload"
        
        # WebSocket
        if "/ws" in path_lower:
            return "websocket"
        
        # Write operations
        if method in ["POST", "PUT", "PATCH", "DELETE"]:
            return "write"
        
        # Read operations
        return "read"
    
    async def is_allowed(self, request: Request) -> tuple[bool, dict]:
        """
        Vérifie si la requête est autorisée
        Retourne (allowed, info)
        """
        client_key = self._get_client_key(request)
        endpoint_type = self._get_endpoint_type(request.url.path, request.method)
        limit_config = self.limits.get(endpoint_type, self.limits["default"])
        
        now = datetime.now()
        
        async with self.lock:
            # Vérifier si le client est bloqué
            if client_key in self.blocked:
                block_until = self.blocked[client_key]
                if now < block_until:
                    retry_after = int((block_until - now).total_seconds())
                    return False, {
                        "blocked": True,
                        "retry_after": retry_after,
                        "reason": "temporarily_blocked"
                    }
                else:
                    del self.blocked[client_key]
            
            # Nettoyer les anciennes requêtes
            window_start = now - timedelta(seconds=limit_config["window"])
            self.requests[client_key] = [
                (ts, ep) for ts, ep in self.requests[client_key]
                if ts > window_start
            ]
            
            # Compter les requêtes pour ce type d'endpoint
            endpoint_requests = [
                (ts, ep) for ts, ep in self.requests[client_key]
                if self._get_endpoint_type(ep, request.method) == endpoint_type
            ]
            
            current_count = len(endpoint_requests)
            
            if current_count >= limit_config["requests"]:
                # Bloquer le client
                self.blocked[client_key] = now + timedelta(seconds=limit_config["block_duration"])
                
                logger.warning(
                    f"Rate limit exceeded for {client_key} on {endpoint_type}",
                    extra={
                        "client_key": client_key,
                        "endpoint_type": endpoint_type,
                        "request_count": current_count,
                        "path": request.url.path
                    }
                )
                
                return False, {
                    "blocked": False,
                    "retry_after": limit_config["block_duration"],
                    "reason": "rate_limit_exceeded",
                    "limit": limit_config["requests"],
                    "window": limit_config["window"]
                }
            
            # Enregistrer la requête
            self.requests[client_key].append((now, request.url.path))
            
            return True, {
                "remaining": limit_config["requests"] - current_count - 1,
                "limit": limit_config["requests"],
                "reset": int((window_start + timedelta(seconds=limit_config["window"])).timestamp())
            }
    
    async def cleanup(self):
        """Nettoie les données expirées"""
        async with self.lock:
            now = datetime.now()
            
            # Nettoyer les blocages expirés
            expired_blocks = [k for k, v in self.blocked.items() if v < now]
            for k in expired_blocks:
                del self.blocked[k]
            
            # Nettoyer les requêtes anciennes (> 5 minutes)
            cutoff = now - timedelta(minutes=5)
            for client_key in list(self.requests.keys()):
                self.requests[client_key] = [
                    (ts, ep) for ts, ep in self.requests[client_key]
                    if ts > cutoff
                ]
                if not self.requests[client_key]:
                    del self.requests[client_key]


# Instance globale
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware FastAPI pour le rate limiting"""
    
    # Endpoints exemptés du rate limiting
    EXEMPT_PATHS = ["/health", "/docs", "/openapi.json", "/redoc"]
    
    async def dispatch(self, request: Request, call_next):
        # Ignorer certains endpoints
        if any(request.url.path.startswith(p) for p in self.EXEMPT_PATHS):
            return await call_next(request)
        
        # Vérifier le rate limit
        allowed, info = await rate_limiter.is_allowed(request)
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": {
                        "error": "rate_limit_exceeded",
                        "message": "Trop de requêtes. Veuillez réessayer plus tard.",
                        "retry_after": info.get("retry_after", 60)
                    }
                },
                headers={
                    "Retry-After": str(info.get("retry_after", 60)),
                    "X-RateLimit-Limit": str(info.get("limit", 60)),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Exécuter la requête
        response = await call_next(request)
        
        # Ajouter les headers de rate limit
        response.headers["X-RateLimit-Limit"] = str(info.get("limit", 60))
        response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", 0))
        response.headers["X-RateLimit-Reset"] = str(info.get("reset", 0))
        
        return response
