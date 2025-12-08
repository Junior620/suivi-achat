"""Configuration pytest"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Base de données de test PostgreSQL (utilise la base existante)
SQLALCHEMY_DATABASE_URL = "postgresql://cocoatrack:cocoatrack123@postgres:5432/cocoatrack"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    """Créer une base de données de test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """Client de test FastAPI"""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(client):
    """Headers d'authentification pour les tests"""
    # Créer un utilisateur de test
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "role": "admin"
    })
    
    # Se connecter
    response = client.post("/api/v1/auth/login", data={
        "username": "test@example.com",
        "password": "testpass123"
    })
    
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
