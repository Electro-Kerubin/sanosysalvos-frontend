import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';

function mapDTO(dto) {
  const tipoDesc = (dto.descripcionTipoReporte || '').toLowerCase();
  const status = tipoDesc.includes('encontrad') ? 'Encontrado' : 'Búsqueda';
  return {
    id: dto.idReporteMascota,
    name: dto.nombreMascota || 'Sin nombre',
    species: dto.descripcionEspecie || '',
    breed: dto.descripcionRaza || '',
    status,
    description: dto.detallesExtra || dto.descripcionMarcaDistintiva || '',
    contact: dto.nombresContacto || '',
    contactPhone: dto.telefonoContacto ? String(dto.telefonoContacto) : '',
    contactEmail: dto.correoContacto || '',
    fechaExtravio: dto.fechaExtravio || null,
    fechaAvistamiento: dto.fechaAvistamiento || null,
    color: dto.colorPrimario || '',
    tamano: dto.tamano || '',
    isMine: false,
  };
}

export default function ReportDetailScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const reportId = route?.params?.reportId;
  const isWide = width >= 920;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId) { setError('ID de reporte no especificado.'); setLoading(false); return; }
    setLoading(true);
    api.getReport(reportId)
      .then(res => setReport(mapDTO(res.data)))
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

            {/* Panel izquierdo: imagen placeholder */}
            <View style={styles.mediaPane}>
              <View style={[styles.mediaViewer, { backgroundColor: report.status === 'Encontrado' ? '#ecfdf3' : '#fef2f2' }]}>
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="paw" size={64} color={report.status === 'Encontrado' ? COLORS.success : COLORS.accent} />
                  <Text style={styles.mediaPlaceholderText}>{report.name}</Text>
                  <Text style={styles.mediaPlaceholderSub}>Reporte de mascota</Text>
                </View>
              </View>
            </View>

            {/* Panel derecho: información */}
            <View style={styles.infoPane}>
              <Text style={styles.name}>{report.name}</Text>
              {(report.species || report.breed) && (
                <Text style={styles.meta}>{[report.species, report.breed].filter(Boolean).join(' · ')}</Text>
              )}
              <View style={[styles.statusPill, report.status === 'Encontrado' ? styles.found : styles.searching]}>
                <Text style={styles.statusText}>{report.status}</Text>
              </View>

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
                {report.contactPhone ? <Text style={styles.contactLine}>{report.contactPhone}</Text> : null}
                {report.contactEmail ? <Text style={styles.contactLine}>{report.contactEmail}</Text> : null}
              </View>
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
  wrapper: { gap: 18 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  mediaPane: { flex: 1.1 },
  mediaViewer: {
    borderRadius: 30,
    minHeight: 300,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  mediaPlaceholder: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  mediaPlaceholderText: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  mediaPlaceholderSub: { fontSize: 13, color: COLORS.muted },
  infoPane: {
    flex: 0.9,
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
});
