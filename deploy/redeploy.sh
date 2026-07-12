#!/usr/bin/env bash
# Full redeploy on VPS after git pull.
# Usage: bash deploy/redeploy.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing backend dependencies..."
npm --prefix backend install --omit=dev

echo "==> Installing frontend dependencies..."
npm --prefix frontend install

echo "==> Building frontend..."
npm --prefix frontend run build

echo "==> Running database migrations..."
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate:deploy

echo "==> Restarting API with PM2..."
if pm2 describe tailor-api >/dev/null 2>&1; then
  pm2 restart deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save

echo "==> Verifying deployment..."
bash deploy/verify-deployment.sh

echo "Done. Site: http://hoshmandsafi.com"
