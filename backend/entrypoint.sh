#!/bin/bash
set -e

# Run migrations
python -m alembic upgrade head

# Seed activities (will skip if already exists, unless --force is used)
python scripts/seed_activities.py

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
