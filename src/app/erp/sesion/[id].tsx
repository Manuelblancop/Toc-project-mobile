import { router, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { SesionActiva } from '@/components/erp/sesion-activa';
import { obtenerEjercicioAsignado, type EjercicioAsignadoVista } from '@/lib/erp';

export default function SesionErpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ejercicioId = Array.isArray(id) ? id[0] : id;
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ejercicio, setEjercicio] = useState<EjercicioAsignadoVista | null>(null);

  useEffect(() => {
    if (!ejercicioId) return;
    let activo = true;
    void (async () => {
      const resultado = await obtenerEjercicioAsignado(ejercicioId);
      if (!activo) return;
      if (resultado && 'error' in resultado) {
        setError(resultado.error);
        setCargando(false);
        return;
      }
      setEjercicio(resultado);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [ejercicioId]);

  useEffect(() => {
    if (!navegacionLista || !ejercicio?.completado) return;
    router.replace('/erp');
  }, [navegacionLista, ejercicio]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Módulo ERP</Text>
      <Text style={styles.subtitulo}>Exposición y prevención de respuesta</Text>
      {cargando || ejercicio?.completado ? (
        <View style={styles.cargando}>
          <EmeraldSpinner />
        </View>
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : ejercicio ? (
        <SesionActiva
          ejercicioId={ejercicio.id}
          titulo={ejercicio.titulo}
          descripcion={ejercicio.descripcion}
          duracionSegundos={ejercicio.duracionSegundos}
        />
      ) : (
        <View style={styles.noEncontrado}>
          <Text style={styles.noTitulo}>No encontramos ese ejercicio</Text>
          <Text style={styles.noDetalle}>Puede que el enlace esté desactualizado.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/erp')} style={styles.volver}>
            <Text style={styles.volverTexto}>Volver a mis ejercicios</Text>
          </Pressable>
        </View>
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
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingBottom: 120,
  },
  titulo: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  subtitulo: {
    marginTop: 8,
    marginBottom: 24,
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
  noEncontrado: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  noTitulo: {
    marginBottom: 8,
    color: '#0f1117',
    fontSize: 22,
    textAlign: 'center',
  },
  noDetalle: {
    marginBottom: 24,
    color: '#7a7f94',
    fontSize: 14,
    textAlign: 'center',
  },
  volver: {
    borderRadius: 10,
    backgroundColor: '#5a8a6e',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  volverTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
