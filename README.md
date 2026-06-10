# Product Inventory & Stock Management System

A full-stack inventory application for an online store. Manage products with **variants** and **sub-variants**, track stock purchases and sales, view analytics on a dashboard, and get low-stock alerts.

**Stack:** Django 6 · Django REST Framework · PostgreSQL · JWT Auth · React 19 · Vite · Tailwind CSS · Chart.js

---

## Features

### Core (Assignment Requirements)
- Product CRUD with auto-generated sub-variants (Cartesian product of variant options)
- Variant builder (e.g. Size × Color → all combinations)
- Stock purchase & sale with negative-stock prevention
- `TotalStock` synced on every stock movement
- Paginated product list, stock levels, and stock report
- JWT authentication on all API endpoints

### Bonus Features
- **Categories** — organize products, filter by category
- **Product images** — upload with thumbnail/medium/full renditions (VersatileImageField)
- **Stock alerts** — low-stock threshold per sub-variant, dashboard alerts, editable in UI
- **Dashboard** — stats, stock movement chart, top products, recent transactions, sales summary
- **Bulk purchase** — add stock to all sub-variants of a product at once
- **Role-based access** — admin vs staff permissions
- **Swagger API docs** — interactive documentation at `/api/docs/`

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ (tested with 3.12) |
| Node.js | 18+ (tested with current LTS) |
| PostgreSQL | 14+ |
| npm | 9+ |

---

## Project Structure

```
Inventory_system/
├── backend/                 # Django REST API
│   ├── accounts/            # JWT auth (login, refresh, /me)
│   ├── products/            # Models, views, services, tests
│   │   ├── migrations/      # Database migrations (run migrate)
│   │   ├── services/        # Business logic (stock, variants, dashboard)
│   │   └── tests/           # 63 automated tests
│   ├── backend/             # Django settings & URLs
│   ├── requirements.txt
│   ├── .env.example         # Environment template (commit this)
│   └── manage.py
├── frontend/                # React SPA
│   ├── src/
│   │   ├── api/             # Axios API clients
│   │   ├── components/      # UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Data-fetching hooks
│   │   └── context/         # Auth context
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/farsen119/product-inventory-system
cd inventory-management-system
```

### 2. PostgreSQL — create database

```sql
CREATE DATABASE inventory_db;
```

### 3. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
# source venv/bin/activate

pip install -r requirements.txt

# Copy environment file and edit with your DB password
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

python manage.py migrate
python manage.py runserver
```

Backend runs at **http://localhost:8000**

### 4. Create demo users

In a new terminal (with venv activated):

```bash
cd backend
python manage.py shell
```

```python
from django.contrib.auth.models import User

User.objects.filter(username='admin').exists() or User.objects.create_superuser(
    'admin', 'admin@example.com', 'admin123'
)
User.objects.filter(username='staff').exists() or User.objects.create_user(
    'staff', 'staff@example.com', 'staff123'
)
print('Users ready')
```

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Super Admin — full access |
| `staff` | `staff123` | Staff — no delete, no stock report, no categories |

### 5. Frontend setup

```bash
cd frontend

copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

Open **http://localhost:5173** and sign in with `admin` / `admin123`.

