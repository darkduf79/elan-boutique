import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface SellerHeaderProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  hasUnreadNotification?: boolean;
}

export const SellerHeader: React.FC<SellerHeaderProps> = ({
  onMenuPress,
  onNotificationPress,
  onProfilePress,
  hasUnreadNotification = true,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.iconButton}
        accessibilityLabel="Menu"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="menu" size={24} color="#111827" />
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        <View style={styles.brandBadgeRow}>
          <Text style={styles.brandBadgeText}>ÉLAN VENDEUR</Text>
          <MaterialCommunityIcons
            name="decagram-outline"
            size={13}
            color="#9A6A1F"
            style={styles.brandBadgeIcon}
          />
        </View>
        <Text style={styles.screenTitle}>Catalogue Produits</Text>
      </View>

      <View style={styles.rightActionsRow}>
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.notificationButton}
          accessibilityLabel="Notifications"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          {hasUnreadNotification && <View style={styles.notificationDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onProfilePress}
          style={styles.profileAvatarButton}
          accessibilityLabel="Profil vendeur"
        >
          <Ionicons name="person" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconButton: {
    padding: 6,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A6A1F',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  brandBadgeIcon: {
    marginTop: 1,
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 6,
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B57D0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B57D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
});
