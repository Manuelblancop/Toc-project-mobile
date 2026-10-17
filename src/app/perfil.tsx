import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cargarCuenta, guardarEdad, type CuentaPaciente } from '@/lib/paciente';

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [cuenta, setCuenta] = useState<CuentaPaciente | null>(null);
  const [edad, setEdad] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const resultado = await cargarCuenta();
    if ('error' in resultado) {
      if (resultado.error === 'No autorizado' && navegacionLista) router.replace('/login');
      setError(resultado.error);
      setCargando(false);
      return;
    }
    setCuenta(resultado);
    setEdad(resultado.edad == null ? '' : String(resultado.edad));
    setError('');
    setCargando(false);
  }, [navegacionLista]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    setAviso('');
    const resultado = await guardarEdad(edad);
    setGuardando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos guardar la edad.');
      return;
    }
    setCuenta((actual) => (actual ? { ...actual, edad: resultado.edad } : actual));
    setAviso('Se guardó correctamente.');
  }

  const inicial = cuenta?.nombre.trim().charAt(0).toUpperCase() || 'P';
  const mes = cuenta ? cuenta.mesAlta.charAt(0).toUpperCase() + cuenta.mesAlta.slice(1) : '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {cargando && !cuenta ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {error && !cuenta ? <Text style={styles.error}>{error}</Text> : null}

      {cuenta ? (
        <>
          <View style={styles.card}>
            <View style={styles.identidad}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{inicial}</Text>
              </View>
              <View style={styles.identidadTexto}>
                <Text style={styles.nombre}>{cuenta.nombre}</Text>
                <Text style={styles.meta}>Paciente desde {cuenta.mesAlta} {cuenta.anioAlta}</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/puntos')} style={styles.puntos}>
                  <Text style={styles.puntosTexto}>{cuenta.points} pts acumulados</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.seccion}>Mis datos</Text>
            <Dato etiqueta="Nombre" valor={cuenta.nombre} />
            <Dato etiqueta="Correo" valor={cuenta.email} />
            <View style={styles.edad}>
              <Text style={styles.etiqueta}>Edad</Text>
              <Text style={styles.ayuda}>Opcional. No hace falta para reservar ni pagar un turno.</Text>
              <View style={styles.filaEdad}>
                <TextInput
                  value={edad}
                  onChangeText={setEdad}
                  keyboardType="number-pad"
                  placeholder="Ej.: 27"
                  placeholderTextColor="#94a3b8"
                  editable={!guardando}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={guardando}
                  onPress={() => void guardar()}
                  style={[styles.guardar, guardando && styles.guardarOff]}
                >
                  <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text>
                </Pressable>
              </View>
              {aviso ? (
                <Text style={aviso === 'Se guardó correctamente.' ? styles.ok : styles.error}>{aviso}</Text>
              ) : null}
            </View>
            <View style={styles.dato}>
              <Text style={styles.etiqueta}>Miembro desde</Text>
              <Text style={styles.valor}>{mes} {cuenta.anioAlta}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.seccion}>Atajos</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/historial')} style={styles.atajo}>
              <Text style={styles.atajoTexto}>Historial clínico</Text>
              <Text style={styles.atajoFlecha}>→</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  carga: { marginTop: 40, alignItems: 'center' },
  card: { marginBottom: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16 },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb' },
  avatarTexto: { color: '#ffffff', fontSize: 28, fontWeight: '600' },
  identidadTexto: { flex: 1 },
  nombre: { color: '#0f172a', fontSize: 24, fontWeight: '600' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 14 },
  puntos: { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  puntosTexto: { color: '#334155', fontSize: 14, fontWeight: '500' },
  seccion: { marginBottom: 4, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  dato: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14 },
  etiqueta: { color: '#0f172a', fontSize: 14, fontWeight: '500' },
  valor: { marginTop: 2, color: '#64748b', fontSize: 12 },
  edad: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14 },
  ayuda: { marginTop: 2, marginBottom: 8, color: '#64748b', fontSize: 12 },
  filaEdad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { width: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#0f172a', fontSize: 14, backgroundColor: '#ffffff' },
  guardar: { backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  guardarOff: { opacity: 0.6 },
  guardarTexto: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  ok: { marginTop: 8, color: '#2C8A6E', fontSize: 14, fontWeight: '500' },
  error: { marginTop: 8, color: '#475569', fontSize: 14 },
  atajo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  atajoTexto: { color: '#334155', fontSize: 14, fontWeight: '500' },
  atajoFlecha: { color: '#334155', fontSize: 16 },
});
