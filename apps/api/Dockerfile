# Build stage: install dependencies and application
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies (no dev); app code copied later so we can cache deps
COPY pyproject.toml .
RUN uv sync --no-dev --no-install-project

# Runtime stage
FROM python:3.12-slim AS runtime

WORKDIR /app

# Create non-root user
RUN adduser --disabled-password --gecos "" appuser

# Copy virtual env from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application, migrations, and entrypoint
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini pyproject.toml ./
COPY --chown=appuser:appuser docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh

USER appuser

# DATABASE_URL must be set at runtime (e.g. docker run -e, Compose environment, or env_file)
ENTRYPOINT ["/app/docker/entrypoint.sh"]
