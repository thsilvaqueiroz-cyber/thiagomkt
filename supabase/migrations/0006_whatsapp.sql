-- ============================================================
-- Migration 0006: WhatsApp (Conversas e Mensagens)
-- ============================================================

CREATE TYPE wa_conversation_mode AS ENUM (
  'INTERNAL_ASSISTANT',  -- Thiago comandando o sistema
  'LEAD_QUALIFIER',      -- Qualificando lead automaticamente
  'CLIENT_DEMO',         -- Demo produto para cliente
  'MANUAL'               -- Conversa manual, sem IA
);

CREATE TYPE wa_message_direction AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE wa_message_type AS ENUM (
  'TEXT',
  'AUDIO',
  'IMAGE',
  'DOCUMENT',
  'VIDEO',
  'STICKER',
  'BUTTON_REPLY',
  'LIST_REPLY',
  'REACTION'
);

-- Conversas WhatsApp
CREATE TABLE whatsapp_conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id      VARCHAR(100) NOT NULL,  -- Nome da instância Evolution API
  contact_phone    VARCHAR(20) NOT NULL,   -- E.164 sem +
  contact_id       UUID REFERENCES contacts(id) ON DELETE SET NULL,
  mode             wa_conversation_mode NOT NULL DEFAULT 'LEAD_QUALIFIER',
  ai_enabled       BOOLEAN DEFAULT true,
  ai_paused_until  TIMESTAMPTZ,  -- Pausa temporária da IA (humano tomou controle)
  last_message_at  TIMESTAMPTZ,
  context_summary  TEXT,  -- Resumo do Claude para manter contexto longo
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instance_id, contact_phone)
);

CREATE INDEX idx_wa_conv_instance ON whatsapp_conversations(instance_id);
CREATE INDEX idx_wa_conv_phone ON whatsapp_conversations(contact_phone);
CREATE INDEX idx_wa_conv_contact ON whatsapp_conversations(contact_id);
CREATE INDEX idx_wa_conv_last_message ON whatsapp_conversations(last_message_at DESC);

CREATE TRIGGER wa_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction           wa_message_direction NOT NULL,
  content             TEXT,
  media_url           VARCHAR(1000),
  message_type        wa_message_type NOT NULL DEFAULT 'TEXT',
  evolution_msg_id    VARCHAR(200) UNIQUE,  -- ID da Evolution API (dedup)
  processed_by_ai     BOOLEAN DEFAULT false,
  ai_run_id           UUID,  -- FK para ai_agent_runs (adicionada depois)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msg_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_wa_msg_direction ON whatsapp_messages(direction);
CREATE INDEX idx_wa_msg_created ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_wa_msg_evolution_id ON whatsapp_messages(evolution_msg_id) WHERE evolution_msg_id IS NOT NULL;
