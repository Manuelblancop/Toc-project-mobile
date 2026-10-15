import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { EmeraldSpinner } from '@/components/emerald-spinner';
import { completarEjercicioAsignado } from '@/lib/erp';

const NIVELES_ANSIEDAD = [0, 1, 2, 3, 4, 5];
const RADIO = 44;
const SEGMENTOS = 48;

type SesionGuardada = {
  startTime: number;
  duracionSegundos: number;
  restantePausa: number | null;
};

function claveSesion(ejercicioId: string) {
  return `erp-sesion:${ejercicioId}`;
}

async function leerSesion(ejercicioId: string, duracionSegundos: number): Promise<SesionGuardada | null> {
  try {
    const crudo = await AsyncStorage.getItem(claveSesion(ejercicioId));
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<SesionGuardada>;
    if (
      typeof dato.startTime !== 'number' ||
      dato.duracionSegundos !== duracionSegundos ||
      (dato.restantePausa !== null && typeof dato.restantePausa !== 'number')
    ) {
      return null;
    }
    return { startTime: dato.startTime, duracionSegundos, restantePausa: dato.restantePausa ?? null };
  } catch {
    return null;
  }
}

async function guardarSesion(ejercicioId: string, sesion: SesionGuardada) {
  try {
    await AsyncStorage.setItem(claveSesion(ejercicioId), JSON.stringify(sesion));
  } catch {
    // Sin storage el temporizador sigue en memoria.
  }
}

async function limpiarSesion(ejercicioId: string) {
  try {
    await AsyncStorage.removeItem(claveSesion(ejercicioId));
  } catch {
    // Nada que limpiar.
  }
}

function formatearTiempo(totalSegundos: number) {
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}

