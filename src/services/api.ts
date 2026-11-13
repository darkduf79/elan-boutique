/**
 * Client API pour l'application mobile Élan.
 * Permet d'interagir avec le serveur Express / SQLite.
 * Aucune donnée statique / mock n'est utilisée comme repli :
 * les erreurs de connexion déclenchent des messages explicites dans l'UI.
 */

import { File } from 'expo-file-system';

import { CATEGORIES, CATEGORY_ICONS, type Category, type Product } from '@/types';
import type { ProductItem, StockStatus } from '@/types/seller';

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

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface ApiReview {
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
  productTitle?: string;
  productImage?: string;
}

export interface ApiSellerSummary {
  id: string;
  shopName: string;
  slug: string;
  tagline?: string;
  avatarUrl?: string;
  isPro: boolean;
}

export interface ApiProduct {
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
  reviews?: ApiReview[];
  seller?: ApiSellerSummary;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'seller';
  createdAt: number;
}

export interface SellerKPIs {
  clientRating: number;
  monthlySales: number;
  onTimeShippingRate: number;
}

export interface ApiSeller {
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

export interface ApiSellerPublic extends ApiSeller {
  kpis: SellerKPIs;
  rating: number;
  reviewCount: number;
  salesCount: number;
  productCount: number;
  categories: string[];
  stats?: {
    totalProducts: number;
    onlineProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

export interface AuthResponse {
  message: string;
  user: ApiUser;
  seller: ApiSeller | null;
  token: string;
}

export interface MeResponse {
  user: ApiUser;
  seller: ApiSeller | null;
}

export interface OrderItem {
  id?: string;
  productId: string;
  title: string;
  quantity: number;
  price: number;
  sellerId?: string;
}

export interface ApiOrderSeller {
  id: string;
  orderId: string;
  sellerId: string;
  seller?: ApiSellerSummary;
  subtotal: number;
  discount: number;
  shippingShare: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  items: OrderItem[];
  invoiceId?: string;
}

export interface ApiInvoiceSummary {
  id: string;
  sellerId: string;
  amount: number;
}

export interface ApiOrder {
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
  sellerOrders?: ApiOrderSeller[];
  invoices?: ApiInvoiceSummary[];
  createdAt: number;
}

export interface ApiSellerOrder extends ApiOrderSeller {
  buyer?: { id: string; name: string; email: string };
  shippingAddress?: string;
  deliveryMode?: string;
  orderCreatedAt: number;
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
  recentOrders: ApiSellerOrder[];
}

export interface ApiCoupon {
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

export interface ApiAddress {
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

export interface ApiSellerInvoice {
  id: string;
  orderId?: string;
  orderSellerId?: string;
  sellerId: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  status: string;
  createdAt: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  amount: number; // en centimes
  currency: string;
  summary?: {
    subtotal: number;
    discountTotal: number;
    shippingCost: number;
    total: number;
  };
}

export interface CouponValidation {
  coupon: ApiCoupon | null;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  sellerOrders: {
    sellerId: string;
    seller: ApiSellerSummary;
    subtotal: number;
    discount: number;
    shippingShare: number;
    total: number;
  }[];
}

export interface InvoiceLine {
  productId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface ApiInvoice {
  facture_id: string;
  orderId?: string;
  orderSellerId?: string;
  amount: number;
  createdAt: number;
  vendeur_nom: string;
  vendeur_slogan?: string;
  vendeur_slug?: string;
  client_nom: string;
  produit_titre?: string;
  produit_image?: string;
  shippingAddress?: string;
  items: InvoiceLine[];
}

export interface ProductFilters {
  q?: string;
  category?: string;
  universe?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: string;
  sellerView?: boolean;
  sellerId?: string;
  sellerSlug?: string;
}

/** Champs modifiables d'un produit ; `null` efface une valeur optionnelle. */
export type ProductWritePayload = Partial<Omit<ApiProduct, 'oldPrice' | 'image'>> & {
  oldPrice?: number | null;
  image?: string | null;
};

const DEFAULT_BASE_URL = 'http://localhost:3001/api';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

let authToken: string | null = null;

/** Mémorise le token de session pour l'envoyer sur chaque requête protégée. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Transforme un chemin `/uploads/...` en URL absolue affichable par <Image>. */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('file:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/api$/, '')}${url}`;
  }
  return url;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(
        errorBody?.error || `HTTP ${response.status} : ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Délai d’attente dépassé : le serveur ne répond pas.');
    }
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error('Impossible de joindre le serveur. Assurez-vous qu’il est lancé sur le port 3001.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Requête multipart (téléversement d'image) — ne fixe pas le Content-Type. */
async function requestForm<T>(endpoint: string, form: FormData, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: form as unknown as BodyInit,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || `HTTP ${response.status} : ${response.statusText}`);
    }
    return (await response.json()) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Téléversement interrompu : le serveur ne répond pas.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Santé du serveur
  async checkHealth(timeoutMs = 4000): Promise<{ status: string; uptime: number }> {
    return request<{ status: string; uptime: number }>('/health', {}, timeoutMs);
  },

  // Authentification
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: 'customer' | 'seller';
    shopName?: string;
    tagline?: string;
    description?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(token?: string): Promise<MeResponse> {
    return request<MeResponse>('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  // Catalogue & Produits
  async getProducts(filters?: ProductFilters): Promise<ApiProduct[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.q) params.set('q', filters.q);
      if (filters.category && filters.category !== 'Tout') params.set('category', filters.category);
      if (filters.universe) params.set('universe', filters.universe);
      if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
      if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
      if (filters.inStock) params.set('inStock', 'true');
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.sellerView) params.set('sellerView', 'true');
      if (filters.sellerId) params.set('sellerId', filters.sellerId);
      if (filters.sellerSlug) params.set('sellerSlug', filters.sellerSlug);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return request<ApiProduct[]>(endpoint);
  },

  async getProductById(id: string): Promise<ApiProduct> {
    return request<ApiProduct>(`/products/${id}`);
  },

  async createProduct(data: ProductWritePayload): Promise<ApiProduct> {
    return request<ApiProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: string, data: ProductWritePayload): Promise<ApiProduct> {
    return request<ApiProduct>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Boutiques publiques
  async getSellers(): Promise<ApiSellerPublic[]> {
    return request<ApiSellerPublic[]>('/sellers');
  },

  async getSeller(idOrSlug: string): Promise<ApiSellerPublic> {
    return request<ApiSellerPublic>(`/sellers/${encodeURIComponent(idOrSlug)}`);
  },

  async getSellerPublicProducts(
    idOrSlug: string,
    filters?: { q?: string; category?: string; sort?: string; inStock?: boolean },
  ): Promise<ApiProduct[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.category && filters.category !== 'Tout') params.set('category', filters.category);
    if (filters?.sort) params.set('sort', filters.sort);
    if (filters?.inStock) params.set('inStock', 'true');
    const qs = params.toString();
    return request<ApiProduct[]>(
      `/sellers/${encodeURIComponent(idOrSlug)}/products${qs ? `?${qs}` : ''}`,
    );
  },

  // Avis clients
  async getReviews(params?: { productId?: string; sellerId?: string }): Promise<ApiReview[]> {
    const search = new URLSearchParams();
    if (params?.productId) search.set('productId', params.productId);
    if (params?.sellerId) search.set('sellerId', params.sellerId);
    const qs = search.toString();
    return request<ApiReview[]>(`/reviews${qs ? `?${qs}` : ''}`);
  },

  async createReview(data: {
    productId: string;
    rating: number;
    comment: string;
    title?: string;
    tags?: string[];
  }): Promise<ApiReview> {
    return request<ApiReview>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteReview(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/reviews/${id}`, { method: 'DELETE' });
  },

  async replyToReview(id: string, reply: string): Promise<{ id: string; sellerReply: string }> {
    return request<{ id: string; sellerReply: string }>(`/seller/reviews/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  },

  // Favoris synchronisés
  async getFavorites(): Promise<ApiProduct[]> {
    return request<ApiProduct[]>('/favorites');
  },

  async getFavoriteIds(): Promise<string[]> {
    return request<string[]>('/favorites/ids');
  },

  async toggleFavorite(productId: string): Promise<{ productId: string; isFavorite: boolean }> {
    return request<{ productId: string; isFavorite: boolean }>(
      `/favorites/${encodeURIComponent(productId)}/toggle`,
      { method: 'POST' },
    );
  },

  // Adresses
  async getAddresses(): Promise<ApiAddress[]> {
    return request<ApiAddress[]>('/addresses');
  },

  async createAddress(
    data: Omit<ApiAddress, 'id' | 'userId' | 'createdAt'>,
  ): Promise<ApiAddress> {
    return request<ApiAddress>('/addresses', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateAddress(
    id: string,
    data: Partial<Omit<ApiAddress, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<ApiAddress> {
    return request<ApiAddress>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/addresses/${id}`, { method: 'DELETE' });
  },

  // Codes promo
  async validateCoupon(data: {
    items: { productId: string; quantity: number }[];
    couponCode: string;
    shippingCost?: number;
  }): Promise<CouponValidation> {
    return request<CouponValidation>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Commandes
  async getOrders(): Promise<ApiOrder[]> {
    return request<ApiOrder[]>('/orders');
  },

  async getOrderById(id: string): Promise<ApiOrder> {
    return request<ApiOrder>(`/orders/${id}`);
  },

  async createOrder(data: {
    items: { productId: string; quantity: number }[];
    shippingAddress?: string;
    deliveryMode?: 'standard' | 'express';
    shippingCost?: number;
    couponCode?: string;
    status?: OrderStatus;
  }): Promise<ApiOrder> {
    return request<ApiOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderSellerId?: string,
  ): Promise<ApiOrder> {
    return request<ApiOrder>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, orderSellerId }),
    });
  },

