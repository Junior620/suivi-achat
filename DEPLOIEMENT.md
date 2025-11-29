# Guide de Déploiement CocoaTrack

Ce guide détaille le processus complet de déploiement de l'application CocoaTrack sur Vercel (frontend) et Azure (backend).

## 📋 Prérequis

### Comptes nécessaires
- [ ] Compte GitHub avec le repository https://github.com/Junior620/suivi-achat.git
- [ ] Compte Vercel (gratuit) - https://vercel.com
- [ ] Compte Azure avec abonnement actif - https://azure.microsoft.com

### Outils à installer
- [ ] Git
- [ ] Azure CLI - https://docs.microsoft.com/cli/azure/install-azure-cli
- [ ] Node.js (pour Vercel CLI, optionnel)

## 🎯 Architecture de déploiement

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
    ┌────▼─────┐      ┌────▼──────┐
    │  Vercel  │      │   Azure   │
    │ Frontend │◄─────┤  Backend  │
    │   (PWA)  │ API  │  (FastAPI)│
    └──────────┘      └─────┬─────┘
                            │
                      ┌─────▼──────┐
                      │ PostgreSQL │
                      │   Azure    │
                      └────────────┘
```

## 🚀 Partie 1: Déploiement Backend sur Azure

### Étape 1: Connexion à Azure

```bash
# Se connecter à Azure
az login

# Vérifier l'abonnement actif
az account show

# (Optionnel) Changer d'abonnement si nécessaire
az account set --subscription "Nom ou ID de votre abonnement"
```

### Étape 2: Créer le groupe de ressources

```bash
# Créer un groupe de ressources en Europe de l'Ouest
az group create \
  --name cocoatrack-rg \
  --location westeurope
```

### Étape 3: Créer la base de données PostgreSQL

```bash
# Créer le serveur PostgreSQL Flexible
az postgres flexible-server create \
  --resource-group cocoatrack-rg \
  --name cocoatrack-db-$(date +%s) \
  --location westeurope \
  --admin-user admincocoa \
  --admin-password "CocoaTrack2024!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --public-access 0.0.0.0

# Créer la base de données
az postgres flexible-server db create \
  --resource-group cocoatrack-rg \
  --server-name cocoatrack-db-XXXXX \
  --database-name cocoatrack
```

**Note**: Remplacez `cocoatrack-db-XXXXX` par le nom généré.

### Étape 4: Configurer le firewall PostgreSQL

```bash
# Autoriser les services Azure
az postgres flexible-server firewall-rule create \
  --resource-group cocoatrack-rg \
  --name cocoatrack-db-XXXXX \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Étape 5: Créer l'App Service

```bash
# Créer le plan App Service (Linux)
az appservice plan create \
  --name cocoatrack-plan \
  --resource-group cocoatrack-rg \
  --sku B1 \
  --is-linux

# Créer la Web App
az webapp create \
  --resource-group cocoatrack-rg \
  --plan cocoatrack-plan \
  --name cocoatrack-api-$(date +%s) \
  --runtime "PYTHON:3.11"
```

**Note**: Notez le nom généré `cocoatrack-api-XXXXX`.

### Étape 6: Configurer les variables d'environnement

```bash
# Générer une clé secrète
SECRET_KEY=$(openssl rand -hex 32)

# Configurer les variables
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    DATABASE_URL="postgresql://admincocoa:CocoaTrack2024!@cocoatrack-db-XXXXX.postgres.database.azure.com:5432/cocoatrack?sslmode=require" \
    SECRET_KEY="$SECRET_KEY" \
    ALGORITHM="HS256" \
    ACCESS_TOKEN_EXPIRE_MINUTES="30" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" \
    CORS_ORIGINS="*"
```

### Étape 7: Déployer le code backend

```bash
# Se positionner dans le dossier backend
cd backend

# Créer un fichier .deployment à la racine du projet
cat > ../.deployment << EOF
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
EOF

# Déployer
az webapp up \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --runtime "PYTHON:3.11"
```

### Étape 8: Configurer le startup command

```bash
az webapp config set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --startup-file "bash startup.sh"
```

### Étape 9: Appliquer les migrations

```bash
# Se connecter en SSH à l'App Service
az webapp ssh \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX

# Une fois connecté, exécuter:
cd /home/site/wwwroot
alembic upgrade head
exit
```

