import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from "@react-native-async-storage/async-storage";

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
};

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    darkMode: false,
    toggleDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('darkMode').then(value => {
            if (value === 'true') setDarkMode(true);
        });
    }, []);

    function toggleDarkMode() {
        setDarkMode(prev => {
            const next = !prev;
            AsyncStorage.setItem('darkMode', String(next));
            return next;
        });
    }

    return (
        <ThemeContext.Provider value={{ theme: darkMode ? darkTheme : lightTheme, darkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}