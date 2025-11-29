#!/bin/bash

# Appliquer les migrations
alembic upgrade head

# Démarrer l'application
uvicorn app.main:app --host 0.0.0.0 --port 8000
