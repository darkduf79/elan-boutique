import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  rating: number;
  size?: number;
};

export default function RatingStars({ rating, size = 14 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((step) => {
        const name = rating >= step ? 'star' : rating >= step - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={step} name={name} size={size} color={colors.gold} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
