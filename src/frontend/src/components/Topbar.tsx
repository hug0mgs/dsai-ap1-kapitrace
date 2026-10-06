import Link from 'next/link';
export default function Topbar() {
  return <div className="topbar"><Link href="/lookup">Consultar indicador</Link><div className="topbar-actions"><Link href="/dashboard">Watchlist</Link><Link href="/login">Entrar</Link></div></div>;
}
