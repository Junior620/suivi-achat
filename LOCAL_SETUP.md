# 🚀 Configuration Locale - CocoaTrack

## ✅ Ce qui est fait

1. ✅ Page de maintenance déployée sur Vercel
2. ✅ Services Azure App Service supprimés
3. ✅ Base de données PostgreSQL Azure conservée et accessible

## 📋 Prérequis

- Python 3.11+
- Node.js (pour le frontend si nécessaire)
- PostgreSQL (ou utiliser la base Azure)

## 🔧 Configuration Backend Local

### 1. Créer l'environnement virtuel

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Installer les dépendances

```powershell
pip install -r requirements.txt
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` dans le dossier `backend/`:

```env
# Base de données Azure (existante)
DATABASE_URL=postgresql://cocoatrack_admin:Cacao2024!Secure@cocoatrack-db-20251129201729.postgres.database.azure.com:5432/cocoatrack_db?sslmode=require

# Sécurité
SECRET_KEY=votre-cle-secrete-super-longue-et-complexe
JWT_SECRET=votre-jwt-secret-super-long-et-complexe
ALGORITHM=HS256
JWT_ALGORITHM=HS256

# Tokens
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000
```

### 4. Vérifier la connexion à la base de données

```powershell
python -c "from app.database import engine; print('✅ Connexion réussie!' if engine.connect() else '❌ Échec')"
```

### 5. Appliquer les migrations (si nécessaire)

```powershell
alembic upgrade head
```

### 6. Démarrer le serveur

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur: http://localhost:8000
Documentation API: http://localhost:8000/docs

## 🌐 Configuration Frontend Local

### Option 1: Serveur Python simple

```powershell
cd frontend
python -m http.server 3000
```

### Option 2: Live Server (VS Code)

1. Installer l'extension "Live Server"
2. Clic droit sur `index.html` → "Open with Live Server"

## 🧪 Tests

### Tester l'API

```powershell
# Health check
curl http://localhost:8000/health

# Créer un utilisateur admin
curl -X POST http://localhost:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"email\":\"admin@cocoatrack.com\",\"password\":\"Admin123!\",\"role\":\"admin\"}"
```

## 📊 Base de données

La base de données PostgreSQL Azure est toujours active:
- **Serveur**: cocoatrack-db-20251129201729.postgres.database.azure.com
- **Base**: cocoatrack_db
- **User**: cocoatrack_admin

Toutes vos données sont préservées!

## 🔄 Prochaines étapes

1. ✅ Tester l'application en local
2. ✅ Corriger les éventuels bugs
3. ✅ Créer un nouveau déploiement Azure propre
4. ✅ Configurer GitHub Actions pour CI/CD automatique

## 🆘 Dépannage

### Erreur de connexion à la base de données

Vérifier que votre IP est autorisée dans Azure:
```powershell
az postgres flexible-server firewall-rule create ^
  --resource-group cocoatrack-rg ^
  --name cocoatrack-db-20251129201729 ^
  --rule-name AllowMyIP ^
  --start-ip-address VOTRE_IP ^
  --end-ip-address VOTRE_IP
```

### Port déjà utilisé

```powershell
# Trouver le processus
netstat -ano | findstr :8000

# Tuer le processus
taskkill /PID <PID> /F
```

## 📝 Notes

- La page de maintenance est active sur Vercel
- Les utilisateurs verront la page de maintenance jusqu'au prochain déploiement
- Toutes les données sont sécurisées dans la base Azure
