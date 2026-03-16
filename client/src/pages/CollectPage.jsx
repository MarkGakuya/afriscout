import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { saveDatapointOffline, savePhotoOffline, getCachedGuidance } from '../lib/db';
import { getGuidance, cacheGuidance, startSession, endSession } from '../lib/api';

const MARKETS = ['Kongowea', 'Gikomba', 'Wakulima', 'City Market', 'Marikiti', 'Kibuye', 'Naivas Mombasa', 'China Square', 'Eastleigh', 'Quickmart', 'Carrefour', 'Other'];
const SECTORS = ['Agriculture', 'Retail', 'Electronics', 'Healthcare', 'Transport', 'Construction', 'Food & Beverage', 'Other'];
const UNITS = ['kg', 'g', '250g', '500g', 'litre', '500ml', 'piece', 'bunch', 'crate', 'sack', 'debe', 'tray', 'box', 'dozen'];
const SELLER_TYPES = ['Retail', 'Wholesale', 'Farm gate', 'Distributor'];

// Sensitive zones - camera disabled
const SENSITIVE_MARKETS = [];
const SENSITIVE_KEYWORDS = ['bank', 'police', 'military', 'government', 'station'];

function isSensitiveZone(market) {
  if (!market) return false;
  const lower = market.toLowerCase();
  return SENSITIVE_MARKETS.includes(market) || SENSITIVE_KEYWORDS.some(k => lower.includes(k));
}

