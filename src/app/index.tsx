import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

const caracteristicas = [
  {
    titulo: 'Turnos online',
    texto: 'Reservá una videoconsulta con un profesional habilitado, el día de agenda.',
  },
  {
    titulo: 'Guía en la plataforma',
    texto:
      'Aura te indica cómo reservar un turno y encontrar cada sección. Si detecta una crisis, muestra la línea 135.',
  },
  {
    titulo: 'Historial médico',
    texto: 'Consultá tus turnos, sesiones y notas en un solo lugar.',
  },
];

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const headerHeight = useRef(0);
  const conocerY = useRef(0);
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(64);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const onHeaderLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    headerHeight.current = nextHeight;
    setMeasuredHeaderHeight(nextHeight);
  };

  const onConocerLayout = (event: LayoutChangeEvent) => {
    conocerY.current = headerHeight.current + event.nativeEvent.layout.y;
  };

  const scrollToConocer = () => {
    scrollRef.current?.scrollTo({ y: conocerY.current, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top }]} onLayout={onHeaderLayout}>
        <View style={styles.headerInner}>
          <Text style={styles.brand} numberOfLines={1}>
            Toc <Text style={styles.brandProject}>Project</Text>
          </Text>
          <View style={styles.nav}>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={() => {}}>
              <Text style={styles.navLink}>Blog</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              style={styles.loginButton}
              onPress={() => router.push('/login')}>
              <Text style={styles.loginText}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              style={styles.registerButton}
              onPress={() => router.push('/registro')}>
              <Text style={styles.registerText}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.band}>
        <View style={[styles.hero, { minHeight: Math.max(windowHeight - measuredHeaderHeight, 0) }]}>
          <Text style={styles.eyebrow}>Acompañamiento para el TOC</Text>
          <Text style={styles.title}>
            Acompañamiento todos los días, no solo el día de tu sesión
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>💬 Charlá con Aura cuando lo necesites.</Text>
            <Text style={styles.bullet}>🧩 Hacé tus ejercicios.</Text>
            <Text style={styles.bullet}>📹 Hablá con tu profesional por videollamada.</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            style={styles.cta}
            onPress={scrollToConocer}>
            <Text style={styles.ctaText}>Conocer más</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardsSection} onLayout={onConocerLayout}>
          {caracteristicas.map((item) => (
            <View key={item.titulo} style={styles.card}>
              <Text style={styles.cardTitle}>{item.titulo}</Text>
              <Text style={styles.cardBody}>{item.texto}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <View style={styles.footerInner}>
          <View style={styles.footerBrandBlock}>
            <Text style={styles.brand}>
              Toc <Text style={styles.brandProject}>Project</Text>
            </Text>
            <Text style={styles.footerNote}>
              Acompañamiento entre consultas. Si hay una urgencia, la línea es el 135, no este
              contacto.
            </Text>
          </View>
          <View>
            <Text style={styles.contactTitle}>Contáctanos</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="WhatsApp 11 2633 2574"
              activeOpacity={0.7}
              style={styles.whatsapp}
              onPress={() => {
                void Linking.openURL('https://wa.me/541126332574');
              }}>
              <Text style={styles.whatsappIcon}>WhatsApp</Text>
              <Text style={styles.whatsappNumber}>11 2633 2574</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerInner: {
    minHeight: 64,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  brand: {
    flexShrink: 1,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  brandProject: {
    color: '#064e3b',
    fontWeight: '600',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  navLink: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  loginText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  registerText: {
    color: '#12382E',
    fontSize: 12,
    fontWeight: '600',
  },
  band: {
    backgroundColor: '#ecfdf5',
  },
  hero: {
    width: '100%',
    maxWidth: 768,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 96,
  },
  eyebrow: {
    color: '#2C8A6E',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 24,
    maxWidth: 672,
    color: '#1e293b',
    fontFamily: Fonts?.serif,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '400',
  },
  bullets: {
    marginTop: 24,
    maxWidth: 576,
    gap: 8,
  },
  bullet: {
    color: '#475569',
    fontSize: 18,
    lineHeight: 29,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 40,
    backgroundColor: '#5DCAA5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#12382E',
    fontSize: 14,
    fontWeight: '600',
  },
  cardsSection: {
    width: '100%',
    maxWidth: 1152,
    alignSelf: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E3F3EB',
    borderRadius: 16,
    padding: 24,
  },
  cardTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: 23,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ccfbf1',
  },
  footerInner: {
    width: '100%',
    maxWidth: 1152,
    alignSelf: 'center',
    gap: 32,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  footerBrandBlock: {
    maxWidth: 384,
    gap: 8,
  },
  footerNote: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 23,
  },
  contactTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  whatsapp: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappIcon: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
  },
  whatsappNumber: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
});
