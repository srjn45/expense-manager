# Expense Manager API — run from apps/api/ (or: make -C apps/api <target>)
# Requires: uv on PATH (e.g. export PATH="$HOME/.local/bin:$PATH")

.PHONY: fmt lint test build run

fmt:
	uv run ruff format .

lint:
	uv run ruff check .
	uv run mypy app

test:
	ENV_FILE=.env.test uv run pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html:htmlcov

build:
	docker build -t expense-manager-api .

run:
	ENV_FILE=.env.local uv run uvicorn app.main:app --reload
