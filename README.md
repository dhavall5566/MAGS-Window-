# MAGS Aluminium Profile Management System

Enterprise-grade web application for managing aluminium extrusion profiles, inventory, powder coating, consumption, scrap tracking, and comprehensive reporting.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + Shadcn-style UI components
- **Prisma ORM** + PostgreSQL
- **React Hook Form** + Zod
- **Recharts** (Dashboard analytics)
- **UploadThing** (Image uploads)

## Features

- Role-based access (Administrator, Store Manager, Production User)
- Profile Master with table/card views and image uploads
- Profile Gallery with modal preview
- Stock Inward with automatic ledger updates
- Material Consumption with Meter/Feet → KG auto-calculation
- Powder Coating workflow (Pending → Completed)
- Scrap & Waste management
- Stock Ledger audit trail with CSV/Excel export
- 7 report types with PDF/Excel/CSV export
- Dashboard with charts and low-stock alerts
- Dark/Light mode, responsive sidebar layout

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- (Optional) UploadThing account for image uploads

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/mags_aluminium?schema=public"
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""
```

### 3. Set up PostgreSQL & database

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb mags_aluminium
```

Update `DATABASE_URL` in `.env` to use your Mac username (no password by default):
```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/mags_aluminium?schema=public"
```

**Then initialize tables and demo data:**
```bash
npm run db:push
npm run db:seed
```

### 4. Run development server

The app runs on **port 3001** (not 3000):

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Application Routes

Open the app at `/` — it redirects to the dashboard. No login is required.

| Route | Description |
|-------|-------------|
| `/dashboard` | Analytics dashboard |
| `/profiles` | Profile master (CRUD) |
| `/profiles/new` | Add profile |
| `/profiles/[id]` | Profile details |
| `/gallery` | Image gallery |
| `/stock-inward` | Stock inward entries |
| `/consumption` | Material consumption |
| `/powder-coating` | Powder coating management |
| `/scrap` | Scrap & waste |
| `/ledger` | Stock ledger |
| `/reports` | Reports & exports |
| `/users` | User management (Admin) |
| `/settings` | Settings & activity log |

## Consumption Formula

```
Consumed Weight (KG) = Length × Weight Per Meter
```

For feet: length is converted to meters first (`feet / 3.28084`).

Example: `10 Meter × 2.44 KG/MTR = 24.40 KG`

## Production Build

```bash
npm run build
npm start
```

Production also uses port **3001**.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Use Vercel Postgres or external PostgreSQL
5. Run migrations: `npx prisma migrate deploy`
6. Set `NEXTAUTH_URL` to your production URL

### Docker / VPS

1. Build: `npm run build`
2. Set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
3. Run `npx prisma migrate deploy && npm start`
4. Use reverse proxy (nginx) pointing to port 3001

### UploadThing

1. Create account at [uploadthing.com](https://uploadthing.com)
2. Add `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` to `.env`
3. Profile images and technical drawings will upload to UploadThing CDN

Without UploadThing credentials, profiles work but image upload buttons will fail gracefully.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # App pages
│   └── api/                   # REST API routes
├── components/
│   ├── layout/                # Sidebar, header, shell
│   ├── profiles/              # Profile forms
│   ├── shared/                # Reusable UI
│   └── ui/                    # Shadcn components
├── lib/
│   ├── stock.ts               # Inventory transactions
│   ├── permissions.ts         # Role-based access
│   └── ...
prisma/
├── schema.prisma              # Database schema
└── seed.ts                    # Sample data
```

## License

Proprietary — MAGS Aluminium Systems
