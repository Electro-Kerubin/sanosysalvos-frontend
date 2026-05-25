import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { COLORS } from '../styles/theme';

export default function ScreenShell({ title, subtitle, children, padded = true, scroll = true, topSpace = false, logo = false }) {
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.container, padded && styles.padded] }
    : { style: [styles.flex, padded && styles.padded] };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Container {...containerProps}>
        {topSpace ? <View style={styles.logoSpace} /> : null}
        {(logo || title || subtitle) ? (
          <View style={styles.brandHeader}>
            {logo ? (
              <View style={styles.logoBadge}>
                <Image source={require('../../assets/logo/logo.svg')} style={styles.logoMark} resizeMode="contain" />
              </View>
            ) : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {padded ? <View style={styles.inner}>{children}</View> : children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, position: 'relative' },
  flex: { flex: 1 },
  container: { flexGrow: 1, minHeight: '100%' },
  padded: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  logoSpace: { height: 72 },
  brandHeader: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 18,
    gap: 8
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: COLORS.soft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 14
  },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.text, textAlign: 'center', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, maxWidth: 360 },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245, 158, 11, 0.08)'
  },
  glowBottom: {
    position: 'absolute',
    left: -70,
    bottom: 60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(15, 118, 110, 0.06)'
  }
});