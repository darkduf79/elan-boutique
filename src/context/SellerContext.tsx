import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { api, type SellerDashboard } from '@/services/api';

interface SellerContextValue {
  dashboard: SellerDashboard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SellerContext = createContext<SellerContextValue | null>(null);

export function SellerProvider({ children }: { children: ReactNode }) {
  const { isSeller } = useAuth();
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSeller) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await api.getSellerDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [isSeller]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const value = useMemo<SellerContextValue>(
    () => ({ dashboard, loading, error, refresh }),
    [dashboard, loading, error, refresh],
  );

  return <SellerContext.Provider value={value}>{children}</SellerContext.Provider>;
}

export function useSellerDashboard(): SellerContextValue {
  const context = useContext(SellerContext);
  if (!context) {
    throw new Error('useSellerDashboard doit être utilisé dans un SellerProvider');
  }
  return context;
}
