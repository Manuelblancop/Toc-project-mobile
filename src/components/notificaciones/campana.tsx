import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cargarBandeja,
  eliminarNotificacion,
  marcarTodasLeidas,
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

  const leerTodas = useCallback(async () => {
    setBandeja((actual) => ({ ...actual, noLeidas: 0, prioridad: null }));
    await marcarTodasLeidas();
  }, []);

  const eliminar = useCallback(async (id: string) => {
    const resultado = await eliminarNotificacion(id);
    if ('error' in resultado) return;
    setBandeja((actual) => ({
      ...actual,
      notificaciones: actual.notificaciones.filter((item) => item.id !== id),
    }));
  }, []);

  return { bandeja, leerTodas, eliminar };
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
  leerTodas,
  eliminar,
}: {
  bandeja: BandejaNotificaciones;
  leerTodas: () => Promise<void>;
  eliminar: (id: string) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(false);
  const cuenta = bandeja.noLeidas;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cuenta > 0 ? `Notificaciones, ${cuenta} sin leer` : 'Notificaciones'}
        onPress={() => {
          setAbierta(true);
          void leerTodas();
        }}
        style={styles.boton}
      >
        <View style={styles.icono} accessibilityElementsHidden>
          <View style={styles.iconoCuerpo} />
          <View style={styles.iconoBase} />
          <View style={styles.iconoBadajo} />
        </View>
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
                <Text style={styles.vacio}>No tenés notificaciones.</Text>
              ) : (
                bandeja.notificaciones.map((item) => (
                  <Fila key={item.id} item={item} onEliminar={() => void eliminar(item.id)} />
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Fila({ item, onEliminar }: { item: NotificacionVista; onEliminar: () => void }) {
  return (
    <View style={styles.fila}>
      <View style={styles.filaTexto}>
        <Text style={styles.filaTitulo}>{item.titulo}</Text>
        <Text style={styles.filaMensaje}>{item.mensaje}</Text>
        <Text style={styles.filaCuando}>{cuando(item.createdAt)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Eliminar notificación" onPress={onEliminar} style={styles.cerrarItem}>
        <Text style={styles.cerrarItemTexto}>×</Text>
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
    width: 20,
    height: 20,
    alignItems: 'center',
  },
  iconoCuerpo: {
    width: 14,
    height: 12,
    marginTop: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.8,
    borderColor: '#064e3b',
    backgroundColor: 'transparent',
  },
  iconoBase: {
    width: 18,
    height: 2,
    marginTop: -1,
    borderRadius: 1,
    backgroundColor: '#064e3b',
  },
  iconoBadajo: {
    width: 4,
    height: 4,
    marginTop: 1,
    borderRadius: 2,
    backgroundColor: '#064e3b',
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
});
