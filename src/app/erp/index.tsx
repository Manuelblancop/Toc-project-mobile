import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { EjerciciosAsignados } from '@/components/erp/ejercicios-asignados';
import { cargarEjerciciosAsignados, diaDeHoy, type EjercicioAsignadoVista } from '@/lib/erp';

export default function ErpScreen() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioAsignadoVista[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setCargando(true);
      void (async () => {
        const resultado = await cargarEjerciciosAsignados();
        if (!activo) return;
        if ('error' in resultado) {
          setError(resultado.error);
          setCargando(false);
          return;
        }
        setError(null);
        setEjercicios(resultado.ejercicios);
        setCargando(false);
      })();
      return () => {
        activo = false;
      };
    }, []),
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Módulo ERP</Text>
      <Text style={styles.subtitulo}>Exposición y prevención de respuesta</Text>
      {cargando ? (
        <View style={styles.cargando}>
          <EmeraldSpinner />
        </View>
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : (
        <EjerciciosAsignados ejercicios={ejercicios} diaInicial={diaDeHoy()} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingBottom: 120,
    gap: 8,
  },
  titulo: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  subtitulo: {
    marginBottom: 16,
    color: '#64748b',
    fontSize: 14,
  },
  cargando: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#c87070',
    fontSize: 14,
  },
});
