import { descuentoAplicadoTurno } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

const ZONA_AR = 'America/Argentina/Buenos_Aires';

const PRECIO_BASE = 30000;
const TARIFA_SERVICIO = 1500;

export function totalSinPuntos() {
  return PRECIO_BASE + TARIFA_SERVICIO;
}

export function totalConPuntos(puntos: number) {
  return totalSinPuntos() - descuentoAplicadoTurno(puntos);
}

export function horaArgentina(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA_AR,
  }).formatToParts(fecha);
  const hh = (parts.find((part) => part.type === 'hour')?.value ?? '00').padStart(2, '0');
  const mm = (parts.find((part) => part.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${hh}:${mm}`;
}

export type SlotDisponible = {
  hora: string;
  inicio: string;
};

export type DiaDisponible = {
  clave: string;
  etiqueta: string;
  horarios: SlotDisponible[];
};

export type DoctorAgenda = {
  userId: string;
  nombre: string;
  matricula: string;
  rating: number;
  especialidad: string;
  enLinea: boolean;
  dias: DiaDisponible[];
};

export async function cargarAgenda(): Promise<{ doctores: DoctorAgenda[]; puntos: number } | { error: string }> {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/turnos/mobile/disponibles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { error: 'No pudimos cargar la agenda. Probá de nuevo.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as {
    error?: string;
    puntos?: unknown;
    doctores?: unknown;
  } | null;
  if (!respuesta.ok || !Array.isArray(cuerpo?.doctores) || typeof cuerpo.puntos !== 'number') {
    return { error: cuerpo?.error || 'No pudimos cargar la agenda. Probá de nuevo.' };
  }

  return {
    puntos: cuerpo.puntos,
    doctores: cuerpo.doctores.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const doctor = item as Record<string, unknown>;
      if (typeof doctor.userId !== 'string' || typeof doctor.nombre !== 'string') return [];
      const dias = Array.isArray(doctor.dias) ? doctor.dias.flatMap(diaDisponible) : [];
      return [
        {
          userId: doctor.userId,
          nombre: doctor.nombre,
          matricula: typeof doctor.matricula === 'string' ? doctor.matricula : '',
          rating: typeof doctor.rating === 'number' ? doctor.rating : 0,
          especialidad:
            typeof doctor.especialidad === 'string' && doctor.especialidad.trim()
              ? doctor.especialidad
              : 'Psicólogo/a clínico/a',
          enLinea: doctor.enLinea === true,
          dias,
        },
      ];
    }),
  };
}

function diaDisponible(item: unknown): DiaDisponible[] {
  if (!item || typeof item !== 'object') return [];
  const dia = item as Record<string, unknown>;
  if (typeof dia.clave !== 'string' || typeof dia.etiqueta !== 'string' || !Array.isArray(dia.horarios)) return [];
  const horarios = dia.horarios.flatMap((fila) => {
    if (!fila || typeof fila !== 'object') return [];
    const horario = fila as Record<string, unknown>;
    if (typeof horario.hora !== 'string' || typeof horario.inicio !== 'string') return [];
    return [{ hora: horario.hora, inicio: horario.inicio }];
  });
  return [{ clave: dia.clave, etiqueta: dia.etiqueta, horarios }];
}

export type TurnoPropio = {
  id: string;
  profesional: string;
  cuando: string;
  estado: string;
};

export async function cargarMisTurnos(): Promise<TurnoPropio[] | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('turnos')
    .select('id, fecha_hora, estado, doctor_id')
    .eq('paciente_id', user.id)
    .eq('oculto_para_paciente', false)
    .in('estado', ['PENDIENTE', 'CONFIRMADO', 'COMPLETADO'])
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true });

  if (error) return { error: 'No pudimos cargar tus turnos.' };

  const doctorIds = [...new Set((data ?? []).map((turno) => String(turno.doctor_id)))];
  const nombres = doctorIds.length
    ? await supabase.from('doctores_agenda').select('user_id, nombre').in('user_id', doctorIds)
    : { data: [] as { user_id: string; nombre: string }[] };
  const nombreDe = new Map((nombres.data ?? []).map((fila) => [String(fila.user_id), String(fila.nombre ?? '')]));

  return (data ?? []).map((turno) => ({
    id: String(turno.id),
    profesional: nombreDe.get(String(turno.doctor_id)) || 'Profesional',
    cuando: new Date(String(turno.fecha_hora)).toLocaleString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: ZONA_AR,
    }),
    estado: String(turno.estado),
  }));
}

export type DiaReprogramar = {
  clave: string;
  etiqueta: string;
  horarios: { hora: string; inicio: string }[];
};

async function tokenDeSesion(): Promise<{ error: string } | { base: string; token: string }> {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };
  return { base, token };
}

export async function pedirHuecosParaReprogramar(turnoId: string): Promise<{ dias: DiaReprogramar[] } | { error: string }> {
  const sesion = await tokenDeSesion();
  if ('error' in sesion) return { error: sesion.error };

  let respuesta: Response;
  try {
    respuesta = await fetch(
      `${sesion.base}/api/turnos/mobile/reprogramar?turnoId=${encodeURIComponent(turnoId)}`,
      { headers: { Authorization: `Bearer ${sesion.token}` } },
    );
  } catch {
    return { error: 'No pudimos consultar los horarios.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { dias?: DiaReprogramar[]; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.dias) {
    return { error: cuerpo?.error || 'No pudimos consultar los horarios.' };
  }
  return { dias: cuerpo.dias.flatMap(diaDisponible) };
}

export async function cancelarTurnoPropio(turnoId: string) {
  const id = turnoId.trim();
  if (!id) return { error: 'El turno no es válido.' };

  const sesion = await tokenDeSesion();
  if ('error' in sesion) return { error: sesion.error };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${sesion.base}/api/turnos/mobile/cancelar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sesion.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ turnoId: id }),
    });
  } catch {
    return { error: 'No pudimos cancelar el turno.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.success) {
    return { error: cuerpo?.error || 'No pudimos cancelar el turno.' };
  }
  return { success: true as const };
}

export async function confirmarReprogramacion(turnoId: string, inicio: string) {
  const sesion = await tokenDeSesion();
  if ('error' in sesion) return { error: sesion.error };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${sesion.base}/api/turnos/mobile/reprogramar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sesion.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ turnoId, inicio }),
    });
  } catch {
    return { error: 'No pudimos reprogramar el turno.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.success) {
    return { error: cuerpo?.error || 'No pudimos reprogramar el turno.' };
  }
  return { success: true as const };
}

export async function pedirSala(turnoId: string) {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/daily/mobile/crear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ turnoId }),
    });
  } catch {
    return { error: 'No pudimos conectar la videollamada.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.url) {
    return { error: cuerpo?.error || 'No pudimos crear la sala de videollamada' };
  }
  return { url: cuerpo.url };
}

export async function pedirLinkDePago(doctorId: string, inicio: string, puntosUsados: number) {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL para pedir el link de pago.' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/pagos/mobile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ doctorId, inicio, puntosUsados }),
    });
  } catch {
    return { error: 'No pudimos conectar con el servidor de pagos.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { init_point?: string; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.init_point) {
    return { error: cuerpo?.error || 'No pudimos iniciar el pago. Probá de nuevo en unos segundos.' };
  }
  return { initPoint: cuerpo.init_point };
}
