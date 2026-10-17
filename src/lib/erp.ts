import { claveHoyArgentina } from '@/lib/emociones';
import { supabase } from '@/lib/supabase';

export const DIAS_ERP = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export type DiaErp = (typeof DIAS_ERP)[number];

const SEMILLA = [
  {
    diaAsignado: 'Lunes',
    dificultad: 'Fácil',
    duracionSegundos: 40,
    titulo: '[Prueba] Dejar una notificación sin abrirla',
    descripcion: 'Observá la urgencia de revisar y dejala pasar.',
  },
  {
    diaAsignado: 'Martes',
    dificultad: 'Medio',
    duracionSegundos: 600,
    titulo: '[Prueba] Dejar un objeto fuera de lugar',
    descripcion: 'Corré un libro a propósito y no lo alinees.',
  },
  {
    diaAsignado: 'Miércoles',
    dificultad: 'Difícil',
    duracionSegundos: 900,
    titulo: '[Prueba] Salir sin revisar la cerradura',
    descripcion: 'Cerrá una sola vez y alejate.',
  },
] as const;

const FEEDBACK_MAX = 1000;

export type EjercicioAsignadoVista = {
  id: string;
  titulo: string;
  descripcion: string;
  diaAsignado: string;
  dificultad: string;
  duracionSegundos: number;
  completado: boolean;
  nivelAnsiedad: number | null;
};

type FilaEjercicio = {
  id: string;
  titulo: string;
  descripcion: string;
  dia_asignado: string;
  dificultad: string;
  duracion_segundos: number;
  completado: boolean;
  nivel_ansiedad: number | null;
};

export function diaDeHoy(): DiaErp {
  const largo = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
  const normalizado = largo.charAt(0).toUpperCase() + largo.slice(1);
  return (DIAS_ERP as readonly string[]).includes(normalizado) ? (normalizado as DiaErp) : 'Lunes';
}

export function etiquetaDuracion(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.round(segundos / 60);
  return `${minutos} min`;
}

export function etiquetaActividadArgentina(valor: string) {
  const texto = valor.trim();
  const tieneZona = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(texto);
  const normalizada = texto.includes('T') ? texto : texto.replace(' ', 'T');
  const fecha = new Date(tieneZona ? normalizada : `${normalizada}Z`);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nuevoId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const aleatorio = Math.floor(Math.random() * 16);
    const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
    return valor.toString(16);
  });
}

function aVista(fila: FilaEjercicio): EjercicioAsignadoVista {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    diaAsignado: fila.dia_asignado,
    dificultad: fila.dificultad,
    duracionSegundos: fila.duracion_segundos,
    completado: fila.completado,
    nivelAnsiedad: fila.nivel_ansiedad,
  };
}

async function doctorParaSemilla(pacienteId: string) {
  const perfil = await supabase
    .from('perfil_paciente')
    .select('doctor_id')
    .eq('user_id', pacienteId)
    .maybeSingle<{ doctor_id: string | null }>();
  if (perfil.data?.doctor_id) return perfil.data.doctor_id;

  const turno = await supabase
    .from('turnos')
    .select('doctor_id')
    .eq('paciente_id', pacienteId)
    .order('fecha_hora', { ascending: false })
    .limit(1)
    .maybeSingle<{ doctor_id: string }>();
  if (turno.data?.doctor_id) return turno.data.doctor_id;

  const doctor = await supabase
    .from('perfil_doctor')
    .select('user_id')
    .eq('verificado', true)
    .eq('validado_sisa', true)
    .limit(1)
    .maybeSingle<{ user_id: string }>();
  return doctor.data?.user_id ?? null;
}

async function corregirDuracionesDeSemilla(pacienteId: string) {
  await Promise.all(
    SEMILLA.filter((item) => item.duracionSegundos !== 600).map((item) =>
      supabase
        .from('ejercicios_asignados')
        .update({ duracion_segundos: item.duracionSegundos })
        .eq('paciente_id', pacienteId)
        .eq('titulo', item.titulo)
        .eq('descripcion', item.descripcion)
        .eq('duracion_segundos', 600),
    ),
  );
}

