#!/bin/sh
set -e
# DATABASE_URL is provided at runtime (env var or env_file)
echo "Running migrations..."
alembic upgrade head
echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
