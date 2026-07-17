# ============================================
# Sidra Video Downloader - Makefile
# ============================================
# Common commands for development and operations

.PHONY: help dev build up down logs migrate shell backup update-ytdlp clean test

# Default target
help: ## Show this help message
	@echo "Sidra Video Downloader - Available Commands"
	@echo "============================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- Development ----

dev: ## Start development environment (with hot reload)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-d: ## Start development environment (detached)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# ---- Production ----

build: ## Build all Docker images
	docker compose build

up: ## Start all services (production)
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

# ---- Synology ----

synology-up: ## Start Synology NAS deployment
	docker compose -f docker-compose.synology.yml up -d --build

synology-down: ## Stop Synology NAS deployment
	docker compose -f docker-compose.synology.yml down

synology-logs: ## View Synology deployment logs
	docker compose -f docker-compose.synology.yml logs -f

# ---- Logs ----

logs: ## View all service logs (follow)
	docker compose logs -f

logs-backend: ## View backend logs
	docker compose logs -f backend

logs-worker: ## View worker logs
	docker compose logs -f worker

logs-nginx: ## View nginx logs
	docker compose logs -f nginx

# ---- Database ----

migrate: ## Run database migrations
	docker compose exec backend flask db upgrade

migration: ## Create a new migration
	docker compose exec backend flask db migrate -m "$(msg)"

migrate-down: ## Downgrade database by one revision
	docker compose exec backend flask db downgrade

# ---- Admin ----

admin: ## Create admin user
	docker compose exec backend python create_admin.py

# ---- Shell Access ----

shell: ## Open a shell in the backend container
	docker compose exec backend /bin/bash

shell-db: ## Open PostgreSQL shell
	docker compose exec db psql -U $${POSTGRES_USER:-sidra} -d $${POSTGRES_DB:-sidra_downloader}

shell-redis: ## Open Redis CLI
	docker compose exec redis redis-cli

# ---- Maintenance ----

backup: ## Backup the database
	@mkdir -p backups
	docker compose exec -T db pg_dump -U $${POSTGRES_USER:-sidra} $${POSTGRES_DB:-sidra_downloader} > backups/sidra_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup saved to backups/"

restore: ## Restore database from backup (usage: make restore file=backup.sql)
	docker compose exec -T db psql -U $${POSTGRES_USER:-sidra} $${POSTGRES_DB:-sidra_downloader} < $(file)

update-ytdlp: ## Update yt-dlp to latest version
	docker compose exec backend pip install --upgrade yt-dlp
	docker compose exec worker pip install --upgrade yt-dlp
	docker compose restart backend worker
	@echo "yt-dlp updated!"

# ---- Cleanup ----

clean: ## Remove all containers, volumes, and images
	docker compose down -v --rmi all --remove-orphans
	@echo "Cleanup complete!"

prune: ## Prune unused Docker resources
	docker system prune -f
	docker volume prune -f

# ---- Status ----

status: ## Show status of all services
	docker compose ps

stats: ## Show resource usage
	docker stats --no-stream

health: ## Check health of all services
	@echo "Backend:"
	@docker compose exec backend curl -sf http://localhost:5000/api/health || echo "  DOWN"
	@echo "Database:"
	@docker compose exec db pg_isready -U $${POSTGRES_USER:-sidra} || echo "  DOWN"
	@echo "Redis:"
	@docker compose exec redis redis-cli ping || echo "  DOWN"
