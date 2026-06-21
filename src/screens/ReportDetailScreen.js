import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';

const CUSTOM_SPECIES_STORAGE_KEY = 'customSpeciesByReportId';
const CUSTOM_BREEDS_STORAGE_KEY = 'customBreedsByReportId';
const CUSTOM_MARKS_STORAGE_KEY = 'customMarksByReportId';
const REPORT_PHOTOS_STORAGE_KEY = 'reportPhotosByReportId';
const REPORT_ADDRESS_STORAGE_KEY = 'reportAddressByReportId';
const REPORT_CONTACT_METHOD_STORAGE_KEY = 'reportContactMethodByReportId';

async function getCustomSpeciesMap() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_SPECIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

async function getStoredMap(storageKey) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function mapDTO(dto, customSpeciesMap = {}, customBreedMap = {}, customMarkMap = {}, photoMap = {}, addressMap = {}, contactMethodMap = {}) {
  const tipoDesc = (dto.descripcionTipoReporte || '').toLowerCase();
  const status = tipoDesc.includes('encontrad') ? 'Encontrado' : tipoDesc.includes('avistamiento') ? 'Avistamiento' : 'Búsqueda';
  const customSpecies = customSpeciesMap[String(dto.idReporteMascota)] || '';
  const customBreed = customBreedMap[String(dto.idReporteMascota)] || '';
  const customMark = customMarkMap[String(dto.idReporteMascota)] || '';
  const address = dto.direccion || addressMap[String(dto.idReporteMascota)] || '';
  const contactMethod = dto.descripcionCanalPreferencia || dto.nombreCanalPreferencia || dto.canalPreferencia || contactMethodMap[String(dto.idReporteMascota)] || '';
  return {
    id: dto.idReporteMascota,
    name: dto.nombreMascota || 'Sin nombre',
    species: dto.descripcionEspecie || customSpecies || '',
    breed: dto.descripcionRaza || customBreed || '',
    mark: dto.descripcionMarcaDistintiva || customMark || '',
    address,
    contactMethod,
    status,
    description: dto.detallesExtra || dto.descripcionMarcaDistintiva || '',
    contact: dto.nombresContacto || '',
    contactPhone: dto.telefonoContacto ? String(dto.telefonoContacto) : '',
    contactEmail: dto.correoContacto || '',
    fechaExtravio: dto.fechaExtravio || null,
    fechaAvistamiento: dto.fechaAvistamiento || null,
    color: dto.colorPrimario || '',
    tamano: dto.tamano || '',
    media: photoMap[String(dto.idReporteMascota)] || [],
    isMine: false,
  };
}

const SCORE_MIN = 70;

