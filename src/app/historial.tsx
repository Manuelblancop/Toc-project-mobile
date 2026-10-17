import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeTurno } from '@/components/doctor/badge-turno';
import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cargarHistorial, ocultarCita, type CitaHistorial, type SesionHistorial } from '@/lib/paciente';

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [citas, setCitas] = useState<CitaHistorial[]>([]);
  const [sesiones, setSesiones] = useState<SesionHistorial[]>([]);
  const [tieneFuturos, setTieneFuturos] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ocultando, setOcultando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const resultado = await cargarHistorial();
    if ('error' in resultado) {
      if (resultado.error === 'No autorizado' && navegacionLista) router.replace('/login');
      setError(resultado.error);
      setCargando(false);
      return;
    }
    setCitas(resultado.citas);
    setSesiones(resultado.sesiones);
    setTieneFuturos(resultado.tieneFuturos);
    setError('');
    setCargando(false);
  }, [navegacionLista]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function ocultar(turnoId: string) {
    if (ocultando) return;
    setOcultando(turnoId);
    setAviso('');
    const resultado = await ocultarCita(turnoId);
    setOcultando(null);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos ocultar la sesión.');
      return;
    }
    setCitas((actual) => actual.filter((cita) => cita.id !== turnoId));
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
    >
      <Text style={styles.titulo}>Mi historial</Text>
      <Text style={styles.subtitulo}>Sesiones ERP y citas anteriores</Text>

      {cargando ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cargando ? null : (
      <>
      <Text style={styles.seccion}>Ejercicios ERP</Text>
      {sesiones.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.vacio}>Todavía no completaste ejercicios ERP.</Text>
        </View>
      ) : (
        sesiones.map((sesion) => (
          <View key={sesion.id} style={styles.card}>
            <Text style={styles.nombre}>{sesion.nombre}</Text>
            <Text style={styles.cuando}>{sesion.cuando}</Text>
            <Text style={styles.ansiedad}>
              Ansiedad: <Text style={styles.ansiedadNumero}>{sesion.ansiedad}/5</Text>
            </Text>
          </View>
        ))
      )}

      <Text style={styles.seccion}>Citas pasadas y canceladas</Text>
      {aviso ? <Text style={styles.error}>{aviso}</Text> : null}
      {citas.length === 0 && !tieneFuturos ? (
        <View style={styles.vacioCitas}>
          <Text style={styles.vacioTitulo}>Todavía no tenés turnos</Text>
          <Text style={styles.vacio}>Cuando agendes o reprogrames una consulta, va a aparecer acá.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/turnos')} style={styles.agendar}>
            <Text style={styles.agendarTexto}>Agendar o reprogramar un turno</Text>
          </Pressable>
        </View>
      ) : citas.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.vacio}>No hay citas pasadas ni canceladas.</Text>
        </View>
      ) : (
        citas.map((cita) => (
          <View key={cita.id} style={styles.card}>
            <View style={styles.fila}>
              <View style={styles.citaTexto}>
                <Text style={styles.nombre}>{cita.profesional}</Text>
                <Text style={styles.cuando}>{cita.cuando}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Borrar"
                disabled={ocultando === cita.id}
                onPress={() => void ocultar(cita.id)}
                style={styles.papelera}
              >
                <Text style={styles.papeleraIcono}>🗑</Text>
              </Pressable>
            </View>
            <View style={styles.badge}>
              <BadgeTurno estado={cita.estado} />
            </View>
            {cita.estado === 'CONFIRMADO' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/sala/[turnoId]', params: { turnoId: cita.id } })}
                style={styles.videollamada}
              >
                <Text style={styles.videollamadaTexto}>Ingresar a videollamada</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  titulo: { color: '#171717', fontSize: 24, fontWeight: '600' },
  subtitulo: { marginTop: 6, color: '#64748b', fontSize: 14 },
  carga: { marginTop: 40, alignItems: 'center' },
  seccion: { marginTop: 24, marginBottom: 12, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  card: { marginBottom: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16 },
  nombre: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  cuando: { marginTop: 4, color: '#64748b', fontSize: 12 },
  ansiedad: { marginTop: 8, color: '#334155', fontSize: 14 },
  ansiedadNumero: { fontWeight: '600' },
  vacio: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  vacioCitas: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 24, alignItems: 'center' },
  vacioTitulo: { color: '#0f172a', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  agendar: { marginTop: 16, backgroundColor: '#5DCAA5', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  agendarTexto: { color: '#12382E', fontSize: 14, fontWeight: '600' },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  citaTexto: { flex: 1 },
  papelera: { borderRadius: 8, padding: 8 },
  papeleraIcono: { fontSize: 18, color: '#94a3b8' },
  badge: { marginTop: 8, alignSelf: 'flex-start' },
  videollamada: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#5DCAA5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  videollamadaTexto: { color: '#12382E', fontSize: 14, fontWeight: '700' },
  error: { color: '#475569', fontSize: 14 },
});
