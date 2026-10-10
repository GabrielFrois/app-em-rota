import { inArray } from 'drizzle-orm';
import { db } from '../db';
import { pushTokens } from '../db/schema';

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function notifyUsers(
  userIds: string[],
  excludeUserId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const targets = userIds.filter(id => id !== excludeUserId);
  console.log(`[Push] notifyUsers → targets: ${targets.length}, excludeUserId: ${excludeUserId}`);
  if (targets.length === 0) { console.log('[Push] Nenhum alvo, abortando'); return; }

  const rows = await db
    .select({ token: pushTokens.token, userId: pushTokens.userId })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, targets));

  console.log(`[Push] Tokens encontrados: ${rows.length}`);
  if (rows.length === 0) { console.log('[Push] Nenhum token registrado para os alvos'); return; }

  rows.forEach(r => console.log(`[Push] Token: ${r.token.slice(0, 30)}... userId: ${r.userId}`));

  const messages: ExpoPushMessage[] = rows.map(r => ({
    to:    r.token,
    title,
    body,
    sound: 'default',
    data,
  }));

  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  for (const chunk of chunks) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(chunk),
      });

      const json = await res.json() as { data: ExpoPushTicket[] };
      console.log(`[Push] Resposta Expo API status: ${res.status}`);

      json.data?.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          console.log(`[Push] ✅ Ticket ${i}: ok, id=${ticket.id}`);
        } else {
          console.error(`[Push] ❌ Ticket ${i}: erro=${ticket.message}, details=${JSON.stringify(ticket.details)}`);
        }
      });
    } catch (err) {
      console.error('[Push] Falha ao chamar Expo API:', err);
    }
  }
}