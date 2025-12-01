# ✅ Checklist de Déploiement - Système de Traçabilité

## 📋 Pré-déploiement

- [ ] Vérifier que PostgreSQL est accessible
- [ ] Vérifier que les dépendances sont installées (`qrcode`, `pillow`)
- [ ] Sauvegarder la base de données
- [ ] Tester en local d'abord

## 🗄️ Base de Données

### 1. Appliquer la Migration

```bash
python apply_migration_016.py
```

**Vérifications:**
- [ ] Tables `traceability_records` et `traceability_scans` créées
- [ ] Colonnes `quality` et `vehicle` ajoutées à `deliveries`
- [ ] Index créés correctement
- [ ] Version alembic mise à jour à '016'

### 2. Générer la Traçabilité Existante

```bash
python generate_traceability_existing.py
```

**Vérifications:**
- [ ] Toutes les livraisons ont un QR code
- [ ] Blockchain créée avec chaînage correct
- [ ] Aucune erreur dans les logs

### 3. Tester le Système

```bash
python test_traceability.py
```

**Vérifications:**
- [ ] Tables accessibles
- [ ] Blockchain intègre
- [ ] Vérification QR code fonctionne
- [ ] Timeline récupérable
- [ ] Statistiques correctes

## 🚀 Backend (Azure)

### 1. Pousser le Code

```bash
git add .
git commit -m "feat: système de traçabilité complet avec QR codes et blockchain"
git push azure main
```

### 2. Vérifier le Déploiement

```bash
# Voir les logs
az webapp log tail --name cocoatrack-backend --resource-group cocoatrack-rg

# Vérifier le statut
az webapp show --name cocoatrack-backend --resource-group cocoatrack-rg --query state
```

**Vérifications:**
- [ ] Déploiement réussi
- [ ] Application démarrée
- [ ] Aucune erreur dans les logs
- [ ] Dépendances installées

### 3. Appliquer la Migration sur Azure

```bash
# Option 1: Via SSH
az webapp ssh --name cocoatrack-backend --resource-group cocoatrack-rg
cd /home/site/wwwroot
python apply_migration_016.py

# Option 2: Via script local avec DATABASE_URL Azure
DATABASE_URL="postgresql://..." python apply_migration_016.py
```

**Vérifications:**
- [ ] Migration appliquée sans erreur
- [ ] Tables créées sur Azure
- [ ] Traçabilité générée pour livraisons existantes

### 4. Tester l'API

```bash
# Health check
curl https://cocoatrack-backend.azurewebsites.net/health

# Test traçabilité
curl https://cocoatrack-backend.azurewebsites.net/api/v1/traceability/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Vérifications:**
- [ ] API répond
- [ ] Endpoints de traçabilité accessibles
- [ ] Statistiques correctes

## 🌐 Frontend (Vercel)

### 1. Vérifier les Fichiers

**Vérifications:**
- [ ] `frontend/js/traceability.js` présent
- [ ] `frontend/css/traceability.css` présent
- [ ] `frontend/app.html` mis à jour (navigation + scripts)
- [ ] `frontend/js/app.js` mis à jour (routing)

### 2. Déployer

```bash
# Automatique via Git push
git push origin main

