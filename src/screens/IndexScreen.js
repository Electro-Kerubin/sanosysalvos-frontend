import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../styles/theme';
import api from '../api/api';

export default function IndexScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    Promise.all([
      api.getReports(),
      AsyncStorage.getItem('reportPhotosByReportId').then(res => res ? JSON.parse(res) : {}).catch(() => ({}))
    ])
      .then(([res, photoMap]) => {
        if (!mounted) return;
        const data = res?.data;
        const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : null);
        
        if (items) {
          const mapped = items.map(dto => {
            const media = photoMap[String(dto.idReporteMascota)] || [];
            const firstPhoto = media.length > 0 ? media[0] : null;
            const imgSource = typeof firstPhoto === 'string' ? { uri: firstPhoto } : (firstPhoto || require('../../assets/images/noimage.png'));

            return {
              id: dto.idReporteMascota,
              name: dto.nombreMascota || 'Sin nombre',
              species: dto.descripcionEspecie || 'Especie no especificada',
              address: dto.direccion || 'Ubicación no especificada',
              createdAt: dto.fechaReporte || dto.fechaExtravio || new Date().toISOString(),
              img: imgSource
            };
          });
          
          setReports(mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6));
        }
      })
      .catch((err) => console.log('Error al cargar reportes en inicio:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Navbar */}
      <View style={[styles.navbar, Platform.OS === 'web' && { position: 'sticky', top: 0 }]}>
        <View style={styles.navInner}>
          <Text style={styles.navLogo}>Sanos y Salvos</Text>
          <View style={styles.navLinks}>
            {isWide && (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('PublicReports')}>
                  <Text style={styles.navLinkText}>Reportes Públicos</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('QuickReport')}>
                  <Text style={styles.navLinkText}>Reporte Rápido</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.navLinkTextActive}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Hero / About Section */}
      <View style={styles.section}>
        <View style={[styles.heroGrid, !isWide && styles.gridMobile]}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Red de Rescate Animal</Text>
            <Text style={styles.heroDesc}>
              Únete a nuestra plataforma colaborativa diseñada para reportar, buscar y rescatar mascotas perdidas en tu comunidad. Juntos hacemos la diferencia para que regresen sanos y salvos a casa.
            </Text>
            <Text style={styles.heroSubtitle}>Más de 500 reencuentros exitosos en nuestra comunidad.</Text>
          </View>
          <View style={styles.heroImageContainer}>
            <Image source={require('../../assets/images/index.png')} style={styles.heroImage} resizeMode="cover" />
          </View>
        </View>
      </View>

      {/* Reports Section */}
      <View style={[styles.section, styles.bgSoft]}>
        <Text style={styles.sectionTitle}>Avistamientos Recientes</Text>
        <Text style={styles.sectionSubtitle}>Mascotas reportadas recientemente en tu zona.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
        ) : reports.length === 0 ? (
          <Text style={{ textAlign: 'center', color: COLORS.muted }}>No hay reportes recientes.</Text>
        ) : (
          <View style={styles.cardsGrid}>
            {reports.map(report => (
              <TouchableOpacity 
                key={report.id} 
                style={[styles.card, { width: isWide ? '31%' : '100%' }]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
              >
                <Image source={report.img} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{report.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    <Text style={{ fontWeight: 'bold' }}>Especie: </Text>{report.species}{'\n'}
                    <Text style={{ fontWeight: 'bold' }}>Ubicación: </Text>{report.address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* CTA Section */}
      <View style={styles.section}>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>¿Quieres ayudar o necesitas ayuda?</Text>
          <Text style={styles.ctaDesc}>Únete a la comunidad de Sanos y Salvos para publicar un reporte completo de mascota perdida o haz un avistamiento rápido.</Text>
          <View style={[styles.ctaButtons, !isWide && styles.ctaButtonsMobile]}>
            <PrimaryButton 
              title="Crear Cuenta" 
              onPress={() => navigation.navigate('Register')} 
              style={styles.ctaBtn} 
            />
            <PrimaryButton 
              title="Reporte Rápido" 
              variant="ghost" 
              onPress={() => navigation.navigate('QuickReport')} 
              style={styles.ctaBtnOutline} 
            />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.footerInner, !isWide && styles.footerInnerMobile]}>
          <Text style={styles.footerText}>© 2024 Sanos y Salvos. Todos los derechos reservados.</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLink}>Privacidad</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Términos</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Contacto</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  navbar: {
    zIndex: 50,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  navInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  navLogo: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  navLinks: { 
    flexDirection: 'row', 
    gap: 24, 
    alignItems: 'center' 
  },
  navLinkText: { 
    fontWeight: '600', 
    color: COLORS.muted 
  },
  navLinkTextActive: { 
    fontWeight: '800', 
    color: COLORS.primary 
  },
  section: { 
    paddingVertical: 80, 
    paddingHorizontal: 24, 
    width: '100%' 
  },
  bgSoft: { 
    backgroundColor: COLORS.soft 
  },
  heroGrid: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 48, 
    maxWidth: 1280, 
    alignSelf: 'center' 
  },
  gridMobile: { 
    flexDirection: 'column' 
  },
  heroTextContainer: { 
    flex: 1, 
    minWidth: 300 
  },
  heroTitle: { 
    fontSize: 38, 
    fontWeight: '900', 
    color: COLORS.text, 
    marginBottom: 16,
    letterSpacing: -0.5
  },
  heroDesc: { 
    fontSize: 16, 
    color: COLORS.muted, 
    lineHeight: 26, 
    marginBottom: 24 
  },
  heroSubtitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.secondary 
  },
  heroImageContainer: { 
    flex: 1, 
    minWidth: 300, 
    borderRadius: 24, 
    overflow: 'hidden', 
    backgroundColor: COLORS.surface, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 16, 
    elevation: 5, 
    width: '100%' 
  },
  heroImage: { 
    width: '100%', 
    height: 320 
  },
  sectionTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    textAlign: 'center', 
    color: COLORS.text, 
    marginBottom: 8,
    letterSpacing: -0.5
  },
  sectionSubtitle: { 
    fontSize: 16, 
    textAlign: 'center', 
    color: COLORS.muted, 
    marginBottom: 48 
  },
  cardsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 24, 
    justifyContent: 'center', 
    maxWidth: 1280, 
    alignSelf: 'center' 
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 16,
  },
  cardImage: { 
    width: '100%', 
    height: 180 
  },
  cardContent: { 
    padding: 20 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.text, 
    marginBottom: 8 
  },
  cardDesc: { 
    fontSize: 14, 
    color: COLORS.muted, 
    lineHeight: 22 
  },
  ctaBox: {
    backgroundColor: COLORS.surface,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  ctaTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: COLORS.text, 
    marginBottom: 16, 
    textAlign: 'center',
    letterSpacing: -0.5
  },
  ctaDesc: { 
    fontSize: 16, 
    color: COLORS.muted, 
    marginBottom: 32, 
    textAlign: 'center', 
    maxWidth: 600,
    lineHeight: 24
  },
  ctaButtons: { 
    flexDirection: 'row', 
    gap: 16, 
    justifyContent: 'center' 
  },
  ctaButtonsMobile: { 
    flexDirection: 'column', 
    width: '100%' 
  },
  ctaBtn: { 
    paddingHorizontal: 32 
  },
  ctaBtnOutline: { 
    paddingHorizontal: 32 
  },
  footer: { 
    paddingHorizontal: 24, 
    paddingVertical: 40, 
    backgroundColor: COLORS.surface, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border 
  },
  footerInner: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    maxWidth: 1280, 
    width: '100%', 
    alignSelf: 'center' 
  },
  footerInnerMobile: { 
    flexDirection: 'column', 
    gap: 24 
  },
  footerText: { 
    fontSize: 14, 
    color: COLORS.muted 
  },
  footerLinks: { 
    flexDirection: 'row', 
    gap: 24 
  },
  footerLink: { 
    fontSize: 14, 
    color: COLORS.secondary, 
    fontWeight: '600' 
  },
});