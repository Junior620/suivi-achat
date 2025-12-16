"""
Middleware de gestion des erreurs avec logging amélioré
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback
import time
from typing import Callable

logger = logging.getLogger(__name__)

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
                "traceback": traceback.format_exc()
            }
            
            logger.error(
                f"[{request_id}] Erreur non gérée:\n"
                f"  Méthode: {error_details['method']}\n"
                f"  Chemin: {error_details['path']}\n"
                f"  Params: {error_details['query_params']}\n"
                f"  Client: {error_details['client_host']}\n"
                f"  Type: {error_details['error_type']}\n"
                f"  Message: {error_details['error_message']}\n"
                f"  Temps: {error_details['process_time']}\n"
                f"  Traceback:\n{error_details['traceback']}"
            )
            
            # Déterminer le code de statut et le message
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            message = "Une erreur interne est survenue"
            
            # Messages personnalisés selon le type d'erreur
            if "ValidationError" in error_details['error_type']:
                status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
                message = "Erreur de validation des données"
            elif "IntegrityError" in error_details['error_type']:
                status_code = status.HTTP_409_CONFLICT
                message = "Conflit : cette ressource existe déjà ou viole une contrainte"
            elif "NotFound" in error_details['error_type']:
                status_code = status.HTTP_404_NOT_FOUND
                message = "Ressource non trouvée"
            elif "PermissionError" in error_details['error_type']:
                status_code = status.HTTP_403_FORBIDDEN
                message = "Accès refusé"
            elif "TimeoutError" in error_details['error_type']:
                status_code = status.HTTP_504_GATEWAY_TIMEOUT
                message = "Délai d'attente dépassé"
            elif "ConnectionError" in error_details['error_type']:
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                message = "Service temporairement indisponible"
            
            # Retourner une réponse JSON avec les détails
            return JSONResponse(
                status_code=status_code,
                content={
                    "detail": message,
                    "error_type": error_details['error_type'],
                    "request_id": str(request_id),
                    # Inclure le message d'erreur complet en développement
                    "error_message": str(exc) if logger.level <= logging.DEBUG else None
                }
            )


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
