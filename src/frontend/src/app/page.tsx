'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: '🌐',
    title: 'IP Reputation',
    description: 'Análise completa com AbuseIPDB, VirusTotal, Shodan e GreyNoise combinados em um score unificado.',
    color: 'cyan',
  },
  {
    icon: '🔗',
    title: 'Domain Intelligence',
    description: 'Reputação VirusTotal e contexto de relatórios existentes no URLScan.io e OTX.',
    color: 'purple',
  },
  {
    icon: '🧬',
    title: 'Malware Hash Lookup',
    description: 'Consulte detecções de arquivos existentes por MD5, SHA-1 ou SHA-256.',
    color: 'red',
  },
  {
    icon: '📧',
    title: 'Email Reputation',
    description: 'Integração de email ainda indisponível nesta versão.',
    color: 'amber',
  },
  {
    icon: '📊',
    title: 'Threat Dashboard',
    description: 'Gerencie os indicadores da sua watchlist com sua sessão autenticada.',
    color: 'green',
  },
  {
    icon: '👁️',
    title: 'Watchlist',
    description: 'Adicione, liste e remova indicadores. Alertas automáticos ainda indisponíveis.',
    color: 'cyan',
  },
];

const apiLogos = [
  { name: 'AbuseIPDB', quota: 'Cota conforme plano' },
  { name: 'VirusTotal', quota: 'Cota conforme plano' },
  { name: 'IPInfo', quota: 'Cota conforme plano' },
  { name: 'Shodan', quota: 'Cota conforme plano' },
  { name: 'GreyNoise', quota: 'Cota conforme plano' },
  { name: 'URLScan.io', quota: 'Cota conforme plano' },
  { name: 'AlienVault OTX', quota: 'Cota conforme plano' },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  function search(event: FormEvent) {
    event.preventDefault();
    const indicator = query.trim();
    if (!indicator) return;
    const type = indicator.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(indicator) ? 'ip' : /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(indicator) ? 'hash' : 'domain';
    router.push(`/lookup?type=${type}&q=${encodeURIComponent(indicator)}`);
  }
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ─── Navigation Bar ─── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 3rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(5, 8, 16, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            boxShadow: 'var(--shadow-cyan)',
          }}>🛡️</div>
          <span style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            background: 'var(--gradient-hero)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>KapiTrace</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/login" className="btn btn-ghost">Login</Link>
          <Link href="/dashboard" className="btn btn-primary">Dashboard →</Link>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section style={{
        textAlign: 'center',
        padding: '6rem 2rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow Effect */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 1rem',
            borderRadius: '100px',
            background: 'var(--cyan-glow)',
            border: '1px solid var(--border-active)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--cyan-400)',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--green-500)',
              boxShadow: '0 0 8px rgba(16,185,129,0.5)',
              display: 'inline-block',
            }}></span>
            v1.0 — 7 integrações disponíveis • Configure suas chaves
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '1.25rem',
            letterSpacing: '-0.04em',
          }}>
            Threat Intelligence
            <br />
            <span style={{
              background: 'var(--gradient-hero)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              & IP Reputation
            </span>
          </h1>

          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-muted)',
            maxWidth: '580px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.7,
          }}>
            Analise a reputação de IPs, domínios e hashes agregando dados
            de <strong style={{ color: 'var(--text-secondary)' }}>7 fontes de inteligência</strong> em
            um score unificado.
          </p>

          {/* Hero Search */}
          <form className="search-hero" style={{ maxWidth: '620px' }} onSubmit={search}>
            <span className="search-hero-icon">🔍</span>
            <input
              type="text"
              placeholder="IP, domínio ou hash"
              aria-label="Indicador inicial"
              required
              maxLength={512}
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-lg">Analisar</button>
          </form>

          {/* Quick examples */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Exemplos:</span>
            {['185.220.101.34', 'malware.xyz', 'd41d8cd98f00b204e9800998ecf8427e'].map((ex) => (
              <code key={ex} style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                background: 'var(--bg-panel)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                {ex}
              </code>
            ))}
          </div>
        </div>
      </section>

      {/* ─── API Sources Bar ─── */}
      <section style={{
        padding: '1.75rem 2rem',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Fontes de Inteligência
          </span>
          {apiLogos.map((api) => (
            <div key={api.name} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{api.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{api.quota}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Inteligência Completa em{' '}
            <span className="text-cyan">Uma Plataforma</span>
          </h2>
          <p className="text-muted" style={{ maxWidth: '480px', margin: '0 auto' }}>
            Consultas de inteligência e watchlist com dados de fontes externas configuradas.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.25rem',
        }} className="stagger-children">
          {features.map((feature) => (
            <div className="card" key={feature.title} style={{ padding: '1.75rem' }}>
              <div className={`card-icon ${feature.color}`} style={{ marginBottom: '1rem', width: 40, height: 40, fontSize: '1.25rem' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        borderTop: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Pronto para investigar?
          </h2>
          <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
            Acesse o painel e comece a analisar ameaças agora.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Acessar Dashboard
            </Link>
            <Link href="/lookup" className="btn btn-ghost btn-lg">
              Fazer um Lookup
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
      }}>
        <p>© 2026 KapiTrace Intelligence — UFPA DSAI AP1</p>
        <p style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
          Next.js 16 • Express.js • SQLite • Prisma • 7 integrações
        </p>
      </footer>
    </div>
  );
}
