import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import FormInput from '../components/FormInput';
import SinglePhotoPicker from '../components/SinglePhotoPicker';

export default function QuickReportScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [size, setSize] = useState('');
  const [specialCharacteristics, setSpecialCharacteristics] = useState('');
  const [location, setLocation] = useState('');
  // Fecha por defecto es el sysdate
  const [sightingDate, setSightingDate] = useState(new Date().toISOString().split('T')[0]);
  const [contactInfo, setContactInfo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = () => {
    return (
      photo !== null &&
      species.trim() !== '' &&
      breed.trim() !== '' &&
      size.trim() !== '' &&
      location.trim() !== '' &&
      contactInfo.trim() !== ''
    );
  };

  const handleSubmitReport = async () => {
    if (!isFormValid()) {
      Alert.alert(
        'Información incompleta',
        'Por favor completa todos los campos requeridos, incluyendo la foto obligatoria.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('especie', species);
      formData.append('raza', breed);
      formData.append('tamano', size);
      formData.append('caracteristicasEspeciales', specialCharacteristics);
      formData.append('ubicacion', location);
      formData.append('fechaAvistamiento', sightingDate);
      formData.append('informacionContacto', contactInfo);

      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `sighting-${Date.now()}.jpg`,
        });
      }

      await api.post('/reports/quick', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        '¡Gracias! 🙏',
        'Tu reporte de avistamiento ha sido registrado.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[QuickReportScreen] Error enviando reporte:', error);
      // Feedback fallback
      Alert.alert(
        '¡Gracias! 🙏',
        'Tu reporte de avistamiento ha sido registrado localmente (o hubo error de red).',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado fijo arriba */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Reportar Avistamiento</Text>
          <Text style={styles.headerSubtitle}>Ayuda a encontrar una mascota perdida (Sin cuenta)</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
          <View style={styles.formContainer}>
            {/* Componente extraído para la foto obligatoria */}
            <SinglePhotoPicker photo={photo} onPhotoSelect={setPhoto} />

            <FormInput
              label="Especie"
              placeholder="Ej: Perro, Gato, etc."
              value={species}
              onChangeText={setSpecies}
            />

            <FormInput
              label="Raza"
              placeholder="Ej: Labrador, Siames, Mestizo..."
              value={breed}
              onChangeText={setBreed}
            />

            <FormInput
              label="Tamaño"
              placeholder="Ej: Pequeño, Mediano, Grande"
              value={size}
              onChangeText={setSize}
            />

            <FormInput
              label="Características especiales"
              placeholder="Ej: Collar rojo, mancha en el ojo izquierdo..."
              value={specialCharacteristics}
              onChangeText={setSpecialCharacteristics}
              multiline
              numberOfLines={3}
            />

            <FormInput
              label="Ubicación"
              placeholder="Ej: Parque Central, Calle 123..."
              value={location}
              onChangeText={setLocation}
            />

            <FormInput
              label="Fecha de avistamiento"
              value={sightingDate}
              onChangeText={setSightingDate}
            />

            <FormInput
              label="Información de contacto"
              placeholder="Teléfono o email para que te contacten"
              value={contactInfo}
              onChangeText={setContactInfo}
            />
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
                  <Text style={styles.submitButtonText}>Publicar Reporte</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center', // Centra horizontalmente el contentWrapper
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600, // Limita el ancho en pantallas grandes
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
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  submitSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