---

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
```

> **Never commit `backend/.env`** — it contains secrets.

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

This project uses **Vite** (not Create React App). The variable is `VITE_API_BASE_URL`. `REACT_APP_API_BASE_URL` is also supported as an alias.

---

## Database Setup

This project uses **Django migrations** (included in the repo). No SQL dump is required.

```bash
cd backend
python manage.py migrate
```

Migrations create all tables: `Products`, `ProductVariant`, `VariantOption`, `SubVariant`, `StockTransaction`, `Category`.

---

## Running Tests

```bash
cd backend
venv\Scripts\activate          # Windows
python manage.py test
```

**63 tests** cover API endpoints, stock rules, sub-variant generation, dashboard, and services.

---

## API Documentation

Interactive Swagger UI (start backend first):

| URL | Description |
|-----|-------------|
| http://localhost:8000/api/docs/ | Swagger UI |
| http://localhost:8000/api/redoc/ | ReDoc |
| http://localhost:8000/api/schema/ | OpenAPI JSON schema |

### Authentication

```http
POST /api/token/           # { "username", "password" } → access + refresh tokens
POST /api/token/refresh/   # { "refresh" } → new access token
GET  /api/me/              # Current user profile (Bearer token)
```

Use header: `Authorization: Bearer <access_token>`

### API Endpoints Summary

| Resource | Endpoints |
|----------|-----------|
| **Health** | `GET /api/health/` (public) |
| **Categories** | `GET/POST /api/categories/`, `GET/PUT/PATCH/DELETE /api/categories/{id}/` |
| **Products** | `GET/POST /api/products/`, `GET/PUT/PATCH/DELETE /api/products/{id}/` |
| **Variants** | `GET/POST /api/products/{id}/variants/`, `PUT/PATCH/DELETE /api/variants/{id}/` |
| **Sub-variants** | `GET /api/products/{id}/subvariants/`, `PATCH /api/subvariants/{id}/` |
| **Stock** | `GET /api/stock/`, `POST /api/stock/purchase/`, `POST /api/stock/sale/`, `POST /api/stock/purchase/bulk/` |
| **Stock report** | `GET /api/stock/report/` (admin only) |
| **Dashboard** | `GET /api/dashboard/` |

### Create Product Example

```json
POST /api/products/
{
  "ProductName": "Shirt",
  "ProductCode": "PROD-001",
  "HSNCode": "6205",
  "variants": [
    { "name": "size", "options": ["S", "M", "L"] },
    { "name": "color", "options": ["Red", "Blue", "Black"] }
  ]
}
```

This auto-generates **9 sub-variants** (3 × 3 combinations).

### Stock Purchase Example

```json
POST /api/stock/purchase/
{
  "sub_variant_id": "uuid-here",
  "quantity": "50",
  "notes": "Initial stock from supplier"
}
```

---

## Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/dashboard` | Analytics dashboard | All users |
| `/products` | Product list (search, filter, pagination) | All users |
| `/products/create` | Create product + variants + preview | All users |
| `/products/:id/edit` | Edit product, manage variants, thresholds | All users |
| `/stock` | Purchase, sale, stock levels | All users |
| `/categories` | Category CRUD | Admin only |
| `/stock/report` | Transaction report + CSV export | Admin only |

---

## Role-Based Access

| Action | Admin | Staff |
|--------|-------|-------|
| View dashboard, products, stock | Yes | Yes |
| Create / edit products | Yes | Yes |
| Delete products | Yes | No |
| Categories page | Yes | No |
| Stock report | Yes | No |
| Purchase / sale stock | Yes | Yes |

---

## Business Rules

- **Sub-variants** are generated automatically from all variant option combinations
- **Duplicate** sub-variant combinations are prevented (DB + application level)
- **Stock never goes negative** — sales are rejected if quantity exceeds available stock
- **TotalStock** on the product is updated on every purchase and sale
- **Variant changes** archive obsolete sub-variants (blocked if they still have stock)

---

## Django Admin

URL: **http://localhost:8000/admin/**

Sign in with the `admin` superuser. All models are registered with search, filters, and inlines.

---

## Production Build (Frontend)

```bash
cd frontend
npm run build
npm run preview    # preview at http://localhost:4173
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: decouple` | Activate venv and run `pip install -r requirements.txt` |
| Database connection error | Check PostgreSQL is running and `.env` credentials are correct |
| `401 Unauthorized` on API | Log in again; token may have expired (1 hour) |
| Frontend can't reach API | Ensure backend is on port 8000 and `VITE_API_BASE_URL` is correct |
| CORS errors | Backend allows `localhost:5173` in DEBUG mode |

---

## Verification Status

| Check | Result |
|-------|--------|
| Backend tests (`manage.py test`) | **63/63 passed** |
| Frontend build (`npm run build`) | **Success** |
| Swagger docs | Available at `/api/docs/` |
| Migrations | 4 migration files included |
| `.env.example` files | Backend + frontend |

---

## License

