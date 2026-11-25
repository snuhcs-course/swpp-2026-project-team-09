/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icon } from './icon';
import { seeThrough } from './map-kinds';
import { color, halo, radius } from './tokens';

// The canvas's open book, drawn by us: two pages, lightly filled, and the spine.
function OpenBook(): ReactElement {
  return (
    <Svg
      fill="none"
      height={GLYPH}
      stroke={color.onPrimary}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      viewBox="0 0 24 24"
      width={GLYPH}
    >
      <Path
        d="M12 6.8C10.4 5.5 8 5 3.5 5.2v12.6c4.5-.2 6.9.3 8.5 1.6 1.6-1.3 4-1.8 8.5-1.6V5.2C16 5 13.6 5.5 12 6.8z"
        fill={color.onPrimary}
        fillOpacity={0.25}
      />
      <Path d="M12 6.8v12.6" />
    </Svg>
  );
}

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
      <View style={[styles.round, { backgroundColor: seeThrough(fill, 0.9) }, selected && styles.selectedRound]}>
        {glyph}
      </View>
      <View style={[styles.tail, { borderTopColor: seeThrough(fill, 0.88) }]} />
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

// A building of the 공부공간 layer: the sky round with a white book.
export function MapStudyPin({ name, selected = false, muted = false }: StudyPinProps): ReactElement {
  return (
    <RoundPin
      fill={muted ? color.inkSubtle : color.pinStudy}
      glyph={<OpenBook />}
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
