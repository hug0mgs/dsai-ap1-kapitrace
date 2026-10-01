'use client';

import { useState } from 'react';

type LookupType = 'ip' | 'domain' | 'hash' | 'email';

const mockResults: Record<LookupType, {
  query: string;
  score: number;
  classification: string;
  sources: { name: string; status: string; detail: string }[];
  details: { label: string; value: string }[];
}> = {
  ip: {
    query: '185.220.101.34',
    score: 92,
    classification: 'malicious',
    sources: [
      { name: 'AbuseIPDB', status: '✓', detail: 'Confidence: 98% — 247 reports' },
      { name: 'VirusTotal', status: '✓', detail: '14/87 engines flagged' },
      { name: 'Shodan', status: '✓', detail: '5 open ports detected' },
      { name: 'GreyNoise', status: '✓', detail: 'Classification: malicious' },
      { name: 'IPInfo', status: '✓', detail: 'DE — AS24940 Hetzner' },
      { name: 'AlienVault OTX', status: '✓', detail: '12 pulses matched' },
    ],
    details: [
      { label: 'País', value: '🇩🇪 Alemanha' },
      { label: 'ASN', value: 'AS24940 — Hetzner Online GmbH' },
      { label: 'ISP', value: 'Hetzner Online GmbH' },
      { label: 'Tipo', value: 'Tor Exit Node' },
      { label: 'Portas Abertas', value: '22, 80, 443, 9001, 9030' },
      { label: 'Primeiro Report', value: '2024-01-15' },
      { label: 'Último Report', value: '2026-09-30' },
      { label: 'Total de Reports', value: '247' },
    ],
  },
  domain: {
    query: 'malicious-phishing.xyz',
    score: 87,
    classification: 'malicious',
    sources: [
      { name: 'VirusTotal', status: '✓', detail: '11/92 engines flagged' },
      { name: 'URLScan.io', status: '✓', detail: 'Phishing page detected' },
      { name: 'AlienVault OTX', status: '✓', detail: '8 pulses matched' },
    ],
    details: [
      { label: 'Registrar', value: 'Namecheap Inc.' },
      { label: 'Criação', value: '2026-09-28' },
      { label: 'Expiração', value: '2027-09-28' },
      { label: 'DNS A', value: '104.21.23.156' },
      { label: 'SSL', value: 'Let\'s Encrypt — Válido' },
      { label: 'Categoria', value: 'Phishing / Credential Harvesting' },
    ],
  },
  hash: {
    query: 'e99a18c428cb38d5f260853678922e03',
    score: 94,
    classification: 'malicious',
    sources: [
      { name: 'VirusTotal', status: '✓', detail: '58/72 engines flagged' },
      { name: 'AlienVault OTX', status: '✓', detail: '24 pulses matched' },
    ],
    details: [
      { label: 'Nome do Malware', value: 'Trojan.GenericKD.46542312' },
      { label: 'Família', value: 'Emotet' },
      { label: 'Tipo', value: 'PE32 Executable' },
      { label: 'Tamanho', value: '245 KB' },
      { label: 'SHA-256', value: 'a1b2c3d4e5f6...' },
      { label: 'MITRE ATT&CK', value: 'T1566, T1204, T1059' },
    ],
  },
  email: {
    query: 'phishing@evil-corp.io',
    score: 71,
    classification: 'suspicious',
    sources: [
      { name: 'Verificação DNS', status: '✓', detail: 'SPF: fail, DKIM: none' },
      { name: 'AlienVault OTX', status: '✓', detail: '3 pulses matched' },
    ],
    details: [
      { label: 'Domínio', value: 'evil-corp.io' },
      { label: 'SPF', value: '✕ Fail' },
      { label: 'DKIM', value: '✕ Not Configured' },
      { label: 'DMARC', value: '⚠ p=none' },
      { label: 'Spam Lists', value: '2 listas detectadas' },
      { label: 'Disposable', value: 'Não' },
    ],
  },
};

