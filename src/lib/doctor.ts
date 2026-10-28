import { EMOJIS_ANIMO } from '@/lib/emociones';
import { etiquetaDuracion } from '@/lib/erp';
import { horaArgentina } from '@/lib/agenda';
import { supabase } from '@/lib/supabase';

export const TICKET_BASE = 30000;
export const COMISION_POR_CONSULTA = Math.round(TICKET_BASE * 0.12);
export const NETO_ESTIMADO = TICKET_BASE - COMISION_POR_CONSULTA;

const FIN_DIA = '2026-11-14T00:00:00-03:00';
const ZONA = 'America/Argentina/Buenos_Aires';

export type PausaAura = { ocurridoEn: string | null };

export type TurnoAgenda = {
  id: string;
  hora: string;
  pacienteId: string;
  pacienteNombre: string;
  estado: string;
  comentario: string | null;
  pausa: PausaAura | null;
  notaId: string | null;
  nota: string;
};

export type PacienteAgenda = {
  id: string;
  nombre: string;
  pausa: PausaAura | null;
};

export type PanelDoctor = {
  nombre: string;
  reputacion: number | null;
  pacientesActivos: number;
  facturado: number;
  comision: number;
  neto: number;
  agenda: TurnoAgenda[];
  pacientes: PacienteAgenda[];
};

export type EjercicioFicha = {
  id: string;
  titulo: string;
  descripcion: string;
  dia: string;
  dificultad: string;
  duracion: string;
  completado: boolean;
  ansiedad: string;
  feedback: string;
};

export type EmocionFicha = {
  id: string;
  emoji: string;
  etiqueta: string;
  fecha: string;
};

export type NotaFicha = {
  id: string;
  turnoId: string;
  contenido: string;
  fecha: string;
};

export type TurnoNota = {
  id: string;
  etiqueta: string;
  estado: string;
  fecha: string;
};

export type FilaCsv = {
  fecha: string;
  estado: string;
  notas: string;
};

export type FichaPaciente = {
  nombre: string;
  triage: string | null;
  pausa: PausaAura | null;
  ejercicios: EjercicioFicha[];
  emociones: EmocionFicha[];
  notas: NotaFicha[];
  turnos: TurnoNota[];
  filasCsv: FilaCsv[];
};

export function pesos(valor: number) {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

export function reputacionDe(promedio: number | null) {
  if (promedio == null || !Number.isFinite(promedio) || promedio <= 0) {
    return 'Sin calificaciones';
  }
  return `${promedio.toFixed(1)} ⭐`;
}

export function fechaPausaArgentina(iso: string | null) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: ZONA,
  });
}

function fechaCorta(iso: string | null) {
  if (!iso) return 'Fecha no registrada';
  const soloDia = /^(\d{4}-\d{2}-\d{2})$/.exec(iso.slice(0, 10));
  if (soloDia && !iso.includes('T')) {
    const fecha = new Date(`${soloDia[1]}T12:00:00-03:00`);
    return fecha.toLocaleDateString('es-AR', { dateStyle: 'short', timeZone: ZONA });
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no registrada';
  return fecha.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: ZONA,
  });
}

