import { StyleSheet, Text, View } from 'react-native';

const ESTADOS = {
  CONFIRMADO: { etiqueta: 'Confirmado', fondo: '#E7F6F0', texto: '#2C8A6E', icono: '✓' },
  COMPLETADO: { etiqueta: 'Completado', fondo: '#5DCAA5', texto: '#12382E', icono: '✓✓' },
  PENDIENTE: { etiqueta: 'Pendiente', fondo: '#f1f5f9', texto: '#334155', icono: '◷' },
  CANCELADO: { etiqueta: 'Cancelado', fondo: '#f1f5f9', texto: '#64748b', icono: '✕' },
} as const;

export function BadgeTurno({ estado }: { estado: string }) {
  const item = ESTADOS[estado as keyof typeof ESTADOS] ?? {
    etiqueta: estado,
    fondo: '#f1f5f9',
    texto: '#334155',
    icono: '',
  };

  return (
    <View style={[styles.badge, { backgroundColor: item.fondo }]}>
      {item.icono ? <Text style={[styles.icono, { color: item.texto }]}>{item.icono}</Text> : null}
      <Text style={[styles.etiqueta, { color: item.texto }]}>{item.etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  icono: {
    fontSize: 12,
    fontWeight: '700',
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
