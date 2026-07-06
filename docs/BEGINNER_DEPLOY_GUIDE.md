# Complete Beginner Deployment Guide — hoshmandsafi.com

This guide takes you from a brand-new ShahHost VPS to a fully working system at
**http://hoshmandsafi.com**. Follow the steps in order. Copy-paste each command
exactly. Do not skip steps.

**Your server details (from ShahHost panel):**

| Item | Value |
|------|-------|
| VPS IP address | `164.68.121.90` |
| Operating system | Ubuntu 22.04 LTS |
| SSH login | `ssh root@164.68.121.90` |
| Domain | `hoshmandsafi.com` |

---

## Step 0 — Point your domain to the VPS (DNS)

Before anything else, your domain must point to your server's IP address.

1. Log in to the website where you bought **hoshmandsafi.com** (domain panel, e.g. ShahHost → Domain).
2. Find **DNS settings** / **DNS management** / **Manage DNS** for the domain.
3. Create these two records (delete any old A records first):

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| A | `@` (or blank, means hoshmandsafi.com) | `164.68.121.90` | default |
| A | `www` | `164.68.121.90` | default |

4. Wait 10–60 minutes for DNS to spread across the internet.
5. Test from your Windows PC in PowerShell:

```powershell
nslookup hoshmandsafi.com
```

When it answers with `164.68.121.90`, DNS is ready. You can continue with the
server setup while you wait — just don't do the HTTPS step until DNS works.

---

## Step 1 — Connect to your VPS

Open **PowerShell** on your Windows PC and run:

```powershell
ssh root@164.68.121.90
```

- The first time it asks *"Are you sure you want to continue connecting?"* — type `yes` and press Enter.
- Enter the root password from your ShahHost panel (the password does not show while typing — that is normal).

You are now "inside" the server. All commands below run **on the server**, not on your PC.

---

## Step 2 — Update the server

```bash
apt update && apt upgrade -y
```

If a purple screen asks about restarting services, just press Enter (OK).

---

## Step 3 — Install the required software

### 3.1 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should print v20.x.x
```

### 3.2 PostgreSQL (database)

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

### 3.3 nginx (web server) and git

```bash
apt install -y nginx git
systemctl enable --now nginx
```

### 3.4 PM2 (keeps the app running forever, restarts it after reboot)

```bash
npm install -g pm2
```

---

## Step 4 — Set up the firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

You should see OpenSSH and Nginx Full as ALLOW. (This protects the server but
keeps SSH and the website reachable.)

---

## Step 5 — Create the database

Pick a **strong database password** and write it down. Then run (replace
`YOUR_STRONG_PASSWORD` — keep the quotes):

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'YOUR_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE tailor_management_system;"
```

If the second command says *"already exists"*, that is fine.

---

## Step 6 — Get the project code onto the server

```bash
git clone <YOUR-REPO-URL> /var/www/Tailor-Management-system
cd /var/www/Tailor-Management-system
```

Replace `<YOUR-REPO-URL>` with your GitHub repository URL (e.g.
`https://github.com/yourname/tailor-system.git`). If the repo is private, GitHub
will ask for your username and a **personal access token** (not your normal
password — create one at GitHub → Settings → Developer settings → Personal
access tokens).

If the code is already cloned from before, just update it instead:

```bash
cd /var/www/Tailor-Management-system
git pull
```

---

## Step 7 — Create the environment files

### 7.1 Backend

```bash
cp deploy/env/backend.production.env.example backend/.env
nano backend/.env
```

`nano` is a simple text editor. Edit these lines (move with arrow keys):

```env
NODE_ENV=production
PORT=8000
TRUST_PROXY=1
APP_PUBLIC_URL=http://hoshmandsafi.com
FRONTEND_URL=http://hoshmandsafi.com
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
SERVE_FRONTEND=true

# Use the database password from Step 5:
DATABASE_URL="postgresql://postgres:YOUR_STRONG_PASSWORD@localhost:5432/tailor_management_system"

# Replace with long random text (40+ characters, different for each one):
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
CSRF_SECRET="..."
```

Tip — generate three random secrets by running this three times:

```bash
openssl rand -base64 48
```

Save and exit nano: press `Ctrl+O`, Enter, then `Ctrl+X`.