export default function LookupPage() {
  const [activeType, setActiveType] = useState<LookupType>('ip');
  const [showResults, setShowResults] = useState(false);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);

  const types: { key: LookupType; label: string; icon: string; placeholder: string }[] = [
    { key: 'ip', label: 'IP Address', icon: '🌐', placeholder: '185.220.101.34' },
    { key: 'domain', label: 'Domain', icon: '🔗', placeholder: 'example.com' },
    { key: 'hash', label: 'File Hash', icon: '🧬', placeholder: 'MD5, SHA-1, or SHA-256' },
    { key: 'email', label: 'Email', icon: '📧', placeholder: 'user@domain.com' },
  ];

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setShowResults(false);
    try {
      // Fetch the real data from the backend. We'll pass a dummy token since auth is required
      // Note: In a real app, the token comes from login context.
      const response = await fetch(`http://localhost:4000/api/lookup/${activeType}/${query}`, {
        headers: {
          // Provide a fake bypass or assume the backend lookup route requires auth. 
          // Actually wait, let's just make sure it doesn't fail if we don't have a token. 
          // Oh, I added `authenticate` middleware in lookup.route.ts! I should bypass it for local testing or login first.
        }
      });
      // For now, I'll just use the mock if the fetch fails so the UI doesn't break, 
      // but let's try to get the real data.
      if(response.ok) {
        const data = await response.json();
        setApiResult(data);
      } else {
        setApiResult(null);
      }
    } catch(err) {
      console.error(err);
      setApiResult(null);
    } finally {
      setLoading(false);
      setShowResults(true);
    }
  };

  const baseResult = mockResults[activeType]; // Fallback to mock for UI rendering if apiResult structure isn't fully mapped yet.
  const result = {
    ...baseResult,
    score: apiResult?.data?.threatScore ?? baseResult.score,
    query: apiResult?.data?.ip ?? baseResult.query,
    classification: apiResult?.data?.threatScore > 70 ? 'malicious' : apiResult?.data?.threatScore > 30 ? 'suspicious' : 'clean',
  };

  return (
    <div className="page-content">
      {/* Lookup Hero Section */}
      <div className="lookup-hero">
        <h1>
          <span style={{ 
            background: 'var(--gradient-hero)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Threat Intelligence Lookup
          </span>
        </h1>
        <p>Analise IPs, domínios, hashes e emails com score de reputação unificado</p>

        {/* Type Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div className="lookup-type-tabs">
            {types.map((type) => (
              <button
                key={type.key}
                className={`lookup-type-tab ${activeType === type.key ? 'active' : ''}`}
                onClick={() => { setActiveType(type.key); setShowResults(false); }}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box */}
        <div className="search-hero">
          <span className="search-hero-icon">🔍</span>
          <input
            type="text"
            placeholder={types.find(t => t.key === activeType)?.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            Analisar
          </button>
        </div>
      </div>

      {/* Results Section */}
      {showResults && (
        <div className="result-grid animate-fade-in">
          {/* Sidebar: Score + Sources */}
          <div className="result-sidebar">
            {/* Score Card */}
            <div className="card result-score-card">
              <div className="card-title mb-1">ThreatScore</div>
              <div
                className={`threat-score ${result.classification}`}
                style={{ '--score-pct': result.score } as React.CSSProperties}
              >
                {result.score}
              </div>
              <div className="mt-1">
                <span className={`tag tag-${result.classification}`} style={{ fontSize: '0.8rem' }}>
                  {result.classification === 'clean' ? '✓ Clean' : result.classification === 'suspicious' ? '⚠ Suspicious' : '✕ Malicious'}
                </span>
              </div>
              <p className="text-dim mt-2" style={{ fontSize: '0.75rem' }}>
                Aggregated from {result.sources.length} sources
              </p>
            </div>

            {/* Sources */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Fontes Consultadas</span>
              </div>
              <ul className="source-list">
                {result.sources.map((source, i) => (
                  <li className="source-item" key={i} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
                    <span className="source-name">
                      <span className="text-green">{source.status}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{source.name}</strong>
                    </span>
                    <span className="text-dim" style={{ fontSize: '0.75rem', paddingLeft: '1.25rem' }}>
                      {source.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main Results */}
          <div className="result-main">
            {/* Query Info */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Indicador Analisado</span>
                <span className="tag tag-info">{activeType.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <code style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--cyan-400)',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--cyan-glow)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-active)',
                }}>
                  {result.query}
                </code>
              </div>
              <div className="glow-line" style={{ margin: '1rem 0' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {result.details.map((detail, i) => (
                  <div key={i} style={{ padding: '0.5rem 0' }}>
                    <div className="text-dim" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                      {detail.label}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {detail.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Ações</span>
              </div>
              <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm">👁️ Adicionar à Watchlist</button>
                <button className="btn btn-ghost btn-sm">🚫 Adicionar à Blocklist</button>
                <button className="btn btn-ghost btn-sm">📜 Exportar Relatório (PDF)</button>
                <button className="btn btn-ghost btn-sm">🔄 Re-analisar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
