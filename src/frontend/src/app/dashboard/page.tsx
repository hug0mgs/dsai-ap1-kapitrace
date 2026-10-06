'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, SESSION_KEY, type WatchlistItem } from '../../lib/api';
export default function DashboardPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api<WatchlistItem[]>('/api/watchlist', {}, true).then(data => { if (active) setItems(data); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function remove(id: string) {
    setRemoving(id); setError('');
    try { await api(`/api/watchlist/${encodeURIComponent(id)}`, { method: 'DELETE' }, true); setItems(current => current.filter(item => item.id !== id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao remover'); }
    finally { setRemoving(null); }
  }
  return <div className="page-content"><h1>Watchlist</h1><p>Indicadores monitorados na sua conta.</p><Link className="btn btn-primary" href="/lookup">Consultar indicador</Link><Link className="btn btn-ghost" href="/login">Entrar</Link><button className="btn btn-ghost" onClick={() => { sessionStorage.removeItem(SESSION_KEY); setItems([]); setError('Sessão encerrada.'); }}>Sair</button>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Carregando…</p>}
    {!loading && !error && !items.length && <p>Nenhum indicador monitorado.</p>}
    <ul className="source-list" data-testid="watchlist">{items.map(item => <li className="card" key={item.id} data-testid="watchlist-item"><strong>{item.itemType.toUpperCase()}</strong> <code>{item.itemValue}</code> <button className="btn btn-ghost" disabled={removing !== null} onClick={() => remove(item.id)} aria-label={`Remover ${item.itemValue}`}>{removing === item.id ? 'Removendo…' : 'Remover'}</button></li>)}</ul>
  </div>;
}
