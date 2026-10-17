import { resumenErpEnInicio, type ActividadErp, type ProgresoSemanal } from '@/lib/erp';
import { supabase } from '@/lib/supabase';
import {
  claveHoyArgentina,
  emojiPorValor,
  puntoDeCheckin,
  PUNTOS_POR_ANIMO,
  type PuntoEvolucionEmocional,
} from '@/lib/emociones';

const VALOR_PUNTO = 10;
const PRECIO_BASE_TURNO = 30000;
const TOPE_DESCUENTO = 0.5;
const TRIAGE_MAX = 1000;

export function descuentoAplicadoTurno(puntosUsados: number) {
  const valorDeLosPuntosEnPesos = Math.max(0, puntosUsados) * VALOR_PUNTO;
  return Math.min(valorDeLosPuntosEnPesos, PRECIO_BASE_TURNO * TOPE_DESCUENTO);
}

export type InicioPaciente = {
  nombre: string;
  points: number;
  triageActual: string;
  emojiHoy: string | null;
  puntos: PuntoEvolucionEmocional[];
  actividadErp: ActividadErp[];
  progreso: ProgresoSemanal;
};

export async function cargarInicio(): Promise<InicioPaciente | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const [perfil, usuario, historial, resumenErp] = await Promise.all([
    supabase.from('perfil_paciente').select('points, triage_actual').eq('user_id', user.id).maybeSingle(),
    supabase.from('usuarios').select('nombre').eq('id', user.id).maybeSingle(),
    supabase
      .from('estados_emocionales')
      .select('fecha, emoji')
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false })
      .limit(100),
    resumenErpEnInicio(user.id),
  ]);

  if (perfil.error || usuario.error || historial.error || !perfil.data) {
    return { error: 'No pudimos cargar tu inicio. Probá de nuevo.' };
  }

  const hoy = claveHoyArgentina();
  const registros = historial.data ?? [];
  const deHoy = registros.find((registro) => String(registro.fecha).slice(0, 10) === hoy);

  return {
    nombre: usuario.data?.nombre ?? '',
    points: perfil.data.points ?? 0,
    triageActual: perfil.data.triage_actual ?? '',
    emojiHoy: deHoy?.emoji ?? null,
    actividadErp: resumenErp.actividad,
    progreso: resumenErp.progreso,
    puntos: registros
      .slice()
      .reverse()
      .map((registro) => puntoDeCheckin({ fecha: String(registro.fecha), emoji: registro.emoji }))
      .filter((punto): punto is PuntoEvolucionEmocional => punto !== null),
  };
}

export async function guardarEstadoEmocional(valor: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, detalle: 'No autorizado' };

  const animo = emojiPorValor(valor);
  if (!animo) return { success: false as const, detalle: 'El estado de ánimo debe ser un entero entre 1 y 5' };

  const fecha = claveHoyArgentina();
  const { data: existente, error: errorExistente } = await supabase
    .from('estados_emocionales')
    .select('emoji')
    .eq('paciente_id', user.id)
    .eq('fecha', fecha)
    .maybeSingle();

  if (errorExistente) return { success: false as const, detalle: 'No pudimos guardar tu estado. Probá de nuevo.' };
  if (existente) return { success: false as const, detalle: 'Ya registraste tu estado emocional hoy' };

  const { error: insertError } = await supabase.from('estados_emocionales').insert({
    id: crypto.randomUUID(),
    paciente_id: user.id,
    emoji: animo.emoji,
    fecha,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false as const, detalle: 'Ya registraste tu estado emocional hoy' };
    }
    return { success: false as const, detalle: 'No pudimos guardar tu estado. Probá de nuevo.' };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('perfil_paciente')
    .select('points')
    .eq('user_id', user.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    return { success: false as const, detalle: 'No pudimos guardar tu estado. Probá de nuevo.' };
  }

  const points = (perfil.points ?? 0) + PUNTOS_POR_ANIMO;
  const { error: updateError } = await supabase
    .from('perfil_paciente')
    .update({ points })
    .eq('user_id', user.id);

  if (updateError) return { success: false as const, detalle: 'No pudimos guardar tu estado. Probá de nuevo.' };

  return { success: true as const, emoji: animo.emoji, points, fecha: puntoDeCheckin({ fecha, emoji: animo.emoji }) };
}

export async function guardarTriageActual(texto: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, detalle: 'No autorizado' };

  const limpio = texto.trim().slice(0, TRIAGE_MAX);
  const { error } = await supabase
    .from('perfil_paciente')
    .update({ triage_actual: limpio || null })
    .eq('user_id', user.id);

  if (error) return { success: false as const, detalle: 'No se pudo guardar el triage.' };
  return { success: true as const, triageActual: limpio };
}

const ZONA = 'America/Argentina/Buenos_Aires';
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export type CuentaPaciente = {
  nombre: string;
  email: string;
  points: number;
  edad: number | null;
  mesAlta: string;
  anioAlta: string;
};

export type CitaHistorial = {
  id: string;
  profesional: string;
  cuando: string;
  estado: string;
};

export type SesionHistorial = {
  id: string;
  nombre: string;
  cuando: string;
  ansiedad: number;
};

function fechaArgentina(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ZONA,
  });
}

