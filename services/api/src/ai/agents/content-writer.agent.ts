import { callClaude } from '../claude.client';
import { db } from '../../db/client';
import { contentPosts } from '../../db/schema';
import { desc } from 'drizzle-orm';

interface ContentInput {
  topic: string;
  platform: 'LINKEDIN' | 'INSTAGRAM' | 'TWITTER';
  tone?: 'educativo' | 'provocativo' | 'storytelling' | 'lista';
}

const SYSTEM_PROMPT = `Você escreve conteúdo de marketing para Thiago Silva, fundador da ThiagoMKT Tecnologia.

SOBRE THIAGO:
- Especialista em IA e automação para WhatsApp
- Atende PMEs: restaurantes, clínicas, academias, comércios
- Tom: direto, prático, sem enrolação, linguagem acessível (não é tech para tech)
- Posicionamento: "IA que gera resultado, não apenas tecnologia"

PRODUTOS VENDIDOS:
- Agente de IA no WhatsApp (responde 24h, qualifica leads, agenda)
- Automações internas (CRM, marketing, processos)
- Sistemas completos (site + WhatsApp + IA integrados)

REGRAS POR PLATAFORMA:
LinkedIn:
- Máx 3000 chars, ideal 800-1500
- Quebras de linha frequentes
- Termina com CTA e pergunta
- Hashtags relevantes ao final

Instagram:
- Máx 2200 chars, ideal 300-600
- Emojis estratégicos
- CTA para link na bio

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "mainContent": "...",
  "hookVariants": [
    "Hook 1 — direto",
    "Hook 2 — provocativo",
    "Hook 3 — storytelling"
  ],
  "suggestedHashtags": ["#automacao", "#ia", ...]
}`;

export async function writeContent(input: ContentInput): Promise<{
  postId: string;
  content: string;
  hookVariants: string[];
}> {
  // Busca últimos posts para evitar repetição
  const recentPosts = await db
    .select({ sourceTopic: contentPosts.sourceTopic, platform: contentPosts.platform })
    .from(contentPosts)
    .orderBy(desc(contentPosts.createdAt))
    .limit(10);

  const recentTopics = recentPosts.map((p) => p.sourceTopic).filter(Boolean).join(', ');

  const userMessage = `
Plataforma: ${input.platform}
Tom desejado: ${input.tone ?? 'educativo'}
Tópico: ${input.topic}

Tópicos recentes (EVITAR repetição): ${recentTopics || 'nenhum ainda'}

Escreva o post agora. Retorne apenas o JSON.
  `.trim();

  const result = await callClaude({
    agentType: 'CONTENT_WRITER',
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 2000,
    inputContext: { topic: input.topic, platform: input.platform },
  });

  let parsed: { mainContent: string; hookVariants: string[]; suggestedHashtags: string[] };
  try {
    parsed = JSON.parse(result.content);
  } catch {
    // Se não for JSON válido, usa o conteúdo direto
    parsed = { mainContent: result.content, hookVariants: [], suggestedHashtags: [] };
  }

  // Compõe conteúdo final com hook padrão (primeiro variante)
  const finalContent = parsed.hookVariants[0]
    ? `${parsed.hookVariants[0]}\n\n${parsed.mainContent}`
    : parsed.mainContent;

  const [post] = await db.insert(contentPosts).values({
    platform: input.platform,
    content: finalContent,
    status: 'DRAFT',
    aiGenerated: true,
    sourceTopic: input.topic,
    hookVariants: parsed.hookVariants,
  }).returning();

  return {
    postId: post.id,
    content: finalContent,
    hookVariants: parsed.hookVariants,
  };
}
