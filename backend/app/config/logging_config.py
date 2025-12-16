"""
Configuration du logging pour Azure Container Apps
Optimisé pour Azure Application Insights
"""
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict

class AzureJsonFormatter(logging.Formatter):
    """
    Formatter JSON pour Azure Application Insights
    Format les logs en JSON pour une meilleure intégration avec Azure
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread
        }
        
        # Ajouter les données supplémentaires si présentes
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'duration'):
            log_data['duration_ms'] = round(record.duration * 1000, 2)
        if hasattr(record, 'status_code'):
            log_data['status_code'] = record.status_code
        if hasattr(record, 'error_details'):
            log_data['error_details'] = record.error_details
            
        # Ajouter l'exception si présente
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }
            
        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure le logging pour l'application
    
    Args:
        log_level: Niveau de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Créer le logger racine
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Supprimer les handlers existants
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Créer un handler pour stdout (Azure capture stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Utiliser le formatter JSON pour Azure
    console_handler.setFormatter(AzureJsonFormatter())
    
    # Ajouter le handler au logger racine
    root_logger.addHandler(console_handler)
    
    # Configurer les loggers spécifiques
    loggers_config = {
        "uvicorn": logging.INFO,
        "uvicorn.access": logging.WARNING,  # Réduire le bruit des logs d'accès
        "uvicorn.error": logging.ERROR,
        "sqlalchemy.engine": logging.WARNING,  # Logs SQL uniquement en cas de problème
        "fastapi": logging.INFO,
    }
    
    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    # Log de démarrage
    root_logger.info(
        "Logging configuré pour Azure Container Apps",
        extra={
            "log_level": log_level,
            "formatter": "JSON",
            "destination": "stdout"
        }
    )


def get_logger(name: str) -> logging.Logger:
    """
    Récupère un logger configuré
    
    Args:
        name: Nom du logger (généralement __name__)
        
    Returns:
        Logger configuré
    """
    return logging.getLogger(name)


# Classe helper pour logger avec contexte
class ContextLogger:
    """
    Logger avec contexte enrichi pour faciliter le debugging
    """
    
    def __init__(self, logger: logging.Logger, **context):
        self.logger = logger
        self.context = context
    
    def _add_context(self, extra: Dict[str, Any] = None) -> Dict[str, Any]:
        """Ajoute le contexte aux données extra"""
        if extra is None:
            extra = {}
        extra.update(self.context)
        return extra
    
    def debug(self, message: str, **kwargs):
        self.logger.debug(message, extra=self._add_context(kwargs))
    
    def info(self, message: str, **kwargs):
        self.logger.info(message, extra=self._add_context(kwargs))
    
    def warning(self, message: str, **kwargs):
        self.logger.warning(message, extra=self._add_context(kwargs))
    
    def error(self, message: str, **kwargs):
        self.logger.error(message, extra=self._add_context(kwargs))
    
    def critical(self, message: str, **kwargs):
        self.logger.critical(message, extra=self._add_context(kwargs))


# Exemple d'utilisation:
# from app.config.logging_config import get_logger, ContextLogger
# 
# logger = get_logger(__name__)
# 
# # Logger simple
# logger.info("Message simple")
# 
# # Logger avec contexte
# ctx_logger = ContextLogger(logger, request_id=123, user_id=456)
# ctx_logger.info("Message avec contexte", action="create_planter")
