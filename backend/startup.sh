#!/bin/bash

# Azure App Service startup script for FastAPI

echo "Starting CocoaTrack Backend..."

# Install dependencies if needed
pip install -r requirements.txt

# Run database migrations (if using Alembic)
# alembic upgrade head

# Start Gunicorn with Uvicorn workers
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
