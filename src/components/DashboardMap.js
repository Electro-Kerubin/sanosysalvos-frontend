import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

function buildMapHtml(reports) {
  const markers = reports
    .filter(r => r.lat != null && r.lng != null)
    .map(r => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      name: r.name.replace(/'/g, "\\'"),
      status: r.status,
    }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    #map { height: 100vh; width: 100vw; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([-33.0472, -71.6127], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var markers = ${JSON.stringify(markers)};

    markers.forEach(function(r) {
      var color = r.status === 'Encontrado' ? '#22c55e' : '#ef4444';
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;border-radius:50%;background:' + color + ';border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -12]
      });
      L.marker([r.lat, r.lng], { icon: icon })
        .addTo(map)
        .bindPopup(
          '<div style="font-family:sans-serif;font-size:13px;line-height:1.5">' +
          '<strong>' + r.name + '</strong><br>' +
          '<span style="color:' + color + ';font-weight:600">' + r.status + '</span>' +
          '</div>'
        )
        .on('click', function() {
          parent.postMessage({ type: 'REPORT_CLICK', reportId: r.id }, '*');
        });
    });
  </script>
</body>
</html>`;
}

export default function DashboardMap({ reports, onReportPress }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'REPORT_CLICK' && onReportPress) {
        onReportPress(event.data.reportId);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReportPress]);

  return (
    <View style={styles.wrapper}>
      <iframe
        ref={iframeRef}
        srcDoc={buildMapHtml(reports)}
        style={iframeStyle}
        title="Mapa de reportes"
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
}

const iframeStyle = {
  width: '100%',
  height: '100%',
  border: 'none',
};

const styles = StyleSheet.create({
  wrapper: {
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
