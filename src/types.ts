import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIES = ['Mode', 'Électronique', 'Maison', 'Beauté', 'Alimentation'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category | 'Tout', IconName> = {
  Tout: 'grid-outline',
  Mode: 'shirt-outline',
  Électronique: 'hardware-chip-outline',
  Maison: 'home-outline',
  Beauté: 'sparkles-outline',
  Alimentation: 'nutrition-outline',
};

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Libellé affiché sous la photo (ex. « Audio », « Mode Femme ») */
  subcategory: string;
  /** Prix en dollars US */
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  stock: number;
  /** Timestamp de mise en ligne (sert au tri « Nouveautés ») */
  createdAt: number;
  /** URL de la photo. Si absent, une icône colorée sert de visuel. */
  image?: string;
  icon: IconName;
  tint: string;
  /** Boutique qui commercialise le produit. */
  sellerId?: string;
  sellerName?: string;
  sellerSlug?: string;
}