export async function cargarCuenta(): Promise<CuentaPaciente | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const [usuario, perfil] = await Promise.all([
    supabase.from('usuarios').select('nombre, email, created_at').eq('id', user.id).maybeSingle(),
    supabase.from('perfil_paciente').select('points, edad').eq('user_id', user.id).maybeSingle(),
  ]);

  if (usuario.error || perfil.error || !usuario.data) return { error: 'No pudimos cargar el perfil.' };

  const alta = new Date(String(usuario.data.created_at ?? ''));
  const partes = Number.isNaN(alta.getTime())
    ? null
    : new Intl.DateTimeFormat('es-AR', { month: 'numeric', year: 'numeric', timeZone: ZONA }).formatToParts(alta);
  const mes = Number(partes?.find((parte) => parte.type === 'month')?.value ?? '1');

  return {
    nombre: typeof usuario.data.nombre === 'string' ? usuario.data.nombre : 'Paciente',
    email: typeof usuario.data.email === 'string' ? usuario.data.email : '',
    points: typeof perfil.data?.points === 'number' ? perfil.data.points : 0,
    edad: typeof perfil.data?.edad === 'number' ? perfil.data.edad : null,
    mesAlta: MESES[mes - 1] ?? 'enero',
    anioAlta: partes?.find((parte) => parte.type === 'year')?.value ?? '',
  };
}

export async function guardarEdad(valor: string) {
  const crudo = valor.trim();
  const edad = Number(crudo);
  if (!crudo || !Number.isInteger(edad) || edad < 1 || edad > 120) {
    return { error: 'Ingresá una edad entera entre 1 y 120.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('perfil_paciente')
    .update({ edad })
    .eq('user_id', user.id)
    .select('user_id');

  if (error || !data?.length) return { error: 'No pudimos guardar la edad.' };
  return { ok: true as const, edad };
}

export async function cargarPuntos(): Promise<{ points: number } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase.from('perfil_paciente').select('points').eq('user_id', user.id).maybeSingle();
  if (error) return { error: 'No pudimos cargar los puntos.' };
  return { points: typeof data?.points === 'number' ? data.points : 0 };
}

export async function cargarHistorial(): Promise<
  { citas: CitaHistorial[]; tieneFuturos: boolean; sesiones: SesionHistorial[] } | { error: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const ahora = new Date().toISOString();
  const [turnos, futuros, sesiones] = await Promise.all([
    supabase
      .from('turnos')
      .select('id, fecha_hora, estado, doctor_id')
      .eq('paciente_id', user.id)
      .eq('oculto_para_paciente', false)
      .in('estado', ['CANCELADO', 'COMPLETADO', 'CONFIRMADO'])
      .order('fecha_hora', { ascending: false }),
    supabase
      .from('turnos')
      .select('id')
      .eq('paciente_id', user.id)
      .eq('oculto_para_paciente', false)
      .in('estado', ['PENDIENTE', 'CONFIRMADO'])
      .gte('fecha_hora', ahora),
    supabase
      .from('historial_sesiones')
      .select('id, completado_at, ansiedad_nivel, ejercicio_id')
      .eq('paciente_id', user.id)
      .order('completado_at', { ascending: false }),
  ]);

  if (turnos.error || futuros.error) return { error: 'No pudimos cargar el historial.' };

  const pasadas = (turnos.data ?? []).filter((turno) => {
    if (turno.estado === 'CANCELADO' || turno.estado === 'COMPLETADO') return true;
    return new Date(String(turno.fecha_hora)).getTime() < Date.now();
  }).slice(0, 3);

  const doctorIds = [...new Set(pasadas.map((turno) => String(turno.doctor_id)))];
  const nombres = doctorIds.length
    ? await supabase.from('doctores_agenda').select('user_id, nombre').in('user_id', doctorIds)
    : { data: [], error: null };
  const nombreDe = new Map((nombres.data ?? []).map((fila) => [String(fila.user_id), String(fila.nombre ?? '')]));

  const ejercicioIds = [...new Set((sesiones.data ?? []).map((fila) => String(fila.ejercicio_id)))];
  const ejercicios = !sesiones.error && ejercicioIds.length
    ? await supabase.from('ejercicios_erp').select('id, nombre').in('id', ejercicioIds)
    : { data: [] as { id: string; nombre: string }[] };
  const ejercicioDe = new Map((ejercicios.data ?? []).map((fila) => [String(fila.id), String(fila.nombre ?? '')]));

  return {
    tieneFuturos: (futuros.data ?? []).length > 0,
    citas: pasadas.map((turno) => ({
      id: String(turno.id),
      profesional: nombreDe.get(String(turno.doctor_id)) || 'Profesional',
      cuando: fechaArgentina(String(turno.fecha_hora)),
      estado: String(turno.estado),
    })),
    sesiones: sesiones.error
      ? []
      : (sesiones.data ?? []).map((fila) => ({
          id: String(fila.id),
          nombre: ejercicioDe.get(String(fila.ejercicio_id)) || 'Ejercicio ERP',
          cuando: fechaArgentina(String(fila.completado_at)),
          ansiedad: Number(fila.ansiedad_nivel) || 0,
        })),
  };
}

export async function ocultarCita(turnoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: turno, error: lectura } = await supabase
    .from('turnos')
    .select('id, estado, fecha_hora')
    .eq('id', turnoId)
    .eq('paciente_id', user.id)
    .maybeSingle();

  if (lectura || !turno) return { error: 'Solo podés ocultar una cita pasada o cancelada' };

  const pasada =
    turno.estado === 'COMPLETADO' ||
    turno.estado === 'CANCELADO' ||
    (turno.estado === 'CONFIRMADO' && new Date(String(turno.fecha_hora)).getTime() < Date.now());
  if (!pasada) return { error: 'Solo podés ocultar una cita pasada o cancelada' };

  const { data, error } = await supabase
    .from('turnos')
    .update({ oculto_para_paciente: true })
    .eq('id', turnoId)
    .eq('paciente_id', user.id)
    .select('id');

  if (error || !data?.length) return { error: 'No pudimos ocultar la sesión.' };
  return { ok: true as const };
}
