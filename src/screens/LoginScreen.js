import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    // MODO DEV: Inicio de sesión rápido con datos de prueba.
    // __DEV__ es una variable global en React Native/Expo que es true en desarrollo.
    if (
      __DEV__ &&
      email.toLowerCase() === 'test@test.com' &&
      password === 'Test.1234'
    ) {
      try {
        const mockProfile = {
          name: 'Usuario de Prueba',
          email: 'test@test.com',
          phone: '912345678',
        };
        const mockToken = 'mock-jwt-token-for-dev-only';

        await AsyncStorage.setItem('profile', JSON.stringify(mockProfile));
        await AsyncStorage.setItem('token', mockToken);

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('profile', JSON.stringify(mockProfile));
          window.localStorage.setItem('token', mockToken);
          window.localStorage.setItem('myReportIds', JSON.stringify(['r-1', 'r-3']));
        }

        alert('Sesión de prueba iniciada con test@test.com.');
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
        return;
      } catch (error) {
        alert('Error al iniciar sesión como usuario de prueba.');
        setLoading(false);
        return;
      }
    }

    try {
      // Llama al API Gateway -> Microservicio de Autenticación
      const response = await api.login(email, password);
      
      const { token, nombreCompleto, rol } = response.data;
      await AsyncStorage.multiSet([
        ['token', token],
        ['nombreCompleto', nombreCompleto ?? ''],
        ['rol', rol ?? ''],
      ]);
      const profile = {
        name: nombreCompleto ?? '',
        email,
        phone: '',
      };
      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      // Guardar también en localStorage como respaldo para web
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('profile', JSON.stringify(profile));
      }
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      
    } catch (error) {
      console.error(error);
      alert("Credenciales incorrectas o error de conexión.");
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="Sanos y Salvos" subtitle="Encuentra a tu amigo" logo>
      <View style={styles.heroCard}>
        <Image source={require('../../assets/images/index.png')} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.lead}>Accede para publicar, seguir y gestionar reportes desde una interfaz más clara.</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.form}>
          <TextInput 
            placeholder="Correo electrónico" 
            placeholderTextColor={COLORS.muted} 
            style={styles.input} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          <TextInput 
            placeholder="Contraseña" 
            placeholderTextColor={COLORS.muted} 
            style={styles.input} 
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <PrimaryButton
            title={loading ? 'Ingresando...' : 'Entrar'}
            onPress={handleLogin}
            style={styles.button}
            disabled={loading}
          />
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkBox}>
        <Text style={styles.linkText}>Aún no tienes cuenta? Regístrate aquí</Text>
      </Pressable>
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
    height: 230,
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
  linkText: { color: COLORS.secondary, fontWeight: '800', textAlign: 'center' }
});