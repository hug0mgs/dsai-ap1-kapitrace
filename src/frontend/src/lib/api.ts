export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
export const SESSION_KEY = 'kapitrace.session';
export async function api<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) throw new Error('Entre na sua conta para gerenciar a watchlist.');
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    if (authenticated && response.status === 401) sessionStorage.removeItem(SESSION_KEY);
    throw new Error(data.message || data.error || `Falha na consulta (${response.status})`);
  }
  return data as T;
}
export interface WatchlistItem { id: string; itemValue: string; itemType: string }
