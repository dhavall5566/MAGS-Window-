# MAGS System — Aluminium Profile Management

**MAGS System** · High-End Door Window & Façade Systems · *Engineering Beyond Excellence*

Enterprise-grade aluminium profile inventory and production management — **Demo / MVP** edition.

**Contact:** +91 85116 58283 · mags.brijesh@gmail.com · [www.magssystem.com](https://www.magssystem.com)  
**Address:** 10, Vrundavan Estate, New Science City Road, Ognaj, Ahmedabad - 380060

## Features

- Dashboard with KPI cards and Recharts analytics
- Profile Master & Gallery
- Stock Inward, Consumption, Powder Coating, Scrap
- Stock Ledger
- Challan Management (Outward, Powder Coating, Return) with PDF export
- Reports & User Management
- Dark mode support (login/auth planned for later)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + Shadcn UI
- Recharts, React Hook Form, Zod, Zustand

## Data Architecture

All data lives in `/lib/mock-data/` — no database required.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build & Deploy

```bash
npm run build
npm start
```

Deploys to Vercel with **no environment variables** required.

## Project Structure

```
/lib/mock-data/     # All mock data (TypeScript)
/app/api/           # Mock JSON API routes
/app/(app)/         # Authenticated pages
/components/        # UI & layout components
```
