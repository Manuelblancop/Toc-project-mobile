import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { cargarPerfilMedico, guardarEspecialidad, type PerfilMedico } from '@/lib/doctor';

export default function PerfilMedicoScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [perfil, setPerfil] = useState<PerfilMedico | null>(null);
  const [especialidad, setEspecialidad] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const resultado = await cargarPerfilMedico();
      if (resultado.destino) {
        if (navegacionLista) router.replace(resultado.destino);
        return;
      }
      setPerfil(resultado.perfil);
      setEspecialidad(resultado.perfil.especialidad);
      setError('');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos cargar el perfil.');
    } finally {
      setCargando(false);
    }
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
    const resultado = await guardarEspecialidad(especialidad);
    setGuardando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos guardar la especialidad.');
      return;
    }
    setPerfil((actual) => (actual ? { ...actual, especialidad: especialidad.trim().slice(0, 80) } : actual));
    setAviso('Se guardó correctamente.');
  }

  const inicial = perfil?.nombre.trim().charAt(0).toUpperCase() || 'D';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: 12,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable accessibilityRole="button" onPress={() => router.push('/doctor')} style={styles.volver}>
        <Text style={styles.volverTexto}>← Panel</Text>
      </Pressable>

      {cargando && !perfil ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {perfil ? (
        <>
          <View style={styles.card}>
            <View style={styles.identidad}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{inicial}</Text>
              </View>
              <View style={styles.identidadTexto}>
                <Text style={styles.nombre}>Psicólogo/a {perfil.nombre}</Text>
                <Text style={styles.email}>{perfil.email}</Text>
                {perfil.verificado ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipTexto}>Especialista verificado</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.seccion}>Datos profesionales</Text>
            <Dato etiqueta="Nombre completo" valor={`Psicólogo/a ${perfil.nombre}`} />
            <Dato etiqueta="Correo" valor={perfil.email} />
            <View style={styles.campo}>
              <Text style={styles.etiqueta}>Especialidad</Text>
              <Text style={styles.ayuda}>Si lo dejás vacío, el paciente ve «Psicólogo/a clínico/a».</Text>
              <TextInput
                value={especialidad}
                onChangeText={setEspecialidad}
                maxLength={80}
                editable={!guardando}
                placeholder="Especialidad"
                placeholderTextColor="#94a3b8"
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
              {aviso ? (
                <Text style={aviso === 'Se guardó correctamente.' ? styles.ok : styles.errorCampo}>{aviso}</Text>
              ) : null}
            </View>
            {perfil.matricula ? (
              <View style={styles.dato}>
                <View style={styles.datoTexto}>
                  <Text style={styles.etiqueta}>Matrícula</Text>
                  <Text style={styles.valor}>{perfil.matricula}</Text>
                </View>
                {perfil.verificado ? <Text style={styles.verificada}>Verificada</Text> : null}
              </View>
            ) : null}
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
  volver: { alignSelf: 'flex-start', marginBottom: 12 },
  volverTexto: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  carga: { marginTop: 40, alignItems: 'center' },
  error: { marginTop: 12, color: '#475569', fontSize: 14 },
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
  },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  avatarTexto: { color: '#ffffff', fontSize: 26, fontWeight: '600' },
  identidadTexto: { flex: 1 },
  nombre: { color: '#0f172a', fontSize: 22, fontWeight: '600' },
  email: { marginTop: 2, color: '#64748b', fontSize: 14 },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTexto: { color: '#334155', fontSize: 12, fontWeight: '500' },
  seccion: { marginBottom: 4, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
  },
  datoTexto: { flex: 1 },
  etiqueta: { color: '#0f172a', fontSize: 14, fontWeight: '500' },
  valor: { marginTop: 2, color: '#64748b', fontSize: 12 },
  campo: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14 },
  ayuda: { marginTop: 2, marginBottom: 8, color: '#64748b', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  guardar: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  guardarOff: { opacity: 0.6 },
  guardarTexto: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  ok: { marginTop: 8, color: '#2C8A6E', fontSize: 14, fontWeight: '500' },
  errorCampo: { marginTop: 8, color: '#dc2626', fontSize: 14 },
  verificada: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
});
