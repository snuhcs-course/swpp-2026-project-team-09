/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Glass } from './glass';
import { Icon, type IconName } from './icon';
import { type MapPlaceKind, placeKindLook } from './map-kinds';
import { seeThrough } from './see-through';
import { color, font, halo, radius, shadow, text } from './tokens';

// The tag's two sizes: its box, the round of its icon inside, and the icon. `rim`, `questRim` and `tint` are the
// shares of the kind's colour in its border, in a 퀘스트's lighter border and in the icon's round.
export const TAG = {
  far: { box: 20, round: 16, icon: 11 },
  near: { box: 26, round: 20, icon: 14 },
  rim: 0.28,
  questRim: 0.16,
  tint: 0.14,
} as const;

// People who joined, or events clustered here: a white badge at a pin's top right.
export function MapCount({ count }: { count: number }): ReactElement | null {
  return count > 0 ? (
    <View style={styles.count}>
      <Text style={styles.countText}>{count}</Text>
    </View>
  ) : null;
}

export interface MapTagProps {
  kind: MapPlaceKind;
  // Short, 8 characters at most: the name beside the icon, from the map's "names" level.
  label?: string;
  count?: number;
  selected?: boolean;
  // Another icon than the kind's own, filled where `filled` is set: a Favorite Event's star.
  icon?: IconName;
  filled?: boolean;
  // From far away, while the whole campus is in view: the smaller round.
  far?: boolean;
}

// A 행사, a 파티 or a 퀘스트 on the map, as the changelog of 11.24 (§ 4-4) and the `Main` board draw it: a light tag
// on glass with the kind's line icon in the kind's colour, on that colour at 14%. A round of 20 from far away, of 26
// closer, and with its name beside the icon from the "names" level. A chosen one has a navy border and ring. It sits
// on its middle. A 퀘스트's is see-through at 70%, with a lighter rim and shadow (§ 4-1). The ground is the glass
// layer's `inner` level, the changelog's head at 80% (§ 5-5); the rim, the shadow and the ring are the frame around it.
export function MapTag({
  kind,
  label,
  count = 0,
  selected = false,
  icon,
  filled = false,
  far = false,
}: MapTagProps): ReactElement {
  const { fill, icon: kindIcon, name } = placeKindLook(kind);
  const spoken = count > 0 ? `${label ?? name} ${count}` : (label ?? name);
  const named = label !== undefined && !far;
  const size = far ? TAG.far : TAG.near;
  return (
    <View
      accessibilityLabel={spoken}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View
        style={[
          styles.frame,
          { height: size.box, borderColor: seeThrough(fill, kind === 'quest' ? TAG.questRim : TAG.rim) },
          !named && { width: size.box },
          kind === 'quest' && styles.quest,
          selected && styles.selectedFrame,
        ]}
      >
        <Glass level="inner" style={[styles.fill, named && styles.namedTag, named && count > 0 && styles.namedCounted]}>
          <View
            style={[
              styles.round,
              { width: size.round, height: size.round, backgroundColor: seeThrough(fill, TAG.tint) },
            ]}
          >
            <Icon color={fill} filled={filled} name={icon ?? kindIcon} size={size.icon} />
          </View>
          {named ? (
            <Text numberOfLines={1} style={styles.name}>
              {label}
            </Text>
          ) : null}
          <MapCount count={count} />
        </Glass>
      </View>
    </View>
  );
}

const NAME_WIDTH = 120;
const COUNT = 18;
const COUNT_PADDING = 4;
const TAG_SHADOW = '0 2px 8px rgba(14, 19, 48, 0.12)';
const QUEST_OPACITY = 0.7;

// A tag's look, shared with a group's: the frame with the rim and the shadow, and the glass that fills it.
export const tagStyles = StyleSheet.create({
  frame: { borderRadius: radius.full, borderWidth: 1, boxShadow: TAG_SHADOW },
  selectedFrame: {
    borderWidth: 1.5,
    borderColor: color.snuBlue,
    boxShadow: `0 0 0 4px ${halo.selectedTag}, ${TAG_SHADOW}`,
  },
  fill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  round: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  name: {
    maxWidth: NAME_WIDTH,
    fontFamily: font.semiBold,
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: -0.12,
    color: color.ink,
  },
});

const styles = StyleSheet.create({
  ...tagStyles,
  pin: { alignItems: 'center', alignSelf: 'flex-start' },
  namedTag: { gap: 5, paddingRight: 9, paddingLeft: 3 },
  quest: { opacity: QUEST_OPACITY, boxShadow: '0 1px 4px rgba(14, 19, 48, 0.08)' },
  // Room under the count, which reaches past the tag's end, so that it does not cover the name.
  namedCounted: { paddingRight: 9 + COUNT },
  count: {
    position: 'absolute',
    top: -6,
    right: -8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: COUNT + COUNT_PADDING * 2,
    height: COUNT,
    paddingHorizontal: COUNT_PADDING,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.card,
  },
  countText: { ...text.micro, lineHeight: COUNT, color: color.ink },
});
