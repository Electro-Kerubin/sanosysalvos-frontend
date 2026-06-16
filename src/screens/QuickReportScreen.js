import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/api';

export default function QuickReportScreen({ navigation }) {

  const [photo, setPhoto] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [petType, setPetType] = useState('dog');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const petTypes = [
    { id: 'dog', label: 'Perro 🐕', icon: 'paw' },
    { id: 'cat', label: 'Gato 🐈', icon: 'paw' },
    { id: 'other', label: 'Otro 🐾', icon: 'paw' },
  ];

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('[QuickReportScreen] Error seleccionando foto:', error);
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
        setPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('[QuickReportScreen] Error tomando foto:', error);
      Alert.alert('Error', 'No pudimos acceder a la cámara');
    }
  };

  const isPhoneValid = () => {

    const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
    return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  };

  const isFormValid = () => {
    return (isPhoneValid() || description.trim().length > 10);
  };

  const handleSubmitReport = async () => {
    try {
      if (!isFormValid()) {
        Alert.alert(
          'Información incompleta',
          'Por favor proporciona un teléfono o descripción detallada'
        );
        return;
      }

      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('petType', petType);
      formData.append('phoneNumber', phoneNumber);
      formData.append('description', description);
      formData.append('latitude', null);
      formData.append('longitude', null);

      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `sighting-${Date.now()}.jpg`,
        });
      }

      const response = await api.post('/reports/quick', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        '¡Gracias! 🙏',
        'Tu reporte ha sido registrado. La comunidad ha sido notificada.',
        [
          {
            text: 'OK',
            onPress: () => {

              setPhoto(null);
              setPhoneNumber('');
              setDescription('');

              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[QuickReportScreen] Error enviando reporte:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'No pudimos registrar tu reporte. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Reportar Avistamiento</Text>
          <Text style={styles.headerSubtitle}>Ayuda a encontrar mascotas perdidas</Text>
        </View>
      </View>

      {/* SECCIÓN 1: Foto (Opcional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto de la mascota (opcional)</Text>

        {photo ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setPhoto(null)}
            >
              <Ionicons name="close-circle" size={32} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtonsGroup}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={28} color="#4A90E2" />
              <Text style={styles.photoButtonText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePickPhoto}
            >
              <Ionicons name="images" size={28} color="#4A90E2" />
              <Text style={styles.photoButtonText}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SECCIÓN 2: Tipo de Mascota */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué tipo de mascota viste?</Text>

        <View style={styles.petTypeGrid}>
          {petTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.petTypeButton,
                petType === type.id && styles.petTypeButtonActive,
              ]}
              onPress={() => setPetType(type.id)}
            >
              <Ionicons
                name={type.icon}
                size={24}
                color={petType === type.id ? '#fff' : '#4A90E2'}
              />
              <Text
                style={[
                  styles.petTypeLabel,
                  petType === type.id && styles.petTypeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SECCIÓN 3: Contacto */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tu número de contacto</Text>
        <Text style={styles.sectionHint}>
          Para que el dueño pueda contactarte (opcional pero recomendado)
        </Text>

        <TextInput
          style={[
            styles.input,
            phoneNumber && !isPhoneValid() && styles.inputError,
          ]}
          placeholder="(123) 456-7890 o +12345678901"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholderTextColor="#999"
        />

        {phoneNumber && !isPhoneValid() && (
          <Text style={styles.errorMessage}>
            Formato de teléfono no válido
          </Text>
        )}
      </View>

      {/* SECCIÓN 4: Descripción */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descripción del avistamiento</Text>
        <Text style={styles.sectionHint}>
          Dónde la viste, colores, marcas especiales, etc.
        </Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Perro blanco y café, cerca del parque central, alrededor de las 3 PM..."
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          placeholderTextColor="#999"
          textAlignVertical="top"
        />

        <Text style={styles.charCount}>
          {description.length} caracteres
        </Text>
      </View>

      {/* Botón de envío */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid() && styles.submitButtonDisabled,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReport}
          disabled={!isFormValid() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enviar Reporte</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.submitHint}>
          Tu reporte ayudará a la comunidad a encontrar a esta mascota
        </Text>
      </View>

      {/* Info sobre privacidad */}
      <View style={styles.privacyInfo}>
        <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
        <Text style={styles.privacyText}>
          No compartimos tu información personal. Solo los rescatistas verificados podrán
          contactarte.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    lineHeight: 16,
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
  petTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  petTypeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  petTypeButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  petTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  petTypeLabelActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  textArea: {
    paddingVertical: 12,
    minHeight: 100,
  },
  errorMessage: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  submitSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  privacyInfo: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },
});
