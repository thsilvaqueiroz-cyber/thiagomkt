#!/bin/bash
# ============================================================
# ThiagoMKT — Deploy em Produção
# Pull + Build + Restart com zero downtime
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${CYAN}🚀 Iniciando deploy...${RESET}"

# Pull latest
echo "Puxando atualizações..."
git pull origin $(git rev-parse --abbrev-ref HEAD)

# Build
echo "Buildando imagens..."
docker compose build --no-cache api dashboard whatsapp-agent

# Restart gracioso (um serviço por vez)
echo "Atualizando serviços..."
docker compose up -d --no-deps api
sleep 5
docker compose up -d --no-deps dashboard
sleep 3
docker compose up -d --no-deps whatsapp-agent

echo -e "${GREEN}✅ Deploy concluído!${RESET}"
docker compose ps
