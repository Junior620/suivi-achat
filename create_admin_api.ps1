# Script pour créer un utilisateur admin via l'API

$apiUrl = "https://cocoatrack-api-prod.azurewebsites.net/api/v1"

Write-Host "Creation de l'utilisateur admin..." -ForegroundColor Cyan

# Données de l'utilisateur admin
$adminData = @{
    email = "admin@cocoatrack.com"
    password = "admin123"
    name = "Administrateur"
} | ConvertTo-Json

# Créer l'utilisateur via l'endpoint de registration
try {
    $response = Invoke-RestMethod -Uri "$apiUrl/auth/register" -Method Post -Body $adminData -ContentType "application/json"
    Write-Host "✓ Utilisateur admin cree avec succes!" -ForegroundColor Green
    Write-Host "Email: admin@cocoatrack.com" -ForegroundColor Yellow
    Write-Host "Mot de passe: admin123" -ForegroundColor Yellow
    Write-Host "`nVous pouvez maintenant vous connecter sur: https://suivi-achat-zbq-vercel.app" -ForegroundColor Cyan
} catch {
    Write-Host "Erreur lors de la creation de l'utilisateur:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Si l'utilisateur existe déjà, essayer de se connecter
    Write-Host "`nTentative de connexion avec les identifiants par defaut..." -ForegroundColor Yellow
    
    $loginData = @{
        email = "admin@cocoatrack.com"
        password = "admin123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginData -ContentType "application/json"
        Write-Host "✓ Connexion reussie! L'utilisateur admin existe deja." -ForegroundColor Green
        Write-Host "Token: $($loginResponse.access_token.Substring(0,50))..." -ForegroundColor Gray
    } catch {
        Write-Host "Impossible de se connecter. L'utilisateur n'existe peut-etre pas encore." -ForegroundColor Red
    }
}
