import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PuntoEvolucionEmocional } from '@/lib/emociones';

const ALTO = 288;
const MARGEN_IZQ = 28;
const MARGEN_ABAJO = 28;
const MARGEN_ARRIBA = 8;
const MARGEN_DER = 8;

export function GraficoEvolucion({ datos }: { datos: PuntoEvolucionEmocional[] }) {
  const [ancho, setAncho] = useState(0);

  if (datos.length === 0) {
    return (
      <Text style={styles.vacio}>Todavía no hay registros emocionales para graficar.</Text>
    );
  }

  const areaAlto = ALTO - MARGEN_ARRIBA - MARGEN_ABAJO;
  const areaAncho = Math.max(ancho - MARGEN_IZQ - MARGEN_DER, 0);
  const xDe = (indice: number) =>
    MARGEN_IZQ + (datos.length === 1 ? areaAncho / 2 : (indice / (datos.length - 1)) * areaAncho);
  const yDe = (valor: number) => MARGEN_ARRIBA + ((5 - valor) / 4) * areaAlto;

  const etiquetasX =
    datos.length <= 6
      ? datos.map((punto, indice) => ({ ...punto, indice }))
      : [0, 0.25, 0.5, 0.75, 1].map((paso) => {
          const indice = Math.round(paso * (datos.length - 1));
          return { ...datos[indice], indice };
        });

  return (
    <View style={styles.lienzo} onLayout={(event) => setAncho(event.nativeEvent.layout.width)}>
      {[1, 2, 3, 4, 5].map((marca) => (
        <View key={marca} style={[styles.grilla, { top: yDe(marca) }]} />
      ))}
      {[1, 2, 3, 4, 5].map((marca) => (
        <Text key={`y-${marca}`} style={[styles.eje, { top: yDe(marca) - 8 }]}>
          {marca}
        </Text>
      ))}
      {datos.slice(0, -1).map((punto, indice) => {
        const x1 = xDe(indice);
        const y1 = yDe(punto.valor);
        const x2 = xDe(indice + 1);
        const y2 = yDe(datos[indice + 1].valor);
        const largo = Math.hypot(x2 - x1, y2 - y1);
        const angulo = `${Math.atan2(y2 - y1, x2 - x1)}rad`;
        return (
          <View
            key={`${punto.fecha}-${indice}`}
            style={[
              styles.trazo,
              {
                left: x1,
                top: y1 - 1,
                width: largo,
                transform: [{ rotate: angulo }],
              },
            ]}
          />
        );
      })}
      {datos.map((punto, indice) => (
        <View
          key={`${punto.fecha}-${punto.valor}-${indice}`}
          style={[styles.punto, { left: xDe(indice) - 4, top: yDe(punto.valor) - 4 }]}
        />
      ))}
      {etiquetasX.map((punto) => (
        <Text key={`x-${punto.indice}`} style={[styles.fecha, { left: xDe(punto.indice) - 16 }]}>
          {punto.fecha}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: {
    paddingVertical: 32,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
  lienzo: {
    height: ALTO,
    width: '100%',
  },
  grilla: {
    position: 'absolute',
    left: MARGEN_IZQ,
    right: MARGEN_DER,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  eje: {
    position: 'absolute',
    left: 0,
    width: 20,
    textAlign: 'right',
    color: '#64748b',
    fontSize: 12,
  },
  trazo: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#2563eb',
    transformOrigin: 'left center',
  },
  punto: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  fecha: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
  },
});
