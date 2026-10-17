import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cargarPuntos } from '@/lib/paciente';

export default function PuntosScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const resultado = await cargarPuntos();
    if ('error' in resultado) {
      if (resultado.error === 'No autorizado' && navegacionLista) router.replace('/login');
      setError(resultado.error);
      return;
    }
    setPoints(resultado.points);
    setError('');
  }, [navegacionLista]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
    >
      <Text style={styles.titulo}>Mis puntos</Text>
      <Text style={styles.subtitulo}>Saldo disponible para consultas</Text>

      {points == null && !error ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {points != null ? (
        <>
          <View style={styles.card}>
            <Text style={styles.etiqueta}>Saldo actual</Text>
            <Text style={styles.saldo}>{points}</Text>
            <Text style={styles.meta}>Puntos Toc Project</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.seccion}>Cómo se usan</Text>
            <Text style={styles.cuerpo}>
              Ganás puntos completando tus sesiones ERP y podés usarlos para agendar consultas con nuestros especialistas.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  titulo: { color: '#0f172a', fontSize: 30, fontWeight: '600' },
  subtitulo: { marginTop: 6, marginBottom: 20, color: '#64748b', fontSize: 14 },
  carga: { marginTop: 24, alignItems: 'center' },
  card: { marginBottom: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16 },
  etiqueta: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  saldo: { marginTop: 8, color: '#0f172a', fontSize: 48, fontWeight: '600' },
  meta: { marginTop: 8, color: '#64748b', fontSize: 14 },
  seccion: { marginBottom: 8, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  cuerpo: { color: '#64748b', fontSize: 14, lineHeight: 22 },
  error: { color: '#475569', fontSize: 14 },
});
