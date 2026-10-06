'use client';
// Private module state: never persisted, serialized into HTML or logged.
let token: string | null = null;
const listeners = new Set<() => void>();
export const getSessionToken = (): string | null => token;
export const hasSession = (): boolean => token !== null;
export const serverSessionSnapshot = (): boolean => false;
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setSessionToken(value: string | null): void {
  if (value !== null && (typeof value !== 'string' || value.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value))) {
    throw new Error('Resposta de autenticação inválida.');
  }
  token = value;
  // Clear only the previous implementation's known key, without reading it.
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem('kapitrace.session'); window.localStorage.removeItem('kapitrace.session'); } catch { /* Storage can be disabled; memory session still works. */ }
  }
  for (const listener of listeners) listener();
}
