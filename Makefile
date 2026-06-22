# Parallel — one entrypoint for dev, debug, test, and prod.
# Everything runs in containers so onboarding is: cp .env.example .env && make up && make seed
.DEFAULT_GOAL := help

DC      := docker compose
DC_PROD := docker compose -f docker-compose.prod.yml

.PHONY: help up down logs seed scan test test-backend test-frontend migrate fmt prod prod-down psql shell clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Build + start the local stack (db, api, frontend with hot reload)
	$(DC) up --build -d
	@echo "frontend → http://localhost:5173    api → http://localhost:5000"

down: ## Stop the local stack
	$(DC) down

logs: ## Tail all service logs
	$(DC) logs -f --tail=100

seed: ## Default data: scan content + demo users/likes/follow graph
	$(DC) run --rm api python -m scanner.scan_spotify --demo

scan: ## Scan Spotify content only (mock unless creds set)
	$(DC) run --rm api python -m scanner.scan_spotify

migrate: ## Create/sync DB schema (create_all runs on app start; this forces it)
	$(DC) run --rm api python -c "from app import create_app; create_app()"

test: test-backend test-frontend ## Run all tests (must pass before merge/deploy)

test-backend: ## Backend pytest (SQLite in-memory, mock Spotify)
	$(DC) run --rm -e DATABASE_URL=sqlite:///:memory: api \
		sh -c "pip install -q -r requirements-dev.txt && python -m pytest"

test-frontend: ## Frontend vitest smoke suite
	$(DC) run --rm frontend npm run test

fmt: ## Format/lint backend (ruff) + frontend (prettier/eslint)
	$(DC) run --rm api sh -c "pip install -q ruff && ruff check --fix . && ruff format ."
	$(DC) run --rm frontend npm run lint || true

prod: ## Build + run the production stack (gunicorn + built frontend + postgres)
	$(DC_PROD) up --build -d
	@echo "web → http://localhost:$${WEB_PORT:-8080}"

prod-down: ## Stop the production stack
	$(DC_PROD) down

psql: ## Open psql in the db container
	$(DC) exec db psql -U $${POSTGRES_USER:-parallel} -d $${POSTGRES_DB:-parallel}

shell: ## Open a shell in the api container
	$(DC) exec api sh

clean: ## Stop stack and remove volumes (DESTROYS local data)
	$(DC) down -v
