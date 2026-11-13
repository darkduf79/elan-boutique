import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

const CART_STORAGE_KEY = '@elan_cart';

export type AddResult = 'added' | 'max' | 'out';

export type CartProduct = {
  id: string;
  title: string;
  price: number;
  image?: any;
  category?: string;
  stock?: number;
};

type CartEntry = {
  productId: string;
  quantity: number;
  product: CartProduct;
};

export type CartLine = {
  product: CartProduct;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** quantité par id de produit (pour les cartes produit) */
  cart: Record<string, number>;
  wishlist: string[];
  addItem: (productId: string, quantity: number, productData: CartProduct) => void;
  addToCart: (product: Product) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  refreshFavorites: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    try {
      const ids = await api.getFavoriteIds();
      setWishlist(ids);
    } catch {
      // Serveur indisponible : on conserve l'état local.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshFavorites();
  }, [refreshFavorites]);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEntries(parsed.filter((e) => e?.productId && e?.product && e.quantity > 0));
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }, [entries, hydrated]);

  const addItem = useCallback((productId: string, quantity = 1, productData: CartProduct) => {
    setEntries((current) => {
      const existing = current.find((entry) => entry.productId === productId);
      if (existing) {
        return current.map((entry) =>
          entry.productId === productId
            ? { ...entry, quantity: entry.quantity + quantity, product: productData }
            : entry,
        );
      }
      return [...current, { productId, quantity, product: productData }];
    });
  }, []);

  const addToCart = useCallback(
    (product: Product): AddResult => {
      if (product.stock <= 0) return 'out';
      const currentQty = entries.find((e) => e.productId === product.id)?.quantity ?? 0;
      if (currentQty >= product.stock) return 'max';
      addItem(product.id, 1, {
        id: product.id,
        title: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        stock: product.stock,
      });
      return 'added';
    },
    [entries, addItem],
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setEntries((current) => {
      if (quantity <= 0) {
        return current.filter((entry) => entry.productId !== productId);
      }
      return current.map((entry) => (entry.productId === productId ? { ...entry, quantity } : entry));
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setEntries((current) => current.filter((entry) => entry.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setEntries([]);
  }, []);

  const toggleWishlist = useCallback(
    (productId: string) => {
      const wasFavorite = wishlist.includes(productId);
      setWishlist((prev) =>
        wasFavorite ? prev.filter((id) => id !== productId) : [...prev, productId],
      );

      if (!isAuthenticated) return;

      api
        .toggleFavorite(productId)
        .then((res) => {
          setWishlist((prev) => {
            const has = prev.includes(res.productId);
            if (res.isFavorite && !has) return [...prev, res.productId];
            if (!res.isFavorite && has) return prev.filter((id) => id !== res.productId);
            return prev;
          });
        })
        .catch(() => {
          // Retour à l'état précédent si le serveur refuse la mise à jour.
          setWishlist((prev) =>
            wasFavorite ? [...prev, productId] : prev.filter((id) => id !== productId),
          );
        });
    },
    [isAuthenticated, wishlist],
  );

  const lines = useMemo<CartLine[]>(
    () => entries.map((entry) => ({ product: entry.product, quantity: entry.quantity })),
    [entries],
  );

  const cart = useMemo<Record<string, number>>(
    () => Object.fromEntries(entries.map((entry) => [entry.productId, entry.quantity])),
    [entries],
  );

  const count = useMemo(() => entries.reduce((total, entry) => total + entry.quantity, 0), [entries]);

  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.product.price * line.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      cart,
      wishlist,
      addItem,
      addToCart,
      setQuantity,
      removeItem,
      clearCart,
      toggleWishlist,
      refreshFavorites,
    }),
    [lines, count, subtotal, cart, wishlist, addItem, addToCart, setQuantity, removeItem, clearCart, toggleWishlist, refreshFavorites],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}