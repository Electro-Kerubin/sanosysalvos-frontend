import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';

export default function LogoutScreen({ navigation }) {
  const handleGoHome = async () => {
    await AsyncStorage.multiRemove(['token', 'nombreCompleto', 'rol']);
    navigation.reset({ index: 0, routes: [{ name: 'Index' }] });
  };

  return (
    <ScreenShell title="Cerrar sesión" subtitle="¿Estás seguro de que deseas salir de la app?">
      <View style={styles.card}>
        <Image source={require('../../assets/images/logout.png')} style={styles.image} resizeMode="contain" />
        <Text style={styles.message}>Te esperamos la próxima vez</Text>
        <PrimaryButton title="Ir a Inicio" onPress={handleGoHome} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    padding: 18,
    gap: 16,
    alignItems: 'center'
  },
  image: {
    width: '88%',
    maxWidth: 420,
    height: 240,
    borderRadius: 24,
    alignSelf: 'center'
  },
  message: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' }
});
