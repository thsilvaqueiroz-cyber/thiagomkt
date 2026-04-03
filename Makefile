.PHONY: up down restart logs shell-api shell-n8n migrate migrate-dev seed backup setup help

# Cores para output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

help: ## Mostra este menu de ajuda
	@echo ""
	@echo "$(CYAN)ThiagoMKT — Ecossistema de Automação$(RESET)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ── Infraestrutura ──────────────────────────────────────────

up: ## Sobe todos os serviços em background
	@echo "$(CYAN)Subindo serviços...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)✓ Serviços rodando$(RESET)"
	@$(MAKE) urls

up-dev: ## Sobe com hot-reload (modo desenvolvimento)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

down: ## Para todos os serviços
	docker compose down

restart: ## Reinicia todos os serviços
	docker compose restart

logs: ## Exibe logs de todos os serviços (Ctrl+C para sair)
	docker compose logs -f

logs-api: ## Logs só do backend API
	docker compose logs -f api

logs-agent: ## Logs só do whatsapp-agent
	docker compose logs -f whatsapp-agent

ps: ## Status dos containers
	docker compose ps

# ── Acesso aos containers ────────────────────────────────────

shell-api: ## Abre shell no container da API
	docker compose exec api sh

shell-agent: ## Abre shell no container do whatsapp-agent
	docker compose exec whatsapp-agent sh

shell-redis: ## Abre redis-cli
	docker compose exec redis redis-cli

# ── Banco de dados ───────────────────────────────────────────

migrate: ## Aplica migrations no Supabase (produção)
	@echo "$(CYAN)Aplicando migrations no Supabase...$(RESET)"
	cd services/api && pnpm drizzle-kit push
	@echo "$(GREEN)✓ Migrations aplicadas$(RESET)"

migrate-generate: ## Gera nova migration a partir do schema Drizzle
	cd services/api && pnpm drizzle-kit generate

migrate-studio: ## Abre Drizzle Studio (visualizador do banco)
	cd services/api && pnpm drizzle-kit studio

seed: ## Popula banco com dados de desenvolvimento
	@echo "$(CYAN)Populando banco com dados de dev...$(RESET)"
	cd services/api && pnpm ts-node src/db/seed.ts
	@echo "$(GREEN)✓ Seed concluído$(RESET)"

# ── Build ─────────────────────────────────────────────────────

build: ## Builda todos os serviços Docker
	docker compose build

build-api: ## Builda só a API
	docker compose build api

build-dashboard: ## Builda só o dashboard
	docker compose build dashboard

build-agent: ## Builda só o whatsapp-agent
	docker compose build whatsapp-agent

# ── Manutenção ───────────────────────────────────────────────

backup: ## Faz backup do banco e envia para storage
	@echo "$(CYAN)Iniciando backup...$(RESET)"
	bash scripts/backup.sh
	@echo "$(GREEN)✓ Backup concluído$(RESET)"

setup: ## Configuração inicial — gera .env com segredos
	@echo "$(CYAN)Executando setup inicial...$(RESET)"
	bash scripts/setup.sh

deploy: ## Pull + build + restart (deploy em produção)
	@echo "$(CYAN)Deploy iniciado...$(RESET)"
	bash scripts/deploy.sh

# ── Utilitários ──────────────────────────────────────────────

urls: ## Mostra as URLs de todos os serviços
	@echo ""
	@echo "$(CYAN)URLs dos serviços:$(RESET)"
	@echo "  Dashboard:    https://app.$${DOMAIN:-localhost:3000}"
	@echo "  API:          https://api.$${DOMAIN:-localhost:3001}"
	@echo "  n8n:          https://n8n.$${DOMAIN:-localhost:5678}"
	@echo "  Evolution:    https://wa.$${DOMAIN:-localhost:8080}"
	@echo "  Traefik:      http://localhost:8090"
	@echo ""

install: ## Instala dependências de todos os pacotes
	pnpm install

type-check: ## Verifica tipos TypeScript em todos os serviços
	pnpm -r type-check

lint: ## Roda linting em todos os serviços
	pnpm -r lint

clean: ## Remove node_modules e builds
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
	find . -name "dist" -type d -prune -exec rm -rf {} +
	find . -name ".next" -type d -prune -exec rm -rf {} +
	@echo "$(GREEN)✓ Limpo$(RESET)"