function idLocal() {
  return globalThis.crypto?.randomUUID?.() ?? `nota-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sesionDoctor() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { destino: '/login' as const };

  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre, rol, perfil_doctor(rating, verificado, validado_sisa)')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return { destino: '/login' as const };
  if (data.rol !== 'DOCTOR') return { destino: '/home' as const };

  const perfilRaw = data.perfil_doctor as
    | { rating: number; verificado: boolean; validado_sisa: boolean }
    | { rating: number; verificado: boolean; validado_sisa: boolean }[]
    | null;
  const perfil = Array.isArray(perfilRaw) ? (perfilRaw[0] ?? null) : perfilRaw;
  if (!perfil?.verificado || !perfil.validado_sisa) return { destino: '/doctor/pendiente' as const };

  return {
    destino: null,
    userId: user.id,
    nombre: typeof data.nombre === 'string' ? data.nombre : 'Doctor',
    rating: typeof perfil.rating === 'number' ? perfil.rating : null,
  };
}

export async function cargarPanelDoctor(): Promise<
  { destino: '/login' | '/home' | '/doctor/pendiente' } | { destino: null; panel: PanelDoctor }
> {
  const sesion = await sesionDoctor();
  if (sesion.destino) return { destino: sesion.destino };

  const metricas = await metricasDelPanel(sesion.userId);
  if ('error' in metricas) throw new Error(metricas.error);

  const [turnos, nombres, pausas] = await Promise.all([
    supabase
      .from('turnos')
      .select('id, fecha_hora, estado, paciente_id')
      .eq('doctor_id', sesion.userId)
      .eq('oculto_para_doctor', false)
      .in('estado', ['CONFIRMADO', 'COMPLETADO', 'CANCELADO'])
      .gte('fecha_hora', new Date().toISOString())
      .lt('fecha_hora', FIN_DIA)
      .order('fecha_hora', { ascending: true }),
    supabase.from('pacientes_del_doctor').select('user_id, nombre'),
    supabase.from('pausas_aura_doctor').select('paciente_id, ocurrido_en'),
  ]);

  if (turnos.error) throw new Error(turnos.error.message);
  if (nombres.error) throw new Error(nombres.error.message);
  if (pausas.error) throw new Error(pausas.error.message);

  const ids = [...new Set((turnos.data ?? []).map((turno) => String(turno.paciente_id)))];
  const perfiles = ids.length
    ? await supabase
        .from('perfil_paciente')
        .select('user_id, alerta_crisis, triage_actual')
        .in('user_id', ids)
    : { data: [], error: null };

  if (perfiles.error) throw new Error(perfiles.error.message);

  const turnoIds = (turnos.data ?? []).map((turno) => String(turno.id));
  const notas = turnoIds.length
    ? await supabase
        .from('notas_clinicas')
        .select('id, turno_id, contenido')
        .eq('doctor_id', sesion.userId)
        .in('turno_id', turnoIds)
    : { data: [], error: null };

  if (notas.error) throw new Error(notas.error.message);

  const notaDe = new Map(
    (notas.data ?? []).map((nota) => [
      String(nota.turno_id),
      { id: String(nota.id), contenido: String(nota.contenido ?? '') },
    ]),
  );

  const nombreDe = new Map(
    (nombres.data ?? []).map((fila) => [String(fila.user_id), String(fila.nombre ?? 'Paciente')]),
  );
  const pausaDe = new Map(
    (pausas.data ?? []).map((fila) => [String(fila.paciente_id), fechaPausaArgentina(fila.ocurrido_en as string | null)]),
  );
  const perfilDe = new Map(
    (perfiles.data ?? []).map((fila) => [
      String(fila.user_id),
      {
        alerta: fila.alerta_crisis === true,
        triage: typeof fila.triage_actual === 'string' ? fila.triage_actual : null,
      },
    ]),
  );

  function pausa(pacienteId: string): PausaAura | null {
    const perfil = perfilDe.get(pacienteId);
    if (!perfil?.alerta) return null;
    return { ocurridoEn: pausaDe.get(pacienteId) ?? null };
  }

  const agenda: TurnoAgenda[] = (turnos.data ?? []).map((turno) => {
    const pacienteId = String(turno.paciente_id);
    return {
      id: String(turno.id),
      hora: horaArgentina(String(turno.fecha_hora)),
      pacienteId,
      pacienteNombre: nombreDe.get(pacienteId) ?? 'Paciente',
      estado: String(turno.estado),
      comentario: perfilDe.get(pacienteId)?.triage ?? null,
      pausa: pausa(pacienteId),
      notaId: notaDe.get(String(turno.id))?.id ?? null,
      nota: notaDe.get(String(turno.id))?.contenido ?? '',
    };
  });

  const pacientesMapa = new Map<string, PacienteAgenda>();
  for (const turno of agenda) {
    if (!pacientesMapa.has(turno.pacienteId)) {
      pacientesMapa.set(turno.pacienteId, {
        id: turno.pacienteId,
        nombre: turno.pacienteNombre,
        pausa: turno.pausa,
      });
    }
  }

  const pacientes = [...pacientesMapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return {
    destino: null,
    panel: {
      nombre: sesion.nombre,
      reputacion: sesion.rating,
      pacientesActivos: metricas.pacientesActivos,
      facturado: metricas.bruto,
      comision: metricas.comision,
      neto: metricas.neto,
      agenda,
      pacientes,
    },
  };
}

async function metricasDelPanel(doctorId: string) {
  const [turnos, transacciones] = await Promise.all([
    supabase.from('turnos').select('id, precio_base, paciente_id, estado').eq('doctor_id', doctorId),
    supabase.from('transacciones').select('turno_id').eq('doctor_id', doctorId),
  ]);

  if (turnos.error) return { error: turnos.error.message };
  if (transacciones.error) return { error: transacciones.error.message };

  const cobrados = new Set((transacciones.data ?? []).map((fila) => String(fila.turno_id)));
  const facturado = (turnos.data ?? []).reduce((suma, turno) => {
    if (!cobrados.has(String(turno.id))) return suma;
    const precio = Number(turno.precio_base);
    return suma + (Number.isFinite(precio) ? precio : 0);
  }, 0);
  const comision = Math.round(facturado * 0.12);
  const pacientesActivos = new Set(
    (turnos.data ?? [])
      .filter((turno) => turno.estado === 'CONFIRMADO' || turno.estado === 'COMPLETADO')
      .map((turno) => String(turno.paciente_id)),
  ).size;

  return { bruto: facturado, comision, neto: facturado - comision, pacientesActivos };
}

export async function cargarFichaPaciente(pacienteId: string): Promise<
  { destino: '/login' | '/home' | '/doctor/pendiente' } | { destino: null; ficha: FichaPaciente | null }
> {
  const sesion = await sesionDoctor();
  if (sesion.destino) return { destino: sesion.destino };

  const [perfil, pausa, ejercicios, emociones, notas, turnos] = await Promise.all([
    supabase
      .from('perfil_paciente')
      .select('user_id, alerta_crisis, triage_actual')
      .eq('user_id', pacienteId)
      .maybeSingle(),
    supabase.from('pausas_aura_doctor').select('ocurrido_en').eq('paciente_id', pacienteId).maybeSingle(),
    supabase
      .from('ejercicios_asignados')
      .select('id, titulo, descripcion, dia_asignado, dificultad, duracion_segundos, completado, nivel_ansiedad, feedback_paciente')
      .eq('doctor_id', sesion.userId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false }),
    supabase
      .from('estados_emocionales')
      .select('id, emoji, fecha')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false }),
    supabase
      .from('notas_clinicas')
      .select('id, turno_id, contenido, fecha_creacion')
      .eq('doctor_id', sesion.userId)
      .eq('paciente_id', pacienteId)
      .order('fecha_creacion', { ascending: false }),
    supabase
      .from('turnos')
      .select('id, fecha_hora, estado')
      .eq('doctor_id', sesion.userId)
      .eq('paciente_id', pacienteId)
      .order('fecha_hora', { ascending: false }),
  ]);

  if (perfil.error || ejercicios.error || emociones.error || notas.error || turnos.error) {
    throw new Error('No pudimos cargar la ficha.');
  }
  if (!perfil.data) return { destino: null, ficha: null };

  const nombreFila = await supabase.from('pacientes_del_doctor').select('nombre').eq('user_id', pacienteId).maybeSingle();
  const nombre = typeof nombreFila.data?.nombre === 'string' ? nombreFila.data.nombre : 'Paciente';
  const notasPorTurno = new Map(
    (notas.data ?? []).map((nota) => [String(nota.turno_id), String(nota.contenido ?? '')]),
  );

  const turnosNota: TurnoNota[] = (turnos.data ?? [])
    .filter((turno) => turno.estado === 'CONFIRMADO' || turno.estado === 'COMPLETADO')
    .map((turno) => ({
      id: String(turno.id),
      estado: String(turno.estado),
      fecha: fechaCorta(String(turno.fecha_hora)),
      etiqueta: `${fechaCorta(String(turno.fecha_hora))} · ${turno.estado === 'COMPLETADO' ? 'Completado' : 'Confirmado'}`,
    }));

  const filasCsv: FilaCsv[] = [
    ...(turnos.data ?? [])
      .filter((turno) => turno.estado === 'COMPLETADO')
      .map((turno) => ({
        fecha: fechaCorta(String(turno.fecha_hora)),
        estado: String(turno.estado),
        notas: notasPorTurno.get(String(turno.id)) ?? '',
      })),
    ...(notas.data ?? [])
      .filter((nota) => !(turnos.data ?? []).some((turno) => String(turno.id) === String(nota.turno_id) && turno.estado === 'COMPLETADO'))
      .map((nota) => ({
        fecha: fechaCorta(nota.fecha_creacion as string | null),
        estado: 'COMPLETADO',
        notas: String(nota.contenido ?? ''),
      })),
  ];

  return {
    destino: null,
    ficha: {
      nombre,
      triage: typeof perfil.data.triage_actual === 'string' ? perfil.data.triage_actual : null,
      pausa: perfil.data.alerta_crisis === true
        ? { ocurridoEn: fechaPausaArgentina((pausa.data?.ocurrido_en as string | null) ?? null) }
        : null,
      ejercicios: (ejercicios.data ?? []).map((ejercicio) => ({
        id: String(ejercicio.id),
        titulo: String(ejercicio.titulo ?? ''),
        descripcion: String(ejercicio.descripcion ?? ''),
        dia: String(ejercicio.dia_asignado ?? ''),
        dificultad: String(ejercicio.dificultad ?? ''),
        duracion: etiquetaDuracion(Number(ejercicio.duracion_segundos) || 0),
        completado: ejercicio.completado === true,
        ansiedad: ejercicio.nivel_ansiedad == null ? '—' : `${ejercicio.nivel_ansiedad}/5`,
        feedback: typeof ejercicio.feedback_paciente === 'string' && ejercicio.feedback_paciente.trim()
          ? ejercicio.feedback_paciente
          : '—',
      })),
      emociones: (emociones.data ?? []).map((fila) => {
        const emoji = String(fila.emoji ?? '');
        const animo = EMOJIS_ANIMO.find((item) => item.emoji === emoji);
        return {
          id: String(fila.id),
          emoji,
          etiqueta: animo?.etiqueta ?? 'Estado de ánimo',
          fecha: fechaCorta(String(fila.fecha)),
        };
      }),
      notas: (notas.data ?? []).map((nota) => ({
        id: String(nota.id),
        turnoId: nota.turno_id ? String(nota.turno_id) : '',
        contenido: String(nota.contenido ?? ''),
        fecha: fechaCorta(nota.fecha_creacion as string | null),
      })),
      turnos: turnosNota,
      filasCsv,
    },
  };
}

export async function ocultarTurnoDeDoctor(turnoId: string) {
  if (!turnoId) return { error: 'El turno no es válido' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('turnos')
    .update({ oculto_para_doctor: true })
    .eq('id', turnoId)
    .eq('doctor_id', user.id)
    .in('estado', ['COMPLETADO', 'CANCELADO'])
    .select('id');

  if (error || !data?.length) return { error: 'No pudimos ocultar el turno.' };
  return { ok: true as const };
}

export async function cargarNotaDeSala(
  turnoId: string,
): Promise<
  { rol: 'PACIENTE' } | { rol: 'DOCTOR'; pacienteId: string; contenido: string } | { error: string }
> {
  if (!turnoId) return { error: 'El turno no es válido' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const usuario = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle<{ rol: string }>();

  if (usuario.error || !usuario.data) return { error: 'No autorizado' };
  if (usuario.data.rol !== 'DOCTOR') return { rol: 'PACIENTE' };

  const turno = await supabase
    .from('turnos')
    .select('paciente_id')
    .eq('id', turnoId)
    .eq('doctor_id', user.id)
    .maybeSingle<{ paciente_id: string }>();

  if (turno.error) return { error: 'No pudimos cargar la nota clínica.' };
  if (!turno.data?.paciente_id) return { rol: 'PACIENTE' };

  const nota = await supabase
    .from('notas_clinicas')
    .select('contenido')
    .eq('turno_id', turnoId)
    .eq('doctor_id', user.id)
    .maybeSingle<{ contenido: string | null }>();

  if (nota.error) return { error: 'No pudimos cargar la nota clínica.' };

  return {
    rol: 'DOCTOR',
    pacienteId: String(turno.data.paciente_id),
    contenido: nota.data?.contenido ?? '',
  };
}

export async function guardarNotaDePaciente(pacienteId: string, contenido: string) {
  const texto = contenido.trim();
  if (!texto) return { error: 'La nota no puede estar vacía' };
  if (!pacienteId) return { error: 'El paciente no es válido' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('notas_clinicas')
    .insert({
      id: idLocal(),
      contenido: texto,
      doctor_id: user.id,
      paciente_id: pacienteId,
    })
    .select('id');

  if (error || !data?.length) return { error: 'No pudimos guardar la nota.' };
  return { ok: true as const, notaId: String(data[0]?.id) };
}

export async function guardarNotaClinica(pacienteId: string, turnoId: string, contenido: string) {
  const texto = contenido.trim();
  if (!texto) return { error: 'La nota no puede estar vacía' };
  if (!turnoId || !pacienteId) return { error: 'Faltan datos del turno' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const turno = await supabase
    .from('turnos')
    .select('id, estado')
    .eq('id', turnoId)
    .eq('doctor_id', user.id)
    .eq('paciente_id', pacienteId)
    .in('estado', ['CONFIRMADO', 'COMPLETADO'])
    .maybeSingle();

  if (turno.error || !turno.data) return { error: 'No autorizado' };

  const previa = await supabase
    .from('notas_clinicas')
    .select('id')
    .eq('turno_id', turnoId)
    .eq('doctor_id', user.id)
    .maybeSingle();

  if (previa.error) return { error: 'No pudimos guardar la nota.' };

  const notaId = previa.data?.id ? String(previa.data.id) : idLocal();
  const { data, error } = await supabase
    .from('notas_clinicas')
    .upsert(
      {
        id: notaId,
        contenido: texto,
        turno_id: turnoId,
        doctor_id: user.id,
        paciente_id: pacienteId,
      },
      { onConflict: 'turno_id' },
    )
    .select('id');

  if (error || !data?.length) return { error: 'No pudimos guardar la nota.' };
  return { ok: true as const, notaId: String(data[0]?.id ?? notaId) };
}

export async function rehabilitarChat(pacienteId: string) {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  const respuesta = await fetch(`${base}/api/doctor/mobile/rehabilitar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pacienteId }),
  });

  const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
  if (!respuesta.ok) return { error: cuerpo?.error || 'No pudimos rehabilitar el chat.' };
  return { ok: true as const };
}

