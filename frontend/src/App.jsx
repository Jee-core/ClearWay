import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Heatmap layer component
function HeatmapLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data.length) return;

    const heatLayer = L.heatLayer(data, {
      radius: 25,
      blur: 15,
      maxZoom: 8,
      gradient: {
        0.1: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    map.setView([data[0][0], data[0][1]], 8); // Zoom to first point

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map]);

  return null;
}

function SmogDensityMap() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [heatmapData, setHeatmapData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCoordinates = async () => {
    const response = await fetch('http://localhost:5000/get-coordinates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from_location: fromLocation,
        to_location: toLocation
      })
    });

    if (!response.ok) throw new Error('Failed to get coordinates');
    return await response.json();
  };

  const fetchSmogData = async (lat, lng) => {
    const response = await fetch(`http://localhost:5000/aqi-data?lat=${lat}&lng=${lng}`);
    if (!response.ok) throw new Error('Failed to fetch AQI data');
    return await response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setHeatmapData([]);

    try {
      const coords = await fetchCoordinates();

      const [fromData, toData] = await Promise.all([
        fetchSmogData(coords.from.latitude, coords.from.longitude),
        fetchSmogData(coords.to.latitude, coords.to.longitude)
      ]);

      const maxSmog = Math.max(fromData.smogLevel, toData.smogLevel);

      const normalized = [
        [coords.from.latitude, coords.from.longitude, fromData.smogLevel / maxSmog],
        [coords.to.latitude, coords.to.longitude, toData.smogLevel / maxSmog]
      ];

      setHeatmapData(normalized);
    } catch (err) {
      console.error(err);
      setError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Pakistan Smog Heatmap</h1>

      {/* Coordinate Input Form */}
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-group">
          <label>From Location:</label>
          <input
            type="text"
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            placeholder="e.g. Lahore"
            required
          />
        </div>
        <div className="input-group">
          <label>To Location:</label>
          <input
            type="text"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            placeholder="e.g. Karachi"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Get Smog Data'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {/* Map Display */}
      <MapContainer center={[30.3753, 69.3451]} zoom={6} style={{ height: '70vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <HeatmapLayer data={heatmapData} />
        {heatmapData.map((point, idx) => (
          <Marker key={idx} position={[point[0], point[1]]}>
            <Popup>
              <strong>{idx === 0 ? 'From' : 'To'} Location</strong><br />
              Smog Level: {(point[2] * 100).toFixed(1)}%
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="legend">
        <h4>Smog Density</h4>
        <div><span style={{ background: 'blue' }}></span> Low</div>
        <div><span style={{ background: 'cyan' }}></span> Moderate</div>
        <div><span style={{ background: 'lime' }}></span> High</div>
        <div><span style={{ background: 'yellow' }}></span> Very High</div>
        <div><span style={{ background: 'red' }}></span> Extreme</div>
      </div>
    </div>
  );
}

export default SmogDensityMap;
