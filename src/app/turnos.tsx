import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import {
  cargarAgenda,
  cargarMisTurnos,
  pedirLinkDePago,
  totalConPuntos,
  totalSinPuntos,
  type DoctorAgenda,
  type TurnoPropio,
} from '@/lib/agenda';
import { descuentoAplicadoTurno } from '@/lib/paciente';

const AVATARES = ['#5a8a6e', '#c8a98a', '#6a9ec0'];
const PRECIO_BASE = 30000;
const TARIFA = 1500;

function iniciales(nombre: string) {
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'DR'
  );
}

function pesos(valor: number) {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

function Estrellas({ rating }: { rating: number }) {
  if (rating <= 0) {
    return <Text style={styles.nuevo}>Nuevo en la plataforma · sin calificaciones</Text>;
  }
  const llenas = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <Text style={styles.estrellas} accessibilityLabel={`Calificación ${rating.toFixed(1)} de 5`}>
      {'★'.repeat(llenas)}
      {'☆'.repeat(5 - llenas)} {rating.toFixed(1).replace('.', ',')}
    </Text>
  );
}

export default function TurnosScreen() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctores, setDoctores] = useState<DoctorAgenda[]>([]);
  const [misTurnos, setMisTurnos] = useState<TurnoPropio[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [slot, setSlot] = useState<{
    doctor: DoctorAgenda;
    etiqueta: string;
    horario: string;
    inicio: string;
  } | null>(null);
  const [usarPuntos, setUsarPuntos] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const agenda = await cargarAgenda();
    if ('error' in agenda) {
      setError(agenda.error);
      setCargando(false);
      return;
    }
    setError(null);
    setDoctores(agenda.doctores);
    setPuntos(agenda.puntos);
    const propios = await cargarMisTurnos();
    if (!('error' in propios)) setMisTurnos(propios);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      void (async () => {
        const agenda = await cargarAgenda();
        if (!activo) return;
        if ('error' in agenda) {
          setError(agenda.error);
          setCargando(false);
          return;
        }
        setError(null);
        setDoctores(agenda.doctores);
        setPuntos(agenda.puntos);
        const propios = await cargarMisTurnos();
        if (!activo) return;
        if (!('error' in propios)) setMisTurnos(propios);
        setCargando(false);
      })();
      return () => {
        activo = false;
      };
    }, []),
  );

  const puntosUsados = usarPuntos ? puntos : 0;
  const descuento = descuentoAplicadoTurno(puntosUsados);
  const total = usarPuntos ? totalConPuntos(puntos) : totalSinPuntos();

  function abrir(doctor: DoctorAgenda, etiqueta: string, horario: string, inicio: string) {
    setUsarPuntos(false);
    setErrorPago(null);
    setPagando(false);
    setSlot({ doctor, etiqueta, horario, inicio });
  }

  async function pagar() {
    if (!slot || pagando) return;
    setPagando(true);
    setErrorPago(null);
    const resultado = await pedirLinkDePago(slot.doctor.userId, slot.inicio, puntosUsados);
    if ('error' in resultado) {
      setErrorPago(resultado.error ?? 'No pudimos iniciar el pago. Probá de nuevo en unos segundos.');
      setPagando(false);
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(resultado.initPoint);
    } catch {
      await Linking.openURL(resultado.initPoint);
    }
    setPagando(false);
    setSlot(null);
    await recargar();
  }

  return (
    <View style={styles.page}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Mis turnos</Text>
        <Text style={styles.subtitulo}>Agendá con tu terapeuta</Text>

        {misTurnos.map((turno) => (
          <View key={turno.id} style={styles.propio}>
            <Text style={styles.propioKicker}>
              {turno.estado === 'CONFIRMADO' ? 'Próxima consulta' : 'Sesión finalizada'}
            </Text>
            <Text style={styles.propioNombre}>{turno.profesional}</Text>
            <Text style={styles.propioCuando}>{turno.cuando} · Videoconsulta</Text>
            {turno.estado === 'CONFIRMADO' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/sala/[turnoId]', params: { turnoId: turno.id } })}
                style={styles.videollamada}
              >
                <Text style={styles.videollamadaTexto}>Ingresar a videollamada</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <Text style={styles.kicker}>Sacar nuevo turno</Text>

        {cargando ? (
          <View style={styles.cargando}>
            <EmeraldSpinner />
          </View>
        ) : error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : doctores.length === 0 ? (
          <Text style={styles.vacio}>No hay especialistas verificados por ahora.</Text>
        ) : (
          doctores.map((doctor, index) => (
            <View key={doctor.userId} style={styles.tarjeta}>
              <View style={styles.perfil}>
                <View style={[styles.avatar, { backgroundColor: AVATARES[index % AVATARES.length] }]}>
                  <Text style={styles.avatarTexto}>{iniciales(doctor.nombre)}</Text>
                </View>
                <View style={styles.perfilTexto}>
                  <View style={styles.nombreFila}>
                    <Text style={styles.nombre}>{doctor.nombre}</Text>
                    <View style={styles.verificado}>
                      <Text style={styles.verificadoTexto}>Verificado</Text>
                    </View>
                  </View>
                  <Text style={styles.especialidad}>{doctor.especialidad}</Text>
                  <Estrellas rating={doctor.rating} />
                </View>
              </View>
              <Text style={styles.matricula}>Mat. {doctor.matricula}</Text>
              {doctor.enLinea ? <Text style={styles.enLinea}>En línea</Text> : null}

              {doctor.dias.length === 0 ? (
                <Text style={styles.sinHorarios}>Sin horarios en los próximos 30 días.</Text>
              ) : (
                doctor.dias.map((dia) => (
                  <View key={dia.clave} style={styles.diaBloque}>
                    <Text style={styles.dia}>{dia.etiqueta}</Text>
                    <View style={styles.grilla}>
                      {dia.horarios.map((horario) => {
                        const elegido = slot?.doctor.userId === doctor.userId && slot.inicio === horario.inicio;
                        return (
                          <Pressable
                            key={horario.inicio}
                            accessibilityRole="button"
                            accessibilityState={{ selected: elegido }}
                            onPress={() => abrir(doctor, dia.etiqueta, horario.hora, horario.inicio)}
                            style={[styles.hora, styles.horaLibre, elegido && styles.horaElegida]}>
                            <Text style={[styles.horaTexto, styles.horaTextoLibre, elegido && styles.horaTextoElegida]}>
                              {horario.hora}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={slot != null} transparent animationType="slide" onRequestClose={() => !pagando && setSlot(null)}>
        <Pressable style={styles.fondo} onPress={() => !pagando && setSlot(null)}>
          <Pressable style={styles.dialogo} onPress={() => {}}>
            <View style={styles.asa} />
            <View style={styles.mpFila}>
              <View style={styles.mpMarca}>
                <Text style={styles.mpLetra}>M</Text>
              </View>
              <View>
                <Text style={styles.dialogoTitulo}>Confirmar pago</Text>
                <Text style={styles.dialogoAyuda}>Procesado por MercadoPago</Text>
              </View>
            </View>

            <View style={styles.resumen}>
              <Fila etiqueta="Consulta con" valor={slot?.doctor.nombre ?? ''} />
              <Fila etiqueta="Fecha y hora" valor={slot ? `${slot.etiqueta} · ${slot.horario}` : ''} />
              <Fila etiqueta="Modalidad" valor="Videoconsulta" />
              <Fila etiqueta="Consulta" valor={pesos(PRECIO_BASE)} />
              <Fila etiqueta="Tarifa de servicio (5%)" valor={pesos(TARIFA)} />
              {usarPuntos && descuento > 0 ? (
                <Fila etiqueta="Descuento por puntos" valor={`−${pesos(descuento)}`} />
              ) : null}
              <View style={styles.totalFila}>
                <Text style={styles.totalEtiqueta}>Total</Text>
                <Text style={styles.totalValor}>{pesos(total)}</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: usarPuntos, disabled: puntos === 0 || pagando }}
              disabled={puntos === 0 || pagando}
              onPress={() => setUsarPuntos((activo) => !activo)}
              style={[styles.puntos, usarPuntos && styles.puntosActivo, (puntos === 0 || pagando) && styles.deshabilitado]}>
              <View style={styles.puntosTexto}>
                <Text style={styles.puntosTitulo}>Usar puntos (Máximo 50% de descuento)</Text>
                <Text style={styles.puntosDetalle}>
                  {puntos} pts = {pesos(descuentoAplicadoTurno(puntos))} de descuento
                </Text>
              </View>
              <View style={[styles.switch, usarPuntos && styles.switchActivo]}>
                <View style={[styles.switchPunto, usarPuntos && styles.switchPuntoActivo]} />
              </View>
            </Pressable>

            {errorPago ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorPago}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={pagando}
              onPress={() => {
                void pagar();
              }}
              style={[styles.pagar, pagando && styles.deshabilitado]}>
              <Text style={styles.pagarTexto}>
                {pagando ? 'Redirigiendo a Mercado Pago...' : `Pagar ${pesos(total)}`}
              </Text>
            </Pressable>
            <Text style={styles.candado}>Te llevamos a Mercado Pago para pagar y volvés acá al terminar</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.resumenFila}>
      <Text style={styles.resumenEtiqueta}>{etiqueta}</Text>
      <Text style={styles.resumenValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { backgroundColor: '#f8fafc', padding: 24, paddingBottom: 120, gap: 8 },
  titulo: { color: '#0f172a', fontSize: 24, fontWeight: '600', letterSpacing: -0.4 },
  subtitulo: { marginBottom: 8, color: '#64748b', fontSize: 14 },
  propio: { marginBottom: 12, backgroundColor: '#4a7ea0', borderRadius: 24, padding: 20 },
  propioKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  propioNombre: { marginTop: 8, color: '#ffffff', fontSize: 16, fontWeight: '600' },
  propioCuando: { marginTop: 4, color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  videollamada: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  videollamadaTexto: { color: '#12382E', fontSize: 14, fontWeight: '700' },
  kicker: {
    marginTop: 8,
    marginBottom: 12,
    color: '#7a7f94',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cargando: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c87070', fontSize: 14 },
  vacio: { padding: 16, textAlign: 'center', color: '#7a7f94', fontSize: 13 },
  tarjeta: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  perfil: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  perfilTexto: { flex: 1, gap: 4 },
  nombreFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  nombre: { color: '#171717', fontSize: 16, fontWeight: '500' },
  verificado: { backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  verificadoTexto: { color: '#064e3b', fontSize: 12, fontWeight: '600' },
  especialidad: { color: '#3a3d4a', fontSize: 14 },
  nuevo: { color: '#7a7f94', fontSize: 14 },
  estrellas: { color: '#3d6b52', fontSize: 14 },
  matricula: { marginTop: 8, color: '#7a7f94', fontSize: 12 },
  enLinea: {
    alignSelf: 'flex-start',
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  diaBloque: { marginTop: 12 },
  dia: { marginBottom: 8, color: '#64748b', fontSize: 12, fontWeight: '500' },
  sinHorarios: { marginTop: 12, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hora: { width: '47%', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  horaLibre: { backgroundColor: '#ecfdf5' },
  horaOcupada: { backgroundColor: '#f1f5f9' },
  horaElegida: { backgroundColor: '#5a8a6e' },
  horaTexto: { fontSize: 14, fontWeight: '500' },
  horaTextoLibre: { color: '#047857' },
  horaTextoOcupada: { color: '#94a3b8', textDecorationLine: 'line-through' },
  horaTextoElegida: { color: '#ffffff', textDecorationLine: 'none' },
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 17, 23, 0.6)' },
  dialogo: {
    maxHeight: '90%',
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
    marginBottom: 20,
  },
  mpFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  mpMarca: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#009ee3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpLetra: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  dialogoTitulo: { color: '#0f1117', fontSize: 18, fontWeight: '600' },
  dialogoAyuda: { color: '#7a7f94', fontSize: 13 },
  resumen: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 17, 23, 0.08)',
    backgroundColor: '#f7f6f2',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  resumenEtiqueta: { color: '#7a7f94', fontSize: 14 },
  resumenValor: { color: '#0f1117', fontSize: 14, flexShrink: 1, textAlign: 'right' },
  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 17, 23, 0.08)',
    paddingTop: 8,
  },
  totalEtiqueta: { color: '#7a7f94', fontSize: 15, fontWeight: '600' },
  totalValor: { color: '#0f1117', fontSize: 15, fontWeight: '600' },
  puntos: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#e8f2ec',
    borderRadius: 16,
    padding: 14,
  },
  puntosActivo: { borderColor: '#5a8a6e' },
  puntosTexto: { flex: 1 },
  puntosTitulo: { color: '#3d6b52', fontSize: 14, fontWeight: '500' },
  puntosDetalle: { color: '#5a8a6e', fontSize: 12, marginTop: 2 },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#5a8a6e',
    backgroundColor: '#e8f2ec',
    justifyContent: 'center',
  },
  switchActivo: { backgroundColor: '#5a8a6e' },
  switchPunto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    marginLeft: 2,
  },
  switchPuntoActivo: { marginLeft: 18 },
  pagar: {
    borderRadius: 16,
    backgroundColor: '#009ee3',
    paddingVertical: 15,
    alignItems: 'center',
  },
  pagarTexto: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  candado: { marginTop: 10, textAlign: 'center', color: '#7a7f94', fontSize: 11 },
  deshabilitado: { opacity: 0.6 },
});
