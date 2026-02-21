# Expense Manager API

Backend for Expense Manager (FastAPI + PostgreSQL). See [doc/rfc-001-expense-manager.md](../../doc/rfc-001-expense-manager.md) and [doc/implementation-plan-be.md](../../doc/implementation-plan-be.md).

## Setup

1. **uv** (Python package manager): install from [https://docs.astral.sh/uv/](https://docs.astral.sh/uv/).

2. **PostgreSQL** — from repo root:
   - **Tests only (ephemeral DB):** `docker compose -f docker-compose.test.yml up -d` — Postgres on **5433**; data is lost on `docker compose -f docker-compose.test.yml down`.
   - **Local dev (persistent DB):** `docker compose -f docker-compose.postgres.yml up -d` — Postgres with a volume; data survives `down`. Then run API/frontend with `docker compose -f docker-compose.local.yml up -d` when needed.
   Persistent Postgres is on port 5432; test Postgres (docker-compose.test.yml) is on port 5433. Both have databases `expense_manager` and `expense_manager_test`.

3. From `apps/api/`:
   ```bash
   uv sync
   ```

4. Env files (from `apps/api/`): `.env.local` and `.env.test` are provided; they are gitignored. Copy from `.env.example` if you need a base `.env`, or use:
   - **Local app:** `ENV_FILE=.env.local uv run uvicorn app.main:app --reload`
   - **Tests:** `ENV_FILE=.env.test uv run pytest tests/ -v`
   `.env.local` points the app at `expense_manager`; `.env.test` points tests at `expense_manager_test` so they don’t touch the app DB.

5. Run migrations (for both DBs if using separate test DB):
   ```bash
   uv run alembic upgrade head
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/expense_manager_test uv run alembic upgrade head
   ```

6. Start the API:
   ```bash
   ENV_FILE=.env.local uv run uvicorn app.main:app --reload
   ```

- Health: `GET http://localhost:8000/health`
- OpenAPI: `GET http://localhost:8000/docs`

## Tests

From `apps/api/`:

```bash
ENV_FILE=.env.test uv run pytest tests/ -v
```

Uses `.env.test` (which sets `TEST_DATABASE_URL` to `expense_manager_test`). Ensure the test database exists and migrations have been run (see step 5 above).
