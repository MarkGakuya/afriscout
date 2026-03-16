import { useState, useEffect } from 'react';
import { getOfflineStats, getAllDatapoints } from '../lib/db';
import { syncAll } from '../lib/api';

export default function SyncPage() {
  const [stats, setStats] = useState({ total_offline: 0, unsynced: 0, today: 0 });
  const [recentDPs, setRecentDPs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadStats();
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function loadStats() {
    const s = await getOfflineStats();
    setStats(s);
    const all = await getAllDatapoints();
    setRecentDPs(all.sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at)).slice(0, 15));
  }

  async function handleSync() {
    if (!isOnline) {
      setSyncResult('error');
      setSyncMsg('No internet. Data stays safe offline.');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setSyncMsg('');
    const result = await syncAll((msg) => setSyncMsg(msg));
    setSyncing(false);
    if (result.success) {
      setSyncResult('success');
      setSyncMsg(`✓ Synced ${result.synced} datapoints, ${result.photos} photos`);
      await loadStats();
    } else {
      setSyncResult('error');
      setSyncMsg(`✗ ${result.reason || 'Sync failed'}`);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.12em' }}>SYNC QUEUE</p>
      </div>

      <div className="scroll" style={{ flex: 1, padding: 16 }}>

        {/* Online status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: isOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isOnline ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isOnline ? 'var(--green)' : 'var(--red)',
          }} className={isOnline ? 'animate-pulse' : ''} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: isOnline ? 'var(--green)' : 'var(--red)' }}>
            {isOnline ? 'Connected — ready to sync' : 'Offline — data queued safely'}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Queued', value: stats.unsynced, color: stats.unsynced > 0 ? 'var(--orange)' : 'var(--green)' },
            { label: 'Today', value: stats.today, color: 'var(--text)' },
            { label: 'All time', value: stats.total_offline, color: 'var(--text)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing || !isOnline || stats.unsynced === 0}
          style={{
            width: '100%', padding: '14px',
            background: syncing ? 'rgba(249,115,22,0.15)' :
              (!isOnline || stats.unsynced === 0) ? 'var(--surface)' :
              'linear-gradient(135deg, #F97316, #e8650a)',
            border: (!isOnline || stats.unsynced === 0) ? '1px solid var(--border)' : 'none',
            borderRadius: 12, color: (!isOnline || stats.unsynced === 0) ? 'var(--text3)' : '#fff',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.1em', cursor: (syncing || !isOnline || stats.unsynced === 0) ? 'not-allowed' : 'pointer',
            boxShadow: (!isOnline || stats.unsynced === 0 || syncing) ? 'none' : '0 0 24px rgba(249,115,22,0.3)',
            marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {syncing ? (
            <>
              <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
              Syncing...
            </>
          ) : stats.unsynced === 0 ? '✓ All synced' : `↑ SYNC ${stats.unsynced} DATAPOINTS`}
        </button>

        {/* Sync message */}
        {syncMsg && (
          <div style={{
            background: syncResult === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${syncResult === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            fontFamily: 'var(--mono)', fontSize: 12,
            color: syncResult === 'success' ? 'var(--green)' : 'var(--red)',
          }}>
            {syncMsg}
          </div>
        )}

        {/* Recent datapoints */}
        {recentDPs.length > 0 && (
          <>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              Recent Datapoints
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentDPs.map((dp, i) => (
                <div key={i} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                      {dp.commodity}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                      {dp.market}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--orange)', fontWeight: 700 }}>
                      KES {dp.price}/{dp.unit}
                    </span>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: dp.synced ? 'var(--green)' : 'var(--orange)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
