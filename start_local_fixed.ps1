# Script de démarrage avec variables d'environnement définies directement

Write-Host "🚀 Démarrage de CocoaTrack..." -ForegroundColor Cyan

# Aller dans le dossier backend
Set-Location backend

# Activer l'environnement virtuel
if (Test-Path venv\Scripts\Activate.ps1) {
    & .\venv\Scripts\Activate.ps1
    Write-Host "✅ Environnement virtuel activé" -ForegroundColor Green
} else {
    Write-Host "❌ Environnement virtuel non trouvé!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Vérifier que les dépendances sont installées
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow
$joseInstalled = & python -c "import jose; print('OK')" 2>$null
if ($joseInstalled -ne "OK") {
    Write-Host "📥 Installation des dépendances..." -ForegroundColor Yellow
    & pip install -r requirements.txt --quiet
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
}

# Définir les variables d'environnement directement
$env:DATABASE_URL = "postgresql://cocoatrack_admin:Cacao2024!Secure@cocoatrack-db-20251129201729.postgres.database.azure.com:5432/cocoatrack_db?sslmode=require"
$env:SECRET_KEY = "dev-secret-key-change-in-production-12345678901234567890"
$env:JWT_SECRET = "dev-secret-key-change-in-production-12345678901234567890"
$env:ALGORITHM = "HS256"
$env:JWT_ALGORITHM = "HS256"
$env:ACCESS_TOKEN_EXPIRE_MINUTES = "30"
$env:REFRESH_TOKEN_EXPIRE_DAYS = "7"
$env:CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"

Write-Host "✅ Variables d'environnement configurées" -ForegroundColor Green

# Démarrer le serveur
Write-Host ""
Write-Host "🌟 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📍 Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

& python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
