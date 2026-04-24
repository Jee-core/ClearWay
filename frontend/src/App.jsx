import React, { useState, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  useMap, Polyline, CircleMarker
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIconPng, shadowUrl: markerShadowPng });

/* ─── SVG Icons ────────────────────────────────────────────────────── */
const Icon = {
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Navigation: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  ),
  Stop: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
  Wind: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  Route: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
};

/* ─── Map helpers ──────────────────────────────────────────────────── */
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function SmogDots({ dots }) {
  return dots.map(({ lat, lng, intensity }, i) => {
    const opacity = 0.25 + intensity * 0.35;
    const colour = intensity > 0.75 ? '#f87171'
                 : intensity > 0.5  ? '#fb923c'
                 : intensity > 0.25 ? '#facc15'
                 : '#4ade80';
    return (
      <CircleMarker key={i} center={[lat, lng]} radius={9}
        pathOptions={{ color: 'transparent', fillColor: colour, fillOpacity: opacity, weight: 0 }} />
    );
  });
}

function UserDot({ active, onUpdate }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(({ coords }) => {
      const p = [coords.latitude, coords.longitude];
      setPos(p); onUpdate(p);
    }, console.error, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, [active, onUpdate]);
  if (!pos) return null;
  return (
    <CircleMarker center={pos} radius={8}
      pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}>
      <Popup>Your position</Popup>
    </CircleMarker>
  );
}

function aqiLabel(v) {
  if (!v) return { text: '—', cls: 'aqi-nil' };
  if (v <= 50)  return { text: 'Good',      cls: 'aqi-good' };
  if (v <= 100) return { text: 'Moderate',  cls: 'aqi-mod'  };
  if (v <= 150) return { text: 'Unhealthy', cls: 'aqi-bad'  };
  return               { text: 'Hazardous', cls: 'aqi-haz'  };
}

