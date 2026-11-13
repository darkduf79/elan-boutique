import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { api, type ApiCoupon, type ApiSellerInvoice } from '@/services/api';

type CouponForm = {
  id?: string;
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxUses: string;
  isActive: boolean;
};

const EMPTY_COUPON: CouponForm = {
  code: '',
  type: 'percent',
  value: '',
  minSubtotal: '',
  maxUses: '',
  isActive: true,
};

export default function SellerFinancesScreen() {
  const { dashboard, loading: dashboardLoading, refresh: refreshDashboard } = useSellerDashboard();

  const [invoices, setInvoices] = useState<ApiSellerInvoice[]>([]);
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [invoiceData, couponData] = await Promise.all([
        api.getSellerInvoices(),
        api.getSellerCoupons(),
      ]);
      setInvoices(invoiceData);
      setCoupons(couponData);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos finances.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openCreateCoupon = () => {
    setForm(EMPTY_COUPON);
    setModalVisible(true);
  };

  const openEditCoupon = (coupon: ApiCoupon) => {
    setForm({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minSubtotal: coupon.minSubtotal ? String(coupon.minSubtotal) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      isActive: coupon.isActive,
    });
    setModalVisible(true);
  };

  const handleSaveCoupon = async () => {
    if (!form.code.trim() || !form.value.trim()) {
      Alert.alert('Champs requis', 'Le code et la valeur de la remise sont obligatoires.');
      return;
    }
    const value = Number(form.value.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Valeur invalide', 'La remise doit être supérieure à zéro.');
      return;
    }
    if (form.type === 'percent' && value > 100) {
      Alert.alert('Valeur invalide', 'Une remise en pourcentage ne peut pas dépasser 100 %.');
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      minSubtotal: form.minSubtotal ? Number(form.minSubtotal.replace(',', '.')) : 0,
      maxUses: form.maxUses ? Number(form.maxUses) : 0,
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      if (form.id) {
        await api.updateCoupon(form.id, payload);
      } else {
        await api.createCoupon(payload);
      }
      setModalVisible(false);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer le code promo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon: ApiCoupon) => {
    try {
      await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Mise à jour impossible.');
    }
  };

  const deleteCoupon = (coupon: ApiCoupon) => {
    Alert.alert('Supprimer le code', `Supprimer le code « ${coupon.code} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCoupon(coupon.id);
            await load();
          } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const revenue = dashboard
    ? [
        { label: 'Aujourd’hui', value: dashboard.revenueToday },
        { label: '30 jours', value: dashboard.revenue30d },
        { label: 'Total', value: dashboard.revenueAll },
      ]
    : [];
  const maxRevenue = Math.max(1, ...(dashboard?.salesByDay.map((day) => day.revenue) ?? [0]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>REVENUS & OFFRES</Text>
            <Text style={styles.heading}>Finances</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openCreateCoupon}>
            <Ionicons name="add" size={18} color={colors.surface} />
            <Text style={styles.addButtonText}>Code promo</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || dashboardLoading}
              onRefresh={() => {
                setRefreshing(true);
                Promise.all([load(), refreshDashboard()]).finally(() => setRefreshing(false));
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

          <View style={styles.revenueRow}>
            {revenue.map((item, index) => (
              <View
                key={item.label}
                style={[styles.revenueCard, index === 2 && styles.revenueCardPrimary]}>
                <Text style={[styles.revenueLabel, index === 2 && styles.revenueLabelPrimary]}>
                  {item.label}
                </Text>
                <Text style={[styles.revenueValue, index === 2 && styles.revenueValuePrimary]}>
                  {formatPrice(item.value)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Tendance des ventes</Text>
              <Text style={styles.cardHint}>14 jours</Text>
            </View>
            <View style={styles.chart}>
              {(dashboard?.salesByDay ?? []).map((day) => (
                <View key={day.date} style={styles.chartColumn}>
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: Math.max(4, Math.round((day.revenue / maxRevenue) * 90)),
                          backgroundColor: day.revenue > 0 ? colors.primary : colors.line,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{day.date.slice(8, 10)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Codes promo</Text>
            <Text style={styles.sectionCount}>{coupons.length}</Text>
          </View>

          {loading ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : coupons.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="pricetags-outline" size={24} color={colors.muted} />
              <Text style={styles.emptyText}>
                Créez un code promo pour fidéliser vos clients.
              </Text>
            </View>
          ) : (
            coupons.map((coupon) => (
              <View key={coupon.id} style={styles.couponCard}>
                <View style={styles.couponTop}>
                  <View style={styles.couponIcon}>
                    <Ionicons name="pricetag" size={16} color={colors.amberInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.couponCodeRow}>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                      <View
                        style={[
                          styles.couponState,
                          { backgroundColor: coupon.isActive ? colors.mint : colors.line },
                        ]}>
                        <Text
                          style={[
                            styles.couponStateText,
                            { color: coupon.isActive ? colors.mintInk : colors.muted },
                          ]}>
                          {coupon.isActive ? 'Actif' : 'Inactif'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.couponValue}>
                      {coupon.type === 'percent'
                        ? `−${coupon.value} %`
                        : `−${formatPrice(coupon.value)}`}
                      {coupon.minSubtotal > 0
                        ? ` · dès ${formatPrice(coupon.minSubtotal)}`
                        : ''}
                    </Text>
                    <Text style={styles.couponUses}>
                      {coupon.usedCount} utilisation{coupon.usedCount > 1 ? 's' : ''}
                      {coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ' · illimité'}
                    </Text>
                  </View>
                  <Switch
                    value={coupon.isActive}
                    onValueChange={() => toggleCoupon(coupon)}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor={colors.surface}
                  />
                </View>
                <View style={styles.couponActions}>
                  <Pressable style={styles.couponAction} onPress={() => openEditCoupon(coupon)}>
                    <Ionicons name="create-outline" size={14} color={colors.inkSoft} />
                    <Text style={styles.couponActionText}>Modifier</Text>
                  </Pressable>
                  <Pressable style={styles.couponAction} onPress={() => deleteCoupon(coupon)}>
                    <Ionicons name="trash-outline" size={14} color={colors.roseInk} />
                    <Text style={styles.couponActionDanger}>Supprimer</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Factures</Text>
            <Text style={styles.sectionCount}>{invoices.length}</Text>
          </View>

          {invoices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={24} color={colors.muted} />
              <Text style={styles.emptyText}>Vos factures apparaîtront ici après vos ventes.</Text>
            </View>
          ) : (
            invoices.map((invoice) => (
              <Pressable
                key={invoice.id}
                style={styles.invoiceRow}
                onPress={() =>
                  router.push({ pathname: '/facture/[id]', params: { id: invoice.id } })
                }>
                <View style={styles.invoiceIcon}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceClient} numberOfLines={1}>
                    {invoice.clientName}
                  </Text>
                  <Text style={styles.invoiceMeta}>
                    {new Date(invoice.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {invoice.orderId ? ` · #${invoice.orderId.replace('cmd-', '').slice(-6).toUpperCase()}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.invoiceAmount}>{formatPrice(invoice.amount)}</Text>
                  <Text style={styles.invoiceStatus}>Payée</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
              </Pressable>
            ))
          )}
        </ScrollView>

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
                  {form.id ? 'Modifier le code promo' : 'Nouveau code promo'}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Code</Text>
                <TextInput
                  style={styles.input}
                  value={form.code}
                  placeholder="ELAN10"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  onChangeText={(code) => setForm((f) => ({ ...f, code }))}
                />

                <Text style={styles.fieldLabel}>Type de remise</Text>
                <View style={styles.typeRow}>
                  {(
                    [
                      { id: 'percent', label: 'Pourcentage (%)' },
                      { id: 'fixed', label: 'Montant fixe ($)' },
                    ] as { id: 'percent' | 'fixed'; label: string }[]
                  ).map((option) => {
                    const active = form.type === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.typeChip, active && styles.typeChipActive]}
                        onPress={() => setForm((f) => ({ ...f, type: option.id }))}>
                        <Text style={[styles.typeText, active && styles.typeTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <Text style={styles.fieldLabel}>Valeur</Text>
                    <TextInput
                      style={styles.input}
                      value={form.value}
                      placeholder={form.type === 'percent' ? '10' : '5'}
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setForm((f) => ({ ...f, value }))}
                    />
                  </View>
                  <View style={styles.column}>
                    <Text style={styles.fieldLabel}>Minimum d’achat</Text>
                    <TextInput
                      style={styles.input}
                      value={form.minSubtotal}
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      onChangeText={(minSubtotal) => setForm((f) => ({ ...f, minSubtotal }))}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Utilisations maximum (0 = illimité)</Text>
                <TextInput
                  style={styles.input}
                  value={form.maxUses}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  onChangeText={(maxUses) => setForm((f) => ({ ...f, maxUses }))}
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Code actif</Text>
                  <Switch
                    value={form.isActive}
                    onValueChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor={colors.surface}
                  />
                </View>

                <Pressable
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={handleSaveCoupon}>
                  {saving ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {form.id ? 'Enregistrer' : 'Créer le code'}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
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
  scroll: { paddingHorizontal: 16, paddingBottom: 36 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.roseSoft,
    borderRadius: radius.md,
    padding: 11,
    marginBottom: 10,
  },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.roseInk },
  revenueRow: { flexDirection: 'row', gap: 8 },
  revenueCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.soft,
  },
  revenueCardPrimary: { backgroundColor: colors.primary },
  revenueLabel: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted },
  revenueLabelPrimary: { color: 'rgba(255,255,255,0.75)' },
  revenueValue: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink, marginTop: 4 },
  revenueValuePrimary: { color: colors.surface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 12,
    ...shadow.soft,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.ink },
  cardHint: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 118 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 3 },
  chartBarTrack: { height: 92, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  chartBar: { width: '70%', borderRadius: 4 },
  chartLabel: { fontFamily: fonts.medium, fontSize: 8, color: colors.muted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 9 },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  sectionCount: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
    overflow: 'hidden',
  },
  cardLoading: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, textAlign: 'center' },
  couponCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 9,
    ...shadow.soft,
  },
  couponTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  couponCode: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink, letterSpacing: 0.5 },
  couponState: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  couponStateText: { fontFamily: fonts.bold, fontSize: 8.5 },
  couponValue: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  couponUses: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted, marginTop: 1 },
  couponActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  couponAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  couponActionText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft },
  couponActionDanger: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.roseInk },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 11,
    marginBottom: 7,
    ...shadow.soft,
  },
  invoiceIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceClient: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink },
  invoiceMeta: { fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted, marginTop: 1 },
  invoiceAmount: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink },
  invoiceStatus: { fontFamily: fonts.bold, fontSize: 8.5, color: colors.mintInk, marginTop: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.inkSoft, marginBottom: 5, marginTop: 10 },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  typeTextActive: { color: colors.surface },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
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
