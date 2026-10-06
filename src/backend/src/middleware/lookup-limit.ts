import { Request, Response, NextFunction } from 'express';
import { setting } from '../shared/config';
const clients = new Map<string, { starts: number; count: number }>();
// Per-process fixed window. Does not trust unconfigured proxy headers.
export function limitLookup(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  for (const [ip, value] of clients) if (now - value.starts >= 60000) clients.delete(ip);
  let client = clients.get(key);
  if (!client) {
    if (clients.size >= 10000) { res.status(503).json({ error: 'Lookup capacity exceeded' }); return; }
    client = { starts: now, count: 0 };
    clients.set(key, client);
  }
  if (++client.count > setting('LOOKUP_REQUESTS_PER_MINUTE', 30, 1, 10000)) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((60000 - now + client.starts) / 1000)));
    res.status(429).json({ error: 'Lookup request limit reached' });
    return;
  }
  next();
}