function Anillo({ progreso, pausado }: { progreso: number; pausado: boolean }) {
  const activos = Math.round(SEGMENTOS * progreso);
  return (
    <View style={styles.anillo} pointerEvents="none">
      {Array.from({ length: SEGMENTOS }, (_, indice) => {
        const angulo = (indice / SEGMENTOS) * Math.PI * 2 - Math.PI / 2;
        const encendido = indice < activos;
        return (
          <View
            key={indice}
            style={[
              styles.segmento,
              {
                backgroundColor: encendido ? (pausado ? '#7a7f94' : '#5a8a6e') : '#e8f2ec',
                left: 50 + Math.cos(angulo) * RADIO - 3,
                top: 50 + Math.sin(angulo) * RADIO - 3,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function SesionActiva({
  ejercicioId,
  titulo,
  descripcion,
  duracionSegundos,
}: {
  ejercicioId: string;
  titulo: string;
  descripcion: string;
  duracionSegundos: number;
}) {
  const [hidratado, setHidratado] = useState(false);
  const [restante, setRestante] = useState(duracionSegundos);
  const [pausado, setPausado] = useState(false);
  const [nivelAnsiedad, setNivelAnsiedad] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const restanteRef = useRef(duracionSegundos);
  const objetivoRef = useRef<number | null>(null);
  const pausadoRef = useRef(false);

  const terminado = hidratado && restante === 0;
  const progreso = duracionSegundos === 0 ? 1 : restante / duracionSegundos;

  useEffect(() => {
    pausadoRef.current = pausado;
  }, [pausado]);

  useEffect(() => {
    let activo = true;

    void (async () => {
      const guardada = duracionSegundos > 0 ? await leerSesion(ejercicioId, duracionSegundos) : null;
      if (!activo) return;

      if (guardada && guardada.restantePausa != null) {
        restanteRef.current = guardada.restantePausa;
        objetivoRef.current = null;
        setRestante(guardada.restantePausa);
        setPausado(true);
        pausadoRef.current = true;
        setHidratado(true);
        return;
      }

      if (guardada) {
        const objetivo = guardada.startTime + guardada.duracionSegundos * 1000;
        const siguiente = Math.max(0, Math.ceil((objetivo - Date.now()) / 1000));
        restanteRef.current = siguiente;
        objetivoRef.current = objetivo;
        setRestante(siguiente);
        setPausado(false);
        pausadoRef.current = false;
        setHidratado(true);
        return;
      }

      const startTime = Date.now();
      restanteRef.current = duracionSegundos;
      objetivoRef.current = startTime + duracionSegundos * 1000;
      setRestante(duracionSegundos);
      setPausado(false);
      pausadoRef.current = false;
      if (duracionSegundos > 0) {
        await guardarSesion(ejercicioId, {
          startTime,
          duracionSegundos,
          restantePausa: null,
        });
      }
      if (activo) setHidratado(true);
    })();

    return () => {
      activo = false;
    };
  }, [ejercicioId, duracionSegundos]);

  useEffect(() => {
    if (!hidratado || duracionSegundos <= 0 || pausado) return;

    const aplicarTick = () => {
      if (pausadoRef.current) return restanteRef.current;
      const objetivo = objetivoRef.current;
      if (objetivo == null) return restanteRef.current;
      const siguiente = Math.max(0, Math.ceil((objetivo - Date.now()) / 1000));
      restanteRef.current = siguiente;
      setRestante((prev) => (prev === siguiente ? prev : siguiente));
      return siguiente;
    };

    aplicarTick();
    const intervalo = setInterval(() => {
      const siguiente = aplicarTick();
      if (siguiente === 0) clearInterval(intervalo);
    }, 1000);

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') aplicarTick();
    });

    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [hidratado, duracionSegundos, pausado]);

  function handlePausa() {
    if (terminado) return;

    setPausado((prev) => {
      if (prev) {
        const objetivo = Date.now() + restanteRef.current * 1000;
        objetivoRef.current = objetivo;
        pausadoRef.current = false;
        void guardarSesion(ejercicioId, {
          startTime: objetivo - duracionSegundos * 1000,
          duracionSegundos,
          restantePausa: null,
        });
        return false;
      }

      if (objetivoRef.current != null) {
        const congelado = Math.max(0, Math.ceil((objetivoRef.current - Date.now()) / 1000));
        restanteRef.current = congelado;
        setRestante(congelado);
      }
      objetivoRef.current = null;
      pausadoRef.current = true;
      void guardarSesion(ejercicioId, {
        startTime: Date.now() - (duracionSegundos - restanteRef.current) * 1000,
        duracionSegundos,
        restantePausa: restanteRef.current,
      });
      return true;
    });
  }

  function cancelarSesion() {
    void limpiarSesion(ejercicioId);
    router.push('/erp');
  }

  async function guardarCierre() {
    if (nivelAnsiedad === null || guardando || !terminado) return;
    const texto = feedback.trim();
    if (!texto) {
      setErrorGuardado('Contanos brevemente cómo te fue.');
      return;
    }

    setGuardando(true);
    setErrorGuardado(null);
    const resultado = await completarEjercicioAsignado(ejercicioId, nivelAnsiedad, texto);
    if (!resultado.success) {
      setErrorGuardado(resultado.detalle);
      setGuardando(false);
      return;
    }
    await limpiarSesion(ejercicioId);
    router.push('/erp');
  }

  if (!hidratado) {
    return (
      <View style={styles.cargando}>
        <EmeraldSpinner />
      </View>
    );
  }

  return (
    <View style={styles.tarjeta}>
      <View style={styles.asa} />
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>{descripcion}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pausado ? 'Reanudar temporizador' : 'Pausar temporizador'}
        onPress={handlePausa}
        style={styles.circulo}>
        <Anillo progreso={progreso} pausado={pausado && !terminado} />
        <Text style={styles.tiempo}>{terminado ? '✓' : formatearTiempo(restante)}</Text>
      </Pressable>

      <Text style={styles.pista}>
        {pausado && !terminado
          ? 'Temporizador en pausa. Tocá el círculo para reanudar.'
          : 'Quedate con la incomodidad. El impulso va a bajar solo.'}
      </Text>

      {errorGuardado && !terminado ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorGuardado}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={cancelarSesion}
        disabled={guardando}
        style={[styles.cancelar, guardando && styles.deshabilitado]}>
        <Text style={styles.cancelarTexto}>Cancelar</Text>
      </Pressable>

      <Modal visible={terminado} transparent animationType="fade" onRequestClose={() => router.push('/erp')}>
        <View style={styles.modalFondo}>
          <View style={styles.dialogo} accessibilityViewIsModal>
            <Text style={styles.dialogoTitulo}>{titulo}</Text>
            <Text style={styles.dialogoAyuda}>El tiempo terminó. Contanos cómo te fue.</Text>
            <Text style={styles.campo}>Nivel de ansiedad experimentado (0 al 5)</Text>
            <View style={styles.niveles}>
              {NIVELES_ANSIEDAD.map((nivel) => {
                const activo = nivelAnsiedad === nivel;
                return (
                  <Pressable
                    key={nivel}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    disabled={guardando}
                    onPress={() => setNivelAnsiedad(nivel)}
                    style={[styles.nivel, activo && styles.nivelActivo, guardando && styles.deshabilitado]}>
                    <Text style={[styles.nivelTexto, activo && styles.nivelTextoActivo]}>{nivel}</Text>
                  </Pressable>
                );
              })}
            </View>
            {nivelAnsiedad === null ? <Text style={styles.elegir}>Elegí un nivel</Text> : null}
            <Text style={styles.campo}>¿Cómo te fue? (Detalle breve)</Text>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              maxLength={1000}
              multiline
              editable={!guardando}
              style={styles.textarea}
            />
            {errorGuardado ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorGuardado}
              </Text>
            ) : null}
            <View style={styles.acciones}>
              <Pressable
                accessibilityRole="button"
                disabled={guardando}
                onPress={() => router.push('/erp')}>
                <Text style={styles.volver}>Volver</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={guardando || nivelAnsiedad === null}
                onPress={() => {
                  void guardarCierre();
                }}
                style={[styles.guardar, (guardando || nivelAnsiedad === null) && styles.deshabilitado]}>
                <Text style={styles.guardarTexto}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cargando: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  tarjeta: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  asa: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 17, 23, 0.08)',
    marginBottom: 24,
  },
  titulo: {
    marginBottom: 8,
    fontFamily: Fonts.serif,
    color: '#0f1117',
    fontSize: 22,
  },
  descripcion: {
    marginBottom: 24,
    color: '#7a7f94',
    fontSize: 14,
    lineHeight: 22,
  },
  circulo: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anillo: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  segmento: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tiempo: {
    fontFamily: Fonts.serif,
    color: '#0f1117',
    fontSize: 22,
    fontWeight: '600',
  },
  pista: {
    marginBottom: 20,
    color: '#7a7f94',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    marginBottom: 16,
    color: '#c87070',
    fontSize: 14,
  },
  cancelar: {
    borderWidth: 1,
    borderColor: 'rgba(15, 17, 23, 0.08)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelarTexto: {
    color: '#7a7f94',
    fontSize: 14,
    fontWeight: '600',
  },
  deshabilitado: {
    opacity: 0.6,
  },
  modalFondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 17, 23, 0.6)',
    padding: 24,
  },
  dialogo: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  dialogoTitulo: {
    fontFamily: Fonts.serif,
    color: '#0f1117',
    fontSize: 20,
  },
  dialogoAyuda: {
    marginTop: 4,
    color: '#7a7f94',
    fontSize: 14,
  },
  campo: {
    marginTop: 16,
    color: '#0f1117',
    fontSize: 14,
    fontWeight: '500',
  },
  niveles: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  nivel: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 17, 23, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  nivelActivo: {
    borderColor: '#5a8a6e',
    backgroundColor: '#5a8a6e',
  },
  nivelTexto: {
    color: '#7a7f94',
    fontSize: 13,
    fontWeight: '600',
  },
  nivelTextoActivo: {
    color: '#ffffff',
  },
  elegir: {
    marginTop: 6,
    color: '#7a7f94',
    fontSize: 12,
  },
  textarea: {
    marginTop: 4,
    minHeight: 96,
    borderWidth: 1,
    borderColor: 'rgba(15, 17, 23, 0.08)',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0f1117',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  acciones: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  volver: {
    color: '#7a7f94',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guardar: {
    borderRadius: 12,
    backgroundColor: '#5a8a6e',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guardarTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
