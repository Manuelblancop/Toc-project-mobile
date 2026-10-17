import { useFocusEffect, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { supabase } from '@/lib/supabase';

const CHAT_URL = 'http://192.168.1.231:3000/api/chat/mobile';
const OFERTA_TURNO = '¿querés ver si tu psicólogo/a tiene un turno disponible?';
const AVISO_IA = 'Aura es una IA y puede cometer errores.';
const SATURADO =
  'Disculpá, en este momento mis servidores están un poco saturados. ¿Podemos intentar de nuevo en unos minutitos?';
const SALUDO =
  'Hola, soy Aura. Te indico dónde está cada sección: turnos, puntos, ejercicios o tu perfil.';

type RolChat = 'PACIENTE' | 'AURA';

type Mensaje = {
  id: string;
  rol: RolChat;
  contenido: string;
};

type EstadoChat = {
  isCrisis: boolean;
  isEstres: boolean;
  respuestaAura: string;
};

function idLocal() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AuraScreen() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const enviando = useRef(false);

  const cargar = useCallback(async () => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      setErrorCarga('No hay una sesión activa.');
      setCargando(false);
      return;
    }

    const [perfil, hilo] = await Promise.all([
      supabase.from('perfil_paciente').select('alerta_crisis').eq('user_id', userId).maybeSingle(),
      supabase
        .from('mensajes_chat')
        .select('id, contenido, rol, created_at')
        .eq('paciente_id', userId)
        .order('created_at', { ascending: true }),
    ]);

    if (perfil.error || hilo.error) {
      setErrorCarga('No pudimos cargar el chat. Probá de nuevo.');
      setCargando(false);
      return;
    }

    setCrisis(perfil.data?.alerta_crisis === true);
    setMensajes(
      (hilo.data ?? []).flatMap((fila) => {
        if (fila.rol !== 'PACIENTE' && fila.rol !== 'AURA') return [];
        if (typeof fila.contenido !== 'string' || typeof fila.id !== 'string') return [];
        return [{ id: fila.id, rol: fila.rol, contenido: fila.contenido }];
      }),
    );
    setErrorCarga('');
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enviando.current) return;
      void cargar();
    }, [cargar]),
  );

  async function enviar() {
    const texto = borrador.trim();
    if (!texto || crisis || escribiendo) return;

    setBorrador('');
    setMensajes((prev) => [...prev, { id: idLocal(), rol: 'PACIENTE', contenido: texto }]);
    enviando.current = true;
    setEscribiendo(true);

    try {
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion.session?.access_token;
      if (!token) throw new Error('No autorizado');

      const respuesta = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: texto }),
      });

      const cuerpo = (await respuesta.json()) as Partial<EstadoChat> & { error?: string };
      if (!respuesta.ok) {
        throw new Error(typeof cuerpo.error === 'string' ? cuerpo.error : SATURADO);
      }

      if (cuerpo.isCrisis) {
        setCrisis(true);
        return;
      }

      const respuestaAura = typeof cuerpo.respuestaAura === 'string' ? cuerpo.respuestaAura.trim() : '';
      if (respuestaAura) {
        setMensajes((prev) => [...prev, { id: idLocal(), rol: 'AURA', contenido: respuestaAura }]);
      }
    } catch (error) {
      const detalle = error instanceof Error && error.message ? error.message : SATURADO;
      setMensajes((prev) => [...prev, { id: idLocal(), rol: 'AURA', contenido: detalle }]);
    } finally {
      enviando.current = false;
      setEscribiendo(false);
    }
  }

  if (cargando && mensajes.length === 0) {
    return (
      <View style={styles.cargando}>
        <EmeraldSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {crisis ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>
            Por tu seguridad y normativas de salud, este chat se ha pausado temporalmente. Recordá que
            Aura es un asistente virtual y no un profesional médico. Si necesitás hablar con alguien o
            sentís angustia, la Línea 135 está disponible para escucharte en todo momento.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Linking.openURL('tel:135');
            }}
            style={styles.bannerBoton}
          >
            <Text style={styles.bannerBotonTexto}>Llamar a la Línea 135</Text>
          </Pressable>
        </View>
      ) : null}

      {errorCarga ? <Text style={styles.errorCarga}>{errorCarga}</Text> : null}

      <FlatList
        inverted
        data={[...mensajes].reverse()}
        keyExtractor={(item) => item.id}
        style={styles.lista}
        contentContainerStyle={styles.listaContenido}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          escribiendo ? (
            <View style={styles.burbujaAura}>
              <Text style={styles.textoAura}>escribiendo...</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          mensajes.length === 0 && !crisis ? (
            <View style={styles.burbujaAura}>
              <Text style={styles.textoAura}>{SALUDO}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const esPaciente = item.rol === 'PACIENTE';
          return (
            <View style={esPaciente ? styles.filaPaciente : styles.filaAura}>
              <View style={esPaciente ? styles.burbujaPaciente : styles.burbujaAura}>
                <Text style={esPaciente ? styles.textoPaciente : styles.textoAura}>{item.contenido}</Text>
              </View>
              {!esPaciente && item.contenido === OFERTA_TURNO ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/turnos')}
                  style={styles.turno}
                >
                  <Text style={styles.turnoTexto}>
                    «¿querés ver si tu psicólogo/a tiene un turno disponible?»
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      {crisis ? null : (
        <View style={styles.composer}>
          <View style={styles.filaInput}>
            <TextInput
              value={borrador}
              onChangeText={setBorrador}
              placeholder="Escribí algo..."
              placeholderTextColor="#94a3b8"
              editable={!escribiendo}
              multiline
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!borrador.trim() || escribiendo}
              onPress={() => {
                void enviar();
              }}
              style={[styles.enviar, (!borrador.trim() || escribiendo) && styles.enviarOff]}
            >
              <Text style={styles.enviarTexto}>Enviar</Text>
            </Pressable>
          </View>
          <Text style={styles.aviso}>{AVISO_IA}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  banner: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerTexto: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerBoton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerBotonTexto: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  errorCarga: {
    color: '#475569',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filaPaciente: {
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  filaAura: {
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  burbujaPaciente: {
    maxWidth: '82%',
    backgroundColor: '#064e3b',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  burbujaAura: {
    maxWidth: '82%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textoPaciente: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
  },
  textoAura: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 21,
  },
  turno: {
    marginTop: 8,
    maxWidth: '92%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  turnoTexto: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  composer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  filaInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 15,
  },
  enviar: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  enviarOff: {
    backgroundColor: '#94a3b8',
  },
  enviarTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  aviso: {
    marginTop: 6,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
  },
});
