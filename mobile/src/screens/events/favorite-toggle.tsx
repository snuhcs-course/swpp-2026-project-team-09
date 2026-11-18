/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { color, Icon, type IconName } from '@/design-system';
import { useFavorite } from '@/features/events/use-favorite';

export const FAVORITE_LABEL = '즐겨찾기';

// How a toggle is drawn and named: its icon, and its name while off (a press keeps the event) and while on.
export interface FavoriteLook {
  icon: IconName;
  size: number;
  keep: string;
  drop: string;
}

// The ☆ 즐겨찾기 of the map card and the chat card, the glossary's Favorite Event.
export const STAR: FavoriteLook = { icon: 'star', size: 20, keep: FAVORITE_LABEL, drop: FAVORITE_LABEL };

// The `Events` frame's bookmark, named 관심 행사.
export const BOOKMARK: FavoriteLook = {
  icon: 'bookmark',
  size: 24,
  keep: '관심 행사에 추가',
  drop: '관심 행사에서 빼기',
};

// The 행사 tab's row and detail sheet draw this one. The owner is deciding (P15 ticket 54, Open questions): `STAR`
// here gives the tab the app's ☆ 즐겨찾기 again; keeping `BOOKMARK` means naming it 관심 행사 on every screen.
export const EVENTS_TAB_LOOK = BOOKMARK;

// The ☆ of a Global Event's card: filled in the official colour while the User starred it. It changes at once, and
// back with a toast when the main server did not take the change. Its touch area is the map card's X's. `style`
// places it, such as margins that keep its touch area from widening the row it sits in. An event the User's list does
// not hold, such as an ended event in an old chat answer, has none. `look` draws and names it: the 행사 tab passes
// `EVENTS_TAB_LOOK`.
export function FavoriteToggle({
  eventId,
  style,
  look = STAR,
}: {
  eventId: string;
  style?: StyleProp<ViewStyle>;
  look?: FavoriteLook;
}): ReactElement | null {
  const { held, on, turn } = useFavorite(eventId);
  if (!held) {
    return null;
  }
  return (
    <Pressable
      accessibilityLabel={on ? look.drop : look.keep}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={HIT_SLOP}
      onPress={() => {
        turn(!on);
      }}
      style={[styles.toggle, style]}
      testID={`favorite-${eventId}`}
    >
      <Icon color={on ? color.snuBlue : color.inkMuted} filled={on} name={look.icon} size={look.size} />
    </Pressable>
  );
}

// As the map card's X: the frame's 44, and the room around it.
const SIZE = 44;
const HIT_SLOP = 2;

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
});
