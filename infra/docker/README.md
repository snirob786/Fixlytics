## Docker local stack

This folder contains the local Docker setup to run Fixlytics end-to-end:

- `docker-compose.yml` - orchestrates Postgres, Redis, backend, and frontend
- `backend.Dockerfile` - production image for NestJS API
- `frontend.Dockerfile` - production image for Next.js UI

### Quick start

From repo root:

```bash
cp infra/docker/.env.example infra/docker/.env
pnpm docker:up
```

Then open:

- Frontend: `http://localhost:3000`
- Backend health route: `http://localhost:4000/api/v1/health`

To stop:

```bash
pnpm docker:down
```

### Root shortcuts

From repo root:

```bash
pnpm dev
```

Starts the Docker development stack (`infra/docker/docker-compose.dev.yml`) with backend/frontend dev servers.

```bash
pnpm start
```

Starts the Docker production-style stack (`infra/docker/docker-compose.yml`) in detached mode.

```bash
pnpm logs
```

Tails logs for the production-style Docker stack.

### Notes

- Set a real `JWT_SECRET` in `infra/docker/.env` before using this beyond local testing.
- Set `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` in `infra/docker/.env` (or `apps/backend/.env`) for the search pipeline.
- The backend container runs Prisma migrations automatically on start.
