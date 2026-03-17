import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { cacheProfile } from '../lib/db';

const API = import.meta.env.VITE_API_URL || 'https://afriscout.onrender.com';

const input = {
  width: '100%', background: '#0E1525', border: '1px solid #263247',
  borderRadius: 10, padding: '12px 14px', color: '#fff',
  fontFamily: "'Courier New', monospace", fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
};

const label = {
  fontFamily: "'Courier New', monospace", fontSize: 10,
  color: '#7A91B0', letterSpacing: '0.12em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
};

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regZone, setRegZone] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(email, password);
      await cacheProfile(data.scout);
      navigate('/map');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!adminCode) { setRegError('Scout code required.'); return; }
    setRegError(''); setRegSuccess(''); setRegLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminCode,
        },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, zone: regZone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setRegSuccess(`✓ Account created for ${data.scout.name}. You can now log in.`);
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegZone(''); setAdminCode('');
    } catch (err) {
      setRegError(err.message);
    } finally { setRegLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#080C18',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(#263247 1px, transparent 1px), linear-gradient(90deg, #263247 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13,
            border: '1px solid rgba(249,115,22,0.3)',
            background: 'rgba(249,115,22,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <span style={{ fontSize: 22, color: '#F97316' }}>◉</span>
          </div>
          <h1 style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '0.1em' }}>
            AFRISCOUT
          </h1>
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: '#7A91B0', letterSpacing: '0.12em', marginTop: 4 }}>
            AFRIFOUNDRY FIELD COLLECTION
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: '#0E1525', border: '1px solid #263247',
          borderRadius: 10, padding: 3, marginBottom: 24, gap: 3,
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setRegError(''); setRegSuccess(''); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: "'Courier New', monospace", fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s',
                background: mode === m ? '#F97316' : 'transparent',
                color: mode === m ? '#fff' : '#7A91B0',
                fontWeight: mode === m ? 700 : 400,
              }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus placeholder="scout@afrifoundry.com" style={input} />
            </div>
            <div>
              <label style={label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" style={input} />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px', fontFamily: "'Courier New', monospace", fontSize: 12, color: '#EF4444' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', marginTop: 4,
              background: loading ? 'rgba(249,115,22,0.3)' : 'linear-gradient(135deg, #F97316, #e8650a)',
              border: 'none', borderRadius: 10, padding: 14, color: '#fff',
              fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 13,
              letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 24px rgba(249,115,22,0.3)',
            }}>
              {loading ? 'Signing in...' : '→ ENTER FIELD'}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Full Name</label>
              <input value={regName} onChange={e => setRegName(e.target.value)}
                required placeholder="Your full name" style={input} />
            </div>
            <div>
              <label style={label}>Email</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                required placeholder="scout@email.com" style={input} />
            </div>
            <div>
              <label style={label}>Password</label>
              <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                required placeholder="••••••••" style={input} />
            </div>
            <div>
              <label style={label}>Zone / Market Area</label>
              <input value={regZone} onChange={e => setRegZone(e.target.value)}
                placeholder="e.g. Mombasa, Nairobi" style={input} />
            </div>
            <div>
              <label style={label}>Scout Access Code</label>
              <input value={adminCode} onChange={e => setAdminCode(e.target.value)}
                required placeholder="Enter your access code"
                style={{ ...input, border: adminCode ? '1px solid rgba(249,115,22,0.4)' : '1px solid #263247' }} />
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: '#7A91B0', marginTop: 5 }}>
                Code provided by AfriFoundry. Without it, registration is not possible.
              </p>
            </div>

            {regError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px', fontFamily: "'Courier New', monospace", fontSize: 12, color: '#EF4444' }}>
                {regError}
              </div>
            )}
            {regSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '10px 12px', fontFamily: "'Courier New', monospace", fontSize: 12, color: '#10B981' }}>
                {regSuccess}
              </div>
            )}

            <button type="submit" disabled={regLoading} style={{
              width: '100%', marginTop: 4,
              background: regLoading ? 'rgba(249,115,22,0.3)' : 'linear-gradient(135deg, #F97316, #e8650a)',
              border: 'none', borderRadius: 10, padding: 14, color: '#fff',
              fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 13,
              letterSpacing: '0.1em', cursor: regLoading ? 'not-allowed' : 'pointer',
              boxShadow: regLoading ? 'none' : '0 0 24px rgba(249,115,22,0.3)',
            }}>
              {regLoading ? 'Creating account...' : '→ CREATE SCOUT ACCOUNT'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: 9, color: '#4B5563', marginTop: 24, letterSpacing: '0.08em' }}>
          AfriFoundry · Internal Scout Tool · Not for public distribution
        </p>
      </div>
    </div>
  );
}
