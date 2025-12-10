#!/usr/bin/env python3
"""Script pour initialiser la base de données de production"""
import os
import sys

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import engine, Base
from app import models
# Import tous les modèles pour que SQLAlchemy les connaisse
from app.models import *
from sqlalchemy.orm import Session
from argon2 import PasswordHasher

print("=" * 50)
print("INITIALISATION BASE DE DONNÉES PRODUCTION")
print("=" * 50)

# Créer toutes les tables
print("\n1. Création des tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("   ✓ Tables créées avec succès")
except Exception as e:
    print(f"   ✗ Erreur lors de la création des tables: {e}")
    sys.exit(1)

# Créer l'utilisateur admin
print("\n2. Création de l'utilisateur admin...")
try:
    db = Session(bind=engine)
    
    # Vérifier si l'admin existe déjà
    existing_admin = db.query(models.User).filter(models.User.email == "admin@cocoatrack.com").first()
    
    if existing_admin:
        print("   ⚠ L'utilisateur admin existe déjà")
    else:
        # Créer le hash du mot de passe avec argon2
        ph = PasswordHasher()
        hashed_password = ph.hash("Admin123!")
        
        # Créer l'utilisateur
        new_admin = models.User(
            email="admin@cocoatrack.com",
            password_hash=hashed_password,
            role="admin"
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"   ✓ Utilisateur admin créé: {new_admin.email}")
    
    db.close()
except Exception as e:
    print(f"   ✗ Erreur lors de la création de l'admin: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 50)
print("INITIALISATION TERMINÉE ✓")
print("=" * 50)
print("\nConnexion:")
print("  Email: admin@cocoatrack.com")
print("  Mot de passe: Admin123!")
