import { router, useLocalSearchParams } from 'expo-router';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { EmeraldSpinner } from '@/components/emerald-spinner';
import { pedirSala } from '@/lib/agenda';
import { cargarNotaDeSala, guardarNotaClinica } from '@/lib/doctor';

export default function SalaScreen() {
  const insets = useSafeAreaInsets();
  const { turnoId } = useLocalSearchParams<{ turnoId: string }>();
  const id = Array.isArray(turnoId) ? turnoId[0] : turnoId;
  const [camara, pedirCamara] = useCameraPermissions();
  const [microfono, pedirMicrofono] = useMicrophonePermissions();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [pidiendo, setPidiendo] = useState(true);
  const [esDoctor, setEsDoctor] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [nota, setNota] = useState('');
  const [avisoNota, setAvisoNota] = useState('');
  const [notaOk, setNotaOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('El turno no es válido');
      setPidiendo(false);
      return;
    }

    let activo = true;
    void (async () => {
      const [sala, contexto] = await Promise.all([
        pedirSala(id),
        cargarNotaDeSala(id),
        pedirCamara(),
        pedirMicrofono(),
      ]);
      if (!activo) return;
      if ('error' in sala) setError(sala.error ?? 'No pudimos crear la sala de videollamada');
      else setUrl(sala.url);
      if ('error' in contexto) {
        setAvisoNota(contexto.error ?? 'No pudimos cargar la nota clínica.');
      } else if (contexto.rol === 'DOCTOR') {
        setEsDoctor(true);
        setPacienteId(contexto.pacienteId);
        setNota(contexto.contenido);
      }
      setPidiendo(false);
    })();

    return () => {
      activo = false;
    };
    // Los permisos se piden una sola vez al entrar a esta sala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const concedidos = Boolean(camara?.granted && microfono?.granted);
  const listo = Boolean(url && concedidos && !pidiendo);

  async function volverAPedir() {
    setPidiendo(true);
    await Promise.all([pedirCamara(), pedirMicrofono()]);
    setPidiendo(false);
  }

  async function guardarNota() {
    if (guardando || !id || !pacienteId) return;
    setGuardando(true);
    setNotaOk(false);
    setAvisoNota('');
    const resultado = await guardarNotaClinica(pacienteId, id, nota);
    setGuardando(false);
    if ('error' in resultado) {
      setAvisoNota(resultado.error ?? 'No pudimos guardar la nota.');
      return;
    }
    setNota(nota.trim());
    setNotaOk(true);
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.video}>
        {listo ? (
          <WebView
            style={styles.web}
            source={{ uri: url }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
          />
        ) : (
          <View style={styles.carga}>
            {pidiendo ? <EmeraldSpinner /> : null}
            {!pidiendo && !concedidos ? (
              <>
                <Text style={styles.mensaje}>
                  Para entrar a la videollamada, permití el uso de la cámara y el micrófono.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => void volverAPedir()} style={styles.permitir}>
                  <Text style={styles.permitirTexto}>Permitir cámara y micrófono</Text>
                </Pressable>
              </>
            ) : null}
            {!pidiendo && error ? <Text style={styles.mensaje}>{error}</Text> : null}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.salir, { top: insets.top + 12 }]}
        >
          <Text style={styles.salirTexto}>Salir de la sala</Text>
        </Pressable>
      </View>

      {esDoctor ? (
        <View style={[styles.notas, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.notasTitulo}>Notas clínicas</Text>
          <TextInput
            value={nota}
            onChangeText={(valor) => {
              setNota(valor);
              setNotaOk(false);
            }}
            editable={!guardando}
            multiline
            placeholder="Escribí la evolución clínica de esta sesión..."
            placeholderTextColor="#64748b"
            textAlignVertical="top"
            style={styles.notasInput}
          />
          {avisoNota ? <Text style={styles.notaError}>{avisoNota}</Text> : null}
          {notaOk ? <Text style={styles.notaOk}>Nota guardada.</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={guardando || !nota.trim()}
            onPress={() => void guardarNota()}
            style={[styles.guardar, (guardando || !nota.trim()) && styles.guardarOff]}
          >
            <Text style={[styles.guardarTexto, (guardando || !nota.trim()) && styles.guardarTextoOff]}>
              {guardando ? 'Guardando...' : 'Guardar Nota'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#0f172a' },
  video: { flex: 1, backgroundColor: '#0f172a' },
  web: { flex: 1, backgroundColor: '#0f172a' },
  notas: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  notasTitulo: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  notasInput: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 15,
    backgroundColor: '#f8fafc',
  },
  guardar: {
    alignItems: 'center',
    backgroundColor: '#5DCAA5',
    borderRadius: 12,
    paddingVertical: 12,
  },
  guardarOff: { backgroundColor: '#e2e8f0' },
  guardarTexto: { color: '#12382E', fontSize: 15, fontWeight: '700' },
  guardarTextoOff: { color: '#94a3b8' },
  notaError: { color: '#be123c', fontSize: 13 },
  notaOk: { color: '#047857', fontSize: 13 },
  carga: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 28 },
  mensaje: { marginTop: 16, color: '#334155', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  permitir: { marginTop: 16, backgroundColor: '#5DCAA5', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  permitirTexto: { color: '#12382E', fontSize: 15, fontWeight: '700' },
  salir: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    backgroundColor: '#064e3b',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  salirTexto: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
