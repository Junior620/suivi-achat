# 🔗 Déploiement du Système de Traçabilité

## Vue d'ensemble

Le système de traçabilité complet avec QR codes et blockchain est maintenant implémenté. Ce guide explique comment le déployer.

## ✨ Fonctionnalités

### 1. **QR Code par Livraison**
- Génération automatique d'un QR code unique pour chaque livraison
- Format: `COCOA-{delivery_id}-{hash_court}`
- Image encodée en base64 pour téléchargement

### 2. **Blockchain de Traçabilité**
- Chaque livraison est enregistrée dans une blockchain
- Hash SHA-256 pour garantir l'intégrité
- Chaînage des blocs (previous_hash)
- Vérification d'intégrité complète

### 3. **Scan et Suivi**
- Scanner les QR codes via caméra ou saisie manuelle
- Historique complet des scans
- Géolocalisation optionnelle
- Types de scan: vérification, transfert, contrôle qualité, etc.

### 4. **Timeline de Traçabilité**
- Visualisation chronologique de tous les événements
- Création, scans, transferts
- Informations détaillées sur chaque étape

## 📋 Étapes de Déploiement

### 1. Appliquer la Migration

```bash
# Méthode 1: Script Python (recommandé)
python apply_migration_016.py

# Méthode 2: SQL direct
psql $DATABASE_URL -f migration_016.sql
```

### 2. Générer la Traçabilité pour les Livraisons Existantes

```bash
python generate_traceability_existing.py
```

Ce script va:
- Trouver toutes les livraisons sans traçabilité
- Générer un QR code et un hash blockchain pour chacune
- Créer la chaîne de blocs complète

### 3. Vérifier l'Installation

```bash
# Tester la connexion et les tables
python backend/test_connection.py
```

### 4. Déployer sur Azure

```bash
# Pousser les changements
git add .
git commit -m "feat: système de traçabilité complet avec QR codes et blockchain"
git push azure main

# Redémarrer l'application
az webapp restart --name cocoatrack-backend --resource-group cocoatrack-rg
```

### 5. Déployer le Frontend sur Vercel

```bash
# Le frontend est automatiquement déployé via Vercel
# Vérifier que les nouveaux fichiers sont inclus:
# - frontend/js/traceability.js
# - frontend/css/traceability.css
# - html5-qrcode library (CDN)

# Forcer un redéploiement si nécessaire
vercel --prod
```

## 🧪 Tests

### Test Backend

```python
# Test de création de traçabilité
curl -X POST https://cocoatrack-backend.azurewebsites.net/api/v1/deliveries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planter_id": "...",
    "date": "2025-12-01",
    "quantity_kg": 100,
    "load_location": "Abidjan",
    "unload_location": "Port",
    "cocoa_quality": "Grade 1"
  }'

# Vérifier le QR code
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/verify/COCOA-xxxxx-xxxxx
```

### Test Frontend

1. Se connecter à l'application
2. Aller dans "🔗 Traçabilité"
3. Tester les 3 onglets:
   - **Scanner QR Code**: Tester avec la caméra ou saisie manuelle
   - **Rechercher**: Chercher une livraison
   - **Timeline**: Voir l'historique complet

### Test de la Blockchain

```python
# Vérifier l'intégrité de la blockchain
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/blockchain/verify \
  -H "Authorization: Bearer $TOKEN"
```

## 📱 Utilisation

### Pour les Utilisateurs

1. **Créer une livraison**
   - La traçabilité est générée automatiquement
   - Un QR code unique est créé

2. **Scanner un QR code**
   - Aller dans Traçabilité > Scanner
   - Utiliser la caméra ou saisir manuellement
   - Voir toutes les informations de la livraison

3. **Enregistrer un scan**
   - Après vérification, cliquer sur "Enregistrer un Scan"
   - Remplir les informations (qui, où, type)
   - Optionnel: activer la géolocalisation

4. **Voir la timeline**
   - Cliquer sur "Voir la Timeline"
   - Visualiser tous les événements chronologiquement

5. **Télécharger le QR code**
   - Cliquer sur "Télécharger QR Code"
   - Image PNG prête à imprimer

### Pour les Administrateurs

1. **Vérifier l'intégrité**
   - Cliquer sur "Vérifier l'intégrité"
   - S'assurer que la blockchain est valide

2. **Voir les statistiques**
   - Cliquer sur "Statistiques Blockchain"
   - Nombre de livraisons tracées
   - Nombre total de scans
   - Moyenne de scans par livraison