  // Paiement Stripe
  async createPaymentIntent(
    items: { productId: string; quantity: number }[],
    options: { shippingMode?: 'standard' | 'express'; shippingCost?: number; couponCode?: string } = {},
  ): Promise<PaymentIntentResponse> {
    return request<PaymentIntentResponse>(
      '/payments/create-intent',
      {
        method: 'POST',
        body: JSON.stringify({
          items,
          shippingMode: options.shippingMode ?? 'standard',
          shippingCost: options.shippingCost,
          couponCode: options.couponCode,
        }),
      },
      15000,
    );
  },

  // Factures
  async createInvoice(data: {
    orderId: string;
    sellerId?: string;
    clientId?: string;
  }): Promise<{ message: string; invoiceId: string; invoiceIds?: string[]; orderId?: string }> {
    return request<{ message: string; invoiceId: string; invoiceIds?: string[]; orderId?: string }>(
      '/factures',
      { method: 'POST', body: JSON.stringify(data) },
    );
  },

  async getInvoice(id: string): Promise<ApiInvoice> {
    return request<ApiInvoice>(`/factures/${id}`);
  },

  // Vendeur — profil & tableau de bord
  async getSellerProfile(): Promise<ApiSellerPublic> {
    return request<ApiSellerPublic>('/seller/profile');
  },

