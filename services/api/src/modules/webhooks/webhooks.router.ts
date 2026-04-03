import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { whatsappQueue } from '../../lib/queue';
import { db } from '../../db/client';
import {
  whatsappConversations, whatsappMessages, contacts, activities,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// ── Evolution API Webhook ────────────────────────────────────

router.post('/evolution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Responde imediatamente para Evolution não retentar
    res.status(200).json({ ok: true });

    const { event, instance, data } = req.body;

    if (event !== 'messages.upsert') return;
    if (!data?.key || !data?.message) return;

    const messageKey = data.key;
    const contactPhone = messageKey.remoteJid?.replace('@s.whatsapp.net', '');
    if (!contactPhone) return;

    // Ignora mensagens enviadas por nós
    if (messageKey.fromMe) return;

    const content =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption ||
      '';

    const messageType = Object.keys(data.message)[0]?.toUpperCase().replace('MESSAGE', '').replace('EXTENDED_TEXT', 'TEXT') || 'TEXT';

    // Busca ou cria conversa
    let [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.instanceId, instance),
          eq(whatsappConversations.contactPhone, contactPhone),
        )
      )
      .limit(1);

    if (!conversation) {
      // Determina modo: se é o número interno do Thiago → INTERNAL_ASSISTANT
      const isInternalNumber = contactPhone === env.EVOLUTION_MY_PHONE;
      const mode = isInternalNumber ? 'INTERNAL_ASSISTANT' : 'LEAD_QUALIFIER';

      const [newConv] = await db
        .insert(whatsappConversations)
        .values({
          instanceId: instance,
          contactPhone,
          mode,
          aiEnabled: true,
          lastMessageAt: new Date(),
        })
        .returning();
      conversation = newConv;

      // Se não é número interno, verifica se tem contato no CRM
      if (!isInternalNumber) {
        const [existingContact] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.phone, contactPhone))
          .limit(1);

        if (existingContact) {
          await db
            .update(whatsappConversations)
            .set({ contactId: existingContact.id })
            .where(eq(whatsappConversations.id, conversation.id));

          await db.insert(activities).values({
            contactId: existingContact.id,
            type: 'WHATSAPP_IN',
            content: content || '[mídia]',
            metadata: { instanceId: instance, conversationId: conversation.id },
          });
        }
      }
    } else {
      // Atualiza timestamp
      await db
        .update(whatsappConversations)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(whatsappConversations.id, conversation.id));
    }

    // Salva mensagem (dedup por evolution_msg_id)
    const evolutionMsgId = `${instance}_${messageKey.id}`;
    const existing = await db
      .select({ id: whatsappMessages.id })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.evolutionMsgId, evolutionMsgId))
      .limit(1);

    if (existing.length > 0) return; // duplicata

    const [savedMessage] = await db
      .insert(whatsappMessages)
      .values({
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: content || null,
        messageType: messageType as 'TEXT',
        evolutionMsgId,
      })
      .returning();

    // Enfileira para processamento pelo whatsapp-agent
    if (conversation.aiEnabled) {
      await whatsappQueue.add('process-message', {
        conversationId: conversation.id,
        messageId: savedMessage.id,
        instanceId: instance,
        contactPhone,
        content,
        messageType: savedMessage.messageType,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ── n8n Webhook (interno) ────────────────────────────────────

router.post('/n8n/:eventType', (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== env.INTERNAL_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { eventType } = req.params;
    console.log(`[Webhook] n8n event: ${eventType}`, req.body);

    // Eventos específicos do n8n são tratados aqui
    res.json({ ok: true, event: eventType });
  } catch (err) {
    next(err);
  }
});

// ── Reports (para n8n consultar) ─────────────────────────────

router.get('/reports/daily-briefing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== env.INTERNAL_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [leadsToFollow, overdueInvoices, overdueMilestones] = await Promise.all([
      db.execute(`
        SELECT c.name, c.company, lp.stage, lp.next_follow_up_at
        FROM lead_pipeline lp
        JOIN contacts c ON c.id = lp.contact_id
        WHERE lp.next_follow_up_at <= NOW() + INTERVAL '1 day'
          AND lp.stage NOT IN ('WON', 'LOST')
        ORDER BY lp.next_follow_up_at
        LIMIT 10
      `),
      db.execute(`
        SELECT i.number, i.amount, i.currency, c.name, c.company
        FROM invoices i
        JOIN contacts c ON c.id = i.contact_id
        WHERE i.status IN ('SENT', 'OVERDUE')
          AND i.due_date < NOW()
        ORDER BY i.due_date
        LIMIT 5
      `),
      db.execute(`
        SELECT m.title, p.name as project_name, m.due_date
        FROM milestones m
        JOIN projects p ON p.id = m.project_id
        WHERE m.status NOT IN ('DONE') AND m.due_date < NOW()
        ORDER BY m.due_date
        LIMIT 5
      `),
    ]);

    res.json({
      data: {
        leadsToFollow: leadsToFollow.rows,
        overdueInvoices: overdueInvoices.rows,
        overdueMilestones: overdueMilestones.rows,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
