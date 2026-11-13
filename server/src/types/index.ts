export interface Finish {
  name: string;
  hex: string;
}

export interface Feature {
  label: string;
  value: string;
  icon: string;
  tint: string;
  iconColor: string;
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  sellerId?: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  tags?: string[];
  verified: boolean;
  sellerReply?: string;
  sellerReplyAt?: number;
  createdAt: number;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  category: string;
  subcategory?: string;
  headerLabel?: string;
  universe?: string;
  brand?: string;
  ref?: string;
  price: number;
  oldPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  recommend: number;
  image?: string;
  images?: string[];
  finishes?: Finish[];
  features?: Feature[];
  description?: string;
  isOnline: boolean;
  createdAt: number;
  reviews?: Review[];
  seller?: SellerSummary;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'customer' | 'seller';
  createdAt: number;
}

export interface SellerSummary {
  id: string;
  shopName: string;
  slug: string;
  tagline?: string;
  avatarUrl?: string;
  isPro: boolean;
}

export interface Seller {
  id: string;
  userId: string;
  shopName: string;
  slug: string;
  tagline?: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPro: boolean;
  status: 'active' | 'suspended';
  createdAt: number;
}

export interface SellerKPIs {
  clientRating: number;
  monthlySales: number;
  onTimeShippingRate: number;
}

export interface SellerPublic extends Seller {
  kpis: SellerKPIs;
  rating: number;
  reviewCount: number;
  salesCount: number;
  productCount: number;
  categories: string[];
}

export interface SellerDashboard {
  revenueToday: number;
  revenue30d: number;
  revenueAll: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  onlineProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  salesByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: OrderSeller[];
}

export interface OrderItem {
  id?: string;
  productId: string;
  title: string;
  quantity: number;
  price: number;
  sellerId?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface InvoiceSummary {
  id: string;
  sellerId: string;
  amount: number;
}

export interface OrderSeller {
  id: string;
  orderId: string;
  sellerId: string;
  seller?: SellerSummary;
  subtotal: number;
  discount: number;
  shippingShare: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  items: OrderItem[];
  invoiceId?: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress?: string;
  deliveryMode?: string;
  shippingCost?: number;
  discountTotal?: number;
  invoiceId?: string;
  sellerOrders?: OrderSeller[];
  invoices?: InvoiceSummary[];
  createdAt: number;
}

export interface Coupon {
  id: string;
  sellerId: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  maxUses: number;
  usedCount: number;
  startsAt?: number;
  endsAt?: number;
  isActive: boolean;
  createdAt: number;
}

export interface Address {
  id: string;
  userId: string;
  label?: string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: number;
}

export interface QueryFilters {
  q?: string;
  category?: string;
  universe?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: 'pertinence' | 'prix-asc' | 'prix-desc' | 'nouveautes' | 'notes';
}
