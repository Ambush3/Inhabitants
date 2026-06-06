import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Image } from 'react-native';
import LottieView from 'lottie-react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

const GSD_START = new Date('2026-06-01T00:00:00');
const GSD_END = new Date('2026-06-22T00:00:00');

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const now = new Date();
  const isGSDWeek = now >= GSD_START && now < GSD_END;

  const HOLD_AFTER_ANIMATION_MS = 1500;
  const FADE_DURATION_MS = 1000;
  const GSD_HOLD_MS = 4200;
  const GSD_FADE_MS = 400;

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => { });
    if (isGSDWeek) {
      const t = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: GSD_FADE_MS,
          useNativeDriver: true,
        }).start(onFinish);
      }, GSD_HOLD_MS);
      return () => clearTimeout(t);
    }
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

  if (isGSDWeek) {
    return (
      <Animated.View style={[styles.gsdContainer, { opacity }]}>
        <Image
          source={require('../../assets/images/go-skateboarding-day.png')}
          style={styles.gsdImage}
          resizeMode="cover"
        />
      </Animated.View>
    );
  }

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
  gsdContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gsdImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
