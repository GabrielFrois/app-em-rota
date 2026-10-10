import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 1, resetAt: now + options.windowMs };
      next();
      return;
    }

    store[key].count++;
    if (store[key].count > options.max) {
      const retryAfter = Math.ceil((store[key].resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({ error: options.message });
      return;
    }

    next();
  };
}

// 10 tentativas por IP a cada 15 min
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
});

// 30 buscas por minuto
export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas buscas. Aguarde um momento.',
});