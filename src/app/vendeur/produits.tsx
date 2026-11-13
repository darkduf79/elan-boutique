import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useSellerDashboard } from '@/context/SellerContext';
import { formatPrice } from '@/lib/format';
import { api, resolveMediaUrl, type ApiProduct } from '@/services/api';
import { CATEGORIES, type Category } from '@/types';

type StatusFilter = 'all' | 'online' | 'offline' | 'low';

type ProductForm = {
  id?: string;
  title: string;
  category: Category;
  subcategory: string;
  price: string;
  oldPrice: string;
  stock: string;
  description: string;
  image: string;
  isOnline: boolean;
};

const EMPTY_FORM: ProductForm = {
  title: '',
  category: 'Mode',
  subcategory: '',
  price: '',
  oldPrice: '',
  stock: '10',
  description: '',
  image: '',
  isOnline: true,
};

export default function SellerProductsScreen() {
  const params = useLocalSearchParams<{ create?: string }>();
  const { refresh: refreshDashboard } = useSellerDashboard();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getMyProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos produits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (params.create === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(EMPTY_FORM);
      setModalVisible(true);
      router.setParams({ create: undefined });
    }
  }, [params.create]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      if (search && !`${product.title} ${product.category} ${product.subcategory ?? ''}`.toLowerCase().includes(search)) {
        return false;
      }
      if (filter === 'online') return product.isOnline;
      if (filter === 'offline') return !product.isOnline;
      if (filter === 'low') return product.stock <= 5;
      return true;
    });
  }, [products, query, filter]);

  const counters = useMemo(
    () => ({
      all: products.length,
      online: products.filter((p) => p.isOnline).length,
      offline: products.filter((p) => !p.isOnline).length,
      low: products.filter((p) => p.stock <= 5).length,
    }),
    [products],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (product: ApiProduct) => {
    setForm({
      id: product.id,
      title: product.title,
      category: (CATEGORIES.includes(product.category as Category) ? product.category : 'Mode') as Category,
      subcategory: product.subcategory ?? '',
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      stock: String(product.stock),
      description: product.description ?? '',
      image: product.image ?? '',
      isOnline: product.isOnline,
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Accès refusé', 'Autorisez l’accès aux photos pour téléverser une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    try {
      setUploading(true);
      const uploaded = await api.uploadImage(result.assets[0].uri);
      setForm((prev) => ({ ...prev, image: uploaded.url }));
    } catch (err: any) {
      Alert.alert('Téléversement impossible', err.message || 'Réessayez avec une autre image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.price.trim()) {
      Alert.alert('Champs requis', 'Le titre et le prix sont obligatoires.');
      return;
    }
    const price = Number(form.price.replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Prix invalide', 'Saisissez un prix valide.');
      return;
    }
    const stock = Number(form.stock.replace(',', '.'));
    if (!Number.isFinite(stock) || stock < 0) {
      Alert.alert('Stock invalide', 'Saisissez une quantité valide.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      subcategory: form.subcategory.trim() || form.category,
      price,
      oldPrice: form.oldPrice ? Number(form.oldPrice.replace(',', '.')) : null,
      stock,
      description: form.description.trim(),
      image: form.image.trim() || null,
      isOnline: form.isOnline,
    };

    try {
      setSaving(true);
      if (form.id) {
        await api.updateProduct(form.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setModalVisible(false);
      await Promise.all([load(), refreshDashboard()]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer le produit.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOnline = async (product: ApiProduct) => {
    try {
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, isOnline: !item.isOnline } : item)),
      );
      await api.updateProduct(product.id, { isOnline: !product.isOnline });
      refreshDashboard();
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, isOnline: product.isOnline } : item)),
      );
      Alert.alert('Erreur', err.message || 'Mise à jour impossible.');
    }
  };

  const handleDelete = (product: ApiProduct) => {
    Alert.alert('Supprimer le produit', `Supprimer « ${product.title} » de votre boutique ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(product.id);
            await Promise.all([load(), refreshDashboard()]);
          } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const previewUri = resolveMediaUrl(form.image);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CATALOGUE</Text>
            <Text style={styles.heading}>Mes produits</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openCreate}>
            <Ionicons name="add" size={18} color={colors.surface} />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}>
          {(
            [
              { id: 'all', label: 'Tous', count: counters.all },
              { id: 'online', label: 'En ligne', count: counters.online },
              { id: 'offline', label: 'Hors ligne', count: counters.offline },
              { id: 'low', label: 'Stock faible', count: counters.low },
            ] as { id: StatusFilter; label: string; count: number }[]
          ).map((option) => {
            const active = filter === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(option.id)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {option.label}
                </Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {option.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.primary}
              />
            }>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.roseInk} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {visible.length === 0 && !error ? (
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={34} color={colors.primary} />
                <Text style={styles.emptyTitle}>Aucun produit</Text>
                <Text style={styles.emptyText}>
                  Ajoutez votre premier article pour commencer à vendre.
                </Text>
                <Pressable style={styles.emptyButton} onPress={openCreate}>
                  <Text style={styles.emptyButtonText}>Créer un produit</Text>
                </Pressable>
              </View>
            ) : (
              visible.map((product) => {
                const image = resolveMediaUrl(product.image);
                const out = product.stock <= 0;
                const low = product.stock > 0 && product.stock <= 5;
                return (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.productTop}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.productImage, styles.placeholder]}>
                          <Ionicons name="image-outline" size={22} color={colors.muted} />
                        </View>
                      )}
                      <View style={styles.productBody}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {product.title}
                        </Text>
                        <Text style={styles.productCategory}>
                          {product.category}
                          {product.subcategory ? ` · ${product.subcategory}` : ''}
                        </Text>
                        <View style={styles.productPriceRow}>
                          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                          {product.oldPrice ? (
                            <Text style={styles.productOldPrice}>{formatPrice(product.oldPrice)}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Switch
                        value={product.isOnline}
                        onValueChange={() => toggleOnline(product)}
                        trackColor={{ true: colors.primary, false: colors.line }}
                        thumbColor={colors.surface}
                      />
                    </View>

                    <View style={styles.productFooter}>
                      <View
                        style={[
                          styles.stockPill,
                          out
                            ? styles.stockOut
                            : low
                            ? styles.stockLow
                            : styles.stockOk,
                        ]}>
                        <Ionicons
                          name={out ? 'close-circle' : low ? 'alert-circle' : 'checkmark-circle'}
                          size={11}
                          color={out ? colors.roseInk : low ? colors.amberInk : colors.mintInk}
                        />
                        <Text
                          style={[
                            styles.stockText,
                            {
                              color: out ? colors.roseInk : low ? colors.amberInk : colors.mintInk,
                            },
                          ]}>
                          {out ? 'Rupture' : low ? `Plus que ${product.stock}` : `${product.stock} en stock`}
                        </Text>
                      </View>
                      <Text style={styles.reviewsText}>{product.reviewCount} avis · {product.rating.toFixed(1)}★</Text>
                      <View style={{ flex: 1 }} />
                      <Pressable style={styles.iconAction} onPress={() => openEdit(product)}>
                        <Ionicons name="create-outline" size={16} color={colors.inkSoft} />
                      </Pressable>
                      <Pressable style={styles.iconAction} onPress={() => handleDelete(product)}>
                        <Ionicons name="trash-outline" size={16} color={colors.roseInk} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {form.id ? 'Modifier le produit' : 'Nouveau produit'}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.imageRow}>
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.imagePreview} resizeMode="cover" />
                  ) : (
                    <View style={[styles.imagePreview, styles.placeholder]}>
                      <Ionicons name="image-outline" size={26} color={colors.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 8 }}>
                    <Pressable
                      style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
                      onPress={pickImage}
                      disabled={uploading}>
                      {uploading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                          <Text style={styles.uploadButtonText}>Choisir une image</Text>
                        </>
                      )}
                    </Pressable>
                    {form.image ? (
                      <Pressable onPress={() => setForm((f) => ({ ...f, image: '' }))}>
                        <Text style={styles.removeImageText}>Retirer l’image</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <FormField
                  label="URL de l’image (optionnel)"
                  value={form.image}
                  placeholder="https://… ou /uploads/…"
                  onChangeText={(image) => setForm((f) => ({ ...f, image }))}
                  autoCapitalize="none"
                />
                <FormField
                  label="Titre du produit"
                  value={form.title}
                  placeholder="Sac à main Élan"
                  onChangeText={(title) => setForm((f) => ({ ...f, title }))}
                />

                <Text style={styles.fieldLabel}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {CATEGORIES.map((category) => {
                    const active = form.category === category;
                    return (
                      <Pressable
                        key={category}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        onPress={() => setForm((f) => ({ ...f, category }))}>
                        <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <FormField
                  label="Sous-catégorie (optionnel)"
                  value={form.subcategory}
                  placeholder="Maroquinerie"
                  onChangeText={(subcategory) => setForm((f) => ({ ...f, subcategory }))}
                />
                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <FormField
                      label="Prix ($)"
                      value={form.price}
                      placeholder="39.90"
                      keyboardType="decimal-pad"
                      onChangeText={(price) => setForm((f) => ({ ...f, price }))}
                    />
                  </View>
                  <View style={styles.column}>
                    <FormField
                      label="Ancien prix (optionnel)"
                      value={form.oldPrice}
                      placeholder="59.90"
                      keyboardType="decimal-pad"
                      onChangeText={(oldPrice) => setForm((f) => ({ ...f, oldPrice }))}
                    />
                  </View>
                </View>
                <FormField
                  label="Stock disponible"
                  value={form.stock}
                  placeholder="10"
                  keyboardType="number-pad"
                  onChangeText={(stock) => setForm((f) => ({ ...f, stock }))}
                />
                <FormField
                  label="Description"
                  value={form.description}
                  placeholder="Décrivez votre produit…"
                  multiline
                  onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                />

                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Visible en boutique</Text>
                    <Text style={styles.switchHint}>Les clients ne voient que les produits en ligne.</Text>
                  </View>
                  <Switch
                    value={form.isOnline}
                    onValueChange={(isOnline) => setForm((f) => ({ ...f, isOnline }))}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor={colors.surface}
                  />
                </View>

                <Pressable
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  disabled={saving || uploading}
                  onPress={handleSave}>
                  {saving ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {form.id ? 'Enregistrer les modifications' : 'Publier le produit'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, color: colors.muted },
  heading: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addButtonText: { fontFamily: fonts.bold, fontSize: 12, color: colors.surface },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 42,
    paddingHorizontal: 12,
    ...shadow.soft,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.ink },
  // Un ScrollView horizontal dans une colonne flex s'étire en hauteur :
  // on lui rend sa hauteur naturelle et on centre les chips verticalement.
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  filterTextActive: { color: colors.surface },
  filterCount: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  filterCountText: { fontFamily: fonts.bold, fontSize: 9, color: colors.muted },
  filterCountTextActive: { color: colors.surface },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.roseSoft,
    borderRadius: radius.md,
    padding: 11,
  },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.roseInk },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  emptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },
  emptyButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.surface },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.soft,
  },
  productTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  productImage: { width: 66, height: 66, borderRadius: radius.md, backgroundColor: colors.bg },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  productBody: { flex: 1 },
  productTitle: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink },
  productCategory: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 2 },
  productPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  productPrice: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  productOldPrice: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  stockOut: { backgroundColor: colors.roseSoft },
  stockLow: { backgroundColor: colors.amberSoft },
  stockOk: { backgroundColor: colors.mint },
  stockText: { fontFamily: fonts.bold, fontSize: 9.5 },
  reviewsText: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  imageRow: { flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' },
  imagePreview: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.bg },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  uploadButtonText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.primary },
  removeImageText: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.roseInk, textAlign: 'center' },
  field: { marginTop: 10 },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  categoryRow: { gap: 8, paddingRight: 4 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  categoryTextActive: { color: colors.surface },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  switchHint: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 2 },
  saveButton: {
    marginTop: 18,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.surface },
});
