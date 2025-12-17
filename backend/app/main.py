from fastapi import FastAPI
# Force reload
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
from .routers import auth, users, planters, deliveries, analytics, exports, chef_planteurs, collectes, notifications, sse, cooperatives, payments, traceability, push_notifications, warehouses, documents, audit, sessions, messaging, websocket, invoices

import logging
import os

# Configure logging avec format détaillé
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Réduire les logs d'uvicorn access mais garder les erreurs
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)

app = FastAPI(
    title="Cocoa Delivery Management API",
    description="API pour la gestion des livraisons de cacao",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    logger.info(f"Database pool size: 5, max overflow: 10")
    
    # Exécuter les migrations automatiques
    try:
        from .database import engine
        from .migrations import run_startup_migrations
        logger.info("Running startup migrations...")
        run_startup_migrations(engine)
        logger.info("Startup migrations completed")
    except Exception as e:
        logger.error(f"Error running migrations: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")

# Middleware de gestion des erreurs (doit être en premier)
from .middleware.error_handler import ErrorHandlerMiddleware, RequestLoggingMiddleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Middleware de rate limiting (protection contre les abus)
from .middleware.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# Middleware de validation des entrées (sécurité)
from .middleware.input_validator import InputValidationMiddleware
app.add_middleware(InputValidationMiddleware)

# Middleware d'audit automatique (logs détaillés)
from .middleware.audit_middleware import AuditMiddleware
app.add_middleware(AuditMiddleware)

# Compression gzip pour toutes les réponses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(planters.router, prefix="/api/v1")
app.include_router(chef_planteurs.router, prefix="/api/v1")
app.include_router(deliveries.router, prefix="/api/v1")
app.include_router(collectes.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(exports.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(sse.router, prefix="/api/v1")
app.include_router(cooperatives.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(traceability.router, prefix="/api/v1")
app.include_router(push_notifications.router, prefix="/api/v1")
app.include_router(warehouses.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(messaging.router, prefix="/api/v1")
from .routers import messaging_features
app.include_router(messaging_features.router, prefix="/api/v1")
app.include_router(websocket.router)

@app.get("/")
def root():
    return {"message": "Cocoa Delivery Management API", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
