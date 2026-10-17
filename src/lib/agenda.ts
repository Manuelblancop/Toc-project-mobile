import { descuentoAplicadoTurno } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

export const HORARIOS_BASE = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'] as const;
export const DIA_PRUEBA_LABEL = 'Viernes 13';
export const DIA_PRUEBA_FECHA = '2026-11-13';
const OFFSET_AR = '-03:00';
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

export type DoctorAgenda = {
  userId: string;
  nombre: string;
  matricula: string;
  rating: number;
  especialidad: string;
  horarios: { hora: string; libre: boolean }[];
};

type FilaDoctor = {
  user_id: string;
  nombre: string;
  matricula: string;
  rating: number | null;
  especialidad: string | null;
};

type FilaHorario = {
  doctor_id: string;
  fecha_hora: string;
};

export async function cargarAgenda(): Promise<{ doctores: DoctorAgenda[]; puntos: number } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const inicio = new Date(`${DIA_PRUEBA_FECHA}T00:00:00${OFFSET_AR}`).toISOString();
  const fin = new Date(`2026-11-14T00:00:00${OFFSET_AR}`).toISOString();

  const [doctores, ocupados, perfil] = await Promise.all([
    supabase.from('doctores_agenda').select('user_id, nombre, matricula, rating, especialidad').returns<FilaDoctor[]>(),
    supabase
      .from('horarios_ocupados')
      .select('doctor_id, fecha_hora')
      .gte('fecha_hora', inicio)
      .lt('fecha_hora', fin)
      .returns<FilaHorario[]>(),
    supabase.from('perfil_paciente').select('points').eq('user_id', user.id).maybeSingle<{ points: number }>(),
  ]);

  if (doctores.error || ocupados.error || perfil.error || !perfil.data) {
    return { error: 'No pudimos cargar la agenda. Probá de nuevo.' };
  }

  const porDoctor = new Map<string, Set<string>>();
  for (const fila of ocupados.data ?? []) {
    const horas = porDoctor.get(fila.doctor_id) ?? new Set<string>();
    horas.add(horaArgentina(fila.fecha_hora));
    porDoctor.set(fila.doctor_id, horas);
  }

  return {
    puntos: perfil.data.points ?? 0,
    doctores: (doctores.data ?? []).map((doctor) => {
      const tomados = porDoctor.get(doctor.user_id) ?? new Set<string>();
      return {
        userId: doctor.user_id,
        nombre: doctor.nombre,
        matricula: doctor.matricula,
        rating: doctor.rating ?? 0,
        especialidad: doctor.especialidad?.trim() || 'Psicólogo/a clínico/a',
        horarios: HORARIOS_BASE.map((hora) => ({ hora, libre: !tomados.has(hora) })),
      };
    }),
  };
}

export async function pedirLinkDePago(doctorId: string, horario: string, puntosUsados: number) {
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
      body: JSON.stringify({ doctorId, horario, puntosUsados }),
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
