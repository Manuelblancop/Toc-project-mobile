import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import {
  cargarDisponibilidad,
  cargarPerfilMedico,
  guardarDisponibilidad,
  guardarEspecialidad,
  type HorarioSemanal,
  type PerfilMedico,
} from '@/lib/doctor';

const DIAS = [
  { diaSemana: 1, nombre: 'Lunes' },
  { diaSemana: 2, nombre: 'Martes' },
  { diaSemana: 3, nombre: 'Miércoles' },
  { diaSemana: 4, nombre: 'Jueves' },
  { diaSemana: 5, nombre: 'Viernes' },
  { diaSemana: 6, nombre: 'Sábado' },
  { diaSemana: 0, nombre: 'Domingo' },
] as const;

type ReglaDia = {
  diaSemana: number;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

function horaEnPunto(valor: string, respaldo: string) {
  const hora = Number(valor.trim().slice(0, 2));
  if (!Number.isInteger(hora) || hora < 0 || hora > 23) return respaldo;
  return `${String(hora).padStart(2, '0')}:00`;
}

function reglasDesde(guardadas: HorarioSemanal[]): ReglaDia[] {
  const porDia = new Map(guardadas.map((horario) => [horario.diaSemana, horario]));
  const hayGuardadas = guardadas.length > 0;
  return DIAS.map((dia) => {
    const guardada = porDia.get(dia.diaSemana);
    if (guardada) {
      return {
        diaSemana: dia.diaSemana,
        nombre: dia.nombre,
        horaInicio: horaEnPunto(guardada.horaInicio, '09:00'),
        horaFin: horaEnPunto(guardada.horaFin, '18:00'),
        activo: guardada.activo,
      };
    }
    const laboral = dia.diaSemana >= 1 && dia.diaSemana <= 5;
    return {
      diaSemana: dia.diaSemana,
      nombre: dia.nombre,
      horaInicio: '09:00',
      horaFin: '18:00',
      activo: hayGuardadas ? false : laboral,
    };
  });
}

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
            <DisponibilidadSemanal />
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

function DisponibilidadSemanal() {
  const [dias, setDias] = useState<ReglaDia[] | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const resultado = await cargarDisponibilidad();
    if ('error' in resultado) {
      setError(resultado.error ?? 'No pudimos cargar tus horarios.');
      setDias(null);
      return;
    }
    setDias(reglasDesde(resultado.horarios));
    setError('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  function actualizar(diaSemana: number, cambio: Partial<ReglaDia>) {
    setDias((actual) => actual?.map((dia) => (dia.diaSemana === diaSemana ? { ...dia, ...cambio } : dia)) ?? actual);
  }

  async function guardar() {
    if (!dias || guardando) return;
    const normalizados = dias.map((dia) => ({
      ...dia,
      horaInicio: horaEnPunto(dia.horaInicio, '09:00'),
      horaFin: horaEnPunto(dia.horaFin, '18:00'),
    }));
    const invalido = normalizados.find((dia) => dia.activo && dia.horaInicio >= dia.horaFin);
    if (invalido) {
      setError(`En ${invalido.nombre} el inicio tiene que ser anterior al fin.`);
      return;
    }
    setDias(normalizados);
    setGuardando(true);
    setError('');
    const resultado = await guardarDisponibilidad(
      normalizados.map((dia) => ({
        diaSemana: dia.diaSemana,
        horaInicio: dia.horaInicio,
        horaFin: dia.horaFin,
        activo: dia.activo,
      })),
    );
    setGuardando(false);
    if ('error' in resultado) {
      setError(resultado.error ?? 'No pudimos guardar tus horarios.');
      return;
    }
    Alert.alert('Disponibilidad guardada.');
  }

  return (
    <View style={styles.disponibilidad}>
      <Text style={styles.seccion}>Mi Disponibilidad Semanal</Text>
      <Text style={styles.ayuda}>Marcá los días que atendés y el horario de cada uno. Los turnos se ofrecen de a una hora.</Text>
      {dias == null && !error ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {dias?.map((dia) => (
        <View key={dia.diaSemana} style={styles.dia}>
          <View style={styles.diaFila}>
            <Text style={styles.etiqueta}>{dia.nombre}</Text>
            <Switch
              accessibilityLabel={`${dia.nombre} atiende`}
              value={dia.activo}
              onValueChange={(activo) => actualizar(dia.diaSemana, { activo })}
              trackColor={{ false: '#e2e8f0', true: '#5DCAA5' }}
              thumbColor="#ffffff"
            />
          </View>
          {dia.activo ? (
            <View style={styles.horas}>
              <View style={styles.horaCampo}>
                <Text style={styles.horaEtiqueta}>Desde</Text>
                <TextInput
                  value={dia.horaInicio}
                  onChangeText={(horaInicio) => actualizar(dia.diaSemana, { horaInicio })}
                  onEndEditing={() => actualizar(dia.diaSemana, { horaInicio: horaEnPunto(dia.horaInicio, '09:00') })}
                  placeholder="09:00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={styles.horaInput}
                />
              </View>
              <View style={styles.horaCampo}>
                <Text style={styles.horaEtiqueta}>Hasta</Text>
                <TextInput
                  value={dia.horaFin}
                  onChangeText={(horaFin) => actualizar(dia.diaSemana, { horaFin })}
                  onEndEditing={() => actualizar(dia.diaSemana, { horaFin: horaEnPunto(dia.horaFin, '18:00') })}
                  placeholder="18:00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={styles.horaInput}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.noAtiende}>No atiende</Text>
          )}
        </View>
      ))}
      {error ? <Text style={styles.errorCampo}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={guardando || dias == null}
        onPress={() => void guardar()}
        style={[styles.disponibilidadBoton, (guardando || dias == null) && styles.guardarOff]}
      >
        <Text style={styles.disponibilidadBotonTexto}>{guardando ? 'Guardando…' : 'Guardar Disponibilidad'}</Text>
      </Pressable>
    </View>
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
  disponibilidad: { marginTop: 8, paddingTop: 8 },
  dia: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  diaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  horas: { flexDirection: 'row', gap: 12, marginTop: 10 },
  horaCampo: { flex: 1 },
  horaEtiqueta: { marginBottom: 4, color: '#64748b', fontSize: 12 },
  horaInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  noAtiende: { marginTop: 6, color: '#94a3b8', fontSize: 14 },
  disponibilidadBoton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disponibilidadBotonTexto: { color: '#12382E', fontSize: 14, fontWeight: '600' },
});
