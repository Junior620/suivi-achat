#!/usr/bin/env python3
"""
Script de test du système de traçabilité
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from datetime import date
from decimal import Decimal

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Charger les variables d'environnement
load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL non trouvée dans backend/.env")
    sys.exit(1)

print("🔗 Connexion à la base de données...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

try:
    from app.models.delivery import Delivery
    from app.models.planter import Planter
    from app.models.traceability import TraceabilityRecord, TraceabilityScan
    from app.services.traceability_service import TraceabilityService, BlockchainService
    
    db = SessionLocal()
    print("✅ Connexion établie\n")
    
    # Test 1: Vérifier les tables
    print("📋 Test 1: Vérification des tables")
    try:
        count_records = db.query(TraceabilityRecord).count()
        count_scans = db.query(TraceabilityScan).count()
        print(f"   ✅ {count_records} enregistrements de traçabilité")
        print(f"   ✅ {count_scans} scans enregistrés")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        sys.exit(1)
    
    # Test 2: Vérifier l'intégrité de la blockchain
    print("\n🔗 Test 2: Intégrité de la blockchain")
    try:
        is_valid = BlockchainService.verify_chain(db)
        if is_valid:
            print("   ✅ Blockchain intègre")
        else:
            print("   ❌ Blockchain compromise!")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 3: Vérifier qu'une livraison a une traçabilité
    print("\n📦 Test 3: Vérification d'une livraison")
    try:
        delivery = db.query(Delivery).first()
        if delivery:
            record = db.query(TraceabilityRecord).filter(
                TraceabilityRecord.delivery_id == delivery.id
            ).first()
            
            if record:
                print(f"   ✅ Livraison {delivery.id}")
                print(f"   ✅ QR Code: {record.qr_code}")
                print(f"   ✅ Hash: {record.blockchain_hash[:16]}...")
                print(f"   ✅ Bloc: #{record.block_number}")
                print(f"   ✅ Scans: {len(record.scans)}")
            else:
                print(f"   ⚠️  Livraison {delivery.id} sans traçabilité")
        else:
            print("   ⚠️  Aucune livraison trouvée")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 4: Tester la vérification d'un QR code
    print("\n🔍 Test 4: Vérification d'un QR code")
    try:
        record = db.query(TraceabilityRecord).first()
        if record:
            result = TraceabilityService.verify_traceability(db, record.qr_code)
            if result['is_valid']:
                print(f"   ✅ QR Code valide: {record.qr_code}")
                print(f"   ✅ Message: {result['message']}")
                print(f"   ✅ Scans: {result['scans_count']}")
            else:
                print(f"   ❌ QR Code invalide!")
        else:
            print("   ⚠️  Aucun QR code à tester")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 5: Tester la timeline
    print("\n📅 Test 5: Timeline d'une livraison")
    try:
        delivery = db.query(Delivery).first()
        if delivery:
            timeline = TraceabilityService.get_delivery_timeline(db, str(delivery.id))
            if timeline:
                print(f"   ✅ Timeline récupérée")
                print(f"   ✅ QR Code: {timeline['qr_code']}")
                print(f"   ✅ Événements: {len(timeline['timeline'])}")
                print(f"   ✅ Total scans: {timeline['total_scans']}")
            else:
                print("   ⚠️  Timeline non trouvée")
        else:
            print("   ⚠️  Aucune livraison à tester")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 6: Statistiques
    print("\n📊 Test 6: Statistiques")
    try:
        total_deliveries = db.query(Delivery).count()
        total_records = db.query(TraceabilityRecord).count()
        total_scans = db.query(TraceabilityScan).count()
        
        coverage = (total_records / total_deliveries * 100) if total_deliveries > 0 else 0
        avg_scans = (total_scans / total_records) if total_records > 0 else 0
        
        print(f"   📦 Livraisons totales: {total_deliveries}")
        print(f"   🔗 Livraisons tracées: {total_records}")
        print(f"   📊 Couverture: {coverage:.1f}%")
        print(f"   📝 Scans totaux: {total_scans}")
        print(f"   📈 Moyenne scans/livraison: {avg_scans:.1f}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Résumé
    print("\n" + "="*50)
    print("✅ Tests terminés avec succès!")
    print("="*50)
    
    print("\n💡 Prochaines étapes:")
    print("   1. Déployer sur Azure: git push azure main")
    print("   2. Tester l'interface web")
    print("   3. Scanner un QR code")
    print("   4. Enregistrer des scans")
    print("   5. Vérifier la timeline")

except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'db' in locals():
        db.close()
    engine.dispose()
