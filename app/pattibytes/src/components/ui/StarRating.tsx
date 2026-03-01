import React from 'react';
import { View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { clampRating } from '../../utils/ratings';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { COLORS } from '../../lib/constants';

export default function StarRating({
  rating,
  size = 16,
  color = '#F59E0B',
  emptyColor = '#D1D5DB',
}: {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
}) {
  const r = clampRating(rating);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const diff = r - i;

        if (diff >= 0) {
          return <FontAwesome key={i} name="star" size={size} color={color} />;
        }
        if (diff >= -0.5) {
          return <FontAwesome key={i} name="star-half-full" size={size} color={color} />;
        }
        return <FontAwesome key={i} name="star-o" size={size} color={emptyColor} />;
      })}
    </View>
  );
}
