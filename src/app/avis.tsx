import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api, resolveMediaUrl, type ApiProduct } from '@/services/api';

export default function AvisScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { user } = useAuth();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(productId));
  const [productError, setProductError] = useState<string | null>(null);

  const [note, setNote] = useState(5);
  const [tags, setTags] = useState<string[]>(['Qualité sonore']);
  const [titre, setTitre] = useState('');
  const [experience, setExperience] = useState('');
  const [publierSousNom, setPublierSousNom] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allTags = ['Confort', 'Qualité sonore', 'Autonomie', "Facilité d'utilisation", 'Design', 'Rapport qualité/prix'];

  useEffect(() => {
    if (!productId) return;
    async function fetchProductInfo() {
      try {
        setProductError(null);
        const data = await api.getProductById(productId!);
        setProduct(data);
      } catch (err: any) {
        setProductError(err.message || 'Impossible de joindre le serveur.');
      } finally {
        setLoadingProduct(false);
      }
    }
    fetchProductInfo();
  }, [productId]);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSubmitReview = async () => {
    if (!productId && !product?.id) {
      Alert.alert('Erreur', 'Aucun produit sélectionné pour cet avis.');
      return;
    }
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour publier un avis.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(tabs)/profil') },
      ]);
      return;
    }
    if (!experience.trim()) {
      Alert.alert('Champs requis', 'Veuillez rédiger quelques mots pour décrire votre expérience.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createReview({
        productId: (product?.id || productId)!,
        rating: note,
        title: titre.trim() || undefined,
        comment: experience.trim(),
        tags,
      });

      Alert.alert('Merci !', 'Votre avis a été publié avec succès et mis à jour.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Serveur inaccessible',
        err.message || 'Impossible de publier votre avis. Assurez-vous que le serveur backend est démarré.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const productImageUri = resolveMediaUrl(product?.image || (product?.images && product.images[0]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Donner un avis</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* PRODUIT */}
          <View style={styles.productRow}>
            {loadingProduct ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 12 }} />
            ) : productImageUri ? (
              <Image
                source={typeof productImageUri === 'string' ? { uri: productImageUri } : productImageUri}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.productImage, styles.placeholderImage]}>
                <Ionicons name="cube-outline" size={24} color="#6B7280" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.brandSmall}>{product?.brand || 'ÉLAN'}</Text>
              <Text style={styles.productName} numberOfLines={1}>
                {product?.title || (productError ? 'Serveur inaccessible' : 'Chargement du produit...')}
              </Text>
              <Text style={styles.productDate}>Achat vérifié</Text>
            </View>

            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => Alert.alert('Aide', 'Votre avis aide les autres acheteurs à faire le bon choix.')}>
              <Text style={styles.helpText}>Aide</Text>
            </TouchableOpacity>
          </View>

          {/* NOTE GLOBALE */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Votre note globale</Text>
            <Text style={styles.sectionSubtitle}>Touchez une étoile pour évaluer le produit</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNote(star)} style={{ padding: 4 }}>
                  <Ionicons name={star <= note ? 'star' : 'star-outline'} size={32} color="#F59E0B" />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {note === 5 && 'Excellent ! Nous en sommes ravis'}
              {note === 4 && 'Très bon produit'}
              {note === 3 && 'Correct'}
              {note === 2 && 'Décevant'}
              {note === 1 && 'Très insatisfait'}
            </Text>
          </View>

          {/* POINTS FORTS / TAGS */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Quels sont ses points forts ?</Text>
            <Text style={styles.sectionSubtitle}>Sélectionnez un ou plusieurs critères</Text>
            <View style={styles.tagsContainer}>
              {allTags.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tagPill, isSelected && styles.tagPillSelected]}>
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* TITRE DE L'AVIS */}
          <Text style={styles.label}>Titre de votre avis</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Finition impeccable, très satisfait !"
            placeholderTextColor="#9CA3AF"
            value={titre}
            onChangeText={setTitre}
            maxLength={100}
          />

          {/* COMMENTAIRE DÉTAILLÉ */}
          <Text style={styles.label}>Votre avis détaillé</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Partagez vos impressions sur le confort, la qualité sonore, les finitions..."
            placeholderTextColor="#9CA3AF"
            value={experience}
            onChangeText={setExperience}
            multiline
            numberOfLines={4}
            maxLength={500}
          />

          {/* CHECKBOX ANONYMAT */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setPublierSousNom(!publierSousNom)}>
            <View style={[styles.checkbox, publierSousNom && styles.checkboxActive]}>
              {publierSousNom && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxTitle}>Publier sous mon nom ({user?.name || 'Acheteur'})</Text>
              <Text style={styles.checkboxSubtitle}>Désactiver pour publier anonymement.</Text>
            </View>
          </TouchableOpacity>

          {/* BOUTONS */}
          <TouchableOpacity
            style={[styles.btnPrimary, submitting && styles.btnPrimaryDisabled]}
            disabled={submitting}
            onPress={handleSubmitReview}>
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnPrimaryText}>Publier mon avis</Text>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
            <Text style={styles.btnSecondaryText}>Annuler</Text>
          </TouchableOpacity>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  placeholderImage: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  brandSmall: { fontSize: 9, fontWeight: '700', color: '#2563EB', letterSpacing: 0.5 },
  productName: { fontSize: 14, fontWeight: '600', color: '#111', marginTop: 2 },
  productDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  helpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  helpText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 12 },
  starsRow: { flexDirection: 'row', marginBottom: 8 },
  ratingText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagPillSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  tagText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  tagTextSelected: { color: '#fff', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxTitle: { fontSize: 13, fontWeight: '600', color: '#111' },
  checkboxSubtitle: { fontSize: 11, color: '#6B7280' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  btnPrimaryDisabled: { backgroundColor: '#9CA3AF' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});
