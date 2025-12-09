# 🚀 Guide de Déploiement CocoaTrack

## Architecture de Déploiement

- **Frontend**: Vercel (Gratuit, CDN global, SSL automatique)
- **Backend**: Azure App Service (Python 3.11, Gunicorn + Uvicorn)
- **Base de données**: Azure PostgreSQL Flexible Server
- **Stockage**: Azure Blob Storage (pour les uploads)

---

## 📦 Partie 1: Déploiement Frontend sur Vercel

### Prérequis
- Compte GitHub
- Compte Vercel (gratuit)

### Étapes

#### 1. Préparer le Repository
```bash
# S'assurer que tout est commité
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Déployer sur Vercel

**Option A: Via l'interface web**
1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer sur "New Project"
3. Importer votre repository GitHub
4. Configuration:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (laisser vide)
   - **Output Directory**: `frontend`
5. Cliquer sur "Deploy"

**Option B: Via CLI**
```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

#### 3. Configuration des Variables d'Environnement

Dans Vercel Dashboard > Settings > Environment Variables:
```
VITE_API_URL=https://votre-backend.azurewebsites.net/api/v1
```

#### 4. Domaine Personnalisé (Optionnel)
- Aller dans Settings > Domains
- Ajouter votre domaine personnalisé
- Configurer les DNS selon les instructions

---

## 🔧 Partie 2: Déploiement Backend sur Azure

### Prérequis
- Compte Azure (essai gratuit disponible)
- Azure CLI installé

### Installation Azure CLI

**Windows:**
```powershell
winget install Microsoft.AzureCLI
```

**macOS:**
```bash
brew install azure-cli
```

**Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Étapes de Déploiement

#### 1. Connexion à Azure
```bash
az login
```

#### 2. Créer les Ressources

```bash
# Variables
RESOURCE_GROUP="cocoatrack-rg"
LOCATION="westeurope"
APP_NAME="cocoatrack-api"
DB_SERVER="cocoatrack-db"
DB_NAME="cocoatrack"
DB_USER="cocoatrack"
DB_PASSWORD="VotreMotDePasseSecurise123!"

# Créer le groupe de ressources
az group create --name $RESOURCE_GROUP --location $LOCATION

# Créer l'App Service Plan (B1 = ~13€/mois)
az appservice plan create \
  --name cocoatrack-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Créer la Web App
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan cocoatrack-plan \
  --runtime "PYTHON:3.11"

# Créer PostgreSQL Flexible Server (B1ms = ~25€/mois)
az postgres flexible-server create \
  --name $DB_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $DB_USER \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0

# Créer la base de données
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name $DB_NAME

# Autoriser les services Azure
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 3. Configurer les Variables d'Environnement

```bash
# Construire l'URL de la base de données
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

# Configurer les variables
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    DATABASE_URL="$DB_URL" \
    JWT_SECRET="votre-secret-jwt-32-caracteres-minimum-changez-moi" \
    SECRET_KEY="votre-secret-key-32-caracteres-minimum-changez-moi" \
    JWT_ALGORITHM="HS256" \
    ACCESS_TOKEN_EXPIRE_MINUTES="30" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" \
    FRONTEND_URL="https://votre-app.vercel.app" \
    PYTHON_VERSION="3.11" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# Configurer le startup command
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "startup.sh"
```

#### 4. Déployer le Code

**Option A: Déploiement ZIP**
```bash
cd backend
zip -r ../backend.zip . -x "*.pyc" -x "__pycache__/*" -x "venv/*"
cd ..

az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src backend.zip
```

**Option B: Déploiement Git**
```bash
# Configurer le déploiement Git local
az webapp deployment source config-local-git \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Obtenir l'URL Git
GIT_URL=$(az webapp deployment source show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query url -o tsv)

# Ajouter le remote et pousser
git remote add azure $GIT_URL
git subtree push --prefix backend azure main
```

#### 5. Initialiser la Base de Données

```bash
# Se connecter à la base de données
psql "host=${DB_SERVER}.postgres.database.azure.com port=5432 dbname=${DB_NAME} user=${DB_USER} password=${DB_PASSWORD} sslmode=require"

# Créer un utilisateur admin
INSERT INTO users (id, email, password, name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@cocoatrack.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q0OXm',
    'Administrateur',
    'admin',
    true
);
```

#### 6. Vérifier le Déploiement

```bash
# Obtenir l'URL de l'application
az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostName -o tsv

# Tester l'API
curl https://${APP_NAME}.azurewebsites.net/
```

---

## 🔐 Sécurité Post-Déploiement

### 1. Configurer HTTPS (Automatique sur Azure)
Azure App Service fournit automatiquement un certificat SSL.

### 2. Configurer CORS
Le CORS est déjà configuré dans `backend/app/main.py`. Mettez à jour `FRONTEND_URL` dans les variables d'environnement.

### 3. Activer les Logs
```bash
az webapp log config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information

# Voir les logs en temps réel
az webapp log tail \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### 4. Configurer les Sauvegardes
```bash
# Créer un compte de stockage pour les backups
az storage account create \
  --name cocoatrackbackup \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Configurer la sauvegarde automatique de PostgreSQL
az postgres flexible-server backup create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --backup-name daily-backup
```

---

## 📊 Monitoring et Maintenance

### Application Insights (Recommandé)
```bash
# Créer Application Insights
az monitor app-insights component create \
  --app cocoatrack-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Lier à l'App Service
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app cocoatrack-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### Alertes
Configurer des alertes dans Azure Portal pour:
- Utilisation CPU > 80%
- Utilisation mémoire > 80%
- Erreurs HTTP 5xx
- Temps de réponse > 2s

---

## 💰 Estimation des Coûts

### Configuration Minimale (Développement)
- **Vercel**: Gratuit
- **Azure App Service B1**: ~13€/mois
- **PostgreSQL B1ms**: ~25€/mois
- **Total**: ~38€/mois

### Configuration Production (Recommandée)
- **Vercel Pro**: 20$/mois (optionnel)
- **Azure App Service P1V2**: ~75€/mois
- **PostgreSQL GP_Gen5_2**: ~150€/mois
- **Application Insights**: ~5€/mois
- **Total**: ~230€/mois

---

## 🔄 Mises à Jour

### Frontend (Vercel)
```bash
git push origin main
# Vercel déploie automatiquement
```

### Backend (Azure)
```bash
# Redéployer
az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src backend.zip

# Ou via Git
git subtree push --prefix backend azure main
```

---

## 🆘 Dépannage

### Logs Backend
```bash
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Redémarrer l'App
```bash
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Tester la Connexion DB
```bash
az postgres flexible-server connect \
  --name $DB_SERVER \
  --resource-group $RESOURCE_GROUP \
  --admin-user $DB_USER \
  --admin-password $DB_PASSWORD
```

---

## 📞 Support

- **Azure**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Issues**: GitHub Issues du projet

---

**Dernière mise à jour**: 8 décembre 2025
