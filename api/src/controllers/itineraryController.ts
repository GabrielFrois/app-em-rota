import { Response } from 'express';
import { eq, and, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { itineraries, itineraryDays, activities, itineraryShares, users } from '../db/schema';
import { AuthRequest } from '../middleware/auth';
import { notifyUsers } from '../services/pushService';


// ─── Schemas ──────────────────────────────────────────────────────────────────
const createItinerarySchema = z.object({
  title: z.string().min(1).max(150),
  destination: z.string().min(1).max(200),
  emotion: z.string().max(60).default('map-outline'),
  coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  isPublic: z.boolean().default(false),
});

const createActivitySchema = z.object({
  title: z.string().min(1).max(200),
  locationName: z.string().max(300).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

// ─── Helper: verifica acesso ao roteiro ───────────────────────────────────────
async function getItineraryAccess(itineraryId: string, userId: string) {
  const [itinerary] = await db.select().from(itineraries).where(eq(itineraries.id, itineraryId)).limit(1);
  if (!itinerary) return { itinerary: null, permission: null };
  if (itinerary.ownerId === userId) return { itinerary, permission: 'owner' as const };

  const [share] = await db
    .select()
    .from(itineraryShares)
    .where(and(eq(itineraryShares.itineraryId, itineraryId), eq(itineraryShares.sharedWithId, userId)))
    .limit(1);

  if (share) return { itinerary, permission: share.permission };
  return { itinerary, permission: null };
}

// ─── Helper: retorna todos os userIds com acesso ao roteiro (dono + compartilhados)
async function getItineraryMemberIds(itineraryId: string, ownerId: string): Promise<string[]> {
  const shares = await db
    .select({ userId: itineraryShares.sharedWithId })
    .from(itineraryShares)
    .where(eq(itineraryShares.itineraryId, itineraryId));
  return [ownerId, ...shares.map(s => s.userId)];
}
export async function listMyItineraries(req: AuthRequest, res: Response): Promise<void> {
  const data = await db.select().from(itineraries).where(eq(itineraries.ownerId, req.userId!)).orderBy(desc(itineraries.updatedAt));
  res.json({ itineraries: data });
}

export async function listSharedItineraries(req: AuthRequest, res: Response): Promise<void> {
  const shared = await db
    .select({ itinerary: itineraries, permission: itineraryShares.permission, ownerName: users.name })
    .from(itineraryShares)
    .innerJoin(itineraries, eq(itineraryShares.itineraryId, itineraries.id))
    .innerJoin(users, eq(itineraries.ownerId, users.id))
    .where(eq(itineraryShares.sharedWithId, req.userId!))
    .orderBy(desc(itineraryShares.createdAt));

  res.json({
    itineraries: shared.map(({ itinerary, permission, ownerName }) => ({
      ...itinerary, permission, ownerName, isShared: true,
    })),
  });
}

export async function getItinerary(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { itinerary, permission } = await getItineraryAccess(id, req.userId!);

  if (!itinerary) { res.status(404).json({ error: 'Roteiro não encontrado' }); return; }
  if (!permission) { res.status(403).json({ error: 'Sem permissão' }); return; }

  const days = await db.select().from(itineraryDays).where(eq(itineraryDays.itineraryId, id)).orderBy(itineraryDays.dayNumber);
  const dayIds = days.map(d => d.id);

  const allActivities = dayIds.length > 0
    ? await db.select().from(activities)
      .where(dayIds.length === 1 ? eq(activities.dayId, dayIds[0]) : or(...dayIds.map(dId => eq(activities.dayId, dId))))
      .orderBy(activities.orderIndex)
    : [];

  const daysWithActivities = days.map(day => ({
    ...day,
    activities: allActivities.filter(a => a.dayId === day.id),
  }));

  // Busca membros com acesso — só retorna para o dono
  let members: { userId: string; name: string; username: string; email: string; permission: string }[] = [];
  if (permission === 'owner') {
    const shares = await db
      .select({
        userId: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        permission: itineraryShares.permission,
      })
      .from(itineraryShares)
      .innerJoin(users, eq(itineraryShares.sharedWithId, users.id))
      .where(eq(itineraryShares.itineraryId, id));
    members = shares;
  }

  res.json({ itinerary: { ...itinerary, days: daysWithActivities, permission, members } });
}

export async function createItinerary(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createItinerarySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const data = parsed.data;
  const today = new Date().toISOString().split('T')[0];
  let status: 'upcoming' | 'traveling' | 'completed' = 'upcoming';
  if (data.endDate < today) status = 'completed';
  else if (data.startDate <= today && data.endDate >= today) status = 'traveling';

  const [itinerary] = await db.insert(itineraries).values({ ...data, ownerId: req.userId!, status }).returning();

  // Gera os dias automaticamente
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const daysToInsert = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { itineraryId: itinerary.id, dayNumber: i + 1, date: d.toISOString().split('T')[0] };
  });

  const createdDays = await db.insert(itineraryDays).values(daysToInsert).returning();
  res.status(201).json({ itinerary: { ...itinerary, days: createdDays.map(d => ({ ...d, activities: [] })) } });
}

export async function updateItinerary(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { itinerary, permission } = await getItineraryAccess(id, req.userId!);
  if (!itinerary) { res.status(404).json({ error: 'Roteiro não encontrado' }); return; }
  if (permission !== 'owner' && permission !== 'edit') { res.status(403).json({ error: 'Sem permissão' }); return; }

  const parsed = createItinerarySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const data = parsed.data;

  // Recalcula status se as datas mudaram
  const newStart = data.startDate ?? itinerary.startDate;
  const newEnd = data.endDate ?? itinerary.endDate;
  const today = new Date().toISOString().split('T')[0];
  let status: 'upcoming' | 'traveling' | 'completed' = 'upcoming';
  if (newEnd < today) status = 'completed';
  else if (newStart <= today && newEnd >= today) status = 'traveling';

  const [updated] = await db
    .update(itineraries)
    .set({ ...data, status, updatedAt: new Date() })
    .where(eq(itineraries.id, id))
    .returning();

  // Se as datas mudaram, recria os dias preservando atividades que ainda cabem no intervalo
  const datesChanged = (data.startDate && data.startDate !== itinerary.startDate)
    || (data.endDate && data.endDate !== itinerary.endDate);

  if (datesChanged) {
    // Busca os dias existentes e suas atividades
    const existingDays = await db.select().from(itineraryDays).where(eq(itineraryDays.itineraryId, id));
    const existingActs = existingDays.length > 0
      ? await db.select().from(activities).where(
        existingDays.length === 1
          ? eq(activities.dayId, existingDays[0].id)
          : or(...existingDays.map(d => eq(activities.dayId, d.id)))
      )
      : [];

    // Monta mapa date → activities para reaproveitamento
    const actsByDate = new Map<string, typeof existingActs>();
    for (const day of existingDays) {
      actsByDate.set(day.date, existingActs.filter(a => a.dayId === day.id));
    }

    // Remove todos os dias antigos (cascade apaga as atividades via FK)
    await db.delete(itineraryDays).where(eq(itineraryDays.itineraryId, id));

    // Gera novos dias
    const start = new Date(newStart);
    const end = new Date(newEnd);
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const daysToInsert = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { itineraryId: id, dayNumber: i + 1, date: d.toISOString().split('T')[0] };
    });
    const newDays = await db.insert(itineraryDays).values(daysToInsert).returning();

    // Reinsere atividades nos dias que continuam existindo
    for (const newDay of newDays) {
      const actsForDay = actsByDate.get(newDay.date) ?? [];
      if (actsForDay.length > 0) {
        await db.insert(activities).values(
          actsForDay.map(({ id: _id, dayId: _dayId, createdAt: _c, updatedAt: _u, ...rest }) => ({
            ...rest,
            dayId: newDay.id,
          }))
        );
      }
    }
  }

  // Notifica todos os outros membros sobre a edição — mas não quando a única
  // mudança enviada foi o campo `status` (isso é apenas a correção automática
  // de status feita pelo app com base na data, não uma edição manual do usuário)
  const isAutoStatusOnlyChange = Object.keys(req.body ?? {}).length === 1 && 'status' in (req.body ?? {});

  const [editor] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const memberIds = await getItineraryMemberIds(id, itinerary.ownerId);
  if (!isAutoStatusOnlyChange) notifyUsers(
    memberIds,
    req.userId!,
    'Roteiro atualizado',
    `${editor?.name ?? 'Alguém'} editou o roteiro "${updated.title}".`,
    { itineraryId: id },
  ).catch(() => {});

  res.json({ itinerary: updated });
}

