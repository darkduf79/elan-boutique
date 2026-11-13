import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function InscriptionScreen() {
  const { register } = useAuth();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [shopName, setShopName] = useState('');
  const [tagline, setTagline] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/profil');
    }
  };

  const handleRegister = async () => {
    if (!nom.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre nom complet.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre adresse e-mail.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe', 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptCGU) {
      Alert.alert('Conditions', 'Veuillez accepter les Conditions Générales pour continuer.');
      return;
    }
    if (role === 'seller' && !shopName.trim()) {
      Alert.alert('Boutique', 'Veuillez donner un nom à votre boutique.');
      return;
    }

    try {
      setErrorMessage(null);
      setSubmitting(true);
      await register({
        name: nom.trim(),
        email: email.trim(),
        password,
        role,
        shopName: role === 'seller' ? shopName.trim() : undefined,
        tagline: role === 'seller' ? tagline.trim() || undefined : undefined,
        description: role === 'seller' ? shopDescription.trim() || undefined : undefined,
      });

      const destination = role === 'seller' ? '/vendeur' : '/(tabs)';
      Alert.alert(
        'Compte créé !',
        role === 'seller'
          ? 'Bienvenue ! Votre espace vendeur est prêt.'
          : 'Bienvenue sur la boutique Élan.',
        [
          {
            text: role === 'seller' ? 'Ouvrir mon espace' : 'Découvrir',
            onPress: () => router.replace(destination),
          },
        ],
      );
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Impossible de créer le compte. Assurez-vous que le serveur backend est démarré.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brandSmall}>ÉLAN BOUTIQUE</Text>
              <View style={styles.headerTitleRow}>
                <TouchableOpacity onPress={handleGoBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="chevron-back" size={20} color="#2563EB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Inscription</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Ionicons name="home-outline" size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* FORMULAIRE */}
          <View style={styles.form}>
            {/* Type de compte */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Je crée un compte</Text>
            </View>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleCard, role === 'customer' && styles.roleCardActive]}
                onPress={() => setRole('customer')}
                activeOpacity={0.85}>
                <View style={[styles.roleIcon, role === 'customer' && styles.roleIconActive]}>
                  <Ionicons
                    name="bag-handle-outline"
                    size={22}
                    color={role === 'customer' ? '#fff' : '#2563EB'}
                  />
                </View>
                <Text style={[styles.roleTitle, role === 'customer' && styles.roleTitleActive]}>
                  Client
                </Text>
                <Text style={styles.roleDesc}>Acheter et suivre mes commandes</Text>
                {role === 'customer' && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, role === 'seller' && styles.roleCardActive]}
                onPress={() => setRole('seller')}
                activeOpacity={0.85}>
                <View style={[styles.roleIcon, role === 'seller' && styles.roleIconActive]}>
                  <Ionicons
                    name="storefront-outline"
                    size={22}
                    color={role === 'seller' ? '#fff' : '#16A34A'}
                  />
                </View>
                <Text style={[styles.roleTitle, role === 'seller' && styles.roleTitleActive]}>
                  Vendeur
                </Text>
                <Text style={styles.roleDesc}>Vendre et gérer mon catalogue</Text>
                {role === 'seller' && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {role === 'seller' && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Nom de la boutique</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="storefront-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Atelier Élan Paris"
                    placeholderTextColor="#9CA3AF"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.label}>Accroche (optionnel)</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="sparkles-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Créateur maroquinerie & lifestyle"
                    placeholderTextColor="#9CA3AF"
                    value={tagline}
                    onChangeText={setTagline}
                  />
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.label}>Description (optionnel)</Text>
                </View>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Présentez votre univers et vos produits…"
                    placeholderTextColor="#9CA3AF"
                    value={shopDescription}
                    onChangeText={setShopDescription}
                    multiline
                  />
                </View>
              </>
            )}

            {/* Nom complet */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Nom complet</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Thomas Lefebvre"
                placeholderTextColor="#9CA3AF"
                value={nom}
                onChangeText={setNom}
              />
            </View>

            {/* Email */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Adresse e-mail</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="thomas.lefebvre@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mot de passe */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Mot de passe</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 caractères"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Confirmation */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Répétez votre mot de passe"
                placeholderTextColor="#9CA3AF"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* CGU */}
            <TouchableOpacity style={styles.cguRow} onPress={() => setAcceptCGU(!acceptCGU)}>
              <View style={[styles.checkbox, acceptCGU && styles.checkboxActive]}>
                {acceptCGU && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.cguText}>
                J’accepte les Conditions Générales et la Politique de confidentialité
              </Text>
            </TouchableOpacity>

            {/* Bouton Inscription */}
            <TouchableOpacity
              style={[styles.btnPrimary, submitting && styles.btnPrimaryDisabled]}
              disabled={submitting}
              onPress={handleRegister}>
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnPrimaryText}>Créer mon compte</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* SÉPARATEUR */}
            <View style={styles.separator}>
              <View style={styles.line} />
              <Text style={styles.separatorText}>OU S’INSCRIRE AVEC</Text>
              <View style={styles.line} />
            </View>

            {/* BOUTONS SOCIAUX */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LIEN CONNEXION */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={handleGoBack}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER SÉCURITÉ */}
          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
            <Text style={styles.securityText}>
              Données chiffrées & sécurisées (SSL 256-bit)
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  brandSmall: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 12.5, color: '#DC2626', fontWeight: '500' },
  form: { marginBottom: 16 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
  },
  roleCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  roleIconActive: { backgroundColor: '#2563EB' },
  roleTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  roleTitleActive: { color: '#1E40AF' },
  roleDesc: { fontSize: 11, color: '#6B7280', lineHeight: 15 },
  roleCheck: { position: 'absolute', top: 10, right: 10 },
  labelRow: { marginBottom: 6, marginTop: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: '#111' },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  cguRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 20 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#2563EB' },
  cguText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 17 },
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryDisabled: { backgroundColor: '#9CA3AF' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  loginText: { fontSize: 13, color: '#6B7280' },
  loginLink: { fontSize: 13, color: '#2563EB', fontWeight: '700' },

  // NOUVEAUX STYLES
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  separatorText: { marginHorizontal: 10, fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  socialText: { fontSize: 14, fontWeight: '600', color: '#111' },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 12,
  },
  securityText: { fontSize: 10, color: '#6B7280' },
});