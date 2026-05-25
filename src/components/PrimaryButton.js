import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

export default function PrimaryButton({ title, onPress, variant = 'primary', style, textStyle, disabled = false }) {
  const isGhost = variant === 'ghost';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, isGhost && styles.ghost, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, isGhost && styles.ghostText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  ghost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.92 },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  ghostText: { color: COLORS.text }
});
