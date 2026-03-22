import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SpotDeepLink() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { theme } = useTheme();
    const c = theme.colors;

    useEffect(() => {
        if (!id) {
            router.replace('/');
            return;
        }

        async function loadAndNavigate() {
            const [{ data: { session } }, spotResult] = await Promise.all([
                supabase.auth.getSession(),
                supabase.from('spots').select('*').eq('id', id).single(),
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);

            if (!spotResult.data) {
                router.replace('/auth');
                return;
            }

            if (!session) {
                await AsyncStorage.setItem('pendingDeepLink', JSON.stringify({
                    id: spotResult.data.id,
                    lat: spotResult.data.lat,
                    lng: spotResult.data.lng,
                }));
                router.replace('/auth');
                return;
            }

            router.replace({
                pathname: '/',
                params: {
                    deepLinkSpotId: spotResult.data.id,
                    deepLinkLat: spotResult.data.lat,
                    deepLinkLng: spotResult.data.lng,
                },
            });
        }

        loadAndNavigate();
    }, [id]);

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 12, color: c.subtext, fontSize: 14 }}>Opening spot...</Text>
        </View>
    );
}