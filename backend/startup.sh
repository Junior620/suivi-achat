#!/bin/bash
set -e

echo "Starting CocoaTrack API..."
echo "Working directory: $(pwd)"
echo "Contents:"
ls -la

# Set PYTHONPATH
export PYTHONPATH=/home/site/wwwroot:$PYTHONPATH
echo "PYTHONPATH: $PYTHONPATH"

# Start uvicorn
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
