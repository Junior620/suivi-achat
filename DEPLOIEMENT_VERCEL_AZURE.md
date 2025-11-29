# Déploiement Vercel (Frontend) + Azure (Backend)

## 🎯 Architecture de déploiement

```
┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │   Azure         │
│   (Frontend)    │ ◄─────► │   (Backend)     │
│   PWA + Offline │  HTTPS  │   FastAPI       │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
        ▼                           ▼
   Utilisateurs              PostgreSQL
   (Mobile/Desktop)          (Base de données)
```

## 📦 1. Déploiement Frontend sur Vercel

### Prérequis
- Compte Vercel (gratuit)
- Git repository (GitHub, GitLab, Bitbucket)

### Étapes

**1. Préparer le repository**
```bash
# Créer un .gitignore si pas déjà fait
echo "venv/" >> .gitignore
echo "backend/.env" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore

# Commit et push
git add .
git commit -m "Prêt pour déploiement Vercel"
git push origin main
```

**2. Déployer sur Vercel**
1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer "New Project"
3. Importer votre repository Git
4. **Root Directory** : `frontend`
5. **Framework Preset** : Other
6. **Build Command** : (laisser vide)
7. **Output Directory** : `.`
8. Cliquer "Deploy"

**3. Configuration après déploiement**

Votre app sera disponible sur : `https://votre-app.vercel.app`

### Configuration CORS

Le backend Azure doit accepter les requêtes depuis Vercel :

```python
# backend/app/config.py
CORS_ORIGINS = "https://votre-app.vercel.app,http://localhost:3000"
```

### Mettre à jour l'URL du backend

**Option 1 : Variable d'environnement Vercel**
1. Vercel Dashboard → Settings → Environment Variables
2. Ajouter : `VITE_API_URL` = `https://votre-backend.azurewebsites.net`

**Option 2 : Modifier directement**
```javascript
// frontend/js/api.js
const API_BASE = 'https://votre-backend.azurewebsites.net/api/v1';
```

## ☁️ 2. Déploiement Backend sur Azure

### Option A : Azure App Service (Recommandé)

**Prérequis**
- Compte Azure
- Azure CLI installé

**Étapes**

```bash
# 1. Se connecter à Azure
az login

# 2. Créer un groupe de ressources
az group create --name cocoatrack-rg --location westeurope

# 3. Créer un plan App Service
az appservice plan create \
  --name cocoatrack-plan \
  --resource-group cocoatrack-rg \
  --sku B1 \
  --is-linux

# 4. Créer l'App Service
az webapp create \
  --resource-group cocoatrack-rg \
  --plan cocoatrack-plan \
  --name cocoatrack-api \
  --runtime "PYTHON:3.11"

# 5. Configurer les variables d'environnement
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api \
  --settings \
    DATABASE_URL="postgresql://..." \
    JWT_SECRET="votre-secret" \
    CORS_ORIGINS="https://votre-app.vercel.app"

# 6. Déployer
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api \
  --src deploy.zip
```

**URL du backend** : `https://cocoatrack-api.azurewebsites.net`

### Option B : Azure Container Instances (Docker)

```bash
# 1. Build l'image Docker
cd backend
docker build -t cocoatrack-backend .

# 2. Push vers Azure Container Registry
az acr create --resource-group cocoatrack-rg --name cocoatrackacr --sku Basic
az acr login --name cocoatrackacr
docker tag cocoatrack-backend cocoatrackacr.azurecr.io/backend:latest
docker push cocoatrackacr.azurecr.io/backend:latest

# 3. Déployer le container
az container create \
  --resource-group cocoatrack-rg \
  --name cocoatrack-backend \
  --image cocoatrackacr.azurecr.io/backend:latest \
  --dns-name-label cocoatrack-api \
  --ports 8000
```

## 🗄️ 3. Base de données PostgreSQL

### Option A : Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group cocoatrack-rg \
  --name cocoatrack-db \
  --location westeurope \
  --admin-user adminuser \
  --admin-password "VotreMotDePasse123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32
