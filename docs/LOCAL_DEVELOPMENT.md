# Local Development

This project is now set up to run locally again on your computer.

## Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

The frontend uses Vite proxy mode locally, so browser requests to `/api` go to
the backend automatically.

## Current local env setup

### `frontend/.env`

```env
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:8000
```

### `backend/.env`

Important local values:

```env
PORT=8000
FRONTEND_URL=http://localhost:5173
APP_PUBLIC_URL=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
BACKUP_ENABLED=false
```

## First-time local setup

From the project root:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## Database setup

Make sure PostgreSQL is running locally and that the database in `backend/.env`
exists.

Then run:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

If you want sample local data:

```bash
npm --prefix backend run db:seed
```

## Start locally

Use two terminals.

### Terminal 1: backend

```bash
cd backend
npm run dev
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

## How local mode behaves

- Subdomain enforcement is bypassed on `localhost`
- Login on `localhost` stays on `localhost`
- API calls use `/api` and are proxied by Vite to the backend
- Cookies are local-safe because `COOKIE_SECURE=false`

## When you are ready to deploy to VPS again

Before rebuilding on the VPS, switch the VPS env files back to production
values:

### VPS `frontend/.env`

```env
VITE_API_URL=/api
VITE_ROOT_DOMAIN=hoshmandsafi.com
VITE_ADMIN_SUBDOMAIN=admin
```

### VPS `backend/.env`

```env
APP_PUBLIC_URL=https://hoshmandsafi.com
FRONTEND_URL=https://admin.hoshmandsafi.com
APP_ROOT_DOMAIN=hoshmandsafi.com
ADMIN_SUBDOMAIN=admin
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Then rebuild on the VPS:

```bash
cd /var/www/Tailor-Management-system
npm --prefix frontend run build
pm2 restart tailor-api --update-env
```
