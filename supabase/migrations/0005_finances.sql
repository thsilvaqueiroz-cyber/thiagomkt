-- ============================================================
-- Migration 0005: Finanças (Faturas e Despesas)
-- ============================================================

CREATE TYPE invoice_status AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE expense_category AS ENUM (
  'SOFTWARE',
  'MARKETING',
  'INFRASTRUCTURE',
  'TAXES',
  'EDUCATION',
  'EQUIPMENT',
  'OTHER'
);

-- Faturas
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  contact_id     UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  number         VARCHAR(50) NOT NULL UNIQUE,  -- Formato: INV-2024-001
  amount         DECIMAL(12, 2) NOT NULL,
  currency       CHAR(3) NOT NULL DEFAULT 'BRL',
  status         invoice_status NOT NULL DEFAULT 'DRAFT',
  due_date       DATE,
  paid_at        TIMESTAMPTZ,
  payment_method VARCHAR(100),
  payment_link   VARCHAR(500),
  notes          TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Despesas
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    expense_category NOT NULL DEFAULT 'OTHER',
  description VARCHAR(500) NOT NULL,
  amount      DECIMAL(12, 2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'BRL',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring   BOOLEAN DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_recurring ON expenses(recurring) WHERE recurring = true;

-- View auxiliar: resumo financeiro mensal
CREATE VIEW monthly_finance_summary AS
SELECT
  DATE_TRUNC('month', date_series) AS month,
  COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'PAID'), 0) AS revenue_received,
  COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('SENT', 'OVERDUE')), 0) AS revenue_expected,
  COALESCE(SUM(e.amount), 0) AS expenses_total
FROM
  GENERATE_SERIES(
    DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
    DATE_TRUNC('month', NOW()),
    '1 month'::INTERVAL
  ) AS date_series
  LEFT JOIN invoices i ON DATE_TRUNC('month', i.created_at) = DATE_TRUNC('month', date_series)
  LEFT JOIN expenses e ON DATE_TRUNC('month', e.date) = DATE_TRUNC('month', date_series)
GROUP BY month
ORDER BY month;
