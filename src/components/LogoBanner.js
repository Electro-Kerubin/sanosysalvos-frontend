import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../styles/theme';

export default function LogoBanner({ compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <View style={styles.logoBadge}>
        <Image source={require('../../assets/logo/logo.svg')} style={styles.logo} resizeMode="contain" />
      </View>
      <View>
        <Text style={styles.brand}>Sanos y Salvos</Text>
        <Text style={styles.tag}>Encuentra a tu amigo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  compactWrap: { alignSelf: 'flex-start' },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  logo: { width: 24, height: 24 },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.text, letterSpacing: -0.2 },
  tag: { fontSize: 12, color: COLORS.muted, marginTop: 2 }
});