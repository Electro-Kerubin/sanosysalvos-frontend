import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import MapPicker from '../components/MapPicker';
import DatePickerInput from '../components/DatePickerInput';
import ImagePickerInput from '../components/ImagePickerInput';
import { COLORS } from '../styles/theme';
import api from '../api/api';

const OTHER_SPECIES_ID = '__other__';
const OTHER_BREED_ID = '__other_breed__';
const OTHER_MARK_ID = '__other_mark__';
const CUSTOM_SPECIES_STORAGE_KEY = 'customSpeciesByReportId';
const CUSTOM_BREEDS_STORAGE_KEY = 'customBreedsByReportId';
const CUSTOM_MARKS_STORAGE_KEY = 'customMarksByReportId';
const REPORT_PHOTOS_STORAGE_KEY = 'reportPhotosByReportId';
const REPORT_ADDRESS_STORAGE_KEY = 'reportAddressByReportId';
const REPORT_CONTACT_METHOD_STORAGE_KEY = 'reportContactMethodByReportId';
const SPECIES_SUGGESTIONS_STORAGE_KEY = 'speciesSuggestions';
const BREED_SUGGESTIONS_STORAGE_KEY = 'breedSuggestions';
const MAX_VISIBLE_OPTIONS = 10;

function readJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_) {
    return fallback;
  }
}

async function getStoredMap(storageKey) {
  try {
    return readJson(await AsyncStorage.getItem(storageKey), {});
  } catch (_) {
    return {};
  }
}

async function saveStoredMap(storageKey, reportId, value) {
  try {
    const map = await getStoredMap(storageKey);
    const key = String(reportId);
    if (value) map[key] = value;
    else delete map[key];
    await AsyncStorage.setItem(storageKey, JSON.stringify(map));
  } catch (_) {}
}

async function getSuggestionList(storageKey) {
  try {
    return readJson(await AsyncStorage.getItem(storageKey), []);
  } catch (_) {
    return [];
  }
}

async function saveSuggestion(storageKey, value) {
  const trimmed = value.trim();
  if (!trimmed) return;
  try {
    const current = await getSuggestionList(storageKey);
    const normalized = trimmed.toLowerCase();
    const next = [trimmed, ...current.filter(item => item.toLowerCase() !== normalized)].slice(0, MAX_VISIBLE_OPTIONS);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  } catch (_) {}
}

