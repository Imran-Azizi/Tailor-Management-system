# Multi-Tenant Subdomain Setup

This project now supports tenant subdomains in the application code.

Use this format:

- `admin.hoshmandsafi.com` -> super admin
- `tenant1.hoshmandsafi.com` -> tenant with `slug = "tenant1"`
- `tenant2.hoshmandsafi.com` -> tenant with `slug = "tenant2"`

## 1. DNS records

In your DNS panel, point these records to your VPS IP:

- `A @ -> <your-vps-ip>`
- `A www -> <your-vps-ip>`
- `A admin -> <your-vps-ip>`
- `A * -> <your-vps-ip>`

The wildcard `*` record is what makes every tenant subdomain reach the VPS.

## 2. Wildcard SSL certificate

Normal SSL for only `hoshmandsafi.com` is not enough.
You need a certificate that covers:

- `hoshmandsafi.com`
- `*.hoshmandsafi.com`

Example target:

```bash
certbot certonly -d hoshmandsafi.com -d "*.hoshmandsafi.com"
```

If your DNS provider does not support automated DNS challenge plugins, use the
manual DNS challenge flow or move DNS to a provider that supports wildcard
automation.

## 3. nginx config

Use one nginx site that accepts both apex and wildcard subdomains and proxies
everything to the Node app.

```nginx
upstream tailor_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name hoshmandsafi.com *.hoshmandsafi.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hoshmandsafi.com *.hoshmandsafi.com;

    ssl_certificate /etc/letsencrypt/live/hoshmandsafi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hoshmandsafi.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://tailor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Connection "";
    }
}
```

After saving:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. VPS environment variables

### `backend/.env`

Set:

```env
NODE_ENV=production
PORT=8000
TRUST_PROXY=1
APP_PUBLIC_URL=https://hoshmandsafi.com
FRONTEND_URL=https://admin.hoshmandsafi.com
APP_ROOT_DOMAIN=hoshmandsafi.com
ADMIN_SUBDOMAIN=admin
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
SERVE_FRONTEND=true
```

Do not set a cookie domain. The app is designed to keep cookies host-only so a
tenant session stays locked to that tenant subdomain.

### `frontend/.env`

Set:

```env
VITE_API_URL=/api
VITE_ROOT_DOMAIN=hoshmandsafi.com
VITE_ADMIN_SUBDOMAIN=admin
```

`/api` is required so each subdomain talks to its own same-origin API:

- `tenant1.hoshmandsafi.com` -> `tenant1.hoshmandsafi.com/api`
- `admin.hoshmandsafi.com` -> `admin.hoshmandsafi.com/api`

## 5. Rebuild and restart

After updating env files on the VPS:

```bash
cd /var/www/Tailor-Management-system
npm --prefix backend install
npm --prefix frontend install
npm --prefix frontend run build
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
pm2 restart tailor-api --update-env
```

## 6. Create tenants

In the super admin dashboard, create or edit a tenant and set its subdomain.
The application stores that value in `Tenant.slug`.

Examples:

- `kabul-fashion`
- `ahmadi-tailor`
- `safi-menswear`

Reserved values like `admin`, `www`, and `api` are blocked.

## 7. Verify

Test these cases after deploy:

1. `https://admin.hoshmandsafi.com/login` opens the super admin login.
2. `https://tenant1.hoshmandsafi.com/login` shows tenant branding.
3. A tenant user can log in only on their own subdomain.
4. A tenant user on the wrong subdomain is redirected or blocked.
5. A super admin on a tenant subdomain is redirected or blocked.
6. `https://tenant1.hoshmandsafi.com/api/public/tenant-context` returns the correct tenant.
