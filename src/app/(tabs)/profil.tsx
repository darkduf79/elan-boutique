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

export default function ProfilScreen() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const [email, setEmail] = useState('thomas.lefebvre@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez saisir votre adresse e-mail et mot de passe.');
      return;
    }

    try {
      setErrorMessage(null);
      setSubmitting(true);
      const res = await login(email.trim(), password);
      if (res.user.role === 'seller') {
        router.replace('/vendeur');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la connexion. Vérifiez que le serveur est démarré.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
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
                <Ionicons name="person-outline" size={20} color="#2563EB" />
                <Text style={styles.headerTitle}>{isAuthenticated ? 'Mon Profil' : 'Connexion'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Ionicons name="home-outline" size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {isAuthenticated && user ? (
            /* VUE UTILISATEUR CONNECTÉ */
            <View style={styles.profileContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#2563EB" />
                <Text style={styles.roleBadgeText}>
                  {user.role === 'seller' ? 'Artisan Vendeur Élan' : 'Client Vérifié'}
                </Text>
              </View>

              <View style={styles.menuCard}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push('/(tabs)/commandes')}>
                  <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="receipt-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.menuText}>Mes commandes</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push('/favoris')}>
                  <View style={[styles.menuIcon, { backgroundColor: '#FDF2F8' }]}>
                    <Ionicons name="heart-outline" size={18} color="#DB2777" />
                  </View>
                  <Text style={styles.menuText}>Mes favoris</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push('/adresses')}>
                  <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="location-outline" size={18} color="#EA580C" />
                  </View>
                  <Text style={styles.menuText}>Mon carnet d’adresses</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {user.role === 'seller' && (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => router.push('/vendeur')}>
                      <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="storefront-outline" size={18} color="#16A34A" />
                      </View>
                      <Text style={styles.menuText}>Accéder à l’Espace Vendeur</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => router.push('/vendeur/boutique')}>
                      <View style={[styles.menuIcon, { backgroundColor: '#ECFEFF' }]}>
                        <Ionicons name="color-palette-outline" size={18} color="#0891B2" />
                      </View>
                      <Text style={styles.menuText}>Personnaliser ma boutique</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FORMULAIRE DE CONNEXION */
            <>
              {/* ILLUSTRATION */}
              <View style={styles.illustration}>
                <View style={styles.iconCircle}>
                  <Ionicons name="headset" size={36} color="#fff" />
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Élan</Text>
                </View>
              </View>

              {/* TITRE */}
              <Text style={styles.title}>Bienvenue sur Élan</Text>
              <Text style={styles.subtitle}>
                Connectez-vous pour retrouver vos commandes et vos favoris
              </Text>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* FORMULAIRE */}
              <View style={styles.form}>
                {/* Email */}
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Adresse e-mail</Text>
                  <Text style={styles.labelBadge}>Valide</Text>
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
                  <Text style={styles.labelBadge}>Mot de passe oublié ?</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre mot de passe"
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

                {/* Se souvenir de moi */}
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.rememberText}>Se souvenir de moi</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.rememberDays}>30 jours</Text>
                </TouchableOpacity>

                {/* Bouton Connexion */}
                <TouchableOpacity
                  style={[styles.btnPrimary, submitting && styles.btnPrimaryDisabled]}
                  disabled={submitting}
                  onPress={handleLogin}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.btnPrimaryText}>Se connecter</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* SÉPARATEUR */}
                <View style={styles.separator}>
                  <View style={styles.line} />
                  <Text style={styles.separatorText}>OU CONTINUER AVEC</Text>
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

              {/* LIEN INSCRIPTION */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Pas encore de compte ? </Text>
                <TouchableOpacity onPress={() => router.push('/inscription')}>
                  <Text style={styles.signupLink}>Créer un compte</Text>
                </TouchableOpacity>
              </View>

              {/* ACCÈS ESPACE VENDEUR */}
              <TouchableOpacity
                style={styles.sellerBanner}
                onPress={() => router.push('/inscription')}
                activeOpacity={0.85}>
                <View style={styles.sellerBannerIcon}>
                  <Ionicons name="storefront" size={20} color="#2563EB" />
                </View>
                <View style={styles.sellerBannerTextCol}>
                  <Text style={styles.sellerBannerTitle}>Vendre sur Élan</Text>
                  <Text style={styles.sellerBannerSub}>
                    Ouvrez votre boutique et gérez vos produits
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#2563EB" />
              </TouchableOpacity>

              {/* FOOTER SÉCURITÉ */}
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
                <Text style={styles.securityText}>
                  Données chiffrées & sécurisées (SSL 256-bit)
                </Text>
              </View>
            </>
          )}
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
    paddingBottom: 16,
  },
  brandSmall: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  illustration: { alignItems: 'center', marginTop: 16, marginBottom: 16 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: '36%',
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#374151' },
  labelBadge: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
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
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 16 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: '#2563EB' },
  rememberText: { fontSize: 13, color: '#374151' },
  rememberDays: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
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
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 18 },
  signupText: { fontSize: 13, color: '#6B7280' },
  signupLink: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  sellerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
  },
  sellerBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerBannerTextCol: { flex: 1 },
  sellerBannerTitle: { fontSize: 13.5, fontWeight: '700', color: '#1E40AF' },
  sellerBannerSub: { fontSize: 11.5, color: '#60A5FA', marginTop: 2 },
  profileContainer: { alignItems: 'center', paddingVertical: 20 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', color: '#111' },
  userEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  menuCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 24,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    width: '100%',
    height: 48,
    borderRadius: 14,
    marginTop: 20,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

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