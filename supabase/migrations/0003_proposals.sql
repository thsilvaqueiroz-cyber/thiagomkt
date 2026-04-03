-- ============================================================
-- Migration 0003: Propostas
-- ============================================================

CREATE TYPE proposal_status AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE proposals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title         VARCHAR(500) NOT NULL,
  content       TEXT NOT NULL,  -- Markdown — escrito pelo Claude
  value         DECIMAL(12, 2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'BRL',
  status        proposal_status NOT NULL DEFAULT 'DRAFT',
  valid_until   DATE,
  sent_at       TIMESTAMPTZ,
  viewed_at     TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  ai_generated  BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_contact ON proposals(contact_id);
CREATE INDEX idx_proposals_status ON proposals(status);

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agora que proposals existe, adicionar FK na pipeline
ALTER TABLE lead_pipeline
  ADD CONSTRAINT fk_pipeline_proposal
  FOREIGN KEY (assigned_proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;
