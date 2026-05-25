import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { COLORS } from '../styles/theme';

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={[styles.buttonText, styles.cancelText]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
              <Text style={[styles.buttonText, styles.confirmText]}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 51, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4
  },
  accentBar: {
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignSelf: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center'
  },
  message: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
    textAlign: 'center'
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 14
  },
  cancelText: {
    color: COLORS.text
  },
  confirmText: {
    color: '#fff'
  }
});
