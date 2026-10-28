import { DefaultTheme, Stack, ThemeProvider, usePathname, useRootNavigationState, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { EmeraldSpinner } from '@/components/emerald-spinner';
import { PacienteChrome } from '@/components/paciente/paciente-chrome';
import { destinoTrasAuth, esRutaPublica, esperarSesionInicial } from '@/lib/sesion';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [sesionLista, setSesionLista] = useState(false);

  useEffect(() => {
    if (!navegacionLista) return;

    let activo = true;
    void (async () => {
      const sesion = await esperarSesionInicial();
      if (!activo) return;

      const ruta = pathnameRef.current || '/';
      const user = sesion?.user ?? null;
      if (user) {
        const destino = await destinoTrasAuth(user);
        if (!activo) return;
        if (destino === '/home' || destino === '/doctor' || destino === '/doctor/pendiente') {
          if (esRutaPublica(ruta)) router.replace(destino);
        } else if (!esRutaPublica(ruta)) {
          router.replace('/login');
        }
      } else if (!esRutaPublica(ruta)) {
        router.replace('/login');
      }

      if (activo) setSesionLista(true);
    })();

    return () => {
      activo = false;
    };
  }, [navegacionLista]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.root}>
        <PacienteChrome navegacionLista={navegacionLista} sesionLista={sesionLista}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#f8fafc' },
            }}
          />
        </PacienteChrome>
        {sesionLista ? null : (
          <View style={styles.cargando}>
            <EmeraldSpinner />
          </View>
        )}
        <AnimatedSplashOverlay />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  cargando: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    zIndex: 20,
  },
});
