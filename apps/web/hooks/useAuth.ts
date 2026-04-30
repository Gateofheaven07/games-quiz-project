'use client';

import { useState, useCallback, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';
import { destroySocket } from '../lib/socketSingleton';

export interface User {
  id: string;
  username: string;
  email: string;
  level?: number;
  totalScore?: number;
  createdAt?: string;
  avatar?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize from localStorage — validate token against server
  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('auth');
      if (!stored) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      let parsed: { user: User; token: string; refreshToken: string } | null = null;
      try {
        parsed = JSON.parse(stored);
      } catch {
        localStorage.removeItem('auth');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      if (!parsed?.token) {
        localStorage.removeItem('auth');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Validate token against server
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${parsed.token}` },
        });

        const serverUser = response.data?.data?.user;
        if (serverUser) {
          // Token valid — update user data from server (fresher data)
          const mergedUser: User = {
            ...parsed.user,
            ...serverUser,
          };
          const authData = { user: mergedUser, token: parsed.token, refreshToken: parsed.refreshToken };
          localStorage.setItem('auth', JSON.stringify(authData));
          setState({
            user: mergedUser,
            token: parsed.token,
            refreshToken: parsed.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      } catch (err: any) {
        // Token invalid or server error — try refresh
        if (parsed.refreshToken) {
          try {
            const refreshResp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken: parsed.refreshToken,
            });
            const { token: newToken, refreshToken: newRefreshToken } = refreshResp.data.data;

            // Validate new token
            const meResp = await axios.get(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            const serverUser = meResp.data?.data?.user;
            if (serverUser) {
              const authData = { user: serverUser, token: newToken, refreshToken: newRefreshToken };
              localStorage.setItem('auth', JSON.stringify(authData));
              setState({
                user: serverUser,
                token: newToken,
                refreshToken: newRefreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return;
            }
          } catch {
            // Refresh also failed
          }
        }
      }

      // All validation failed — clear auth
      localStorage.removeItem('auth');
      setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    };

    initAuth();
  }, []);

  const saveAuth = useCallback((user: User, tokens: AuthTokens) => {
    const authData = { user, token: tokens.token, refreshToken: tokens.refreshToken };
    localStorage.setItem('auth', JSON.stringify(authData));
    setState((prev) => ({
      ...prev,
      user,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      error: null,
    }));
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
          username,
          email,
          password,
        });

        const { user, token, refreshToken, expiresIn } = response.data.data;
        saveAuth(user, { token, refreshToken, expiresIn });
        return { success: true };
      } catch (err: any) {
        const error = err.response?.data?.error || 'Pendaftaran gagal';
        setState((prev) => ({ ...prev, error }));
        return { success: false, error };
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [saveAuth]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password,
        });

        const { user, token, refreshToken, expiresIn } = response.data.data;
        saveAuth(user, { token, refreshToken, expiresIn });
        return { success: true };
      } catch (err: any) {
        const error = err.response?.data?.error || 'Login gagal';
        setState((prev) => ({ ...prev, error }));
        return { success: false, error };
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [saveAuth]
  );

  const logout = useCallback(() => {
    // Putus socket HANYA saat logout — bukan saat navigasi
    destroySocket();
    localStorage.removeItem('auth');
    setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!state.refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: state.refreshToken,
      });

      const { token, refreshToken, expiresIn } = response.data.data;
      if (state.user) {
        saveAuth(state.user, { token, refreshToken, expiresIn });
      }
      return true;
    } catch (err) {
      logout();
      return false;
    }
  }, [state.refreshToken, state.user, saveAuth, logout]);

  const getAuthClient = useCallback((): AxiosInstance => {
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: state.token ? `Bearer ${state.token}` : '',
      },
    });

    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && state.refreshToken) {
          const success = await refreshAccessToken();
          if (success) {
            return client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );

    return client;
  }, [state.token, state.refreshToken, refreshAccessToken]);

  return {
    ...state,
    register,
    login,
    logout,
    refreshAccessToken,
    getAuthClient,
  };
};
