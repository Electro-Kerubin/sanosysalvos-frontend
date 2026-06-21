import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/api';
import socketManager from '../services/socketManager';

export default function InboxScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768; // Diseño dividido tipo WhatsApp Web para pantallas anchas

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef(null);
  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    loadChats();
    setupSocket();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const setupSocket = async () => {
    try {
      const me = await api.get('/auth/me');
      if (socketManager.isReady() || me.data?.id) {
        await socketManager.connect(me.data.id);
        socketManager.on('new_private_message', (msg) => {
          setMessages((prev) => [...prev, msg]);
          loadChats(); // Actualiza el último mensaje en la lista
        });
      }
    } catch (e) {
      console.warn('WebSocket fallback offline');
    }
  };

  const loadChats = async () => {
    try {
      // El backend debe proveer este endpoint devolviendo el listado de chats del usuario
      const response = await api.get('/chats');
      setChats(response.data || []);
    } catch (error) {
      console.error('Error cargando chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/chats/${chatId}/messages`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (type = 'text', payload = null) => {
    const text = messageInput.trim();
    if (type === 'text' && !text) return;

    try {
      setSending(true);
      let response;

      if (type === 'text') {
        response = await api.post(`/chats/${activeChatId}/messages`, { text });
      } else if (type === 'photo') {
        const formData = new FormData();
        formData.append('photo', {
          uri: payload.uri,
          type: 'image/jpeg',
          name: `chat-img-${Date.now()}.jpg`,
        });
        response = await api.post(`/chats/${activeChatId}/messages/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (type === 'location') {
        response = await api.post(`/chats/${activeChatId}/messages`, {
          text: '📍 Ubicación compartida',
          latitude: payload.latitude,
          longitude: payload.longitude,
        });
      }

      setMessages((prev) => [...prev, response.data]);
      setMessageInput('');
      loadChats(); // Para refrescar el último mensaje en el panel izquierdo
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled) {
        handleSendMessage('photo', result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder a la galería');
    }
  };

  const shareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permiso denegado', 'Se requiere acceso a la ubicación.');
      }
      const location = await Location.getCurrentPositionAsync({});
      handleSendMessage('location', location.coords);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  // Reglas de negocio para Nombres de Chat y Archivo
  const getChatTitle = (chat) => {
    if (!chat) return '';
    const petName = chat.report?.petName || 'Mascota';
    if (chat.isOwner) {
      // Si el usuario es el publicador del reporte
      return `${petName} - ${chat.otherUser?.name || 'Usuario'}`;
    } else {
      // Si el usuario es quien le habló al publicador
      return `${petName} - ${chat.report?.ownerName || 'Dueño'}`;
    }
  };

  const isChatArchived = (chat) => {
    if (!chat) return false;
    const status = (chat.report?.status || '').toLowerCase();
    return status === 'encontrado' || status === 'completado';
  };

  const renderChatItem = ({ item }) => {
    const isArchived = isChatArchived(item);
    const isActive = activeChatId === item.id;

    return (
      <TouchableOpacity
        style={[styles.chatListItem, isActive && styles.chatListItemActive]}
        onPress={() => setActiveChatId(item.id)}
      >
        <View style={styles.chatListAvatar}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
        <View style={styles.chatListContent}>
          <Text style={styles.chatListTitle} numberOfLines={1}>
            {getChatTitle(item)}
          </Text>
          <Text style={styles.chatListPreview} numberOfLines={1}>
            {item.lastMessage || 'Sin mensajes'}
          </Text>
        </View>
        {isArchived && (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>Archivado</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageWrapper, item.isOwn ? styles.messageOwn : styles.messageOther]}>
      <View style={[styles.messageBubble, item.isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
        )}
        {item.latitude && item.longitude && (
          <View style={styles.locationWrapper}>
            <Ionicons name="location" size={32} color={item.isOwn ? '#fff' : '#FF6B6B'} />
            <Text style={[styles.locationText, item.isOwn && { color: '#fff' }]}>Ubicación compartida</Text>
          </View>
        )}
        {item.text && (
          <Text style={[styles.messageText, item.isOwn && styles.messageTextOwn]}>{item.text}</Text>
        )}
        <Text style={[styles.messageTime, item.isOwn && { color: '#e0e0e0' }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  // Layout dinámico
  const showLeftPanel = isWide || !activeChatId;
  const showRightPanel = isWide || activeChatId;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Cabecera general de la vista (simula Navbar) */}
      <View style={styles.topNavbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Mensajes</Text>
      </View>

      <View style={styles.splitContainer}>
        {/* PANEL IZQUIERDO: LISTA DE CHATS */}
        {showLeftPanel && (
          <View style={[styles.leftPanel, !isWide && { flex: 1 }]}>
            <View style={styles.leftPanelHeader}>
              <Text style={styles.panelTitle}>Mis Chats</Text>
            </View>
            {loadingChats ? (
              <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={chats}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderChatItem}
                ListEmptyComponent={<Text style={styles.emptyText}>No tienes conversaciones activas.</Text>}
              />
            )}
          </View>
        )}

        {/* PANEL DERECHO: CHAT ACTIVO */}
        {showRightPanel && (
          <View style={[styles.rightPanel, !isWide && { flex: 1 }]}>
            {activeChatId && activeChat ? (
              <>
                <View style={styles.chatHeader}>
                  {!isWide && (
                    <TouchableOpacity onPress={() => setActiveChatId(null)} style={styles.mobileBackBtn}>
                      <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.chatHeaderAvatar}>
                    <Ionicons name="person" size={20} color="#666" />
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatHeaderTitle}>{getChatTitle(activeChat)}</Text>
                    {isChatArchived(activeChat) ? (
                      <Text style={styles.chatHeaderSubtitleArchived}>Reporte concluido</Text>
                    ) : (
                      <Text style={styles.chatHeaderSubtitle}>En curso</Text>
                    )}
                  </View>
                </View>

                <View style={styles.chatFeed}>
                  {loadingMessages ? (
                    <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
                  ) : (
                    <FlatList
                      ref={scrollViewRef}
                      data={messages}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={renderMessage}
                      contentContainerStyle={styles.messagesList}
                    />
                  )}
                </View>

                {/* Input Area */}
                {isChatArchived(activeChat) ? (
                  <View style={styles.archivedBanner}>
                    <Ionicons name="lock-closed" size={18} color="#999" />
                    <Text style={styles.archivedBannerText}>
                      Este chat ha sido archivado porque el reporte se marcó como resuelto.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inputSection}>
                    <TouchableOpacity style={styles.actionIconButton} onPress={pickImage}>
                      <Ionicons name="camera-outline" size={24} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconButton} onPress={shareLocation}>
                      <Ionicons name="location-outline" size={24} color="#666" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Escribe un mensaje..."
                      value={messageInput}
                      onChangeText={setMessageInput}
                      multiline
                      editable={!sending}
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, (!messageInput.trim() || sending) && { opacity: 0.5 }]}
                      onPress={() => handleSendMessage('text')}
                      disabled={!messageInput.trim() || sending}
                    >
                      {sending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Image source={require('../../assets/images/index.png')} style={styles.placeholderImage} resizeMode="contain" />
                <Text style={styles.placeholderText}>Sanos y Salvos Web</Text>
                <Text style={styles.placeholderSub}>Selecciona un chat para comenzar a enviar mensajes.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  topNavbar: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  backButton: { marginRight: 16, padding: 4 },
  topNavTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  // PANEL IZQUIERDO
  leftPanel: {
    width: 350,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  leftPanelHeader: {
    height: 65,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  panelTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontSize: 14 },
  chatListItem: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  chatListItemActive: { backgroundColor: '#ebebeb' },
  chatListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatListContent: { flex: 1 },
  chatListTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  chatListPreview: { fontSize: 13, color: '#888' },
  archivedBadge: {
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
  },
  archivedBadgeText: { fontSize: 10, color: '#666', fontWeight: 'bold' },

  // PANEL DERECHO
  rightPanel: { flex: 1, backgroundColor: '#efeae2' }, // Fondo similar a WSP
  chatHeader: {
    height: 65,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  mobileBackBtn: { marginRight: 12 },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  chatHeaderSubtitle: { fontSize: 12, color: '#4CAF50' },
  chatHeaderSubtitleArchived: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  
  chatFeed: { flex: 1, backgroundColor: 'transparent' },
  messagesList: { padding: 16, paddingBottom: 24 },
  messageWrapper: { marginBottom: 12, width: '100%', flexDirection: 'row' },
  messageOwn: { justifyContent: 'flex-end' },
  messageOther: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleOwn: { backgroundColor: '#4A90E2', borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 14, color: '#333', lineHeight: 20 },
  messageTextOwn: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },
  messageImage: { width: 220, height: 220, borderRadius: 8, marginBottom: 8 },
  locationWrapper: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  locationText: { fontSize: 13, color: '#666', marginTop: 4, fontWeight: '600' },

  // INPUT
  inputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#f0f0f0',
  },
  actionIconButton: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    gap: 8,
  },
  archivedBannerText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  
  // PLACEHOLDER NO CHAT
  placeholderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' },
  placeholderImage: { width: 200, height: 200, opacity: 0.6 },
  placeholderText: { fontSize: 24, color: '#666', fontWeight: 'bold', marginTop: 16 },
  placeholderSub: { fontSize: 14, color: '#999', marginTop: 8 },
});