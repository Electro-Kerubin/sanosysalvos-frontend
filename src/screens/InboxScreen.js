import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function InboxScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [error, setError] = useState(null);

  const scrollViewRef = useRef(null);
  const pollingRef = useRef(null);
  const activeChat = chats.find(c => String(c.idConversacion) === String(activeChatId));

  // ── Cargar conversaciones ─────────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/conversaciones');
      setChats(res.data || []);
    } catch (err) {
      console.warn('Error cargando chats:', err?.message);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // ── Cargar mensajes ───────────────────────────────────────────
  const loadMessages = useCallback(async (chatId, showLoader = false) => {
    if (!chatId) return;
    if (showLoader) setLoadingMessages(true);
    try {
      const res = await api.get(`/api/chat/conversaciones/${chatId}/mensajes`);
      setMessages(res.data || []);
    } catch (err) {
      console.warn('Error cargando mensajes:', err?.message);
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  }, []);

  // ── Scroll al último mensaje ──────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── Carga inicial de chats ────────────────────────────────────
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── Polling cada 3 segundos cuando hay chat activo ────────────
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    if (!activeChatId) {
      setMessages([]);
      return;
    }

    loadMessages(activeChatId, true);

    pollingRef.current = setInterval(() => {
      loadMessages(activeChatId, false);
      loadChats();
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [activeChatId, loadMessages, loadChats]);

  // ── Enviar mensaje ────────────────────────────────────────────
  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !activeChatId) return;
    setSending(true);
    try {
      const res = await api.post(`/api/chat/conversaciones/${activeChatId}/mensajes`, {
        contenido: text,
      });
      setMessages(prev => [...prev, res.data]);
      setMessageInput('');
      loadChats();
    } catch (err) {
      setError('No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  // ── Crear nueva conversación ──────────────────────────────────
  const handleNewChat = async () => {
    const email = newChatEmail.trim();
    if (!email) return;
    try {
      const res = await api.post('/api/chat/conversaciones', { emailOtroUsuario: email });
      setNewChatEmail('');
      setShowNewChat(false);
      await loadChats();
      setActiveChatId(res.data.idConversacion);
    } catch (err) {
      setError('No se pudo crear la conversación. Verifica el email.');
    }
  };

  // ── Renderizado de item de chat ───────────────────────────────
  const renderChatItem = ({ item }) => {
    const isActive = String(activeChatId) === String(item.idConversacion);
    return (
      <TouchableOpacity
        style={[styles.chatListItem, isActive && styles.chatListItemActive]}
        onPress={() => setActiveChatId(item.idConversacion)}
      >
        <View style={styles.chatListAvatar}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
        <View style={styles.chatListContent}>
          <Text style={styles.chatListTitle} numberOfLines={1}>
            {item.otroUsuario || 'Usuario'}
          </Text>
          <Text style={styles.chatListPreview} numberOfLines={1}>
            {item.ultimoMensaje || 'Sin mensajes'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Renderizado de mensaje ────────────────────────────────────
  const renderMessage = ({ item }) => (
    <View style={[styles.messageWrapper, item.esPropio ? styles.messageOwn : styles.messageOther]}>
      <View style={[styles.messageBubble, item.esPropio ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.messageText, item.esPropio && styles.messageTextOwn]}>
          {item.contenido}
        </Text>
        <Text style={[styles.messageTime, item.esPropio && { color: '#e0e0e0' }]}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </Text>
      </View>
    </View>
  );

  const showLeftPanel = isWide || !activeChatId;
  const showRightPanel = isWide || activeChatId;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Navbar */}
      <View style={styles.topNavbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Mensajes</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color="#b91c1c" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.splitContainer}>

        {/* PANEL IZQUIERDO */}
        {showLeftPanel && (
          <View style={[styles.leftPanel, !isWide && { flex: 1 }]}>
            <View style={styles.leftPanelHeader}>
              <Text style={styles.panelTitle}>Mis Chats</Text>
              <TouchableOpacity
                onPress={() => setShowNewChat(v => !v)}
                style={styles.newChatButton}
              >
                <Ionicons name="create-outline" size={22} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            {showNewChat && (
              <View style={styles.newChatBox}>
                <TextInput
                  style={styles.newChatInput}
                  placeholder="Email del usuario..."
                  value={newChatEmail}
                  onChangeText={setNewChatEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.newChatSend} onPress={handleNewChat}>
                  <Text style={styles.newChatSendText}>Iniciar</Text>
                </TouchableOpacity>
              </View>
            )}

            {loadingChats ? (
              <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={chats}
                keyExtractor={item => String(item.idConversacion)}
                renderItem={renderChatItem}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No tienes conversaciones activas.</Text>
                }
              />
            )}
          </View>
        )}

        {/* PANEL DERECHO */}
        {showRightPanel && (
          <View style={[styles.rightPanel, !isWide && { flex: 1 }]}>
            {activeChatId && activeChat ? (
              <>
                <View style={styles.chatHeader}>
                  {!isWide && (
                    <TouchableOpacity
                      onPress={() => setActiveChatId(null)}
                      style={styles.mobileBackBtn}
                    >
                      <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.chatHeaderAvatar}>
                    <Ionicons name="person" size={20} color="#666" />
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatHeaderTitle}>
                      {activeChat.otroUsuario || 'Usuario'}
                    </Text>
                    <Text style={styles.chatHeaderSubtitle}>En línea</Text>
                  </View>
                </View>

                <View style={styles.chatFeed}>
                  {loadingMessages ? (
                    <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
                  ) : (
                    <FlatList
                      ref={scrollViewRef}
                      data={messages}
                      keyExtractor={item => String(item.idMensaje)}
                      renderItem={renderMessage}
                      contentContainerStyle={styles.messagesList}
                    />
                  )}
                </View>

                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChangeText={setMessageInput}
                    multiline
                    editable={!sending}
                    onSubmitEditing={handleSendMessage}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!messageInput.trim() || sending) && { opacity: 0.5 }]}
                    onPress={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="send" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Image
                  source={require('../../assets/images/index.png')}
                  style={styles.placeholderImage}
                  resizeMode="contain"
                />
                <Text style={styles.placeholderText}>Sanos y Salvos</Text>
                <Text style={styles.placeholderSub}>
                  Selecciona un chat o inicia una nueva conversación.
                </Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5',
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600', flex: 1 },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  leftPanel: {
    width: 350,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  leftPanelHeader: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  panelTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  newChatButton: { padding: 6 },
  newChatBox: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  newChatInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  newChatSend: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  newChatSendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  rightPanel: { flex: 1, backgroundColor: '#efeae2' },
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
  chatFeed: { flex: 1 },
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
  inputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  placeholderImage: { width: 200, height: 200, opacity: 0.6 },
  placeholderText: { fontSize: 24, color: '#666', fontWeight: 'bold', marginTop: 16 },
  placeholderSub: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});