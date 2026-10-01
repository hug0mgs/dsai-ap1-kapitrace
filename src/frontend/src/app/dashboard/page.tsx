'use client';

import Link from 'next/link';

const stats = [
  { title: 'IPs Analisados', value: '12,847', trend: '+14%', trendDir: 'up' as const, icon: '🌐', iconColor: 'cyan' },
  { title: 'Ameaças Detectadas', value: '1,293', trend: '+8%', trendDir: 'up' as const, icon: '⚠️', iconColor: 'red' },
  { title: 'Domínios Monitorados', value: '3,482', trend: '-2%', trendDir: 'down' as const, icon: '🔗', iconColor: 'purple' },
  { title: 'Score Médio', value: '34.7', trend: '-5%', trendDir: 'down' as const, icon: '📈', iconColor: 'green' },
];

const threatFeed = [
  { type: 'red' as const, ip: '185.220.101.34', score: 98, category: 'Tor Exit Node', time: '2 min atrás' },
  { type: 'red' as const, ip: '45.155.205.233', score: 95, category: 'Botnet C2', time: '5 min atrás' },
  { type: 'amber' as const, ip: '91.121.87.10', score: 62, category: 'Scanner', time: '8 min atrás' },
  { type: 'green' as const, ip: '8.8.8.8', score: 0, category: 'DNS Resolver', time: '12 min atrás' },
  { type: 'red' as const, ip: '194.26.192.77', score: 91, category: 'Brute Force', time: '15 min atrás' },
  { type: 'amber' as const, ip: '103.75.201.4', score: 55, category: 'Proxy', time: '18 min atrás' },
];

const recentLookups = [
  { value: '192.168.1.100', type: 'IP', score: 12, status: 'clean' },
  { value: 'malicious-site.xyz', type: 'Domain', score: 94, status: 'malicious' },
  { value: 'e99a18c428...', type: 'Hash', score: 88, status: 'malicious' },
  { value: 'phish@evil.com', type: 'Email', score: 76, status: 'suspicious' },
  { value: '1.1.1.1', type: 'IP', score: 0, status: 'clean' },
];

const mapBlips = [
  { top: '25%', left: '48%', color: 'red', delay: '0s' },
  { top: '35%', left: '15%', color: 'red', delay: '0.5s' },
  { top: '55%', left: '72%', color: 'cyan', delay: '1s' },
  { top: '40%', left: '82%', color: 'amber', delay: '0.3s' },
  { top: '30%', left: '60%', color: 'red', delay: '1.5s' },
  { top: '60%', left: '30%', color: 'cyan', delay: '0.8s' },
  { top: '45%', left: '42%', color: 'red', delay: '1.2s' },
  { top: '20%', left: '70%', color: 'amber', delay: '0.7s' },
];

export default function DashboardPage() {
  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Threat Overview</h1>
        <p className="page-subtitle">Visão consolidada da inteligência de ameaças — últimas 24 horas</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        {stats.map((stat) => (
          <div className="card" key={stat.title}>
            <div className="card-header">
              <span className="card-title">{stat.title}</span>
              <div className={`card-icon ${stat.iconColor}`}>{stat.icon}</div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-trend ${stat.trendDir === 'up' ? 'up' : 'down'}`}>
              {stat.trendDir === 'up' ? '↑' : '↓'} {stat.trend} vs. semana anterior
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Threat Map */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Global Threat Map</span>
            <span className="tag tag-info">Live</span>
          </div>
          <div className="threat-map-placeholder">
            {mapBlips.map((blip, i) => (
              <div
                key={i}
                className={`map-blip ${blip.color}`}
                style={{ top: blip.top, left: blip.left, animationDelay: blip.delay }}
              />
            ))}
            <span className="text-dim" style={{ zIndex: 3, fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              D3.js Threat Visualization
            </span>
          </div>
        </div>

        {/* Live Threat Feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Live Threat Feed</span>
            <button className="btn btn-ghost btn-sm">Ver Todos</button>
          </div>
          <div>
            {threatFeed.map((item, i) => (
              <div className="feed-item" key={i}>
                <div className={`feed-dot ${item.type}`}></div>
                <div className="feed-content">
                  <div className="feed-title">
                    <span className="text-mono" style={{ color: 'var(--text-primary)' }}>{item.ip}</span>
                    {' '}
                    <span className={`tag tag-${item.type === 'red' ? 'malicious' : item.type === 'amber' ? 'suspicious' : 'clean'}`}>
                      Score {item.score}
                    </span>
                  </div>
                  <div className="feed-meta">{item.category} • {item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="dashboard-bottom-grid">
        {/* Recent Lookups Table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Consultas Recentes</span>
            <Link href="/lookup" className="btn btn-ghost btn-sm">Nova Consulta</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Tipo</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLookups.map((item, i) => (
                <tr key={i}>
                  <td className="mono-cell">{item.value}</td>
                  <td>
                    <span className="tag tag-info">{item.type}</span>
                  </td>
                  <td className="text-mono font-bold">
                    <span className={item.score > 70 ? 'text-red' : item.score > 30 ? 'text-amber' : 'text-green'}>
                      {item.score}
                    </span>
                  </td>
                  <td>
                    <span className={`tag tag-${item.status}`}>
                      {item.status === 'clean' ? '✓ Clean' : item.status === 'suspicious' ? '⚠ Suspicious' : '✕ Malicious'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Source Status */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">API Sources Status</span>
            <span className="tag tag-clean">All Healthy</span>
          </div>
          <ul className="source-list">
            {[
              { name: 'AbuseIPDB', quota: '847 / 1000', pct: 84.7, status: 'ok' },
              { name: 'VirusTotal', quota: '3 / 4 per min', pct: 75, status: 'ok' },
              { name: 'IPInfo', quota: '12k / 50k', pct: 24, status: 'ok' },
              { name: 'Shodan', quota: 'Active', pct: 10, status: 'ok' },
              { name: 'GreyNoise', quota: '38 / 50', pct: 76, status: 'warn' },
              { name: 'URLScan.io', quota: '67 / 100', pct: 67, status: 'ok' },
              { name: 'AlienVault OTX', quota: 'Unlimited', pct: 5, status: 'ok' },
            ].map((api) => (
              <li className="source-item" key={api.name}>
                <span className="source-name">
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: api.status === 'ok' ? 'var(--green-500)' : 'var(--amber-500)',
                    display: 'inline-block',
                    boxShadow: api.status === 'ok'
                      ? '0 0 6px rgba(16,185,129,0.5)'
                      : '0 0 6px rgba(245,158,11,0.5)',
                  }}></span>
                  {api.name}
                </span>
                <span className="source-status text-muted">{api.quota}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
