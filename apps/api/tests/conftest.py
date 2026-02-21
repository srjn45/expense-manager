"""Pytest fixtures: test DB session, client with overridden get_db."""

import os
import subprocess

# Enforce test env so pytest always uses .env.test (expense_manager_test DB)
os.environ["ENV_FILE"] = ".env.test"

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.deps import get_db
from app.main import app


def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "integration: mark test as integration (uses HTTP client and DB; run serially, no -n).",
    )


_settings = get_settings()
_test_url = _settings.test_database_url or _settings.database_url
_test_sync_url = _test_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def pytest_sessionstart(session: pytest.Session) -> None:
    """Run Alembic migrations on the test DB before any tests so schema is up to date."""
    api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = os.environ.copy()
    env["DATABASE_URL"] = _test_sync_url  # Alembic uses sync driver
    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=api_root,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Test DB migration failed (alembic upgrade head): {result.stderr or result.stdout}"
        )


@pytest.fixture(scope="session")
def sync_engine():
    """Sync engine for schema inspection (uses psycopg2)."""
    engine = create_engine(_test_sync_url, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest_asyncio.fixture
async def test_engine():
    """Async engine for DB session; function-scoped to avoid event loop conflicts."""
    engine = create_async_engine(
        _test_url,
        echo=False,
        pool_pre_ping=True,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a session in a transaction that is rolled back after the test."""
    connection = await test_engine.connect()
    transaction = await connection.begin()
    session_factory = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    session = session_factory()
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()


async def _truncate_tables_for_integration(engine) -> None:
    """Truncate tables used by integration tests (commits so other connections see it)."""
    async with engine.connect() as conn:
        await conn.execute(
            text(
                "TRUNCATE payment_methods, categories, tag_suggestions "
                "RESTART IDENTITY CASCADE"
            )
        )
        await conn.commit()


@pytest_asyncio.fixture
async def integration_cleanup(test_engine) -> AsyncGenerator[None, None]:
    """Clean DB before and after each integration test so tests don't see each other's data."""
    await _truncate_tables_for_integration(test_engine)
    try:
        yield
    finally:
        await _truncate_tables_for_integration(test_engine)


@pytest_asyncio.fixture
async def client(integration_cleanup: None, db_session: AsyncSession):
    """Async HTTP client; get_db overridden to use fixture session (transaction rolled back after test)."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_db, None)
