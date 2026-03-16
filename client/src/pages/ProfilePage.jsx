import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getLeaderboard, logout, getStoredScout } from '../lib/api';
import { getCachedProfile } from '../lib/db';

const EARNINGS_PER_50 = 250; // KES

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState('stats'); // stats | leaderboard

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const [p, lb] = await Promise.all([getProfile(), getLeaderboard()]);
      setProfile(p);
      setLeaderboard(lb);
    } catch {
      const cached = await getCachedProfile();
      if (cached) setProfile(cached);
      else {
        const stored = getStoredScout();
        if (stored) setProfile(stored);
      }
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: 'var(--orange)', borderRadius: '50%', display: 'block' }} />
      </div>
    );
  }

  const nextMilestone = Math.ceil((profile.verified_datapoints + 1) / 50) * 50;
  const milestoneProgress = (profile.verified_datapoints % 50) / 50;
  const ptsToNextPayout = nextMilestone - profile.verified_datapoints;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.12em' }}>PROFILE</p>
      </div>

      <div className="scroll" style={{ flex: 1, padding: 16 }}>

        {/* Scout identity */}
        <div style={{
          background: 'linear-gradient(135deg, var(--surface), var(--surface2))',
          border: '1px solid var(--border2)', borderTop: '3px solid var(--orange)',
          borderRadius: 14, padding: '16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(249,115,22,0.15)', border: '2px solid rgba(249,115,22,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: 'var(--orange)',
            }}>
              {profile.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{profile.name}</p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2, letterSpacing: '0.08em' }}>
                {profile.zone || 'Field Scout'} · AfriFoundry
              </p>
            </div>
          </div>

          {/* Quality score */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em' }}>QUALITY SCORE</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: parseFloat(profile.quality_score) >= 80 ? 'var(--green)' : 'var(--orange)' }}>
                {parseFloat(profile.quality_score).toFixed(1)}%
              </span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 100,
                background: parseFloat(profile.quality_score) >= 80 ? 'var(--green)' : 'var(--orange)',
                width: `${profile.quality_score}%`,
              }} />
            </div>
          </div>

          {/* Next payout progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em' }}>
                NEXT PAYOUT ({ptsToNextPayout} pts away)
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                KES {EARNINGS_PER_50}
              </span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 100,
                background: 'linear-gradient(90deg, var(--gold), var(--orange))',
                width: `${milestoneProgress * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
              {profile.verified_datapoints % 50} / 50 verified datapoints
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Datapoints', value: profile.total_datapoints || 0, color: 'var(--text)' },
            { label: 'Verified', value: profile.verified_datapoints || 0, color: 'var(--green)' },
            { label: 'Earnings Pending', value: `KES ${parseFloat(profile.earnings_pending || 0).toFixed(0)}`, color: 'var(--gold)' },
            { label: 'Today', value: profile.stats?.today || 0, color: 'var(--orange)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {['stats', 'leaderboard'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px',
              background: tab === t ? 'rgba(249,115,22,0.1)' : 'transparent',
              border: `1px solid ${tab === t ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
              color: tab === t ? 'var(--orange)' : 'var(--text3)',
              borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {t === 'stats' ? '◈ Stats' : '◆ Leaderboard'}
            </button>
          ))}
        </div>

        {/* Recent sessions */}
        {tab === 'stats' && profile.recent_sessions?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recent Sessions
            </p>
            {profile.recent_sessions.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{s.market}</p>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.sector}</p>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--orange)', fontWeight: 700 }}>
                  {s.datapoints_collected} pts
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Top Scouts
            </p>
            {leaderboard.map((scout, i) => (
              <div key={i} style={{
                background: i === 0 ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
                border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14,
                  color: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--text2)' : 'var(--text3)',
                  width: 24,
                }}>
                  #{scout.rank}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                    {scout.name}
                  </p>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                    {scout.zone} · {scout.quality_score}% quality
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--orange)', fontWeight: 700 }}>
                  {scout.verified_datapoints}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout} style={{
          width: '100%', marginTop: 16, padding: '12px',
          background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, color: 'var(--red)',
          fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
          letterSpacing: '0.08em',
        }}>
          → Sign out
        </button>
      </div>
    </div>
  );
}
