"""Tests d'authentification"""
import pytest

def test_register_user(client):
    """Test création d'utilisateur"""
    response = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "password123",
        "role": "manager"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data

def test_login_success(client):
    """Test connexion réussie"""
    # Créer utilisateur
    client.post("/api/v1/auth/register", json={
        "email": "user@example.com",
        "password": "pass123",
        "role": "admin"
    })
    
    # Se connecter
    response = client.post("/api/v1/auth/login", data={
        "username": "user@example.com",
        "password": "pass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client):
    """Test connexion avec mauvais mot de passe"""
    client.post("/api/v1/auth/register", json={
        "email": "user@example.com",
        "password": "correct",
        "role": "admin"
    })
    
    response = client.post("/api/v1/auth/login", data={
        "username": "user@example.com",
        "password": "wrong"
    })
    assert response.status_code == 401

def test_get_me(client, auth_headers):
    """Test récupération profil utilisateur"""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
