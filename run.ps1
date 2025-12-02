$env:DATABASE_URL = "postgresql://admincocoa:CocoaSecure2024!@cocoatrack-db-20251129201729.postgres.database.azure.com:5432/cocoatrack?sslmode=require"
$env:SECRET_KEY = "dev-secret-key-change-in-production-12345678901234567890"
$env:JWT_SECRET = "dev-secret-key-change-in-production-12345678901234567890"
$env:ALGORITHM = "HS256"
$env:JWT_ALGORITHM = "HS256"
$env:ACCESS_TOKEN_EXPIRE_MINUTES = "30"
$env:REFRESH_TOKEN_EXPIRE_DAYS = "7"
$env:CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"

Write-Host "✅ Variables configurées" -ForegroundColor Green
Write-Host "📍 Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
