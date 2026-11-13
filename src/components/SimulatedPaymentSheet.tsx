import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '@/lib/format';

interface Props {
  visible: boolean;
  total: number;
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Feuille de paiement SIMULÉ utilisée en mode hors-ligne. Aucun débit réel :
 * elle valide localement la commande, qui sera synchronisée au retour en ligne.
 */
export function SimulatedPaymentSheet({ visible, total, onCancel, onSuccess }: Props) {
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/34');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('CLIENT ÉLAN');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const resetFeedback = () => {
    setProcessing(false);
    setError(null);
  };

  const validate = (): string | null => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) return 'Le numéro de carte doit contenir au moins 13 chiffres.';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Date d’expiration au format MM/AA.';
    const month = Number(expiry.slice(0, 2));
    if (month < 1 || month > 12) return 'Le mois d’expiration est invalide.';
    if (cvc.replace(/\D/g, '').length < 3) return 'Le CVC doit contenir 3 chiffres.';
    if (!name.trim()) return 'Renseignez le nom du titulaire de la carte.';
    return null;
  };

  const handlePay = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      await wait(1300);
      await onSuccess();
    } catch (err: any) {
      if (mounted.current) {
        setError(err?.message || 'La simulation a échoué. Réessayez.');
        setProcessing(false);
      }
    }
  };

  const displayNumber = cardNumber || '•••• •••• •••• ••••';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={processing ? undefined : onCancel}
      onShow={resetFeedback}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} onPress={processing ? undefined : onCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.headerIcon}>
                <Ionicons name="cloud-offline-outline" size={18} color="#B45309" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>Paiement simulé</Text>
                <Text style={styles.subtitle}>Mode hors-ligne · base locale</Text>
              </View>
              <Pressable
                onPress={onCancel}
                disabled={processing}
                hitSlop={10}
                accessibilityLabel="Fermer"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Carte bancaire simulée */}
            <LinearGradient
              colors={['#312E81', '#4F46E5', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardBank}>ÉLAN BANK</Text>
                <View style={styles.simPill}>
                  <Ionicons name="flask-outline" size={11} color="#FDE68A" />
                  <Text style={styles.simPillText}>SIMULATION</Text>
                </View>
              </View>
              <View style={styles.cardChipRow}>
                <View style={styles.chip}>
                  <View style={styles.chipLine} />
                  <View style={styles.chipLine} />
                </View>
                <Ionicons
                  name="wifi"
                  size={18}
                  color="rgba(255,255,255,0.75)"
                  style={styles.contactless}
                />
              </View>
              <Text style={styles.cardNumber} numberOfLines={1}>
                {displayNumber}
              </Text>
              <View style={styles.cardBottom}>
                <View style={styles.flex}>
                  <Text style={styles.cardLabel}>TITULAIRE</Text>
                  <Text style={styles.cardValue} numberOfLines={1}>
                    {name.toUpperCase() || 'VOTRE NOM'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>EXPIRE</Text>
                  <Text style={styles.cardValue}>{expiry || 'MM/AA'}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Avis simulation */}
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color="#B45309" />
              <Text style={styles.noticeText}>
                Ceci est une simulation locale : aucun paiement réel n’est effectué. La commande
                est enregistrée dans la base hors-ligne puis synchronisée avec le serveur dès le
                retour en ligne.
              </Text>
            </View>

            {/* Formulaire de carte */}
            <Text style={styles.fieldLabel}>Numéro de carte</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(v) => {
                  setCardNumber(formatCardNumber(v));
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder="4242 4242 4242 4242"
                placeholderTextColor="#94A3B8"
                editable={!processing}
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Expiration</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={(v) => {
                      setExpiry(formatExpiry(v));
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    placeholder="MM/AA"
                    placeholderTextColor="#94A3B8"
                    editable={!processing}
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>CVC</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    value={cvc}
                    onChangeText={(v) => {
                      setCvc(v.replace(/\D/g, '').slice(0, 4));
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    placeholder="123"
                    placeholderTextColor="#94A3B8"
                    editable={!processing}
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Titulaire de la carte</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setError(null);
                }}
                placeholder="Votre nom"
                placeholderTextColor="#94A3B8"
                editable={!processing}
                autoCapitalize="characters"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Montant à simuler</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>

            <Pressable onPress={handlePay} disabled={processing} accessibilityRole="button">
              <LinearGradient
                colors={processing ? ['#94A3B8', '#94A3B8'] : ['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButton}
              >
                {processing ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.payText}>Simulation en cours...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={19} color="#fff" />
                    <Text style={styles.payText}>Payer {formatPrice(total)} · simulation</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={onCancel}
              disabled={processing}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sheet: {
    marginTop: 'auto',
    maxHeight: '92%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#B45309', marginTop: 1, fontWeight: '600' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    borderRadius: 18,
    padding: 18,
    height: 188,
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBank: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  simPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simPillText: { color: '#FDE68A', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  cardChipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    paddingHorizontal: 5,
    gap: 4,
  },
  chipLine: { height: 2, backgroundColor: 'rgba(120,53,15,0.45)', borderRadius: 1 },
  contactless: { transform: [{ rotate: '90deg' }] },
  cardNumber: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8.5, letterSpacing: 1, marginBottom: 2 },
  cardValue: { color: '#fff', fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5 },

  notice: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: '#9A3412' },

  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: '#334155', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14.5, color: '#0F172A', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 12 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: '#DC2626', fontWeight: '600' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  totalLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  totalValue: { fontSize: 19, fontWeight: '800', color: '#4F46E5' },

  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 15,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  payText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
});