import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { api } from '@/services/api';
import { syncOfflineOrders } from '@/services/orderSync';

/**
 * Source de vérité unique « en ligne / hors-ligne » de l'application.
 * « En ligne » signifie que le serveur Élan (et donc Stripe + la base en ligne)
 * est joignable. Sinon, l'app bascule sur la base hors-ligne + paiement simulé.
 */
interface ConnectivityValue {
  isOnline: boolean;
  checking: boolean;
  refresh: () => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityValue | null>(null);

export async function checkOnline(timeoutMs = 3500): Promise<boolean> {
  try {
    await api.checkHealth(timeoutMs);
    return true;
  } catch {
    return false;
  }
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const wasOnline = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    const online = await checkOnline();
    if (!mounted.current) return online;
    setIsOnline(online);
    setChecking(false);
    // Retour en ligne : on pousse les commandes hors-ligne vers la base en ligne.
    if (online && !wasOnline.current) {
      syncOfflineOrders().catch(() => {});
    }
    wasOnline.current = online;
    return online;
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Abonnements à des systèmes externes (timers + état de l'app) :
    // les setState vivent dans leurs callbacks, pas dans le corps de l'effet.
    const initial = setTimeout(() => {
      refresh();
    }, 0);
    const interval = setInterval(() => {
      refresh();
    }, 20000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo<ConnectivityValue>(
    () => ({ isOnline, checking, refresh }),
    [isOnline, checking, refresh],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityValue {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity doit être utilisé dans un ConnectivityProvider');
  }
  return context;
}