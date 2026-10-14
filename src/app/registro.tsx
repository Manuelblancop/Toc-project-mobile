import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { destinoTrasAuth, mensajeDeRegistro } from '@/lib/sesion';
import { supabase } from '@/lib/supabase';

type Rol = 'PACIENTE' | 'DOCTOR';

export default function RegistroScreen() {
  const [rol, setRol] = useState<Rol>('PACIENTE');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [focused, setFocused] = useState<'nombre' | 'email' | 'password' | 'matricula' | null>(
    null,
  );

  async function onSubmit() {
    if (loading) return;

    setError(null);
    setAviso(null);
    const nombreValue = nombre.trim();
    const emailValue = email.trim().toLowerCase();
    const matriculaValue = matricula.trim();

    if (!nombreValue) {
      setError('Falta el nombre');
      return;
    }
    if (!emailValue) {
      setError('Falta el email');
      return;
    }
    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (rol === 'DOCTOR' && !matriculaValue) {
      setError('Falta la matrícula');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          data: {
            nombre: nombreValue,
            rol,
            ...(rol === 'DOCTOR' ? { matricula: matriculaValue } : {}),
          },
        },
      });

      if (authError) {
        setError(mensajeDeRegistro(authError.message));
        return;
      }
      if (data.user && data.user.identities?.length === 0) {
        setError('El email ya existe');
        return;
      }
      if (!data.session || !data.user) {
        setAviso('Te enviamos un correo para confirmar la cuenta. Después podés iniciar sesión.');
        return;
      }

      const destino = await destinoTrasAuth(data.user);
      if (destino === 'sin-perfil' || destino === 'sin-rol') {
        setAviso('Tu cuenta se creó. Cuando el perfil esté listo, iniciá sesión.');
        return;
      }
      router.replace(destino);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Elegí tu rol y completá tus datos. Si sos doctor, también tu matrícula."
      footer={
        <Text style={styles.footerText}>
          ¿Ya tenés cuenta?{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/login')}>
            Iniciá sesión
          </Text>
        </Text>
      }>
      <View style={styles.form}>
        <View style={styles.roles}>
          <Text style={styles.label}>Soy</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: rol === 'PACIENTE' }}
              activeOpacity={0.85}
              disabled={loading}
              onPress={() => setRol('PACIENTE')}
              style={[styles.role, rol === 'PACIENTE' ? styles.roleSelected : styles.roleIdle]}>
              <Text style={[styles.roleText, rol === 'PACIENTE' && styles.roleTextSelected]}>
                Paciente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: rol === 'DOCTOR' }}
              activeOpacity={0.85}
              disabled={loading}
              onPress={() => setRol('DOCTOR')}
              style={[styles.role, rol === 'DOCTOR' ? styles.roleSelected : styles.roleIdle]}>
              <Text style={[styles.roleText, rol === 'DOCTOR' && styles.roleTextSelected]}>
                Doctor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            autoComplete="name"
            textContentType="name"
            editable={!loading}
            onFocus={() => setFocused('nombre')}
            onBlur={() => setFocused(null)}
            style={[styles.input, focused === 'nombre' && styles.inputFocused]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            style={[styles.input, focused === 'email' && styles.inputFocused]}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!loading}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={() => {
              if (rol !== 'DOCTOR') void onSubmit();
            }}
            style={[styles.input, focused === 'password' && styles.inputFocused]}
          />
        </View>

        {rol === 'DOCTOR' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Matrícula</Text>
            <TextInput
              value={matricula}
              onChangeText={setMatricula}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onFocus={() => setFocused('matricula')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => {
                void onSubmit();
              }}
              style={[styles.input, focused === 'matricula' && styles.inputFocused]}
            />
          </View>
        ) : null}

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Registrarse"
          activeOpacity={0.85}
          disabled={loading}
          onPress={() => {
            void onSubmit();
          }}
          style={[styles.submit, loading && styles.submitDisabled]}>
          <Text style={styles.submitText}>{loading ? 'Creando cuenta…' : 'Registrarse'}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  roles: {
    gap: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  role: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleSelected: {
    borderColor: '#5DCAA5',
    backgroundColor: '#E7F6F0',
  },
  roleIdle: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  roleText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  roleTextSelected: {
    color: '#12382E',
  },
  field: {
    gap: 4,
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#2563eb',
  },
  error: {
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  aviso: {
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#12382E',
    fontSize: 14,
    lineHeight: 20,
  },
  submit: {
    borderRadius: 8,
    backgroundColor: '#5DCAA5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#12382E',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerLink: {
    color: '#2C8A6E',
    fontWeight: '500',
  },
});
