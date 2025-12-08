# CocoaTrack - Application de Gestion des Livraisons de Cacao

Application web production-ready pour la gestion des livraisons de cacao avec authentification, analytics, exports et notifications en temps réel.

## 🚀 Déploiement

- **Frontend**: Déployé sur Vercel
- **Backend**: Déployé sur Azure App Service
- **Base de données**: PostgreSQL sur Azure Database

## 📦 Stack Technique

- **Backend**: Python FastAPI + PostgreSQL + SQLAlchemy + Alembic
- **Frontend**: HTML/CSS/JS vanilla + Chart.js + Tabulator + PWA
- **Auth**: JWT (access + refresh tokens)
- **Exports**: Excel (pandas/openpyxl) + PDF (ReportLab)
- **Notifications**: Server-Sent Events (SSE) temps réel
- **Traçabilité**: QR Codes + Blockchain SHA-256
- **PWA**: Service Worker + Cache offline + Installation

## Installation

### Prérequis

- Python 3.9+
- PostgreSQL 13+
- pip

### Configuration

1. Cloner le repository
2. Créer un fichier `.env` à la racine (voir `.env.example`)
3. Installer les dépendances:

```bash
cd backend
pip install -r requirements.txt
```

4. Créer la base de données PostgreSQL:

```bash
createdb cocoa_db
```

5. Exécuter les migrations:

```bash
alembic upgrade head
```

6. Charger les données de démo:

```bash
python seed.py
```

## Démarrage

### Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API disponible sur: http://localhost:8000
Documentation: http://localhost:8000/docs

### Frontend

Ouvrir `frontend/index.html` dans un navigateur ou utiliser un serveur local:

```bash
cd frontend
python -m http.server 3000
```

Frontend disponible sur: http://localhost:3000

### Docker (optionnel)

```bash
docker-compose up -d
```

## Utilisateurs de démo

- **Admin**: admin@cocoa.com / admin123
- **Manager**: manager@cocoa.com / manager123
- **Viewer**: viewer@cocoa.com / viewer123

**Note**: Vous pouvez également créer un nouveau compte via la page d'inscription. Les nouveaux comptes ont le rôle "viewer" par défaut.

## Tests

```bash
cd backend
pytest
```

## API Endpoints

Base path: `/api/v1`

### Auth
- POST `/auth/login` - Connexion
- POST `/auth/refresh` - Rafraîchir le token
- GET `/auth/me` - Profil utilisateur

### Planteurs
- GET/POST `/planters` - Liste/Créer
- GET/PUT/DELETE `/planters/{id}` - Détails/Modifier/Supprimer

### Livraisons
- GET/POST `/deliveries` - Liste/Créer (filtres: from, to, planter_id, load, unload, quality)
- GET/PUT/DELETE `/deliveries/{id}` - Détails/Modifier/Supprimer

### Analytics
- GET `/analytics/summary/planter` - Synthèse par planteur
- GET `/analytics/summary/zones` - Synthèse par zone
- GET `/analytics/summary/quality` - Synthèse par qualité

### Exports
- GET `/exports/excel` - Export Excel (données + synthèses)
- GET `/exports/pdf` - Export PDF (synthèses)

### Traçabilité
- GET `/traceability/delivery/{id}` - Traçabilité d'une livraison
- GET `/traceability/verify/{qr_code}` - Vérifier un QR code (public)
- POST `/traceability/scan/{qr_code}` - Enregistrer un scan
- GET `/traceability/timeline/{id}` - Timeline complète
- GET `/traceability/blockchain/verify` - Vérifier l'intégrité blockchain
- GET `/traceability/stats` - Statistiques de traçabilité

## 🔗 Système de Traçabilité

Le système inclut une traçabilité complète avec blockchain et QR codes:

- ✅ **QR Code unique** généré automatiquement pour chaque livraison
- ✅ **Blockchain SHA-256** pour garantir l'intégrité des données
- ✅ **Scanner mobile** (caméra ou saisie manuelle)
- ✅ **Historique des scans** avec géolocalisation
- ✅ **Timeline de traçabilité** complète
- ✅ **Vérification d'authenticité** en temps réel

### Déploiement de la Traçabilité

```bash
# 1. Appliquer la migration
python apply_migration_016.py

# 2. Générer la traçabilité pour les livraisons existantes
python generate_traceability_existing.py

# 3. Tester le système
python test_traceability.py
```

Voir `TRACEABILITY_README.md` et `DEPLOIEMENT_TRACEABILITY.md` pour plus de détails.

## 📊 Rapports Automatiques

