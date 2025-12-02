#!/bin/bash

# Test d'import pour debug
echo "Testing Python imports..."
python -c "from app.main import app; print('Import successful!')" || echo "Import failed!"

# Démarrer uvicorn
echo "Starting uvicorn..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
