import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function SinglePhotoPicker({ photo, onPhotoSelect }) {
  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        onPhotoSelect(result.assets[0]);
      }
    } catch (error) {
      console.error('Error seleccionando foto:', error);
      Alert.alert('Error', 'No pudimos acceder a tu galería');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        onPhotoSelect(result.assets[0]);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No pudimos acceder a la cámara');
    }
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Foto del avistamiento (Obligatoria)</Text>
      {photo ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <TouchableOpacity
            style={styles.removePhotoBtn}
            onPress={() => onPhotoSelect(null)}
          >
            <Ionicons name="close-circle" size={32} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoButtonsGroup}>
          <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={28} color="#4A90E2" />
            <Text style={styles.photoButtonText}>Tomar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
            <Ionicons name="images" size={28} color="#4A90E2" />
            <Text style={styles.photoButtonText}>Seleccionar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 50,
  },
  photoButtonsGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
});