export async function cargarEjerciciosAsignados(): Promise<
  { ejercicios: EjercicioAsignadoVista[] } | { error: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  await corregirDuracionesDeSemilla(user.id);

  const conteo = await supabase
    .from('ejercicios_asignados')
    .select('id', { count: 'exact', head: true })
    .eq('paciente_id', user.id);
  if (conteo.error) return { error: 'No pudimos cargar tus ejercicios. Probá de nuevo.' };

  if ((conteo.count ?? 0) === 0) {
    const doctorId = await doctorParaSemilla(user.id);
    if (doctorId) {
      const otraVez = await supabase
        .from('ejercicios_asignados')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', user.id);
      if ((otraVez.count ?? 0) === 0) {
        const { error } = await supabase.from('ejercicios_asignados').insert(
          SEMILLA.map((item) => ({
            id: nuevoId(),
            paciente_id: user.id,
            doctor_id: doctorId,
            titulo: item.titulo,
            descripcion: item.descripcion,
            dia_asignado: item.diaAsignado,
            dificultad: item.dificultad,
            duracion_segundos: item.duracionSegundos,
          })),
        );
        if (error) return { error: 'No pudimos preparar tus ejercicios. Probá de nuevo.' };
      }
    }
  }

  const { data, error } = await supabase
    .from('ejercicios_asignados')
    .select('id, titulo, descripcion, dia_asignado, dificultad, duracion_segundos, completado, nivel_ansiedad')
    .eq('paciente_id', user.id)
    .order('created_at', { ascending: true })
    .returns<FilaEjercicio[]>();

  if (error) return { error: 'No pudimos cargar tus ejercicios. Probá de nuevo.' };
  return { ejercicios: (data ?? []).map(aVista) };
}

export async function obtenerEjercicioAsignado(
  ejercicioId: string,
): Promise<EjercicioAsignadoVista | null | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('ejercicios_asignados')
    .select('id, titulo, descripcion, dia_asignado, dificultad, duracion_segundos, completado, nivel_ansiedad')
    .eq('id', ejercicioId)
    .eq('paciente_id', user.id)
    .maybeSingle<FilaEjercicio>();

  if (error) return { error: 'No pudimos cargar el ejercicio. Probá de nuevo.' };
  return data ? aVista(data) : null;
}

export async function completarEjercicioAsignado(
  ejercicioId: string,
  nivelAnsiedad: number,
  feedback: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, detalle: 'No autorizado' };

  const texto = feedback.trim().slice(0, FEEDBACK_MAX);
  if (!Number.isInteger(nivelAnsiedad) || nivelAnsiedad < 0 || nivelAnsiedad > 5) {
    return { success: false as const, detalle: 'El nivel de ansiedad tiene que ser un número del 0 al 5.' };
  }
  if (!texto) return { success: false as const, detalle: 'Contanos brevemente cómo te fue.' };

  const { data: ejercicio, error: errorLectura } = await supabase
    .from('ejercicios_asignados')
    .select('id, completado')
    .eq('id', ejercicioId)
    .eq('paciente_id', user.id)
    .maybeSingle<{ id: string; completado: boolean }>();

  if (errorLectura) return { success: false as const, detalle: 'No se pudo marcar el ejercicio como completado.' };
  if (!ejercicio) return { success: false as const, detalle: 'No encontramos ese ejercicio.' };
  if (ejercicio.completado) return { success: false as const, detalle: 'Ese ejercicio ya está completado.' };

  const { error } = await supabase
    .from('ejercicios_asignados')
    .update({
      completado: true,
      nivel_ansiedad: nivelAnsiedad,
      feedback_paciente: texto,
    })
    .eq('id', ejercicio.id)
    .eq('paciente_id', user.id);

  if (error) return { success: false as const, detalle: 'No se pudo marcar el ejercicio como completado.' };
  return { success: true as const };
}

type FilaHistorial = {
  id: string;
  completado_at: string;
  ejercicios_erp: { nombre: string } | { nombre: string }[] | null;
};

export type ActividadErp = {
  id: string;
  titulo: string;
  detalle: string;
  cuando: string;
  fecha: number;
};

export type DiaProgreso = {
  etiqueta: string;
  clave: string;
  esHoy: boolean;
  activo: boolean;
};

export type ProgresoSemanal = {
  dias: DiaProgreso[];
  diasConActividad: number;
  ejerciciosDesdeLunes: number;
};

const ETIQUETAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

type FilaAsignadoCompletado = {
  id: string;
  titulo: string;
  dia_asignado: string;
  created_at: string;
};

function fechaCalendarioArgentina(ahora = new Date()) {
  return new Date(`${claveHoyArgentina(ahora)}T00:00:00.000Z`);
}

function inicioLunesSemana(ahora = new Date()) {
  const hoy = fechaCalendarioArgentina(ahora);
  const diff = (hoy.getUTCDay() + 6) % 7;
  const lunes = new Date(hoy);
  lunes.setUTCDate(hoy.getUTCDate() - diff);
  return lunes;
}

