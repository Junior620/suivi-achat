# Script de démarrage local pour CocoaTrack

Write-Host "🚀 Démarrage de CocoaTrack en local..." -ForegroundColor Cyan
Write-Host ""

# Vérifier Python
Write-Host "📦 Vérification de Python..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python n'est pas installé!" -ForegroundColor Red
    exit 1
}

# Activer l'environnement virtuel
Write-Host ""
Write-Host "🔧 Activation de l'environnement virtuel..." -ForegroundColor Yellow
cd backend
if (Test-Path venv\Scripts\Activate.ps1) {
    .\venv\Scripts\Activate.ps1
    Write-Host "✅ Environnement virtuel activé" -ForegroundColor Green
} else {
    Write-Host "❌ Environnement virtuel non trouvé. Création..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    Write-Host "✅ Environnement virtuel créé et activé" -ForegroundColor Green
}

# Installer les dépendances
Write-Host ""
Write-Host "📥 Installation des dépendances..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host "✅ Dépendances installées" -ForegroundColor Green

# Vérifier le fichier .env
Write-Host ""
if (Test-Path .env) {
    Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
} else {
    Write-Host "⚠️  Fichier .env non trouvé. Création depuis .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ Fichier .env créé. IMPORTANT: Configurez DATABASE_URL et SECRET_KEY!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env.example non trouvé!" -ForegroundColor Red
    }
}

# Démarrer le serveur
Write-Host ""
Write-Host "🌟 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📍 Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Yellow
Write-Host ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
