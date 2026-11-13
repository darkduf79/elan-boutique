import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, type ApiSeller, type ApiUser, type AuthResponse } from '@/services/api';

const TOKEN_KEY = '@elan_auth_token';
const USER_KEY = '@elan_auth_user';
const SELLER_KEY = '@elan_auth_seller';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'seller';
  shopName?: string;
  tagline?: string;
  description?: string;
}

interface AuthContextValue {
  user: ApiUser | null;
  seller: ApiSeller | null;
  token: string | null;
  isAuthenticated: boolean;
  isSeller: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [seller, setSeller] = useState<ApiSeller | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate auth state on startup
  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedSeller = await AsyncStorage.getItem(SELLER_KEY);
        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setSeller(storedSeller ? JSON.parse(storedSeller) : null);
        }
      } catch (err) {
        console.error('Erreur de restauration de session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageData();
  }, []);

  const persistSession = useCallback(async (res: AuthResponse) => {
    setAuthToken(res.token);
    setUser(res.user);
    setSeller(res.seller ?? null);
    setToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    if (res.seller) {
      await AsyncStorage.setItem(SELLER_KEY, JSON.stringify(res.seller));
    } else {
      await AsyncStorage.removeItem(SELLER_KEY);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      await persistSession(res);
      return res;
    },
    [persistSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api.register({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role ?? 'customer',
        shopName: input.shopName,
        tagline: input.tagline,
        description: input.description,
      });
      await persistSession(res);
      return res;
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setSeller(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, SELLER_KEY]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      seller,
      token,
      isAuthenticated: Boolean(user && token),
      isSeller: Boolean(user && user.role === 'seller'),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, seller, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider');
  }
  return context;
}
