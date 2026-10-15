import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import {
  DIAS_ERP,
  etiquetaDuracion,
  type DiaErp,
  type EjercicioAsignadoVista,
} from '@/lib/erp';

const PILDORA: Record<string, { fondo: string; texto: string }> = {
  Fácil: { fondo: '#E7F6F0', texto: '#2C8A6E' },
  Medio: { fondo: '#5DCAA5', texto: '#12382E' },
  Difícil: { fondo: '#12382E', texto: '#E7F6F0' },
};

export function EjerciciosAsignados({
  ejercicios,
  diaInicial,
}: {
  ejercicios: EjercicioAsignadoVista[];
  diaInicial: DiaErp;
}) {
  const [dia, setDia] = useState<DiaErp>(diaInicial);
  const delDia = ejercicios.filter((ejercicio) => ejercicio.diaAsignado === dia);

  return (
    <View>
      <Text style={styles.titulo}>Mis Ejercicios Asignados</Text>
      <Text style={styles.ayuda}>
        Elegí el día e iniciá el ejercicio. Al terminar el tiempo, registrá cómo te sentiste.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist">
        {DIAS_ERP.map((nombre) => {
          const activo = nombre === dia;
          return (
            <Pressable
              key={nombre}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => setDia(nombre)}
              style={[styles.tab, activo && styles.tabActivo]}>
              <Text style={[styles.tabTexto, activo && styles.tabTextoActivo]}>{nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {delDia.length === 0 ? (
        <Text style={styles.vacio}>Este día todavía no tiene ejercicios. Tu profesional puede asignarlos.</Text>
      ) : (
        <View style={styles.lista}>
          {delDia.map((ejercicio) => {
            const pildora = PILDORA[ejercicio.dificultad] ?? { fondo: '#f1f5f9', texto: '#334155' };
            const resultado =
              ejercicio.nivelAnsiedad == null ? 'Completado' : `Completado · ${ejercicio.nivelAnsiedad}/5`;
            return (
              <View key={ejercicio.id} style={styles.tarjeta}>
                <View style={styles.encabezado}>
                  <Text style={styles.nombre}>{ejercicio.titulo}</Text>
                  <View style={[styles.pildora, { backgroundColor: pildora.fondo }]}>
                    <Text style={[styles.pildoraTexto, { color: pildora.texto }]}>{ejercicio.dificultad}</Text>
                  </View>
                </View>
                <Text style={styles.descripcion}>{ejercicio.descripcion}</Text>
                <View style={styles.pie}>
                  <Text style={styles.duracion}>⏱ {etiquetaDuracion(ejercicio.duracionSegundos)}</Text>
                  {ejercicio.completado ? (
                    <View style={styles.completado}>
                      <Text style={styles.completadoTexto}>{resultado}</Text>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: '/erp/sesion/[id]', params: { id: ejercicio.id } })
                      }
                      style={styles.iniciar}>
                      <Text style={styles.iniciarTexto}>Iniciar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontFamily: Fonts.serif,
    color: '#0f1117',
    fontSize: 20,
  },
  ayuda: {
    marginTop: 4,
    color: '#7a7f94',
    fontSize: 14,
    lineHeight: 20,
  },
  tabs: {
    marginTop: 20,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabActivo: {
    borderBottomColor: '#5DCAA5',
  },
  tabTexto: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextoActivo: {
    color: '#0f172a',
  },
  vacio: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lista: {
    marginTop: 16,
    gap: 12,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  encabezado: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  nombre: {
    flex: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  pildora: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  pildoraTexto: {
    fontSize: 10,
    fontWeight: '600',
  },
  descripcion: {
    marginBottom: 12,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  duracion: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  iniciar: {
    marginLeft: 'auto',
    borderRadius: 10,
    backgroundColor: '#5a8a6e',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iniciarTexto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  completado: {
    marginLeft: 'auto',
    borderRadius: 10,
    backgroundColor: '#e8f2ec',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  completadoTexto: {
    color: '#3d6b52',
    fontSize: 13,
    fontWeight: '600',
  },
});
