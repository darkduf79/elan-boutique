import type { Category, Product } from '@/types';

export type SortKey = 'pertinence' | 'prix-asc' | 'prix-desc' | 'nouveautes' | 'notes';
export type PriceRange = 'all' | 'lt50' | '50-100' | 'gt100';
export type MinRating = 0 | 4 | 4.5;

export interface Filters {
  priceRange: PriceRange;
  minRating: MinRating;
  inStockOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = { priceRange: 'all', minRating: 0, inStockOnly: false };

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'pertinence', label: 'Pertinence' },
  { key: 'prix-asc', label: 'Prix croissant' },
  { key: 'prix-desc', label: 'Prix décroissant' },
  { key: 'nouveautes', label: 'Nouveautés' },
  { key: 'notes', label: 'Mieux notés' },
];

export const PRICE_RANGES: { key: PriceRange; label: string }[] = [
  { key: 'all', label: 'Tous les prix' },
  { key: 'lt50', label: 'Moins de $50' },
  { key: '50-100', label: '$50 – $100' },
  { key: 'gt100', label: 'Plus de $100' },
];

export const MIN_RATINGS: { key: MinRating; label: string }[] = [
  { key: 0, label: 'Toutes' },
  { key: 4, label: '4★ et plus' },
  { key: 4.5, label: '4,5★ et plus' },
];

/** Minuscules + suppression des accents, pour une recherche tolérante. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function matchesPrice(price: number, range: PriceRange): boolean {
  switch (range) {
    case 'lt50':
      return price < 50;
    case '50-100':
      return price >= 50 && price <= 100;
    case 'gt100':
      return price > 100;
    default:
      return true;
  }
}

export function countActiveFilters(filters: Filters): number {
  return (
    (filters.priceRange !== 'all' ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0)
  );
}

interface QueryOptions {
  query: string;
  category: Category | null;
  sort: SortKey;
  filters: Filters;
}

export function queryProducts(products: Product[], { query, category, sort, filters }: QueryOptions): Product[] {
  const needle = normalize(query);
  const result = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (needle && !normalize(`${p.name} ${p.category}`).includes(needle)) return false;
    if (!matchesPrice(p.price, filters.priceRange)) return false;
    if (p.rating < filters.minRating) return false;
    if (filters.inStockOnly && p.stock <= 0) return false;
    return true;
  });

  switch (sort) {
    case 'prix-asc':
      return result.sort((a, b) => a.price - b.price);
    case 'prix-desc':
      return result.sort((a, b) => b.price - a.price);
    case 'nouveautes':
      return result.sort((a, b) => b.createdAt - a.createdAt);
    case 'notes':
      return result.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    default:
      return result; // ordre du catalogue
  }
}