function ScoreBadge({ puntaje }) {
  const p = Number(puntaje) || 0;
  const bg = p >= 75 ? '#dcfce7' : '#fef9c3';
  const color = p >= 75 ? '#16a34a' : '#d97706';
  const label = p >= 75 ? 'Alta' : 'Media';
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{label} · {p.toFixed(0)} pts</Text>
    </View>
  );
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '';
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export default function ReportDetailScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const reportId = route?.params?.reportId;
  const isWide = width >= 920;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coincidencias, setCoincidencias] = useState([]);
  const [reportsMap, setReportsMap] = useState({});
  const [nearbyReports, setNearbyReports] = useState([]);
  const [syncingCoincidencias, setSyncingCoincidencias] = useState(false);

  const reloadCoincidencias = React.useCallback(() => {
    setSyncingCoincidencias(true);
    api.syncCoincidencias(reportId)
      .catch(() => {})
      .finally(() => {
        api.getCoincidenciasPorReporte(reportId)
          .then(res => {
            const lista = Array.isArray(res.data) ? res.data : [];
            setCoincidencias(lista.filter(c => Number(c.puntajeTotal) >= SCORE_MIN));
          })
          .catch(() => {})
          .finally(() => setSyncingCoincidencias(false));
      });
  }, [reportId]);

  useEffect(() => {
    if (!reportId) { setError('ID de reporte no especificado.'); setLoading(false); return; }
    setLoading(true);
    api.syncCoincidencias(reportId).catch(() => {});

    Promise.all([
      api.getReport(reportId),
      api.getReports().catch(() => ({ data: [] })),
      api.getCoincidenciasPorReporte(reportId).catch(() => ({ data: [] })),
      api.getCoordenadas().catch(() => ({ data: [] })),
      getCustomSpeciesMap(),
      getStoredMap(CUSTOM_BREEDS_STORAGE_KEY),
      getStoredMap(CUSTOM_MARKS_STORAGE_KEY),
      getStoredMap(REPORT_PHOTOS_STORAGE_KEY),
      getStoredMap(REPORT_ADDRESS_STORAGE_KEY),
      getStoredMap(REPORT_CONTACT_METHOD_STORAGE_KEY),
    ]).then(([resReport, resAll, resCoinc, resCoords, customSpeciesMap, customBreedMap, customMarkMap, photoMap, addressMap, contactMethodMap]) => {
      const coordItems = Array.isArray(resCoords.data) ? resCoords.data : [];
      const coordMap = {};
      coordItems.forEach(item => {
        coordMap[String(item.idReporte)] = item;
      });

      const items = Array.isArray(resAll.data) ? resAll.data
        : (Array.isArray(resAll.data?.content) ? resAll.data.content : []);
      const map = {};
      const mappedReports = items.map(dto => {
        const mapped = mapDTO(dto, customSpeciesMap, customBreedMap, customMarkMap, photoMap, addressMap, contactMethodMap);
        const coord = coordMap[String(mapped.id)] || coordMap[String(dto.idReporteMascota)];
        if (coord) {
          mapped.lat = toNumber(coord.ubicacionLat ?? coord.latitud ?? coord.lat);
          mapped.lng = toNumber(coord.ubicacionLon ?? coord.longitud ?? coord.lng);
          mapped.address = mapped.address || coord.direccion || '';
        }
        map[mapped.id] = dto;
        return mapped;
      });
      setReportsMap(map);

      const currentReport = mappedReports.find(item => String(item.id) === String(reportId)) || mapDTO(resReport.data, customSpeciesMap, customBreedMap, customMarkMap, photoMap, addressMap, contactMethodMap);
      const currentCoord = coordMap[String(reportId)] || coordMap[String(currentReport.id)];
      const currentLat = toNumber(currentCoord?.ubicacionLat ?? currentReport.lat);
      const currentLng = toNumber(currentCoord?.ubicacionLon ?? currentReport.lng);

      setReport({
        ...currentReport,
        lat: currentLat,
        lng: currentLng,
      });

      const lista = Array.isArray(resCoinc.data) ? resCoinc.data : [];
      setCoincidencias(lista.filter(c => Number(c.puntajeTotal) >= SCORE_MIN));

      if (currentLat != null && currentLng != null) {
        const nearby = mappedReports
          .filter(item => String(item.id) !== String(reportId))
          .map(item => {
            const itemLat = toNumber(item.lat);
            const itemLng = toNumber(item.lng);
            if (itemLat == null || itemLng == null) return null;
            return {
              ...item,
              distanceKm: getDistanceKm(currentLat, currentLng, itemLat, itemLng),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 5);
        setNearbyReports(nearby);
      } else {
        setNearbyReports([]);
      }
    })
      .catch(err => setError(err?.response?.data?.message || err?.message || 'Error al cargar el reporte.'))
      .finally(() => setLoading(false));
  }, [reportId]);

  return (
    <ScreenShell padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </Pressable>
        {report?.isMine && (
          <View style={styles.ownerButtons}>
            <PrimaryButton title="Editar reporte" variant="ghost" onPress={() => navigation.navigate('PublishReport', { reportId: report.id })} style={styles.ownerButton} />
            <PrimaryButton title="Borrar reporte" variant="ghost" onPress={() => {}} style={styles.ownerButton} />
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
          <Text style={styles.loadingText}>Cargando reporte...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.accent} />
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title="Volver" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      )}

      {report && !loading && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.wrapper, isWide ? styles.row : styles.column]}>

            <View style={styles.sidebarPane}>
              <View style={styles.nearbyCard}>
                <Text style={styles.sidebarTitle}>Cercanos a este punto</Text>
                <Text style={styles.sidebarHint}>Los 5 reportes más próximos con coordenadas registradas.</Text>
                {nearbyReports.length === 0 ? (
                  <Text style={styles.nearbyEmpty}>No hay otros reportes cercanos disponibles.</Text>
                ) : nearbyReports.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
                    style={styles.nearbyItem}
                  >
                    <View style={styles.nearbyItemTop}>
                      <Text style={styles.nearbyName} numberOfLines={1}>{item.name}</Text>
                      <View style={[styles.nearbyStatus, item.status === 'Encontrado' ? styles.found : styles.searching]}>
                        <Text style={styles.nearbyStatusText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.nearbyMeta} numberOfLines={1}>
                      {item.species || item.breed ? [item.species, item.breed].filter(Boolean).join(' · ') : 'Sin especie registrada'}
                    </Text>
                    <Text style={styles.nearbyDistance}>{formatDistance(item.distanceKm)} de distancia</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Panel izquierdo: imagen placeholder */}
            <View style={styles.mediaPane}>
              <View style={[styles.mediaViewer, { backgroundColor: report.status === 'Encontrado' ? '#ecfdf3' : report.status === 'Avistamiento' ? '#fff7ed' : '#fef2f2' }]}>
                {report.media?.length ? (
                  <View style={styles.mediaImageWrap}>
                    <Image source={typeof report.media[0] === 'string' ? { uri: report.media[0] } : report.media[0]} style={styles.mediaImage} resizeMode="cover" />
                  </View>
                ) : (
                  <View style={styles.mediaPlaceholder}>
                    <Image source={require('../../assets/images/noimage.png')} style={styles.mediaPlaceholderImage} resizeMode="contain" />
                    <Text style={styles.mediaPlaceholderText}>{report.name}</Text>
                    <Text style={styles.mediaPlaceholderSub}>Reporte de mascota</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Panel derecho: información */}
            <View style={styles.infoPane}>
              <Text style={styles.name}>{report.name}</Text>
              {(report.species || report.breed) && (
                <Text style={styles.meta}>{[report.species && `Especie: ${report.species}`, report.breed && `Raza: ${report.breed}`].filter(Boolean).join(' · ')}</Text>
              )}
              <View style={[styles.statusPill, report.status === 'Encontrado' ? styles.found : report.status === 'Avistamiento' ? styles.sighting : styles.searching]}>
                <Text style={styles.statusText}>{report.status}</Text>
              </View>

              {report.mark ? (
                <>
                  <Text style={styles.sectionLabel}>Marca distintiva</Text>
                  <Text style={styles.paragraph}>{report.mark}</Text>
                </>
              ) : null}

              {report.address ? (
                <>
                  <Text style={styles.sectionLabel}>Dirección</Text>
                  <Text style={styles.paragraph}>{report.address}</Text>
                </>
              ) : null}

              {report.description ? (
                <>
                  <Text style={styles.sectionLabel}>Descripción</Text>
                  <Text style={styles.paragraph}>{report.description}</Text>
                </>
              ) : null}

              {(report.color || report.tamano) ? (
                <>
                  <Text style={styles.sectionLabel}>Características</Text>
                  <View style={styles.tagsRow}>
                    {report.color ? <View style={styles.tag}><Text style={styles.tagText}>Color: {report.color}</Text></View> : null}
                    {report.tamano ? <View style={styles.tag}><Text style={styles.tagText}>Tamaño: {report.tamano}</Text></View> : null}
                  </View>
                </>
              ) : null}

              {(report.fechaExtravio || report.fechaAvistamiento) ? (
                <>
                  <Text style={styles.sectionLabel}>Fechas</Text>
                  {report.fechaExtravio && <Text style={styles.paragraph}>Extravío: {report.fechaExtravio}</Text>}
                  {report.fechaAvistamiento && <Text style={styles.paragraph}>Avistamiento: {report.fechaAvistamiento}</Text>}
                </>
              ) : null}

              <Text style={styles.sectionLabel}>Contacto</Text>
              <View style={styles.contactCard}>
                <Text style={styles.contactName}>{report.contact || 'No especificado'}</Text>
                {report.contactMethod ? <Text style={styles.contactLine}>Método preferido: {report.contactMethod}</Text> : null}
                {report.contactPhone ? <Text style={styles.contactLine}>{report.contactPhone}</Text> : null}
                {report.contactEmail ? <Text style={styles.contactLine}>{report.contactEmail}</Text> : null}
              </View>

              {/* ── Coincidencias ─────────────────────────────────────── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.sectionLabel}>Posibles coincidencias</Text>
                <Pressable onPress={reloadCoincidencias} disabled={syncingCoincidencias} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.soft, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.secondary }}>
                    {syncingCoincidencias ? 'Buscando...' : '↻ Actualizar'}
                  </Text>
                </Pressable>
              </View>
              {coincidencias.length === 0 ? (
                <Text style={styles.noMatch}>El motor aún no encontró coincidencias con puntaje ≥ {SCORE_MIN} pts.</Text>
              ) : (
                coincidencias.map(c => {
                  const contId = c.idReportePerdido === reportId ? c.idReporteEncontrado : c.idReportePerdido;
                  const contDto = reportsMap[contId];
                  const tipoDesc = (contDto?.descripcionTipoReporte || '').toLowerCase();
                  const tipoLabel = tipoDesc.includes('encontrad') ? 'Encontrado' : 'Búsqueda';
                  const name = contDto?.nombreMascota || `Reporte #${contId}`;
                  return (
                    <Pressable
                      key={c.idCoincidenciaResultado}
                      onPress={() => navigation.navigate('ReportDetail', { reportId: contId })}
                      style={styles.matchCard}
                    >
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchName}>{name}</Text>
                        <View style={[styles.matchTypePill, tipoLabel === 'Encontrado' ? styles.found : styles.searching]}>
                          <Text style={styles.matchTypeText}>{tipoLabel}</Text>
                        </View>
                      </View>
                      <ScoreBadge puntaje={c.puntajeTotal} />
                    </Pressable>
                  );
                })
              )}
            </View>

          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  ownerButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  ownerButton: { minWidth: 130 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  errorText: { color: COLORS.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 32, width: '100%', alignItems: 'center' },
  wrapper: { gap: 18, width: '100%', maxWidth: 1260, alignItems: 'flex-start' },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  sidebarPane: { flex: 0.42, minWidth: 240, maxWidth: 300 },
  nearbyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  sidebarTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.2 },
  sidebarHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  nearbyEmpty: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  nearbyItem: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  nearbyItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nearbyName: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text },
  nearbyStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  nearbyStatusText: { fontSize: 10, fontWeight: '800', color: COLORS.text },
  nearbyMeta: { color: COLORS.muted, fontSize: 12 },
  nearbyDistance: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  mediaPane: { flex: 0.95, minWidth: 280 },
  mediaViewer: {
    borderRadius: 30,
    minHeight: 260,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  mediaImageWrap: { flex: 1, minHeight: 260 },
  mediaImage: { width: '100%', height: '100%', minHeight: 260 },
  mediaPlaceholder: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  mediaPlaceholderImage: { width: 160, height: 160, marginBottom: 4, opacity: 0.95 },
  mediaPlaceholderText: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  mediaPlaceholderSub: { fontSize: 13, color: COLORS.muted },
  infoPane: {
    flex: 1.05,
    minWidth: 320,
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  name: { fontSize: 32, fontWeight: '900', color: COLORS.text, letterSpacing: -0.4 },
  meta: { color: COLORS.muted, fontSize: 14 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  found: { backgroundColor: '#dcfce7' },
  sighting: { backgroundColor: '#ffedd5' },
  searching: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  sectionLabel: { marginTop: 10, color: COLORS.text, fontSize: 14, fontWeight: '800' },
  paragraph: { color: COLORS.text, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.soft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  contactCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  contactLine: { color: COLORS.muted, marginTop: 4 },
  noMatch: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchInfo: { flex: 1, gap: 4, marginRight: 10 },
  matchName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  matchTypePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  matchTypeText: { fontSize: 10, fontWeight: '800', color: COLORS.text },
});
