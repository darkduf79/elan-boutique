import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { SimulatedPaymentSheet } from '@/components/SimulatedPaymentSheet';
import { formatPrice } from '@/lib/format';
import { DELIVERY_MODES, getDeliveryMode } from '@/lib/orderStatus';
import { STRIPE_AVAILABLE, presentStripePayment } from '@/lib/stripe';
import { api, type ApiAddress, type CouponValidation } from '@/services/api';
import { useConnectivity } from '@/services/connectivity';
import { createLocalOrderId, saveLocalOrder, type LocalOrder } from '@/services/localDb';
import { decrementCachedStock } from '@/services/offlineStore';

const CHECKOUT_KEY = '@elan_checkout';

interface Address {
  street: string;
  zip: string;
  city: string;
  country: string;
}

const EMPTY_ADDRESS: Address = { street: '', zip: '', city: '', country: 'France' };

export default function PaiementScreen() {
  const { lines, count, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { isOnline, refresh } = useConnectivity();
  const [submitting, setSubmitting] = useState(false);
  const [simVisible, setSimVisible] = useState(false);

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [deliveryMode, setDeliveryMode] = useState<'standard' | 'express'>('standard');
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const hydrated = useRef(false);

  // Restaure l'adresse et le mode de livraison déjà saisis.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CHECKOUT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.address) setAddress({ ...EMPTY_ADDRESS, ...parsed.address });
          if (parsed.deliveryMode === 'express' || parsed.deliveryMode === 'standard') {
            setDeliveryMode(parsed.deliveryMode);
          }
        }
      } catch {
        // stockage illisible : on repart d'un formulaire vide
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  // Persiste à chaque modification (une fois l'hydratation terminée).
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(CHECKOUT_KEY, JSON.stringify({ address, deliveryMode })).catch(() => {});
  }, [address, deliveryMode]);

  // Charge le carnet d'adresses et pré-sélectionne l'adresse par défaut.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .getAddresses()
      .then((list) => {
        if (cancelled) return;
        setSavedAddresses(list);
        const preferred = list.find((item) => item.isDefault) ?? list[0];
        if (!preferred) return;
        setAddress((prev) =>
          prev.street.trim()
            ? prev
            : {
                street: [preferred.line1, preferred.line2].filter(Boolean).join(', '),
                zip: preferred.postalCode,
                city: preferred.city,
                country: preferred.country || 'France',
              },
        );
        setSelectedAddressId((prev) => prev ?? preferred.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const mode = getDeliveryMode(deliveryMode);
  const shippingCost = mode.cost;
  const discountTotal = coupon?.discountTotal ?? 0;
  const total = Math.max(0, Math.round((subtotal - discountTotal + shippingCost) * 100) / 100);
  const cartItems = lines.map((line) => ({
    productId: line.product.id,
    quantity: line.quantity,
  }));

  const setField = (key: keyof Address, value: string) =>
    setAddress((prev) => ({ ...prev, [key]: value }));

  const applySavedAddress = (saved: ApiAddress) => {
    setSelectedAddressId(saved.id);
    setAddress({
      street: [saved.line1, saved.line2].filter(Boolean).join(', '),
      zip: saved.postalCode,
      city: saved.city,
      country: saved.country || 'France',
    });
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      setCouponError(null);
      return;
    }
    try {
      setCouponLoading(true);
      setCouponError(null);
      const result = await api.validateCoupon({
        items: cartItems,
        couponCode: code,
        shippingCost,
      });
      setCoupon(result);
      setCouponInput(result.coupon?.code ?? code);
    } catch (err: any) {
      setCoupon(null);
      setCouponError(err.message || 'Code promo invalide.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const formattedAddress = `${address.street.trim()}, ${address.zip.trim()} ${address.city.trim()}, ${address.country.trim()}`;

  const handleConfirmOrder = async () => {
    if (lines.length === 0) {
      Alert.alert('Panier vide', 'Votre panier ne contient aucun article.');
      return;
    }
    if (!address.street.trim() || !address.city.trim() || !address.zip.trim()) {
      Alert.alert('Adresse incomplète', 'Renseignez la rue, le code postal et la ville de livraison.');
      return;
    }

    setSubmitting(true);
    try {
      // Décide du mode au moment de payer : en ligne (Stripe) ou hors-ligne (simulation).
      const online = await refresh();

      if (!online) {
        // Hors-ligne : on valide le stock local puis on ouvre la simulation.
        for (const line of lines) {
          const stock = line.product.stock ?? Number.POSITIVE_INFINITY;
          if (line.quantity > stock) {
            Alert.alert(
              'Stock insuffisant',
              `« ${line.product.title} » n'est plus disponible en quantité ${line.quantity} (${stock} en stock local). Ajustez votre panier.`,
            );
            return;
          }
        }
        setSimVisible(true);
        return;
      }

      // En ligne : vérifie le stock serveur AVANT d'encaisser via Stripe.
      const fresh = await Promise.all(lines.map((line) => api.getProductById(line.product.id)));
      for (let i = 0; i < lines.length; i++) {
        if (fresh[i].stock < lines[i].quantity) {
          Alert.alert(
            'Stock insuffisant',
            `« ${lines[i].product.title} » n'est plus disponible en quantité ${lines[i].quantity} (${fresh[i].stock} en stock). Ajustez votre panier.`,
          );
          return;
        }
      }

      if (!STRIPE_AVAILABLE) {
        Alert.alert(
          'Paiement indisponible',
          'Le paiement sécurisé Stripe nécessite l’application mobile (development build).',
        );
        return;
      }

      const intent = await api.createPaymentIntent(cartItems, {
        shippingMode: deliveryMode,
        shippingCost,
        couponCode: coupon?.coupon?.code,
      });
      const expectedTotal = intent.summary?.total ?? total;
      if (intent.amount !== Math.round(expectedTotal * 100)) {
        throw new Error('Le montant du paiement ne correspond pas au total de la commande.');
      }

      const result = await presentStripePayment({
        clientSecret: intent.clientSecret,
        currency: intent.currency,
        name: user?.name,
        email: user?.email,
      });
      if (result === 'canceled') {
        return;
      }

      const newOrder = await api.createOrder({
        items: cartItems,
        shippingAddress: formattedAddress,
        deliveryMode,
        shippingCost,
        status: 'paid',
        couponCode: coupon?.coupon?.code,
      });

      clearCart();
      router.replace({ pathname: '/suivi', params: { orderId: newOrder.id } });
    } catch (err: any) {
      Alert.alert(
        'Erreur',
        err.message || 'Impossible de finaliser le paiement. Vérifiez que le serveur backend est en cours d’exécution.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Aboutissement du paiement simulé hors-ligne : enregistre dans la base locale.
  const handleSimulatedSuccess = async () => {
    const items = lines.map((line) => ({
      productId: line.product.id,
      title: line.product.title,
      quantity: line.quantity,
      price: line.product.price,
    }));

    const order: LocalOrder = {
      id: createLocalOrderId(),
      userId: user?.id,
      items,
      total,
      status: 'paid',
      shippingAddress: formattedAddress,
      deliveryMode,
      shippingCost,
      createdAt: Date.now(),
      offline: true,
      paymentMethod: 'simulation',
      synced: false,
    };

    await saveLocalOrder(order);
    await decrementCachedStock(items);
    clearCart();
    setSimVisible(false);
    router.replace({ pathname: '/suivi', params: { orderId: order.id } });
  };

  if (lines.length === 0 && !submitting) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySubtitle}>Ajoutez des articles avant de passer au paiement.</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 20, paddingHorizontal: 24 }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.btnPrimaryText}>Découvrir nos produits</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement & Validation</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)')}>
            <Ionicons name="home-outline" size={22} color="#111" />
          </TouchableOpacity>
        </View>

        {/* STEPPER */}
        <View style={styles.stepperRow}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepDone]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
            <Text style={styles.stepTextDone}>Panier</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Text style={styles.stepNumActive}>2</Text>
            </View>
            <Text style={styles.stepTextActive}>Livraison</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <Text style={styles.stepText}>Paiement</Text>
          </View>
        </View>

        {/* ADRESSE DE LIVRAISON */}
        <Text style={styles.sectionTitle}>Adresse de livraison</Text>

        {savedAddresses.length > 0 && (
          <View style={styles.savedCard}>
            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>Carnet d’adresses</Text>
              <TouchableOpacity onPress={() => router.push('/adresses')}>
                <Text style={styles.savedManage}>Gérer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRow}>
              {savedAddresses.map((saved) => {
                const active = selectedAddressId === saved.id;
                return (
                  <TouchableOpacity
                    key={saved.id}
                    style={[styles.savedChip, active && styles.savedChipActive]}
                    onPress={() => applySavedAddress(saved)}
                    activeOpacity={0.8}>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'location-outline'}
                      size={13}
                      color={active ? '#2563EB' : '#6B7280'}
                    />
                    <View>
                      <Text style={[styles.savedChipTitle, active && styles.savedChipTitleActive]}>
                        {saved.label || saved.fullName}
                      </Text>
                      <Text style={styles.savedChipSub} numberOfLines={1}>
                        {saved.postalCode} {saved.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Rue et numéro</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="home-outline" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="12 rue des Arbousiers"
              placeholderTextColor="#9CA3AF"
              value={address.street}
              onChangeText={(v) => setField('street', v)}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Code postal</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="75011"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={address.zip}
                  onChangeText={(v) => setField('zip', v)}
                />
              </View>
            </View>
            <View style={{ flex: 1.6 }}>
              <Text style={styles.inputLabel}>Ville</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Paris"
                  placeholderTextColor="#9CA3AF"
                  value={address.city}
                  onChangeText={(v) => setField('city', v)}
                />
              </View>
            </View>
          </View>

          <Text style={styles.inputLabel}>Pays</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="globe-outline" size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="France"
              placeholderTextColor="#9CA3AF"
              value={address.country}
              onChangeText={(v) => setField('country', v)}
            />
          </View>
        </View>

        {/* MODE DE LIVRAISON */}
        <Text style={styles.sectionTitle}>Mode de livraison</Text>
        <View style={styles.card}>
          {DELIVERY_MODES.map((m, idx) => {
            const selected = deliveryMode === m.id;
            return (
              <React.Fragment key={m.id}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.modeOption}
                  onPress={() => setDeliveryMode(m.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? '#2563EB' : '#9CA3AF'}
                  />
                  <View style={[styles.modeIcon, selected && styles.modeIconActive]}>
                    <Ionicons name={m.icon as any} size={18} color={selected ? '#2563EB' : '#6B7280'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modeTitle}>{m.label}</Text>
                    <Text style={styles.modeDelay}>{m.delay}</Text>
                  </View>
                  <Text style={[styles.modePrice, m.cost === 0 && styles.modePriceFree]}>
                    {m.cost === 0 ? 'Gratuit' : formatPrice(m.cost)}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* CODE PROMO */}
        <Text style={styles.sectionTitle}>Code promo</Text>
        <View style={styles.card}>
          {coupon ? (
            <View style={styles.couponAppliedRow}>
              <View style={styles.couponAppliedIcon}>
                <Ionicons name="pricetag" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{coupon.coupon?.code}</Text>
                <Text style={styles.couponAppliedText}>
                  Remise de {formatPrice(coupon.discountTotal)} appliquée
                </Text>
                <Text style={styles.couponScope}>Offre valable sur les articles de la boutique concernée.</Text>
              </View>
              <TouchableOpacity onPress={removeCoupon} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.couponRow}>
                <View style={[styles.inputWrapper, styles.couponInputWrapper]}>
                  <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex. ELAN10"
                    placeholderTextColor="#9CA3AF"
                    value={couponInput}
                    onChangeText={setCouponInput}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.couponButton, couponLoading && styles.couponButtonDisabled]}
                  onPress={applyCoupon}
                  disabled={couponLoading}>
                  {couponLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.couponButtonText}>Appliquer</Text>
                  )}
                </TouchableOpacity>
              </View>
              {couponError && <Text style={styles.couponError}>{couponError}</Text>}
            </>
          )}
        </View>

        {/* RECAPITULATIF DES ARTICLES */}
        <Text style={styles.sectionTitle}>
          Récapitulatif ({count} article{count > 1 ? 's' : ''})
        </Text>
        <View style={styles.card}>
          {lines.map((line, idx) => {
            const imageUri = typeof line.product.image === 'string' ? line.product.image : undefined;
            return (
              <React.Fragment key={line.product.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.productRow}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.placeholderImage]}>
                      <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {line.product.title}
                    </Text>
                    <Text style={styles.productDesc}>
                      Quantité : {line.quantity} × {formatPrice(line.product.price)}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>
                    {formatPrice(line.product.price * line.quantity)}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* TOTAUX */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Sous-total ({count} article{count > 1 ? 's' : ''})
            </Text>
            <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
          </View>
          {discountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Remise ({coupon?.coupon?.code})</Text>
              <Text style={styles.totalDiscount}>−{formatPrice(discountTotal)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison ({mode.label})</Text>
            <Text style={styles.totalValue}>
              {shippingCost === 0 ? 'Gratuit' : formatPrice(shippingCost)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (20%)</Text>
            <Text style={styles.totalValue}>Incluse</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total à payer</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* MODE DE PAIEMENT (en ligne / hors-ligne) */}
        {isOnline ? (
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#1E40AF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>En ligne · Paiement Stripe sécurisé</Text>
              <Text style={styles.infoText}>
                Vous saisirez votre carte (numéro, expiration, CVC) dans l’écran sécurisé Stripe
                qui s’affichera après validation. La commande est enregistrée dans la base en ligne.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#B45309" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.offlineTitle}>Hors-ligne · Paiement simulé local</Text>
              <Text style={styles.offlineText}>
                Le serveur est injoignable. Le paiement sera simulé sur l’appareil et la commande
                enregistrée dans la base hors-ligne, puis synchronisée dès le retour en ligne.
              </Text>
            </View>
          </View>
        )}

        {/* BOUTON CONFIRMER */}
        <TouchableOpacity
          style={[styles.btnPrimary, !isOnline && styles.btnOffline, submitting && styles.btnDisabled]}
          onPress={handleConfirmOrder}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={isOnline ? 'lock-closed' : 'cloud-offline-outline'} size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>
                {isOnline ? `Payer ${formatPrice(total)}` : `Payer ${formatPrice(total)} · simulation`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.reassuranceRow}>
          <View style={styles.reassuranceItem}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
            <Text style={styles.reassuranceText}>Paiement sécurisé</Text>
          </View>
          <View style={styles.reassuranceItem}>
            <Ionicons name="refresh-outline" size={16} color="#6B7280" />
            <Text style={styles.reassuranceText}>Retour 30 jours</Text>
          </View>
          <View style={styles.reassuranceItem}>
            <Ionicons name="headset-outline" size={16} color="#6B7280" />
            <Text style={styles.reassuranceText}>Support dédié</Text>
          </View>
        </View>
      </ScrollView>

      <SimulatedPaymentSheet
        visible={simVisible}
        total={total}
        onCancel={() => setSimVisible(false)}
        onSuccess={handleSimulatedSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDone: { backgroundColor: '#2563EB' },
  stepActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  stepNumActive: { fontSize: 11, color: '#fff', fontWeight: '700' },
  stepText: { fontSize: 10, color: '#6B7280' },
  stepTextDone: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
  stepTextActive: { fontSize: 10, color: '#2563EB', fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 8, marginTop: -16 },

  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  infoText: { fontSize: 11, color: '#1E40AF', marginTop: 2, lineHeight: 15 },

  offlineBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  offlineTitle: { fontSize: 12, fontWeight: '700', color: '#9A3412' },
  offlineText: { fontSize: 11, color: '#9A3412', marginTop: 2, lineHeight: 15 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  inputLabel: { fontSize: 11.5, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 14, color: '#111' },
  inputRow: { flexDirection: 'row', gap: 12 },

  savedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  savedTitle: { fontSize: 12, fontWeight: '700', color: '#111' },
  savedManage: { fontSize: 11.5, fontWeight: '600', color: '#2563EB' },
  savedRow: { gap: 8, paddingRight: 4 },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    maxWidth: 190,
  },
  savedChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  savedChipTitle: { fontSize: 11.5, fontWeight: '600', color: '#111' },
  savedChipTitleActive: { color: '#2563EB' },
  savedChipSub: { fontSize: 10, color: '#6B7280', marginTop: 1 },

  couponRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  couponInputWrapper: { flex: 1, marginBottom: 0 },
  couponButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponButtonDisabled: { opacity: 0.6 },
  couponButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  couponError: { fontSize: 11.5, color: '#DC2626', marginTop: 8 },
  couponAppliedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponAppliedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponAppliedCode: { fontSize: 13, fontWeight: '800', color: '#059669', letterSpacing: 0.5 },
  couponAppliedText: { fontSize: 11.5, color: '#374151', marginTop: 1 },
  couponScope: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  modeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: { backgroundColor: '#EFF6FF' },
  modeTitle: { fontSize: 13, fontWeight: '600', color: '#111' },
  modeDelay: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  modePrice: { fontSize: 13, fontWeight: '700', color: '#111' },
  modePriceFree: { color: '#059669' },

  productRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 13, fontWeight: '600', color: '#111' },
  productDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#111' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },

  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 12, color: '#6B7280' },
  totalValue: { fontSize: 12, fontWeight: '600', color: '#111' },
  totalDiscount: { fontSize: 12, fontWeight: '700', color: '#059669' },
  grandTotalLabel: { fontSize: 14, fontWeight: '700', color: '#111' },
  grandTotalValue: { fontSize: 16, fontWeight: '800', color: '#2563EB' },

  reassuranceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 10,
  },
  reassuranceItem: { alignItems: 'center', gap: 4 },
  reassuranceText: { fontSize: 9, color: '#6B7280' },

  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnOffline: { backgroundColor: '#6D28D9', shadowColor: '#6D28D9' },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 16, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});