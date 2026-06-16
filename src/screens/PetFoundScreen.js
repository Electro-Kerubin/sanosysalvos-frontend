import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function PetFoundScreen({ route, navigation }) {
  const { petId } = route.params || {};

  const [petData, setPetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);

  useEffect(() => {
    loadPetData();
  }, [petId]);

  const loadPetData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/pets/public/${petId}`);
      setPetData(response.data);
    } catch (err) {
      console.error('[PetFoundScreen] Error cargando mascota:', err);
      setError('No se encontró la mascota. Verifica el código QR.');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted' ? 'granted' : 'denied');
      return status === 'granted';
    } catch (error) {
      console.error('[PetFoundScreen] Error solicitando permiso de ubicación:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PetFoundScreen] Error obteniendo ubicación:', error);
      throw error;
    }
  };

  const handleSendLocation = async () => {
    try {
      let hasPermission = locationPermission === 'granted';
      if (!hasPermission) {
        hasPermission = await requestLocationPermission();
      }

      if (!hasPermission) {
        Alert.alert(
          'Permiso denegado',
          'Necesitamos acceso a tu ubicación para notificar al dueño dónde se encuentra la mascota.'
        );
        return;
      }

      setSendingLocation(true);
      const location = await getCurrentLocation();
      await api.post(`/pets/${petId}/found-location`, {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        reportedByPhone: null,
      });

      Alert.alert(
        'Ubicación enviada',
        'El dueño ha sido notificado con tu ubicación. ¡Gracias por tu ayuda!'
      );
    } catch (error) {
      console.error('[PetFoundScreen] Error enviando ubicación:', error);
      Alert.alert('Error', 'No pudimos enviar tu ubicación. Intenta nuevamente.');
    } finally {
      setSendingLocation(false);
    }
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      </View>
    );
  }

  if (error || !petData) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || 'Mascota no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPetData}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>¡Mascota Encontrada! 🐾</Text>
          <Text style={styles.headerSubtitle}>Ayuda a devolver a casa</Text>
        </View>
        <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
      </View>

      <View style={styles.petCard}>
        {petData.photo && (
          <Image
            source={{ uri: petData.photo }}
            style={styles.petImage}
          />
        )}

        <View style={styles.petInfo}>
          <Text style={styles.petName}>{petData.name || 'Mascota'}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="paw" size={16} color="#666" />
            <Text style={styles.infoText}>
              {petData.species} • {petData.breed}
            </Text>
          </View>
          {petData.color && (
            <View style={styles.infoRow}>
              <Ionicons name="color-palette" size={16} color="#666" />
              <Text style={styles.infoText}>{petData.color}</Text>
            </View>
          )}
          {petData.identifyingMarks && (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={16} color="#666" />
              <Text style={styles.infoText}>{petData.identifyingMarks}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.ownerCard}>
        <View style={styles.ownerHeader}>
          <Ionicons name="person-circle" size={40} color="#4A90E2" />
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{petData.ownerName || 'Dueño'}</Text>
            <Text style={styles.ownerPhone}>{petData.ownerPhone}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callBtn]}
            onPress={() => Linking.openURL(`tel:${petData.ownerPhone}`)}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Llamar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Ayuda adicional</Text>
        <TouchableOpacity
          style={[styles.sendLocationBtn, sendingLocation && styles.sendLocationBtnDisabled]}
          onPress={handleSendLocation}
          disabled={sendingLocation}
        >
          {sendingLocation ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.sendLocationText}>Enviar mi ubicación</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.locationHint}>
          Compartiendo tu ubicación, el dueño sabrá exactamente dónde está su mascota
        </Text>
      </View>

      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
        <Text style={styles.securityText}>
          Tu privacidad está protegida. Solo se compartirá la ubicación que proporcionas.
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  petCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  petImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  petInfo: {
    padding: 16,
  },
  petName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  ownerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ownerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ownerPhone: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  callBtn: {
    backgroundColor: '#4A90E2',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sendLocationBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    marginBottom: 12,
  },
  sendLocationBtnDisabled: {
    opacity: 0.6,
  },
  sendLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  securityInfo: {
    marginHorizontal: 16,
    marginTop: 20,
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    alignItems: 'flex-start',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
});
