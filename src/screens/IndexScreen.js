import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';

export default function IndexScreen({ navigation }) {
  return (
    <ScreenShell title="Sanos y Salvos" subtitle="Encuentra a tu amigo" logo>
      <View style={styles.heroCard}>
        <View style={styles.heroImageSpace}>
          <Image
            source={require('../../assets/images/index.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Registrarse" onPress={() => navigation.navigate('Register')} style={styles.button} />
        <PrimaryButton title="Login" variant="ghost" onPress={() => navigation.navigate('Login')} style={styles.button} />
      </View>
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
  },
  heroImageSpace: {
    marginTop: 2,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroImage: {
    width: '100%',
    maxWidth: 430,
    height: 250,
    borderRadius: 24,
    alignSelf: 'center'
  },
  lead: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center'
  },
  actions: { marginTop: 22, gap: 12 },
  button: { width: '100%', alignSelf: 'center' }
});