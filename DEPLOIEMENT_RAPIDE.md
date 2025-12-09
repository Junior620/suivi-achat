# Guide de Déploiement Rapide - CocoaTrack

## 🚀 Déploiement en 3 Étapes

### Étape 1: Frontend sur Vercel (✅ FAIT)

Le frontend est déjà déployé sur Vercel:
- URL: https://suivi-achat-zbq-vercel.app
- Déploiement automatique à chaque push sur `main`

### Étape 2: Backend sur Azure

#### Option A: Script Automatisé (Recommandé)

```powershell
# Ouvrir PowerShell en tant qu'administrateur
cd C:\Users\junio\OneDrive - Microsoft UG Cameroun\scpb-afrexia\app-suivi

# Déployer en production
.\deploy.ps1 -Environment prod
```

Le script va:
1. Créer le groupe de ressources Azure
2. Créer l'App Service (P1V2)
3. Créer PostgreSQL Flexible Server
4. Configurer les variables d'environnement
5. Déployer le code

**Informations à préparer:**
- Mot de passe PostgreSQL (min 8 caractères, complexe)
- JWT_SECRET (min 32 caractères aléatoires)
- SECRET_KEY (min 32 caractères aléatoires)
- URL Frontend: `https://suivi-achat-zbq-vercel.app`

#### Option B: Déploiement Manuel

```bash
# 1. Login Azure
az login

# 2. Créer les ressources
az group create --name cocoatrack-prod-rg --location westeurope

az appservice plan create \
  --name cocoatrack-plan \
  --resource-group cocoatrack-prod-rg \
  --sku P1V2 \
  --is-linux

az webapp create \
  --name cocoatrack-api \
  --resource-group cocoatrack-prod-rg \
  --plan cocoatrack-plan \
  --runtime "PYTHON:3.11"

# 3. Créer PostgreSQL
az postgres flexible-server create \
  --name cocoatrack-db \
  --resource-group cocoatrack-prod-rg \
  --location westeurope \
  --admin-user cocoatrack \
  --admin-password "VotreMotDePasse123!" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 15

# 4. Créer la base de données
az postgres flexible-server db create \
  --resource-group cocoatrack-prod-rg \
  --server-name cocoatrack-db \
  --database-name cocoatrack

# 5. Configurer les variables d'environnement
az webapp config appsettings set \
  --name cocoatrack-api \
  --resource-group cocoatrack-prod-rg \
  --settings \
    DATABASE_URL="postgresql://cocoatrack:PASSWORD@cocoatrack-db.postgres.database.azure.com:5432/cocoatrack?sslmode=require" \
    JWT_SECRET="votre-secret-32-caracteres-minimum" \
    SECRET_KEY="votre-secret-32-caracteres-minimum" \
    FRONTEND_URL="https://suivi-achat-zbq-vercel.app"

# 6. Déployer le code
cd backend
zip -r ../backend.zip .
cd ..
az webapp deployment source config-zip \
  --name cocoatrack-api \
  --resource-group cocoatrack-prod-rg \
  --src backend.zip
```

### Étape 3: Configuration Finale

#### 1. Mettre à jour l'URL du Backend dans Vercel

Modifier `frontend/js/config.js`:
```javascript
const API_CONFIG = {
    production: {
        baseURL: 'https://cocoatrack-api.azurewebsites.net/api/v1',
        wsURL: 'wss://cocoatrack-api.azurewebsites.net/ws'
    }
};
```

Puis:
```bash
git add frontend/js/config.js
git commit -m "Update production API URL"
git push origin main
```

#### 2. Créer un Utilisateur Admin

Se connecter à la base de données Azure:
```bash
az postgres flexible-server connect \
  --name cocoatrack-db \
  --admin-user cocoatrack \
  --admin-password "VotreMotDePasse"
```

Exécuter:
```sql
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

**Identifiants par défaut:**
- Email: `admin@cocoatrack.com`
- Mot de passe: `admin123`

⚠️ **IMPORTANT:** Changez ce mot de passe immédiatement après la première connexion!

#### 3. Tester le Déploiement

1. Ouvrir: https://suivi-achat-zbq-vercel.app
2. Se connecter avec les identifiants admin
3. Vérifier que toutes les fonctionnalités marchent:
   - Dashboard
   - Planteurs
   - Livraisons
   - Messagerie
   - Audit

## 📊 Monitoring

### Logs Azure

```bash
# Voir les logs en temps réel
az webapp log tail \
  --name cocoatrack-api \
  --resource-group cocoatrack-prod-rg

# Télécharger les logs
az webapp log download \
  --name cocoatrack-api \
  --resource-group cocoatrack-prod-rg \
  --log-file logs.zip
```

### Métriques

Accéder au portail Azure:
1. Aller sur https://portal.azure.com
2. Chercher "cocoatrack-api"
3. Voir les métriques: CPU, Mémoire, Requêtes, Temps de réponse

## 🔐 Sécurité Post-Déploiement

### Checklist Immédiate

- [ ] Changer le mot de passe admin par défaut
- [ ] Vérifier que HTTPS est actif (automatique sur Azure)
- [ ] Configurer les règles de firewall PostgreSQL
- [ ] Activer les sauvegardes automatiques
- [ ] Configurer les alertes de monitoring

### Sauvegardes PostgreSQL

```bash
# Activer les sauvegardes automatiques (7 jours)
az postgres flexible-server update \
  --name cocoatrack-db \
  --resource-group cocoatrack-prod-rg \
  --backup-retention 7

# Créer une sauvegarde manuelle
az postgres flexible-server backup create \
  --name cocoatrack-db \
  --resource-group cocoatrack-prod-rg \
  --backup-name manual-backup-$(date +%Y%m%d)
```

## 🆘 Dépannage

### Backend ne démarre pas

```bash
# Vérifier les logs
az webapp log tail --name cocoatrack-api --resource-group cocoatrack-prod-rg

# Redémarrer l'app
az webapp restart --name cocoatrack-api --resource-group cocoatrack-prod-rg
```

### Erreur de connexion à la base de données

```bash
# Vérifier que le firewall autorise Azure services
az postgres flexible-server firewall-rule list \
  --name cocoatrack-db \
  --resource-group cocoatrack-prod-rg

# Tester la connexion
az postgres flexible-server connect \
  --name cocoatrack-db \
  --admin-user cocoatrack
```

### Frontend ne se connecte pas au backend

1. Vérifier l'URL dans `config.js`
2. Vérifier les CORS dans Azure App Service
3. Vérifier que le backend est accessible: `https://cocoatrack-api.azurewebsites.net/`

## 💰 Coûts Estimés (Azure)

### Configuration Production (P1V2 + GP)
- App Service P1V2: ~70€/mois
- PostgreSQL GeneralPurpose: ~100€/mois
- Stockage: ~5€/mois
- **Total: ~175€/mois**

### Configuration Économique (B1 + Burstable)
- App Service B1: ~13€/mois
- PostgreSQL Burstable: ~15€/mois
- Stockage: ~2€/mois
- **Total: ~30€/mois**

## 📞 Support

En cas de problème:
1. Vérifier les logs Azure
2. Consulter DEPLOYMENT.md pour plus de détails
3. Contacter: admin@cocoatrack.com

---

**Dernière mise à jour:** 8 décembre 2025
