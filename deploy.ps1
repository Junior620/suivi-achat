# Script de déploiement automatisé pour CocoaTrack
# Usage: .\deploy.ps1 -Environment [dev|prod]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev','prod')]
    [string]$Environment
)

Write-Host "🚀 Déploiement CocoaTrack - Environnement: $Environment" -ForegroundColor Green

# Configuration
$ResourceGroup = "cocoatrack-$Environment-rg"
$Location = "westeurope"
$AppName = "cocoatrack-api-$Environment"
$DbServer = "cocoatrack-db-$Environment"
$DbName = "cocoatrack"
$DbUser = "cocoatrack"

# Vérifier si Azure CLI est installé
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI n'est pas installé. Installez-le avec: winget install Microsoft.AzureCLI" -ForegroundColor Red
    exit 1
}

# Login Azure
Write-Host "`n📝 Connexion à Azure..." -ForegroundColor Cyan
az login

# Créer le groupe de ressources
Write-Host "`n📦 Création du groupe de ressources..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

# Créer l'App Service Plan
Write-Host "`n🏗️ Création de l'App Service Plan..." -ForegroundColor Cyan
if ($Environment -eq "prod") {
    $Sku = "P1V2"
} else {
    $Sku = "B1"
}

az appservice plan create `
    --name "$AppName-plan" `
    --resource-group $ResourceGroup `
    --sku $Sku `
    --is-linux

# Créer la Web App
Write-Host "`n🌐 Création de la Web App..." -ForegroundColor Cyan
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --plan "$AppName-plan" `
    --runtime "PYTHON:3.11"

# Demander le mot de passe de la base de données
$DbPassword = Read-Host "Entrez le mot de passe pour PostgreSQL (min 8 caractères)" -AsSecureString
$DbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
)

# Créer PostgreSQL
Write-Host "`n🗄️ Création de PostgreSQL Flexible Server..." -ForegroundColor Cyan
if ($Environment -eq "prod") {
    $DbSku = "Standard_D2s_v3"
    $DbTier = "GeneralPurpose"
} else {
    $DbSku = "Standard_B1ms"
    $DbTier = "Burstable"
}

az postgres flexible-server create `
    --name $DbServer `
    --resource-group $ResourceGroup `
    --location $Location `
    --admin-user $DbUser `
    --admin-password $DbPasswordPlain `
    --sku-name $DbSku `
    --tier $DbTier `
    --storage-size 32 `
    --version 15 `
    --public-access 0.0.0.0

# Créer la base de données
Write-Host "`n📊 Création de la base de données..." -ForegroundColor Cyan
az postgres flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name $DbServer `
    --database-name $DbName

# Configurer le firewall
Write-Host "`n🔥 Configuration du firewall..." -ForegroundColor Cyan
az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $DbServer `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Demander les secrets
$JwtSecret = Read-Host "Entrez le JWT_SECRET (min 32 caractères)" -AsSecureString
$JwtSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($JwtSecret)
)

$SecretKey = Read-Host "Entrez le SECRET_KEY (min 32 caractères)" -AsSecureString
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey)
)

$FrontendUrl = Read-Host "Entrez l'URL du frontend Vercel (ex: https://cocoatrack.vercel.app)"

# Configurer les variables d'environnement
Write-Host "`n⚙️ Configuration des variables d'environnement..." -ForegroundColor Cyan
$DbUrl = "postgresql://${DbUser}:${DbPasswordPlain}@${DbServer}.postgres.database.azure.com:5432/${DbName}?sslmode=require"

az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        DATABASE_URL="$DbUrl" `
        JWT_SECRET="$JwtSecretPlain" `
        SECRET_KEY="$SecretKeyPlain" `
        JWT_ALGORITHM="HS256" `
        ACCESS_TOKEN_EXPIRE_MINUTES="30" `
        REFRESH_TOKEN_EXPIRE_DAYS="7" `
        FRONTEND_URL="$FrontendUrl" `
        PYTHON_VERSION="3.11" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# Configurer le startup command
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "startup.sh"

# Créer le package de déploiement
Write-Host "`n📦 Création du package de déploiement..." -ForegroundColor Cyan
Push-Location backend
Compress-Archive -Path * -DestinationPath ../backend.zip -Force
Pop-Location

# Déployer
Write-Host "`n🚀 Déploiement du code..." -ForegroundColor Cyan
az webapp deployment source config-zip `
    --name $AppName `
    --resource-group $ResourceGroup `
    --src backend.zip

# Nettoyer
Remove-Item backend.zip

# Obtenir l'URL
$AppUrl = az webapp show `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query defaultHostName -o tsv

Write-Host "`n✅ Déploiement terminé!" -ForegroundColor Green
Write-Host "`n📍 URL de l'API: https://$AppUrl" -ForegroundColor Yellow
Write-Host "`n📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Déployez le frontend sur Vercel avec l'URL: https://$AppUrl/api/v1"
Write-Host "2. Créez un utilisateur admin dans la base de données"
Write-Host "3. Testez l'API: https://$AppUrl/"
Write-Host "`n💡 Pour voir les logs: az webapp log tail --name $AppName --resource-group $ResourceGroup"
