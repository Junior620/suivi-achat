from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, users, planters, deliveries, analytics, exports, chef_planteurs, collectes, notifications, sse, cooperatives, payments, traceability

app = FastAPI(
    title="Cocoa Delivery Management API",
    description="API pour la gestion des livraisons de cacao",
    version="1.0.0"
)

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
app.include_router(traceability.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Cocoa Delivery Management API", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
