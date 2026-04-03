#!/bin/bash
# ============================================================
# ThiagoMKT — Setup Inicial
# Gera segredos, cria .env e configura o ambiente
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║   ThiagoMKT — Setup Inicial           ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${RESET}"

# Verifica dependências
for cmd in openssl docker; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "${RED}❌ '$cmd' não encontrado. Instale antes de continuar.${RESET}"
    exit 1
  fi
done

# Cria .env se não existe
if [ -f ".env" ]; then
  echo -e "${YELLOW}⚠️  Arquivo .env já existe. Pulando geração de segredos.${RESET}"
  echo -e "   Para regenerar, delete o .env e rode novamente."
  exit 0
fi

echo -e "${CYAN}Gerando segredos...${RESET}"

JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
EVOLUTION_API_KEY=$(openssl rand -hex 20)
N8N_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
INTERNAL_WEBHOOK_SECRET=$(openssl rand -hex 24)

echo -e "${CYAN}Criando .env...${RESET}"

cat > .env << EOF
# ============================================================
# ThiagoMKT — Ambiente Gerado em $(date)
# NÃO commite este arquivo!
# ============================================================

# === DOMÍNIO ===
DOMAIN=localhost

# === SUPABASE ===
# Preencha com seus dados do Supabase (https://supabase.com)
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=COLE_AQUI_A_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_SERVICE_ROLE_KEY
SUPABASE_DB_HOST=db.SEU_PROJETO.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=COLE_AQUI_A_SENHA_DO_DB
DATABASE_URL=postgresql://postgres:SENHA@db.SEU_PROJETO.supabase.co:5432/postgres

# === REDIS ===
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# === AUTH ===
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000

# === CLAUDE AI ===
# Obtenha em https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-COLE_AQUI
AI_DEFAULT_MODEL=claude-sonnet-4-6
AI_FAST_MODEL=claude-haiku-4-5-20251001
AI_MAX_MONTHLY_BUDGET_USD=100

# === EVOLUTION API ===
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
EVOLUTION_MY_INSTANCE=thiago-personal
EVOLUTION_MY_PHONE=5511999999999

# === N8N ===
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_API_URL=http://api:3001
N8N_API_INTERNAL_SECRET=${INTERNAL_WEBHOOK_SECRET}

# === TRAEFIK ===
TRAEFIK_ACME_EMAIL=seu@email.com
TRAEFIK_DASHBOARD_ENABLED=true

# === API ===
API_PORT=3001
NODE_ENV=production
INTERNAL_WEBHOOK_SECRET=${INTERNAL_WEBHOOK_SECRET}

# === DASHBOARD ===
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLE_AQUI_A_ANON_KEY
EOF

echo -e "${GREEN}✓ .env criado com sucesso!${RESET}"
echo ""
echo -e "${YELLOW}Próximos passos:${RESET}"
echo ""
echo "  1. Crie um projeto no Supabase (https://supabase.com)"
echo "  2. Edite o .env com os dados do Supabase:"
echo "     nano .env"
echo ""
echo "  3. Configure a chave da API Claude:"
echo "     https://console.anthropic.com"
echo ""
echo "  4. Coloque seu número do WhatsApp em EVOLUTION_MY_PHONE"
echo ""
echo "  5. Suba os serviços:"
echo "     make up"
echo ""
echo "  6. Aplique as migrations:"
echo "     make migrate"
echo ""
echo -e "${CYAN}Credenciais geradas:${RESET}"
echo "  n8n:          admin / ${N8N_PASSWORD}"
echo "  Evolution:    API Key = ${EVOLUTION_API_KEY}"
echo ""
echo -e "${GREEN}Guarde essas credenciais em local seguro!${RESET}"
