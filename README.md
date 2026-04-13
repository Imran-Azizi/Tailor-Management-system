# ✂ Tailor Pro — Full-Stack Tailor Management System

A production-ready, gold-themed tailor shop management system.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env → set your DATABASE_URL

npx prisma db push
node prisma/seed.js   # optional: seeds sample styles + customer

npm run dev           # runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # runs on http://localhost:5173
```

Vite proxies `/api` → `http://localhost:5000` automatically.

---

## 📁 Project Structure

```
tailor-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      ← All models
│   │   └── seed.js            ← Seed styles + sample data
│   └── src/
│       ├── controllers/       ← Route handlers
│       ├── services/          ← Business logic
│       ├── routes/            ← Express routes
│       ├── validators/        ← Zod schemas
│       ├── middleware/        ← Error handler
│       ├── cron/              ← Emergency notification repeater
│       └── lib/               ← Prisma client
└── frontend/
    └── src/
        ├── components/
        │   ├── Layout.jsx     ← App shell
        │   ├── Sidebar.jsx    ← Dark sidebar with gold accents
        │   ├── Navbar.jsx     ← Search + lang + theme + notifications
        │   ├── order/         ← 5-step order form
        │   └── ui/            ← Reusable primitives
        ├── pages/             ← All page views
        ├── context/           ← Theme (dark/light)
        ├── i18n/              ← Translations
        └── lib/               ← Axios client
```

---

## ✨ Features

### Order Creation (5-Step Flow)
1. **Customer Info** — name + phone, auto bill# from 1
2. **Order Types** — multi-select cards (OUTFIT, WASKAT, KORTY, YAKHANQAQ); "Add another" opens name prompt
3. **Measurements** — fields per type, React Select style dropdowns, "+ Add Another Set" with name prompt
4. **Billing** — price/discount/paid/qty, live remaining balance
5. **Review & Print** — per-type Customer Copy + Tailor Shop Copy (A5), print + PDF export

### Bill Number
- Starts from **1**, auto-increments sequentially, unique

### Box Management
- Create boxes (type + capacity)
- "Manage Orders" button on each box → modal to assign/remove orders
- Box assignment is separate from order creation

### Design Management
- 9 design tables (Yakhan, Astin, Daman, Jib Row, Jib Baghle, Jib Tenban, Paty Ship, Button Ship, Tenban Ship)
- CRUD in colored cards, auto-available in order form dropdowns

### Responsive Design
- Gold (`#D97706`) color theme throughout
- Fully responsive: mobile, tablet, desktop
- Hamburger menu on mobile (sidebar slides in)
- Collapsible sidebar on desktop

### Navbar
- Global search (Enter → orders page)
- Language switcher (EN / دری / پښتو)
- Dark / Light mode toggle
- Notification bell with unread count

---

## 🗄 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics/dashboard` | KPIs + charts |
| GET/POST | `/api/customers` | List / create |
| GET | `/api/customers/search/phone?phone=X` | Find by phone |
| GET/POST | `/api/orders` | List / create |
| PATCH | `/api/orders/:id/complete` | Mark done |
| GET/POST | `/api/boxes` | List / create |
| POST | `/api/boxes/:id/assign` | Assign order to box |
| GET/POST | `/api/designs/:model` | Design styles |
| GET | `/api/notifications` | List |
| PATCH | `/api/notifications/read-all` | Mark all read |
| GET | `/api/health` | Health check |

---

## 🛠 Tech Stack

| | Tech |
|--|--|
| Frontend | React 18 + Vite + CSS Variables |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Data | TanStack Query v5 |
| Barcode | JsBarcode |
| PDF | jsPDF + html2canvas |
| Icons | react-icons (Lucide) |
| Dropdowns | React Select |
| Backend | Node.js + Express (ESM) |
| ORM | Prisma 5 |
| DB | PostgreSQL |
| Jobs | node-cron |