# Ou manuel
vercel --prod
```

**Vérifications:**
- [ ] Déploiement réussi sur Vercel
- [ ] Nouveaux fichiers inclus
- [ ] Pas d'erreurs de build

### 3. Tester l'Interface

**Vérifications:**
- [ ] Menu "🔗 Traçabilité" visible
- [ ] Page se charge sans erreur
- [ ] 3 onglets présents (Scanner, Rechercher, Timeline)
- [ ] Styles appliqués correctement
- [ ] Bibliothèque html5-qrcode chargée

## 🧪 Tests Fonctionnels

### 1. Création de Livraison

- [ ] Créer une nouvelle livraison
- [ ] Vérifier qu'un QR code est généré automatiquement
- [ ] Vérifier le hash blockchain
- [ ] Vérifier le numéro de bloc

### 2. Scanner QR Code

- [ ] Aller dans Traçabilité > Scanner
- [ ] Tester avec la caméra (si disponible)
- [ ] Tester avec saisie manuelle
- [ ] Vérifier les informations affichées
- [ ] Vérifier le statut (✓ authentique)

### 3. Enregistrer un Scan

- [ ] Cliquer sur "Enregistrer un Scan"
- [ ] Remplir le formulaire
- [ ] Tester avec géolocalisation
- [ ] Vérifier l'enregistrement

### 4. Timeline

- [ ] Cliquer sur "Voir la Timeline"
- [ ] Vérifier l'événement de création
- [ ] Vérifier les scans enregistrés
- [ ] Vérifier l'ordre chronologique

### 5. Recherche

- [ ] Aller dans Traçabilité > Rechercher
- [ ] Rechercher par ID de livraison
- [ ] Rechercher par QR code
- [ ] Vérifier les résultats

### 6. Statistiques

- [ ] Cliquer sur "Statistiques Blockchain"
- [ ] Vérifier les chiffres
- [ ] Vérifier l'état de la blockchain

### 7. Vérification d'Intégrité

- [ ] Cliquer sur "Vérifier l'intégrité"
- [ ] Vérifier que la blockchain est intègre
- [ ] Vérifier le nombre de blocs

## 📱 Tests Mobile

- [ ] Ouvrir sur smartphone
- [ ] Tester le scanner QR avec caméra
- [ ] Tester la géolocalisation
- [ ] Vérifier la responsive
- [ ] Tester en mode portrait/paysage

## 🔐 Tests de Sécurité

- [ ] Vérifier l'authentification JWT
- [ ] Tester sans token (doit échouer)
- [ ] Vérifier que verify/{qr_code} est public
- [ ] Tester la modification de données (doit être détectée)

## 📊 Tests de Performance

- [ ] Créer 10 livraisons rapidement
- [ ] Vérifier que les QR codes sont générés
- [ ] Scanner plusieurs QR codes
- [ ] Vérifier les temps de réponse
- [ ] Vérifier la vérification blockchain (< 1s pour 100 blocs)

## 📄 Documentation

- [ ] README.md mis à jour
- [ ] TRACEABILITY_README.md créé
- [ ] DEPLOIEMENT_TRACEABILITY.md créé
- [ ] Scripts de migration documentés
- [ ] API endpoints documentés

## 🎓 Formation Utilisateurs

- [ ] Créer un guide utilisateur
- [ ] Préparer des captures d'écran
- [ ] Faire une démo vidéo
- [ ] Former les administrateurs
- [ ] Former les utilisateurs finaux

## 📦 Impression QR Codes

- [ ] Générer le PDF d'impression
  ```bash
  python print_qr_codes.py
  ```
- [ ] Imprimer sur papier A4
- [ ] Découper les QR codes
- [ ] Plastifier (optionnel)
- [ ] Distribuer aux utilisateurs

## 🔄 Maintenance

### Quotidienne
- [ ] Vérifier les logs d'erreur
- [ ] Vérifier les statistiques de scan
- [ ] Surveiller les performances

### Hebdomadaire
- [ ] Vérifier l'intégrité de la blockchain
- [ ] Analyser les patterns de scan
- [ ] Vérifier la couverture (% livraisons tracées)

### Mensuelle
- [ ] Sauvegarder la blockchain
- [ ] Générer un rapport de traçabilité
- [ ] Optimiser les index si nécessaire

## 🐛 Dépannage

### Problème: QR code non généré

**Solution:**
```bash
# Vérifier les logs
az webapp log tail --name cocoatrack-backend --resource-group cocoatrack-rg

# Générer manuellement
python generate_traceability_existing.py
```

### Problème: Scanner ne fonctionne pas

**Solution:**
- Vérifier HTTPS (requis pour caméra)
- Vérifier permissions navigateur
- Utiliser saisie manuelle en fallback

### Problème: Blockchain compromise

**Solution:**
```bash
# Vérifier l'intégrité
python test_traceability.py

# Identifier le bloc problématique
# Contacter l'administrateur
# NE PAS modifier manuellement
```

### Problème: Performance lente

**Solution:**
```bash
# Vérifier les index
psql $DATABASE_URL -c "SELECT * FROM pg_indexes WHERE tablename LIKE 'traceability%';"

# Analyser les requêtes lentes
# Optimiser si nécessaire
```

## ✅ Validation Finale

- [ ] Tous les tests passent
- [ ] Documentation complète
- [ ] Utilisateurs formés
- [ ] Monitoring en place
- [ ] Backup configuré
- [ ] Support disponible

## 🎉 Go Live!

Date de déploiement: _______________

Déployé par: _______________

Validé par: _______________

Notes:
_________________________________
_________________________________
_________________________________

---

**Système de Traçabilité v1.0**  
CocoaTrack - Décembre 2025
