import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, or, ilike, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { users, pushTokens } from '../db/schema';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username: apenas letras minúsculas, números e _'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function generateTokenPair(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } as jwt.SignOptions,
  );
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET! + '_refresh',
    { expiresIn: '30d' } as jwt.SignOptions,
  );
  return { accessToken, refreshToken };
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '15m' } as jwt.SignOptions);
}

function sanitizeUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// sanitiza caracteres especiais do LIKE para evitar SQL injection
function escapeLike(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&');
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { name, username, email, password } = parsed.data;
    const existing = await db.select({ id: users.id }).from(users)
      .where(or(eq(users.email, email), eq(users.username, username))).limit(1);

    if (existing.length > 0) { res.status(409).json({ error: 'E-mail ou username já cadastrado' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({ name, username, email, passwordHash }).returning();

    const { accessToken, refreshToken } = generateTokenPair(newUser.id);
    res.status(201).json({ token: accessToken, refreshToken, user: sanitizeUser(newUser) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { email, password } = parsed.data;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) { res.status(401).json({ error: 'E-mail ou senha incorretos' }); return; }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) { res.status(401).json({ error: 'E-mail ou senha incorretos' }); return; }

    const { accessToken, refreshToken } = generateTokenPair(user.id);
    res.json({ token: accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'Refresh token não fornecido' }); return; }

    const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET! + '_refresh';
    const payload = jwt.verify(refreshToken, secret) as { sub: string; type?: string };

    if (payload.type !== 'refresh') { res.status(401).json({ error: 'Token inválido' }); return; }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) { res.status(401).json({ error: 'Usuário não encontrado' }); return; }

    res.json({ token: generateAccessToken(user.id) });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido ou expirado' });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const query = (req.query.q as string) ?? '';
    if (query.length < 2) { res.status(400).json({ error: 'Query muito curta (mínimo 2 caracteres)' }); return; }

    const safeQuery = escapeLike(query.trim());
    const results = await db
      .select({ id: users.id, name: users.name, username: users.username })
      .from(users)
      .where(or(ilike(users.username, `%${safeQuery}%`), ilike(users.name, `%${safeQuery}%`)))
      .limit(10);

    res.json({ users: results });
  } catch (err) {
    console.error('[searchUsers]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

export async function savePushToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const schema = z.object({ token: z.string().min(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Token inválido' }); return; }

    const { token } = parsed.data;
    const existing = await db.select({ id: pushTokens.id, userId: pushTokens.userId })
      .from(pushTokens).where(eq(pushTokens.token, token)).limit(1);

    if (existing.length > 0) {
      if (existing[0].userId !== req.userId)
        await db.update(pushTokens).set({ userId: req.userId! }).where(eq(pushTokens.id, existing[0].id));
    } else {
      await db.insert(pushTokens).values({ userId: req.userId!, token });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[savePushToken]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

export async function removePushToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const schema = z.object({ token: z.string().min(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Token inválido' }); return; }

    await db.delete(pushTokens)
      .where(and(eq(pushTokens.token, parsed.data.token), eq(pushTokens.userId, req.userId!)));
    res.json({ ok: true });
  } catch (err) {
    console.error('[removePushToken]', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}