'use client';
import Link from 'next/link';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';

type LookupType = 'ip' | 'domain' | 'hash';
interface Source { name: string; status: string; details?: Record<string, unknown>; retryAfter?: number }
interface LookupResult {
  indicator: string; type: LookupType; threatScore: number | null; riskLevel: string | null;
  source: string; stale: boolean; partial: boolean; assessmentStatus: string;
  cachedAt: string; expiresAt: string; sources: Source[];
  analysis: { confidencePercentage: number; riskDescription: string } | null;
}
const labels: Record<string, string> = { ok: 'Consultada', not_found: 'Sem registro', not_configured: 'Não configurada', not_applicable: 'Não aplicável', rate_limited: 'Limite de consultas', timeout: 'Tempo esgotado', unavailable: 'Indisponível', invalid_response: 'Resposta inválida' };
function LookupContent() {
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get('type');
  const type: LookupType = selected === 'domain' || selected === 'hash' ? selected : 'ip';
  const [query, setQuery] = useState(params.get('q') || '');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const generation = useRef(0);
  async function search(event: FormEvent) {
    event.preventDefault();
    const current = ++generation.current;
    setError(''); setNotice(''); setResult(null); setLoading(true);
    try {
      const data = await api<LookupResult>(`/api/lookup/${type}/${encodeURIComponent(query.trim())}`);
      if (current === generation.current) setResult(data);
    } catch (failure) { if (current === generation.current) setError(failure instanceof Error ? failure.message : 'Falha na busca'); }
    finally { if (current === generation.current) setLoading(false); }
  }
  async function addToWatchlist() {
    if (!result) return;
    setAdding(true); setError(''); setNotice('');
    try {
      await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ itemValue: result.indicator, itemType: result.type }) }, true);
      setNotice('Indicador adicionado à watchlist.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao adicionar'); }
    finally { setAdding(false); }
  }
  return <div className="page-content">
    <div className="lookup-hero"><h1>Threat Intelligence Lookup</h1><p>Consulte relatórios existentes de IPs, domínios e hashes.</p>
      <div className="lookup-type-tabs">{(['ip', 'domain', 'hash'] as const).map(value => <button key={value} className={`lookup-type-tab ${type === value ? 'active' : ''}`} disabled={loading} onClick={() => { generation.current++; router.push(`/lookup?type=${value}`); setResult(null); setError(''); setNotice(''); }}>{value.toUpperCase()}</button>)}<span className="text-dim">Email: integração ainda indisponível</span></div>
      <form className="search-hero" onSubmit={search}><input aria-label="Indicador" required maxLength={512} value={query} onChange={event => setQuery(event.target.value)} placeholder={type === 'ip' ? '8.8.8.8' : type === 'domain' ? 'example.com' : 'MD5, SHA-1 ou SHA-256'} /><button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Consultando…' : 'Analisar'}</button></form>
    </div>
    {error && <p className="card" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {result && result.type === type && <div className="result-grid" data-testid="lookup-result"><div className="result-sidebar">
      <div className="card result-score-card"><h2>ThreatScore</h2><div className="threat-score" data-testid="threat-score">{result.threatScore ?? 'Sem pontuação'}</div><p>{result.riskLevel ?? 'Dados insuficientes'}</p><p>Cobertura de evidências: {result.analysis?.confidencePercentage ?? 0}%</p></div>
      <div className="card"><h2>Fontes consultadas</h2><ul className="source-list">{result.sources.map(source => <li className="source-item" key={source.name}><div><strong>{source.name}</strong><p>{labels[source.status] || source.status}{source.retryAfter ? ` — tente em ${source.retryAfter}s` : ''}</p>{source.details && Object.entries(source.details).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => <p className="text-dim" key={key}>{key}: {Array.isArray(value) ? value.join(', ') : String(value)}</p>)}</div></li>)}</ul></div>
    </div><div className="result-main"><div className="card"><h2>Indicador analisado</h2><code>{result.indicator}</code><p>Origem: <span data-testid="lookup-source">{result.source}</span></p><p>Coletado: {new Date(result.cachedAt).toLocaleString()}</p>
      {result.stale && <p role="status">Dados antigos: as fontes não forneceram uma nova avaliação. A pontuação usa a coleta anterior.</p>}
      {result.partial && <p role="status">Resultado parcial: algumas fontes não estão disponíveis.</p>}
      {result.assessmentStatus === 'insufficient_data' && <p>Não há evidência suficiente para calcular reputação.</p>}
      <p>{result.analysis?.riskDescription}</p>
    </div><div className="card"><button className="btn btn-primary" onClick={addToWatchlist} disabled={adding}>{adding ? 'Adicionando…' : 'Adicionar à Watchlist'}</button><Link className="btn btn-ghost" href="/dashboard">Gerenciar watchlist</Link><Link className="btn btn-ghost" href="/login">Entrar</Link></div></div></div>}
  </div>;
}

export default function LookupPage() {
  return <Suspense fallback={<p role="status">Carregando busca…</p>}><LookupContent /></Suspense>;
}
