import React from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

export default function ReportCard({ report, onPress, compact = false }) {
  const first = report.media && report.media.length ? report.media[0] : null;
  const imageSource = typeof first === 'string' ? { uri: first } : first || require('../../assets/images/index.png');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, compact && styles.compact]}>
      <View style={[styles.imageWrap, report.status === 'Encontrado' ? styles.imageFound : styles.imageSearching]}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        <View style={styles.imageTag}>
          <Ionicons name={report.status === 'Encontrado' ? 'checkmark-circle' : 'search'} size={12} color="#fff" />
          <Text style={styles.imageTagText}>{report.status}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{report.name}</Text>
          <View style={[styles.statusPill, report.status === 'Encontrado' ? styles.found : styles.searching]}>
            <Text style={styles.statusText}>{report.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>{report.species} · {report.breed}</Text>
        <Text style={styles.desc}>{(report.description || '').slice(0, 78)}{(report.description || '').length > 78 ? '...' : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1
  },
  compact: { marginBottom: 14 },
  pressed: { opacity: 0.95, transform: [{ scale: 0.995 }] },
  imageWrap: { width: 118, minHeight: 118, backgroundColor: COLORS.soft, padding: 8, justifyContent: 'center' },
  imageFound: { backgroundColor: '#ecfdf3' },
  imageSearching: { backgroundColor: '#fef2f2' },
  image: { width: '100%', height: 102, borderRadius: 18, backgroundColor: COLORS.soft },
  imageTag: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 32, 51, 0.78)'
  },
  imageTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '900', color: COLORS.text, flex: 1, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 6, lineHeight: 16 },
  desc: { fontSize: 13, color: COLORS.text, marginTop: 8, lineHeight: 19 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  found: { backgroundColor: '#dcfce7' },
  searching: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '800', color: COLORS.text }
});
