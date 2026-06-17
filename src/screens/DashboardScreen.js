import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../components/ScreenShell';
import LogoBanner from '../components/LogoBanner';
import ResponsiveNav from '../components/ResponsiveNav';
import ReportCard from '../components/ReportCard';
import DashboardMap from '../components/DashboardMap';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import { COLORS } from '../styles/theme';
import api from '../api/api';

const CUSTOM_SPECIES_STORAGE_KEY = 'customSpeciesByReportId';
const CUSTOM_BREEDS_STORAGE_KEY = 'customBreedsByReportId';
const CUSTOM_MARKS_STORAGE_KEY = 'customMarksByReportId';
const REPORT_PHOTOS_STORAGE_KEY = 'reportPhotosByReportId';
const REPORT_ADDRESS_STORAGE_KEY = 'reportAddressByReportId';
const REPORT_CONTACT_METHOD_STORAGE_KEY = 'reportContactMethodByReportId';
const NOTIFICATIONS_SEEN_SNAPSHOT_KEY = 'matchingNotificationsSeenSnapshot';

function getMyReportIds() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('myReportIds') : null;
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

async function getCustomSpeciesMap() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_SPECIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function buildNotificationSnapshot(matchingCoincidencias) {
  const entries = Object.entries(matchingCoincidencias)
    .map(([reportId, list]) => [String(reportId), Array.isArray(list) ? list : []])
    .filter(([, list]) => list.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(entries);
}

async function getStoredMap(storageKey) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

async function removeStoredMapEntry(storageKey, reportId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    const map = raw ? JSON.parse(raw) : {};
    delete map[String(reportId)];
    await AsyncStorage.setItem(storageKey, JSON.stringify(map));
  } catch (_) {}
}

function removeLocalReportId(reportId) {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('myReportIds') : null;
    const ids = raw ? JSON.parse(raw) : [];
    const next = ids.filter(id => String(id) !== String(reportId));
    window.localStorage?.setItem('myReportIds', JSON.stringify(next));
  } catch (_) {}
}

// Convierte el DTO del backend al formato que usan los componentes de UI
function mapReporteDTO(dto, myIds, customSpeciesMap = {}, customBreedMap = {}, customMarkMap = {}, photoMap = {}, addressMap = {}, contactMethodMap = {}) {
  const tipoDesc = (dto.descripcionTipoReporte || '').toLowerCase();
  const status = tipoDesc.includes('encontrad') ? 'Encontrado' : 'Búsqueda';
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
    description: [dto.descripcionTipoReporte, contactMethod].filter(Boolean).join(' · ') || '',
    status,
    lat: dto.latitud ?? dto.lat ?? null,
    lng: dto.longitud ?? dto.lng ?? null,
    media: photoMap[String(dto.idReporteMascota)] || [],
    contact: dto.nombresContacto || '',
    isMine: myIds.includes(dto.idReporteMascota),
    createdAt: dto.fechaReporte || dto.fechaExtravio || new Date().toISOString(),
  };
}

const PAGE_SIZE = 5;

