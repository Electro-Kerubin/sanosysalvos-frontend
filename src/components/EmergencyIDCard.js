import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'qrcode.react';
import { Ionicons } from '@expo/vector-icons';

export default function EmergencyIDCard({
  petId,
  petName,
  ownerPhone,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https:
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrRef, setQrRef] = useState(null);

  const publicScanUrl = `${baseUrl}/pet-found/${petId}`;

  const handleDownloadQR = async () => {
    try {
      setIsGenerating(true);

      if (!qrRef) {
        Alert.alert('Error', 'QR no disponible. Intenta nuevamente.');
        return;
      }

      const canvas = qrRef.querySelector('canvas');
      if (!canvas) {
        Alert.alert('Error', 'No se pudo generar el código QR.');
        return;
      }

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `carnet-${petName.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Alert.alert('Éxito', 'Carnet descargado correctamente');
    } catch (error) {
      console.error('[EmergencyIDCard] Error descargando QR:', error);
      Alert.alert('Error', 'No se pudo descargar el carnet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintQR = () => {
    try {
      const canvas = qrRef?.querySelector('canvas');
      if (!canvas) {
        Alert.alert('Error', 'No se pudo generar el código QR.');
        return;
      }

      const printWindow = window.open('', '', 'width=800,height=600');
      const qrImage = canvas.toDataURL('image/png');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Carnet de Emergencia - ${petName}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .card { max-width: 400px; margin: auto; border: 2px solid #FF6B6B; padding: 30px; }
              .header { color: #FF6B6B; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .qr-container { margin: 20px 0; }
              .qr-container img { max-width: 100%; height: auto; }
              .pet-info { text-align: left; margin-top: 20px; font-size: 14px; }
              .pet-info p { margin: 5px 0; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">Carnet de Emergencia 🐾</div>
              <div class="qr-container">
                <img src="${qrImage}" alt="QR Code" />
              </div>
              <div class="pet-info">
                <p><strong>Mascota:</strong> ${petName}</p>
                <p><strong>Contacto:</strong> ${ownerPhone}</p>
                <p><strong>ID:</strong> ${petId}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      console.error('[EmergencyIDCard] Error imprimiendo:', error);
      Alert.alert('Error', 'No se pudo abrir el diálogo de impresión');
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
        <Text style={styles.headerText}>Carnet de Emergencia</Text>
      </View>

      {/* Tarjeta del Carnet */}
      <View style={styles.card}>
        {/* Información de mascota */}
        <Text style={styles.petName}>{petName}</Text>
        <Text style={styles.petId}>ID: {petId}</Text>

        {/* Código QR */}
        <View style={styles.qrContainer} ref={setQrRef}>
          <QRCode
            value={publicScanUrl}
            size={256}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            includeMargin
            renderAs="canvas"
          />
        </View>

        {/* Información de contacto */}
        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Ionicons name="call" size={16} color="#555" />
            <Text style={styles.contactText}>{ownerPhone}</Text>
          </View>
          <Text style={styles.scanHint}>Escanea el código para contactar</Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.downloadBtn]}
          onPress={handleDownloadQR}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.buttonText}>Descargar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.printBtn]}
          onPress={handlePrintQR}
          disabled={isGenerating}
        >
          <Ionicons name="print" size={20} color="#fff" />
          <Text style={styles.buttonText}>Imprimir</Text>
        </TouchableOpacity>
      </View>

      {/* Info adicional */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#4A90E2" />
        <Text style={styles.infoText}>
          Imprime o descarga este carnet y guárdalo en un lugar seguro. Si tu mascota se pierde,
          las personas que la encuentren podrán escanear el código QR para contactarte
          inmediatamente.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  petId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  qrContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  contactInfo: {
    marginTop: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  scanHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadBtn: {
    backgroundColor: '#FF6B6B',
  },
  printBtn: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
});
