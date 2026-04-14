'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api, type User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function persistAuth(token: string, refresh: string, user: User) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshAccessToken(refresh: string): Promise<{ access: string; refresh: string } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate auth state on mount and attempt token refresh
  useEffect(() => {
    const token = getStoredToken();
    const refresh = getStoredRefreshToken();
    const storedUser = getStoredUser();

    if (!token || !refresh) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Try to verify token by fetching /auth/me/
    api.getMe(token)
      .then((fetchedUser) => {
        setUser(fetchedUser);
        setIsLoading(false);
      })
      .catch(async () => {
        // Token may be expired, try refresh
        const refreshed = await refreshAccessToken(refresh);
        if (refreshed) {
          localStorage.setItem(ACCESS_TOKEN_KEY, refreshed.access);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refresh);
          // Re-fetch user with new token
          api.getMe(refreshed.access)
            .then((fetchedUser) => {
              setUser(fetchedUser);
              if (storedUser) {
                localStorage.setItem(USER_KEY, JSON.stringify(fetchedUser));
              }
            })
            .catch(() => {
              clearAuth();
              setUser(null);
            })
            .finally(() => setIsLoading(false));
        } else {
          clearAuth();
          setUser(null);
          setIsLoading(false);
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    persistAuth(data.access, data.refresh, data.user);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const data = await api.register({ email, password, display_name: displayName });
    persistAuth(data.access, data.refresh, data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const getToken = useCallback(() => getStoredToken(), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
