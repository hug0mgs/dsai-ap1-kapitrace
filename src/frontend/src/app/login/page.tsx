'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <h2>KapiTrace</h2>
          <p>Threat Intelligence Platform</p>
        </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="analyst@KapiTrace.io"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••••"
            />
          </div>

          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
            <label className="flex items-center gap-1" style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
              <input type="checkbox" style={{ accentColor: 'var(--cyan-500)' }} />
              Lembrar sessão
            </label>
            <a href="#" style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>Esqueci a senha</a>
          </div>

          <button type="submit" className="btn btn-primary btn-lg">
            Acessar Painel
          </button>
        </form>

        <div className="auth-footer">
          Não tem uma conta?{' '}
          <Link href="/login">Solicite acesso</Link>
        </div>

        <div className="glow-line" style={{ margin: '1.5rem 0 1rem' }}></div>

        <div className="text-center" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <p>🔒 Conexão criptografada TLS 1.3</p>
          <p style={{ marginTop: '0.25rem' }}>Autenticação JWT com RBAC</p>
        </div>
      </div>
    </div>
  );
}
