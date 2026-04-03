-- ============================================================
-- Migration 0001: Contacts
-- Tabela unificada de leads e clientes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum: tipo de contato
CREATE TYPE contact_type AS ENUM ('LEAD', 'CLIENT', 'PARTNER');

-- Enum: fonte de origem
CREATE TYPE contact_source AS ENUM (
  'REFERRAL',
  'LINKEDIN',
  'INSTAGRAM',
  'COLD_OUTREACH',
  'WEBSITE',
  'WHATSAPP_INBOUND',
  'OTHER'
);

-- Tabela principal de contatos
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          contact_type NOT NULL DEFAULT 'LEAD',
  name          VARCHAR(255) NOT NULL,
  company       VARCHAR(255),
  email         VARCHAR(255),
  phone         VARCHAR(20),     -- Formato E.164 sem + (ex: 5511999999999)
  website       VARCHAR(500),
  linkedin_url  VARCHAR(500),
  source        contact_source DEFAULT 'OTHER',
  tags          TEXT[] DEFAULT '{}',
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',  -- Campos extras sem precisar de migration
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
