import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { GraficoEvolucion } from '@/components/paciente/grafico-evolucion';
import {
  EMOJIS_ANIMO,
  pesos,
  PUNTOS_POR_ANIMO,
  saludoDelDia,
  type PuntoEvolucionEmocional,
} from '@/lib/emociones';
import {
  cargarInicio,
  descuentoAplicadoTurno,
  guardarEstadoEmocional,
  guardarTriageActual,
} from '@/lib/paciente';

const VALOR_PUNTO = 10;

export default function HomePacienteScreen() {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [puntos, setPuntos] = useState(0);
  const [registrado, setRegistrado] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serie, setSerie] = useState<PuntoEvolucionEmocional[]>([]);
  const [triage, setTriage] = useState('');
  const [textoTriage, setTextoTriage] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardandoTriage, setGuardandoTriage] = useState(false);
  const [errorTriage, setErrorTriage] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    void (async () => {
      const inicio = await cargarInicio();
      if (!activo) return;
      if ('error' in inicio) {
        setErrorCarga(inicio.error);
        setCargando(false);
        return;
      }
      setNombre(inicio.nombre);
      setPuntos(inicio.points);
      setRegistrado(Boolean(inicio.emojiHoy));
      setEmoji(inicio.emojiHoy);
      setSerie(inicio.puntos);
      setTriage(inicio.triageActual);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const descuento = descuentoAplicadoTurno(puntos);
  const valorCheckin = (PUNTOS_POR_ANIMO * VALOR_PUNTO).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  async function seleccionar(valor: number) {
    if (registrado || guardando) return;
    setGuardando(true);
    setError(null);
    const resultado = await guardarEstadoEmocional(valor);
    if (!resultado.success) {
      setError(resultado.detalle);
      if (resultado.detalle === 'Ya registraste tu estado emocional hoy') setRegistrado(true);
      setGuardando(false);
      return;
    }
    setRegistrado(true);
    setEmoji(resultado.emoji);
    setPuntos(resultado.points);
    if (resultado.fecha) {
      const punto = resultado.fecha;
      setSerie((actual) => [...actual, punto]);
    }
    setGuardando(false);
  }

  function abrirTriage() {
    setTextoTriage(triage);
    setErrorTriage(null);
    setModalAbierto(true);
  }

  async function guardarMotivo() {
    setErrorTriage(null);
    setGuardandoTriage(true);
    const resultado = await guardarTriageActual(textoTriage);
    setGuardandoTriage(false);
    if (!resultado.success) {
      setErrorTriage(resultado.detalle);
      return;
    }
    setTriage(resultado.triageActual);
    setModalAbierto(false);
  }

  if (cargando) {
    return (
      <View style={styles.loading}>
        <EmeraldSpinner />
      </View>
    );
  }

  if (errorCarga) {
    return (
      <View style={styles.loading}>
        <Text accessibilityRole="alert" style={styles.error}>
          {errorCarga}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.encabezado}>
          <View style={styles.saludo}>
            <Text style={styles.saludoDia}>{saludoDelDia()}</Text>
            <Text style={styles.hola}>Hola, {nombre}</Text>
          </View>
          <View style={styles.puntos}>
            <Text style={styles.puntosValor}>{puntos} pts</Text>
            <Text style={styles.puntosDetalle}>≈ {pesos(descuento)} de descuento disponible</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Check-in diario</Text>
          <Text style={styles.pregunta}>¿Cómo te sentís hoy, {nombre}?</Text>
          <Text style={styles.ayuda}>
            Una vez por día. Sumás {PUNTOS_POR_ANIMO} puntos ({valorCheckin} en la consulta).
          </Text>
          {registrado ? (
            <View style={styles.yaRegistro}>
              {emoji ? <Text style={styles.emojiGrande}>{emoji}</Text> : null}
              <Text style={styles.yaTitulo}>Ya registraste tu estado hoy.</Text>
              <Text style={styles.yaDetalle}>
                Tenés {puntos} pts
                {descuento > 0 ? ` · hasta ${pesos(descuento)} de descuento.` : '.'} Volvé mañana para
                sumar más.
              </Text>
            </View>
          ) : (
            <View style={styles.caritas}>
              {EMOJIS_ANIMO.map((opcion) => (
                <Pressable
                  key={opcion.valor}
                  accessibilityRole="button"
                  accessibilityLabel={opcion.etiqueta}
                  disabled={guardando}
                  onPress={() => {
                    void seleccionar(opcion.valor);
                  }}
                  style={[styles.carita, guardando && styles.caritaDisabled]}>
                  <Text style={styles.caritaEmoji}>{opcion.emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.seccion}>Tu evolución emocional</Text>
          <GraficoEvolucion datos={serie} />
        </View>

        <View style={styles.card}>
          <Text style={styles.seccion}>Motivo de consulta</Text>
          <Text style={styles.motivo} numberOfLines={2}>
            {triage || 'Tu profesional lo lee antes de la videollamada.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={abrirTriage} style={styles.botonMotivo}>
            <Text style={styles.botonMotivoText}>📝 Actualizar Triage / Motivo de consulta</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={modalAbierto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setModalAbierto(false)}>
          <Pressable style={styles.dialogo} onPress={() => {}}>
            <Text style={styles.dialogoTitulo}>Actualizar triage</Text>
            <Text style={styles.dialogoAyuda}>
              Contale a tu profesional qué te está sucediendo ahora.
            </Text>
            <TextInput
              value={textoTriage}
              onChangeText={setTextoTriage}
              maxLength={1000}
              multiline
              style={styles.textarea}
            />
            {errorTriage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorTriage}
              </Text>
            ) : null}
            <View style={styles.dialogoAcciones}>
              <Pressable accessibilityRole="button" onPress={() => setModalAbierto(false)}>
                <Text style={styles.cancelar}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={guardandoTriage}
                onPress={() => {
                  void guardarMotivo();
                }}
                style={[styles.guardar, guardandoTriage && styles.guardarDisabled]}>
                <Text style={styles.guardarText}>{guardandoTriage ? 'Guardando...' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  page: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingBottom: 120,
    gap: 24,
  },
  encabezado: {
    gap: 16,
  },
  saludo: {
    gap: 6,
  },
  saludoDia: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  hola: {
    color: '#171717',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  puntos: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  puntosValor: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '500',
  },
  puntosDetalle: {
    color: '#737373',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kicker: {
    marginBottom: 4,
    color: '#737373',
    fontSize: 14,
    fontWeight: '500',
  },
  pregunta: {
    color: '#171717',
    fontSize: 18,
    fontWeight: '500',
  },
  ayuda: {
    marginTop: 6,
    color: '#737373',
    fontSize: 14,
    lineHeight: 20,
  },
  caritas: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  carita: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  caritaDisabled: {
    opacity: 0.6,
  },
  caritaEmoji: {
    fontSize: 24,
  },
  yaRegistro: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emojiGrande: {
    marginBottom: 8,
    fontSize: 36,
  },
  yaTitulo: {
    color: '#171717',
    fontWeight: '500',
    textAlign: 'center',
  },
  yaDetalle: {
    marginTop: 4,
    color: '#737373',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  seccion: {
    marginBottom: 16,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  motivo: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  botonMotivo: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botonMotivoText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    marginTop: 16,
    color: '#dc2626',
    fontSize: 14,
  },
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 16,
  },
  dialogo: {
    width: '100%',
    maxWidth: 512,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  dialogoTitulo: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  dialogoAyuda: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
  },
  textarea: {
    marginTop: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  dialogoAcciones: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  cancelar: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guardar: {
    borderRadius: 12,
    backgroundColor: '#5DCAA5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guardarDisabled: {
    opacity: 0.6,
  },
  guardarText: {
    color: '#12382E',
    fontSize: 14,
    fontWeight: '600',
  },
});
