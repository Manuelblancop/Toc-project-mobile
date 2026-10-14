import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cerrarSesion } from '@/lib/sesion';

export default function DoctorPendienteScreen() {
  const insets = useSafeAreaInsets();
  const [cerrando, setCerrando] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 64 }]}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>◷</Text>
        </View>
        <Text style={styles.brand}>
          Toc <Text style={styles.brandProject}>Project</Text>
        </Text>
        <Text style={styles.title}>Cuenta en Revisión</Text>
        <Text style={styles.body}>
          La validación SISA está en curso. Estamos validando tu matrícula en el SISA. Recibirás una
          notificación cuando tu cuenta esté activa.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar Sesión"
          activeOpacity={0.7}
          disabled={cerrando}
          onPress={() => {
            setCerrando(true);
            void cerrarSesion();
          }}
          style={[styles.logout, cerrando && styles.logoutDisabled]}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdfa',
    marginBottom: 20,
  },
  badgeIcon: {
    color: '#0f766e',
    fontSize: 28,
  },
  brand: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  brandProject: {
    color: '#064e3b',
    fontWeight: '600',
  },
  title: {
    marginTop: 8,
    color: '#18181b',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    color: '#52525b',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  logout: {
    alignSelf: 'stretch',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
});
