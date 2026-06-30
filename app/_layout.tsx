import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View, NativeEventEmitter, NativeModules } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useAuth } from '@/src/hooks/useAuth';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { MapProviderProvider } from '@/src/context/MapProviderContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/src/libs/supabase';
import SplashScreen from '@/src/components/SplashScreen';
import { initializeChottuLink } from 'react-native-chottulink-sdk';

ExpoSplashScreen.preventAutoHideAsync();

const CHOTTULINK_KEY = process.env.EXPO_PUBLIC_CHOTTULINK_KEY ?? '';

function RootLayoutInner() {
  const { session, loading } = useAuth();
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initializeChottuLink(CHOTTULINK_KEY);

    const { ChottuLinkEventEmitter } = NativeModules;
    if (!ChottuLinkEventEmitter) return;

    const eventEmitter = new NativeEventEmitter(ChottuLinkEventEmitter);

    const deepLinkSubscription = eventEmitter.addListener('ChottuLinkDeepLinkResolved', (data) => {
      if (!data?.url) return;
      const match = data.url.match(/join\?ref=([a-f0-9-]+)/);
      if (match?.[1]) {
        AsyncStorage.setItem('pending_referral_id', match[1]);
      }
    });

    const deepLinkErrorSubscription = eventEmitter.addListener('ChottuLinkDeepLinkError', (data) => {
      console.log('ChottuLink error:', data?.error);
    });

    return () => {
      deepLinkSubscription.remove();
      deepLinkErrorSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) {
      if (pathname === '/reset-password') return;
      AsyncStorage.getItem('pendingDeepLink').then(async (deepLink) => {
        if (deepLink) {
          AsyncStorage.removeItem('pendingDeepLink');
          const { id, lat, lng } = JSON.parse(deepLink);
          router.replace({
            pathname: '/',
            params: {
              deepLinkSpotId: id,
              deepLinkLat: lat,
              deepLinkLng: lng,
            },
          });
          return;
        }
        const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (!hasSeen) {
          router.replace('/onboarding');
        } else {
          router.replace('/');
        }
      });
    } else {
      if (pathname === '/reset-password' || pathname === '/auth') return;
      Linking.getInitialURL().then((url) => {
        if (url && url.includes('access_token')) return;
        router.replace('/');
      });
    }
  }, [session, loading, pathname]);

  useEffect(() => {
    let handled = false;

    async function handleDeepLink(url: string) {
      if (handled) return;
      if (url.includes('type=recovery') || url.includes('access_token')) {
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        if (accessToken && refreshToken && type === 'recovery') {
          handled = true;
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          router.replace('/reset-password');
        }
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      {!splashDone && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <SplashScreen onFinish={() => setSplashDone(true)} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <MapProviderProvider>
            <ToastProvider>
              <RootLayoutInner />
            </ToastProvider>
          </MapProviderProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