### Étape 10: Vérifier le déploiement backend

```bash
# Tester l'API
curl https://cocoatrack-api-XXXXX.azurewebsites.net/api/v1/health

# Voir les logs
az webapp log tail \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX
```

**URL Backend**: `https://cocoatrack-api-XXXXX.azurewebsites.net`

---

## 🎨 Partie 2: Déploiement Frontend sur Vercel

### Étape 1: Préparer le repository GitHub

```bash
# S'assurer que tout est commité
git add .
git commit -m "Préparation déploiement Vercel"
git push origin main
```

### Étape 2: Connecter Vercel à GitHub

1. Aller sur https://vercel.com
2. Se connecter avec GitHub
3. Cliquer sur "Add New Project"
4. Importer le repository `Junior620/suivi-achat`

### Étape 3: Configurer le projet Vercel

Dans la configuration du projet:

**Framework Preset**: Other

**Root Directory**: `./` (laisser par défaut)

**Build Command**: (laisser vide)

**Output Directory**: `frontend`

**Install Command**: (laisser vide)

### Étape 4: Configurer les variables d'environnement

Dans Vercel Dashboard > Settings > Environment Variables, ajouter:

```
VITE_API_URL=https://cocoatrack-api-XXXXX.azurewebsites.net
```

### Étape 5: Déployer

Cliquer sur "Deploy"

Vercel va automatiquement:
- Cloner le repository
- Servir les fichiers du dossier `frontend`
- Générer une URL de production

**URL Frontend**: `https://suivi-achat-xxxxx.vercel.app`

### Étape 6: Mettre à jour le CORS sur Azure

```bash
# Mettre à jour les origines CORS autorisées
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    CORS_ORIGINS="https://suivi-achat-xxxxx.vercel.app,http://localhost:3000"
```

### Étape 7: Mettre à jour l'URL API dans le frontend

Modifier `frontend/js/api.js`:

```javascript
const API_BASE_URL = 'https://cocoatrack-api-XXXXX.azurewebsites.net/api/v1';
```

Puis commit et push:

```bash
git add frontend/js/api.js
git commit -m "Update API URL for production"
git push origin main
```

Vercel redéploiera automatiquement.

---

## ✅ Vérification finale

### Backend
- [ ] API accessible: `https://cocoatrack-api-XXXXX.azurewebsites.net/docs`
- [ ] Base de données connectée
- [ ] Migrations appliquées
- [ ] CORS configuré

### Frontend
- [ ] Application accessible: `https://suivi-achat-xxxxx.vercel.app`
- [ ] Connexion à l'API fonctionne
- [ ] PWA installable
- [ ] Service Worker actif

### Tests
1. Créer un compte utilisateur
2. Se connecter
3. Créer un planteur
4. Créer une livraison
5. Voir les analytics
6. Exporter en Excel/PDF
7. Tester les notifications

---

## 🔧 Maintenance

### Mettre à jour le backend

```bash
cd backend
git pull origin main
az webapp up --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
```

### Mettre à jour le frontend

```bash
git pull origin main
git push origin main
# Vercel redéploie automatiquement
```

### Voir les logs Azure

```bash
az webapp log tail --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
```

### Voir les logs Vercel

Dans Vercel Dashboard > Deployments > Cliquer sur un déploiement > Function Logs

---

## 💰 Coûts estimés

### Azure (par mois)
- App Service B1: ~13€
- PostgreSQL Flexible B1ms: ~15€
- **Total**: ~28€/mois

### Vercel
- Plan gratuit: 0€ (suffisant pour ce projet)

**Total estimé**: ~28€/mois

---

## 🆘 Dépannage

### Erreur "Database connection failed"
- Vérifier que le firewall PostgreSQL autorise Azure
- Vérifier la variable DATABASE_URL
- Vérifier que la base de données existe

### Erreur CORS
- Vérifier que l'URL Vercel est dans CORS_ORIGINS
- Redémarrer l'App Service: `az webapp restart --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX`

### Migrations non appliquées
- Se connecter en SSH et exécuter `alembic upgrade head`

### Frontend ne se connecte pas au backend
- Vérifier l'URL API dans `frontend/js/api.js`
- Vérifier que le backend est accessible
- Vérifier la console du navigateur pour les erreurs

---

## 📞 Support

Pour toute question, créer une issue sur GitHub: https://github.com/Junior620/suivi-achat/issues
