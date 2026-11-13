import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onRetry?: () => void;
  savedAt?: number | null;
}

function formatSavedAt(savedAt?: number | null): string | null {
  if (!savedAt) return null;
  return new Date(savedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OfflineBanner({ onRetry, savedAt }: Props) {
  const date = formatSavedAt(savedAt);
  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={17} color="#B45309" />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>Mode hors-ligne</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          Catalogue local{date ? ` · sauvegardé le ${date}` : ''}
        </Text>
      </View>
      {onRetry && (
        <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Réessayer de se connecter">
          <Ionicons name="refresh" size={13} color="#B45309" />
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontSize: 12, fontWeight: '800', color: '#9A3412' },
  subtitle: { fontSize: 10, color: '#C2740A', marginTop: 1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEDD5',
  },
  retryText: { fontSize: 10.5, fontWeight: '700', color: '#B45309' },
});