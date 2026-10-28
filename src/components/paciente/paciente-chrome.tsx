import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cerrarSesion, destinoTrasAuth } from '@/lib/sesion';
import { supabase } from '@/lib/supabase';

const RUTAS_PACIENTE = ['/home', '/erp', '/turnos', '/perfil', '/historial', '/puntos', '/aura'];

const TABS = [
  { href: '/home', label: 'Inicio' },
  { href: '/erp', label: 'ERP' },
  { href: '/turnos', label: 'Turnos' },
  { href: '/perfil', label: 'Perfil' },
] as const;

function esRutaPaciente(pathname: string) {
  return RUTAS_PACIENTE.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

export function PacienteChrome({
  children,
  navegacionLista,
  sesionLista,
}: {
  children: ReactNode;
  navegacionLista: boolean;
  sesionLista: boolean;
}) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const esPaciente = esRutaPaciente(pathname);
  const autorizado = useRef(false);
  const [comprobando, setComprobando] = useState(esPaciente);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!navegacionLista || !sesionLista) return;

    if (!esPaciente) {
      autorizado.current = false;
      setComprobando(false);
      setMenuAbierto(false);
      return;
    }
    if (autorizado.current) return;

    let activo = true;
    setComprobando(true);

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!activo) return;
      if (!user) {
        router.replace('/login');
        return;
      }

      const destino = await destinoTrasAuth(user);
      if (!activo) return;
      if (destino === '/doctor' || destino === '/doctor/pendiente') {
        router.replace(destino);
        return;
      }
      if (destino !== '/home') {
        router.replace('/login');
        return;
      }

      autorizado.current = true;
      setComprobando(false);
    })();

    return () => {
      activo = false;
    };
  }, [esPaciente, navegacionLista, sesionLista]);

  return (
    <View style={styles.screen}>
      {esPaciente ? (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            onPress={() => setMenuAbierto(true)}
            style={styles.menuButton}>
            <Text style={styles.menuButtonText}>Menú</Text>
          </Pressable>
          <Text style={styles.brand}>
            Toc <Text style={styles.brandProject}>Project</Text>
          </Text>
          <View style={styles.headerBalance} />
        </View>
      ) : null}

      <View style={styles.body}>{children}</View>

      {esPaciente ? (
        <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {TABS.map((item) => {
            const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                style={styles.tab}>
                <View style={[styles.tabIcon, activo && styles.tabIconActive]}>
                  <Text style={[styles.tabGlyph, activo && styles.tabGlyphActive]}>
                    {item.label.slice(0, 1)}
                  </Text>
                </View>
                <Text style={[styles.tabLabel, activo && styles.tabLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {esPaciente && pathname !== '/aura' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/aura')}
          style={[styles.burbuja, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
          <Text style={styles.burbujaText}>Hablar con Aura</Text>
        </Pressable>
      ) : null}

      {menuAbierto ? (
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={styles.backdrop}
            onPress={() => setMenuAbierto(false)}
          />
          <View style={[styles.drawer, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.drawerBrand}>
              Toc <Text style={styles.brandProject}>Project</Text>
            </Text>
            <Text style={styles.drawerSubtitle}>Espacio del paciente</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.drawerLink}
              onPress={() => {
                setMenuAbierto(false);
                router.push('/historial');
              }}>
              <Text style={styles.drawerLinkText}>Historial</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.drawerLink}
              onPress={() => {
                setMenuAbierto(false);
                router.push('/puntos');
              }}>
              <Text style={styles.drawerLinkText}>Puntos</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuAbierto(false);
                void cerrarSesion();
              }}
              style={styles.logout}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {esPaciente && comprobando ? (
        <View style={styles.loading}>
          <EmeraldSpinner />
        </View>
      ) : null}
    </View>
  );
}

export function PantallaCascara({ titulo }: { titulo: string }) {
  return (
    <View style={styles.cascara}>
      <Text style={styles.cascaraTitulo}>{titulo}</Text>
      <EmeraldSpinner />
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
    gap: 12,
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
  headerBalance: {
    minWidth: 72,
  },
  brandProject: {
    color: '#064e3b',
  },
  body: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabIcon: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tabIconActive: {
    backgroundColor: '#E7F6F0',
  },
  tabGlyph: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tabGlyphActive: {
    color: '#2C8A6E',
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#2C8A6E',
  },
  burbuja: {
    position: 'absolute',
    right: 16,
    borderRadius: 28,
    backgroundColor: '#5DCAA5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  burbujaText: {
    color: '#12382E',
    fontSize: 14,
    fontWeight: '600',
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
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    zIndex: 30,
  },
  cascara: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#f8fafc',
  },
  cascaraTitulo: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
});
