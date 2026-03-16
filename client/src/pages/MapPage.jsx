import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { getHeatmap, getMissions } from '../lib/api';
import { getCachedHeatmap, cacheHeatmap } from '../lib/db';

const COVERAGE_COLORS = {
  critical: '#EF4444',
  low: '#F97316',
  medium: '#F59E0B',
  good: '#10B981',
};

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [missions, setMissions] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('heatmap'); // heatmap | missions

  // Mombasa default center
  const defaultCenter = [-4.0435, 39.6682];

  useEffect(() => {
    // Get user location
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );

    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Try live data first
      const [heatData, missionData] = await Promise.all([
        getHeatmap(), getMissions()
      ]);
      setZones(heatData);
      setMissions(missionData);
      await cacheHeatmap(heatData);
    } catch {
      // Fall back to cache
      const cached = await getCachedHeatmap();
      setZones(cached || []);
    } finally {
      setLoading(false);
    }
  }

  const mapCenter = userPos || defaultCenter;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View toggle */}
      <div style={{
        display: 'flex', background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)', padding: '8px 16px', gap: 8, flexShrink: 0,
      }}>
        {['heatmap', 'missions'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '8px', borderRadius: 8,
            background: view === v ? 'rgba(249,115,22,0.15)' : 'transparent',
            border: view === v ? '1px solid rgba(249,115,22,0.4)' : '1px solid var(--border)',
            color: view === v ? 'var(--orange)' : 'var(--text3)',
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {v === 'heatmap' ? '◉ Coverage' : '⬡ Missions'}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />
          <RecenterMap center={userPos} />

          {/* User position */}
          {userPos && (
            <Circle
              center={userPos}
              radius={30}
              pathOptions={{ color: '#4488FF', fillColor: '#4488FF', fillOpacity: 0.8, weight: 2 }}
            />
          )}

          {/* Zone circles */}
          {zones.filter(z => z.lat && z.lng).map((zone, i) => {
            const color = COVERAGE_COLORS[zone.coverage_status] || COVERAGE_COLORS.medium;
            const pct = Math.min(zone.datapoint_count / (zone.target_count || 50), 1);
            return (
              <Circle
                key={i}
                center={[parseFloat(zone.lat), parseFloat(zone.lng)]}
                radius={200 + (1 - pct) * 300}
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: 0.15 + (1 - pct) * 0.2,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--surface)', color: 'var(--text)', padding: 8, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color, marginBottom: 4 }}>{zone.market}</div>
                    {zone.market_section && <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{zone.market_section}</div>}
                    <div style={{ color: 'var(--text2)' }}>{zone.sector}</div>
                    <div style={{ marginTop: 6, color: 'var(--text3)' }}>
                      {zone.datapoint_count} / {zone.target_count} pts
                    </div>
                    <button
                      onClick={() => navigate(`/collect/${encodeURIComponent(zone.market)}/${encodeURIComponent(zone.sector)}`)}
                      style={{
                        marginTop: 8, width: '100%', background: 'var(--orange)',
                        border: 'none', borderRadius: 6, padding: '6px 10px',
                        color: '#fff', fontFamily: 'var(--mono)', fontSize: 11,
                        cursor: 'pointer', fontWeight: 700,
                      }}
                    >
                      COLLECT HERE →
                    </button>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(8,12,24,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <span className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: 'var(--orange)', borderRadius: '50%', display: 'block' }} />
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 500,
          background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 12px',
        }}>
          {Object.entries(COVERAGE_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Missions panel (slide up when missions view) */}
      {view === 'missions' && (
        <div style={{
          position: 'absolute', bottom: 60, left: 0, right: 0,
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          maxHeight: '45%', overflow: 'auto', zIndex: 600,
        }} className="scroll animate-slide-up">
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', letterSpacing: '0.12em', marginBottom: 12 }}>
              TODAY'S PRIORITY ZONES
            </p>
            {missions.length === 0 ? (
              <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>All zones up to date ✓</p>
            ) : missions.map((m, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                    {m.market}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {m.market_section} · {m.sector}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--orange)', marginTop: 2 }}>
                    {m.datapoint_count}/{m.target_count} pts · {m.collected_today} today
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/collect/${encodeURIComponent(m.market)}/${encodeURIComponent(m.sector)}`)}
                  style={{
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                    color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 11,
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  GO →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
