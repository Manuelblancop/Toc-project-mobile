import { router, useFocusEffect, useLocalSearchParams, useRootNavigationState } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoPausaAura } from '@/components/doctor/aviso-pausa';
import { EmeraldSpinner } from '@/components/emerald-spinner';
import { GraficoEvolucion } from '@/components/paciente/grafico-evolucion';
import {
  cargarFichaPaciente,
  csvDeHistorial,
  guardarNotaClinica,
  guardarNotaDePaciente,
  nombreCsv,
  rehabilitarChat,
  asignarEjercicioPaciente,
  eliminarEjercicioAsignado,
  type FichaPaciente,
} from '@/lib/doctor';

const DIFICULTAD = {
  Fácil: { fondo: '#E7F6F0', texto: '#2C8A6E' },
  Medio: { fondo: '#5DCAA5', texto: '#12382E' },
  Difícil: { fondo: '#12382E', texto: '#E7F6F0' },
} as const;

export default function FichaPacienteScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const { id } = useLocalSearchParams<{ id: string }>();
  const pacienteId = typeof id === 'string' ? id : '';
  const [ficha, setFicha] = useState<FichaPaciente | null>(null);
  const [turnoId, setTurnoId] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [rehabilitando, setRehabilitando] = useState(false);
  const turnoElegido = useRef('');

  const cargar = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const resultado = await cargarFichaPaciente(pacienteId);
      if (resultado.destino) {
        if (navegacionLista) router.replace(resultado.destino);
        return;
      }
      setFicha(resultado.ficha);
      const elegido = turnoElegido.current || resultado.ficha?.turnos[0]?.id || '';
      turnoElegido.current = elegido;
      setTurnoId(elegido);
      setTexto(resultado.ficha?.notas.find((nota) => nota.turnoId === elegido)?.contenido ?? '');
      setError(resultado.ficha ? '' : 'No encontramos a ese paciente.');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos cargar la ficha.');
    } finally {
      setCargando(false);
    }
  }, [navegacionLista, pacienteId]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  function quitarEjercicio(ejercicioId: string) {
    setFicha((actual) =>
      actual
        ? { ...actual, ejercicios: actual.ejercicios.filter((ejercicio) => ejercicio.id !== ejercicioId) }
        : actual,
    );
  }

  const notaActual = ficha?.notas.find((nota) => nota.turnoId === turnoId) ?? null;

  async function guardar() {
    if (!ficha || guardando) return;
    setGuardando(true);
    setAviso('');
    const resultado = turnoId
      ? await guardarNotaClinica(pacienteId, turnoId, texto)
      : await guardarNotaDePaciente(pacienteId, texto);
    setGuardando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos guardar la nota.');
      return;
    }
    setTexto('');
    await cargar();
  }

  async function rehabilitar() {
    if (rehabilitando) return;
    setRehabilitando(true);
    setAviso('');
    const resultado = await rehabilitarChat(pacienteId);
    setRehabilitando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos rehabilitar el chat.');
      return;
    }
    setFicha((actual) => (actual ? { ...actual, pausa: null } : actual));
  }

  async function exportar() {
    if (!ficha || ficha.filasCsv.length === 0) return;
    await Share.share({
      title: nombreCsv(ficha.nombre),
      message: csvDeHistorial(ficha.filasCsv),
    });
  }

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
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{(ficha?.nombre ?? 'P').trim().charAt(0).toUpperCase() || 'P'}</Text>
        </View>
        <Text style={styles.headerTitulo}>Historia clínica de paciente {ficha?.nombre ?? 'Paciente'}</Text>
      </View>
      {ficha && ficha.filasCsv.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => void exportar()} style={styles.csv}>
          <Text style={styles.csvTexto}>Exportar Historial (CSV)</Text>
        </Pressable>
      ) : null}

      {cargando && !ficha ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

      {ficha?.pausa ? (
        <View style={styles.bloque}>
          <AvisoPausaAura pausa={ficha.pausa}>
            <Pressable
              accessibilityRole="button"
              disabled={rehabilitando}
              onPress={() => void rehabilitar()}
              style={styles.rehabilitar}
            >
              <Text style={styles.rehabilitarTexto}>
                {rehabilitando ? 'Rehabilitando…' : 'Rehabilitar chat de Aura'}
              </Text>
            </Pressable>
          </AvisoPausaAura>
        </View>
      ) : null}

      {ficha ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Contexto</Text>
            <View style={styles.triage}>
              <Text style={styles.triageTitulo}>Motivo de consulta / Triage</Text>
              <Text style={styles.triageTexto}>
                {ficha.triage?.trim() || 'El paciente todavía no escribió un motivo de consulta.'}
              </Text>
            </View>
            <Text style={styles.subtitulo}>Evolución emocional</Text>
            <GraficoEvolucion datos={ficha.puntos} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Historia clínica</Text>
            <Text style={styles.subtitulo}>Sesiones ERP</Text>
            {ficha.sesiones.length === 0 ? (
              <Text style={styles.vacio}>Este paciente todavía no tiene sesiones ERP registradas.</Text>
            ) : (
              <View style={styles.lista}>
                {ficha.sesiones.map((sesion) => {
                  const alerta = sesion.ansiedad >= 4;
                  return (
                    <View key={sesion.id} style={[styles.sesion, alerta ? styles.sesionAlta : styles.sesionNormal]}>
                      <View style={styles.turnoTexto}>
                        <Text style={styles.nombre}>{sesion.nombre}</Text>
                        <Text style={styles.consulta}>{sesion.fecha}</Text>
                        {alerta ? <Text style={styles.ansiedadAviso}>Ansiedad alta</Text> : null}
                      </View>
                      <Text style={[styles.ansiedad, alerta && styles.ansiedadNumeroAlta]}>{sesion.ansiedad}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.subtitulo}>Notas clínicas</Text>
              {ficha.turnos.length > 0 ? (
                <View style={styles.turnos}>
                  {ficha.turnos.map((turno) => {
                    const activo = turno.id === turnoId;
                    return (
                      <Pressable
                        key={turno.id}
                        accessibilityRole="button"
                        onPress={() => {
                          turnoElegido.current = turno.id;
                          setTurnoId(turno.id);
                          const previa = ficha.notas.find((nota) => nota.turnoId === turno.id);
                          setTexto(previa?.contenido ?? '');
                        }}
                        style={[styles.chip, activo && styles.chipActivo]}
                      >
                        <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{turno.etiqueta}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <TextInput
                value={texto}
                onChangeText={setTexto}
                editable={!guardando}
                multiline
                placeholder="Escribí una observación clínica..."
                placeholderTextColor="#64748b"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                disabled={guardando || !texto.trim()}
                onPress={() => void guardar()}
                style={[styles.guardar, (guardando || !texto.trim()) && styles.guardarOff]}
              >
                <Text style={styles.guardarTexto}>
                  {guardando ? 'Guardando...' : notaActual ? 'Actualizar nota' : 'Guardar nota'}
                </Text>
              </Pressable>
              <View style={styles.listaNotas}>
                {ficha.notas.length === 0 ? (
                  <Text style={styles.vacio}>Todavía no hay notas para este paciente.</Text>
                ) : (
                  ficha.notas.map((nota) => (
                    <View key={nota.id} style={styles.nota}>
                      <Text style={styles.notaTexto}>{nota.contenido}</Text>
                      <Text style={styles.notaFecha}>{nota.fecha}</Text>
                    </View>
                  ))
                )}
              </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.gestion}>Gestión</Text>
            <Text style={styles.cardTitulo}>Asignación de Ejercicios ERP</Text>
            <Text style={styles.cuerpo}>
              Panel para recetar y seguir ejercicios. No forma parte de la historia clínica.
            </Text>
            <SeccionErp ficha={ficha} pacienteId={pacienteId} onAsignado={cargar} onEliminado={quitarEjercicio} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const DIFICULTADES = ['Fácil', 'Medio', 'Difícil'] as const;

function SeccionErp({
  ficha,
  pacienteId,
  onAsignado,
  onEliminado,
}: {
  ficha: FichaPaciente;
  pacienteId: string;
  onAsignado: () => Promise<void>;
  onEliminado: (ejercicioId: string) => void;
}) {
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  function pedirEliminar(ejercicioId: string) {
    if (eliminandoId) return;
    Alert.alert('Eliminar ejercicio', '¿Querés eliminar este ejercicio asignado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => void confirmarEliminar(ejercicioId),
      },
    ]);
  }

  async function confirmarEliminar(ejercicioId: string) {
    setEliminandoId(ejercicioId);
    setErrorEliminar('');
    const resultado = await eliminarEjercicioAsignado(ejercicioId);
    setEliminandoId(null);
    if ('error' in resultado) {
      setErrorEliminar(resultado.error ?? 'No pudimos eliminar el ejercicio.');
      return;
    }
    onEliminado(ejercicioId);
  }

  return (
    <View>
      {errorEliminar ? <Text style={styles.error}>{errorEliminar}</Text> : null}
      {ficha.ejercicios.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.vacio}>Este paciente todavía no tiene ejercicios asignados.</Text>
        </View>
      ) : (
        <View style={styles.lista}>
          {ficha.ejercicios.map((ejercicio) => {
            const color = DIFICULTAD[ejercicio.dificultad as keyof typeof DIFICULTAD] ?? DIFICULTAD.Medio;
            return (
              <View key={ejercicio.id} style={styles.card}>
                <View style={styles.fila}>
                  <View style={[styles.pill, { backgroundColor: color.fondo }]}>
                    <Text style={[styles.pillTexto, { color: color.texto }]}>{ejercicio.dificultad}</Text>
                  </View>
                  <Text style={styles.meta}>{ejercicio.dia} · {ejercicio.duracion}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar ejercicio"
                    disabled={eliminandoId === ejercicio.id}
                    onPress={() => pedirEliminar(ejercicio.id)}
                    style={[styles.papelera, eliminandoId === ejercicio.id && styles.papeleraOff]}
                  >
                    <Text style={styles.papeleraIcono}>🗑</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardTitulo}>{ejercicio.titulo}</Text>
                <Text style={styles.cuerpo}>{ejercicio.descripcion}</Text>
                <Text style={styles.estado}>
                  {ejercicio.completado ? `Completado · ${ejercicio.ansiedad}` : 'Pendiente'}
                </Text>
                <Text style={styles.feedback}>Feedback: {ejercicio.feedback}</Text>
              </View>
            );
          })}
        </View>
      )}
      <FormularioAsignar pacienteId={pacienteId} onAsignado={onAsignado} />
    </View>
  );
}

function FormularioAsignar({
  pacienteId,
  onAsignado,
}: {
  pacienteId: string;
  onAsignado: () => Promise<void>;
}) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [dia, setDia] = useState<(typeof DIAS)[number]>('Lunes');
  const [dificultad, setDificultad] = useState<(typeof DIFICULTADES)[number]>('Fácil');
  const [minutos, setMinutos] = useState('10');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function asignar() {
    if (guardando) return;
    setGuardando(true);
    setError('');
    const resultado = await asignarEjercicioPaciente({
      pacienteId,
      titulo,
      descripcion,
      diaAsignado: dia,
      dificultad,
      minutos: Number(minutos),
    });
    setGuardando(false);
    if ('error' in resultado) {
      setError(resultado.error ?? 'No se pudo asignar el ejercicio.');
      return;
    }
    setTitulo('');
    setDescripcion('');
    setDia('Lunes');
    setDificultad('Fácil');
    setMinutos('10');
    await onAsignado();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitulo}>Nuevo ejercicio</Text>
      <Text style={styles.cuerpo}>
        Recetá una exposición para un día y una dificultad. Cuando el paciente la cierre, vas a ver su ansiedad y su comentario.
      </Text>
      <Text style={styles.campoEtiqueta}>Título</Text>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        maxLength={120}
        editable={!guardando}
        style={styles.inputLinea}
      />
      <Text style={styles.campoEtiqueta}>Descripción</Text>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        maxLength={2000}
        editable={!guardando}
        multiline
        style={styles.input}
      />
      <Text style={styles.campoEtiqueta}>Día asignado</Text>
      <View style={styles.opciones}>
        {DIAS.map((opcion) => {
          const activo = opcion === dia;
          return (
            <Pressable
              key={opcion}
              accessibilityRole="button"
              onPress={() => setDia(opcion)}
              style={[styles.chip, activo && styles.chipActivo]}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.campoEtiqueta}>Dificultad</Text>
      <View style={styles.opciones}>
        {DIFICULTADES.map((opcion) => {
          const activo = opcion === dificultad;
          return (
            <Pressable
              key={opcion}
              accessibilityRole="button"
              onPress={() => setDificultad(opcion)}
              style={[styles.chip, activo && styles.chipActivo]}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{opcion}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.campoEtiqueta}>Duración (minutos)</Text>
      <TextInput
        value={minutos}
        onChangeText={setMinutos}
        editable={!guardando}
        keyboardType="number-pad"
        style={styles.inputLinea}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={guardando}
        onPress={() => void asignar()}
        style={[styles.asignar, guardando && styles.guardarOff]}
      >
        <Text style={styles.asignarTexto}>{guardando ? 'Guardando...' : 'Asignar Ejercicio'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  volver: { alignSelf: 'flex-start', marginBottom: 8 },
  volverTexto: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  header: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064e3b',
  },
  avatarTexto: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  headerTitulo: { flex: 1, color: '#0f172a', fontSize: 18, fontWeight: '600' },
  csv: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#5DCAA5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  csvTexto: { color: '#12382E', fontSize: 14, fontWeight: '600' },
  carga: { marginTop: 40, alignItems: 'center' },
  error: { marginTop: 12, color: '#475569', fontSize: 14 },
  aviso: { marginTop: 12, color: '#475569', fontSize: 14 },
  bloque: { marginTop: 16 },
  rehabilitar: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rehabilitarTexto: { color: '#334155', fontSize: 14, fontWeight: '500' },
  triage: { marginTop: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 16 },
  triageTitulo: { color: '#92400e', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  triageTexto: { marginTop: 6, color: '#451a03', fontSize: 14 },
  subtitulo: { marginTop: 16, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  gestion: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  lista: { marginTop: 10, gap: 10 },
  sesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sesionNormal: { borderLeftColor: '#2563eb' },
  sesionAlta: { borderLeftColor: '#ef4444' },
  ansiedad: { color: '#0f172a', fontSize: 20, fontWeight: '600' },
  ansiedadNumeroAlta: { color: '#dc2626' },
  ansiedadAviso: { marginTop: 2, color: '#dc2626', fontSize: 12, fontWeight: '600' },
  card: { marginTop: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16 },
  cardKicker: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  cardTitulo: { marginTop: 4, color: '#0f172a', fontSize: 18, fontWeight: '600' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillTexto: { fontSize: 12, fontWeight: '600' },
  meta: { flex: 1, color: '#64748b', fontSize: 12 },
  papelera: { borderRadius: 8, padding: 8 },
  papeleraOff: { opacity: 0.5 },
  papeleraIcono: { fontSize: 16, color: '#94a3b8' },
  cuerpo: { marginTop: 8, color: '#475569', fontSize: 14, lineHeight: 20 },
  estado: { marginTop: 10, color: '#3d6b52', fontSize: 14, fontWeight: '600' },
  feedback: { marginTop: 4, color: '#334155', fontSize: 14 },
  vacio: { color: '#64748b', fontSize: 14 },
  emocion: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 14 },
  emoji: { fontSize: 28 },
  turnoTexto: { flex: 1 },
  nombre: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  consulta: { marginTop: 2, color: '#64748b', fontSize: 12 },
  turnos: { marginTop: 12, gap: 8 },
  chip: { borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8 },
  chipActivo: { borderColor: '#064e3b', backgroundColor: '#E7F6F0' },
  chipTexto: { color: '#334155', fontSize: 13 },
  chipTextoActivo: { color: '#064e3b', fontWeight: '600' },
  input: {
    marginTop: 12,
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    color: '#0f172a',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  inputLinea: {
    marginTop: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  guardar: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#5DCAA5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  guardarOff: { backgroundColor: '#e2e8f0' },
  asignar: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#5a8a6e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  asignarTexto: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  campoEtiqueta: { marginTop: 12, color: '#0f172a', fontSize: 14, fontWeight: '500' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  guardarTexto: { color: '#12382E', fontSize: 14, fontWeight: '600' },
  listaNotas: { marginTop: 16, gap: 10 },
  nota: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  notaTexto: { color: '#0f172a', fontSize: 14 },
  notaFecha: { marginTop: 6, color: '#64748b', fontSize: 12 },
});
