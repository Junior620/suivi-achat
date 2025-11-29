import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
from app.main import app
from app.database import Base, get_db
from app.models import User, Planter
from app.utils.security import hash_password, create_access_token

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

@pytest.fixture
def auth_headers():
    db = TestingSessionLocal()
    user = User(email="manager@test.com", password_hash=hash_password("pass"), role="manager")
    db.add(user)
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    db.close()
    return {"Authorization": f"Bearer {token}"}

def test_create_delivery(client, auth_headers):
    db = TestingSessionLocal()
    planter = Planter(name="Test Planter", phone="123456")
    db.add(planter)
    db.commit()
    planter_id = str(planter.id)
    db.close()
    
    response = client.post("/api/v1/deliveries", json={
        "planter_id": planter_id,
        "date": str(date.today()),
        "quantity_kg": 1500.50,
        "load_location": "Abidjan",
        "unload_location": "Port",
        "cocoa_quality": "Grade 1"
    }, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["quantity_kg"] == "1500.50"