function diasDeLaSemana(ahora = new Date()) {
  const hoy = claveHoyArgentina(ahora);
  const lunes = inicioLunesSemana(ahora);
  return ETIQUETAS_SEMANA.map((etiqueta, indice) => {
    const fecha = new Date(lunes);
    fecha.setUTCDate(lunes.getUTCDate() + indice);
    const clave = fecha.toISOString().slice(0, 10);
    return { etiqueta, dia: DIAS_ERP[indice], clave, esHoy: clave === hoy };
  });
}

function instanteDe(valor: string) {
  const texto = valor.trim();
  const tieneZona = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(texto);
  const normalizada = texto.includes('T') ? texto : texto.replace(' ', 'T');
  const fecha = new Date(tieneZona ? normalizada : `${normalizada}Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function claveArgentinaDe(valor: string) {
  const fecha = instanteDe(valor);
  return fecha ? claveHoyArgentina(fecha) : null;
}

export async function resumenErpEnInicio(pacienteId: string): Promise<{
  actividad: ActividadErp[];
  progreso: ProgresoSemanal;
}> {
  const semana = diasDeLaSemana();
  const clavesSemana = new Set(semana.map((dia) => dia.clave));
  const vacio: ProgresoSemanal = {
    dias: semana.map((dia) => ({
      etiqueta: dia.etiqueta,
      clave: dia.clave,
      esHoy: dia.esHoy,
      activo: false,
    })),
    diasConActividad: 0,
    ejerciciosDesdeLunes: 0,
  };

  const [historial, asignados] = await Promise.all([
    supabase
      .from('historial_sesiones')
      .select('id, completado_at, ejercicios_erp(nombre)')
      .eq('paciente_id', pacienteId)
      .order('completado_at', { ascending: false })
      .limit(100)
      .returns<FilaHistorial[]>(),
    supabase
      .from('ejercicios_asignados')
      .select('id, titulo, dia_asignado, created_at')
      .eq('paciente_id', pacienteId)
      .eq('completado', true)
      .order('created_at', { ascending: false })
      .returns<FilaAsignadoCompletado[]>(),
  ]);

  if (historial.error && asignados.error) return { actividad: [], progreso: vacio };

  const sesiones = historial.data ?? [];
  const completados = asignados.data ?? [];
  const clavesHistorial = new Set(
    sesiones
      .map((sesion) => claveArgentinaDe(String(sesion.completado_at)))
      .filter((clave): clave is string => clave != null && clavesSemana.has(clave)),
  );
  const diasCompletados = new Set(completados.map((ejercicio) => ejercicio.dia_asignado));
  const dias = semana.map((dia) => ({
    etiqueta: dia.etiqueta,
    clave: dia.clave,
    esHoy: dia.esHoy,
    activo: diasCompletados.has(dia.dia) || clavesHistorial.has(dia.clave),
  }));
  const sesionesDeLaSemana = sesiones.filter((sesion) => {
    const clave = claveArgentinaDe(String(sesion.completado_at));
    return clave != null && clavesSemana.has(clave);
  });

  const actividadHistorial: ActividadErp[] = sesiones.slice(0, 3).map((sesion) => {
    const ejercicio = Array.isArray(sesion.ejercicios_erp) ? sesion.ejercicios_erp[0] : sesion.ejercicios_erp;
    const instante = instanteDe(String(sesion.completado_at));
    return {
      id: sesion.id,
      titulo: 'Ejercicio ERP completado',
      detalle: ejercicio?.nombre ?? 'Ejercicio ERP',
      cuando: etiquetaActividadArgentina(String(sesion.completado_at)),
      fecha: instante?.getTime() ?? 0,
    };
  });
  const actividadAsignada: ActividadErp[] = completados.map((ejercicio) => {
    const instante = instanteDe(String(ejercicio.created_at));
    return {
      id: ejercicio.id,
      titulo: 'Ejercicio ERP completado',
      detalle: ejercicio.titulo,
      cuando: etiquetaActividadArgentina(String(ejercicio.created_at)),
      fecha: instante?.getTime() ?? 0,
    };
  });

  return {
    actividad: [...actividadAsignada, ...actividadHistorial].sort((a, b) => b.fecha - a.fecha),
    progreso: {
      dias,
      diasConActividad: dias.filter((dia) => dia.activo).length,
      ejerciciosDesdeLunes: completados.length + sesionesDeLaSemana.length,
    },
  };
}
