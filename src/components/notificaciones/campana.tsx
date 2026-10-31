import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cargarBandeja,
  marcarNotificacionLeida,
  VACIA,
  type BandejaNotificaciones,
  type NotificacionVista,
} from '@/lib/notificaciones';

export function useBandeja(activa: boolean) {
  const [bandeja, setBandeja] = useState<BandejaNotificaciones>(VACIA);

  const recargar = useCallback(async () => {
    const resultado = await cargarBandeja();
    if ('error' in resultado) return;
    setBandeja(resultado);
  }, []);

  useEffect(() => {
    if (!activa) return;
    void recargar();
  }, [activa, recargar]);

  const marcar = useCallback(async (id: string) => {
    const resultado = await marcarNotificacionLeida(id);
    if ('error' in resultado) return;
    setBandeja((actual) => ({
      notificaciones: actual.notificaciones.filter((item) => item.id !== id),
      noLeidas: Math.max(0, actual.noLeidas - 1),
      prioridad: actual.prioridad?.id === id ? null : actual.prioridad,
    }));
  }, []);

  return { bandeja, marcar };
}

function cuando(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function Campana({
  bandeja,
  marcar,
}: {
  bandeja: BandejaNotificaciones;
  marcar: (id: string) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(false);
  const cuenta = bandeja.noLeidas;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cuenta > 0 ? `Notificaciones, ${cuenta} sin leer` : 'Notificaciones'}
        onPress={() => setAbierta(true)}
        style={styles.boton}
      >
        <Text style={styles.icono}>🔔</Text>
        {cuenta > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{cuenta > 9 ? '9+' : String(cuenta)}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={abierta} transparent animationType="fade" onRequestClose={() => setAbierta(false)}>
        <Pressable style={styles.fondo} onPress={() => setAbierta(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <Text style={styles.titulo}>Notificaciones</Text>
            <ScrollView style={styles.lista}>
              {bandeja.notificaciones.length === 0 ? (
                <Text style={styles.vacio}>No tenés notificaciones nuevas.</Text>
              ) : (
                bandeja.notificaciones.map((item) => (
                  <Fila key={item.id} item={item} onLeida={() => void marcar(item.id)} />
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Fila({ item, onLeida }: { item: NotificacionVista; onLeida: () => void }) {
  return (
    <View style={styles.fila}>
      <View style={styles.filaTexto}>
        <Text style={styles.filaTitulo}>{item.titulo}</Text>
        <Text style={styles.filaMensaje}>{item.mensaje}</Text>
        <Text style={styles.filaCuando}>{cuando(item.createdAt)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Marcar como leída" onPress={onLeida} style={styles.cerrarItem}>
        <Text style={styles.cerrarItemTexto}>×</Text>
      </Pressable>
    </View>
  );
}

export function AvisoPrioridad({
  aviso,
  onCerrar,
}: {
  aviso: NotificacionVista | null;
  onCerrar: () => void;
}) {
  if (!aviso) return null;

  return (
    <View style={styles.aviso}>
      <View style={styles.avisoTexto}>
        <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
        <Text style={styles.avisoMensaje}>{aviso.mensaje}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={onCerrar} style={styles.cerrarItem}>
        <Text style={styles.cerrarAviso}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  icono: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  fondo: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    paddingTop: 72,
    paddingHorizontal: 16,
  },
  panel: {
    maxHeight: '70%',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  titulo: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  lista: {
    flexGrow: 0,
  },
  vacio: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    color: '#64748b',
    fontSize: 14,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filaTexto: {
    flex: 1,
  },
  filaTitulo: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  filaMensaje: {
    marginTop: 2,
    color: '#475569',
    fontSize: 14,
  },
  filaCuando: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 12,
  },
  cerrarItem: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cerrarItemTexto: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avisoTexto: {
    flex: 1,
  },
  avisoTitulo: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '700',
  },
  avisoMensaje: {
    marginTop: 4,
    color: '#334155',
    fontSize: 14,
  },
  cerrarAviso: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '700',
  },
});
