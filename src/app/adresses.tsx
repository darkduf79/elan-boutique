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

import { ServerOfflineView } from '@/components/ServerOfflineView';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api, type ApiAddress } from '@/services/api';

type AddressForm = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  label: '',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'France',
  isDefault: false,
};

export default function AdressesScreen() {
  const { isAuthenticated, user } = useAuth();

  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setAddresses([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await api.getAddresses();
      setAddresses(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos adresses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      fullName: user?.name ?? '',
      isDefault: addresses.length === 0,
    });
    setModalVisible(true);
  };

  const openEdit = (address: ApiAddress) => {
    setForm({
      id: address.id,
      label: address.label ?? '',
      fullName: address.fullName,
      phone: address.phone ?? '',
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      postalCode: address.postalCode,
      country: address.country || 'France',
      isDefault: address.isDefault,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.line1.trim() || !form.city.trim() || !form.postalCode.trim()) {
      Alert.alert('Champs requis', 'Nom, adresse, ville et code postal sont obligatoires.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        label: form.label.trim() || undefined,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim() || 'France',
        isDefault: form.isDefault,
      };
      if (form.id) {
        await api.updateAddress(form.id, payload);
      } else {
        await api.createAddress(payload);
      }
      setModalVisible(false);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer l’adresse.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (address: ApiAddress) => {
    Alert.alert('Supprimer l’adresse', `Supprimer « ${address.label || address.line1} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAddress(address.id);
            await load();
          } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (address: ApiAddress) => {
    try {
      await api.updateAddress(address.id, { isDefault: true });
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de définir cette adresse par défaut.');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.page}>
          <ScreenHeader />
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Votre carnet d’adresses</Text>
            <Text style={styles.emptyText}>
              Connectez-vous pour enregistrer vos adresses de livraison.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/profil')}>
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScreenHeader count={addresses.length} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <ServerOfflineView title="Adresses indisponibles" message={error} onRetry={load} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
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
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="location-outline" size={30} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aucune adresse enregistrée</Text>
                <Text style={styles.emptyText}>
                  Ajoutez une adresse pour accélérer vos prochaines commandes.
                </Text>
              </View>
            ) : (
              addresses.map((address) => (
                <View key={address.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardIcon}>
                      <Ionicons
                        name={address.label?.toLowerCase().includes('bureau') ? 'business-outline' : 'home-outline'}
                        size={17}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{address.label || address.fullName}</Text>
                        {address.isDefault && (
                          <View style={styles.defaultPill}>
                            <Text style={styles.defaultText}>Par défaut</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardLine}>{address.fullName}</Text>
                      <Text style={styles.cardLine}>{address.line1}</Text>
                      {address.line2 ? <Text style={styles.cardLine}>{address.line2}</Text> : null}
                      <Text style={styles.cardLine}>
                        {address.postalCode} {address.city}, {address.country}
                      </Text>
                      {address.phone ? <Text style={styles.cardLine}>{address.phone}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    {!address.isDefault && (
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleSetDefault(address)}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                        <Text style={styles.actionText}>Par défaut</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.actionButton} onPress={() => openEdit(address)}>
                      <Ionicons name="create-outline" size={14} color={colors.inkSoft} />
                      <Text style={styles.actionTextMuted}>Modifier</Text>
                    </Pressable>
                    <Pressable style={styles.actionButton} onPress={() => handleDelete(address)}>
                      <Ionicons name="trash-outline" size={14} color={colors.roseInk} />
                      <Text style={styles.actionTextDanger}>Supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <Pressable style={styles.addButton} onPress={openCreate}>
              <Ionicons name="add" size={18} color={colors.surface} />
              <Text style={styles.addButtonText}>Ajouter une adresse</Text>
            </Pressable>
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
                  {form.id ? 'Modifier l’adresse' : 'Nouvelle adresse'}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Field
                  label="Libellé (optionnel)"
                  value={form.label}
                  placeholder="Maison, Bureau…"
                  onChangeText={(label) => setForm((f) => ({ ...f, label }))}
                />
                <Field
                  label="Nom complet"
                  value={form.fullName}
                  placeholder="Thomas Lefebvre"
                  onChangeText={(fullName) => setForm((f) => ({ ...f, fullName }))}
                />
                <Field
                  label="Téléphone (optionnel)"
                  value={form.phone}
                  placeholder="06 12 34 56 78"
                  keyboardType="phone-pad"
                  onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
                />
                <Field
                  label="Adresse"
                  value={form.line1}
                  placeholder="12 rue de Rivoli"
                  onChangeText={(line1) => setForm((f) => ({ ...f, line1 }))}
                />
                <Field
                  label="Complément (optionnel)"
                  value={form.line2}
                  placeholder="Appartement, étage…"
                  onChangeText={(line2) => setForm((f) => ({ ...f, line2 }))}
                />
                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <Field
                      label="Code postal"
                      value={form.postalCode}
                      placeholder="75001"
                      keyboardType="number-pad"
                      onChangeText={(postalCode) => setForm((f) => ({ ...f, postalCode }))}
                    />
                  </View>
                  <View style={styles.column}>
                    <Field
                      label="Ville"
                      value={form.city}
                      placeholder="Paris"
                      onChangeText={(city) => setForm((f) => ({ ...f, city }))}
                    />
                  </View>
                </View>
                <Field
                  label="Pays"
                  value={form.country}
                  placeholder="France"
                  onChangeText={(country) => setForm((f) => ({ ...f, country }))}
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Adresse par défaut</Text>
                  <Switch
                    value={form.isDefault}
                    onValueChange={(isDefault) => setForm((f) => ({ ...f, isDefault }))}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor={colors.surface}
                  />
                </View>

                <Pressable
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  disabled={saving}
                  onPress={handleSave}>
                  {saving ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
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

function ScreenHeader({ count }: { count?: number }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>ÉLAN BOUTIQUE</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mes adresses</Text>
          {typeof count === 'number' && count > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerText: { flex: 1, marginLeft: 12 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1, color: colors.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  countPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  countText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  headerSpacer: { width: 38 },
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    ...shadow.soft,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  defaultPill: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  defaultText: { fontFamily: fonts.bold, fontSize: 9.5, color: colors.mintInk },
  cardLine: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  actionTextMuted: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  actionTextDanger: { fontFamily: fonts.semibold, fontSize: 11, color: colors.roseInk },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    marginTop: 6,
  },
  addButtonText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.surface },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  field: { marginTop: 10 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.inkSoft, marginBottom: 5 },
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
  saveButtonDisabled: { backgroundColor: colors.muted },
  saveButtonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.surface },
});