function normalizeText(value) {
  return (value ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function mergeOptions(baseOptions, suggestions, otherOption) {
  const merged = [];
  const seen = new Set();

  const push = option => {
    if (!option || option.id == null) return;
    const key = String(option.id);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(option);
  };

  suggestions.forEach((description, index) => {
    const clean = (description || '').trim();
    if (!clean) return;
    push({ id: `custom-${normalizeText(clean)}-${index}`, descripcion: clean });
  });

  baseOptions.forEach(push);
  if (otherOption) {
    if (seen.has(String(otherOption.id))) return merged.slice(0, MAX_VISIBLE_OPTIONS);
    if (merged.length >= MAX_VISIBLE_OPTIONS) {
      merged[MAX_VISIBLE_OPTIONS - 1] = otherOption;
    } else {
      push(otherOption);
    }
  }

  return merged.slice(0, MAX_VISIBLE_OPTIONS);
}

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
          onPress={() => onChange(opt.id, opt.descripcion)}
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

async function saveCustomSpeciesForReport(reportId, species) {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_SPECIES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = String(reportId);
    if (species) map[key] = species;
    else delete map[key];
    await AsyncStorage.setItem(CUSTOM_SPECIES_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {}
}

async function removeStoredMapEntry(storageKey, reportId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    const map = raw ? JSON.parse(raw) : {};
    delete map[String(reportId)];
    await AsyncStorage.setItem(storageKey, JSON.stringify(map));
  } catch (_) {}
}

export default function PublishReportScreen({ navigation, route }) {
  const isEdit = Boolean(route?.params?.reportId);
  const savedProfile = useMemo(() => getSavedProfile(), []);

  // Catálogos
  const [tiposReporte, setTiposReporte] = useState([]);
  const [estatusList, setEstatusList] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [razas, setRazas] = useState([]);
  const [breedSuggestions, setBreedSuggestions] = useState([]);
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
  const [especiePersonalizada, setEspeciePersonalizada] = useState('');
  const [especieConfirmada, setEspecieConfirmada] = useState('');
  const [idRaza, setIdRaza] = useState(null);
  const [razaPersonalizada, setRazaPersonalizada] = useState('');
  const [razaConfirmada, setRazaConfirmada] = useState('');
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
  const [marcaPersonalizada, setMarcaPersonalizada] = useState('');
  const [marcaConfirmada, setMarcaConfirmada] = useState('');
  const [fechaExtravio, setFechaExtravio] = useState('');
  const [fechaAvistamiento, setFechaAvistamiento] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(isEdit);
  const [editContext, setEditContext] = useState(null);
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false);

  const especiesConOtro = useMemo(() => [
    ...mergeOptions(especies, speciesSuggestions, { id: OTHER_SPECIES_ID, descripcion: 'Otro' }),
  ], [especies, speciesSuggestions]);

  const razasConOtro = useMemo(() => [
    ...mergeOptions(razas, breedSuggestions, { id: OTHER_BREED_ID, descripcion: 'Otro' }),
  ], [razas, breedSuggestions]);

  const marcasConOtro = useMemo(() => [
    ...mergeOptions(marcas, [], { id: OTHER_MARK_ID, descripcion: 'Otro' }),
  ], [marcas]);

  const handleSpeciesChange = useCallback((value, description) => {
    setIdEspecie(value);
    if (String(value).startsWith('custom-')) {
      setEspeciePersonalizada(description || '');
      setEspecieConfirmada(description || '');
      return;
    }
    if (value !== OTHER_SPECIES_ID) {
      setEspeciePersonalizada('');
      setEspecieConfirmada('');
    }
  }, []);

  const handleConfirmCustomSpecies = useCallback(() => {
    const trimmed = especiePersonalizada.trim();
    if (!trimmed) {
      setError('Escribe la especie antes de confirmarla.');
      return;
    }
    setError(null);
    setEspecieConfirmada(trimmed);
  }, [especiePersonalizada]);

  const handleBreedChange = useCallback((value, description) => {
    setIdRaza(value);
    if (String(value).startsWith('custom-')) {
      setRazaPersonalizada(description || '');
      setRazaConfirmada(description || '');
      return;
    }
    if (value !== OTHER_BREED_ID) {
      setRazaPersonalizada('');
      setRazaConfirmada('');
    }
  }, []);

  const handleConfirmCustomBreed = useCallback(() => {
    const trimmed = razaPersonalizada.trim();
    if (!trimmed) {
      setError('Escribe la raza antes de confirmarla.');
      return;
    }
    setError(null);
    setRazaConfirmada(trimmed);
  }, [razaPersonalizada]);

  const handleMarkChange = useCallback((value) => {
    setIdMarcaDistintiva(value);
    if (value !== OTHER_MARK_ID) {
      setMarcaPersonalizada('');
      setMarcaConfirmada('');
    }
  }, []);

  const handleConfirmCustomMark = useCallback(() => {
    const trimmed = marcaPersonalizada.trim();
    if (!trimmed) {
      setError('Escribe la marca distintiva antes de confirmarla.');
      return;
    }
    setError(null);
    setMarcaConfirmada(trimmed);
  }, [marcaPersonalizada]);

  function getSelectedOption(options, value) {
    return options.find(option => String(option.id) === String(value));
  }

  useEffect(() => {
    if (!isEdit || !route?.params?.reportId || loadingCatalogos) return;
    let mounted = true;
    setLoadingEditData(true);

    Promise.all([
      api.getReport(route.params.reportId),
      api.getCoordenadas().catch(() => ({ data: [] })),
      getStoredMap(CUSTOM_SPECIES_STORAGE_KEY),
      getStoredMap(CUSTOM_BREEDS_STORAGE_KEY),
      getStoredMap(CUSTOM_MARKS_STORAGE_KEY),
      getStoredMap(REPORT_PHOTOS_STORAGE_KEY),
      getStoredMap(REPORT_ADDRESS_STORAGE_KEY),
      getStoredMap(REPORT_CONTACT_METHOD_STORAGE_KEY),
    ])
      .then(([reportRes, coordenadasRes, speciesMap, breedMap, markMap, photoMap, addressMap, contactMethodMap]) => {
        if (!mounted) return;
        const dto = reportRes.data || {};
        const coord = (coordenadasRes.data || []).find(item => String(item.idReporte) === String(route.params.reportId));
        const speciesText = dto.descripcionEspecie || speciesMap[String(dto.idReporteMascota)] || '';
        const breedText = dto.descripcionRaza || breedMap[String(dto.idReporteMascota)] || '';
        const markText = dto.descripcionMarcaDistintiva || markMap[String(dto.idReporteMascota)] || '';
        const speciesMatch = especies.find(option => normalizeText(option.descripcion) === normalizeText(speciesText));
        const breedMatch = razas.find(option => normalizeText(option.descripcion) === normalizeText(breedText));
        const markMatch = marcas.find(option => normalizeText(option.descripcion) === normalizeText(markText));
        const channelMatch = canales.find(option => String(option.id) === String(dto.idCanalPreferencia) || normalizeText(option.descripcion) === normalizeText(dto.descripcionCanalPreferencia || dto.nombreCanalPreferencia || ''));

        setNombreMascota(dto.nombreMascota || '');
        setIdEspecie(speciesMatch ? speciesMatch.id : (speciesText ? OTHER_SPECIES_ID : null));
        setEspeciePersonalizada(speciesMatch ? '' : speciesText);
        setEspecieConfirmada(speciesMatch ? '' : speciesText);
        setIdRaza(breedMatch ? breedMatch.id : (breedText ? OTHER_BREED_ID : null));
        setRazaPersonalizada(breedMatch ? '' : breedText);
        setRazaConfirmada(breedMatch ? '' : breedText);
        setIdSexo(dto.idSexo || null);
        setColorPrimario(dto.colorPrimario || '');
        setTamano(dto.tamano || '');
        setEdad(dto.edad != null ? String(dto.edad) : '');
        setDetallesExtra(dto.detallesExtra || '');
        setNombreContacto(dto.nombresContacto || '');
        setCorreo(dto.correoContacto || '');
        setTelefono(dto.telefonoContacto ? String(dto.telefonoContacto) : '');
        setIdCanal(channelMatch ? channelMatch.id : (dto.idCanalPreferencia || null));
        setIdTipoReporte(dto.idTipoReporte || null);
        setIdEstatus(dto.idEstatus || null);
        setIdMarcaDistintiva(markMatch ? markMatch.id : (markText ? OTHER_MARK_ID : null));
        setMarcaPersonalizada(markMatch ? '' : markText);
        setMarcaConfirmada(markMatch ? '' : markText);
        setFechaExtravio(dto.fechaExtravio || '');
        setFechaAvistamiento(dto.fechaAvistamiento || '');
        setCoordLat(coord?.ubicacionLat ?? null);
        setCoordLng(coord?.ubicacionLon ?? null);
        setIdComuna(coord?.idComuna ?? null);
        setDireccion(dto.direccion || addressMap[String(dto.idReporteMascota)] || coord?.direccion || '');
        setFotos((photoMap[String(dto.idReporteMascota)] || []).map(uri => ({ uri })));
        setEditContext({
          reportId: dto.idReporteMascota,
          mascotaId: dto.idMascota,
          contactoId: dto.idContacto,
          coordenadaId: coord?.idCoordenada || coord?.id,
        });
      })
      .catch(err => setError(err?.response?.data?.message || err?.message || 'Error cargando el reporte para edición.'))
      .finally(() => mounted && setLoadingEditData(false));

    return () => { mounted = false; };
  }, [isEdit, route?.params?.reportId, loadingCatalogos, especies, razas, marcas, canales]);

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
      getSuggestionList(SPECIES_SUGGESTIONS_STORAGE_KEY),
      getSuggestionList(BREED_SUGGESTIONS_STORAGE_KEY),
    ])
      .then(([tipos, estatus, esp, rz, sx, marc, can, com, speciesSugs, breedSugs]) => {
        setTiposReporte((tipos.data || []).filter(t => !(t.descripcionTipoReporte || '').toLowerCase().includes('encontrad')));
        setEstatusList(estatus.data);
        setEspecies(esp.data);
        setRazas(rz.data);
        setSexos(sx.data);
        setMarcas(marc.data);
        setCanales(can.data);
        setSpeciesSuggestions(speciesSugs || []);
        setBreedSuggestions(breedSugs || []);
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
    const selectedSpecies = getSelectedOption(especiesConOtro, idEspecie);
    const selectedBreed = getSelectedOption(razasConOtro, idRaza);
    const customSpecies = idEspecie === OTHER_SPECIES_ID ? especieConfirmada.trim() : (String(idEspecie).startsWith('custom-') ? (selectedSpecies?.descripcion || '').trim() : '');
    if (idEspecie === OTHER_SPECIES_ID && !customSpecies) return setError('Confirma la especie personalizada antes de publicar.');
    const customBreed = idRaza === OTHER_BREED_ID ? razaConfirmada.trim() : (String(idRaza).startsWith('custom-') ? (selectedBreed?.descripcion || '').trim() : '');
    if (idRaza === OTHER_BREED_ID && !customBreed) return setError('Confirma la raza personalizada antes de publicar.');
    const customMark = idMarcaDistintiva === OTHER_MARK_ID ? marcaConfirmada.trim() : '';
    if (idMarcaDistintiva === OTHER_MARK_ID && !customMark) return setError('Confirma la marca distintiva antes de publicar.');
    if (!nombreContacto.trim()) return setError('El nombre de contacto es requerido.');
    if (!idCanal) return setError('Selecciona el canal de preferencia.');
    if (coordLat == null) return setError('Debes marcar una ubicación en el mapa.');
    if (!idComuna) return setError('Selecciona la comuna para la ubicación marcada.');

    setError(null);
    setSubmitting(true);

    try {
      const mascotaPayload = {
        nombreMascota: nombreMascota.trim(),
        idEspecie: (idEspecie === OTHER_SPECIES_ID || String(idEspecie).startsWith('custom-')) ? null : idEspecie || null,
        idRaza: (idRaza === OTHER_BREED_ID || String(idRaza).startsWith('custom-')) ? null : idRaza || null,
        idSexo: idSexo || null,
        colorPrimario: colorPrimario.trim() || null,
        tamano: tamano.trim() || null,
        edad: edad ? parseInt(edad, 10) : null,
        detallesExtra: detallesExtra.trim() || null,
      };

      if (customSpecies) {
        mascotaPayload.descripcionEspecie = customSpecies;
      }
      if (customBreed) {
        mascotaPayload.descripcionRaza = customBreed;
      }

      const contactoPayload = {
        nombres: nombreContacto.trim(),
        correo: correo.trim() || null,
        telefono: telefono ? parseInt(telefono, 10) : null,
        idCanalPreferencia: idCanal,
      };

      const selectedContactMethod = canales.find(item => String(item.id) === String(idCanal))?.descripcion || '';

      if (isEdit && editContext?.reportId) {
        const reportId = editContext.reportId;
        const mascotaId = editContext.mascotaId;
        const contactoId = editContext.contactoId;

        if (mascotaId) await api.updateMascota(mascotaId, mascotaPayload);
        if (contactoId) await api.updateContacto(contactoId, contactoPayload);

        await api.updateReport(reportId, {
          idTipoReporte,
          idEstatus,
          idMascota: mascotaId || editContext.mascotaId || null,
          idContacto: contactoId || editContext.contactoId || null,
          idMarcaDistintiva: (idMarcaDistintiva === OTHER_MARK_ID || String(idMarcaDistintiva).startsWith('custom-')) ? null : idMarcaDistintiva || null,
          fechaExtravio: fechaExtravio || null,
          fechaAvistamiento: fechaAvistamiento || null,
          fechaReporte: new Date().toISOString(),
        });

        if (customSpecies) {
          await saveCustomSpeciesForReport(reportId, customSpecies);
          await saveSuggestion(SPECIES_SUGGESTIONS_STORAGE_KEY, customSpecies);
        } else {
          await removeStoredMapEntry(CUSTOM_SPECIES_STORAGE_KEY, reportId);
        }
        if (customBreed) {
          await saveStoredMap(CUSTOM_BREEDS_STORAGE_KEY, reportId, customBreed);
          await saveSuggestion(BREED_SUGGESTIONS_STORAGE_KEY, customBreed);
        } else {
          await removeStoredMapEntry(CUSTOM_BREEDS_STORAGE_KEY, reportId);
        }
        if (customMark) {
          await saveStoredMap(CUSTOM_MARKS_STORAGE_KEY, reportId, customMark);
        } else {
          await removeStoredMapEntry(CUSTOM_MARKS_STORAGE_KEY, reportId);
        }
        await saveStoredMap(REPORT_PHOTOS_STORAGE_KEY, reportId, fotos.map(img => img.uri));
        await saveStoredMap(REPORT_ADDRESS_STORAGE_KEY, reportId, direccion.trim() || null);
        await saveStoredMap(REPORT_CONTACT_METHOD_STORAGE_KEY, reportId, selectedContactMethod);

        if (editContext.coordenadaId) {
          await api.updateCoordenada(editContext.coordenadaId, {
            ubicacionLat: coordLat,
            ubicacionLon: coordLng,
            idComuna,
            direccion: direccion.trim() || null,
          }).catch(async () => {
            await api.createCoordenada({
              ubicacionLat: coordLat,
              ubicacionLon: coordLng,
              idReporte: reportId,
              idComuna,
              direccion: direccion.trim() || null,
            });
          });
        } else {
          await api.createCoordenada({
            ubicacionLat: coordLat,
            ubicacionLon: coordLng,
            idReporte: reportId,
            idComuna,
            direccion: direccion.trim() || null,
          }).catch(err => console.warn('Coordenada no guardada:', err?.message));
        }
      } else {
        const mascotaRes = await api.createMascota(mascotaPayload);
        const idMascota = mascotaRes.data.idMascota;

        const contactoRes = await api.createContacto(contactoPayload);
        const idContacto = contactoRes.data.idContacto;

        const reporteRes = await api.createReport({
          idTipoReporte,
          idEstatus,
          idMascota,
          idContacto,
          idMarcaDistintiva: (idMarcaDistintiva === OTHER_MARK_ID || String(idMarcaDistintiva).startsWith('custom-')) ? null : idMarcaDistintiva || null,
          fechaExtravio: fechaExtravio || null,
          fechaAvistamiento: fechaAvistamiento || null,
          fechaReporte: new Date().toISOString(),
        });

        const idReporte = reporteRes.data.idReporteMascota;
        addMyReportId(idReporte);
        if (customSpecies) {
          await saveCustomSpeciesForReport(idReporte, customSpecies);
          await saveSuggestion(SPECIES_SUGGESTIONS_STORAGE_KEY, customSpecies);
        }
        if (customBreed) {
          await saveStoredMap(CUSTOM_BREEDS_STORAGE_KEY, idReporte, customBreed);
          await saveSuggestion(BREED_SUGGESTIONS_STORAGE_KEY, customBreed);
        }
        if (customMark) {
          await saveStoredMap(CUSTOM_MARKS_STORAGE_KEY, idReporte, customMark);
        }
        await saveStoredMap(REPORT_PHOTOS_STORAGE_KEY, idReporte, fotos.map(img => img.uri));
        await saveStoredMap(REPORT_ADDRESS_STORAGE_KEY, idReporte, direccion.trim() || null);
        await saveStoredMap(REPORT_CONTACT_METHOD_STORAGE_KEY, idReporte, selectedContactMethod);

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
      }

      navigation.navigate('Dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al publicar el reporte.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmitConfirmation = () => {
    setError(null);
    setSubmitConfirmVisible(true);
  };

  const confirmSubmit = () => {
    setSubmitConfirmVisible(false);
    handleSubmit();
  };

  if (loadingCatalogos || loadingEditData) {
    return (
      <ScreenShell title={isEdit ? 'Editar reporte' : 'Publicar reporte'}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
          <Text style={styles.loadingText}>{isEdit ? 'Cargando reporte para editar...' : 'Cargando formulario...'}</Text>
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
          <SelectPill options={especiesConOtro} value={idEspecie} onChange={handleSpeciesChange} />
          {idEspecie === OTHER_SPECIES_ID && (
            <View style={styles.customSpeciesBox}>
              <TextInput
                placeholder="Escribe la especie"
                placeholderTextColor={COLORS.muted}
                style={[INPUT_STYLE(COLORS), styles.customSpeciesInput]}
                value={especiePersonalizada}
                onChangeText={setEspeciePersonalizada}
                autoCapitalize="words"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleConfirmCustomSpecies}
              />
              <PrimaryButton title="Confirmar" onPress={handleConfirmCustomSpecies} style={styles.customSpeciesButton} />
            </View>
          )}
          {especieConfirmada ? <Text style={styles.confirmedSpecies}>Especie guardada: {especieConfirmada}</Text> : null}
        </Field>

        <Field label="Raza">
          <SelectPill options={razasConOtro} value={idRaza} onChange={handleBreedChange} />
          {idRaza === OTHER_BREED_ID && (
            <View style={styles.customSpeciesBox}>
              <TextInput
                placeholder="Escribe la raza"
                placeholderTextColor={COLORS.muted}
                style={[INPUT_STYLE(COLORS), styles.customSpeciesInput]}
                value={razaPersonalizada}
                onChangeText={setRazaPersonalizada}
                autoCapitalize="words"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleConfirmCustomBreed}
              />
              <PrimaryButton title="Confirmar" onPress={handleConfirmCustomBreed} style={styles.customSpeciesButton} />
            </View>
          )}
          {razaConfirmada ? <Text style={styles.confirmedSpecies}>Raza guardada: {razaConfirmada}</Text> : null}
        </Field>

        <Field label="Sexo">
          <SelectPill options={sexos} value={idSexo} onChange={setIdSexo} />
        </Field>

        <Field label="Marca distintiva">
          <SelectPill options={marcasConOtro} value={idMarcaDistintiva} onChange={handleMarkChange} />
          {idMarcaDistintiva === OTHER_MARK_ID && (
            <View style={styles.customSpeciesBox}>
              <TextInput
                placeholder="Escribe la marca distintiva"
                placeholderTextColor={COLORS.muted}
                style={[INPUT_STYLE(COLORS), styles.customSpeciesInput]}
                value={marcaPersonalizada}
                onChangeText={setMarcaPersonalizada}
                autoCapitalize="words"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleConfirmCustomMark}
              />
              <PrimaryButton title="Confirmar" onPress={handleConfirmCustomMark} style={styles.customSpeciesButton} />
            </View>
          )}
          {marcaConfirmada ? <Text style={styles.confirmedSpecies}>Marca guardada: {marcaConfirmada}</Text> : null}
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
          onPress={requestSubmitConfirmation}
          disabled={submitting}
          style={styles.submitButton}
        />
      </View>

      <ConfirmModal
        visible={submitConfirmVisible}
        title={isEdit ? 'Confirmar cambios' : 'Confirmar publicación'}
        message={isEdit
          ? '¿Deseas guardar los cambios de este reporte? Revisa los datos antes de continuar.'
          : '¿Deseas publicar este reporte? Revisa los datos antes de continuar.'}
        onConfirm={confirmSubmit}
        onCancel={() => setSubmitConfirmVisible(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 4,
  },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  textArea: { minHeight: 104, textAlignVertical: 'top', paddingTop: 14 },
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
  customSpeciesBox: { marginTop: 12, gap: 10 },
  customSpeciesInput: { width: '100%' },
  customSpeciesButton: { alignSelf: 'flex-start', minWidth: 150 },
  confirmedSpecies: { marginTop: 8, color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  errorBanner: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  changeLink: { fontSize: 12, color: COLORS.secondary, marginTop: 4, textDecorationLine: 'underline' },
  detectingText: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  mapHint: { padding: 10, borderRadius: 14, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047' },
  mapHintText: { fontSize: 12, color: '#854d0e', fontWeight: '600' },
  submitButton: { marginTop: 20, width: '100%' },
});
