import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  type AppTheme,
  type ThemeId,
  THEME_ORDER,
  themes,
} from '../constants/theme';

const STORAGE_KEY = 'playtracker.themeId';

type ThemeContextValue = {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  themes: AppTheme[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('playtracker');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!active) return;
      if (saved && saved in themes) setThemeIdState(saved as ThemeId);
    });
    return () => {
      active = false;
    };
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id);
  }, []);

  const theme = themes[themeId];
  const value = useMemo(
    () => ({
      theme,
      themeId,
      setThemeId,
      themes: THEME_ORDER.map((id) => themes[id]),
    }),
    [theme, themeId, setThemeId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

export function useThemeTokens() {
  return useTheme().theme;
}
