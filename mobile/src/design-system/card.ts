import { StyleSheet } from 'react-native';
import { color, radius, shadow, space } from './tokens';

// The ground that cards share. On white a card is set apart by a hairline; over the map it floats on a shadow.
export const cardStyles = StyleSheet.create({
  card: {
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  floating: {
    borderColor: 'transparent',
    boxShadow: shadow.float,
  },
});
