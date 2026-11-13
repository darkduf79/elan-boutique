import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useSellerDashboard } from '@/context/SellerContext';
import { formatPrice } from '@/lib/format';
import {
  api,
  resolveMediaUrl,
  type ApiReview,
  type ApiSellerPublic,
} from '@/services/api';

export default function SellerShopScreen() {
  const { refresh: refreshDashboard } = useSellerDashboard();

  const [profile, setProfile] = useState<ApiSellerPublic | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  const [shopName, setShopName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [replyTarget, setReplyTarget] = useState<ApiReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [shop, reviewData] = await Promise.all([
        api.getSellerProfile(),
        api.getSellerReviews(),
      ]);
      setProfile(shop);
      setShopName(shop.shopName);
      setTagline(shop.tagline ?? '');
      setDescription(shop.description ?? '');
      setAvatarUrl(shop.avatarUrl ?? '');
      setBannerUrl(shop.bannerUrl ?? '');
      setReviews(reviewData);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger votre boutique.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pickImage = async (target: 'avatar' | 'banner') => {
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
      setUploading(target);
      const uploaded = await api.uploadImage(result.assets[0].uri);
      if (target === 'avatar') setAvatarUrl(uploaded.url);
      else setBannerUrl(uploaded.url);
    } catch (err: any) {
      Alert.alert('Téléversement impossible', err.message || 'Réessayez avec une autre image.');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!shopName.trim()) {
      Alert.alert('Nom requis', 'Le nom de la boutique ne peut pas être vide.');
      return;
    }
    try {
      setSaving(true);
      const updated = await api.updateSellerProfile({
        shopName: shopName.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl.trim(),
        bannerUrl: bannerUrl.trim(),
      });
      setProfile(updated);
      refreshDashboard();
      Alert.alert('Boutique mise à jour', 'Vos modifications sont visibles en ligne.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer la boutique.');
    } finally {
      setSaving(false);
    }
  };

  const openReply = (review: ApiReview) => {
    setReplyTarget(review);
    setReplyText(review.sellerReply ?? '');
  };

  const handleReply = async () => {
    if (!replyTarget) return;
    if (!replyText.trim()) {
      Alert.alert('Réponse vide', 'Saisissez une réponse avant d’enregistrer.');
      return;
    }
    try {
      setReplySaving(true);
      await api.replyToReview(replyTarget.id, replyText.trim());
      setReplyTarget(null);
      setReplyText('');
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer la réponse.');
    } finally {
      setReplySaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const avatarPreview = resolveMediaUrl(avatarUrl);
  const bannerPreview = resolveMediaUrl(bannerUrl);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>VITRINE</Text>
            <Text style={styles.heading}>Ma boutique</Text>
          </View>
          <Pressable
            style={styles.previewButton}
            onPress={() => profile && router.push(`/boutique/${profile.id}`)}>
            <Ionicons name="eye-outline" size={15} color={colors.primary} />
            <Text style={styles.previewText}>Aperçu</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          <View style={styles.bannerCard}>
            {bannerPreview ? (
              <Image source={{ uri: bannerPreview }} style={styles.bannerImage} resizeMode="cover" />
            ) : (
              <View style={styles.bannerFallback}>
                <Ionicons name="image-outline" size={26} color="rgba(255,255,255,0.8)" />
                <Text style={styles.bannerFallbackText}>Ajoutez une bannière</Text>
              </View>
            )}
            <Pressable
              style={styles.bannerEdit}
              onPress={() => pickImage('banner')}
              disabled={uploading === 'banner'}>
              {uploading === 'banner' ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={14} color={colors.surface} />
                  <Text style={styles.bannerEditText}>Modifier</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>{shopName.charAt(0) || 'É'}</Text>
              )}
              <Pressable
                style={styles.avatarEdit}
                onPress={() => pickImage('avatar')}
                disabled={uploading === 'avatar'}>
                {uploading === 'avatar' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="camera" size={13} color={colors.primary} />
                )}
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.avatarTitle}>{profile?.shopName}</Text>
              <Text style={styles.avatarSub}>
                {profile?.productCount ?? 0} produits · {profile?.reviewCount ?? 0} avis
              </Text>
              <Text style={styles.avatarRating}>
                ★ {(profile?.rating ?? 0).toFixed(1)} · {formatPrice(profile?.stats?.totalRevenue ?? 0)} générés
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations de la boutique</Text>

            <Text style={styles.fieldLabel}>Nom de la boutique</Text>
            <TextInput
              style={styles.input}
              value={shopName}
              placeholder="Atelier Élan Paris"
              placeholderTextColor={colors.muted}
              onChangeText={setShopName}
            />

            <Text style={styles.fieldLabel}>Accroche</Text>
            <TextInput
              style={styles.input}
              value={tagline}
              placeholder="Créateur maroquinerie & lifestyle"
              placeholderTextColor={colors.muted}
              onChangeText={setTagline}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              placeholder="Présentez votre univers et vos engagements…"
              placeholderTextColor={colors.muted}
              multiline
              onChangeText={setDescription}
            />

            <Text style={styles.fieldLabel}>URL de l’avatar</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              placeholder="https://…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              onChangeText={setAvatarUrl}
            />

            <Text style={styles.fieldLabel}>URL de la bannière</Text>
            <TextInput
              style={styles.input}
              value={bannerUrl}
              placeholder="https://…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              onChangeText={setBannerUrl}
            />

            <Pressable
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer la boutique</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis clients</Text>
            <Text style={styles.sectionCount}>{reviews.length}</Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Aucun avis pour le moment.</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.reviewerInitial}>
                      {(review.userName || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.reviewerRow}>
                      <Text style={styles.reviewerName}>{review.userName}</Text>
                      {review.verified && (
                        <View style={styles.verifiedPill}>
                          <Ionicons name="checkmark" size={9} color={colors.mintInk} />
                          <Text style={styles.verifiedText}>Achat vérifié</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.starsRow}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Ionicons
                          key={index}
                          name={index < Math.round(review.rating) ? 'star' : 'star-outline'}
                          size={11}
                          color={colors.gold}
                        />
                      ))}
                      <Text style={styles.reviewProduct} numberOfLines={1}>
                        {review.productTitle ? ` · ${review.productTitle}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
                <Text style={styles.reviewComment}>{review.comment}</Text>

                {review.sellerReply ? (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyAuthor}>Votre réponse</Text>
                    <Text style={styles.replyText}>{review.sellerReply}</Text>
                    <Pressable onPress={() => openReply(review)}>
                      <Text style={styles.replyEdit}>Modifier la réponse</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.replyButton} onPress={() => openReply(review)}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                    <Text style={styles.replyButtonText}>Répondre à cet avis</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <Modal
          visible={Boolean(replyTarget)}
          transparent
          animationType="slide"
          onRequestClose={() => setReplyTarget(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Répondre à l’avis</Text>
                <Pressable onPress={() => setReplyTarget(null)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>
              {replyTarget ? (
                <Text style={styles.replyContext} numberOfLines={2}>
                  « {replyTarget.comment} »
                </Text>
              ) : null}
              <TextInput
                style={[styles.input, styles.textArea, { marginTop: 12 }]}
                value={replyText}
                placeholder="Remerciez votre client ou apportez une précision…"
                placeholderTextColor={colors.muted}
                multiline
                onChangeText={setReplyText}
              />
              <Pressable
                style={[styles.saveButton, replySaving && { opacity: 0.6 }]}
                disabled={replySaving}
                onPress={handleReply}>
                {replySaving ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Publier la réponse</Text>
                )}
              </Pressable>
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
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  previewText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
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
  bannerCard: {
    height: 132,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  bannerFallbackText: { fontFamily: fonts.semibold, fontSize: 11, color: 'rgba(255,255,255,0.82)' },
  bannerEdit: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerEditText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.surface },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -24,
    paddingHorizontal: 8,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 30 },
  avatarLetter: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.primary },
  avatarEdit: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  avatarTitle: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink, marginTop: 18 },
  avatarSub: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  avatarRating: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.primary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 14,
    ...shadow.soft,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginBottom: 2 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.inkSoft, marginBottom: 5, marginTop: 10 },
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
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  saveButton: {
    marginTop: 16,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.surface },
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
  emptyText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, textAlign: 'center', paddingVertical: 6 },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 9,
    ...shadow.soft,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: { fontFamily: fonts.extrabold, fontSize: 12.5, color: colors.primary },
  reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewerName: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  verifiedText: { fontFamily: fonts.bold, fontSize: 8, color: colors.mintInk },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 3 },
  reviewProduct: { flex: 1, fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted },
  reviewDate: { fontFamily: fonts.medium, fontSize: 9, color: colors.muted },
  reviewTitle: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink, marginTop: 8 },
  reviewComment: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.inkSoft, marginTop: 3 },
  replyBox: {
    marginTop: 8,
    padding: 9,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  replyAuthor: { fontFamily: fonts.bold, fontSize: 10, color: colors.primary },
  replyText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.inkSoft, marginTop: 2 },
  replyEdit: { fontFamily: fonts.bold, fontSize: 9.5, color: colors.primary, marginTop: 5 },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  replyButtonText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.primary },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  replyContext: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
