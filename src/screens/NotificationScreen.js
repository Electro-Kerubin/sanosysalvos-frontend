import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenShell from '../components/ScreenShell';
import { COLORS } from '../styles/theme';
import api from '../api/api';

const NOTIFICATIONS_SEEN_SNAPSHOT_KEY = 'matchingNotificationsSeenSnapshot';

function getMyReportIds() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('myReportIds') : null;
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function buildSnapshot(items) {
  return JSON.stringify(items.map(item => [item.reportId, item.count, item.title, item.message]));
}

function normalizeMatchItem(reportId, item, index) {
  if (item == null) {
    return {
      id: `${reportId}-${index}`,
      reportId,
      title: `Coincidencia en reporte #${reportId}`,
      message: 'El motor detectó una coincidencia nueva.',
    };
  }

  if (typeof item === 'string') {
    return {
      id: `${reportId}-${index}`,
      reportId,
      title: `Coincidencia en reporte #${reportId}`,
      message: item,
    };
  }

  const title = item.nombreMascota || item.nombreReporte || item.titulo || `Coincidencia en reporte #${reportId}`;
  const score = item.puntaje ?? item.score ?? item.similitud ?? item.matchScore ?? null;
  const place = item.direccion || item.ubicacion || item.comuna || item.nombreComuna || '';
  const reason = item.descripcion || item.mensaje || item.detalle || item.reason || '';
  const extra = [score != null ? `Coincidencia ${score}` : '', place, reason].filter(Boolean).join(' · ');

  return {
    id: `${reportId}-${item.id || item.idSolicitud || item.idCoincidencia || index}`,
    reportId,
    title,
    message: extra || 'El motor de coincidencias encontró un resultado nuevo.',
  };
}

function buildNotificationItems(reportId, matches) {
  const list = Array.isArray(matches) ? matches : (matches?.items || matches?.content || []);
  return list.map((item, index) => normalizeMatchItem(reportId, item, index));
}

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      setError(null);

      const myReportIds = getMyReportIds();
      if (!myReportIds.length) {
        setNotifications([]);
        setLoading(false);
        AsyncStorage.setItem(NOTIFICATIONS_SEEN_SNAPSHOT_KEY, JSON.stringify([])).catch(() => {});
        return () => { mounted = false; };
      }

      Promise.all(
        myReportIds.map(async reportId => {
          try {
            const res = await api.getCoincidenciasPorReporte(reportId);
            return { reportId, matches: res?.data };
          } catch (_) {
            return { reportId, matches: [] };
          }
        })
      )
        .then(async (results) => {
          if (!mounted) return;
          const items = results.flatMap(({ reportId, matches }) => buildNotificationItems(reportId, matches));
          const sorted = items.sort((a, b) => Number(b.reportId) - Number(a.reportId));
          setNotifications(sorted);
          await AsyncStorage.setItem(NOTIFICATIONS_SEEN_SNAPSHOT_KEY, buildSnapshot(sorted));
        })
        .catch((err) => {
          if (!mounted) return;
          setError(err?.response?.data?.message || err?.message || 'No se pudieron cargar las notificaciones.');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => { mounted = false; };
    }, [])
  );

  return (
    <ScreenShell title="Notificaciones" subtitle="Actividad reciente del motor de coincidencias" scroll>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </Pressable>
      </View>
      <View style={styles.list}>
        {loading ? <Text style={styles.stateText}>Cargando notificaciones...</Text> : null}
        {error && !loading ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error && notifications.length === 0 ? <Text style={styles.stateText}>No hay coincidencias nuevas por ahora.</Text> : null}
        {notifications.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('ReportDetail', { reportId: item.reportId })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.dot} />
              <Text style={styles.title}>{item.title}</Text>
            </View>
            <Text style={styles.text}>{item.message}</Text>
            <Text style={styles.linkText}>Ver detalle del reporte</Text>
          </Pressable>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 18,
    right: 20,
    zIndex: 10
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
  list: { gap: 12, marginTop: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#ef4444'
  },
  title: { color: COLORS.text, fontWeight: '800', flex: 1 },
  text: { color: COLORS.text, lineHeight: 21 },
  linkText: { color: COLORS.secondary, fontSize: 12, fontWeight: '700', marginTop: 10 },
  stateText: { color: COLORS.muted, fontSize: 14 },
  errorText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' }
});