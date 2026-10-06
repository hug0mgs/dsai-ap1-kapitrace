'use client';
import { getSessionToken, setSessionToken } from './session';
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
export class AuthenticationError extends Error {
  constructor() { super('Sessão ausente ou expirada. Entre novamente.'); this.name = 'AuthenticationError'; }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const pathname = new URL(path, API_BASE).pathname;
  const authenticated = /^\/api\/(?:lookup|watchlist)(?:\/|$)/.test(pathname) || pathname === '/api/auth/refresh';
  const requestToken = authenticated ? getSessionToken() : null;
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    if (!requestToken) throw new AuthenticationError();
    headers.set('Authorization', `Bearer ${requestToken}`);
  }
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: 'no-store' }); }
  catch { throw new Error('Não foi possível conectar ao servidor. Tente novamente.'); }
  if (authenticated && response.status === 401) {
    if (getSessionToken() === requestToken) setSessionToken(null);
    throw new AuthenticationError();
  }
  let data: Record<string, unknown>;
  try { data = await response.json(); }
  catch { throw new Error('Resposta inválida do servidor. Tente novamente.'); }
  if (data === null || typeof data !== 'object') throw new Error('Resposta inválida do servidor. Tente novamente.');
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : typeof data?.error === 'string' ? data.error : `Falha na consulta (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}
export interface WatchlistItem { id: string; itemValue: string; itemType: string }
