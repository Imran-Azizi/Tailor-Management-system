#!/usr/bin/env bash
# First-time VPS setup for Ubuntu/Debian.
# Run as a user with sudo access.
#
# Prerequisites on VPS:
#   - Node.js 20+
#   - PostgreSQL
#   - nginx
#   - git
#   - pm2: npm install -g pm2
#
# Usage:
#   git clone <your-repo> /var/www/Tailor-Management-system
#   cd /var/www/Tailor-Management-system
#   bash deploy/vps-setup.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Creating runtime directories..."
mkdir -p backend/uploads backend/storage backend/tmp

echo "==> Setting up backend environment..."
if [ ! -f backend/.env ]; then
  cp deploy/env/backend.production.env.example backend/.env
  echo "Created backend/.env — edit DATABASE_URL and JWT secrets before continuing."
fi

echo "==> Setting up frontend environment..."
if [ ! -f frontend/.env ]; then
  cp deploy/env/frontend.production.env.example frontend/.env
fi

echo "==> Installing dependencies and building..."
npm --prefix backend install --omit=dev
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Database setup..."
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate:deploy
echo "Run seed once if this is a fresh install:"
echo "  npm --prefix backend run db:seed"

echo "==> Starting API with PM2..."
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo "==> Installing nginx site config..."
sudo cp deploy/nginx/hoshmandsafi.com.conf /etc/nginx/sites-available/hoshmandsafi.com
sudo ln -sf /etc/nginx/sites-available/hoshmandsafi.com /etc/nginx/sites-enabled/hoshmandsafi.com
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Setup complete."
echo "1. Edit backend/.env (database + secrets)"
echo "2. Seed admin user: npm --prefix backend run db:seed"
echo "3. Verify: bash deploy/verify-deployment.sh"
echo "4. Enable HTTPS: sudo certbot --nginx -d hoshmandsafi.com -d www.hoshmandsafi.com"
