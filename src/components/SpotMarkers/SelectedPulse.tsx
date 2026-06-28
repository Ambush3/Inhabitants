import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function SelectedPulse({ selected }: { selected: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [selected]);

  if (!selected) return null;

  const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 33,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#D9D9D9',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}
