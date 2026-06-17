import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import ReportCard from '../components/ReportCard';
import { COLORS } from '../styles/theme';
import api from '../api/api';

export default function PublicReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api.getReports()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data;
        const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : null);
        
        if (items) {
          // Map to match component format, simple parsing
          const mapped = items.map(dto => ({
            id: dto.idReporteMascota,
            name: dto.nombreMascota || 'Sin nombre',
            species: dto.descripcionEspecie || '',
            breed: dto.descripcionRaza || '',
            mark: dto.descripcionMarcaDistintiva || '',
            address: dto.direccion || '',
            description: dto.descripcionTipoReporte || '',
            status: (dto.descripcionTipoReporte || '').toLowerCase().includes('encontrad') ? 'Encontrado' : 'Búsqueda',
            lat: dto.latitud ?? dto.lat ?? null,
            lng: dto.longitud ?? dto.lng ?? null,
            media: [], // We don't have public photos logic easily available here unless we fetch them individually or use defaults
            contact: dto.nombresContacto || '',
            createdAt: dto.fechaReporte || dto.fechaExtravio || new Date().toISOString(),
          }));
          
          setReports(mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } else {
          setReports([]);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || 'Error al cargar reportes');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <ScreenShell title="Reportes Recientes" subtitle="Mascotas perdidas y encontradas">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text style={styles.loadingText}>Cargando reportes...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && reports.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay reportes recientes disponibles.</Text>
          </View>
        )}

        {!loading && reports.map((report) => (
          <View key={report.id} style={styles.cardContainer}>
            <ReportCard 
              report={report} 
              onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })} 
            />
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    gap: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 15,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
  },
  errorBanner: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
