import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';

function getTokenPayload() {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null;
    if (!token) return {};
    return JSON.parse(atob(token.split('.')[1]));
  } catch (_) { return {}; }
}

function loadSavedProfile() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('profile') : null;
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

async function loadProfileAsync() {
  try {
    const raw = await AsyncStorage.getItem('profile');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

async function saveProfile(data) {
  try {
    await AsyncStorage.setItem('profile', JSON.stringify(data));
    if (typeof window !== 'undefined') window.localStorage?.setItem('profile', JSON.stringify(data));
  } catch (_) {}
}

const INPUT_STYLE = {
  minHeight: 52,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.surface,
  paddingHorizontal: 16,
  color: COLORS.text,
  fontSize: 15,
};

export default function ProfileScreen({ navigation }) {
  const tokenPayload = useMemo(() => getTokenPayload(), []);
  const savedProfile = useMemo(() => loadSavedProfile(), []);

  const email = tokenPayload.sub || tokenPayload.email || savedProfile.email || '';
  const initialName = savedProfile.name || tokenPayload.nombre || tokenPayload.name || '';
  const initialPhone = savedProfile.phone || '';

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saved, setSaved] = useState(false);
  const phoneRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    loadProfileAsync().then((asyncProfile) => {
      if (!mounted) return;
      const profile = { ...savedProfile, ...asyncProfile };
      if (profile.email) {
        // Mantener coherencia si el login ya dejó correo/nombre en AsyncStorage.
      }
      setName(profile.name || tokenPayload.nombre || tokenPayload.name || '');
      setPhone(profile.phone || '');
    });
    return () => { mounted = false; };
  }, [savedProfile, tokenPayload.nombre, tokenPayload.name]);

  const handleSave = async () => {
    const updated = { name: name.trim(), phone: phone.trim(), email };
    await saveProfile(updated);
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCancel = () => {
    setName(initialName);
    setPhone(initialPhone);
    setEditMode(false);
  };

  return (
    <ScreenShell title="Perfil" subtitle="Tus datos de contacto enlazados a los reportes" scroll>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      {saved && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Perfil guardado correctamente.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos visibles para contacto</Text>
        <Text style={styles.label}>Correo electrónico</Text>
        <Text style={styles.value}>{email || '—'}</Text>

        <Text style={styles.label}>Nombre</Text>
        {editMode ? (
          <TextInput
            style={INPUT_STYLE}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre completo"
            placeholderTextColor={COLORS.muted}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
        ) : (
          <Text style={styles.value}>{name || '—'}</Text>
        )}

        <Text style={styles.label}>Teléfono</Text>
        {editMode ? (
          <TextInput
            ref={phoneRef}
            style={INPUT_STYLE}
            value={phone}
            onChangeText={setPhone}
            placeholder="Ej: 912345678"
            placeholderTextColor={COLORS.muted}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        ) : (
          <Text style={styles.value}>{phone || '—'}</Text>
        )}
      </View>

      {editMode ? (
        <View style={styles.editActions}>
          <PrimaryButton title="Guardar" onPress={handleSave} style={styles.saveBtn} />
          <PrimaryButton title="Cancelar" variant="ghost" onPress={handleCancel} style={styles.cancelBtn} />
        </View>
      ) : (
        <PrimaryButton title="Editar perfil" variant="ghost" onPress={() => setEditMode(true)} style={styles.editBtn} />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 18, right: 20, zIndex: 10 },
  backButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  successBanner: {
    marginTop: 16, padding: 12, borderRadius: 14,
    backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac'
  },
  successText: { color: '#166534', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 30, padding: 18, marginTop: 20, gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  label: { color: COLORS.muted, fontSize: 12, marginTop: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveBtn: { flex: 1 },
  cancelBtn: { flex: 1 },
  editBtn: { marginTop: 16 },
});
