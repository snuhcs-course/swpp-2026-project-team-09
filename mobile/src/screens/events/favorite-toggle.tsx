/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { color, Icon } from '@/design-system';
import { useFavorite } from '@/features/events/use-favorite';

export const FAVORITE_LABEL = '즐겨찾기';

// The ☆ of a Global Event's card: filled in the official colour while the User starred it. It changes at once, and
// back with a toast when the main server did not take the change. Its touch area is the map card's X's. `style`
// places it, such as margins that keep its touch area from widening the row it sits in. An event the User's list does
// not hold, such as an ended event in an old chat answer, has none.
export function FavoriteToggle({
  eventId,
  style,
}: {
  eventId: string;
  style?: StyleProp<ViewStyle>;
}): ReactElement | null {
  const { held, on, turn } = useFavorite(eventId);
  if (!held) {
    return null;
  }
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
      <Icon color={on ? color.snuBlue : color.inkMuted} filled={on} name="star" size={STAR_SIZE} />
    </Pressable>
  );
}

// As the map card's X: the frame's 44, and the room around it.
const SIZE = 44;
const STAR_SIZE = 20;
const HIT_SLOP = 2;

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
});
