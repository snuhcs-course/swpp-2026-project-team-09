/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { color, Icon } from '@/design-system';
import { useFavorite } from '@/features/events/use-favorite';

export const FAVORITE_LABEL = '즐겨찾기';
// The 행사 tab's names for the same press, as the `Events` frame draws its bookmark.
export const KEEP_LABEL = '관심 행사에 추가';
export const DROP_LABEL = '관심 행사에서 빼기';

// The ☆ of a Global Event's card: filled in the official colour while the User starred it. It changes at once, and
// back with a toast when the main server did not take the change. Its touch area is the map card's X's. `style`
// places it, such as margins that keep its touch area from widening the row it sits in. An event the User's list does
// not hold, such as an ended event in an old chat answer, has none. The 행사 tab draws it as a bookmark, navy when on,
// named for what a press does.
export function FavoriteToggle({
  eventId,
  style,
  bookmark = false,
}: {
  eventId: string;
  style?: StyleProp<ViewStyle>;
  bookmark?: boolean;
}): ReactElement | null {
  const { held, on, turn } = useFavorite(eventId);
  if (!held) {
    return null;
  }
  const label = bookmark ? (on ? DROP_LABEL : KEEP_LABEL) : FAVORITE_LABEL;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={HIT_SLOP}
      onPress={() => {
        turn(!on);
      }}
      style={[styles.toggle, style]}
      testID={`favorite-${eventId}`}
    >
      <Icon
        color={on ? color.snuBlue : color.inkMuted}
        filled={on}
        name={bookmark ? 'bookmark' : 'star'}
        size={bookmark ? 24 : 20}
      />
    </Pressable>
  );
}

// As the map card's X: the frame's 44, and the room around it.
const SIZE = 44;
const HIT_SLOP = 2;

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
});
