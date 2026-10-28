import { router, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { registrarPresencia } from '@/lib/doctor';
import { cerrarSesion } from '@/lib/sesion';

export function DoctorChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const esPendiente = pathname === '/doctor/pendiente';

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (esPendiente) return;
    void registrarPresencia();
  }, [esPendiente, pathname]);

  if (esPendiente) {
    return <View style={styles.screen}>{children}</View>;
  }

  function irAlPerfil() {
    setMenuAbierto(false);
    router.push('/doctor/perfil');
  }

  function salir() {
    setMenuAbierto(false);
    void cerrarSesion();
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menú"
          onPress={() => setMenuAbierto(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>Menú</Text>
        </Pressable>
        <Text style={styles.brand}>
          Toc <Text style={styles.brandProject}>Project</Text>
        </Text>
        <View style={styles.headerBalance} />
      </View>

      <View style={styles.body}>{children}</View>

      {menuAbierto ? (
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={styles.backdrop}
            onPress={() => setMenuAbierto(false)}
          />
          <View style={[styles.drawer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
            <Text style={styles.drawerBrand}>
              Toc <Text style={styles.brandProject}>Project</Text>
            </Text>
            <Text style={styles.drawerSubtitle}>Espacio del profesional</Text>
            <Pressable accessibilityRole="button" style={styles.drawerLink} onPress={irAlPerfil}>
              <Text style={styles.drawerLinkText}>Mi Perfil</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={salir} style={styles.logout}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  menuButton: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  brandProject: {
    color: '#064e3b',
  },
  headerBalance: {
    minWidth: 72,
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 256,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  drawerBrand: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '600',
  },
  drawerSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#64748b',
    fontSize: 14,
  },
  drawerLink: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  drawerLinkText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
  logout: {
    marginTop: 'auto',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutText: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
});
