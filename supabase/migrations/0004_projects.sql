-- ============================================================
-- Migration 0004: Projetos e Milestones
-- ============================================================

CREATE TYPE project_status AS ENUM (
  'SCOPING',
  'IN_PROGRESS',
  'REVIEW',
  'DELIVERED',
  'MAINTENANCE',
  'CANCELLED'
);

CREATE TYPE project_type AS ENUM (
  'AI_AGENT',
  'AUTOMATION',
  'WHATSAPP_SERVICE',
  'CONSULTING',
  'OTHER'
);

CREATE TYPE milestone_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'OVERDUE'
);

-- Projetos
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id        UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  proposal_id       UUID REFERENCES proposals(id) ON DELETE SET NULL,
  name              VARCHAR(500) NOT NULL,
  description       TEXT,
  type              project_type NOT NULL DEFAULT 'OTHER',
  status            project_status NOT NULL DEFAULT 'SCOPING',
  contracted_value  DECIMAL(12, 2),
  currency          CHAR(3) NOT NULL DEFAULT 'BRL',
  start_date        DATE,
  deadline          DATE,
  delivered_at      TIMESTAMPTZ,
  repository_url    VARCHAR(500),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_contact ON projects(contact_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deadline ON projects(deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Milestones
CREATE TABLE milestones (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  status       milestone_status NOT NULL DEFAULT 'PENDING',
  order_index  SMALLINT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Registro de horas
CREATE TABLE time_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description  VARCHAR(500) NOT NULL,
  hours        DECIMAL(5, 2) NOT NULL CHECK (hours > 0),
  logged_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  billable     BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(logged_at DESC);
