#!/bin/bash

# Script de déploiement automatisé sur Azure
# Usage: ./deploy-azure.sh

set -e

echo "🚀 Déploiement CocoaTrack sur Azure"
echo "===================================="

# Variables
RESOURCE_GROUP="cocoatrack-rg"
LOCATION="westeurope"
APP_NAME="cocoatrack-api-$(date +%s)"
DB_NAME="cocoatrack-db-$(date +%s)"
DB_USER="admincocoa"
DB_PASSWORD="CocoaTrack2024!"
PLAN_NAME="cocoatrack-plan"

echo ""
echo "📝 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Name: $APP_NAME"
echo "  DB Name: $DB_NAME"
echo ""

read -p "Continuer? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# 1. Créer le groupe de ressources
echo ""
echo "1️⃣  Création du groupe de ressources..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Créer la base de données PostgreSQL
echo ""
echo "2️⃣  Création de la base de données PostgreSQL..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --location $LOCATION \
  --admin-user $DB_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --public-access 0.0.0.0

# 3. Créer la base de données
echo ""
echo "3️⃣  Création de la base de données cocoatrack..."
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_NAME \
  --database-name cocoatrack

# 4. Configurer le firewall
echo ""
echo "4️⃣  Configuration du firewall..."
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 5. Créer le plan App Service
echo ""
echo "5️⃣  Création du plan App Service..."
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# 6. Créer la Web App
echo ""
echo "6️⃣  Création de la Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_NAME \
  --runtime "PYTHON:3.11"

# 7. Générer une clé secrète
echo ""
echo "7️⃣  Génération de la clé secrète..."
SECRET_KEY=$(openssl rand -hex 32)

# 8. Configurer les variables d'environnement
echo ""
echo "8️⃣  Configuration des variables d'environnement..."
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_NAME.postgres.database.azure.com:5432/cocoatrack?sslmode=require"

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    SECRET_KEY="$SECRET_KEY" \
    JWT_SECRET="$SECRET_KEY" \
    ALGORITHM="HS256" \
    JWT_ALGORITHM="HS256" \
    ACCESS_TOKEN_EXPIRE_MINUTES="30" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" \
    CORS_ORIGINS="*" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# 9. Configurer le startup command
echo ""
echo "9️⃣  Configuration du startup command..."
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "bash startup.sh"

# 10. Déployer le code
echo ""
echo "🔟 Déploiement du code..."
cd backend
az webapp up \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --runtime "PYTHON:3.11"
cd ..

# 11. Attendre que l'app soit prête
echo ""
echo "⏳ Attente du démarrage de l'application..."
sleep 30

# 12. Appliquer les migrations
echo ""
echo "🔄 Application des migrations..."
echo "Connectez-vous en SSH et exécutez:"
echo "  az webapp ssh --resource-group $RESOURCE_GROUP --name $APP_NAME"
echo "  cd /home/site/wwwroot"
echo "  alembic upgrade head"
echo "  exit"
echo ""

# Résumé
echo ""
echo "✅ Déploiement terminé!"
echo "======================"
echo ""
echo "📋 Informations importantes:"
echo "  Backend URL: https://$APP_NAME.azurewebsites.net"
echo "  API Docs: https://$APP_NAME.azurewebsites.net/docs"
echo "  Database: $DB_NAME.postgres.database.azure.com"
echo "  Database User: $DB_USER"
echo "  Database Password: $DB_PASSWORD"
echo "  Secret Key: $SECRET_KEY"
echo ""
echo "⚠️  IMPORTANT: Sauvegardez ces informations dans un endroit sûr!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Appliquer les migrations (voir commandes ci-dessus)"
echo "  2. Mettre à jour CORS_ORIGINS avec l'URL Vercel"
echo "  3. Déployer le frontend sur Vercel"
echo "  4. Mettre à jour l'URL API dans frontend/js/api.js"
echo ""
