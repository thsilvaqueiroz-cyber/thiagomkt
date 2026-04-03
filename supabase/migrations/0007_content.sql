-- ============================================================
-- Migration 0007: Conteúdo e Marketing
-- ============================================================

CREATE TYPE content_platform AS ENUM (
  'LINKEDIN',
  'INSTAGRAM',
  'TWITTER',
  'WHATSAPP_BROADCAST',
  'OTHER'
);

CREATE TYPE content_status AS ENUM (
  'IDEA',
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED'
);

-- Posts de conteúdo
CREATE TABLE content_posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform      content_platform NOT NULL DEFAULT 'LINKEDIN',
  content       TEXT NOT NULL,
  media_urls    TEXT[] DEFAULT '{}',
  status        content_status NOT NULL DEFAULT 'IDEA',
  scheduled_for TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  ai_generated  BOOLEAN DEFAULT false,
  source_topic  VARCHAR(500),  -- Tópico/prompt que originou o post
  hook_variants JSONB DEFAULT '[]',  -- Array com variações de hook geradas pelo Claude
  engagement    JSONB DEFAULT '{}',  -- Métricas: likes, comments, shares
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_platform ON content_posts(platform);
CREATE INDEX idx_content_status ON content_posts(status);
CREATE INDEX idx_content_scheduled ON content_posts(scheduled_for) WHERE scheduled_for IS NOT NULL;

CREATE TRIGGER content_posts_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