export async function deleteItinerary(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { itinerary, permission } = await getItineraryAccess(id, req.userId!);
  if (!itinerary) { res.status(404).json({ error: 'Roteiro não encontrado' }); return; }
  if (permission !== 'owner') { res.status(403).json({ error: 'Só o dono pode excluir' }); return; }

  await db.delete(itineraries).where(eq(itineraries.id, id));
  res.status(204).send();
}

// ─── Activities ───────────────────────────────────────────────────────────────
// Helper para atualizar o updatedAt do roteiro quando atividades mudam
async function touchItinerary(itineraryId: string) {
  await db.update(itineraries).set({ updatedAt: new Date() }).where(eq(itineraries.id, itineraryId));
}

export async function createActivity(req: AuthRequest, res: Response): Promise<void> {
  const { dayId } = req.params;
  const [day] = await db.select().from(itineraryDays).where(eq(itineraryDays.id, dayId)).limit(1);
  if (!day) { res.status(404).json({ error: 'Dia não encontrado' }); return; }

  const { permission } = await getItineraryAccess(day.itineraryId, req.userId!);
  if (permission !== 'owner' && permission !== 'edit') { res.status(403).json({ error: 'Sem permissão' }); return; }

  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const [activity] = await db.insert(activities).values({ ...parsed.data, dayId }).returning();
  await touchItinerary(day.itineraryId);

  // Notifica os outros membros
  const [editor] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const [itin]   = await db.select({ ownerId: itineraries.ownerId, title: itineraries.title }).from(itineraries).where(eq(itineraries.id, day.itineraryId)).limit(1);
  const memberIds = await getItineraryMemberIds(day.itineraryId, itin.ownerId);
  notifyUsers(
    memberIds,
    req.userId!,
    'Nova atividade adicionada',
    `${editor?.name ?? 'Alguém'} adicionou "${activity.title}" ao roteiro "${itin.title}".`,
    { itineraryId: day.itineraryId },
  ).catch(() => {});

  res.status(201).json({ activity });
}

