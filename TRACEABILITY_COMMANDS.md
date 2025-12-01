# ⚡ Commandes Rapides - Traçabilité

## 🚀 Installation & Déploiement

### Migration Complète
```bash
# Appliquer la migration
python apply_migration_016.py

# Générer la traçabilité pour livraisons existantes
python generate_traceability_existing.py

# Tester le système
python test_traceability.py
```

### Déploiement Azure
```bash
# Pousser le code
git add .
git commit -m "feat: traçabilité blockchain avec QR codes"
git push azure main

# Redémarrer l'app
az webapp restart --name cocoatrack-backend --resource-group cocoatrack-rg

# Voir les logs
az webapp log tail --name cocoatrack-backend --resource-group cocoatrack-rg
```

### Migration sur Azure
```bash
# Option 1: SSH
az webapp ssh --name cocoatrack-backend --resource-group cocoatrack-rg
cd /home/site/wwwroot
python apply_migration_016.py

# Option 2: Local avec DATABASE_URL Azure
DATABASE_URL="postgresql://user:pass@host/db" python apply_migration_016.py
```

## 🧪 Tests

### Test Complet
```bash
python test_traceability.py
```

### Tests Individuels
```bash
# Test connexion
python -c "from backend.app.database import engine; print('✅ OK' if engine else '❌ Erreur')"

# Test tables
python -c "from backend.app.models.traceability import TraceabilityRecord; print('✅ OK')"

# Test services
python -c "from backend.app.services.traceability_service import TraceabilityService; print('✅ OK')"
```

## 📊 Vérifications

### Vérifier les Tables
```bash
# PostgreSQL local
psql $DATABASE_URL -c "SELECT COUNT(*) FROM traceability_records;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM traceability_scans;"

# Azure
az postgres flexible-server execute \
  --name cocoatrack-db \
  --admin-user adminuser \
  --admin-password "VotreMotDePasse" \
  --database-name postgres \
  --querytext "SELECT COUNT(*) FROM traceability_records;"
```

### Vérifier la Blockchain
```bash
# Via API
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/blockchain/verify \
  -H "Authorization: Bearer $TOKEN"

# Via script
python -c "
from backend.app.database import SessionLocal
from backend.app.services.traceability_service import BlockchainService
db = SessionLocal()
print('✅ Intègre' if BlockchainService.verify_chain(db) else '❌ Compromise')
"
```

### Vérifier les Statistiques
```bash
# Via API
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/stats \
  -H "Authorization: Bearer $TOKEN"

# Via SQL
psql $DATABASE_URL -c "
SELECT 
  (SELECT COUNT(*) FROM traceability_records) as records,
  (SELECT COUNT(*) FROM traceability_scans) as scans,
  (SELECT COUNT(*) FROM deliveries) as deliveries;
"
```

## 🔍 Recherche & Debug

### Trouver une Livraison
```bash
# Par ID
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/delivery/{delivery_id} \
  -H "Authorization: Bearer $TOKEN"

# Par QR code
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/verify/COCOA-xxxxx-xxxxx
```

### Voir la Timeline
```bash
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/timeline/{delivery_id} \
  -H "Authorization: Bearer $TOKEN"
```

### Lister les QR Codes
```bash
psql $DATABASE_URL -c "
SELECT qr_code, block_number, created_at 
FROM traceability_records 
ORDER BY block_number 
LIMIT 10;
"
```

## 📝 Enregistrer un Scan

### Via API
```bash
curl -X POST https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/scan/COCOA-xxxxx-xxxxx \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scanned_by": "Jean Dupont",
    "scan_type": "verification",
    "scan_location": "Entrepôt A",
    "notes": "Contrôle qualité OK",
    "latitude": "5.3600",
    "longitude": "-4.0083"
  }'
```

### Via Python
```python
from backend.app.database import SessionLocal
from backend.app.services.traceability_service import TraceabilityService

db = SessionLocal()
scan = TraceabilityService.scan_qr_code(
    db=db,
    qr_code="COCOA-xxxxx-xxxxx",
    scanned_by="Jean Dupont",
    scan_location="Entrepôt A",
    scan_type="verification",
    notes="Contrôle qualité OK"
)
print(f"✅ Scan enregistré: {scan.id}")
```

## 🖨️ Impression

### Générer le PDF
```bash
python print_qr_codes.py
```

### Imprimer un QR Spécifique
```python
from backend.app.database import SessionLocal
from backend.app.models.traceability import TraceabilityRecord
import base64

db = SessionLocal()
record = db.query(TraceabilityRecord).filter(
    TraceabilityRecord.qr_code == "COCOA-xxxxx-xxxxx"
).first()

# Sauvegarder l'image
img_data = record.qr_code_image.split(',')[1]
with open(f"{record.qr_code}.png", "wb") as f:
    f.write(base64.b64decode(img_data))

print(f"✅ Image sauvegardée: {record.qr_code}.png")
```

## 🔧 Maintenance

