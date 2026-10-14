import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export function EmeraldSpinner() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={[styles.spinner, { transform: [{ rotate }] }]}
    />
  );
}

const styles = StyleSheet.create({
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: '#10b981',
  },
});
