import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'Dashboard — KapiTrace',
  description: 'Painel de inteligência de ameaças com visão geral de scores, feeds e mapa global.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
