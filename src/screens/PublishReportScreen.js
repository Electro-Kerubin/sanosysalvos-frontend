import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import MapPicker from '../components/MapPicker';
import DatePickerInput from '../components/DatePickerInput';
import ImagePickerInput from '../components/ImagePickerInput';
import { COLORS } from '../styles/theme';
import api from '../api/api';

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SelectPill({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      {options.map(opt => (
        <Pressable
          key={opt.id}
          onPress={() => onChange(opt.id)}
          style={[styles.pill, value === opt.id && styles.pillActive]}
        >
          <Text style={[styles.pillText, value === opt.id && styles.pillTextActive]}>
            {opt.descripcion}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const INPUT_STYLE = (colors) => ({
  minHeight: 52,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  paddingHorizontal: 16,
  color: colors.text,
});

function getSavedProfile() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('profile') : null;
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

function addMyReportId(id) {
  try {
    const raw = window.localStorage?.getItem('myReportIds');
    const ids = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) ids.push(id);
    window.localStorage?.setItem('myReportIds', JSON.stringify(ids));
  } catch (_) {}
}

export default function PublishReportScreen({ navigation, route }) {
  const isEdit = Boolean(route?.params?.reportId);
  const savedProfile = useMemo(() => getSavedProfile(), []);

  // Catálogos
  const [tiposReporte, setTiposReporte] = useState([]);
  const [estatusList, setEstatusList] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [razas, setRazas] = useState([]);
  const [sexos, setSexos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [canales, setCanales] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Coordenadas
  const [coordLat, setCoordLat] = useState(null);
  const [coordLng, setCoordLng] = useState(null);
  const [idComuna, setIdComuna] = useState(null);
  const [showAllComunas, setShowAllComunas] = useState(false);
  const [direccion, setDireccion] = useState('');

  const normalizeStr = s =>
    (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const handleCoordinateSelected = useCallback(async (lat, lng) => {
    setCoordLat(lat);
    setCoordLng(lng);
    setIdComuna(null);
    setShowAllComunas(false);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
        { headers: { 'User-Agent': 'SanoSysalvos/1.0' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const placeName = addr.municipality || addr.city || addr.town || addr.village || '';
      if (placeName) {
        const needle = normalizeStr(placeName);
        const match = comunas.find(c => normalizeStr(c.descripcion) === needle);
        if (match) setIdComuna(match.id);
      }
    } catch (_) {
      // el usuario puede seleccionar manualmente
    }
  }, [comunas]);

  // Fotos (mockup — pendiente de microservicio)
  const [fotos, setFotos] = useState([]);

  // Mascota
  const [nombreMascota, setNombreMascota] = useState('');
  const [idEspecie, setIdEspecie] = useState(null);
  const [idRaza, setIdRaza] = useState(null);
  const [idSexo, setIdSexo] = useState(null);
  const [colorPrimario, setColorPrimario] = useState('');
  const [tamano, setTamano] = useState('');
  const [edad, setEdad] = useState('');
  const [detallesExtra, setDetallesExtra] = useState('');

  // Contacto — pre-llenado desde perfil guardado
  const [nombreContacto, setNombreContacto] = useState(savedProfile.name || '');
  const [correo, setCorreo] = useState(savedProfile.email || '');
  const [telefono, setTelefono] = useState(savedProfile.phone || '');
  const [idCanal, setIdCanal] = useState(null);

  // Reporte
  const [idTipoReporte, setIdTipoReporte] = useState(null);
  const [idEstatus, setIdEstatus] = useState(null);
  const [idMarcaDistintiva, setIdMarcaDistintiva] = useState(null);
  const [fechaExtravio, setFechaExtravio] = useState('');
  const [fechaAvistamiento, setFechaAvistamiento] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getTiposReporte(),
      api.getEstatus(),
      api.getEspecies(),
      api.getRazas(),
      api.getSexos(),
      api.getMarcasDistintivas(),
      api.getCanalesPreferencia(),
      api.getComunas().catch(() => ({ data: [] })),
    ])
      .then(([tipos, estatus, esp, rz, sx, marc, can, com]) => {
        setTiposReporte(tipos.data);
        setEstatusList(estatus.data);
        setEspecies(esp.data);
        setRazas(rz.data);
        setSexos(sx.data);
        setMarcas(marc.data);
        setCanales(can.data);
        setComunas((com.data || []).map(c => ({ id: c.idComuna, descripcion: c.nombreComuna })));
      })
      .catch(err => {
        console.error('Error cargando catálogos:', err?.message);
        setError('No se pudieron cargar los catálogos. Intenta de nuevo.');
      })
      .finally(() => setLoadingCatalogos(false));
  }, []);

  const handleSubmit = async () => {
    if (!nombreMascota.trim()) return setError('El nombre de la mascota es requerido.');
    if (!idTipoReporte) return setError('Selecciona el tipo de reporte.');
    if (!idEstatus) return setError('Selecciona el estado del reporte.');
    if (!nombreContacto.trim()) return setError('El nombre de contacto es requerido.');
    if (!correo.trim()) return setError('El correo de contacto es requerido.');
    if (!idCanal) return setError('Selecciona el canal de preferencia.');
    if (coordLat == null) return setError('Debes marcar una ubicación en el mapa.');
    if (!idComuna) return setError('Selecciona la comuna para la ubicación marcada.');

    setError(null);
    setSubmitting(true);

    try {
      const mascotaRes = await api.createMascota({
        nombreMascota: nombreMascota.trim(),
        idEspecie: idEspecie || null,
        idRaza: idRaza || null,
        idSexo: idSexo || null,
        colorPrimario: colorPrimario.trim() || null,
        tamano: tamano.trim() || null,
        edad: edad ? parseInt(edad, 10) : null,
        detallesExtra: detallesExtra.trim() || null,
      });
      const idMascota = mascotaRes.data.idMascota;

      const contactoRes = await api.createContacto({
        nombres: nombreContacto.trim(),
        correo: correo.trim(),
        telefono: telefono ? parseInt(telefono, 10) : null,
        idCanalPreferencia: idCanal,
      });
      const idContacto = contactoRes.data.idContacto;

      const reporteRes = await api.createReport({
        idTipoReporte,
        idEstatus,
        idMascota,
        idContacto,
        idMarcaDistintiva: idMarcaDistintiva || null,
        fechaExtravio: fechaExtravio || null,
        fechaAvistamiento: fechaAvistamiento || null,
        fechaReporte: new Date().toISOString(),
      });

      const idReporte = reporteRes.data.idReporteMascota;
      addMyReportId(idReporte);

      // Guardar coordenada si el usuario marcó una ubicación
      if (coordLat != null && coordLng != null && idComuna) {
        await api.createCoordenada({
          ubicacionLat: coordLat,
          ubicacionLon: coordLng,
          idReporte: idReporte,
          idComuna,
          direccion: direccion.trim() || null,
        }).catch(err => console.warn('Coordenada no guardada:', err?.message));
      }

      navigation.navigate('Dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al publicar el reporte.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalogos) {
    return (
      <ScreenShell title={isEdit ? 'Editar reporte' : 'Publicar reporte'}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
          <Text style={styles.loadingText}>Cargando formulario...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={isEdit ? 'Editar reporte' : 'Publicar reporte'} scroll>
      <View style={styles.form}>

        <Pressable onPress={() => navigation.navigate('Dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
          <Text style={styles.backText}>Volver al Dashboard</Text>
        </Pressable>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* TIPO DE REPORTE */}
        <SectionTitle title="Tipo de reporte" />
        <Field label="¿Es una mascota perdida o encontrada?">
          <SelectPill options={tiposReporte} value={idTipoReporte} onChange={setIdTipoReporte} />
        </Field>

        <Field label="Estado del reporte">
          <SelectPill options={estatusList} value={idEstatus} onChange={setIdEstatus} />
        </Field>

        {/* DATOS DE LA MASCOTA */}
        <SectionTitle title="Datos de la mascota" />

        <Field label="Nombre *">
          <TextInput
            placeholder="Ej: Firulais"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={nombreMascota}
            onChangeText={setNombreMascota}
          />
        </Field>

        <Field label="Especie">
          <SelectPill options={especies} value={idEspecie} onChange={setIdEspecie} />
        </Field>

        <Field label="Raza">
          <SelectPill options={razas} value={idRaza} onChange={setIdRaza} />
        </Field>

        <Field label="Sexo">
          <SelectPill options={sexos} value={idSexo} onChange={setIdSexo} />
        </Field>

        <Field label="Marca distintiva">
          <SelectPill options={marcas} value={idMarcaDistintiva} onChange={setIdMarcaDistintiva} />
        </Field>

        <Field label="Color principal">
          <TextInput
            placeholder="Ej: Negro"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={colorPrimario}
            onChangeText={setColorPrimario}
          />
        </Field>

        <Field label="Tamaño">
          <TextInput
            placeholder="Ej: Mediano"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={tamano}
            onChangeText={setTamano}
          />
        </Field>

        <Field label="Edad (años)">
          <TextInput
            placeholder="Ej: 3"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={edad}
            onChangeText={setEdad}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Detalles adicionales">
          <TextInput
            placeholder="Collar azul, lunares blancos en la pata..."
            placeholderTextColor={COLORS.muted}
            style={[INPUT_STYLE(COLORS), styles.textArea]}
            value={detallesExtra}
            onChangeText={setDetallesExtra}
            multiline
          />
        </Field>

        {/* FOTOS */}
        <SectionTitle title="Fotos de la mascota" />
        <Field label="Selecciona imágenes (mockup)">
          <ImagePickerInput images={fotos} onChange={setFotos} />
        </Field>

        {/* FECHAS */}
        <SectionTitle title="Fechas" />

        <Field label="Fecha de extravío">
          <DatePickerInput value={fechaExtravio} onChange={setFechaExtravio} />
        </Field>

        <Field label="Fecha de avistamiento">
          <DatePickerInput value={fechaAvistamiento} onChange={setFechaAvistamiento} />
        </Field>

        {/* UBICACIÓN */}
        <SectionTitle title="Ubicación del avistamiento" />

        <Field label="Haz clic en el mapa para marcar dónde fue visto *">
          <MapPicker
            lat={coordLat}
            lng={coordLng}
            onCoordinateSelected={handleCoordinateSelected}
          />
        </Field>

        {coordLat == null && (
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Haz clic en el mapa para seleccionar la ubicación (obligatorio)</Text>
          </View>
        )}

        {coordLat != null && (
          <>
            <Field label="Comuna *">
              <SelectPill
                options={showAllComunas ? comunas : (idComuna ? comunas.filter(c => c.id === idComuna) : comunas)}
                value={idComuna}
                onChange={id => { setIdComuna(id); setShowAllComunas(false); }}
              />
              {idComuna && !showAllComunas && (
                <Pressable onPress={() => setShowAllComunas(true)}>
                  <Text style={styles.changeLink}>¿No es la correcta? Cambiar comuna</Text>
                </Pressable>
              )}
              {!idComuna && !showAllComunas && (
                <Text style={styles.detectingText}>Detectando comuna...</Text>
              )}
            </Field>

            <Field label="Dirección (opcional)">
              <TextInput
                placeholder="Ej: Av. Providencia 1234"
                placeholderTextColor={COLORS.muted}
                style={INPUT_STYLE(COLORS)}
                value={direccion}
                onChangeText={setDireccion}
              />
            </Field>
          </>
        )}

        {/* CONTACTO */}
        <SectionTitle title="Datos de contacto" />

        <Field label="Nombre *">
          <TextInput
            placeholder="Tu nombre completo"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={nombreContacto}
            onChangeText={setNombreContacto}
          />
        </Field>

        <Field label="Correo electrónico *">
          <TextInput
            placeholder="correo@ejemplo.com"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Teléfono">
          <TextInput
            placeholder="Ej: 912345678"
            placeholderTextColor={COLORS.muted}
            style={INPUT_STYLE(COLORS)}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Canal de contacto preferido *">
          <SelectPill options={canales} value={idCanal} onChange={setIdCanal} />
        </Field>

        <PrimaryButton
          title={submitting ? 'Publicando...' : (isEdit ? 'Guardar cambios' : 'Publicar reporte')}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10, paddingBottom: 32 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 4,
  },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pillActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pillTextActive: { color: '#fff' },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  changeLink: { fontSize: 12, color: COLORS.secondary, marginTop: 4, textDecorationLine: 'underline' },
  detectingText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  mapHint: { padding: 10, borderRadius: 10, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047' },
  mapHintText: { fontSize: 12, color: '#854d0e', fontWeight: '600' },
  submitButton: { marginTop: 20 },
});
