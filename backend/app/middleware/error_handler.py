"""
Middleware de gestion des erreurs avec logging amélioré pour Azure Container Apps
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback
import time
import json
from typing import Callable
from datetime import datetime

# Configuration du logger pour Azure
logger = logging.getLogger(__name__)

# Format JSON pour Azure Application Insights
class AzureJsonFormatter(logging.Formatter):
    """Formatter JSON pour Azure Application Insights"""
    
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Ajouter les données supplémentaires si présentes
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'duration'):
            log_data['duration'] = record.duration
        if hasattr(record, 'status_code'):
            log_data['status_code'] = record.status_code
            
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

# Appliquer le formatter si on est sur Azure
if logger.handlers:
    for handler in logger.handlers:
        handler.setFormatter(AzureJsonFormatter())

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware pour capturer et logger toutes les erreurs
    avec des messages détaillés pour le debugging
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        request_id = id(request)
        
        try:
            # Logger la requête entrante
            logger.info(f"[{request_id}] {request.method} {request.url.path}")
            
            response = await call_next(request)
            
            # Logger le temps de réponse
            process_time = time.time() - start_time
            if process_time > 1.0:  # Logger si > 1 seconde
                logger.warning(
                    f"[{request_id}] Requête lente: {request.method} {request.url.path} "
                    f"- {process_time:.2f}s"
                )
            
            return response
            
        except Exception as exc:
            process_time = time.time() - start_time
            
            # Logger l'erreur avec tous les détails
            error_details = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_host": request.client.host if request.client else "unknown",
                "process_time": f"{process_time:.2f}s",
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "traceback": traceback.format_exc(),
                "user_agent": request.headers.get("user-agent", "unknown"),
                "referer": request.headers.get("referer", "unknown")
            }
            
            # Logger avec contexte enrichi pour Azure
            logger.error(
                f"[{request_id}] Erreur non gérée: {error_details['error_type']} - {error_details['error_message']}",
                extra={
                    "request_id": request_id,
                    "duration": process_time,
                    "status_code": 500,
                    "error_details": error_details
                },
                exc_info=True
            )
            
            # Déterminer le code de statut et le message
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = "Une erreur interne est survenue. Notre équipe a été notifiée."
            user_message = "Une erreur est survenue. Veuillez réessayer dans quelques instants."
            
            # Messages personnalisés selon le type d'erreur
            if "ValidationError" in error_details['error_type']:
                status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
                message = "Erreur de validation des données"
                user_message = "Les données fournies sont invalides. Veuillez vérifier les champs."
            elif "IntegrityError" in error_details['error_type']:
                status_code = status.HTTP_409_CONFLICT
                message = "Conflit : cette ressource existe déjà ou viole une contrainte"
                user_message = "Cette ressource existe déjà ou viole une contrainte d'intégrité."
            elif "NotFound" in error_details['error_type']:
                status_code = status.HTTP_404_NOT_FOUND
                message = "Ressource non trouvée"
                user_message = "La ressource demandée n'existe pas."
            elif "PermissionError" in error_details['error_type']:
                status_code = status.HTTP_403_FORBIDDEN
                message = "Accès refusé"
                user_message = "Vous n'avez pas les permissions nécessaires pour cette action."
            elif "TimeoutError" in error_details['error_type']:
                status_code = status.HTTP_504_GATEWAY_TIMEOUT
                message = "Délai d'attente dépassé"
                user_message = "Le serveur met trop de temps à répondre. Veuillez réessayer."
            elif "ConnectionError" in error_details['error_type']:
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                message = "Service temporairement indisponible"
                user_message = "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants."
            elif "OperationalError" in error_details['error_type']:
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                message = "Erreur de base de données"
                user_message = "Erreur de connexion à la base de données. Veuillez réessayer."
            
            # Retourner une réponse JSON avec les détails
            return JSONResponse(
                status_code=status_code,
                content={
                    "detail": user_message,
                    "message": user_message,  # Alias pour compatibilité
                    "error_type": error_details['error_type'],
                    "request_id": str(request_id),
                    "timestamp": datetime.utcnow().isoformat(),
                    # Inclure le message d'erreur complet en développement
                    "error_message": str(exc) if logger.level <= logging.DEBUG else None,
                    # Suggestions pour l'utilisateur
                    "suggestion": self._get_error_suggestion(error_details['error_type'])
                }
            )
    
    def _get_error_suggestion(self, error_type: str) -> str:
        """Retourne une suggestion basée sur le type d'erreur"""
        suggestions = {
            "ValidationError": "Vérifiez que tous les champs requis sont remplis correctement.",
            "IntegrityError": "Cette ressource existe déjà. Essayez avec des valeurs différentes.",
            "NotFound": "Vérifiez que l'identifiant est correct.",
            "PermissionError": "Contactez un administrateur pour obtenir les permissions nécessaires.",
            "TimeoutError": "Le serveur est occupé. Réessayez dans quelques secondes.",
            "ConnectionError": "Vérifiez votre connexion internet.",
            "OperationalError": "Problème de connexion à la base de données. Réessayez dans un instant."
        }
        
        for key, suggestion in suggestions.items():
            if key in error_type:
                return suggestion
        
        return "Si le problème persiste, contactez le support technique."


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware pour logger toutes les requêtes avec leurs détails
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = id(request)
        start_time = time.time()
        
        # Logger les détails de la requête
        logger.debug(
            f"[{request_id}] Requête entrante:\n"
            f"  Méthode: {request.method}\n"
            f"  Chemin: {request.url.path}\n"
            f"  Query: {dict(request.query_params)}\n"
            f"  Client: {request.client.host if request.client else 'unknown'}\n"
            f"  User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Logger la réponse
        logger.debug(
            f"[{request_id}] Réponse:\n"
            f"  Status: {response.status_code}\n"
            f"  Temps: {process_time:.3f}s"
        )
        
        # Ajouter le temps de traitement dans les headers
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        response.headers["X-Request-ID"] = str(request_id)
        
        return response
