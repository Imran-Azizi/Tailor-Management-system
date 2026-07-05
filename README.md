# Tailor Management System — Hoshmand Safi

Monorepo: React frontend + Express/Prisma backend.

## Local development

```bash
# Backend
cd backend && npm install && cp .env.example .env
npm run dev

# Frontend (separate terminal)
cd frontend && npm install && cp .env.example .env
npm run dev
```

## Production (VPS — hoshmandsafi.com)

See **[docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md)** for full setup.

Quick redeploy on server:

```bash
git pull
bash deploy/redeploy.sh
```

Deploy configs live in `deploy/`:
- `deploy/nginx/hoshmandsafi.com.conf` — nginx reverse proxy
- `deploy/ecosystem.config.cjs` — PM2 backend process
- `deploy/env/` — production `.env` templates
