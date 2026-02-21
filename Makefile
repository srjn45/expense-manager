# Expense Manager — run from project root
# Apps: make -C apps/web <target> or make -C apps/api <target>
# This Makefile provides combined targets and local Docker Compose.

.PHONY: fmt lint test build run run-api run-web \
	local-build local-up local-down local-recreate

# --- App targets (run in both apps) ---

fmt:
	$(MAKE) -C apps/api fmt
	$(MAKE) -C apps/web fmt

lint:
	$(MAKE) -C apps/api lint
	$(MAKE) -C apps/web lint

test:
	$(MAKE) -C apps/api test
	$(MAKE) -C apps/web test

build:
	$(MAKE) -C apps/api build
	$(MAKE) -C apps/web build

# Run dev servers (use separate terminals: make run-api and make run-web)
run-api:
	$(MAKE) -C apps/api run

run-web:
	$(MAKE) -C apps/web run

# --- Local Docker Compose (docker-compose.local.yml) ---
# Prereq: start Postgres with: docker compose -f docker-compose.postgres.yml up -d

COMPOSE_FILE := docker-compose.local.yml
COMPOSE_PROJECT := expense-manager-app

local-build:
	docker compose -p $(COMPOSE_PROJECT) -f $(COMPOSE_FILE) build

local-up:
	docker compose -p $(COMPOSE_PROJECT) -f $(COMPOSE_FILE) up -d

local-down:
	docker compose -p $(COMPOSE_PROJECT) -f $(COMPOSE_FILE) down

# Rebuild images (no cache), recreate containers, then start
local-recreate: local-down
	docker compose -p $(COMPOSE_PROJECT) -f $(COMPOSE_FILE) build --no-cache
	docker compose -p $(COMPOSE_PROJECT) -f $(COMPOSE_FILE) up -d --force-recreate
