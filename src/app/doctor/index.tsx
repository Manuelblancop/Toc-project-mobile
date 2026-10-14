import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cerrarSesion } from '@/lib/sesion';

export default function DoctorHomeScreen() {
  const [cerrando, setCerrando] = useState(false);

  return (
    <View style={styles.screen}>
      <EmeraldSpinner />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        activeOpacity={0.7}
        disabled={cerrando}
        onPress={() => {
          setCerrando(true);
          void cerrarSesion();
        }}
        style={[styles.logout, cerrando && styles.logoutDisabled]}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  logout: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#18181b',
    fontSize: 14,
  },
});
