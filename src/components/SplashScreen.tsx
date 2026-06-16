import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  const HOLD_AFTER_ANIMATION_MS = 1500;
  const FADE_DURATION_MS = 1000;

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => { });
  }, []);

  const handleAnimationFinish = () => {
    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }).start(onFinish);
    }, HOLD_AFTER_ANIMATION_MS);
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <LottieView
        source={require('../../assets/animations/wheel.json')}
        autoPlay={true}
        loop={false}
        onAnimationFinish={handleAnimationFinish}
        style={styles.animation}
      />
      <Text style={styles.title}>Inhabitants</Text>
      <Text style={styles.subtitle}>find your spot.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  animation: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f5f0e8',
    letterSpacing: 2,
    marginTop: 12,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 14,
    color: '#a89880',
    letterSpacing: 4,
    marginTop: 6,
    fontFamily: 'monospace',
  },
});