/* ─── Landing ──────────────────────────────────────────────────────── */
function Landing({ onEnter }) {
  return (
    <div className="page-landing">
      <header className="lnd-header">
        <div className="logomark">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#fff"/>
            <circle cx="14" cy="14" r="5" fill="#0a0a0a"/>
            <circle cx="14" cy="14" r="2" fill="#fff"/>
          </svg>
          <span className="logo-text">ClearWay</span>
        </div>
        <button className="btn-ghost" onClick={onEnter}>Open App</button>
      </header>

      <div className="lnd-hero">
        <p className="lnd-kicker">SMOG-AWARE NAVIGATION</p>
        <h1 className="lnd-h1">Breathe easier.<br />Choose cleaner routes.</h1>
        <p className="lnd-sub">
          ClearWay analyses real-time air quality data across all available routes 
          and guides you along the path with the least pollution.
        </p>
        <div className="lnd-cta-row">
          <button className="btn-primary" onClick={onEnter}>
            Get started <Icon.ArrowRight />
          </button>
          <div className="lnd-meta">
            <span>Powered by OpenWeatherMap AQI</span>
            <span className="dot-sep" />
            <span>Mapbox Directions</span>
          </div>
        </div>
      </div>

      <div className="lnd-feature-row">
        {[
          {
            icon: Icon.Route,
            title: 'Route comparison',
            body: 'Every available path is scored by cumulative air quality index before you start.'
          },
          {
            icon: Icon.Wind,
            title: 'Live AQI overlay',
            body: 'Smog intensity is visualised directly on the map using real-time sensor data.'
          },
          {
            icon: Icon.Navigation,
            title: 'GPS tracking',
            body: 'Your live position is tracked and air quality is updated as you move.'
          },
        ].map(f => (
          <div className="lnd-feat" key={f.title}>
            <div className="lnd-feat-icon"><f.icon /></div>
            <h3 className="lnd-feat-title">{f.title}</h3>
            <p className="lnd-feat-body">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Nav App ──────────────────────────────────────────────────────── */
function NavApp({ onBack }) {
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [routes, setRoutes]     = useState([]);
  const [selIdx, setSelIdx]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [center, setCenter]     = useState([30.3753, 69.3451]);
  const [zoom, setZoom]         = useState(6);
  const [smogDots, setSmogDots] = useState([]);
  const [navigating, setNav]    = useState(false);
  const [userPos, setUserPos]   = useState(null);
  const [smogAhead, setSmogAhead] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  async function search(e) {
    e.preventDefault();
    setLoading(true); setError(''); setRoutes([]); setSmogDots([]);
    setSmogAhead(null); setNav(false); setSelIdx(0);
    try {
      const res = await fetch('http://localhost:5000/get-optimal-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_location: from, to_location: to })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.ranked_routes?.length) { setError('No routes found.'); return; }
      setRoutes(data.ranked_routes);
      const [lng0, lat0] = data.ranked_routes[0].route.path_coordinates[0];
      setCenter([lat0, lng0]); setZoom(8);
      const max = data.ranked_routes[0].score || 1;
      const dots = [];
      data.ranked_routes.forEach(r => {
        const intensity = Math.min(1, r.score / (max * 1.5));
        r.route.path_coordinates.forEach(([lng, lat]) => dots.push({ lat, lng, intensity }));
      });
      setSmogDots(dots);
    } catch {
      setError('Backend unreachable — make sure python app.py is running.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!navigating || !userPos) return;
    let live = true;
    fetch(`http://localhost:5000/aqi-data?lat=${userPos[0]}&lng=${userPos[1]}`)
      .then(r => r.json()).then(d => { if (live) setSmogAhead(d.smogLevel ?? null); })
      .catch(() => {});
    return () => { live = false; };
  }, [userPos, navigating]);

  const sel = routes[selIdx]?.route;
  const aqi = aqiLabel(smogAhead);

  return (
    <div className="nav-shell">
      {/* ── Top bar ── */}
      <div className="topbar">
        <button className="tb-btn" onClick={onBack} title="Home">
          <Icon.ArrowLeft />
        </button>
        <div className="logomark sm">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#fff"/>
            <circle cx="14" cy="14" r="5" fill="#0a0a0a"/>
            <circle cx="14" cy="14" r="2" fill="#fff"/>
          </svg>
          <span className="logo-text">ClearWay</span>
        </div>
        <button className="tb-btn" onClick={() => setCollapsed(c => !c)} title="Toggle panel">
          <Icon.Layers />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="nav-body">
        {/* Sidebar */}
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
          {/* Search */}
          <form className="search-block" onSubmit={search}>
            <div className="input-group">
              <div className="input-row">
                <span className="pin-dot pin-from"/>
                <input
                  className="field"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  placeholder="From"
                  required
                />
              </div>
              <div className="connector-line"/>
              <div className="input-row">
                <span className="pin-dot pin-to"/>
                <input
                  className="field"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="To"
                  required
                />
              </div>
            </div>
            <button className="btn-search" disabled={loading} type="submit">
              {loading
                ? <span className="spin"/>
                : <><Icon.Search /><span>Search</span></>
              }
            </button>
          </form>

          {error && <p className="err-line">{error}</p>}

          {/* Routes */}
          {routes.length > 0 && (
            <div className="routes-block">
              <span className="block-label">Results</span>
              {routes.map((item, idx) => {
                const active = selIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rcard ${active ? 'rcard--active' : ''}`}
                    onClick={() => setSelIdx(idx)}
                  >
                    <div className="rcard-head">
                      <span className={`rcard-rank ${idx === 0 ? 'rcard-rank--best' : ''}`}>
                        {idx === 0 ? 'Recommended' : `Route ${idx + 1}`}
                      </span>
                      {active && <span className="rcard-selected">Selected</span>}
                    </div>
                    <div className="rcard-row">
                      <div className="rcard-cell">
                        <span className="rcard-icon"><Icon.Route /></span>
                        <div>
                          <div className="rcard-val">{item.route.distance_km} km</div>
                          <div className="rcard-key">Distance</div>
                        </div>
                      </div>
                      <div className="rcard-cell">
                        <span className="rcard-icon"><Icon.Clock /></span>
                        <div>
                          <div className="rcard-val">{item.route.duration_min} min</div>
                          <div className="rcard-key">Duration</div>
                        </div>
                      </div>
                      <div className="rcard-cell">
                        <span className="rcard-icon"><Icon.Wind /></span>
                        <div>
                          <div className="rcard-val rcard-val--aqi">{item.score}</div>
                          <div className="rcard-key">AQI score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Navigation control */}
          {sel && !navigating && (
            <button className="btn-go" onClick={() => setNav(true)}>
              <Icon.Navigation />
              <span>Start navigation</span>
            </button>
          )}

          {navigating && (
            <div className="live-block">
              <div className="live-header">
                <span className="live-dot"/>
                <span className="live-label">Live air quality</span>
              </div>
              <div className={`aqi-display ${aqi.cls}`}>
                <span className="aqi-num">{smogAhead?.toFixed(1) ?? '—'}</span>
                <div className="aqi-right">
                  <span className="aqi-unit">µg / m³</span>
                  <span className={`aqi-tag ${aqi.cls}`}>{aqi.text}</span>
                </div>
              </div>
              <button className="btn-stop" onClick={() => { setNav(false); setSmogAhead(null); }}>
                <Icon.Stop />
                <span>End navigation</span>
              </button>
            </div>
          )}

          {/* AQI legend */}
          {smogDots.length > 0 && (
            <div className="legend-block">
              <span className="block-label">AQI overlay</span>
              <div className="legend-row">
                {[['#4ade80','Low'],['#facc15','Moderate'],['#fb923c','High'],['#f87171','Hazardous']].map(([c, l]) => (
                  <div className="lgnd-item" key={l}>
                    <span className="lgnd-swatch" style={{ background: c }}/>
                    <span className="lgnd-text">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="mapwrap">
          <MapContainer center={center} zoom={zoom} scrollWheelZoom zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />
            <RecenterMap center={center} />
            <SmogDots dots={smogDots} />

            {routes.map((item, idx) => {
              const coords = item.route.path_coordinates.map(([lng, lat]) => [lat, lng]);
              const active = selIdx === idx;
              return (
                <Polyline key={idx} positions={coords}
                  pathOptions={{
                    color: active ? '#00C853' : '#3d4a3d',
                    weight: active ? 5 : 2,
                    opacity: active ? 1 : 0.55,
                  }}
                  eventHandlers={{ click: () => setSelIdx(idx) }}
                />
              );
            })}

            {sel && (() => {
              const c = sel.path_coordinates;
              const [sLng, sLat] = c[0];
              const [eLng, eLat] = c[c.length - 1];
              return (
                <>
                  <Marker position={[sLat, sLng]}><Popup>Start — {from}</Popup></Marker>
                  <Marker position={[eLat, eLng]}><Popup>End — {to}</Popup></Marker>
                </>
              );
            })()}

            <UserDot active={navigating} onUpdate={setUserPos} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState('landing');
  return view === 'landing'
    ? <Landing onEnter={() => setView('app')} />
    : <NavApp onBack={() => setView('landing')} />;
}