## 🔧 Configuration

### Variables d'Environnement

Aucune variable supplémentaire nécessaire. Le système utilise:
- `DATABASE_URL`: Connexion PostgreSQL existante
- Les dépendances sont déjà dans `requirements.txt`

### Dépendances

```txt
qrcode[pil]==7.4.2
pillow==10.1.0
```

Déjà incluses dans `backend/requirements.txt`.

### Frontend

```html
<!-- Bibliothèque QR Code Scanner -->
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
```

Déjà incluse dans `frontend/app.html`.

## 🔐 Sécurité

### Blockchain

- **Hash SHA-256**: Garantit l'intégrité des données
- **Chaînage**: Chaque bloc référence le précédent
- **Immuabilité**: Toute modification est détectable

### QR Codes

- **Uniques**: Format `COCOA-{uuid}-{hash}`
- **Vérifiables**: API publique de vérification
- **Sécurisés**: Contiennent le hash blockchain

### Scans

- **Authentifiés**: Nécessite un token JWT
- **Tracés**: Qui, quand, où
- **Géolocalisés**: Coordonnées GPS optionnelles

## 📊 Base de Données

### Tables Créées

1. **traceability_records**
   - Enregistrement principal de traçabilité
   - QR code, hash blockchain, données

2. **traceability_scans**
   - Historique des scans
   - Qui, quand, où, pourquoi

### Colonnes Ajoutées à deliveries

- `quality`: Alias de cocoa_quality pour compatibilité
- `vehicle`: Véhicule utilisé (optionnel)

## 🚀 Performance

### Optimisations

- Index sur `qr_code` et `blockchain_hash`
- Génération asynchrone (ne bloque pas la création)
- Cache des images QR en base64

### Scalabilité

- Blockchain légère (pas de minage)
- Vérification rapide (O(n) pour toute la chaîne)
- Scans illimités par livraison

## 🐛 Dépannage

### La traçabilité n'est pas générée

```bash
# Vérifier les logs
az webapp log tail --name cocoatrack-backend --resource-group cocoatrack-rg

# Générer manuellement
python generate_traceability_existing.py
```

### Le scanner QR ne fonctionne pas

- Vérifier les permissions de la caméra
- Utiliser HTTPS (requis pour la caméra)
- Utiliser la saisie manuelle en fallback

### La blockchain est compromise

```bash
# Vérifier l'intégrité
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/blockchain/verify \
  -H "Authorization: Bearer $TOKEN"

# Si compromise, contacter l'administrateur
# Ne pas modifier manuellement la base de données
```

## 📚 API Endpoints

### Traçabilité

- `GET /api/v1/traceability/delivery/{delivery_id}` - Obtenir la traçabilité
- `GET /api/v1/traceability/verify/{qr_code}` - Vérifier un QR code (public)
- `POST /api/v1/traceability/scan/{qr_code}` - Enregistrer un scan
- `GET /api/v1/traceability/timeline/{delivery_id}` - Timeline complète
- `GET /api/v1/traceability/blockchain/verify` - Vérifier la blockchain
- `GET /api/v1/traceability/qr-code/{qr_code}/image` - Image du QR code
- `GET /api/v1/traceability/stats` - Statistiques

## ✅ Checklist de Déploiement

- [ ] Migration 016 appliquée
- [ ] Traçabilité générée pour livraisons existantes
- [ ] Backend déployé sur Azure
- [ ] Frontend déployé sur Vercel
- [ ] Tests de création de livraison
- [ ] Tests de scan QR code
- [ ] Tests de timeline
- [ ] Vérification de l'intégrité blockchain
- [ ] Documentation utilisateur créée
- [ ] Formation des utilisateurs planifiée

## 🎯 Prochaines Étapes

1. **Impression des QR codes**
   - Créer des étiquettes imprimables
   - Format A4 ou étiquettes adhésives

2. **Application mobile**
   - Scanner QR codes plus facilement
   - Mode offline avec synchronisation

3. **Intégration externe**
   - API publique de vérification
   - Widget pour site web

4. **Analytics avancés**
   - Parcours des livraisons
   - Temps de transit
   - Zones de scan

## 📞 Support

En cas de problème:
1. Vérifier les logs Azure
2. Tester l'API directement
3. Vérifier la base de données
4. Contacter l'équipe technique

---

**Système de Traçabilité v1.0**  
Déploiement: Décembre 2025  
Blockchain: SHA-256  
QR Codes: Format COCOA
