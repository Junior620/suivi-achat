"""
Input Validator Middleware - Validation renforcée des entrées
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import re
import html
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class InputValidationError(HTTPException):
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "validation_error",
                "field": field,
                "message": message
            }
        )


class InputSanitizer:
    """Utilitaires de sanitization des entrées"""
    
    # Patterns dangereux
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)",
        r"(--|#|/\*|\*/)",
        r"(\bOR\b\s+\d+\s*=\s*\d+)",
        r"(\bAND\b\s+\d+\s*=\s*\d+)",
        r"(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
        r"<link[^>]*>",
        r"expression\s*\(",
        r"url\s*\(",
    ]
    
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e%2f",
        r"%2e%2e/",
        r"\.%2e/",
    ]
    
    @classmethod
    def detect_sql_injection(cls, value: str) -> bool:
        """Détecte les tentatives d'injection SQL"""
        if not isinstance(value, str):
            return False
        
        value_upper = value.upper()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_upper, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def detect_xss(cls, value: str) -> bool:
        """Détecte les tentatives XSS"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def detect_path_traversal(cls, value: str) -> bool:
        """Détecte les tentatives de path traversal"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        for pattern in cls.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 10000) -> str:
        """Sanitize une chaîne de caractères"""
        if not isinstance(value, str):
            return value
        
        # Limiter la longueur
        value = value[:max_length]
        
        # Échapper les caractères HTML
        value = html.escape(value)
        
        # Supprimer les caractères de contrôle (sauf newline, tab)
        value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
        
        return value
    
    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any], depth: int = 0, max_depth: int = 10) -> Dict[str, Any]:
        """Sanitize récursivement un dictionnaire"""
        if depth > max_depth:
            return data
        
        sanitized = {}
        for key, value in data.items():
            # Sanitize la clé
            safe_key = cls.sanitize_string(str(key), max_length=100)
            
            # Sanitize la valeur selon son type
            if isinstance(value, str):
                sanitized[safe_key] = cls.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[safe_key] = cls.sanitize_dict(value, depth + 1, max_depth)
            elif isinstance(value, list):
                sanitized[safe_key] = cls.sanitize_list(value, depth + 1, max_depth)
            else:
                sanitized[safe_key] = value
        
        return sanitized
    
    @classmethod
    def sanitize_list(cls, data: List[Any], depth: int = 0, max_depth: int = 10) -> List[Any]:
        """Sanitize récursivement une liste"""
        if depth > max_depth:
            return data
        
        sanitized = []
        for item in data:
            if isinstance(item, str):
                sanitized.append(cls.sanitize_string(item))
            elif isinstance(item, dict):
                sanitized.append(cls.sanitize_dict(item, depth + 1, max_depth))
            elif isinstance(item, list):
                sanitized.append(cls.sanitize_list(item, depth + 1, max_depth))
            else:
                sanitized.append(item)
        
        return sanitized


class SecurityScanner:
    """Scanner de sécurité pour les requêtes"""
    
    @classmethod
    def scan_value(cls, value: Any, path: str = "") -> List[Dict]:
        """Scanne une valeur pour détecter les menaces"""
        threats = []
        
        if isinstance(value, str):
            if InputSanitizer.detect_sql_injection(value):
                threats.append({
                    "type": "sql_injection",
                    "path": path,
                    "severity": "high"
                })
            
            if InputSanitizer.detect_xss(value):
                threats.append({
                    "type": "xss",
                    "path": path,
                    "severity": "high"
                })
            
            if InputSanitizer.detect_path_traversal(value):
                threats.append({
                    "type": "path_traversal",
                    "path": path,
                    "severity": "medium"
                })
        
        elif isinstance(value, dict):
            for k, v in value.items():
                threats.extend(cls.scan_value(v, f"{path}.{k}" if path else k))
        
        elif isinstance(value, list):
            for i, item in enumerate(value):
                threats.extend(cls.scan_value(item, f"{path}[{i}]"))
        
        return threats
    
    @classmethod
    def scan_request(cls, body: Any, query_params: Dict, headers: Dict) -> List[Dict]:
        """Scanne une requête complète"""
        threats = []
        
        # Scanner le body
        if body:
            threats.extend(cls.scan_value(body, "body"))
        
        # Scanner les query params
        for key, value in query_params.items():
            threats.extend(cls.scan_value(value, f"query.{key}"))
        
        # Scanner certains headers sensibles
        sensitive_headers = ["Authorization", "Cookie", "X-Custom-Header"]
        for header in sensitive_headers:
            if header in headers:
                threats.extend(cls.scan_value(headers[header], f"header.{header}"))
        
        return threats


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Middleware de validation des entrées"""
    
    # Endpoints exemptés
    EXEMPT_PATHS = ["/health", "/docs", "/openapi.json", "/redoc"]
    
    # Taille max du body (10 MB)
    MAX_BODY_SIZE = 10 * 1024 * 1024
    
    async def dispatch(self, request: Request, call_next):
        # Ignorer certains endpoints
        if any(request.url.path.startswith(p) for p in self.EXEMPT_PATHS):
            return await call_next(request)
        
        # Vérifier la taille du body
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            logger.warning(f"Request body too large: {content_length} bytes")
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large"}
            )
        
        # Scanner les query params
        query_params = dict(request.query_params)
        threats = SecurityScanner.scan_value(query_params, "query")
        
        # Scanner le body si présent
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body = json.loads(body_bytes)
                    threats.extend(SecurityScanner.scan_value(body, "body"))
            except json.JSONDecodeError:
                pass  # Body non-JSON, ignorer
            except Exception as e:
                logger.error(f"Error reading request body: {e}")
        
        # Si des menaces sont détectées
        if threats:
            high_severity = [t for t in threats if t["severity"] == "high"]
            
            if high_severity:
                # Logger l'incident
                logger.warning(
                    f"Security threat detected",
                    extra={
                        "path": request.url.path,
                        "method": request.method,
                        "threats": threats,
                        "client_ip": request.client.host if request.client else "unknown"
                    }
                )
                
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": {
                            "error": "security_violation",
                            "message": "Requête rejetée pour raisons de sécurité"
                        }
                    }
                )
        
        return await call_next(request)


# Validateurs spécifiques
class Validators:
    """Collection de validateurs réutilisables"""
    
    @staticmethod
    def email(value: str) -> bool:
        """Valide un email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def phone(value: str) -> bool:
        """Valide un numéro de téléphone"""
        # Format international ou local
        pattern = r'^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def cni(value: str) -> bool:
        """Valide un numéro CNI"""
        # Alphanumeric, 6-20 caractères
        pattern = r'^[A-Za-z0-9]{6,20}$'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def positive_number(value: Any) -> bool:
        """Valide un nombre positif"""
        try:
            return float(value) >= 0
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def date_string(value: str) -> bool:
        """Valide une date au format ISO"""
        pattern = r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def uuid(value: str) -> bool:
        """Valide un UUID"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(pattern, value.lower()))
