# 🚀 Guide Rapide de Déploiement

Guide ultra-simplifié pour déployer CocoaTrack en production.

## 🎯 Vue d'ensemble

1. **Backend** → Azure App Service (Python + PostgreSQL)
2. **Frontend** → Vercel (Static hosting)

**Temps estimé**: 30-45 minutes

---

## 📋 Ce dont vous avez besoin

- [ ] Compte Azure (avec carte bancaire)
- [ ] Compte Vercel (gratuit)
- [ ] Compte GitHub (repository: https://github.com/Junior620/suivi-achat.git)
- [ ] Azure CLI installé

---

## ⚡ Déploiement Express

### Étape 1: Backend sur Azure (15 min)

```bash
# 1. Se connecter à Azure
az login

# 2. Créer le groupe de ressources
az group create --name cocoatrack-rg --location westeurope

# 3. Créer la base de données
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

# 4. Noter le nom de la base de données (cocoatrack-db-XXXXX)
# Créer la base
az postgres flexible-server db create \
  --resource-group cocoatrack-rg \
  --server-name cocoatrack-db-XXXXX \
  --database-name cocoatrack

# 5. Autoriser Azure
az postgres flexible-server firewall-rule create \
  --resource-group cocoatrack-rg \
  --name cocoatrack-db-XXXXX \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 6. Créer l'App Service
az appservice plan create \
  --name cocoatrack-plan \
  --resource-group cocoatrack-rg \
  --sku B1 \
  --is-linux

az webapp create \
  --resource-group cocoatrack-rg \
  --plan cocoatrack-plan \
  --name cocoatrack-api-$(date +%s) \
  --runtime "PYTHON:3.11"

# 7. Noter le nom de l'app (cocoatrack-api-XXXXX)
# Configurer les variables
SECRET_KEY=$(openssl rand -hex 32)

az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    DATABASE_URL="postgresql://admincocoa:CocoaTrack2024!@cocoatrack-db-XXXXX.postgres.database.azure.com:5432/cocoatrack?sslmode=require" \
    SECRET_KEY="$SECRET_KEY" \
    JWT_SECRET="$SECRET_KEY" \
    ALGORITHM="HS256" \
    ACCESS_TOKEN_EXPIRE_MINUTES="30" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" \
    CORS_ORIGINS="*"

# 8. Configurer le startup
az webapp config set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --startup-file "bash startup.sh"

# 9. Déployer
cd backend
az webapp up \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --runtime "PYTHON:3.11"
cd ..

# 10. Appliquer les migrations
az webapp ssh --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
# Dans le SSH:
cd /home/site/wwwroot
alembic upgrade head
exit
```

**✅ Backend prêt**: `https://cocoatrack-api-XXXXX.azurewebsites.net`

---

### Étape 2: Frontend sur Vercel (10 min)

#### Via l'interface web (plus simple)

1. Aller sur https://vercel.com
2. Se connecter avec GitHub
3. Cliquer "Add New Project"
4. Importer `Junior620/suivi-achat`
5. Configuration:
   - Root Directory: `./`
   - Output Directory: `frontend`
   - Build Command: (vide)
6. Cliquer "Deploy"

**✅ Frontend prêt**: `https://cocoatrack-xxxxx.vercel.app`

---

### Étape 3: Connecter Frontend et Backend (5 min)

#### 1. Mettre à jour l'URL API

Modifier `frontend/js/api.js` ligne 6:

```javascript
if (window.location.hostname.includes('vercel.app')) {
    return 'https://cocoatrack-api-XXXXX.azurewebsites.net/api/v1';
}
```

#### 2. Mettre à jour CORS

```bash
az webapp config appsettings set \
  --resource-group cocoatrack-rg \
  --name cocoatrack-api-XXXXX \
  --settings \
    CORS_ORIGINS="https://cocoatrack-xxxxx.vercel.app,http://localhost:3000"
```

#### 3. Commit et push

```bash
git add frontend/js/api.js
git commit -m "Update API URL for production"
git push origin main
```

Vercel redéploie automatiquement.

---

## ✅ Vérification

### Backend
```bash
curl https://cocoatrack-api-XXXXX.azurewebsites.net/docs
```

### Frontend
Ouvrir: `https://cocoatrack-xxxxx.vercel.app`

### Test complet
1. Créer un compte
2. Se connecter
3. Créer un planteur
4. Créer une livraison
5. Voir les analytics

---

## 🎉 C'est fait !

Votre application est en ligne:

- **Frontend**: `https://cocoatrack-xxxxx.vercel.app`
- **Backend**: `https://cocoatrack-api-XXXXX.azurewebsites.net`
- **API Docs**: `https://cocoatrack-api-XXXXX.azurewebsites.net/docs`

---

## 🔄 Mises à jour

### Backend
```bash
cd backend
git pull
az webapp up --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
```

### Frontend
```bash
git pull
git push origin main
# Vercel redéploie automatiquement
```

---

## 💰 Coûts

- **Azure**: ~28€/mois (App Service B1 + PostgreSQL B1ms)
- **Vercel**: Gratuit

---

## 🆘 Problèmes ?

### Backend ne répond pas
```bash
az webapp log tail --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
az webapp restart --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
```

### Frontend ne se connecte pas
1. Vérifier l'URL dans `api.js`
2. Vérifier CORS sur Azure
3. Vider le cache du navigateur

### Migrations
```bash
az webapp ssh --resource-group cocoatrack-rg --name cocoatrack-api-XXXXX
cd /home/site/wwwroot
alembic upgrade head
```

---

## 📚 Documentation complète

Pour plus de détails, voir:
- `DEPLOIEMENT.md` - Guide détaillé
- `CHECKLIST_DEPLOIEMENT.md` - Checklist complète
- `deploy-vercel.md` - Guide Vercel détaillé

---

**Bon déploiement ! 🚀**
