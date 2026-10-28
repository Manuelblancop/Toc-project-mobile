import type { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

const RUTAS_PUBLICAS = ['/', '/login', '/registro'];

let sesionInicial: Promise<Session | null> | null = null;

export function esperarSesionInicial() {
  if (!sesionInicial) {
    sesionInicial = supabase.auth.getSession().then(({ data }) => data.session ?? null);
  }
  return sesionInicial;
}

export function esRutaPublica(pathname: string) {
  return RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || (ruta !== '/' && pathname.startsWith(`${ruta}/`)),
  );
}

export type DestinoAuth = '/home' | '/doctor' | '/doctor/pendiente';

type PerfilDoctor = {
  verificado: boolean;
  validado_sisa: boolean;
};

type UsuarioRow = {
  rol: string;
  perfil_doctor: PerfilDoctor | PerfilDoctor[] | null;
};

function rolDe(valor: unknown) {
  return typeof valor === 'string' ? valor.trim().toUpperCase() : '';
}

function doctorHabilitado(perfil: PerfilDoctor | null) {
  return Boolean(perfil?.verificado && perfil.validado_sisa);
}

export function rutaPostLogin(rol: string, perfil: PerfilDoctor | null): DestinoAuth | null {
  if (rol === 'DOCTOR') {
    return doctorHabilitado(perfil) ? '/doctor' : '/doctor/pendiente';
  }
  if (rol === 'PACIENTE') return '/home';
  return null;
}

function destinoPorMetadata(user: User): DestinoAuth | 'sin-rol' {
  const rol = rolDe(user.user_metadata?.rol);
  if (rol === 'DOCTOR') return '/doctor/pendiente';
  if (rol === 'PACIENTE') return '/home';
  return 'sin-rol';
}

export async function destinoTrasAuth(user: User): Promise<DestinoAuth | 'sin-perfil' | 'sin-rol'> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('rol, perfil_doctor(verificado, validado_sisa)')
    .eq('id', user.id)
    .maybeSingle<UsuarioRow>();

  if (error) return destinoPorMetadata(user);
  if (!data) return 'sin-perfil';

  const perfilRaw = data.perfil_doctor;
  const perfil = Array.isArray(perfilRaw) ? (perfilRaw[0] ?? null) : perfilRaw;
  return rutaPostLogin(rolDe(data.rol), perfil) ?? 'sin-rol';
}

export function mensajeDeRegistro(mensaje: string) {
  if (/already registered|already been registered|user already exists/i.test(mensaje)) {
    return 'El email ya existe';
  }
  return mensaje.trim() || 'No se pudo crear la cuenta.';
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  router.replace('/');
}