export default function CollectPage() {
  const { market: urlMarket, sector: urlSector } = useParams();
  const navigate = useNavigate();

  // Form state
  const [market, setMarket] = useState(urlMarket ? decodeURIComponent(urlMarket) : '');
  const [marketSection, setMarketSection] = useState('');
  const [county, setCounty] = useState('');
  const [sector, setSector] = useState(urlSector ? decodeURIComponent(urlSector) : '');
  const [commodity, setCommodity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [sellerType, setSellerType] = useState('Retail');
  const [notes, setNotes] = useState('');

  // UI state
  const [step, setStep] = useState('setup'); // setup | guide | collect | saved
  const [guidance, setGuidance] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [sessionId] = useState(uuid());
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // Voice
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Photo
  const [photos, setPhotos] = useState([]);
  const [stealthMode, setStealthMode] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const cameraDisabled = isSensitiveZone(market);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => {}
    );
  }, []);

  // Load guidance when market + sector selected
  useEffect(() => {
    if (market && sector) loadGuidance();
  }, [market, sector]);

  async function loadGuidance() {
    try {
      let g = await getCachedGuidance(market, sector);
      if (!g) {
        g = await getGuidance(market, sector);
        await cacheGuidance(market, sector, g);
      }
      setGuidance(g);
    } catch { /* offline, no guidance */ }
  }

  // Voice recording
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice not supported on this browser. Use Chrome.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'sw-KE'; // Kiswahili first
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(t);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  // Photo capture
  function handlePhotoCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const photo = {
        local_id: uuid(),
        photo_type: 'location',
        data_url: reader.result,
        market, market_section: marketSection,
        county, sector,
        lat, lng,
        captured_at: new Date().toISOString(),
      };
      setPhotos(prev => [...prev, photo]);
      await savePhotoOffline(photo);
    };
    reader.readAsDataURL(file);
  }

  // Save datapoint
  async function saveDatapoint() {
    if (!market || !sector || !commodity || !price) return;

    const dp = {
      local_id: uuid(),
      session_id: sessionId,
      market,
      market_section: marketSection || null,
      county: county || null,
      sector,
      commodity,
      unit,
      price: parseFloat(price),
      currency: 'KES',
      seller_type: sellerType,
      notes: notes || null,
      audio_transcript: transcript || null,
      confidence_score: transcript ? 0.85 : 0.75,
      lat, lng,
      collected_at: new Date().toISOString(),
    };

    await saveDatapointOffline(dp);
    setSavedCount(c => c + 1);

    // Reset for next datapoint — keep market and sector
    setCommodity('');
    setPrice('');
    setNotes('');
    setTranscript('');
    setStep('collect');

    // Flash success
    const flash = document.getElementById('flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => flash.style.opacity = '0', 1200);
    }
  }

  const canProceed = market && sector;
  const canSave = market && sector && commodity && price;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Flash success */}
      <div id="flash" style={{
        position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(16,185,129,0.15)', border: '1px solid var(--green)',
        color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 12,
        padding: '8px 20px', borderRadius: 20, zIndex: 999,
        opacity: 0, transition: 'opacity 0.3s', pointerEvents: 'none',
      }}>
        ✓ Datapoint saved
      </div>

      {/* Header */}
      <div style={{
        padding: '10px 16px', background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.12em' }}>
            COLLECT
          </p>
          {market && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {market} {marketSection ? `· ${marketSection}` : ''} {savedCount > 0 && `· ${savedCount} saved`}
          </p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Stealth toggle */}
          <button onClick={() => setStealthMode(s => !s)} style={{
            background: stealthMode ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: `1px solid ${stealthMode ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            color: stealthMode ? 'var(--red)' : 'var(--text3)',
            fontFamily: 'var(--mono)', fontSize: 9, padding: '4px 8px',
            borderRadius: 6, cursor: 'pointer', letterSpacing: '0.08em',
          }}>
            {stealthMode ? '◼ STEALTH' : '◻ STEALTH'}
          </button>
        </div>
      </div>

      {/* Guidance banner */}
      {guidance && step !== 'setup' && (
        <div style={{
          background: 'rgba(249,115,22,0.06)', borderBottom: '1px solid rgba(249,115,22,0.15)',
          padding: '8px 16px', flexShrink: 0,
        }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.08em' }}>
            💡 {guidance.tips}
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="scroll" style={{ flex: 1, padding: 16 }}>

        {/* STEP: SETUP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Market */}
          <Field label="Market">
            <Select value={market} onChange={setMarket} options={MARKETS} placeholder="Select market..." />
          </Field>

          {/* Market section */}
          {market && (
            <Field label="Section (optional)">
              <TextInput value={marketSection} onChange={setMarketSection} placeholder="e.g. Fresh produce, Sokondogo, Fish..." />
            </Field>
          )}

          {/* County */}
          <Field label="County">
            <TextInput value={county} onChange={setCounty} placeholder="e.g. Mombasa, Nairobi, Kisumu..." />
          </Field>

          {/* Sector */}
          <Field label="Sector">
            <Select value={sector} onChange={setSector} options={SECTORS} placeholder="Select sector..." />
          </Field>

          {/* Guidance greeting */}
          {guidance && canProceed && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: '3px solid var(--orange)', borderRadius: 10,
              padding: '12px 14px',
            }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: 8 }}>
                INTERVIEW OPENER
              </p>
              {guidance.greetings?.kiswahili?.map((line, i) => (
                <p key={i} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{line}</p>
              ))}
            </div>
          )}

          {/* Divider */}
          {canProceed && (
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          )}

          {/* COLLECTION FIELDS */}
          {canProceed && <>
            {/* Commodity */}
            <Field label="Commodity / Item">
              <TextInput value={commodity} onChange={setCommodity} placeholder="e.g. Tomatoes, Rice, Samsung TV..." />
            </Field>

            {/* Price */}
            <Field label="Price (KES)">
              <TextInput
                value={price}
                onChange={setPrice}
                placeholder="0"
                type="number"
                inputMode="decimal"
              />
            </Field>

            {/* Unit */}
            <Field label="Unit">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {UNITS.map(u => (
                  <button key={u} onClick={() => setUnit(u)} style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: unit === u ? 'rgba(249,115,22,0.15)' : 'var(--surface)',
                    border: `1px solid ${unit === u ? 'rgba(249,115,22,0.4)' : 'var(--border)'}`,
                    color: unit === u ? 'var(--orange)' : 'var(--text3)',
                    fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                  }}>{u}</button>
                ))}
              </div>
            </Field>

            {/* Seller type */}
            <Field label="Seller Type">
              <div style={{ display: 'flex', gap: 6 }}>
                {SELLER_TYPES.map(t => (
                  <button key={t} onClick={() => setSellerType(t)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 6,
                    background: sellerType === t ? 'rgba(249,115,22,0.15)' : 'var(--surface)',
                    border: `1px solid ${sellerType === t ? 'rgba(249,115,22,0.4)' : 'var(--border)'}`,
                    color: sellerType === t ? 'var(--orange)' : 'var(--text3)',
                    fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>
            </Field>

            {/* Voice */}
            <Field label="Voice Record">
              <button onClick={toggleVoice} style={{
                width: '100%', padding: '12px',
                background: listening ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.08)',
                border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.3)'}`,
                borderRadius: 10, color: listening ? 'var(--red)' : 'var(--orange)',
                fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span className={listening ? 'animate-pulse' : ''} style={{ fontSize: 16 }}>🎙</span>
                {listening ? 'Listening... tap to stop' : 'Tap to record background audio'}
              </button>
              {transcript && (
                <div style={{
                  marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)', marginBottom: 4 }}>TRANSCRIPT</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{transcript}</p>
                </div>
              )}
            </Field>

            {/* Notes */}
            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any observations about the seller, conditions, quality..."
                rows={3}
                style={{
                  width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px', color: 'var(--text)',
                  fontFamily: 'var(--mono)', fontSize: 13, resize: 'none', outline: 'none',
                }}
              />
            </Field>

            {/* Photo */}
            {!cameraDisabled && !stealthMode && (
              <Field label="Photo">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', padding: '12px',
                  background: 'var(--surface)', border: '1px dashed var(--border)',
                  borderRadius: 10, color: 'var(--text3)',
                  fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
                }}>
                  {photos.length > 0 ? `📷 ${photos.length} photo(s) taken` : '📷 Take photo'}
                </button>
              </Field>
            )}
            {stealthMode && !cameraDisabled && (
              <Field label="Stealth Photo">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', padding: '10px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, color: 'var(--red)',
                  fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer',
                }}>
                  ◼ Silent capture
                </button>
              </Field>
            )}
            {cameraDisabled && (
              <div style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '10px 12px',
              }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>
                  📵 Camera disabled in sensitive zone
                </p>
              </div>
            )}

            {/* Guidance questions */}
            {guidance?.questions && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  SUGGESTED QUESTIONS
                </p>
                {guidance.questions.slice(0, 3).map((q, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>KE: {q.q}</p>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>EN: {q.q_en}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={saveDatapoint}
              disabled={!canSave}
              style={{
                width: '100%', padding: '14px',
                background: canSave ? 'linear-gradient(135deg, #F97316, #e8650a)' : 'var(--surface)',
                border: canSave ? 'none' : '1px solid var(--border)',
                borderRadius: 12, color: canSave ? '#fff' : 'var(--text3)',
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14,
                letterSpacing: '0.1em', cursor: canSave ? 'pointer' : 'not-allowed',
                boxShadow: canSave ? '0 0 24px rgba(249,115,22,0.3)' : 'none',
                marginTop: 4,
              }}
            >
              ✓ SAVE DATAPOINT
            </button>

            {savedCount > 0 && (
              <button onClick={() => navigate('/sync')} style={{
                width: '100%', padding: '12px',
                background: 'transparent', border: '1px solid var(--green)',
                borderRadius: 12, color: 'var(--green)',
                fontFamily: 'var(--mono)', fontSize: 12,
                cursor: 'pointer', letterSpacing: '0.08em',
              }}>
                {savedCount} saved · Go to sync →
              </button>
            )}
          </>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', inputMode }) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '11px 13px', color: 'var(--text)',
        fontFamily: 'var(--mono)', fontSize: 14, outline: 'none',
      }}
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '11px 13px', color: value ? 'var(--text)' : 'var(--text3)',
        fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', appearance: 'none',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
