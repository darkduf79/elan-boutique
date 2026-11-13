import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterSheet } from '@/components/FilterSheet';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProductCard } from '@/components/ProductCard';
import { ServerOfflineView } from '@/components/ServerOfflineView';
import { SortSheet } from '@/components/SortSheet';
import { Toast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  queryProducts,
  type Filters,
  type SortKey,
} from '@/lib/catalog';
import { api, apiProductToClientProduct } from '@/services/api';
import { cacheCatalog, readCachedCatalog } from '@/services/offlineStore';
import { colors, radius } from '@/theme';
import { CATEGORIES, CATEGORY_ICONS, type Category, type Product } from '@/types';

export default function AccueilScreen() {
  const router = useRouter();
  const { cart, wishlist, addToCart, toggleWishlist } = useCart();
  const searchRef = useRef<ElementRef<typeof TextInput>>(null);

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [sort, setSort] = useState<SortKey>('pertinence');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);

  const loadProducts = useCallback(async () => {
    // Hors-ligne instantané : on affiche d'abord le catalogue local s'il existe.
    const cached = await readCachedCatalog();
    if (cached) {
      setRawProducts(cached.products.map(apiProductToClientProduct));
      setSavedAt(cached.savedAt);
      setLoading(false);
    }

    try {
      setServerError(null);
      const apiData = await api.getProducts();
      await cacheCatalog(apiData);
      setRawProducts(apiData.map(apiProductToClientProduct));
      setSavedAt(Date.now());
      setIsOffline(false);
    } catch (err: any) {
      if (cached) {
        // Le serveur est injoignable mais le catalogue local prend le relais.
        setIsOffline(true);
        setServerError(null);
      } else {
        setServerError(err.message || 'Impossible de joindre le serveur.');
        setRawProducts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  const products = useMemo(
    () => queryProducts(rawProducts, { query, category, sort, filters }),
    [rawProducts, query, category, sort, filters],
  );
  const activeFilters = countActiveFilters(filters);
  const hasCriteria = query.trim() !== '' || category !== null || activeFilters > 0;

  const showToast = useCallback((message: string) => setToast((t) => ({ message, key: (t?.key ?? 0) + 1 })), []);
  const hideToast = useCallback(() => setToast(null), []);

  const handleAdd = useCallback(
    (product: Product) => {
      const result = addToCart(product);
      if (result === 'added') showToast(`« ${product.name} » ajouté au panier`);
      else if (result === 'max') showToast('Stock maximum atteint pour cet article');
      else showToast('Cet article est en rupture de stock');
    },
    [addToCart, showToast],
  );

  const resetAll = useCallback(() => {
    setQuery('');
    setCategory(null);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.cell}>
        <ProductCard
          product={item}
          wishlisted={wishlist.includes(item.id)}
          quantityInCart={cart[item.id] ?? 0}
          onToggleWishlist={toggleWishlist}
          onAdd={handleAdd}
          onPress={(prod) => router.push({ pathname: '/produit/[id]', params: { id: prod.id } })}
        />
      </View>
    ),
    [wishlist, cart, toggleWishlist, handleAdd, router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>MMMFB</Text>
          </View>
          <View>
            <Text style={styles.brandSub}>ÉLAN BOUTIQUE</Text>
            <Text style={styles.title}>Accueil</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => searchRef.current?.focus()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Rechercher">
            <Ionicons name="search" size={14} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.avatar}
            onPress={() => router.push('/(tabs)/profil')}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir le profil">
            <Ionicons name="person" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={15} color={colors.textMuted} />
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un produit, une marque..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer la recherche">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Catégories défilantes */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          <Pressable
            style={[styles.chip, category === null && styles.chipSelected]}
            onPress={() => setCategory(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === null }}>
            <Ionicons
              name={CATEGORY_ICONS.Tout}
              size={13}
              color={category === null ? '#fff' : colors.text}
            />
            <Text style={[styles.chipText, category === null && styles.chipTextSelected]}>Tout</Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategory(selected ? null : cat)}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Ionicons
                  name={CATEGORY_ICONS[cat]}
                  size={13}
                  color={selected ? '#fff' : colors.text}
                />
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Barre d'outils Tri / Filtre */}
      <View style={styles.toolbar}>
        <Pressable
          style={styles.toolButton}
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le menu de tri">
          <Ionicons name="swap-vertical" size={13} color={colors.text} />
          <Text style={styles.toolText}>Trier</Text>
        </Pressable>
        <Pressable
          style={styles.toolButton}
          onPress={() => setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les filtres">
          <Ionicons name="options-outline" size={13} color={colors.text} />
          <Text style={styles.toolText}>Filtres</Text>
          {activeFilters > 0 && <View style={styles.filterDot} />}
        </Pressable>
        <Text style={styles.count}>
          {products.length} article{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Bandeau hors-ligne : le catalogue local prend le relais */}
      {isOffline && rawProducts.length > 0 && (
        <OfflineBanner onRetry={onRefresh} savedAt={savedAt} />
      )}

      {/* Contenu principal : Chargement / Erreur serveur / Grille */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
        </View>
      ) : serverError && rawProducts.length === 0 ? (
        <ServerOfflineView onRetry={loadProducts} message={serverError} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucun article trouvé</Text>
              <Text style={styles.emptyText}>Essayez une autre recherche ou modifiez vos filtres.</Text>
              {hasCriteria ? (
                <Pressable style={styles.resetButton} onPress={resetAll} accessibilityRole="button">
                  <Text style={styles.resetText}>Réinitialiser la recherche</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}

      <Toast message={toast?.message ?? null} triggerKey={toast?.key ?? 0} onHide={hideToast} />
      <SortSheet visible={sortOpen} value={sort} onChange={setSort} onClose={() => setSortOpen(false)} />
      <FilterSheet visible={filterOpen} value={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: 9,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  brandSub: { fontSize: 7, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, lineHeight: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 11, color: colors.text, paddingVertical: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 9, gap: 7 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 10, fontWeight: '700', color: colors.text },
  chipTextSelected: { color: '#fff' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingBottom: 7,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 70,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolText: { fontSize: 10, fontWeight: '700', color: colors.text },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  count: { marginLeft: 'auto', fontSize: 8, color: colors.textMuted },
  grid: { paddingHorizontal: 7, paddingBottom: 80, flexGrow: 1 },
  cell: { width: '50%', padding: 4 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  resetButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  resetText: { color: '#fff', fontWeight: '700' },
});