export async function updateActivity(req: AuthRequest, res: Response): Promise<void> {
  const { activityId } = req.params;
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!activity) { res.status(404).json({ error: 'Atividade não encontrada' }); return; }

  const [day] = await db.select().from(itineraryDays).where(eq(itineraryDays.id, activity.dayId)).limit(1);
  const { permission } = await getItineraryAccess(day!.itineraryId, req.userId!);
  if (permission !== 'owner' && permission !== 'edit') { res.status(403).json({ error: 'Sem permissão' }); return; }

  const parsed = createActivitySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const [updated] = await db.update(activities).set({ ...parsed.data, updatedAt: new Date() }).where(eq(activities.id, activityId)).returning();
  await touchItinerary(day!.itineraryId);

  // Notifica os outros membros
  const [editor]  = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const [itin]    = await db.select({ ownerId: itineraries.ownerId, title: itineraries.title }).from(itineraries).where(eq(itineraries.id, day!.itineraryId)).limit(1);
  const memberIds = await getItineraryMemberIds(day!.itineraryId, itin.ownerId);
  notifyUsers(
    memberIds,
    req.userId!,
    'Atividade editada',
    `${editor?.name ?? 'Alguém'} editou "${updated.title}" no roteiro "${itin.title}".`,
    { itineraryId: day!.itineraryId },
  ).catch(() => {});

  res.json({ activity: updated });
}

