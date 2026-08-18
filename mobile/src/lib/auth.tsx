import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from './api';
import { clearCachedLeagues } from './leagueCache';
import { clearCachedPlayers } from './playerCache';
import type { User } from '../types';

const TOKEN_KEY = 'playtracker_token';
const USER_KEY = 'playtracker_user';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  const persistSession = useCallback(async (accessToken: string, nextUser: User) => {
    setToken(accessToken);
    setUser(nextUser);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    await persistSession(result.access_token, result.user);
  }, [persistSession]);

  const register = useCallback(async (email: string, password: string) => {
    const result = await api.register(email, password);
    await persistSession(result.access_token, result.user);
  }, [persistSession]);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const result = await api.resetPassword(token, password);
    await persistSession(result.access_token, result.user);
  }, [persistSession]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await api.loginWithGoogle(idToken);
    await persistSession(result.access_token, result.user);
  }, [persistSession]);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await clearCachedLeagues();
    await clearCachedPlayers();
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, register, resetPassword, loginWithGoogle, logout }),
    [token, user, loading, login, register, resetPassword, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
