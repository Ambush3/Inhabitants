import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/libs/supabase';
import { useTheme } from '@/src/context/ThemeContext';

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
            const { data, error } = await supabase
                .from('spots')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                router.replace('/');
                return;
            }

            router.replace({
                pathname: '/',
                params: { deepLinkSpotId: data.id },
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