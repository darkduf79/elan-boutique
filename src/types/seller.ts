export type ProductBadgeType = 'custom' | 'alert' | 'danger';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductTag {
  label: string;
  type: ProductBadgeType;
}

export interface ProductItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  stockStatus: StockStatus;
  isOnline: boolean;
  imageUrl: string;
  tag?: ProductTag;
}

export interface SellerKPIs {
  clientRating: number;
  monthlySales: number;
  onTimeShippingRate: number;
}

export interface SellerProfile {
  name: string;
  isPro: boolean;
  tagline: string;
  avatarUrl: string;
  kpis: SellerKPIs;
}

export type FilterCategory = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface FilterOption {
  id: FilterCategory;
  label: string;
  count: number;
}

export type SectionTab = 'products' | 'orders';

export type BottomTabKey = 'dashboard' | 'orders' | 'catalog' | 'finances' | 'shop';

export interface BottomNavItem {
  key: BottomTabKey;
  label: string;
  iconName: string;
}
