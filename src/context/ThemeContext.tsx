import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/libs/supabase';

const DARK_MODE_KEY = 'dark_mode_preference'; // legacy
const THEME_KEY = 'theme_id';

export type ThemeColors = {
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
  accent: string;
  danger: string;
};

type Theme = {
  dark: boolean;
  colors: ThemeColors;
  // Optional image that takes over key surfaces (Explore/Settings panels, top bar).
  backgroundImage?: number;
  scrim?: string;
};

export type ThemeOption = {
  id: string;
  name: string;
  swatch: string; // representative color shown in the picker
  theme: Theme;
};

export const THEMES: ThemeOption[] = [
  {
    id: 'light',
    name: 'Classic Light',
    swatch: '#007AFF',
    theme: {
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
        accent: '#007AFF',
        danger: '#ff3b30',
      },
    },
  },
  {
    id: 'dark',
    name: 'Classic Dark',
    swatch: '#0A84FF',
    theme: {
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
        accent: '#0A84FF',
        danger: '#ff4444',
      },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: '#38BDF8',
    theme: {
      dark: true,
      colors: {
        background: '#0b1220',
        surface: '#111a2e',
        text: '#e8eefc',
        subtext: '#8fa3c8',
        border: '#1f2c47',
        inputBorder: '#2a3a5c',
        placeholder: '#5d6f93',
        headerBg: '#0b1220',
        panelBg: '#0e1626',
        tagBg: '#1a2540',
        buttonBg: '#38BDF8',
        accent: '#38BDF8',
        danger: '#ff5a5a',
      },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: '#FF7A59',
    theme: {
      dark: true,
      colors: {
        background: '#1a0f12',
        surface: '#261519',
        text: '#fdeee8',
        subtext: '#c79a8e',
        border: '#3a2127',
        inputBorder: '#4a2a31',
        placeholder: '#7c5650',
        headerBg: '#1a0f12',
        panelBg: '#211216',
        tagBg: '#33191f',
        buttonBg: '#FF7A59',
        accent: '#FF7A59',
        danger: '#ff4d4d',
      },
    },
  },
  {
    id: 'neonGlow',
    name: 'Neon Glow',
    swatch: '#39FF14',
    theme: {
      dark: true,
      colors: {
        background: '#0a0a0a',
        surface: '#161616',
        text: '#ffffff',
        subtext: '#9a9a9a',
        border: '#2a2a2a',
        inputBorder: '#3a3a3a',
        placeholder: '#5a5a5a',
        headerBg: '#0a0a0a',
        panelBg: '#121212',
        tagBg: '#222222',
        buttonBg: '#39FF14',
        accent: '#39FF14',
        danger: '#ff2e88',
      },
    },
  },
  {
    id: 'grape',
    name: 'Grape Soda',
    swatch: '#A78BFA',
    theme: {
      dark: true,
      colors: {
        background: '#15101f',
        surface: '#1f1730',
        text: '#f1ecfb',
        subtext: '#a594c4',
        border: '#2e2342',
        inputBorder: '#3b2c55',
        placeholder: '#6c5a8c',
        headerBg: '#15101f',
        panelBg: '#1a1228',
        tagBg: '#281c3d',
        buttonBg: '#A78BFA',
        accent: '#A78BFA',
        danger: '#ff5d8f',
      },
    },
  },
  {
    id: 'graffiti-monsters',
    name: 'Graffiti Monsters',
    swatch: '#22D3EE',
    theme: {
      dark: true,
      backgroundImage: require('../../assets/themes/graffiti-monsters.jpg'),
      scrim: 'rgba(0,0,0,0.55)',
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        text: '#ffffff',
        subtext: '#d6d6d6',
        border: 'rgba(255,255,255,0.18)',
        inputBorder: 'rgba(255,255,255,0.3)',
        placeholder: 'rgba(255,255,255,0.5)',
        headerBg: '#0a0a0a',
        panelBg: 'rgba(0,0,0,0.45)',
        tagBg: 'rgba(255,255,255,0.14)',
        buttonBg: '#22D3EE',
        accent: '#22D3EE',
        danger: '#ff4d6d',
      },
    },
  },
  {
    id: 'stickers',
    name: 'Sticker Bomb',
    swatch: '#FFD400',
    theme: {
      dark: true,
      backgroundImage: require('../../assets/themes/sticker-collage-inhabitants.jpg'),
      scrim: 'rgba(0,0,0,0.55)',
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        text: '#ffffff',
        subtext: '#d6d6d6',
        border: 'rgba(255,255,255,0.18)',
        inputBorder: 'rgba(255,255,255,0.3)',
        placeholder: 'rgba(255,255,255,0.5)',
        headerBg: '#0a0a0a',
        panelBg: 'rgba(0,0,0,0.45)',
        tagBg: 'rgba(255,255,255,0.14)',
        buttonBg: '#FFD400',
        accent: '#FFD400',
        danger: '#ff4d6d',
      },
    },
  },
];

const DEFAULT_ID = 'light';

function themeById(id: string): Theme {
  return (THEMES.find((t) => t.id === id) ?? THEMES[0]).theme;
}

type ThemeContextType = {
  theme: Theme;
  themeId: string;
  themes: ThemeOption[];
  setThemeId: (id: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  loadThemeForUser: (userId: string) => Promise<void>;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: themeById(DEFAULT_ID),
  themeId: DEFAULT_ID,
  themes: THEMES,
  setThemeId: () => { },
  darkMode: false,
  toggleDarkMode: () => { },
  loadThemeForUser: async () => { },
  resetTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_ID);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved && THEMES.some((t) => t.id === saved)) {
        setThemeIdState(saved);
        return;
      }
      // migrate legacy dark-mode flag
      const legacy = await AsyncStorage.getItem(DARK_MODE_KEY);
      if (legacy !== null) setThemeIdState(legacy === 'true' ? 'dark' : 'light');
    })();
  }, []);

  async function persist(id: string) {
    await AsyncStorage.setItem(THEME_KEY, id);
    await AsyncStorage.setItem(DARK_MODE_KEY, String(themeById(id).dark));
    if (userId) {
      await supabase.from('profiles').update({ theme_id: id }).eq('id', userId);
    }
  }

  function setThemeId(id: string) {
    setThemeIdState(id);
    persist(id);
  }

  async function loadThemeForUser(id: string) {
    setUserId(id);
    const { data } = await supabase.from('profiles').select('theme_id, dark_mode').eq('id', id).single();
    if (data?.theme_id && THEMES.some((t) => t.id === data.theme_id)) {
      setThemeIdState(data.theme_id);
      await AsyncStorage.setItem(THEME_KEY, data.theme_id);
    } else if (data?.dark_mode !== undefined && data?.dark_mode !== null) {
      const id2 = data.dark_mode ? 'dark' : 'light';
      setThemeIdState(id2);
      await AsyncStorage.setItem(THEME_KEY, id2);
    }
  }

  function resetTheme() {
    setUserId(null);
  }

  function toggleDarkMode() {
    setThemeId(themeById(themeId).dark ? 'light' : 'dark');
  }

  const theme = themeById(themeId);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        themes: THEMES,
        setThemeId,
        darkMode: theme.dark,
        toggleDarkMode,
        loadThemeForUser,
        resetTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
