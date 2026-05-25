import React, { useMemo, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import LogoBanner from '../components/LogoBanner';
import ResponsiveNav from '../components/ResponsiveNav';
import ReportCard from '../components/ReportCard';
import DashboardMap from '../components/DashboardMap';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import { COLORS } from '../styles/theme';
import api from '../api/api';

function getEmailFromToken() {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.email || null;
  } catch (_) { return null; }
}

// Convierte el DTO del backend al formato que usan los componentes de UI
function mapReporteDTO(dto, userEmail) {
  const tipoDesc = (dto.descripcionTipoReporte || '').toLowerCase();
  const status = tipoDesc.includes('encontrad') ? 'Encontrado' : 'Búsqueda';
  return {
    id: dto.idReporteMascota,
    name: dto.nombreMascota || 'Sin nombre',
    species: dto.descripcionEspecie || '',
    breed: dto.descripcionRaza || '',
    description: [dto.descripcionMarcaDistintiva, dto.descripcionTipoReporte].filter(Boolean).join(' · ') || '',
    status,
    lat: dto.latitud ?? dto.lat ?? null,
    lng: dto.longitud ?? dto.lng ?? null,
    media: [],
    contact: dto.nombresContacto || '',
    isMine: userEmail && dto.correoContacto
      ? dto.correoContacto.toLowerCase() === userEmail.toLowerCase()
      : false,
    createdAt: dto.fechaReporte || dto.fechaExtravio || new Date().toISOString(),
  };
}

const PAGE_SIZE = 20;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    navigation.navigate('Logout');
  };

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      setError(null);

      const userEmail = getEmailFromToken();

      Promise.all([
        api.getReports(),
        api.getCoordenadas().catch(() => ({ data: [] })),
      ])
        .then(([resReportes, resCoordenadas]) => {
          if (!mounted) return;
          const data = resReportes?.data;
          const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : null);
          if (!items) { console.warn('Formato de respuesta inesperado:', data); return; }

          const coordMap = {};
          (resCoordenadas?.data || []).forEach(c => { coordMap[c.idReporte] = c; });

          setReports(items.map(dto => {
            const mapped = mapReporteDTO(dto, userEmail);
            const coord = coordMap[mapped.id];
            if (coord) { mapped.lat = coord.ubicacionLat; mapped.lng = coord.ubicacionLon; }
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

  return (
    <ScreenShell padded={false} scroll={false}>
      <View style={styles.header}>
        <LogoBanner compact />
        <ResponsiveNav navigation={navigation} openMenu={() => setMenuOpen((value) => !value)} onLogout={handleLogout} />
      </View>

      {menuOpen ? (
        <View style={styles.mobileMenu}>
          {[
            ['PublishReport', 'Publicar reporte'],
            ['Notifications', 'Notificaciones'],
            ['Profile', 'Perfil'],
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos reportes</Text>
          {pagedReports.map((report) => (
            <ReportCard key={report.id} report={report} onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })} />
          ))}
          <Pagination totalPages={totalPages} page={page} setPage={setPage} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reportes realizados</Text>
          {myReports.map((report) => (
            <View key={report.id} style={styles.mineRow}>
              <View style={styles.mineCardWrap}>
                <ReportCard report={report} onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })} />
              </View>
              <View style={styles.mineActions}>
                <View style={[styles.statePill, report.status === 'Encontrado' ? styles.stateFound : styles.stateSearching]}>
                  <Text style={styles.stateText}>{report.status}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <PrimaryButton title="Editar" variant="ghost" onPress={() => navigation.navigate('PublishReport', { reportId: report.id })} style={styles.actionButton} />
                  <PrimaryButton title="Borrar" variant="ghost" onPress={() => {}} style={styles.actionButton} />
                </View>
                <PrimaryButton title="Cambiar contacto" onPress={() => navigation.navigate('Profile')} style={styles.contactButton} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <ConfirmModal 
        visible={logoutModalVisible}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background
  },
  content: { padding: 20, paddingBottom: 34, gap: 18 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionTitleRow: { gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
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
  mineRow: { marginBottom: 18 },
  mineCardWrap: { marginBottom: 10 },
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
    borderRadius: 18,
    gap: 8
  },
  mobileMenuItem: { paddingVertical: 10, paddingHorizontal: 10 },
  mobileMenuText: { color: COLORS.text, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  errorBanner: { marginHorizontal: 20, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' }
});
