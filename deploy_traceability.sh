#!/bin/bash

echo "🚀 Déploiement du système de traçabilité"
echo "========================================"

# Variables
RESOURCE_GROUP="cocoatrack-rg"
WEBAPP_NAME="cocoatrack-api-20251129203507"
DB_SERVER="cocoatrack-db-20251129201729"

echo ""
echo "📦 1. Push sur GitHub..."
git push origin main

echo ""
echo "☁️  2. Déploiement sur Azure..."
cd backend
az webapp up --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --runtime "PYTHON:3.11"
cd ..

echo ""
echo "🔄 3. Redémarrage de l'application..."
az webapp restart --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP

echo ""
echo "⏳ Attente du redémarrage (30s)..."
sleep 30

echo ""
echo "🗄️  4. Application de la migration..."
echo "   Vous devez vous connecter en SSH et exécuter:"
echo "   az webapp ssh --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP"
echo "   cd /home/site/wwwroot"
echo "   python apply_migration_016.py"
echo "   python generate_traceability_existing.py"

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🔗 URLs:"
echo "   Backend: https://$WEBAPP_NAME.azurewebsites.net"
echo "   API Docs: https://$WEBAPP_NAME.azurewebsites.net/docs"
echo "   Health: https://$WEBAPP_NAME.azurewebsites.net/health"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Connectez-vous en SSH pour appliquer la migration"
echo "   2. Testez l'API: curl https://$WEBAPP_NAME.azurewebsites.net/health"
echo "   3. Vérifiez la traçabilité: /api/v1/traceability/stats"
