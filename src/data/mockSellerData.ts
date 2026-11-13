import { FilterOption, ProductItem, SellerProfile } from '../types/seller';

export const mockSellerProfile: SellerProfile = {
  name: 'Atelier Élan Paris',
  isPro: true,
  tagline: 'Créateur maroquinerie & lifestyle',
  avatarUrl:
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
  kpis: {
    clientRating: 4.9,
    monthlySales: 48,
    onTimeShippingRate: 99.4,
  },
};

export const mockProducts: ProductItem[] = [
  {
    id: 'prod-h1',
    tag: {
      label: '#H1',
      type: 'custom',
    },
    title: 'Casque Sans Fil Élan H1',
    subtitle: 'Audio haute-fidélité ANC',
    price: 129.0,
    originalPrice: 149.0,
    stockCount: 24,
    stockStatus: 'in_stock',
    isOnline: true,
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'prod-bag',
    tag: {
      label: 'Alerte',
      type: 'alert',
    },
    title: 'Sacoche Cuir Noir Minimal',
    subtitle: 'Cuir pleine fleur tannage végétal',
    price: 110.0,
    stockCount: 3,
    stockStatus: 'low_stock',
    isOnline: true,
    imageUrl:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'prod-watch',
    title: 'Montre Minimaliste Horizon',
    subtitle: 'Cadran 38mm verre saphir',
    price: 145.0,
    stockCount: 18,
    stockStatus: 'in_stock',
    isOnline: true,
    imageUrl:
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'prod-sneakers',
    tag: {
      label: 'Épuisé',
      type: 'danger',
    },
    title: 'Sneakers Basses Blanc Pur',
    subtitle: 'Semelle amortie cousue Blake',
    price: 85.0,
    stockCount: 0,
    stockStatus: 'out_of_stock',
    isOnline: false,
    imageUrl:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=80',
  },
];

export const mockFilterOptions: FilterOption[] = [
  { id: 'all', label: 'Tous', count: 12 },
  { id: 'in_stock', label: 'En stock', count: 9 },
  { id: 'low_stock', label: 'Bientôt épuisé', count: 2 },
  { id: 'out_of_stock', label: 'Épuisé', count: 1 },
];
