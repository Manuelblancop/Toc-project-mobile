import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoPausaAura } from '@/components/doctor/aviso-pausa';
import { BadgeTurno } from '@/components/doctor/badge-turno';
import { EmeraldSpinner } from '@/components/emerald-spinner';
import {
  COMISION_POR_CONSULTA,
  TICKET_BASE,
  cargarPanelDoctor,
  guardarNotaClinica,
  ocultarTurnoDeDoctor,
  pesos,
  reputacionDe,
  type PanelDoctor,
  type TurnoAgenda,
} from '@/lib/doctor';

function etiquetaTurnos(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? 'turno' : 'turnos'}`;
}

function abrirFicha(pacienteId: string) {
  router.push({ pathname: '/doctor/paciente/[id]', params: { id: pacienteId } });
}

export default function DoctorHomeScreen() {
  const insets = useSafeAreaInsets();
  const navegacionLista = Boolean(useRootNavigationState()?.key);
  const [panel, setPanel] = useState<PanelDoctor | null>(null);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [cargando, setCargando] = useState(true);
  const [verCompletadas, setVerCompletadas] = useState(false);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [ocultandoId, setOcultandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const resultado = await cargarPanelDoctor();
      if (resultado.destino) {
        if (navegacionLista) router.replace(resultado.destino);
        return;
      }
      setPanel(resultado.panel);
      setError('');
      setErrorCarga('');
    } catch (causa) {
      setErrorCarga(causa instanceof Error ? causa.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }, [navegacionLista]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const agenda = panel?.agenda ?? [];
  const pendientes = agenda.filter((turno) => turno.estado === 'PENDIENTE' || turno.estado === 'CONFIRMADO');
  const completadas = agenda.filter((turno) => turno.estado === 'COMPLETADO');
  const canceladas = agenda.filter((turno) => turno.estado === 'CANCELADO');

  function pedirOcultar(turnoId: string) {
    if (ocultandoId) return;
    Alert.alert('Ocultar turno', '¿Querés ocultar este turno de tu agenda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Ocultar',
        style: 'destructive',
        onPress: () => void confirmarOcultar(turnoId),
      },
    ]);
  }

  async function confirmarOcultar(turnoId: string) {
    setOcultandoId(turnoId);
    setError('');
    const resultado = await ocultarTurnoDeDoctor(turnoId);
    setOcultandoId(null);
    if ('error' in resultado) {
      setError(resultado.error ?? 'No pudimos ocultar el turno.');
      return;
    }
    setPanel((actual) => {
      if (!actual) return actual;
      const agenda = actual.agenda.filter((turno) => turno.id !== turnoId);
      const pacientes = new Map<string, (typeof agenda)[number]>();
      for (const turno of agenda) {
        if (!pacientes.has(turno.pacienteId)) pacientes.set(turno.pacienteId, turno);
      }
      return {
        ...actual,
        agenda,
        pacientes: [...pacientes.values()]
          .map((turno) => ({ id: turno.pacienteId, nombre: turno.pacienteNombre, pausa: turno.pausa }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      };
    });
  }

  function guardarNotaEnPanel(turnoId: string, notaId: string, contenido: string) {
    setPanel((actual) =>
      actual
        ? {
            ...actual,
            agenda: actual.agenda.map((turno) =>
              turno.id === turnoId ? { ...turno, notaId, nota: contenido } : turno,
            ),
          }
        : actual,
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
    >
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.kicker}>Panel clínico</Text>
          <Text style={styles.titulo}>Psicólogo/a {panel?.nombre ?? '…'}</Text>
        </View>
      </View>

      {cargando && !panel ? (
        <View style={styles.carga}>
          <EmeraldSpinner />
        </View>
      ) : null}
      {errorCarga ? (
        <View>
          <Text style={styles.error}>No pudimos cargar el panel</Text>
          <Text style={styles.errorDetalle}>{errorCarga}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {panel ? (
        <>
          <View style={styles.kpis}>
            <Kpi etiqueta="Ticket base facturado" valor={pesos(panel.facturado)} />
            <Kpi etiqueta="Comisión 12% del ticket" valor={pesos(panel.comision)} />
            <Kpi etiqueta="Neto estimado" valor={pesos(panel.neto)} />
            <Kpi etiqueta="Reputación" valor={reputacionDe(panel.reputacion)} />
          </View>
          <Text style={styles.notaKpi}>
            {pesos(COMISION_POR_CONSULTA)} por consulta de {pesos(TICKET_BASE)}. La tarifa de servicio del
            paciente no entra en este margen.
          </Text>
          <Text style={styles.activos}>{panel.pacientesActivos} pacientes activos</Text>

          <Text style={styles.seccion}>Agenda · Viernes 13/11/2026</Text>
          {agenda.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.vacio}>No hay turnos confirmados para hoy.</Text>
            </View>
          ) : (
            <>
              {pendientes.length > 0 ? (
                <View style={styles.grupo}>
                  <Text style={styles.grupoTitulo}>Pendientes de hoy</Text>
                  {pendientes.map((turno) => (
                    <TarjetaTurno
                      key={turno.id}
                      turno={turno}
                      onPress={() => abrirFicha(turno.pacienteId)}
                    />
                  ))}
                </View>
              ) : null}
              {completadas.length > 0 ? (
                <Acordeon
                  titulo={`Ver completadas (${etiquetaTurnos(completadas.length)})`}
                  abierto={verCompletadas}
                  onPress={() => setVerCompletadas((abierto) => !abierto)}
                >
                  {completadas.map((turno) => (
                    <TarjetaTurno
                      key={turno.id}
                      turno={turno}
                      onPress={() => abrirFicha(turno.pacienteId)}
                      onNotaGuardada={(notaId, contenido) => guardarNotaEnPanel(turno.id, notaId, contenido)}
                      ocultando={ocultandoId === turno.id}
                      onOcultar={() => pedirOcultar(turno.id)}
                    />
                  ))}
                </Acordeon>
              ) : null}
              {canceladas.length > 0 ? (
                <Acordeon
                  titulo={`Ver canceladas (${etiquetaTurnos(canceladas.length)})`}
                  abierto={verCanceladas}
                  onPress={() => setVerCanceladas((abierto) => !abierto)}
                >
                  {canceladas.map((turno) => (
                    <TarjetaTurno
                      key={turno.id}
                      turno={turno}
                      onPress={() => abrirFicha(turno.pacienteId)}
                      ocultando={ocultandoId === turno.id}
                      onOcultar={() => pedirOcultar(turno.id)}
                    />
                  ))}
                </Acordeon>
              ) : null}
            </>
          )}

          <Text style={styles.seccion}>Mis pacientes</Text>
          {panel.pacientes.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.vacio}>Todavía no tenés pacientes con turnos.</Text>
            </View>
          ) : (
            panel.pacientes.map((paciente) => (
              <Pressable
                key={paciente.id}
                accessibilityRole="button"
                onPress={() => abrirFicha(paciente.id)}
                style={styles.card}
              >
                <Text style={styles.nombre}>{paciente.nombre}</Text>
                {paciente.pausa ? (
                  <View style={styles.pausa}>
                    <AvisoPausaAura pausa={paciente.pausa} />
                  </View>
                ) : null}
              </Pressable>
            ))
          )}

          <Text style={styles.seccion}>Notas clínicas</Text>
          <ModuloNotas agenda={agenda} onGuardada={guardarNotaEnPanel} />
        </>
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModuloNotas({
  agenda,
  onGuardada,
}: {
  agenda: TurnoAgenda[];
  onGuardada: (turnoId: string, notaId: string, contenido: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [turnoId, setTurnoId] = useState('');
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [ok, setOk] = useState(false);
  const elegido = agenda.find((turno) => turno.id === turnoId) ?? null;

  function elegir(turno: TurnoAgenda) {
    setTurnoId(turno.id);
    setTexto(turno.nota);
    setOk(false);
    setAviso('');
    setAbierto(false);
  }

  async function guardar() {
    if (guardando || !elegido || !texto.trim()) return;
    setGuardando(true);
    setOk(false);
    setAviso('');
    const resultado = await guardarNotaClinica(elegido.pacienteId, elegido.id, texto);
    setGuardando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos guardar la nota.');
      return;
    }
    const limpio = texto.trim();
    setTexto(limpio);
    setOk(true);
    onGuardada(elegido.id, resultado.notaId, limpio);
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => setAbierto(true)} style={styles.selector}>
        <Text style={elegido ? styles.selectorTexto : styles.selectorPlaceholder}>
          {elegido ? `${elegido.pacienteNombre} - ${elegido.hora}` : 'Seleccioná un paciente de hoy...'}
        </Text>
      </Pressable>
      <TextInput
        value={texto}
        onChangeText={(valor) => {
          setTexto(valor);
          setOk(false);
        }}
        editable={!guardando}
        multiline
        placeholder="Escribí la evolución clínica acá..."
        placeholderTextColor="#64748b"
        textAlignVertical="top"
        style={styles.notaClinicaInput}
      />
      <Pressable
        accessibilityRole="button"
        disabled={guardando || !elegido || !texto.trim()}
        onPress={() => void guardar()}
        style={[styles.notaBoton, (guardando || !elegido || !texto.trim()) && styles.notaBotonOff]}
      >
        <Text style={[styles.notaBotonTexto, (guardando || !elegido || !texto.trim()) && styles.notaBotonTextoOff]}>
          {guardando ? 'Guardando...' : 'Guardar Nota'}
        </Text>
      </Pressable>
      {aviso ? <Text style={styles.notaError}>{aviso}</Text> : null}
      {ok ? <Text style={styles.notaOk}>Nota guardada.</Text> : null}

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable accessibilityRole="button" onPress={() => setAbierto(false)} style={styles.selectorFondo}>
          <Pressable style={styles.selectorDialogo} onPress={() => {}}>
            <Text style={styles.selectorTitulo}>Seleccioná un paciente de hoy...</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.selectorLista}>
              {agenda.length === 0 ? (
                <Text style={styles.vacio}>No hay turnos en la agenda.</Text>
              ) : (
                agenda.map((turno) => (
                  <Pressable
                    key={turno.id}
                    accessibilityRole="button"
                    onPress={() => elegir(turno)}
                    style={styles.selectorOpcion}
                  >
                    <Text style={styles.selectorTexto}>{turno.pacienteNombre} - {turno.hora}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Acordeon({
  titulo,
  abierto,
  onPress,
  children,
}: {
  titulo: string;
  abierto: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.grupo}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.acordeon}>
        <Text style={styles.grupoTitulo}>
          {titulo} {abierto ? '▲' : '▼'}
        </Text>
      </Pressable>
      {abierto ? children : null}
    </View>
  );
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiEtiqueta}>{etiqueta}</Text>
      <Text style={styles.kpiValor}>{valor}</Text>
    </View>
  );
}

function TarjetaTurno({
  turno,
  onPress,
  onNotaGuardada,
  onOcultar,
  ocultando,
}: {
  turno: TurnoAgenda;
  onPress: () => void;
  onNotaGuardada?: (notaId: string, contenido: string) => void;
  onOcultar?: () => void;
  ocultando?: boolean;
}) {
  const conNota = turno.estado === 'COMPLETADO';

  return (
    <View style={styles.card}>
      <View style={styles.filaTurno}>
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.turnoToque}>
          <Text style={styles.hora}>{turno.hora}</Text>
          <View style={styles.turnoTexto}>
            <Text style={styles.nombre}>{turno.pacienteNombre}</Text>
            <Text style={styles.consulta}>Consulta</Text>
          </View>
          <BadgeTurno estado={turno.estado} />
        </Pressable>
        {onOcultar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ocultar turno"
            disabled={ocultando}
            onPress={onOcultar}
            style={[styles.papelera, ocultando && styles.papeleraOff]}
          >
            <Text style={styles.papeleraIcono}>🗑</Text>
          </Pressable>
        ) : null}
      </View>
      {turno.estado === 'CONFIRMADO' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/sala/[turnoId]', params: { turnoId: turno.id } })}
          style={styles.videollamada}
        >
          <Text style={styles.videollamadaTexto}>Ingresar a videollamada</Text>
        </Pressable>
      ) : null}
      {turno.pausa ? (
        <View style={styles.pausa}>
          <AvisoPausaAura pausa={turno.pausa} />
        </View>
      ) : null}
      {turno.comentario ? (
        <View style={styles.triage}>
          <Text style={styles.triageTitulo}>Motivo de consulta / Triage</Text>
          <Text style={styles.triageTexto}>{turno.comentario}</Text>
        </View>
      ) : null}
      {conNota && onNotaGuardada ? (
        <NotaDelTurno turno={turno} onGuardada={onNotaGuardada} />
      ) : null}
    </View>
  );
}

function NotaDelTurno({
  turno,
  onGuardada,
}: {
  turno: TurnoAgenda;
  onGuardada: (notaId: string, contenido: string) => void;
}) {
  const [texto, setTexto] = useState(turno.nota);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [ok, setOk] = useState(false);

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    setOk(false);
    setAviso('');
    const resultado = await guardarNotaClinica(turno.pacienteId, turno.id, texto);
    setGuardando(false);
    if ('error' in resultado) {
      setAviso(resultado.error ?? 'No pudimos guardar la nota.');
      return;
    }
    setOk(true);
    onGuardada(resultado.notaId, texto.trim());
  }

  return (
    <View style={styles.nota}>
      <Text style={styles.notaTitulo}>Historia clínica</Text>
      <TextInput
        value={texto}
        onChangeText={(valor) => {
          setTexto(valor);
          setOk(false);
        }}
        editable={!guardando}
        multiline
        placeholder="Escribí la evolución clínica de esta sesión..."
        placeholderTextColor="#64748b"
        style={styles.notaInput}
      />
      <Pressable
        accessibilityRole="button"
        disabled={guardando || !texto.trim()}
        onPress={() => void guardar()}
        style={[styles.notaBoton, (guardando || !texto.trim()) && styles.notaBotonOff]}
      >
        <Text style={[styles.notaBotonTexto, (guardando || !texto.trim()) && styles.notaBotonTextoOff]}>
          {guardando ? 'Guardando...' : 'Guardar Nota'}
        </Text>
      </Pressable>
      {aviso ? <Text style={styles.notaError}>{aviso}</Text> : null}
      {ok ? <Text style={styles.notaOk}>Nota guardada.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  encabezadoTexto: { flex: 1 },
  kicker: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  titulo: { marginTop: 4, color: '#171717', fontSize: 24, fontWeight: '600' },
  carga: { marginTop: 48, alignItems: 'center' },
  error: { marginTop: 16, color: '#475569', fontSize: 14, fontWeight: '600' },
  errorDetalle: { marginTop: 4, color: '#475569', fontSize: 14 },
  kpis: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48%', flexGrow: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 14 },
  kpiEtiqueta: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  kpiValor: { marginTop: 6, color: '#0f172a', fontSize: 20, fontWeight: '600' },
  notaKpi: { marginTop: 10, color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  activos: { marginTop: 6, color: '#64748b', fontSize: 13 },
  seccion: { marginTop: 28, marginBottom: 12, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  grupo: { marginBottom: 8 },
  acordeon: { paddingVertical: 8 },
  grupoTitulo: { marginBottom: 8, color: '#404040', fontSize: 14, fontWeight: '500' },
  card: { marginBottom: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 16 },
  filaTurno: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  turnoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  papelera: { borderRadius: 8, padding: 8 },
  papeleraOff: { opacity: 0.5 },
  papeleraIcono: { fontSize: 16, color: '#94a3b8' },
  videollamada: { marginTop: 12, alignItems: 'center', backgroundColor: '#5DCAA5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  videollamadaTexto: { color: '#12382E', fontSize: 13, fontWeight: '700' },
  hora: { minWidth: 48, color: '#64748b', fontSize: 14, fontWeight: '600' },
  turnoTexto: { flex: 1 },
  nombre: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  consulta: { marginTop: 2, color: '#64748b', fontSize: 12 },
  pausa: { marginTop: 12 },
  triage: { marginTop: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12 },
  triageTitulo: { color: '#92400e', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  triageTexto: { marginTop: 4, color: '#451a03', fontSize: 14 },
  vacio: { color: '#64748b', fontSize: 14 },
  nota: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  notaTitulo: { marginBottom: 8, color: '#0f172a', fontSize: 14, fontWeight: '600' },
  notaInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    color: '#0f172a',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  notaBoton: {
    marginTop: 12,
    alignItems: 'center',
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingVertical: 10,
  },
  notaBotonOff: { backgroundColor: '#e2e8f0' },
  notaBotonTexto: { color: '#12382E', fontSize: 14, fontWeight: '500' },
  notaBotonTextoOff: { color: '#94a3b8' },
  notaError: { marginTop: 8, color: '#dc2626', fontSize: 14 },
  notaOk: { marginTop: 8, color: '#2563eb', fontSize: 14 },
  selector: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  selectorTexto: { color: '#0f172a', fontSize: 14 },
  selectorPlaceholder: { color: '#64748b', fontSize: 14 },
  notaClinicaInput: {
    minHeight: 160,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  selectorFondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  selectorDialogo: {
    maxHeight: '70%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
  },
  selectorTitulo: { marginBottom: 8, color: '#0f172a', fontSize: 16, fontWeight: '600' },
  selectorLista: { flexGrow: 0 },
  selectorOpcion: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14 },
});
