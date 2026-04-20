# Fixlytics — execution plan

This document is the **ordered roadmap** for building Fixlytics end to end: **NestJS** (`apps/backend`), **Next.js** (`apps/frontend`), shared types (`packages/types`), with **security controls** and **tests** at each phase.

**Principles**

- Business logic lives in **backend services**; the UI calls **HTTP APIs** only.
- Backend modules live under `apps/backend/src/modules/`.
- Separate **scraping**, **scoring/analysis**, and **AI personalization** (no mixed responsibilities).
- Store **raw metrics** separately from **scores**; retain **original scraped payloads** for reprocessing.
- Build **vertical slices**: backend module + DTOs in `packages/types` + UI when the feature is user-facing.

---

## Phase 0 — Foundation (block everything else until done)

### Backend

| # | Task | Security / quality | Tests |
|---|------|-------------------|--------|
| 0.1 | `ConfigModule` + **validated env** (fail fast if required secrets missing in production) | No defaults for `JWT_SECRET` / DB in prod | Unit or e2e: app refuses to boot with invalid env |
| 0.2 | PostgreSQL via ORM/migrations (e.g. Prisma); JSON-friendly columns for flexible metrics | DB URL only on server; SSL to DB in prod | Migration runs in CI; smoke test connects to test DB |
| 0.3 | Global API prefix `/api/v1` (align with `NEXT_PUBLIC_API_URL`) | Consistent versioning | Integration: health or ping route |
| 0.4 | Global validation pipe (DTOs); consistent error responses; **no stack traces** in prod | Input validation on all body/query params | Unit: invalid DTOs rejected |
| 0.5 | CORS **allowlist** (Next.js origin only) | Never `*` with credentials | Integration: wrong origin blocked |
| 0.6 | Security headers (e.g. Helmet): `X-Content-Type-Options`, `Referrer-Policy`, etc. | Tune for API vs future static assets | Optional: staging header scan |
| 0.7 | Structured logging; **never log** passwords, tokens, or full API keys | Redact sensitive fields | Manual review checklist |

### Frontend

| # | Task | Security / quality | Tests |
|---|------|-------------------|--------|
| 0.8 | Central API client using `getApiBaseUrl()`; typed errors | No secrets in client bundle | Lint/build: no forbidden env patterns in `app/` |
| 0.9 | App layout, error boundary, loading patterns | — | Smoke: home renders |

### Shared

| # | Task | Tests |
|---|------|--------|
| 0.10 | `packages/types`: shared request/response DTOs for Phase 1+ | Compile-time only initially |

**Exit criteria:** App boots in dev/staging with validated config; API responds under `/api/v1`; CORS and validation behave as tested.

---

## Phase 1 — Auth, users, and protected access

### Backend (`modules/auth`, `modules/users`)

| # | Task | Security | Tests |
|---|------|----------|--------|
| 1.1 | User entity; register + login | Password hashing (**argon2** or **bcrypt**); timing-safe compare where applicable | Unit: hash verify; integration: wrong password |
| 1.2 | JWT access (short TTL) + refresh in DB **hashed**, rotation on use | Strong signing secret from env; reject tampered tokens | Integration: expired/invalid token; refresh reuse detection |
| 1.3 | Auth guard on all non-public routes | — | Integration: missing `Authorization` → 401 |
| 1.4 | Rate limit **login** (and register) per IP + per email | Redis-backed if multi-instance | Integration: burst → 429 |

### Frontend

| # | Task | Security | Tests |
|---|------|----------|--------|
| 1.5 | Login / register pages; store session per your choice (Bearer in memory vs httpOnly cookie) | Prefer **httpOnly cookies** if using cookie sessions; avoid long-lived tokens in `localStorage` if XSS is a concern | E2E: login success; unauthenticated redirect |
| 1.6 | Middleware or layout **protected routes**; redirect to login | — | E2E: protected URL without session |

**Exit criteria:** Authenticated and unauthenticated flows tested; login cannot be brute-forced without hitting rate limits.

---

## Phase 2 — Core domain: saved searches, cache, jobs

### Backend

