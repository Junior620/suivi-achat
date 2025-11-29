import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)

def test_register_new_user(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "password": "password123",
        "role": "viewer"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "viewer"
    assert "id" in data

def test_register_duplicate_email(client):
    # First registration
    client.post("/api/v1/auth/register", json={
        "email": "duplicate@test.com",
        "password": "password123",
        "role": "viewer"
    })
    
    # Second registration with same email
    response = client.post("/api/v1/auth/register", json={
        "email": "duplicate@test.com",
        "password": "password456",
        "role": "viewer"
    })
    assert response.status_code == 400

def test_register_then_login(client):
    # Register
    client.post("/api/v1/auth/register", json={
        "email": "logintest@test.com",
        "password": "password123",
        "role": "viewer"
    })
    
    # Login
    response = client.post("/api/v1/auth/login", json={
        "email": "logintest@test.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
