/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { type MapPlaceKind, placeKindLook } from './map-pin';
import { color, halo, radius, shadow, size as sizes } from './tokens';

interface GroupProps {
  // The kinds of the things at the place, in the order they are drawn.
  kinds: readonly MapPlaceKind[];
  selected?: boolean;
}

// What a screen reader says for the kinds: "공식 행사 · 파티".
function kindNames(kinds: readonly MapPlaceKind[]): string {
  return kinds.map((kind) => placeKindLook(kind).name).join(' · ');
}

// A small round for each kind, in the kind's colour and with its icon, side by side: inside a group's pin, and at
// the head of its card.
export function KindRounds({ kinds }: { kinds: readonly MapPlaceKind[] }): ReactElement {
  return (
    <>
      {kinds.map((kind) => {
        const { fill, icon } = placeKindLook(kind);
        return (
          <View key={kind} style={[styles.kind, { backgroundColor: fill }]}>
            <Icon color={color.onPrimary} name={icon} size={KIND_ICON} />
          </View>
        );
      })}
    </>
  );
}

// Several kinds of things at one place, from close: the pin's white round, with a small round inside it for each
// kind, in the kind's colour and with its icon. Three or more widen the round into a pill. A selected one is larger,
// inside a ring of the key colour, as a selected pin is. A screen reader says the kinds' names.
export function MapGroupPin({ kinds, selected = false }: GroupProps): ReactElement {
  return (
    <View
      accessibilityLabel={kindNames(kinds)}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View style={[styles.head, selected && styles.selectedHead]}>
        <KindRounds kinds={kinds} />
      </View>
      <View style={styles.tail} />
    </View>
  );
}

// The same from far away, when the whole campus is in view: a white pill with a dot of each kind's colour.
export function MapGroupDot({ kinds, selected = false }: GroupProps): ReactElement {
  return (
    <View
      accessibilityLabel={kindNames(kinds)}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={[styles.dot, selected && styles.selectedDot]}
    >
      {kinds.map((kind) => (
        <View key={kind} style={[styles.dotKind, { backgroundColor: placeKindLook(kind).fill }]} />
      ))}
    </View>
  );
}

// As a pin's head: the design system's size inside a white border of 2.
const HEAD_BORDER = 2;
const HEAD = sizes.pin + HEAD_BORDER * 2;
const KIND = 16;
const KIND_ICON = 10;
const GAP = 2;
const DOT_KIND = 8;

const styles = StyleSheet.create({
  pin: { alignItems: 'center', alignSelf: 'flex-start' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
    minWidth: HEAD,
    height: HEAD,
    paddingHorizontal: HEAD_BORDER * 2,
    borderRadius: radius.full,
    borderWidth: HEAD_BORDER,
    borderColor: color.surface,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  selectedHead: {
    transform: [{ scale: 1.18 }],
    boxShadow: `0 0 0 4px ${halo.selected}, ${shadow.float}`,
  },
  kind: { alignItems: 'center', justifyContent: 'center', width: KIND, height: KIND, borderRadius: radius.full },
  tail: { width: 2, height: 8, marginTop: -1, backgroundColor: color.inkMuted },
  dot: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: GAP,
    padding: HEAD_BORDER,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.dot,
  },
  // A ring of 4 beyond the white, as a selected dot has.
  selectedDot: { boxShadow: `0 0 0 4px ${halo.selectedDot}, ${shadow.dot}` },
  dotKind: { width: DOT_KIND, height: DOT_KIND, borderRadius: radius.full },
});