function paginate(items, page) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function Pagination({ totalPages, page, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagination}>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((num) => (
        <Pressable key={num} onPress={() => setPage(num)} style={[styles.pageChip, page === num && styles.pageChipActive]}>
          <Text style={[styles.pageText, page === num && styles.pageTextActive]}>{num}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const [page, setPage] = useState(1);
  const [myPage, setMyPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    navigation.navigate('Logout');
  };

  const requestDeleteReport = useCallback((report) => {
    setReportToDelete(report);
    setDeleteModalVisible(true);
  }, []);

  const cancelDeleteReport = useCallback(() => {
    setDeleteModalVisible(false);
    setReportToDelete(null);
  }, []);

  const confirmDeleteReport = useCallback(async () => {
    if (!reportToDelete?.id) return cancelDeleteReport();
    const reportId = reportToDelete.id;
    setDeletingReportId(reportId);
    try {
      await api.deleteReport(reportId);
      removeLocalReportId(reportId);
      await Promise.all([
        removeStoredMapEntry(CUSTOM_SPECIES_STORAGE_KEY, reportId),
        removeStoredMapEntry(CUSTOM_BREEDS_STORAGE_KEY, reportId),
        removeStoredMapEntry(CUSTOM_MARKS_STORAGE_KEY, reportId),
        removeStoredMapEntry(REPORT_PHOTOS_STORAGE_KEY, reportId),
        removeStoredMapEntry(REPORT_ADDRESS_STORAGE_KEY, reportId),
        removeStoredMapEntry(REPORT_CONTACT_METHOD_STORAGE_KEY, reportId),
      ]);
      setReports(prev => prev.filter(item => String(item.id) !== String(reportId)));
      setExpandedReportId(current => String(current) === String(reportId) ? null : current);
      setDeleteModalVisible(false);
      setReportToDelete(null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo borrar el reporte.');
    } finally {
      setDeletingReportId(null);
    }
  }, [cancelDeleteReport, reportToDelete]);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Motor de coincidencias
  const [matchingReglas, setMatchingReglas] = useState([]);
  const [matchingCoincidencias, setMatchingCoincidencias] = useState({});
  const [matchingStatus, setMatchingStatus] = useState('idle');
  const [lastChecked, setLastChecked] = useState(null);
  const matchingIntervalRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      setError(null);

      Promise.all([
        api.getReports(),
        api.getCoordenadas().catch(() => ({ data: [] })),
        getCustomSpeciesMap(),
        getStoredMap(CUSTOM_BREEDS_STORAGE_KEY),
        getStoredMap(CUSTOM_MARKS_STORAGE_KEY),
        getStoredMap(REPORT_PHOTOS_STORAGE_KEY),
        getStoredMap(REPORT_ADDRESS_STORAGE_KEY),
        getStoredMap(REPORT_CONTACT_METHOD_STORAGE_KEY),
      ])
        .then(([resReportes, resCoordenadas, customSpeciesMap, customBreedMap, customMarkMap, photoMap, addressMap, contactMethodMap]) => {
          if (!mounted) return;
          const data = resReportes?.data;
          const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : null);
          if (!items) { console.warn('Formato de respuesta inesperado:', data); return; }

          const coordMap = {};
          (resCoordenadas?.data || []).forEach(c => { coordMap[c.idReporte] = c; });

          const myIds = getMyReportIds();
          setReports(items.map(dto => {
            const mapped = mapReporteDTO(dto, myIds, customSpeciesMap, customBreedMap, customMarkMap, photoMap, addressMap, contactMethodMap);
            const coord = coordMap[mapped.id];
            if (coord) {
              mapped.lat = coord.ubicacionLat;
              mapped.lng = coord.ubicacionLon;
              mapped.address = mapped.address || coord.direccion || '';
            }
            return mapped;
          }));
        })
        .catch((err) => {
          if (!mounted) return;
          setError(err?.response?.data?.message || err?.message || 'Error al cargar reportes');
        })
        .finally(() => mounted && setLoading(false));

      return () => { mounted = false; };
    }, [])
  );

  const reportsOrdered = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reports]);
  const myReports = reportsOrdered.filter((report) => report.isMine);
  const pagedReports = paginate(reportsOrdered, page);
  const totalPages = Math.max(1, Math.ceil(reportsOrdered.length / PAGE_SIZE));
  const pagedMyReports = paginate(myReports, myPage);
  const myTotalPages = Math.max(1, Math.ceil(myReports.length / PAGE_SIZE));

  // Polling del motor de coincidencias cada 30 segundos
  const runMatchingCheck = useCallback(async (myIds) => {
    setMatchingStatus('checking');
    try {
      const reglaRes = await api.getMatchingReglas();
      setMatchingReglas(reglaRes?.data || []);

      if (myIds && myIds.length > 0) {
        const results = {};
        await Promise.all(
          myIds.map(async id => {
            try {
              const res = await api.getCoincidenciasPorReporte(id);
              results[id] = res?.data || [];
            } catch (_) {
              results[id] = [];
            }
          })
        );
        setMatchingCoincidencias(results);
      }

      setMatchingStatus('online');
      setLastChecked(new Date());
    } catch (_) {
      setMatchingStatus('offline');
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    const myIds = getMyReportIds();
    runMatchingCheck(myIds);

    matchingIntervalRef.current = setInterval(() => {
      runMatchingCheck(getMyReportIds());
    }, 30000);

    return () => clearInterval(matchingIntervalRef.current);
  }, [runMatchingCheck]);

  useEffect(() => {
    let mounted = true;
    const syncBadge = async () => {
      const currentSnapshot = buildNotificationSnapshot(matchingCoincidencias);
      const activeCount = Object.values(matchingCoincidencias).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
      if (!activeCount) {
        if (mounted) setNotificationBadgeCount(0);
        return;
      }

      const seenSnapshot = await AsyncStorage.getItem(NOTIFICATIONS_SEEN_SNAPSHOT_KEY);
      if (!mounted) return;
      setNotificationBadgeCount(seenSnapshot === currentSnapshot ? 0 : activeCount);
    };

    syncBadge();
    return () => { mounted = false; };
  }, [matchingCoincidencias]);

  return (
    <ScreenShell padded={false} scroll={false}>
      <View style={styles.header}>
        <LogoBanner compact />
        <View style={styles.headerNavWrapper}>
          {isWide && (
            <Pressable onPress={() => navigation.navigate('Inbox')} style={styles.chatHeaderButton}>
              <Text style={styles.chatHeaderButtonText}>Chat</Text>
            </Pressable>
          )}
          <ResponsiveNav navigation={navigation} openMenu={() => setMenuOpen((value) => !value)} onLogout={handleLogout} notificationBadgeCount={notificationBadgeCount} />
        </View>
      </View>

      {menuOpen ? (
        <View style={styles.mobileMenu}>
          {[
            ['PublishReport', 'Publicar reporte'],
            ['Notifications', 'Notificaciones'],
            ['Profile', 'Perfil'],
            ['Inbox', 'Chat'],
            ['Logout', 'Cerrar sesión']
          ].map(([route, label]) => (
            <Pressable key={route} onPress={() => (route === 'Logout' ? handleLogout() : navigation.navigate(route))} style={styles.mobileMenuItem}>
              <Text style={styles.mobileMenuText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.secondary} />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      )}
      {error && !loading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Mapa de reportes</Text>
            <Text style={styles.sectionHint}>Verde = encontrado, rojo = búsqueda</Text>
          </View>
          <DashboardMap
            reports={reportsOrdered}
            onReportPress={id => navigation.navigate('ReportDetail', { reportId: id })}
          />
        </View>

        {/* MOTOR DE COINCIDENCIAS */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Motor de Coincidencias</Text>
            <View style={[styles.statusPill, matchingStatus === 'online' ? styles.statusOnline : matchingStatus === 'offline' ? styles.statusOffline : styles.statusChecking]}>
              <Text style={styles.statusText}>
                {matchingStatus === 'online' ? '● Activo' : matchingStatus === 'offline' ? '● Sin conexión' : '◌ Verificando...'}
              </Text>
            </View>
          </View>
          {lastChecked && (
            <Text style={styles.sectionHint}>
              Última verificación: {lastChecked.toLocaleTimeString()} · se actualiza cada 30s
            </Text>
          )}

          {matchingReglas.length > 0 && (
            <View style={styles.reglasList}>
              <Text style={styles.subLabel}>Reglas activas ({matchingReglas.filter(r => r.activa).length})</Text>
              {matchingReglas.filter(r => r.activa).map(r => (
                <View key={r.id} style={styles.reglaRow}>
                  <Text style={styles.reglaText}>{r.descripcion}</Text>
                  <Text style={styles.regraPeso}>peso {(Number(r.importancia) * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          )}

          {Object.keys(matchingCoincidencias).length > 0 && (
            <View style={styles.reglasList}>
              <Text style={styles.subLabel}>Coincidencias por mis reportes</Text>
              {Object.entries(matchingCoincidencias).map(([id, lista]) => (
                <View key={id} style={styles.reglaRow}>
                  <Text style={styles.reglaText}>Reporte #{id}</Text>
                  <Text style={[styles.regraPeso, lista.length > 0 && styles.matchHit]}>
                    {lista.length > 0 ? `${lista.length} coincidencia(s)` : 'Sin coincidencias'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {matchingStatus === 'offline' && (
            <Text style={styles.emptyText}>No se pudo conectar con el motor de coincidencias.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos reportes</Text>
          {pagedReports.map((report) => (
            <ReportCard key={report.id} report={report} onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })} />
          ))}
          <Pagination totalPages={totalPages} page={page} setPage={setPage} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reportes realizados</Text>
          {myReports.length === 0 && !loading && (
            <Text style={styles.emptyText}>Aún no has creado reportes desde este dispositivo.</Text>
          )}
          {pagedMyReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            return (
              <View key={report.id} style={styles.mineRow}>
                <ReportCard report={report} onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })} />
                <Pressable
                  onPress={() => setExpandedReportId(isExpanded ? null : report.id)}
                  style={styles.toggleRow}
                >
                  <Text style={styles.toggleText}>{isExpanded ? '▲ Ocultar opciones' : '▼ Ver opciones'}</Text>
                </Pressable>
                {isExpanded && (
                  <View style={styles.mineActions}>
                    <View style={[styles.statePill, report.status === 'Encontrado' ? styles.stateFound : styles.stateSearching]}>
                      <Text style={styles.stateText}>{report.status}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <PrimaryButton title="Editar" variant="ghost" onPress={() => navigation.navigate('PublishReport', { reportId: report.id })} style={styles.actionButton} />
                      <PrimaryButton title={deletingReportId === report.id ? 'Borrando...' : 'Borrar'} variant="ghost" onPress={() => requestDeleteReport(report)} style={styles.actionButton} />
                    </View>
                    <PrimaryButton title="Cambiar contacto" onPress={() => navigation.navigate('Profile')} style={styles.contactButton} />
                  </View>
                )}
              </View>
            );
          })}
          <Pagination totalPages={myTotalPages} page={myPage} setPage={setMyPage} />
        </View>
      </ScrollView>
      <ConfirmModal 
        visible={logoutModalVisible}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
      <ConfirmModal
        visible={deleteModalVisible}
        title="Borrar reporte"
        message={`¿Estás seguro de que deseas borrar ${reportToDelete?.name || 'este reporte'}? Esta acción no se puede deshacer.`}
        onConfirm={confirmDeleteReport}
        onCancel={cancelDeleteReport}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(246, 243, 237, 0.95)'
  },
  headerNavWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chatHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatHeaderButtonText: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 14,
  },
  content: { padding: 20, paddingBottom: 34, gap: 18, width: '100%', alignItems: 'center' },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    maxWidth: 1120,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1
  },
  sectionTitleRow: { gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, letterSpacing: -0.2 },
  sectionHint: { color: COLORS.muted, fontSize: 12 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pageChip: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  pageChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  pageText: { color: COLORS.text, fontWeight: '700' },
  pageTextActive: { color: '#fff' },
  mineRow: { marginBottom: 18, gap: 6 },
  toggleRow: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  mineActions: {
    gap: 10,
    padding: 14,
    borderRadius: 22,
    backgroundColor: COLORS.soft,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999
  },
  stateFound: { backgroundColor: '#dcfce7' },
  stateSearching: { backgroundColor: '#fee2e2' },
  stateText: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  actionButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionButton: { flexGrow: 1, flexBasis: 120 },
  contactButton: { width: '100%' },
  mobileMenu: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    gap: 8
  },
  mobileMenuItem: { paddingVertical: 10, paddingHorizontal: 10 },
  mobileMenuText: { color: COLORS.text, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  errorBanner: { marginHorizontal: 20, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  emptyText: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusOnline: { backgroundColor: '#dcfce7' },
  statusOffline: { backgroundColor: '#fee2e2' },
  statusChecking: { backgroundColor: '#fef9c3' },
  statusText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  reglasList: { marginTop: 10, gap: 6 },
  subLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 4 },
  reglaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reglaText: { fontSize: 13, color: COLORS.text, flex: 1 },
  regraPeso: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  matchHit: { color: '#16a34a' }
});
