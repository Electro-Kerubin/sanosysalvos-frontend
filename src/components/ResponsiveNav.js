import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

const links = [
  { key: 'PublishReport', label: 'Publicar reporte', icon: 'document-text-outline' },
  { key: 'Notifications', label: 'Notificaciones', icon: 'notifications-outline' },
  { key: 'Profile', label: 'Perfil', icon: 'person-outline' },
  { key: 'Logout', label: 'Cerrar sesión', icon: 'log-out-outline' }
];

export default function ResponsiveNav({ navigation, openMenu, onLogout, notificationBadgeCount = 0 }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 760;

  if (isMobile) {
    return (
      <Pressable onPress={openMenu} style={styles.mobileButton}>
        <View style={styles.iconWrap}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
          {notificationBadgeCount > 0 && <View style={styles.badgeDot}><Text style={styles.badgeText}>{notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}</Text></View>}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.navRow}>
      {links.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => (item.key === 'Logout' ? onLogout?.() : navigation.navigate(item.key))}
          style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={18} color={COLORS.text} />
            {item.key === 'Notifications' && notificationBadgeCount > 0 && <View style={styles.badgeDot}><Text style={styles.badgeText}>{notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}</Text></View>}
          </View>
          <Text style={styles.navText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  navItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  navText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badgeDot: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 10 },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }] }
});
