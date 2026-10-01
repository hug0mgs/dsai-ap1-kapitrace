import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'Lookup — KapiTrace',
  description: 'Consulta de reputação de IPs, domínios, hashes e emails com score unificado.',
};

export default function LookupLayout({ children }: { children: React.ReactNode }) {
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