If you also want automatic email backups, additionally add your backup/SMTP
settings (`BACKUP_ENABLED=true`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`,
`BACKUP_EMAIL_TO`, `BACKUP_ENCRYPTION_KEY`, ...). You can copy these values from
your local `backend/.env` — but this is optional and can be done later.

### 7.2 Frontend

```bash
cp deploy/env/frontend.production.env.example frontend/.env
cat frontend/.env
```

It must contain:

```env
VITE_API_URL=http://hoshmandsafi.com/api
```

**Important:** this value is baked into the frontend at build time. If you ever
change it, you must rebuild the frontend (Step 8).

---

## Step 8 — Install, build, and set up the database

```bash
cd /var/www/Tailor-Management-system

mkdir -p backend/uploads backend/storage backend/tmp

npm --prefix backend install --omit=dev
npm --prefix frontend install
npm --prefix frontend run build

npm --prefix backend run prisma:generate
npx --prefix backend prisma migrate deploy
```

The frontend build takes a few minutes. At the end you should have a
`frontend/dist` folder — check with:

```bash
ls frontend/dist/index.html
```

### Create the first users (run ONCE on a fresh database)

```bash
npm --prefix backend run db:seed
```

This creates:

| Account | Phone (login) | Password |
|---------|---------------|----------|
| Super Admin | `0700000000` | `superadmin123` |
| Admin | `0789577024` | `admin123` |

**Change these passwords immediately after your first login!**

---

## Step 9 — Start the backend with PM2

```bash
cd /var/www/Tailor-Management-system
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` prints one long command — copy it, paste it, and press Enter.
That makes the app start automatically when the server reboots.

Check it is alive:

```bash
pm2 status                                  # tailor-api should be "online"
curl http://127.0.0.1:8000/api/health       # should print {"status":"ok",...}
pm2 logs tailor-api --lines 20              # look for "[frontend] Serving SPA from ..."
```

---

## Step 10 — Configure nginx

```bash
cd /var/www/Tailor-Management-system
cp deploy/nginx/hoshmandsafi.com.conf /etc/nginx/sites-available/hoshmandsafi.com
ln -sf /etc/nginx/sites-available/hoshmandsafi.com /etc/nginx/sites-enabled/hoshmandsafi.com
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

`nginx -t` must say **syntax is ok** and **test is successful**.

---

## Step 11 — Test everything

```bash
bash deploy/verify-deployment.sh
```

All three checks must pass. Then, on your PC, open a browser and go to
**http://hoshmandsafi.com** — do a hard refresh (`Ctrl+Shift+R`) so the browser
doesn't show an old cached version. Log in with the super admin account from
Step 8.

---

## Step 12 — Enable HTTPS (strongly recommended)

Only after DNS works (Step 0). On the server:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d hoshmandsafi.com -d www.hoshmandsafi.com
```

Answer the questions (enter your email, agree to terms, choose redirect =
recommended). Then update the app for HTTPS:

```bash
nano /var/www/Tailor-Management-system/backend/.env
```

Change:

```env
APP_PUBLIC_URL=https://hoshmandsafi.com
FRONTEND_URL=https://hoshmandsafi.com
COOKIE_SECURE=true
```

```bash
nano /var/www/Tailor-Management-system/frontend/.env
```

Change:

```env
VITE_API_URL=https://hoshmandsafi.com/api
```

Rebuild and restart:

```bash
cd /var/www/Tailor-Management-system
npm --prefix frontend run build
pm2 restart tailor-api --update-env
```

Now the site works at **https://hoshmandsafi.com** with a padlock. Certificates
renew automatically.

---

## Updating the site later (redeploy)

Whenever you push new code to GitHub:

```bash
ssh root@164.68.121.90
cd /var/www/Tailor-Management-system
git pull
bash deploy/redeploy.sh
```

That script installs dependencies, rebuilds the frontend, runs database
migrations, restarts PM2, and verifies the deployment.

---

## Common errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `GET /api/auth/csrf 404` | nginx not forwarding to Node, or backend down | Redo Step 10; check `pm2 status`; `curl http://127.0.0.1:8000/api/health` |
| `GET / 404` | Frontend not built or backend started without production env | `ls frontend/dist/index.html`; rebuild (Step 8); restart with `pm2 restart deploy/ecosystem.config.cjs --update-env` |
| Browser shows old/broken page | Browser cache | Hard refresh `Ctrl+Shift+R` |
| CORS blocked | Wrong `FRONTEND_URL` in `backend/.env` | Set it to your domain, then `pm2 restart tailor-api --update-env` |
| Login works but session lost after refresh | Wrong cookie settings | HTTP → `COOKIE_SECURE=false`; HTTPS → `COOKIE_SECURE=true`; restart PM2 |
| `P1000`/`P1001` database errors | Wrong `DATABASE_URL` password or PostgreSQL down | Check password matches Step 5; `systemctl status postgresql` |
| `EADDRINUSE: port 8000` | Two copies of the app running | `pm2 delete all` then Step 9 again |
| `502 Bad Gateway` from nginx | Backend crashed | `pm2 logs tailor-api` to see the error, fix it, `pm2 restart tailor-api` |
| Site unreachable at all | DNS not pointing to VPS, or firewall | `nslookup hoshmandsafi.com` must return `164.68.121.90`; `ufw status` must allow Nginx Full |
| Changed `frontend/.env` but nothing changed | Vite bakes env at build time | Rebuild: `npm --prefix frontend run build`, then hard refresh |

## Useful commands cheat sheet

```bash
pm2 status                      # is the app running?
pm2 logs tailor-api             # live app logs (Ctrl+C to exit)
pm2 restart tailor-api          # restart the app
systemctl status nginx          # is nginx running?
nginx -t                        # check nginx config for mistakes
systemctl reload nginx          # apply nginx config changes
systemctl status postgresql     # is the database running?
df -h                           # disk space
free -h                         # memory usage
```
