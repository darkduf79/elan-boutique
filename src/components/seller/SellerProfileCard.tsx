import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SellerProfile } from '../../types/seller';

interface SellerProfileCardProps {
  profile: SellerProfile;
  onOptionsPress?: () => void;
}

export const SellerProfileCard: React.FC<SellerProfileCardProps> = ({
  profile,
  onOptionsPress,
}) => {
  return (
    <View style={styles.card}>
      {/* Top Profile Info Row */}
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: profile.avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.avatarBadge}>
            <Ionicons name="sparkles" size={9} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {profile.name}
            </Text>
            {profile.isPro && (
              <View style={styles.proBadge}>
                <Ionicons name="checkmark" size={10} color="#1D4ED8" />
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </View>
          <Text style={styles.tagline} numberOfLines={1}>
            {profile.tagline}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOptionsPress}
          style={styles.optionsButton}
          accessibilityLabel="Options de gestion"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="options-outline" size={20} color="#1D4ED8" />
        </TouchableOpacity>
      </View>

      {/* 3 Metric Cards Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.ratingValueRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.kpiValue}>
              {profile.kpis.clientRating.toFixed(1)}
            </Text>
          </View>
          <Text style={styles.kpiLabel}>Note client</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{profile.kpis.monthlySales}</Text>
          <Text style={styles.kpiLabel}>Ventes ce mois</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, styles.blueKpiValue]}>
            {profile.kpis.onTimeShippingRate.toFixed(1)} %
          </Text>
          <Text style={styles.kpiLabel} numberOfLines={1} adjustsFontSizeToFit>
            Expéditions à l’heure
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  tagline: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  optionsButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  blueKpiValue: {
    color: '#1D4ED8',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