| # | Task | Security | Tests |
|---|------|----------|--------|
| 2.1 | **Searches** CRUD: keyword, location, source; owned by `userId` | **IDOR**: load/update/delete only if `resource.userId === req.user.id` | Integration: access another user’s search → 403 |
| 2.2 | Pagination / cursor state for “resume” (per README) | Max page size enforced | Unit: oversized page param clamped or rejected |
| 2.3 | **Cache** keyed by search + page; store raw payload | Prevent cross-user cache hits | Integration: user A cannot read user B’s cache key |
| 2.4 | **Job queue** (Redis): enqueue scrape/analyze; HTTP returns quickly | Per-user quotas; validate job payload (no unbounded URLs) | Unit: quota; integration: job created |

### Frontend

| # | Task | Tests |
|---|------|--------|
| 2.5 | Search list / create / edit; show resume state | E2E: create search, see it listed |
| 2.6 | Trigger “run” or “resume” with clear loading/errors | — |

**Exit criteria:** Search ownership enforced in tests; caching and jobs are not cross-tenant.

---

## Phase 3 — Analysis pipeline (scraping separate from scoring)

### Backend

| # | Task | Security / compliance | Tests |
|---|------|------------------------|--------|
| 3.1 | Scraper worker: fetch targets allowed by your policy; **rate limits** per domain | Audit fields: who ran what, when; do not log full bodies by default | Integration: job processes fixture payload |
| 3.2 | Analyzer service: SEO / performance / design metrics; raw vs scored separation | Sanitize any string persisted that might be echoed in UI later | Unit: scoring deterministic on fixture |
| 3.3 | Persist granular checks + raw metrics (JSON); link to site/lead entity | — | Integration: read analysis by id with ownership |

### Frontend

| # | Task | Security | Tests |
|---|------|----------|--------|
| 3.4 | Site/lead detail: scores + expandable checks | **XSS**: do not `dangerouslySetInnerHTML` for crawled HTML; if preview needed, sanitize | Component: untrusted strings escaped |

**Exit criteria:** Analysis data model matches README examples; scraping and scoring stay in separate services/modules.

---

## Phase 4 — Integrations and personalization

### Backend

| # | Task | Security | Tests |
|---|------|----------|--------|
| 4.1 | OpenAI (or other): **server-side key only**; timeouts and token limits | Key in env; no echo to client | Integration: mock provider; failure handling |
| 4.2 | Smartlead (or similar): treat API key as secret; optional webhook with **signature verification** | Verify HMAC if webhooks exist | Unit: bad signature rejected |
| 4.3 | Personalization module: inputs = stored analysis + templates; output not trusted as code | Prompt injection awareness: treat model output as text for display only | Unit: mapping from analysis DTO |

### Frontend

| # | Task | Tests |
|---|------|--------|
| 4.4 | UI to generate/copy outreach copy | E2E optional: mock API |

---

## Phase 5 — Hardening and operations

| # | Task | Tests / automation |
|---|------|---------------------|
| 5.1 | Rate limits on expensive endpoints (AI, bulk export) | Integration: 429 |
| 5.2 | Dependency audit in CI (`pnpm audit` or equivalent) | CI job |
| 5.3 | Separate dev/staging/prod secrets; document rotation | Runbook in repo or internal doc |
| 5.4 | Optional: OWASP ZAP or similar against staging | Scheduled or pre-release |
| 5.5 | Backup/restore for PostgreSQL | Manual drill checklist |

---

## Testing pyramid (ongoing)

| Layer | What | When |
|-------|------|------|
| **Unit** | Hashing, JWT helpers, DTO validation, authorization helpers, webhook signatures | Every PR touching logic |
| **Integration** | Nest + test DB/Redis: auth, IDOR, CORS, rate limits, core CRUD | Core modules before release |
| **E2E** | Register → login → create search → view result (Playwright/Cypress) | Before major releases or weekly on `main` |

**Minimum before “auth is production-ready”:** integration tests for invalid credentials, missing token, IDOR on at least one resource, and login rate limit.

---

## Dependency order (summary)

```
Phase 0 (config, DB, API shell, CORS, validation, logging)
    → Phase 1 (auth, users, guards, rate limits, frontend auth + protected routes)
        → Phase 2 (searches, cache, jobs, quotas, IDOR tests)
            → Phase 3 (scrape workers, analyzer, lead/site UI)
                → Phase 4 (OpenAI, Smartlead, personalization)
                    → Phase 5 (hardening, CI security, ops)
```

---

## Reference

- Product scope: [README.md](../README.md)
- Repo conventions: [.cursorrules](../.cursorrules)
