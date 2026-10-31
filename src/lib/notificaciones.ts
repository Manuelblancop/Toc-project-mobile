import { supabase } from '@/lib/supabase';

export type NotificacionVista = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'RESERVA' | 'REPROGRAMACION' | 'EJERCICIO_ERP';
  createdAt: string;
};

export type BandejaNotificaciones = {
  notificaciones: NotificacionVista[];
  noLeidas: number;
  prioridad: NotificacionVista | null;
};

const VACIA: BandejaNotificaciones = { notificaciones: [], noLeidas: 0, prioridad: null };

function esVista(valor: unknown): valor is NotificacionVista {
  if (!valor || typeof valor !== 'object') return false;
  const fila = valor as Record<string, unknown>;
  return (
    typeof fila.id === 'string' &&
    typeof fila.titulo === 'string' &&
    typeof fila.mensaje === 'string' &&
    (fila.tipo === 'RESERVA' || fila.tipo === 'REPROGRAMACION' || fila.tipo === 'EJERCICIO_ERP') &&
    typeof fila.createdAt === 'string'
  );
}

async function sesion(): Promise<{ error: string } | { base: string; token: string }> {
  const base = process.env.EXPO_PUBLIC_AURA_WEB_URL?.replace(/\/+$/, '');
  if (!base) return { error: 'Falta EXPO_PUBLIC_AURA_WEB_URL.' as const };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'No autorizado' as const };
  return { base, token };
}

export async function cargarBandeja(): Promise<BandejaNotificaciones | { error: string }> {
  const acceso = await sesion();
  if ('error' in acceso) return { error: acceso.error };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${acceso.base}/api/notificaciones/mobile`, {
      headers: { Authorization: `Bearer ${acceso.token}` },
    });
  } catch {
    return { error: 'No pudimos cargar las notificaciones.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as {
    notificaciones?: unknown;
    noLeidas?: unknown;
    prioridad?: unknown;
    error?: string;
  } | null;
  if (!respuesta.ok || !cuerpo || !Array.isArray(cuerpo.notificaciones) || typeof cuerpo.noLeidas !== 'number') {
    return { error: cuerpo?.error || 'No pudimos cargar las notificaciones.' };
  }

  return {
    notificaciones: cuerpo.notificaciones.filter(esVista),
    noLeidas: cuerpo.noLeidas,
    prioridad: esVista(cuerpo.prioridad) ? cuerpo.prioridad : null,
  };
}

export async function marcarNotificacionLeida(id: string) {
  const acceso = await sesion();
  if ('error' in acceso) return { error: acceso.error };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${acceso.base}/api/notificaciones/mobile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${acceso.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
  } catch {
    return { error: 'No pudimos actualizar la notificación.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!respuesta.ok || !cuerpo?.success) {
    return { error: cuerpo?.error || 'No pudimos actualizar la notificación.' };
  }
  return { success: true as const };
}

export { VACIA };
