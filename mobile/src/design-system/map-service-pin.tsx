/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { seeThrough } from './see-through';
import { color, halo, radius } from './tokens';

interface RoundPinProps {
  name: string;
  fill: string;
  glyph: ReactNode;
  selected: boolean;
  muted?: boolean;
}

// A campus service's pin, as the changelog of 11.24 (§ 4-5, § 4-6) and the `Main` board draw the 식당 and 공부공간
// layers: a round of 22 in the layer's colour with a white glyph, a white ring and a triangular tail. A selected one
// is 26, inside a ring of the key colour. It stands on its tip.
function RoundPin({ name, fill, glyph, selected, muted = false }: RoundPinProps): ReactElement {
  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={[styles.pin, muted && styles.muted]}
    >
      <View
        style={[styles.round, { backgroundColor: seeThrough(fill, ROUND_ALPHA) }, selected && styles.selectedRound]}
      >
        {glyph}
      </View>
      <View style={[styles.tail, { borderTopColor: seeThrough(fill, TAIL_ALPHA) }]} />
    </View>
  );
}

// A restaurant on the map: the 식당 layer's coral round with a white fork and knife.
export function MapRestaurant({ selected = false }: { selected?: boolean }): ReactElement {
  return (
    <RoundPin
      fill={color.pinDining}
      glyph={<Icon color={color.onPrimary} name="meal" size={GLYPH} />}
      name="식당"
      selected={selected}
    />
  );
}

interface StudyPinProps {
  // What a screen reader says: "공부공간", or the building's name.
  name: string;
  selected?: boolean;
  // Translucent grey: a building none of whose Study Spaces the User may use.
  muted?: boolean;
}

// A building of the 공부공간 layer: the study colour's round with a white open book.
export function MapStudyPin({ name, selected = false, muted = false }: StudyPinProps): ReactElement {
  return (
    <RoundPin
      fill={muted ? color.inkSubtle : color.svcStudy}
      glyph={<Icon color={color.onPrimary} name="bookOpen" size={GLYPH} />}
      muted={muted}
      name={name}
      selected={selected}
    />
  );
}

const ROUND = 22;
const SELECTED_ROUND = 26;
const TAIL = 4;
const GLYPH = 14;
// The board's round and tail, a little see-through.
const ROUND_ALPHA = 0.9;
const TAIL_ALPHA = 0.88;
const SHADOW = `0 0 0 2px ${color.surface}, 0 1px 4px rgba(14, 19, 48, 0.3)`;

const styles = StyleSheet.create({
  pin: { alignItems: 'center', alignSelf: 'flex-start' },
  muted: { opacity: 0.55 },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    boxShadow: SHADOW,
  },
  selectedRound: {
    width: SELECTED_ROUND,
    height: SELECTED_ROUND,
    boxShadow: `${SHADOW}, 0 0 0 6px ${halo.selectedDot}`,
  },
  // The board's triangle of 8 by 6 under the round.
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: TAIL,
    borderRightWidth: TAIL,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
