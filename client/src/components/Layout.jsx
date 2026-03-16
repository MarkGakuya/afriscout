import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getUnsyncedDatapoints } from '../lib/db';

const TABS = [
  { path: '/map', icon: '◉', label: 'Map' },
  { path: '/collect', icon: '⬡', label: 'Collect' },
  { path: '/sync', icon: '↑', label: 'Sync' },
  { path: '/profile', icon: '◌', label: 'Profile' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateUnsynced = async () => {
      const items = await getUnsyncedDatapoints();
      setUnsyncedCount(items.length);
    };
    updateUnsynced();
    const interval = setInterval(updateUnsynced, 5000);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.15em' }}>
          AFRISCOUT
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unsyncedCount > 0 && (
            <span style={{
              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
              color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 10,
              padding: '2px 6px', borderRadius: 4,
            }}>
              {unsyncedCount} queued
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOnline ? 'var(--green)' : 'var(--red)',
              boxShadow: `0 0 6px ${isOnline ? '#10B981' : '#EF4444'}`,
            }} className={isOnline ? 'animate-pulse' : ''} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: isOnline ? 'var(--green)' : 'var(--red)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>

      {/* Bottom navigation */}
      <nav style={{
        display: 'flex', background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }} className="safe-bottom">
        {TABS.map(tab => {
          const active = location.pathname.startsWith(tab.path);
          const showBadge = tab.path === '/sync' && unsyncedCount > 0;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, padding: '10px 0 12px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--orange)' : 'var(--text3)',
                transition: 'color 0.2s', position: 'relative',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {tab.label}
              </span>
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)',
                  background: 'var(--orange)', color: '#fff', fontSize: 8,
                  fontWeight: 700, padding: '1px 4px', borderRadius: 4,
                  fontFamily: 'var(--mono)',
                }}>
                  {unsyncedCount}
                </span>
              )}
              {active && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 20, height: 2, background: 'var(--orange)', borderRadius: 1,
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
