-- ============================================================
-- Migration 0002: Pipeline de Leads e Atividades
-- ============================================================

-- Enum: estágio do pipeline
CREATE TYPE pipeline_stage AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST'
);

-- Enum: tipo de atividade
CREATE TYPE activity_type AS ENUM (
  'NOTE',
  'WHATSAPP_IN',
  'WHATSAPP_OUT',
  'EMAIL',
  'CALL',
  'MEETING',
  'STAGE_CHANGE',
  'SYSTEM'
);

-- Pipeline de leads
CREATE TABLE lead_pipeline (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id           UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  stage                pipeline_stage NOT NULL DEFAULT 'NEW',
  estimated_value      DECIMAL(12, 2),
  currency             CHAR(3) NOT NULL DEFAULT 'BRL',
  lost_reason          VARCHAR(500),
  next_follow_up_at    TIMESTAMPTZ,
  assigned_proposal_id UUID,  -- FK adicionada depois (proposals ainda não existe)
  priority             SMALLINT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipeline_contact ON lead_pipeline(contact_id);
CREATE INDEX idx_pipeline_stage ON lead_pipeline(stage);
CREATE INDEX idx_pipeline_follow_up ON lead_pipeline(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

CREATE TRIGGER pipeline_updated_at
  BEFORE UPDATE ON lead_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atividades (log completo de todas as interações)
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type        activity_type NOT NULL,
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',  -- message_id, duration, old_stage, new_stage, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
