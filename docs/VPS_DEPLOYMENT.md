# VPS Deployment — hoshmandsafi.com

Deploy the Tailor Management System on a single VPS with **nginx** (frontend + reverse proxy) and **PM2** (Node.js API on port 8000).

## Architecture

```
Browser → nginx (port 80/443) → Node.js (port 8000)
                                      ├── /api/*     API routes
                                      ├── /uploads/* uploaded files
                                      └── /*         React SPA (frontend/dist)
```

Node serves **both** the API and the built frontend. nginx forwards **all** traffic to port 8000.

## Why `/api/auth/csrf` returns 404

Your nginx is serving only static files (`try_files`) and **not** forwarding `/api` to Node.

**Fix:** use the simplified config in `deploy/nginx/hoshmandsafi.com.conf` (proxy everything to port 8000).

---

## First-time setup

```bash
# On VPS
git clone <your-repo-url> /var/www/Tailor-Management-system
cd /var/www/Tailor-Management-system

# Install: Node 20+, PostgreSQL, nginx, pm2
npm install -g pm2

bash deploy/vps-setup.sh
```

Then:

1. Edit `backend/.env` — set `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`
2. Seed admin user (once): `npm --prefix backend run db:seed`
3. Verify: `bash deploy/verify-deployment.sh`

---

## Environment files

### `backend/.env` (production)

```env
NODE_ENV=production
PORT=8000
TRUST_PROXY=1
APP_PUBLIC_URL=http://hoshmandsafi.com
FRONTEND_URL=http://hoshmandsafi.com
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CSRF_SECRET=...
```

After enabling HTTPS, update:
```env
APP_PUBLIC_URL=https://hoshmandsafi.com
FRONTEND_URL=https://hoshmandsafi.com
COOKIE_SECURE=true
```

### `frontend/.env` (before build)

```env
VITE_API_URL=http://hoshmandsafi.com/api
```

After enabling HTTPS, update:
```env
VITE_API_URL=https://hoshmandsafi.com/api
```

Rebuild after any change: `npm --prefix frontend run build`

---

## Updates / redeploy

```bash
cd /var/www/Tailor-Management-system
git pull
bash deploy/redeploy.sh
```

---

## Manual verification

```bash
# Backend running locally on VPS
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/auth/csrf

# Through nginx (public)
curl http://hoshmandsafi.com/api/health
curl http://hoshmandsafi.com/api/auth/csrf
```

Expected CSRF response: `{"csrfToken":"..."}`

---

## PM2 commands

```bash
pm2 status
pm2 logs tailor-api
pm2 restart tailor-api
```

---

## Enable HTTPS (recommended)

```bash
sudo certbot --nginx -d hoshmandsafi.com -d www.hoshmandsafi.com
```

Then update `backend/.env` cookie settings for HTTPS and restart PM2.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `GET /api/auth/csrf 404` | Install nginx config from `deploy/nginx/`; ensure backend is running on port 8000 |
| CORS blocked | Set `FRONTEND_URL=http://hoshmandsafi.com` in `backend/.env`; restart API |
| Login succeeds but session lost | On HTTP use `COOKIE_SECURE=false`; on HTTPS use `COOKIE_SECURE=true` |
| Database errors | Check `DATABASE_URL`; run `npx --prefix backend prisma migrate deploy` |
| Build fails on missing ReportKit | Ensure `frontend/src/components/reports/` is committed (not gitignored) |
