#!/bin/bash
# ============================================================
# ThiagoMKT — Backup do Banco de Dados
# ============================================================

set -e

source "$(dirname "$0")/../.env" 2>/dev/null || true

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Iniciando backup... (${TIMESTAMP})"

# Dump via pg_dump (conecta diretamente no Supabase)
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  -h "${SUPABASE_DB_HOST}" \
  -U "${SUPABASE_DB_USER:-postgres}" \
  -d postgres \
  --no-owner \
  --no-acl \
  -F plain \
  | gzip > "${BACKUP_FILE}"

echo "✓ Backup salvo: ${BACKUP_FILE}"

# Remove backups com mais de 7 dias
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "✓ Backups antigos removidos"
