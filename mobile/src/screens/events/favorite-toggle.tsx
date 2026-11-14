/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { color, Icon } from '@/design-system';
import { useFavorite } from '@/features/events/use-favorite';

export const FAVORITE_LABEL = '즐겨찾기';

// The ☆ of a Global Event's card: filled in the official colour while the User starred it. It changes at once, and
// back with a toast when the main server did not take the change. Its touch area is the map card's X's. `style`
// places it, such as margins that keep its touch area from widening the row it sits in.
export function FavoriteToggle({ eventId, style }: { eventId: string; style?: StyleProp<ViewStyle> }): ReactElement {
  const { on, turn } = useFavorite(eventId);
  return (
    <Pressable
      accessibilityLabel={FAVORITE_LABEL}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={HIT_SLOP}
      onPress={() => {
        turn(!on);
      }}
      style={[styles.toggle, style]}
      testID={`favorite-${eventId}`}
    >
      <Icon color={on ? color.snuBlue : color.inkMuted} filled={on} name="star" size={20} />
    </Pressable>
  );
}

// As the map card's X: the frame's 44, and the room around it.
const SIZE = 44;
const HIT_SLOP = 2;

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
});
