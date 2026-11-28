/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
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
  // A 파티's and a 행사's round (P06-61): the colour's round, `box` across, inside a ring of `ring`, so that the
  // marker is `box` + 2 × `ring` across. From far away its share of the close one is the light tag's, 20 of 26.
  bold: {
    far: { box: 20, icon: 12 },
    near: { box: 28, icon: 16 },
    ring: 2,
  },
} as const;

// The kinds drawn as a solid round rather than a light tag, so that they stand out from the map's own icons.
function isBoldKind(kind: MapPlaceKind): boolean {
  return kind === 'party' || kind === 'official';
}

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

// A 파티 or a 행사 on the map (P06-61): a 파티 a solid round in its colour with a white ring and its icon in white, a
// 행사 a white round with a ring and its icon in its colour, 28 across inside a ring of 2 from close, 20 from far
// away, on the map dot's shadow. With its name beside the icon from the "names" level, the round grows into a
// capsule. A chosen one has a soft ring of the key colour. It sits on its middle.
function BoldTag({
  kind,
  label,
  count = 0,
  selected = false,
  icon,
  filled = false,
  far = false,
}: MapTagProps): ReactElement {
  const { fill, icon: kindIcon, name } = placeKindLook(kind);
  const solid = kind === 'party';
  const ink = solid ? color.onPrimary : fill;
  const spoken = count > 0 ? `${label ?? name} ${count}` : (label ?? name);
  const named = label !== undefined && !far;
  const size = far ? TAG.bold.far : TAG.bold.near;
  const across = size.box + TAG.bold.ring * 2;
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
          styles.bold,
          {
            height: across,
            minWidth: across,
            backgroundColor: solid ? fill : color.surface,
            borderColor: solid ? color.surface : fill,
          },
          named && [styles.boldNamed, { paddingLeft: (size.box - size.icon) / 2 }],
          named && count > 0 && styles.namedCounted,
          selected && styles.boldSelected,
        ]}
      >
        <Icon color={ink} filled={filled} name={icon ?? kindIcon} size={size.icon} />
        {named ? (
          <Text numberOfLines={1} style={[styles.name, { color: ink }]}>
            {label}
          </Text>
        ) : null}
        <MapCount count={count} />
      </View>
    </View>
  );
}

// A 파티 and a 행사 are bold rounds (`BoldTag`); the others, a 퀘스트 and 내 일정, the light tag below.
export function MapTag(props: MapTagProps): ReactElement {
  return isBoldKind(props.kind) ? <BoldTag {...props} /> : <LightTag {...props} />;
}

// A 퀘스트 or 내 일정 on the map, as the changelog of 11.24 (§ 4-4) and the `Main` board draw it: a light tag
// on glass with the kind's line icon in the kind's colour, on that colour at 14%. A round of 20 from far away, of 26
// closer, and with its name beside the icon from the "names" level. A chosen one has a navy border and ring. It sits
// on its middle. A 퀘스트's is see-through at 70%, with a lighter rim and shadow (§ 4-1). The ground is the glass
// layer's `inner` level, the changelog's see-through head (§ 5-5); the rim, the shadow and the ring are the frame
// around it.
function LightTag({
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
          named ? styles.namedFrame : { width: size.box },
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

// A tag's look, shared with a group's: the frame with the rim and the shadow, the glass that fills it, and the bold
// round of a 파티 and a 행사 with its chosen ring.
export const tagStyles = StyleSheet.create({
  bold: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: TAG.bold.ring,
    boxShadow: shadow.dot,
  },
  boldSelected: { boxShadow: `0 0 0 4px ${halo.selectedTag}, ${shadow.dot}` },
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
  boldNamed: { justifyContent: 'flex-start', gap: 5, paddingRight: 10 },
  namedTag: { gap: 5, paddingRight: 9, paddingLeft: 3 },
  // Under a named tag's glass, white at 50%: with the `inner` level's 90% the ground is 95%, so that the map's own
  // words under the tag do not read through its name (design review of A04-06). The rounds of 20 and 26 are the
  // level's alone.
  namedFrame: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
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