export async function deleteActivity(req: AuthRequest, res: Response): Promise<void> {
  const { activityId } = req.params;
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!activity) { res.status(404).json({ error: 'Atividade não encontrada' }); return; }

  const [day] = await db.select().from(itineraryDays).where(eq(itineraryDays.id, activity.dayId)).limit(1);
  const { permission } = await getItineraryAccess(day!.itineraryId, req.userId!);
  if (permission !== 'owner' && permission !== 'edit') { res.status(403).json({ error: 'Sem permissão' }); return; }

  const actTitle = activity.title;
  await db.delete(activities).where(eq(activities.id, activityId));
  await touchItinerary(day!.itineraryId);

  // Notifica os outros membros
  const [editor]  = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
  const [itin]    = await db.select({ ownerId: itineraries.ownerId, title: itineraries.title }).from(itineraries).where(eq(itineraries.id, day!.itineraryId)).limit(1);
  const memberIds = await getItineraryMemberIds(day!.itineraryId, itin.ownerId);
  notifyUsers(
    memberIds,
    req.userId!,
    'Atividade removida',
    `${editor?.name ?? 'Alguém'} removeu "${actTitle}" do roteiro "${itin.title}".`,
    { itineraryId: day!.itineraryId },
  ).catch(() => {});

  res.status(204).send();
}

// ─── Sharing ──────────────────────────────────────────────────────────────────
export async function shareItinerary(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { itinerary, permission } = await getItineraryAccess(id, req.userId!);
  if (!itinerary) { res.status(404).json({ error: 'Roteiro não encontrado' }); return; }
  if (permission !== 'owner') { res.status(403).json({ error: 'Só o dono pode compartilhar' }); return; }

  const schema = z.object({ targetUserId: z.string().uuid(), permission: z.enum(['view', 'edit']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const { targetUserId, permission: perm } = parsed.data;
  if (targetUserId === req.userId) { res.status(400).json({ error: 'Você não pode compartilhar com você mesmo' }); return; }

  const existing = await db.select().from(itineraryShares)
    .where(and(eq(itineraryShares.itineraryId, id), eq(itineraryShares.sharedWithId, targetUserId))).limit(1);

  if (existing.length > 0) {
    await db.update(itineraryShares).set({ permission: perm }).where(eq(itineraryShares.id, existing[0].id));
  } else {
    await db.insert(itineraryShares).values({ itineraryId: id, ownerId: req.userId!, sharedWithId: targetUserId, permission: perm });
  }

  // Notifica o usuário que recebeu o compartilhamento
  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.userId!)).limit(1);
  notifyUsers(
    [targetUserId],
    req.userId!,
    'Roteiro compartilhado com você',
    `${owner?.name ?? 'Alguém'} compartilhou o roteiro "${itinerary.title}" com você.`,
    { itineraryId: id },
  ).catch(() => {});

  res.json({ message: 'Roteiro compartilhado com sucesso' });
}

export async function removeShare(req: AuthRequest, res: Response): Promise<void> {
  const { id, targetUserId } = req.params;
  const { permission } = await getItineraryAccess(id, req.userId!);
  if (permission !== 'owner') { res.status(403).json({ error: 'Sem permissão' }); return; }

  await db.delete(itineraryShares).where(and(eq(itineraryShares.itineraryId, id), eq(itineraryShares.sharedWithId, targetUserId)));
  res.status(204).send();
}