export async function asignarEjercicioPaciente(pedido: {
  pacienteId: string;
  titulo: string;
  descripcion: string;
  diaAsignado: string;
  dificultad: string;
  minutos: number;
}) {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  const respuesta = await fetch(`${base}/api/doctor/mobile/erp/asignar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pedido),
  });

  const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
  if (!respuesta.ok) return { error: cuerpo?.error || 'No se pudo asignar el ejercicio.' };
  return { ok: true as const };
}

export async function eliminarEjercicioAsignado(ejercicioId: string) {
  if (!ejercicioId) return { error: 'El ejercicio no es válido' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('ejercicios_asignados')
    .delete()
    .eq('id', ejercicioId)
    .eq('doctor_id', user.id)
    .select('id');

  if (error || !data?.length) return { error: 'No pudimos eliminar el ejercicio.' };
  return { ok: true as const };
}

export function csvDeHistorial(filas: FilaCsv[]) {
  const escapar = (valor: string) => `"${valor.replaceAll('"', '""')}"`;
  return [
    ['Fecha', 'Estado', 'Notas del Doctor'].map(escapar).join(','),
    ...filas.map((fila) => [fila.fecha, fila.estado, fila.notas].map(escapar).join(',')),
  ].join('\n');
}

export type PerfilMedico = {
  nombre: string;
  email: string;
  matricula: string;
  especialidad: string;
  verificado: boolean;
};

export async function cargarPerfilMedico(): Promise<
  { destino: '/login' | '/home' | '/doctor/pendiente' } | { destino: null; perfil: PerfilMedico }
> {
  const sesion = await sesionDoctor();
  if (sesion.destino) return { destino: sesion.destino };

  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre, email, perfil_doctor(matricula, especialidad, verificado)')
    .eq('id', sesion.userId)
    .maybeSingle();

  if (error || !data) throw new Error('No pudimos cargar el perfil.');

  const crudo = data.perfil_doctor as
    | { matricula: string | null; especialidad: string | null; verificado: boolean }
    | { matricula: string | null; especialidad: string | null; verificado: boolean }[]
    | null;
  const perfil = Array.isArray(crudo) ? (crudo[0] ?? null) : crudo;

  return {
    destino: null,
    perfil: {
      nombre: typeof data.nombre === 'string' ? data.nombre : sesion.nombre,
      email: typeof data.email === 'string' ? data.email : '',
      matricula: typeof perfil?.matricula === 'string' ? perfil.matricula : '',
      especialidad: typeof perfil?.especialidad === 'string' ? perfil.especialidad : '',
      verificado: perfil?.verificado === true,
    },
  };
}

export type HorarioSemanal = {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

export async function cargarDisponibilidad(): Promise<{ horarios: HorarioSemanal[] } | { error: string }> {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/doctor/mobile/disponibilidad`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { error: 'No pudimos cargar tus horarios.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as {
    error?: string;
    horarios?: { diaSemana?: unknown; horaInicio?: unknown; horaFin?: unknown; activo?: unknown }[];
  } | null;
  if (!respuesta.ok || !Array.isArray(cuerpo?.horarios)) {
    return { error: cuerpo?.error || 'No pudimos cargar tus horarios.' };
  }

  return {
    horarios: cuerpo.horarios.flatMap((fila) => {
      if (typeof fila.diaSemana !== 'number' || typeof fila.horaInicio !== 'string' || typeof fila.horaFin !== 'string') {
        return [];
      }
      return [
        {
          diaSemana: fila.diaSemana,
          horaInicio: fila.horaInicio.slice(0, 5),
          horaFin: fila.horaFin.slice(0, 5),
          activo: fila.activo !== false,
        },
      ];
    }),
  };
}

export async function guardarDisponibilidad(horarios: HorarioSemanal[]) {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/doctor/mobile/disponibilidad`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ horarios }),
    });
  } catch {
    return { error: 'No pudimos guardar tus horarios.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
  if (!respuesta.ok) return { error: cuerpo?.error || 'No pudimos guardar tus horarios.' };
  return { ok: true as const };
}

export async function guardarEspecialidad(especialidad: string) {
  const texto = especialidad.trim().slice(0, 80);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('perfil_doctor')
    .update({ especialidad: texto || null })
    .eq('user_id', user.id)
    .select('user_id');

  if (error || !data?.length) return { error: 'No pudimos guardar la especialidad.' };
  return { ok: true as const };
}

export function nombreCsv(nombrePaciente: string) {
  const slug = nombrePaciente.trim().replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'paciente';
  return `historial_${slug}.csv`;
}
