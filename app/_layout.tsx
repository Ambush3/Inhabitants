import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/hooks/useAuth';

export default function RootLayout() {
    const { session, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (session) {
            router.replace('/');
        } else {
            router.replace('/auth');
        }
    }, [session, loading]);

    return (
        <>
            <StatusBar style="dark" backgroundColor="#000000" />
            <Stack screenOptions={{ headerShown: false }} />
        </>
    );
}