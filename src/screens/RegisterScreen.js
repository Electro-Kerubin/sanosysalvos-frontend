import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';

function MockLoginButton({ navigation }) {
  // Este botón solo debería estar visible en el entorno de desarrollo.
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleMockLogin = async () => {
    try {
      // 1. Perfil de usuario de prueba con los datos que solicitaste.
      const mockProfile = {
        name: 'Test Tester',
        email: 'test@test.com',
        phone: '912345678',
      };

      // 2. Guardar el perfil en el almacenamiento para simular una sesión.
      await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('profile', JSON.stringify(mockProfile));
        // Para que puedas probar la sección "Mis Reportes", simulamos que el usuario es dueño de algunos.
        window.localStorage.setItem('myReportIds', JSON.stringify(['r-1', 'r-3']));
      }

      // 3. Navegar al Dashboard.
      alert('Sesión iniciada con el usuario de prueba (test@test.com).');
      navigation.navigate('Dashboard');
    } catch (error) {
      console.error('Falló el inicio de sesión de prueba:', error);
      alert('Error al iniciar sesión como usuario de prueba.');
    }
  };

  return (
    <PrimaryButton title="DEV: Login como test@test.com" onPress={handleMockLogin} style={styles.mockButton} />
  );
}

export default function RegisterScreen({ navigation }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = async () => {
    if (password !== confirm) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    try {
      await api.register({
        nombreCompleto,
        email,
        contrasena: password,
        idRol: 1,
      });
      const profile = { name: nombreCompleto.trim(), email: email.trim(), phone: '' };
      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('profile', JSON.stringify(profile));
      }
      alert('Cuenta creada. Inicia sesión.');
      navigation.navigate('Login');
    } catch (error) {
      console.error(error);
      alert('Error al registrar. Intenta de nuevo.');
    }
  };

  return (
    <ScreenShell title="Sanos y Salvos" subtitle="Encuentra a tu amigo" logo>
      <View style={styles.heroCard}>
        <Image source={require('../../assets/images/index.png')} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.lead}>Registra tu perfil para publicar reportes y recibir información de contacto con una presentación más amable.</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.form}>
          <TextInput
            placeholder="Nombre completo"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoCapitalize="words"
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
          />
          <TextInput
            placeholder="Correo electrónico"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            placeholder="Repite la contraseña"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          <PrimaryButton title="Registrarme" onPress={handleRegister} style={styles.button} />
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkBox}>
        <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </Pressable>

      <MockLoginButton navigation={navigation} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
    marginBottom: 18,
  },
  heroImage: {
    width: '100%',
    maxWidth: 430,
    height: 220,
    borderRadius: 24,
    alignSelf: 'center'
  },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, marginTop: 10, textAlign: 'center', letterSpacing: -0.4 },
  lead: { marginTop: 8, color: COLORS.muted, textAlign: 'center', lineHeight: 21, fontSize: 14 },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  form: { gap: 12 },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
  },
  button: { width: '100%', alignSelf: 'center', marginTop: 4 },
  linkBox: { marginTop: 18, alignItems: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '800', textAlign: 'center' },
  mockButton: {
    marginTop: 20,
    backgroundColor: '#facc15', // yellow-400
  }
});
