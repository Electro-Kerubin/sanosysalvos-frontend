import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import socketManager from '../services/socketManager';
import api from '../api/api';

export default function RescueRoomScreen({ route, navigation }) {
  const { roomId, roomName } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [isConnecting, setIsConnecting] = useState(true);
  const [roomError, setRoomError] = useState(null);

  const scrollViewRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  useEffect(() => {
    initializeRoom();
    return () => cleanupRoom();
  }, [roomId]);

  useEffect(() => {
    if (isTrackingLocation && currentLocation) {
      startLocationTracking();
    }
    return () => stopLocationTracking();
  }, [isTrackingLocation, currentLocation]);

  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeRoom = async () => {
    try {
      setIsConnecting(true);
      setRoomError(null);

      const userResponse = await api.get('/auth/me');
      const userId = userResponse.data.id;

      await socketManager.connect(userId);

      const joinResponse = await socketManager.joinRescueRoom(roomId, {
        name: userResponse.data.name || 'Usuario',
        avatar: userResponse.data.avatar || null,
      });

      const history = await socketManager.getMessageHistory(roomId, 50);
      setMessages(history);

      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);

        await socketManager.shareLocation(
          location.latitude,
          location.longitude,
          location.accuracy
        );
        setIsTrackingLocation(true);
      }

      setupSocketListeners();

      setIsConnecting(false);
    } catch (error) {
      console.error('[RescueRoomScreen] Error inicializando sala:', error);
      setRoomError(error.message || 'Error al conectar con la sala');
      setIsConnecting(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permiso de ubicación denegado');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.error('[RescueRoomScreen] Error obteniendo ubicación:', error);
      setLocationError('No se pudo obtener la ubicación');
      return null;
    }
  };

  const startLocationTracking = () => {
    try {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }

      locationSubscriptionRef.current = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 20,
        },
        async (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          };

          setCurrentLocation(newLocation);

          try {
            await socketManager.shareLocation(
              newLocation.latitude,
              newLocation.longitude,
              newLocation.accuracy
            );
          } catch (error) {
            console.error('[RescueRoomScreen] Error compartiendo ubicación:', error);
          }
        }
      );
    } catch (error) {
      console.error('[RescueRoomScreen] Error iniciando tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  };

  const setupSocketListeners = () => {

    socketManager.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketManager.on('user_joined', (data) => {
      Alert.alert('Nuevo participante', `${data.userData.name} se unió a la sala`);

      loadParticipants();
    });

    socketManager.on('user_left', (data) => {
      setParticipants((prev) =>
        prev.filter((p) => p.userId !== data.userId)
      );
    });

    socketManager.on('location_update', (data) => {
      setParticipants((prev) => {
        const index = prev.findIndex((p) => p.userId === data.userId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            latitude: data.latitude,
            longitude: data.longitude,
            lastLocationUpdate: data.timestamp,
          };
          return updated;
        }
        return prev;
      });
    });
  };

  const loadParticipants = async () => {
    try {
      const response = await api.get(`/rescue-rooms/${roomId}/participants`);
      setParticipants(response.data);
    } catch (error) {
      console.error('[RescueRoomScreen] Error cargando participantes:', error);
    }
  };

  const handleSendMessage = async () => {
    const trimmedText = messageInput.trim();
    if (!trimmedText) return;

    try {
      setIsSendingMessage(true);
      await socketManager.sendMessage(trimmedText);
      setMessageInput('');
    } catch (error) {
      console.error('[RescueRoomScreen] Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getParticipantsInRadius = () => {
    if (!currentLocation) return [];
    return participants.filter((p) => {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        p.latitude,
        p.longitude
      );
      return distance <= 5;
    });
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.isOwn && styles.messageContainerOwn,
      ]}
    >
      {!item.isOwn && (
        <View style={styles.messageAvatar}>
          {item.avatar ? (
            <Image
              source={{ uri: item.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#999" />
            </View>
          )}
        </View>
      )}

      <View style={[styles.messageBubble, item.isOwn && styles.messageBubbleOwn]}>
        {!item.isOwn && (
          <Text style={styles.messageSender}>{item.senderName}</Text>
        )}
        <Text style={[styles.messageText, item.isOwn && styles.messageTextOwn]}>
          {item.text}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  if (roomError) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{roomError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isConnecting) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Conectando a la sala...</Text>
      </View>
    );
  }

  const participantsInRadius = getParticipantsInRadius();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{roomName}</Text>
          <Text style={styles.headerSubtitle}>
            {participantsInRadius.length} rescatistas activos
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.locationToggle, isTrackingLocation && styles.locationToggleActive]}
          onPress={() => setIsTrackingLocation(!isTrackingLocation)}
        >
          <Ionicons
            name="location"
            size={20}
            color={isTrackingLocation ? '#fff' : '#4A90E2'}
          />
        </TouchableOpacity>
      </View>

      {/* Minimapa (Simplificado - muestra solo participantes) */}
      <View style={styles.minimapContainer}>
        <View style={styles.minimap}>
          <Text style={styles.minimapLabel}>
            Radius: 5km | Participantes: {participantsInRadius.length}
          </Text>

          {currentLocation ? (
            <ScrollView
              style={styles.participantsList}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.participantsTitle}>En tu zona (5km):</Text>
              {participantsInRadius.map((p) => {
                const distance = calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  p.latitude,
                  p.longitude
                );

                return (
                  <View key={p.userId} style={styles.participantItem}>
                    <View style={styles.participantDot} />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{p.name}</Text>
                      <Text style={styles.participantDistance}>
                        A {distance.toFixed(2)} km
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.minimapPlaceholder}>
              Ubicación no disponible
            </Text>
          )}
        </View>
      </View>

      <View style={styles.chatWrapper}>
        {/* Chat */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          scrollEnabled={true}
          onEndReachedThreshold={0.1}
        />

        {/* Input de mensajes */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={messageInput}
            onChangeText={setMessageInput}
            placeholderTextColor="#999"
            editable={!isSendingMessage}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageInput.trim() || isSendingMessage) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {locationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color="#FF6B6B" />
          <Text style={styles.errorBannerText}>{locationError}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  locationToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationToggleActive: {
    backgroundColor: '#4A90E2',
  },
  minimapContainer: {
    height: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  minimap: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  minimapLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  participantsList: {
    flex: 1,
  },
  participantsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  participantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  participantDistance: {
    fontSize: 10,
    color: '#999',
  },
  minimapPlaceholder: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  chatWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: '#4A90E2',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: '#f5f5f5',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#FF6B6B',
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
