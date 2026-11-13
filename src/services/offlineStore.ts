import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiProduct } from '@/services/api';

const CATALOG_KEY = '@elan_catalog_cache';

export interface CachedCatalog {
  products: ApiProduct[];
  savedAt: number;
}

/** Enregistre le catalogue frais comme « base de données » locale de secours. */
export async function cacheCatalog(products: ApiProduct[], savedAt = Date.now()): Promise<void> {
  try {
    const payload: CachedCatalog = { products, savedAt };
    await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(payload));
  } catch {
    // Stockage indisponible : le secours hors-ligne sera simplement absent.
  }
}

/** Décrémente le stock du catalogue local après une commande payée hors-ligne. */
export async function decrementCachedStock(
  items: { productId: string; quantity: number }[],
): Promise<void> {
  const cached = await readCachedCatalog();
  if (!cached) return;
  const products = cached.products.map((product) => {
    const line = items.find((item) => item.productId === product.id);
    return line ? { ...product, stock: Math.max(0, product.stock - line.quantity) } : product;
  });
  await cacheCatalog(products, cached.savedAt);
}

export async function readCachedCatalog(): Promise<CachedCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    if (!Array.isArray(parsed.products) || parsed.products.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function findCachedProduct(id: string): Promise<ApiProduct | null> {
  const cached = await readCachedCatalog();
  return cached?.products.find((product) => product.id === id) ?? null;
}