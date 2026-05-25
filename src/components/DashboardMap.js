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
      name: (r.name || 'Sin nombre').replace(/'/g, "\\'"),
      status: r.status,
      species: (r.species || '').replace(/'/g, "\\'"),
      breed: (r.breed || '').replace(/'/g, "\\'"),
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
      var popup = L.popup({ closeButton: false, offset: [0, -6] }).setContent(
        '<div style="font-family:sans-serif;font-size:13px;line-height:1.6;min-width:120px">' +
        '<strong>' + r.name + '</strong><br>' +
        (r.species ? '<span style="color:#6b7280">' + r.species + (r.breed ? ' · ' + r.breed : '') + '</span><br>' : '') +
        '<span style="color:' + color + ';font-weight:700">' + r.status + '</span>' +
        '<br><span style="color:#9ca3af;font-size:11px">Clic para ver detalle</span>' +
        '</div>'
      );

      L.marker([r.lat, r.lng], { icon: icon })
        .addTo(map)
        .bindPopup(popup)
        .on('mouseover', function() { this.openPopup(); })
        .on('mouseout',  function() { this.closePopup(); })
        .on('click',     function() {
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
    height: 360,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.soft,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
});
