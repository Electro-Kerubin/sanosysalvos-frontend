import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

export default function ImagePickerInput({ images = [], onChange }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(f => ({
      uri: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
    }));
    onChange([...images, ...newImages]);
    e.target.value = '';
  };

  const remove = (index) => onChange(images.filter((_, i) => i !== index));

  return (
    <View style={styles.container}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Pressable onPress={() => inputRef.current?.click()} style={styles.addButton}>
        <Text style={styles.addIcon}>📷</Text>
        <Text style={styles.addText}>Agregar fotos</Text>
        <Text style={styles.addHint}>(el servicio de imágenes estará disponible próximamente)</Text>
      </Pressable>

      {images.length > 0 && (
        <View style={styles.grid}>
          {images.map((img, i) => (
            <View key={i} style={styles.thumbWrap}>
              <img
                src={img.uri}
                alt={img.name}
                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 18, display: 'block' }}
              />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Pendiente</Text>
              </View>
              <Pressable onPress={() => remove(i)} style={styles.removeBtn}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  addButton: {
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: '#faf7f1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 14,
    cursor: 'pointer',
  },
  addIcon: { fontSize: 22 },
  addText: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },
  addHint: { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  thumbWrap: { position: 'relative', width: 96 },
  badge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
