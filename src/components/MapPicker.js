import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

function buildLeafletHtml(lat, lng) {
  const hasPin = lat != null && lng != null;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; }
    #map { height: 100vh; width: 100vw; cursor: crosshair; }
    #hint {
      position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.65); color: #fff; padding: 6px 14px;
      border-radius: 999px; font-size: 12px; z-index: 1000; pointer-events: none;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">Haz clic en el mapa para marcar la ubicación</div>
  <script>
    var initLat = ${hasPin ? lat : -33.0472};
    var initLng = ${hasPin ? lng : -71.6127};
    var map = L.map('map').setView([initLat, initLng], ${hasPin ? 15 : 12});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = ${hasPin
      ? `L.marker([${lat}, ${lng}]).addTo(map);`
      : 'null;'}

    map.on('click', function(e) {
      if (marker) map.removeLayer(marker);
      marker = L.marker(e.latlng).addTo(map);
      var hint = document.getElementById('hint');
      hint.textContent = 'Lat: ' + e.latlng.lat.toFixed(6) + '  Lng: ' + e.latlng.lng.toFixed(6);
      parent.postMessage({ type: 'MAP_CLICK', lat: e.latlng.lat, lng: e.latlng.lng }, '*');
    });
  </script>
</body>
</html>`;
}

export default function MapPicker({ lat, lng, onCoordinateSelected }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'MAP_CLICK') {
        onCoordinateSelected(event.data.lat, event.data.lng);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCoordinateSelected]);

  return (
    <View style={styles.wrapper}>
      <iframe
        ref={iframeRef}
        srcDoc={buildLeafletHtml(lat, lng)}
        style={iframeStyle}
        title="Selector de ubicación"
        sandbox="allow-scripts allow-same-origin"
      />
      {lat != null && lng != null && (
        <View style={styles.coordBadge}>
          <Text style={styles.coordText}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const iframeStyle = {
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: 16,
};

const styles = StyleSheet.create({
  wrapper: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  coordBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  coordText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
