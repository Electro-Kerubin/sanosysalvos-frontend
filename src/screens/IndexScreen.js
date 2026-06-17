import React, { useState } from 'react';
import { View, StyleSheet, Image, Text, Pressable } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import PrimaryButton from '../components/PrimaryButton';
import ResponsiveNav from '../components/ResponsiveNav';
import LogoBanner from '../components/LogoBanner';
import { COLORS } from '../styles/theme';

export default function IndexScreen({ navigation }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const publicLinks = [
    { key: 'QuickReport', label: 'Publicar avistamiento', icon: 'eye-outline' },
    { key: 'PublicReports', label: 'Reportes', icon: 'list-outline' },
    { key: 'Login', label: 'Iniciar sesión', icon: 'log-in-outline' },
    { key: 'Register', label: 'Registrarse', icon: 'person-add-outline' },
  ];

  return (
    <ScreenShell padded={false} scroll={true} title="" subtitle="" logo={false}>
      {/* Header público */}
      <View style={styles.header}>
        <LogoBanner compact />
        <ResponsiveNav 
          navigation={navigation} 
          openMenu={() => setMenuOpen(!menuOpen)} 
          links={publicLinks} 
        />
      </View>

      {menuOpen ? (
        <View style={styles.mobileMenu}>
          {publicLinks.map((item) => (
            <Pressable 
              key={item.key} 
              onPress={() => navigation.navigate(item.key)} 
              style={styles.mobileMenuItem}
            >
              <Text style={styles.mobileMenuText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Sanos y Salvos</Text>
          <Text style={styles.heroSubtitle}>
            La comunidad dedicada a reunir familias con sus mascotas perdidas.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroImageSpace}>
            <Image
              source={require('../../assets/images/index.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.infoText}>
            ¿Perdiste a tu mascota o encontraste a una que parece extraviada? 
            Nuestra plataforma te conecta con otras personas para facilitar el reencuentro. 
            Regístrate para publicar y gestionar reportes detallados, o si tienes prisa, 
            reporta un avistamiento rápidamente sin necesidad de cuenta.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton 
            title="Ver reportes recientes" 
            onPress={() => navigation.navigate('PublicReports')} 
            style={styles.button} 
          />
          <PrimaryButton 
            title="Publicar avistamiento rápido" 
            variant="ghost" 
            onPress={() => navigation.navigate('QuickReport')} 
            style={styles.button} 
          />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(246, 243, 237, 0.95)'
  },
  mobileMenu: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    gap: 8
  },
  mobileMenuItem: { paddingVertical: 10, paddingHorizontal: 10 },
  mobileMenuText: { color: COLORS.text, fontWeight: '700' },
  content: {
    padding: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 500,
    lineHeight: 24,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  heroImageSpace: {
    marginBottom: 20,
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
  infoText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: { 
    marginTop: 32, 
    gap: 16, 
    width: '100%', 
    maxWidth: 400 
  },
  button: { width: '100%' }
});