import { DefaultTheme, Stack, ThemeProvider, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PacienteChrome } from '@/components/paciente/paciente-chrome';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const navegacionLista = Boolean(useRootNavigationState()?.key);

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={styles.root}>
        <PacienteChrome navegacionLista={navegacionLista}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#f8fafc' },
            }}
          />
        </PacienteChrome>
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
});
