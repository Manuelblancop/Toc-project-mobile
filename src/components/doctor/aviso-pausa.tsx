import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PausaAura } from '@/lib/doctor';

export function AvisoPausaAura({
  pausa,
  children,
}: {
  pausa: PausaAura;
  children?: ReactNode;
}) {
  return (
    <View style={styles.caja}>
      <Text style={styles.titulo}>Pausa preventiva activada en Aura (Línea 135)</Text>
      <Text style={styles.detalle}>
        {pausa.ocurridoEn ? `Ocurrió el ${pausa.ocurridoEn}` : 'El horario del aviso no quedó registrado.'}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titulo: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
  detalle: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
  },
});
