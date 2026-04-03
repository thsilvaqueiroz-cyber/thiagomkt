-- ============================================================
-- Seed de desenvolvimento — ThiagoMKT
-- Execute: make seed
-- ============================================================

-- Limpar dados de dev (seguro pois seed só roda em dev)
TRUNCATE TABLE
  ai_agent_runs,
  whatsapp_messages,
  whatsapp_conversations,
  content_posts,
  expenses,
  invoices,
  time_entries,
  milestones,
  projects,
  proposals,
  activities,
  lead_pipeline,
  contacts
RESTART IDENTITY CASCADE;

-- ── Contatos ──────────────────────────────────────────────

INSERT INTO contacts (id, type, name, company, email, phone, source, tags) VALUES
  ('11111111-0000-0000-0000-000000000001', 'LEAD', 'Carlos Mendes', 'Restaurante Sabor & Arte', 'carlos@saborarte.com.br', '5511987654321', 'INSTAGRAM', ARRAY['restaurante', 'atendimento']),
  ('11111111-0000-0000-0000-000000000002', 'LEAD', 'Ana Rodrigues', 'Clínica Bella Forma', 'ana@bellaforma.com.br', '5511976543210', 'LINKEDIN', ARRAY['clinica', 'agendamento']),
  ('11111111-0000-0000-0000-000000000003', 'CLIENT', 'Pedro Alves', 'Autopeças do Pedro', 'pedro@autopecas.com.br', '5511965432109', 'REFERRAL', ARRAY['automotivo', 'vendas']),
  ('11111111-0000-0000-0000-000000000004', 'LEAD', 'Mariana Silva', 'Academia FitLife', 'mariana@fitlife.com.br', '5511954321098', 'WHATSAPP_INBOUND', ARRAY['academia', 'matriculas']),
  ('11111111-0000-0000-0000-000000000005', 'LEAD', 'Roberto Costa', 'Imobiliária Costa', 'roberto@imocosta.com.br', '5511943210987', 'COLD_OUTREACH', ARRAY['imobiliaria', 'atendimento']);

-- ── Pipeline ──────────────────────────────────────────────

INSERT INTO lead_pipeline (contact_id, stage, estimated_value, next_follow_up_at) VALUES
  ('11111111-0000-0000-0000-000000000001', 'QUALIFIED', 4800.00, NOW() + INTERVAL '2 days'),
  ('11111111-0000-0000-0000-000000000002', 'PROPOSAL_SENT', 8500.00, NOW() + INTERVAL '5 days'),
  ('11111111-0000-0000-0000-000000000004', 'CONTACTED', 3500.00, NOW() + INTERVAL '1 day'),
  ('11111111-0000-0000-0000-000000000005', 'NEW', 6000.00, NOW() + INTERVAL '3 days');

-- ── Atividades ────────────────────────────────────────────

INSERT INTO activities (contact_id, type, content) VALUES
  ('11111111-0000-0000-0000-000000000001', 'WHATSAPP_IN', 'Oi, vi no Instagram que vocês fazem chatbot pra WhatsApp. Tenho restaurante e quero automatizar pedidos e reservas.'),
  ('11111111-0000-0000-0000-000000000001', 'WHATSAPP_OUT', 'Olá Carlos! Sim, criamos agentes de IA completos para WhatsApp. Para um restaurante, podemos automatizar cardápio digital, reservas e até confirmação de pedidos. Posso te contar mais?'),
  ('11111111-0000-0000-0000-000000000002', 'NOTE', 'Clínica estética com 3 profissionais. Dor principal: agenda manual, WhatsApp lotado, pacientes cancelando sem avisar. Quer automação de lembretes de consulta e confirmação.'),
  ('11111111-0000-0000-0000-000000000002', 'STAGE_CHANGE', 'Proposta enviada via WhatsApp. Aguardando retorno em 5 dias.');

-- ── Projetos do cliente ativo ─────────────────────────────

INSERT INTO projects (id, contact_id, name, type, status, contracted_value, start_date, deadline) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'Agente WhatsApp — Autopeças do Pedro', 'WHATSAPP_SERVICE', 'IN_PROGRESS', 5500.00, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days');

INSERT INTO milestones (project_id, title, status, due_date, order_index) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Levantamento de requisitos e FAQ', 'DONE', CURRENT_DATE - INTERVAL '10 days', 1),
  ('22222222-0000-0000-0000-000000000001', 'Configuração da instância WhatsApp', 'DONE', CURRENT_DATE - INTERVAL '5 days', 2),
  ('22222222-0000-0000-0000-000000000001', 'Treinamento do agente IA com catálogo de peças', 'IN_PROGRESS', CURRENT_DATE + INTERVAL '5 days', 3),
  ('22222222-0000-0000-0000-000000000001', 'Testes com cliente e ajustes', 'PENDING', CURRENT_DATE + INTERVAL '10 days', 4),
  ('22222222-0000-0000-0000-000000000001', 'Entrega e treinamento da equipe', 'PENDING', CURRENT_DATE + INTERVAL '15 days', 5);

-- ── Finanças ──────────────────────────────────────────────

INSERT INTO invoices (contact_id, project_id, number, amount, status, due_date) VALUES
  ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'INV-2024-001', 2750.00, 'PAID', CURRENT_DATE - INTERVAL '5 days');

INSERT INTO expenses (category, description, amount, recurring) VALUES
  ('SOFTWARE', 'Anthropic API — Claude', 45.00, true),
  ('SOFTWARE', 'Supabase — Plano Pro', 25.00, true),
  ('INFRASTRUCTURE', 'VPS — servidor de produção', 35.00, true),
  ('SOFTWARE', 'Evolution API — licença', 20.00, true),
  ('MARKETING', 'LinkedIn Premium', 80.00, true);

-- ── Conteúdo ──────────────────────────────────────────────

INSERT INTO content_posts (platform, content, status, ai_generated, source_topic) VALUES
  ('LINKEDIN', 'Você sabia que 73% dos clientes desistem de comprar quando não são respondidos em 5 minutos?

Trabalhei com uma autopeças aqui em SP que perdia leads todos os dias por isso.

Implementamos um agente de IA no WhatsApp deles. Resultado:
→ Resposta em segundos, 24h por dia
→ Catálogo de peças integrado
→ Orçamentos automáticos

O dono me ligou na semana passada: "Thiago, meu WhatsApp virou vendedor".

Se você tem um negócio com atendimento repetitivo, vamos conversar.', 'PUBLISHED', true, 'case study autopeças'),

  ('LINKEDIN', '3 sinais de que sua empresa precisa de automação de IA agora:

1. Você responde as mesmas perguntas toda semana
2. Leads somem porque a resposta demorou
3. Você trabalha NO negócio em vez de trabalhar NO crescimento

Automação de IA não é luxo. É a diferença entre crescer ou ficar estagnado.', 'DRAFT', true, 'sinais que precisa de automação');
