import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function veredictoMeta(v) {
  if (v === 'COINCIDENCIA_ALTA')  return { label: 'Coincidencia Alta',  color: '#16a34a', bg: '#dcfce7' };
  if (v === 'COINCIDENCIA_MEDIA') return { label: 'Coincidencia Media', color: '#d97706', bg: '#fef3c7' };
  return                                 { label: 'Coincidencia Baja',  color: '#dc2626', bg: '#fee2e2' };
}

function ScoreBar({ label, puntaje, peso }) {
  const pct = Math.min(100, Math.max(0, Number(puntaje) || 0));
  const barColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelWrap}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={barStyles.peso}>peso {(Number(peso) * 100).toFixed(0)}%</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={barStyles.value}>{pct.toFixed(0)}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { gap: 4, marginBottom: 10 },
  labelWrap: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  peso: { fontSize: 11, color: COLORS.muted },
  track: { height: 10, borderRadius: 5, backgroundColor: COLORS.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  value: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textAlign: 'right' },
});

function ReportPill({ report, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[pillStyles.pill, selected && pillStyles.pillSelected]}
    >
      <Text style={[pillStyles.name, selected && pillStyles.nameSelected]} numberOfLines={1}>
        {report.name}
      </Text>
      <Text style={[pillStyles.detail, selected && pillStyles.detailSelected]} numberOfLines={1}>
        {report.species} {report.breed ? `· ${report.breed}` : ''}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginTop: 4 }} />}
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: 120,
    maxWidth: 160,
    alignItems: 'center',
    gap: 2,
  },
  pillSelected: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  name: { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  nameSelected: { color: '#fff' },
  detail: { fontSize: 11, color: COLORS.muted, textAlign: 'center' },
  detailSelected: { color: 'rgba(255,255,255,0.8)' },
});

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  const steps = ['Seleccionar', 'Solicitud', 'Resultado'];
  return (
    <View style={stepStyles.row}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <React.Fragment key={num}>
            <View style={stepStyles.item}>
              <View style={[stepStyles.circle, active && stepStyles.circleActive, done && stepStyles.circleDone]}>
                {done
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Text style={[stepStyles.num, active && stepStyles.numActive]}>{num}</Text>
                }
              </View>
              <Text style={[stepStyles.label, active && stepStyles.labelActive]}>{label}</Text>
            </View>
            {i < steps.length - 1 && <View style={stepStyles.line} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  item: { alignItems: 'center', gap: 4 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  circleActive: { backgroundColor: COLORS.secondary },
  circleDone: { backgroundColor: '#16a34a' },
  num: { fontSize: 13, fontWeight: '800', color: COLORS.muted },
  numActive: { color: '#fff' },
  label: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  labelActive: { color: COLORS.secondary },
  line: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, marginBottom: 14 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MatchingScreen({ navigation, route }) {
  const preselectedId = route?.params?.reportId ?? null;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  // Step 1 — selección
  const [idPerdido, setIdPerdido] = useState(preselectedId);
  const [idEncontrado, setIdEncontrado] = useState(null);

  // Step 2 — solicitud creada
  const [solicitud, setSolicitud] = useState(null);
  const [creando, setCreando] = useState(false);

  // Step 3 — resultado
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // Reglas para mostrar pesos
  const [reglas, setReglas] = useState([]);

  useEffect(() => {
    Promise.all([api.getReports(), api.getMatchingReglas().catch(() => ({ data: [] }))])
      .then(([resReportes, resReglas]) => {
        const data = resReportes?.data;
        const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        setReports(items.map(dto => ({
          id: dto.idReporteMascota,
          name: dto.nombreMascota || 'Sin nombre',
          species: dto.descripcionEspecie || '',
          breed: dto.descripcionRaza || '',
          status: (dto.descripcionTipoReporte || '').toLowerCase().includes('encontrad') ? 'Encontrado' : 'Búsqueda',
        })));
        setReglas(resReglas?.data || []);
      })
      .catch(err => setError(err?.message || 'Error cargando reportes'))
      .finally(() => setLoading(false));
  }, []);

  const reportesPerdidos   = reports.filter(r => r.status === 'Búsqueda');
  const reportesEncontrados = reports.filter(r => r.status === 'Encontrado');

  const pesoFor = (key) => {
    const r = reglas.find(r => r.descripcion?.toLowerCase() === key);
    return r ? Number(r.importancia) : 0;
  };

  const handleCrearSolicitud = async () => {
    if (!idPerdido || !idEncontrado) return setError('Selecciona ambos reportes.');
    setError(null);
    setCreando(true);
    try {
      const res = await api.crearSolicitudCoincidencia({
        idPerdidoReporte: idPerdido,
        idEncontradoReporte: idEncontrado,
      });
      setSolicitud(res.data);
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al crear solicitud.');
    } finally {
      setCreando(false);
    }
  };

  const handleProcesar = async () => {
    setError(null);
    setProcesando(true);
    try {
      const res = await api.procesarCoincidencia(solicitud.idCoincidenciaRequest);
      setResultado(res.data);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error al procesar.');
    } finally {
      setProcesando(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSolicitud(null);
    setResultado(null);
    setIdPerdido(preselectedId);
    setIdEncontrado(null);
    setError(null);
  };

  const reportePerdidoSel   = reports.find(r => r.id === idPerdido);
  const reporteEncontradoSel = reports.find(r => r.id === idEncontrado);

  return (
    <ScreenShell title="Motor de Coincidencias" scroll>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <StepIndicator step={step} />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
          <Text style={styles.muted}>Cargando reportes...</Text>
        </View>
      ) : step === 1 ? (
        // ── STEP 1: Selección ──────────────────────────────────────────────
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selecciona los reportes a comparar</Text>
          <Text style={styles.sectionLabel}>Reporte de búsqueda (mascota perdida)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {reportesPerdidos.length === 0
              ? <Text style={styles.muted}>No hay reportes de búsqueda</Text>
              : reportesPerdidos.map(r => (
                  <ReportPill key={r.id} report={r} selected={idPerdido === r.id} onPress={() => setIdPerdido(r.id)} />
                ))
            }
          </ScrollView>

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Reporte encontrado (mascota hallada)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {reportesEncontrados.length === 0
              ? <Text style={styles.muted}>No hay reportes encontrados</Text>
              : reportesEncontrados.map(r => (
                  <ReportPill key={r.id} report={r} selected={idEncontrado === r.id} onPress={() => setIdEncontrado(r.id)} />
                ))
            }
          </ScrollView>

          {idPerdido && idEncontrado && (
            <View style={styles.selectionSummary}>
              <Text style={styles.summaryText}>
                Comparando <Text style={styles.bold}>{reportePerdidoSel?.name}</Text> (perdido) con{' '}
                <Text style={styles.bold}>{reporteEncontradoSel?.name}</Text> (encontrado)
              </Text>
            </View>
          )}

          <PrimaryButton
            title={creando ? 'Creando solicitud...' : 'Crear solicitud de coincidencia'}
            onPress={handleCrearSolicitud}
            disabled={creando || !idPerdido || !idEncontrado}
            style={{ marginTop: 16 }}
          />
        </View>

      ) : step === 2 ? (
        // ── STEP 2: Solicitud creada ───────────────────────────────────────
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Solicitud creada</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID Solicitud</Text>
            <Text style={styles.infoValue}>#{solicitud.idCoincidenciaRequest}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reporte perdido</Text>
            <Text style={styles.infoValue}>#{solicitud.idPerdidoReporte} — {reportePerdidoSel?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reporte encontrado</Text>
            <Text style={styles.infoValue}>#{solicitud.idEncontradoReporte} — {reporteEncontradoSel?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <View style={styles.estadoPill}>
              <Text style={styles.estadoText}>{solicitud.estado}</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            El motor analizará raza, color, tamaño, distancia y fecha de avistamiento para calcular un puntaje de similitud.
          </Text>

          <PrimaryButton
            title={procesando ? 'Procesando...' : 'Procesar coincidencia'}
            onPress={handleProcesar}
            disabled={procesando}
            style={{ marginTop: 16 }}
          />
          <PrimaryButton title="Volver a seleccionar" variant="ghost" onPress={resetFlow} style={{ marginTop: 8 }} />
        </View>

      ) : (
        // ── STEP 3: Resultado ─────────────────────────────────────────────
        <View style={styles.card}>
          {(() => {
            const meta = veredictoMeta(resultado.veredictoFinal);
            const total = Number(resultado.puntajeTotal) || 0;
            return (
              <>
                <View style={[styles.veredictoBox, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.veredictoLabel, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[styles.veredictoScore, { color: meta.color }]}>{total.toFixed(1)} pts</Text>
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Desglose por criterio</Text>

                <ScoreBar label="Raza"       puntaje={resultado.puntajeRaza}      peso={pesoFor('raza')} />
                <ScoreBar label="Color"      puntaje={resultado.puntajeColor}     peso={pesoFor('color')} />
                <ScoreBar label="Tamaño"     puntaje={resultado.puntajeTamano}    peso={pesoFor('tamano')} />
                <ScoreBar label="Distancia"  puntaje={resultado.puntajeDistancia} peso={pesoFor('distancia')} />
                <ScoreBar label="Fecha"      puntaje={resultado.puntajeFecha}     peso={pesoFor('fecha')} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Solicitud</Text>
                  <Text style={styles.infoValue}>#{resultado.idCoincidenciaRequest}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Procesado</Text>
                  <Text style={styles.infoValue}>
                    {resultado.createdAt ? new Date(resultado.createdAt).toLocaleString() : '—'}
                  </Text>
                </View>

                <View style={styles.legend}>
                  <Text style={styles.legendTitle}>Umbrales</Text>
                  <Text style={styles.legendItem}>🟢 Alta ≥ 75 pts</Text>
                  <Text style={styles.legendItem}>🟡 Media ≥ 50 pts</Text>
                  <Text style={styles.legendItem}>🔴 Baja &lt; 50 pts</Text>
                </View>

                <PrimaryButton title="Nueva comparación" onPress={resetFlow} style={{ marginTop: 16 }} />
                <PrimaryButton title="Volver al Dashboard" variant="ghost" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: 8 }} />
              </>
            );
          })()}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  errorBanner: {
    padding: 12, borderRadius: 12, backgroundColor: '#fee2e2',
    borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  centered: { alignItems: 'center', gap: 12, paddingTop: 40 },
  muted: { color: COLORS.muted, fontSize: 13 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 24,
    borderWidth: 1, borderColor: COLORS.border, padding: 18, gap: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  pillRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  selectionSummary: {
    padding: 12, borderRadius: 12, backgroundColor: COLORS.soft,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryText: { fontSize: 13, color: COLORS.text },
  bold: { fontWeight: '800' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '700', flex: 1, textAlign: 'right' },
  estadoPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: '#fef9c3',
  },
  estadoText: { fontSize: 12, fontWeight: '700', color: '#854d0e' },
  hint: { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginTop: 4 },
  veredictoBox: {
    borderRadius: 18, padding: 20, alignItems: 'center', gap: 4,
  },
  veredictoLabel: { fontSize: 20, fontWeight: '900' },
  veredictoScore: { fontSize: 36, fontWeight: '900' },
  legend: {
    marginTop: 12, padding: 12, borderRadius: 12,
    backgroundColor: COLORS.soft, gap: 4,
  },
  legendTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 2 },
  legendItem: { fontSize: 12, color: COLORS.text },
});