```

**Connection String** :
```
postgresql://adminuser:VotreMotDePasse123!@cocoatrack-db.postgres.database.azure.com:5432/postgres
```

### Option B : Supabase (Alternative gratuite)

1. Créer un compte sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier la connection string PostgreSQL
4. Utiliser dans Azure App Service

## 🔐 4. Configuration HTTPS et Sécurité

### Vercel (Frontend)
- ✅ HTTPS automatique
- ✅ Certificat SSL gratuit
- ✅ CDN global

### Azure (Backend)
- ✅ HTTPS automatique avec App Service
- ⚠️ Configurer le certificat SSL si domaine personnalisé

### CORS Configuration

```python
# backend/app/config.py
class Settings(BaseSettings):
    # ...
    cors_origins: str = Field(
        default="https://votre-app.vercel.app",
        env="CORS_ORIGINS"
    )
```

## 🚀 5. Workflow de déploiement

### Déploiement automatique avec GitHub Actions

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: cocoatrack-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./backend
```

## 📱 6. Mode Offline en production

### Comment ça fonctionne

**Première visite (avec internet)** :
```
1. Utilisateur visite https://votre-app.vercel.app
2. Service Worker s'installe
3. Fichiers mis en cache (HTML, CSS, JS, images)
4. Données API récentes mises en cache
```

**Utilisation offline** :
```
1. Utilisateur perd la connexion
2. Ouvre l'app → Fonctionne depuis le cache
3. Consulte les données en cache
4. Crée une livraison → Stockée dans IndexedDB
5. Toast : "Données enregistrées localement"
```

**Retour online** :
```
1. Connexion rétablie
2. Service Worker détecte
3. Envoie automatiquement vers Azure
4. Toast : "Synchronisation réussie"
5. Données dans PostgreSQL
```

## ⚠️ Points importants

### 1. Cache initial
- L'utilisateur **doit visiter l'app au moins une fois avec connexion**
- Après, il peut l'utiliser offline

### 2. Données en cache
- Seules les données **déjà consultées** sont disponibles offline
- Exemple : Si tu as vu la liste des planteurs → disponible offline
- Si tu n'as jamais ouvert la page collectes → pas disponible offline

### 3. Synchronisation
- Les données créées offline sont **envoyées automatiquement**
- Pas de perte de données
- Gestion des conflits à prévoir si plusieurs utilisateurs modifient la même chose

## 🎯 Recommandations pour ton cas

### Pour les planteurs en zone rurale

**Stratégie recommandée** :
1. **Le soir** : Ouvrir l'app avec connexion → Tout se met en cache
2. **Le jour** : Travailler offline dans les champs
3. **Le soir** : Retour à la maison → Synchronisation automatique

### Optimisations

**Précharger les données importantes** :
```javascript
// Au chargement de l'app
async function preloadData() {
    await api.getPlanters({ size: 1000 });
    await api.getChefPlanteurs();
    await api.getCooperatives();
    // Tout est maintenant en cache
}
```

## 📋 Checklist de déploiement

### Avant de déployer

- [ ] Tester le mode offline en local
- [ ] Vérifier que le Service Worker fonctionne
- [ ] Tester l'installation PWA
- [ ] Configurer les variables d'environnement
- [ ] Préparer la base de données PostgreSQL

### Déploiement

- [ ] Déployer le backend sur Azure
- [ ] Configurer PostgreSQL
- [ ] Tester les endpoints API
- [ ] Mettre à jour l'URL API dans le frontend
- [ ] Déployer le frontend sur Vercel
- [ ] Tester l'app en production
- [ ] Tester le mode offline en production

### Après déploiement

- [ ] Installer l'app sur mobile
- [ ] Tester offline complet
- [ ] Vérifier la synchronisation
- [ ] Former les utilisateurs

## 💰 Coûts estimés

**Vercel (Frontend)** :
- Plan gratuit : ✅ Suffisant pour commencer
- Bande passante : 100 GB/mois gratuit

**Azure (Backend)** :
- App Service B1 : ~13€/mois
- PostgreSQL Flexible : ~20€/mois
- **Total** : ~33€/mois

**Alternative moins chère** :
- Frontend : Vercel (gratuit)
- Backend : Railway.app (~5$/mois)
- Base de données : Supabase (gratuit jusqu'à 500 MB)
- **Total** : ~5€/mois

Veux-tu que je crée les fichiers de configuration complets pour le déploiement ?