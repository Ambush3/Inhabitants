import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/context/ThemeContext';

type ToastOptions = { duration?: number };
type Preset = 'none' | 'done' | 'error';
type ToastMessage = { id: number; title: string; preset: Preset; duration: number };

let idSeq = 0;
const hosts: Array<(m: ToastMessage | null) => void> = [];

function emit(
  title: string,
  preset: Preset,
  haptic: 'success' | 'error' | 'none',
  opts?: ToastOptions
) {
  idSeq += 1;
  const message: ToastMessage = {
    id: idSeq,
    title,
    preset,
    duration: (opts?.duration ?? 2.5) * 1000,
  };
  const top = hosts[hosts.length - 1];
  top?.(message);
  if (haptic === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (haptic === 'error') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

const api = {
  show: (message: string, opts?: ToastOptions) => emit(message, 'none', 'none', opts),
  success: (message: string, opts?: ToastOptions) => emit(message, 'done', 'success', opts),
  error: (message: string, opts?: ToastOptions) => emit(message, 'error', 'error', opts),
  info: (message: string, opts?: ToastOptions) => emit(message, 'none', 'none', opts),
  hide: () => hosts[hosts.length - 1]?.(null),
};

export function ToastHost() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fn = (m: ToastMessage | null) => {
      if (m === null) {
        if (timer.current) clearTimeout(timer.current);
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      } else {
        setToast(m);
      }
    };
    hosts.push(fn);
    return () => {
      const i = hosts.indexOf(fn);
      if (i >= 0) hosts.splice(i, 1);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    if (toast.duration > 0) {
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, toast.duration);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  if (!toast) return null;

  const iconName =
    toast.preset === 'done'
      ? 'checkmark-circle'
      : toast.preset === 'error'
        ? 'close-circle'
        : 'information-circle';
  const iconColor =
    toast.preset === 'done' ? '#34C759' : toast.preset === 'error' ? c.danger : c.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        alignItems: 'center',
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
        ],
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}>
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>
          {toast.title}
        </Text>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return api;
}
