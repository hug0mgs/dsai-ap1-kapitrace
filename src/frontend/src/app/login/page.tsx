'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, SESSION_KEY } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get('email')), password: String(form.get('password')) };
    setError(''); setLoading(true);
    try {
      if (register) await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ ...credentials, name: String(form.get('name') || '') }) });
      const result = await api<{ token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      sessionStorage.setItem(SESSION_KEY, result.token);
      router.push('/lookup');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha na autenticação'); }
    finally { setLoading(false); }
  }
  return <div className="auth-page"><div className="auth-card">
    <div className="auth-logo"><h2>KapiTrace</h2><p>{register ? 'Criar conta' : 'Entrar'}</p></div>
    <form className="auth-form" onSubmit={submit}>
      {register && <div className="input-group"><label htmlFor="name">Nome</label><input className="input" id="name" name="name" autoComplete="name" /></div>}
      <div className="input-group"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="input-group"><label htmlFor="password">Senha</label><input className="input" id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required /></div>
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Aguarde…' : register ? 'Criar conta e entrar' : 'Entrar'}</button>
    </form>
    <button className="btn btn-ghost" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Já tenho conta' : 'Criar conta'}</button>
  </div></div>;
}
