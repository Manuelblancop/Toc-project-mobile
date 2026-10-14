import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { destinoTrasAuth } from '@/lib/sesion';
import { supabase } from '@/lib/supabase';

function hintDeSesion(error: string | string[] | undefined) {
  const codigo = Array.isArray(error) ? error[0] : error;
  if (codigo === 'perfil') {
    return 'No se pudo crear tu perfil. Intentá de nuevo o contactá soporte.';
  }
  if (codigo === 'auth') {
    return 'No se pudo confirmar la sesión. Volvé a iniciar sesión.';
  }
  return null;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ error?: string }>();
  const hint = hintDeSesion(params.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  async function onSubmit() {
    if (loading) return;

    setError(null);
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password.trim();
    if (!emailValue || !passwordValue) {
      setError('Email o contraseña inválidos.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      });
      if (authError || !data.user) {
        setError('Email o contraseña inválidos.');
        return;
      }

      const destino = await destinoTrasAuth(data.user);
      if (destino === 'sin-perfil') {
        await supabase.auth.signOut();
        setError('Esta cuenta ha sido eliminada o desactivada del sistema.');
        return;
      }
      if (destino === 'sin-rol') {
        await supabase.auth.signOut();
        setError('No se pudo confirmar la sesión. Volvé a iniciar sesión.');
        return;
      }
      router.replace(destino);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Entrar a tu cuenta"
      subtitle="Entrá con tu email y contraseña."
      footer={
        <Text style={styles.footerText}>
          ¿No tenés cuenta?{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/registro')}>
            Registrate
          </Text>
        </Text>
      }>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
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
            autoComplete="off"
            textContentType="none"
            editable={!loading}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={() => {
              void onSubmit();
            }}
            style={[styles.input, focused === 'password' && styles.inputFocused]}
          />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Iniciar Sesión"
          activeOpacity={0.85}
          disabled={loading}
          onPress={() => {
            void onSubmit();
          }}
          style={[styles.submit, loading && styles.submitDisabled]}>
          <Text style={styles.submitText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
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
