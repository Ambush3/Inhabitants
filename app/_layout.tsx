import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/hooks/useAuth';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';

function RootLayoutInner() {
    const { session, loading } = useAuth();
    const { darkMode, theme } = useTheme();

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
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
        </>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutInner />
        </ThemeProvider>
    );
}