### Régénérer la Traçabilité
```bash
# Pour toutes les livraisons sans traçabilité
python generate_traceability_existing.py

# Pour une livraison spécifique
python -c "
from backend.app.database import SessionLocal
from backend.app.models.delivery import Delivery
from backend.app.services.traceability_service import TraceabilityService

db = SessionLocal()
delivery = db.query(Delivery).filter(Delivery.id == 'delivery_id').first()
record = TraceabilityService.create_traceability_record(db, delivery)
print(f'✅ QR Code: {record.qr_code}')
"
```

### Nettoyer les Scans
```bash
# Supprimer les scans de test
psql $DATABASE_URL -c "
DELETE FROM traceability_scans 
WHERE scanned_by LIKE '%test%';
"
```

### Backup de la Blockchain
```bash
# Exporter toute la blockchain
psql $DATABASE_URL -c "
COPY (
  SELECT * FROM traceability_records 
  ORDER BY block_number
) TO '/tmp/blockchain_backup.csv' CSV HEADER;
"

# Exporter les scans
psql $DATABASE_URL -c "
COPY (
  SELECT * FROM traceability_scans 
  ORDER BY scanned_at
) TO '/tmp/scans_backup.csv' CSV HEADER;
"
```

## 📈 Analytics

### Statistiques Avancées
```bash
psql $DATABASE_URL -c "
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_records,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
FROM traceability_records
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
"
```

### Top Scanners
```bash
psql $DATABASE_URL -c "
SELECT 
  scanned_by,
  COUNT(*) as total_scans,
  COUNT(DISTINCT record_id) as unique_deliveries
FROM traceability_scans
GROUP BY scanned_by
ORDER BY total_scans DESC
LIMIT 10;
"
```

### Scans par Type
```bash
psql $DATABASE_URL -c "
SELECT 
  scan_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM traceability_scans
GROUP BY scan_type
ORDER BY count DESC;
"
```

## 🐛 Dépannage

### Vérifier les Dépendances
```bash
pip list | grep -E "qrcode|pillow|reportlab"
```

### Réinstaller les Dépendances
```bash
cd backend
pip install -r requirements.txt --force-reinstall
```

### Vérifier les Permissions
```bash
# Vérifier l'accès à la base
psql $DATABASE_URL -c "SELECT 1;"

# Vérifier les tables
psql $DATABASE_URL -c "\dt traceability*"

# Vérifier les index
psql $DATABASE_URL -c "\di traceability*"
```

### Reset Complet (⚠️ DANGER)
```bash
# ATTENTION: Supprime toutes les données de traçabilité!
psql $DATABASE_URL -c "
DROP TABLE IF EXISTS traceability_scans CASCADE;
DROP TABLE IF EXISTS traceability_records CASCADE;
"

# Puis réappliquer la migration
python apply_migration_016.py
python generate_traceability_existing.py
```

## 🔐 Sécurité

### Vérifier l'Intégrité d'un Bloc
```python
from backend.app.database import SessionLocal
from backend.app.models.traceability import TraceabilityRecord
from backend.app.services.traceability_service import BlockchainService

db = SessionLocal()
record = db.query(TraceabilityRecord).filter(
    TraceabilityRecord.block_number == 42
).first()

calculated = BlockchainService.calculate_hash(
    record.trace_data,
    record.previous_hash,
    record.block_number
)

if calculated == record.blockchain_hash:
    print("✅ Bloc intègre")
else:
    print("❌ Bloc compromis!")
    print(f"Attendu: {record.blockchain_hash}")
    print(f"Calculé: {calculated}")
```

### Audit Trail
```bash
psql $DATABASE_URL -c "
SELECT 
  tr.qr_code,
  tr.block_number,
  tr.created_at as delivery_created,
  COUNT(ts.id) as total_scans,
  MIN(ts.scanned_at) as first_scan,
  MAX(ts.scanned_at) as last_scan
FROM traceability_records tr
LEFT JOIN traceability_scans ts ON ts.record_id = tr.id
GROUP BY tr.id
ORDER BY tr.block_number DESC
LIMIT 20;
"
```

## 📚 Documentation

### Générer la Doc API
```bash
# Ouvrir la doc Swagger
open https://cocoatrack-backend.azurewebsites.net/docs

# Ou localement
cd backend
uvicorn app.main:app --reload
open http://localhost:8000/docs
```

### Lire les Guides
```bash
# Guide complet
cat TRACEABILITY_README.md

# Déploiement
cat DEPLOIEMENT_TRACEABILITY.md

# Quick start
cat QUICK_START_TRACEABILITY.md

# Checklist
cat DEPLOY_TRACEABILITY_CHECKLIST.md
```

## 🎯 Commandes Essentielles

```bash
# Installation complète
python apply_migration_016.py && \
python generate_traceability_existing.py && \
python test_traceability.py

# Déploiement complet
git add . && \
git commit -m "feat: traçabilité" && \
git push azure main && \
az webapp restart --name cocoatrack-backend --resource-group cocoatrack-rg

# Vérification complète
curl https://cocoatrack-backend.azurewebsites.net/health && \
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/stats \
  -H "Authorization: Bearer $TOKEN"

# Backup complet
python print_qr_codes.py && \
psql $DATABASE_URL -c "COPY traceability_records TO '/tmp/backup.csv' CSV HEADER"
```

---

**Toutes les commandes sont prêtes à l'emploi! ⚡**
