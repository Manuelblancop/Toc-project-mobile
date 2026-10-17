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
