# Fixlytics

## Overview

**Fixlytics** is a lead intelligence system that discovers underperforming business websites, analyzes their technical and design issues, and turns those insights into highly targeted outreach opportunities.

It combines controlled data collection, structured website analysis, and intelligent personalization to create a more effective alternative to generic scraping and mass email outreach.

---

## Philosophy

> Find what’s broken, prove it with data, and use it to start better conversations.

Fixlytics is built on a simple idea:
- Most outreach fails because it’s generic
- Most scraping tools lack intelligence
- Most audit tools don’t convert into leads

Fixlytics bridges that gap.

---

## Core Capabilities

### 1. Manual Search Control

- Define search queries using:
  - Keyword (e.g. "restaurant", "dermatology clinic")
  - Location (e.g. "Michigan", "New York")
  - Source (Google, Maps, directories)
- Avoid blind or repetitive scraping
- Full control over lead discovery

---

### 2. Search Memory & Resume

- Save every search query
- Track pagination progress
- Resume scraping from last page

**Example:**


- Avoid duplicate scraping
- Reduce cost and improve efficiency

---

### 3. Page-Level Caching

- Cache results per search + page
- Never re-scrape the same data
- Reuse data for:
  - scoring
  - reprocessing
  - campaigns

---

### 4. Structured Website Analysis

Each website is analyzed across multiple dimensions:

- SEO
- Performance
- Design
- Content (optional)

Instead of a single score, Fixlytics extracts detailed metrics.

---

### 5. Granular Data Storage

Fixlytics stores:

- Category scores (SEO, Performance, Design)
- Individual checks (meta tags, load time, responsiveness)
- Raw metrics (TTFB, LCP, etc.)

**Example:**

```json
{
  "seo": {
    "score": 55,
    "checks": {
      "has_meta_title": false,
      "h1_count": 0
    }
  }
}
```

---

## Monorepo layout

This repository is a **pnpm** workspace.

| Path | Role |
|------|------|
| `apps/backend` | NestJS API (modules will live under `src/modules/`) |
| `apps/frontend` | Next.js App Router UI |
| `packages/types` | Shared TypeScript types and DTOs |
| `packages/utils` | Optional shared helpers |
| `infra/docker` | Docker and compose assets |
| `infra/nginx` | Reverse-proxy configuration |

### Planning

- **[Execution plan](docs/EXECUTION_PLAN.md)** — phased backend/frontend roadmap, security checks, and testing expectations.

**Implemented so far (Phases 0–1 scaffold):** validated env + `/api/v1` + Helmet/CORS + global validation; PostgreSQL + Prisma (`User`, `RefreshToken`); JWT access + opaque refresh (hashed at rest); throttled auth endpoints; frontend login/register + sessionStorage tokens + protected `/dashboard`; Jest tests (`pnpm test`). Run `pnpm --filter @fixlytics/backend db:migrate` after configuring `DATABASE_URL`.

### Prerequisites

- **Node.js** 20 or newer
- **pnpm** 9 (`corepack enable` then `corepack prepare pnpm@9.15.4 --activate`, or install pnpm globally)

### Install

From the repository root:

```bash
pnpm install
```

### Develop

Run the API and the web app together:

```bash
pnpm dev
```

Or run each workspace in its own terminal:

```bash
pnpm --filter @fixlytics/backend dev
pnpm --filter @fixlytics/frontend dev
```

The backend `dev` script uses **TypeScript watch** plus **nodemon** (see `apps/backend/nodemon.json`) instead of `nest start --watch`, so local development stays reliable on **Windows paths that contain spaces** and avoids stale incremental builds that skip emitting to `dist/`.

### Environment files

Copy the example env files and adjust values:

- Root: `.env.example` (optional shared documentation)
- Backend: `apps/backend/.env.example` → `apps/backend/.env`
- Frontend: `apps/frontend/.env.example` → `apps/frontend/.env.local`

### Quality checks

```bash
pnpm lint
pnpm build
```