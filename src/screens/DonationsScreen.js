import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function DonationsScreen({ navigation }) {
  const [donationAmount, setDonationAmount] = useState('');
  const [selectedDonationType, setSelectedDonationType] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const donationOptions = [
    { id: 'rescue_5', amount: 5, label: '5 USD', description: 'Comida para perro rescatado' },
    { id: 'rescue_10', amount: 10, label: '10 USD', description: 'Medicinas para gato rescatado' },
    { id: 'rescue_25', amount: 25, label: '25 USD', description: 'Esterilización de mascota' },
    { id: 'rescue_50', amount: 50, label: '50 USD', description: 'Atención veterinaria urgente' },
  ];

  const developerOptions = [
    { id: 'coffee_3', amount: 3, label: 'Café ☕', description: 'Un café para el equipo' },
    { id: 'coffee_5', amount: 5, label: 'Almuerzo 🍗', description: 'Almuerzo del developer' },
    { id: 'coffee_10', amount: 10, label: 'Cena 🍕', description: 'Cena celebratoria' },
    { id: 'coffee_20', amount: 20, label: 'Team Event 🎉', description: 'Evento del equipo' },
  ];

  const handleDonateClick = (option, type) => {
    setSelectedDonationType(type);
    setDonationAmount(option.amount.toString());
    setShowModal(true);
  };

  const handleProcessDonation = async () => {
    try {

      if (!email.trim() || !fullName.trim()) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Alert.alert('Error', 'Por favor ingresa un email válido');
        return;
      }

      setIsProcessing(true);

      const response = await api.post('/payments/create-session', {
        amount: parseFloat(donationAmount),
        email,
        fullName,
        type: selectedDonationType === 'rescue' ? 'RESCUE_FUND' : 'DEVELOPER_FUND',
        isRecurring,
        recurringPeriod: isRecurring ? 'monthly' : null,
      });

      if (response.data.paymentUrl) {

        window.location.href = response.data.paymentUrl;
      }
    } catch (error) {
      console.error('[DonationsScreen] Error procesando donación:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No pudimos procesar tu donación. Intenta nuevamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const DonationCard = ({ option, type, onPress }) => (
    <TouchableOpacity
      style={styles.donationCard}
      onPress={() => onPress(option, type)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardAmount}>{option.label}</Text>
        <Ionicons name="arrow-forward" size={20} color="#4A90E2" />
      </View>
      <Text style={styles.cardDescription}>{option.description}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Ionicons name="heart" size={32} color="#FF6B6B" />
          <Text style={styles.headerTitle}>Portal de Donaciones</Text>
          <Text style={styles.headerSubtitle}>
            Tu aporte nos ayuda a rescatar y cuidar mascotas necesitadas
          </Text>
        </View>

      {/* SECCIÓN 1: Apoyo a la Red de Rescate */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#FF6B6B" />
          <Text style={styles.sectionTitle}>Apoyo a la Red de Rescate 🐾</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Financia operaciones directas de rescate, atención veterinaria y cuidado de mascotas en
          situación de vulnerabilidad.
        </Text>

        <View style={styles.cardsGrid}>
          {donationOptions.map((option) => (
            <DonationCard
              key={option.id}
              option={option}
              type="rescue"
              onPress={handleDonateClick}
            />
          ))}
        </View>

        {/* Impacto de donaciones */}
        <View style={styles.impactBox}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <View style={styles.impactContent}>
            <Text style={styles.impactTitle}>Tu impacto</Text>
            <Text style={styles.impactText}>
              5 USD ayudan a alimentar a un perro rescatado durante una semana completa
            </Text>
          </View>
        </View>
      </View>

      {/* SECCIÓN 2: Café para Desarrolladores */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="code" size={24} color="#4A90E2" />
          <Text style={styles.sectionTitle}>Café para Desarrolladores ☕</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Apoya al equipo de desarrollo que mantiene esta plataforma funcionando para todos. Tu
          generosidad nos motiva a mejorar constantemente.
        </Text>

        <View style={styles.cardsGrid}>
          {developerOptions.map((option) => (
            <DonationCard
              key={option.id}
              option={option}
              type="developer"
              onPress={handleDonateClick}
            />
          ))}
        </View>

        {/* Info adicional */}
        <View style={styles.developerNote}>
          <Text style={styles.developerNoteText}>
            💻 Hecho con ❤️ por un equipo de voluntarios apasionados por el rescate animal.
          </Text>
        </View>
      </View>

      {/* SECCIÓN 3: Donativos Personalizados */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="gift" size={24} color="#9C27B0" />
          <Text style={styles.sectionTitle}>Donativo Personalizado</Text>
        </View>

        <View style={styles.customDonationBox}>
          <Text style={styles.label}>Monto (USD)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ejemplo: 15.50"
            keyboardType="decimal-pad"
            value={donationAmount}
            onChangeText={setDonationAmount}
            placeholderTextColor="#999"
          />

          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedDonationType('rescue')}
            >
              <View
                style={[
                  styles.radio,
                  selectedDonationType === 'rescue' && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioLabel}>Red de Rescate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedDonationType('developer')}
            >
              <View
                style={[
                  styles.radio,
                  selectedDonationType === 'developer' && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioLabel}>Equipo de Desarrollo</Text>
            </TouchableOpacity>
          </View>

          {/* Opción recurrente */}
          <TouchableOpacity
            style={styles.recurringOption}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
              {isRecurring && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.recurringLabel}>Donación recurrente (mensual)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.customDonateBtn}
          onPress={() => setShowModal(true)}
          disabled={!donationAmount || !selectedDonationType}
        >
          <Ionicons name="heart" size={20} color="#fff" />
          <Text style={styles.customDonateBtnText}>Continuar Donación</Text>
        </TouchableOpacity>
      </View>

        {/* Info de seguridad y privacidad */}
        <View style={styles.securityInfo}>
          <Ionicons name="lock-closed" size={16} color="#4CAF50" />
          <Text style={styles.securityText}>
            Tus datos de pago están 100% seguros. No almacenamos información sensible en nuestros
            servidores.
          </Text>
        </View>
      </ScrollView>

      {/* Modal de confirmación */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Confirmar Donación</Text>
              <View style={{ width: 24 }} /> {/* Espaciador para centrado */}
            </View>

            {/* Form en el modal */}
            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre Completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Resumen */}
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Monto:</Text>
                  <Text style={styles.summaryValue}>${donationAmount}</Text>
                </View>
                {isRecurring && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Frecuencia:</Text>
                    <Text style={styles.summaryValue}>Mensual</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Botones del modal */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowModal(false)}
                disabled={isProcessing}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDonateBtn, isProcessing && styles.modalDonateBtnDisabled]}
                onPress={handleProcessDonation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#fff" />
                    <Text style={styles.modalDonateBtnText}>Donar ${donationAmount}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardsGrid: {
    gap: 12,
  },
  donationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cardDescription: {
    fontSize: 12,
    color: '#999',
  },
  impactBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  impactContent: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  impactText: {
    fontSize: 12,
    color: '#558B2F',
    marginTop: 4,
    lineHeight: 16,
  },
  developerNote: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  developerNoteText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  customDonationBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  radioGroup: {
    gap: 10,
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  recurringOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  recurringLabel: {
    fontSize: 14,
    color: '#333',
  },
  customDonateBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    opacity: 1,
  },
  customDonateBtnDisabled: {
    opacity: 0.5,
  },
  customDonateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  securityInfo: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalForm: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  summary: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalDonateBtn: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalDonateBtnDisabled: {
    opacity: 0.6,
  },
  modalDonateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
