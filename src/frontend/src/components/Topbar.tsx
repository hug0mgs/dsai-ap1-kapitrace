'use client';

export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Quick lookup — IP, domain, hash, email..."
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon-btn" title="Notifications">
          🔔
          <span className="badge">3</span>
        </button>
        <button className="topbar-icon-btn" title="Settings">⚙️</button>
        <div className="topbar-avatar" title="Profile">
          HM
        </div>
      </div>
    </div>
  );
}
