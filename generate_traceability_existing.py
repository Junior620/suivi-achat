#!/usr/bin/env python3
"""
Script pour générer la traçabilité pour les livraisons existantes
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Charger les variables d'environnement
load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL non trouvée dans backend/.env")
    sys.exit(1)

print(f"🔗 Connexion à la base de données...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

try:
    from app.models.delivery import Delivery
    from app.models.traceability import TraceabilityRecord
    from app.services.traceability_service import TraceabilityService
    
    db = SessionLocal()
    
    print("✅ Connexion établie")
    
    # Récupérer toutes les livraisons sans traçabilité
    deliveries = db.query(Delivery).outerjoin(TraceabilityRecord).filter(
        TraceabilityRecord.id == None
    ).all()
    
    total = len(deliveries)
    print(f"\n📦 {total} livraisons sans traçabilité trouvées")
    
    if total == 0:
        print("✅ Toutes les livraisons ont déjà une traçabilité")
        sys.exit(0)
    
    print("\n🔄 Génération de la traçabilité...")
    
    success = 0
    errors = 0
    
    for i, delivery in enumerate(deliveries, 1):
        try:
            record = TraceabilityService.create_traceability_record(db, delivery)
            success += 1
            print(f"  [{i}/{total}] ✅ {delivery.id} -> {record.qr_code}")
        except Exception as e:
            errors += 1
            print(f"  [{i}/{total}] ❌ {delivery.id} -> Erreur: {e}")
    
    print(f"\n📊 Résumé:")
    print(f"   ✅ Succès: {success}")
    print(f"   ❌ Erreurs: {errors}")
    print(f"   📦 Total: {total}")
    
    if success > 0:
        print("\n✅ Traçabilité générée avec succès!")
        print("\n💡 Chaque livraison a maintenant:")
        print("   - Un QR code unique")
        print("   - Un hash blockchain")
        print("   - Un numéro de bloc")
        print("   - Des données de traçabilité complètes")

except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
    engine.dispose()
