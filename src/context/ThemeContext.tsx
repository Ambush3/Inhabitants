import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/src/libs/supabase';

type Theme = {
    dark: boolean;
    colors: {
        background: string;
        surface: string;
        text: string;
        subtext: string;
        border: string;
        inputBorder: string;
        placeholder: string;
        headerBg: string;
        panelBg: string;
        tagBg: string;
        buttonBg: string;
        danger: string;
    };
};

const lightTheme: Theme = {
    dark: false,
    colors: {
        background: '#ffffff',
        surface: '#ffffff',
        text: '#000000',
        subtext: '#666666',
        border: '#e5e5e5',
        inputBorder: '#cccccc',
        placeholder: '#999999',
        headerBg: '#ffffff',
        panelBg: '#ffffff',
        tagBg: '#f0f0f0',
        buttonBg: '#000000',
        danger: 'red',
    },
};

const darkTheme: Theme = {
    dark: true,
    colors: {
        background: '#000000',
        surface: '#1e1e1e',
        text: '#ffffff',
        subtext: '#aaaaaa',
        border: '#2c2c2c',
        inputBorder: '#444444',
        placeholder: '#666666',
        headerBg: '#000000',
        panelBg: '#111111',
        tagBg: '#2c2c2c',
        buttonBg: '#ffffff',
        danger: '#ff4444',
    },
};

type ThemeContextType = {
    theme: Theme;
    darkMode: boolean;
    toggleDarkMode: () => void;
    loadThemeForUser: (userId: string) => Promise<void>;
    resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    darkMode: false,
    toggleDarkMode: () => {},
    loadThemeForUser: async () => {},
    resetTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    async function loadThemeForUser(id: string) {
        setUserId(id);
        const { data } = await supabase
            .from('profiles')
            .select('dark_mode')
            .eq('id', id)
            .single();

        if (data) setDarkMode(data.dark_mode ?? false);
    }

    function resetTheme() {
        setDarkMode(false);
        setUserId(null);
    }

    async function toggleDarkMode() {
        const next = !darkMode;
        setDarkMode(next);

        if (userId) {
            await supabase
                .from('profiles')
                .update({ dark_mode: next })
                .eq('id', userId);
        }
    }

    return (
        <ThemeContext.Provider value={{ theme: darkMode ? darkTheme : lightTheme, darkMode, toggleDarkMode, loadThemeForUser, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}