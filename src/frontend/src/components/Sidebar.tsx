'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: '📊', section: 'MAIN' },
  { label: 'IP Lookup', href: '/lookup?type=ip', icon: '🌐', section: 'INTELLIGENCE' },
  { label: 'Domain Lookup', href: '/lookup?type=domain', icon: '🔗', section: 'INTELLIGENCE' },
  { label: 'Hash Lookup', href: '/lookup?type=hash', icon: '🧬', section: 'INTELLIGENCE' },
  { label: 'Email Lookup', href: '/lookup?type=email', icon: '📧', section: 'INTELLIGENCE' },
  { label: 'Threat Feeds', href: '/dashboard#feeds', icon: '📡', section: 'MONITORING' },
  { label: 'Watchlist', href: '/dashboard#watchlist', icon: '👁️', section: 'MONITORING' },
  { label: 'Blocklists', href: '/dashboard#blocklists', icon: '🚫', section: 'POLICIES' },
  { label: 'Reports', href: '/dashboard#reports', icon: '📜', section: 'POLICIES' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const sections = ['MAIN', 'INTELLIGENCE', 'MONITORING', 'POLICIES'];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🛡️</div>
        <span className="sidebar-brand-text">KapiTrace</span>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => {
                const isActive = pathname === item.href || 
                  (item.href.includes('?') && pathname === '/lookup' && item.href.includes(new URLSearchParams(item.href.split('?')[1] || '').get('type') || ''));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: 'var(--green-500)', 
            display: 'inline-block',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)' 
          }}></span>
          <span className="text-muted">7 APIs Ativas</span>
        </div>
      </div>
    </aside>
  );
}
