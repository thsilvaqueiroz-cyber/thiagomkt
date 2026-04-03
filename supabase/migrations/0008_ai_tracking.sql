-- ============================================================
-- Migration 0008: Rastreamento de Uso de IA
-- Visibilidade total de custo — crítico para founder solo
-- ============================================================

CREATE TYPE ai_agent_type AS ENUM (
  'PROPOSAL_WRITER',
  'CONTENT_WRITER',
  'LEAD_QUALIFIER',
  'WHATSAPP_RESPONDER',
  'PROJECT_ASSISTANT',
  'DAILY_BRIEFING'
);

-- Log de todas as chamadas Claude
CREATE TABLE ai_agent_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type    ai_agent_type NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}',
  output        TEXT,
  model         VARCHAR(100) NOT NULL,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      DECIMAL(10, 6),  -- Custo calculado no backend
  duration_ms   INTEGER,
  success       BOOLEAN NOT NULL DEFAULT true,
  error         TEXT,
  reference_id  UUID,  -- ID do objeto relacionado (contact, project, etc.)
  reference_type VARCHAR(50),  -- 'contact', 'project', 'proposal', etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_runs_agent_type ON ai_agent_runs(agent_type);
CREATE INDEX idx_ai_runs_created ON ai_agent_runs(created_at DESC);
CREATE INDEX idx_ai_runs_reference ON ai_agent_runs(reference_id) WHERE reference_id IS NOT NULL;

-- Adicionar FK reversa em whatsapp_messages
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT fk_wa_msg_ai_run
  FOREIGN KEY (ai_run_id) REFERENCES ai_agent_runs(id) ON DELETE SET NULL;

-- View: gasto mensal de IA
CREATE VIEW ai_monthly_cost AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  agent_type,
  COUNT(*) AS total_runs,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(cost_usd) AS total_cost_usd,
  AVG(duration_ms) AS avg_duration_ms,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) AS failed_runs
FROM ai_agent_runs
GROUP BY DATE_TRUNC('month', created_at), agent_type
ORDER BY month DESC, total_cost_usd DESC;