  async updateSellerProfile(
    data: Partial<Pick<ApiSeller, 'shopName' | 'tagline' | 'description' | 'avatarUrl' | 'bannerUrl'>>,
  ): Promise<ApiSellerPublic> {
    return request<ApiSellerPublic>('/seller/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getSellerDashboard(): Promise<SellerDashboard> {
    return request<SellerDashboard>('/seller/dashboard');
  },

  async getMyProducts(): Promise<ApiProduct[]> {
    return request<ApiProduct[]>('/seller/products');
  },

  async getSellerOrders(): Promise<ApiSellerOrder[]> {
    return request<ApiSellerOrder[]>('/seller/orders');
  },

  async getSellerInvoices(): Promise<ApiSellerInvoice[]> {
    return request<ApiSellerInvoice[]>('/seller/invoices');
  },

  async getSellerReviews(): Promise<ApiReview[]> {
    return request<ApiReview[]>('/seller/reviews');
  },

  // Vendeur — codes promo
  async getSellerCoupons(): Promise<ApiCoupon[]> {
    return request<ApiCoupon[]>('/seller/coupons');
  },

  async createCoupon(data: {
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    minSubtotal?: number;
    maxUses?: number;
    startsAt?: number | null;
    endsAt?: number | null;
    isActive?: boolean;
  }): Promise<ApiCoupon> {
    return request<ApiCoupon>('/seller/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCoupon(
    id: string,
    data: Partial<{
      code: string;
      type: 'percent' | 'fixed';
      value: number;
      minSubtotal: number;
      maxUses: number;
      startsAt: number | null;
      endsAt: number | null;
      isActive: boolean;
    }>,
  ): Promise<ApiCoupon> {
    return request<ApiCoupon>(`/seller/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCoupon(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/seller/coupons/${id}`, {
      method: 'DELETE',
    });
  },

  // Téléversement d'image produit
  async uploadImage(localUri: string): Promise<{ url: string; filename: string; size: number }> {
    // Le fetch fourni par Expo (SDK 54+) ne gère pas les parties FormData
    // `{ uri, name, type }` de React Native. On lui passe un `File`, qui
    // implémente Blob et dont `name`/`type`/`bytes()` sont exploitables.
    const form = new FormData();
    form.append('image', new File(localUri) as unknown as Blob);

    return requestForm<{ url: string; filename: string; size: number }>('/uploads', form);
  },
};

/** Convertit un ApiProduct du backend vers le type Product de l'accueil client */
export function apiProductToClientProduct(p: ApiProduct): Product {
  const cat = (CATEGORIES.includes(p.category as any) ? p.category : 'Électronique') as Category;
  return {
    id: p.id,
    name: p.title,
    category: cat,
    subcategory: p.subcategory || p.category,
    price: p.price,
    oldPrice: p.oldPrice,
    rating: p.rating,
    reviews: p.reviewCount,
    stock: p.stock,
    createdAt: p.createdAt,
    image: resolveMediaUrl(p.image || p.images?.[0]),
    icon: CATEGORY_ICONS[cat] || 'cube-outline',
    tint: '#EEF1FB',
    sellerId: p.sellerId,
    sellerName: p.seller?.shopName,
    sellerSlug: p.seller?.slug,
  };
}

/** Convertit un ApiProduct du backend vers le type ProductItem du catalogue vendeur */
export function apiProductToSellerProduct(p: ApiProduct): ProductItem {
  let stockStatus: StockStatus = 'in_stock';
  if (p.stock <= 0) {
    stockStatus = 'out_of_stock';
  } else if (p.stock <= 5) {
    stockStatus = 'low_stock';
  }

  let tag: ProductItem['tag'] = undefined;
  if (p.stock <= 0) {
    tag = { label: 'RUPTURE', type: 'danger' };
  } else if (p.stock <= 3) {
    tag = { label: 'STOCK FAIBLE', type: 'alert' };
  } else if (p.oldPrice && p.oldPrice > p.price) {
    tag = { label: 'PROMO', type: 'custom' };
  }

  return {
    id: p.id,
    title: p.title,
    subtitle: p.subcategory || p.category,
    price: p.price,
    originalPrice: p.oldPrice,
    stockCount: p.stock,
    stockStatus,
    isOnline: p.isOnline,
    imageUrl:
      resolveMediaUrl(p.image || p.images?.[0]) ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    tag,
  };
}