Le système génère et envoie automatiquement des rapports par email:

- ✅ **Rapports hebdomadaires** (tous les lundis à 8h)
- ✅ **Rapports mensuels** (le 1er de chaque mois à 8h)
- ✅ **Génération PDF** professionnelle
- ✅ **Envoi par email** avec graphiques et tableaux
- ✅ **Comparaisons** avec périodes précédentes
- ✅ **Top planteurs** et alertes automatiques

### Configuration des Rapports

1. **Configurer SMTP dans `.env`**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
FROM_EMAIL=votre-email@gmail.com
FROM_NAME=CocoaTrack
REPORT_RECIPIENTS=admin@example.com,manager@example.com
```

2. **Tester la configuration**:
```bash
python test_smtp.py
```

3. **Accéder à l'interface**:
- Ouvrir `frontend/reports.html`
- Générer des rapports manuellement
- Télécharger en PDF
- Envoyer par email

Voir `RAPPORTS_AUTOMATIQUES.md` pour la documentation complète.

## Rôles et Permissions

- **viewer**: Lecture seule
- **manager**: CRUD planteurs/livraisons + lecture analytics/exports
- **admin**: Accès complet + gestion utilisateurs

## Structure du Projet

Voir `.kiro/steering/structure.md`


## 🌐 Déploiement sur Vercel (Frontend)

### Prérequis
- Compte Vercel
- Repository GitHub connecté

### Étapes

1. **Connecter le repository GitHub à Vercel**
   ```bash
   # Installer Vercel CLI (optionnel)
   npm i -g vercel
   ```

2. **Configuration Vercel**
   - Root Directory: `./`
   - Build Command: (laisser vide)
   - Output Directory: `frontend`
   - Install Command: (laisser vide)

3. **Variables d'environnement**
   Ajouter dans Vercel Dashboard > Settings > Environment Variables:
   ```
   VITE_API_URL=https://votre-backend.azurewebsites.net
   ```

4. **Déployer**
   ```bash
   vercel --prod
   ```

Le frontend sera accessible sur: `https://votre-app.vercel.app`

## ☁️ Déploiement sur Azure (Backend)

### Prérequis
- Compte Azure
- Azure CLI installé
- PostgreSQL Database créée sur Azure

### Étapes

1. **Créer une Web App sur Azure**
   ```bash
   az login
   az group create --name cocoatrack-rg --location westeurope
   az appservice plan create --name cocoatrack-plan --resource-group cocoatrack-rg --sku B1 --is-linux
   az webapp create --resource-group cocoatrack-rg --plan cocoatrack-plan --name cocoatrack-api --runtime "PYTHON:3.11"
   ```

2. **Créer une base de données PostgreSQL**
   ```bash
   az postgres flexible-server create \
     --resource-group cocoatrack-rg \
     --name cocoatrack-db \
     --location westeurope \
     --admin-user adminuser \
     --admin-password VotreMotDePasse123! \
     --sku-name Standard_B1ms \
     --tier Burstable \
     --storage-size 32
   ```

3. **Configurer les variables d'environnement**
   ```bash
   az webapp config appsettings set --resource-group cocoatrack-rg --name cocoatrack-api --settings \
     DATABASE_URL="postgresql://adminuser:VotreMotDePasse123!@cocoatrack-db.postgres.database.azure.com:5432/postgres" \
     SECRET_KEY="votre-secret-key-super-securisee" \
     ALGORITHM="HS256" \
     ACCESS_TOKEN_EXPIRE_MINUTES="30" \
     REFRESH_TOKEN_EXPIRE_DAYS="7" \
     CORS_ORIGINS="https://votre-app.vercel.app"
   ```

4. **Déployer le backend**
   ```bash
   cd backend
   az webapp up --resource-group cocoatrack-rg --name cocoatrack-api --runtime "PYTHON:3.11"
   ```

5. **Configurer le startup command**
   ```bash
   az webapp config set --resource-group cocoatrack-rg --name cocoatrack-api --startup-file "bash startup.sh"
   ```

Le backend sera accessible sur: `https://cocoatrack-api.azurewebsites.net`

### Configuration CORS

Mettre à jour `backend/app/config.py` avec l'URL Vercel:
```python
CORS_ORIGINS = [
    "https://votre-app.vercel.app",
    "http://localhost:3000"
]
```

### Appliquer les migrations

Connectez-vous à Azure et exécutez:
```bash
az webapp ssh --resource-group cocoatrack-rg --name cocoatrack-api
cd /home/site/wwwroot
alembic upgrade head
```

