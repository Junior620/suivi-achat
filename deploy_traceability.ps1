# Script de déploiement du système de traçabilité

Write-Host "🚀 Déploiement du système de traçabilité" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Variables
$RESOURCE_GROUP = "cocoatrack-rg"
$WEBAPP_NAME = "cocoatrack-api-20251129203507"
$DB_SERVER = "cocoatrack-db-20251129201729"

Write-Host ""
Write-Host "📦 1. Push sur GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "☁️  2. Déploiement sur Azure..." -ForegroundColor Cyan
Set-Location backend
az webapp up --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --runtime "PYTHON:3.11"
Set-Location ..

Write-Host ""
Write-Host "🔄 3. Redémarrage de l'application..." -ForegroundColor Cyan
az webapp restart --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP

Write-Host ""
Write-Host "⏳ Attente du redémarrage (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "🗄️  4. Application de la migration..." -ForegroundColor Cyan
Write-Host "   Vous devez vous connecter en SSH et exécuter:" -ForegroundColor Yellow
Write-Host "   az webapp ssh --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor White
Write-Host "   cd /home/site/wwwroot" -ForegroundColor White
Write-Host "   python apply_migration_016.py" -ForegroundColor White
Write-Host "   python generate_traceability_existing.py" -ForegroundColor White

Write-Host ""
Write-Host "✅ Déploiement terminé!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "   Backend: https://$WEBAPP_NAME.azurewebsites.net" -ForegroundColor White
Write-Host "   API Docs: https://$WEBAPP_NAME.azurewebsites.net/docs" -ForegroundColor White
Write-Host "   Health: https://$WEBAPP_NAME.azurewebsites.net/health" -ForegroundColor White
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Connectez-vous en SSH pour appliquer la migration" -ForegroundColor White
Write-Host "   2. Testez l'API: curl https://$WEBAPP_NAME.azurewebsites.net/health" -ForegroundColor White
Write-Host "   3. Vérifiez la traçabilité: /api/v1/traceability/stats" -ForegroundColor White
