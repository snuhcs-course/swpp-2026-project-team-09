/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './icon';
import { type MapPlaceKind, placeKindLook } from './map-kinds';
import { TAG, tagStyles } from './map-tag';
import { color, radius } from './tokens';

interface GroupProps {
  // The kinds of the things at the place, in the order they are drawn.
  kinds: readonly MapPlaceKind[];
  selected?: boolean;
  // A Favorite Event is among them: the official round has the filled star in place of its icon.
  starred?: boolean;
}

// What a screen reader says for the kinds: "공식 행사 · 파티".
function kindNames(kinds: readonly MapPlaceKind[]): string {
  return kinds.map((kind) => placeKindLook(kind).name).join(' · ');
}

// A small round for each kind, in the kind's colour and with its icon, side by side, at the head of a group's card.
// `starred` draws the official round's filled star.
export function KindRounds({ kinds, starred = false }: Omit<GroupProps, 'selected'>): ReactElement {
  return (
    <>
      {kinds.map((kind) => {
        const { fill, icon } = placeKindLook(kind);
        const star = starred && kind === 'official';
        return (
          <View key={kind} style={[styles.kind, { backgroundColor: fill }]}>
            <Icon color={color.onPrimary} filled={star} name={star ? 'star' : icon} size={KIND_ICON} />
          </View>
        );
      })}
    </>
  );
}

interface GroupTagProps extends GroupProps {
  // The place's short name, beside the rounds from the map's "names" level.
  label?: string;
  // From far away, while the whole campus is in view: the smaller rounds.
  far?: boolean;
}

// Several kinds of things at one place, as a 파티's bold round grown into a capsule (P06-61): each kind's icon in white
// side by side on the navy, inside a white ring of 2, on the map dot's shadow, whatever kinds are together. 28 high
// inside the ring from close, 20 from far away, and the place's name after the icons from the "names" level. A chosen
// one has a soft ring of the key colour. It sits on its middle. A screen reader says the kinds' names.
function GroupTag({ kinds, selected = false, starred = false, label, far = false }: GroupTagProps): ReactElement {
  const size = far ? TAG.bold.far : TAG.bold.near;
  const named = label !== undefined && !far;
  return (
    <View
      accessibilityLabel={kindNames(kinds)}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View
        style={[
          styles.bold,
          styles.capsule,
          { height: size.box + TAG.bold.ring * 2 },
          far && styles.farCapsule,
          named && styles.namedTag,
          selected && styles.boldSelected,
        ]}
      >
        {kinds.map((kind) => {
          const star = starred && kind === 'official';
          return (
            <Icon
              color={color.onPrimary}
              filled={star}
              key={kind}
              name={star ? 'star' : placeKindLook(kind).icon}
              size={size.icon}
            />
          );
        })}
        {named ? (
          <Text numberOfLines={1} style={styles.name}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// From close: the capsule 28 high inside its ring, with the place's name where `label` is given. `starred` draws the official round's star.
export function MapGroupPin(props: Omit<GroupTagProps, 'far'>): ReactElement {
  return <GroupTag {...props} />;
}

// From far away, when the whole campus is in view: the capsule 20 high inside its ring.
export function MapGroupDot({ kinds, selected = false }: GroupProps): ReactElement {
  return <GroupTag far kinds={kinds} selected={selected} />;
}

const KIND = 16;
const KIND_ICON = 10;
// Between the icons and at the capsule's ends, as the mockup of P06-61 draws it: 6 from close, 4 from far away.
const GAP = 6;
const FAR_GAP = 4;

const styles = StyleSheet.create({
  ...tagStyles,
  pin: { alignItems: 'center', alignSelf: 'flex-start' },
  capsule: {
    gap: GAP,
    paddingHorizontal: GAP,
    backgroundColor: color.snuBlue,
    borderColor: color.surface,
  },
  farCapsule: { gap: FAR_GAP, paddingHorizontal: FAR_GAP },
  namedTag: { paddingRight: 10 },
  name: { ...tagStyles.name, color: color.onPrimary },
  kind: { alignItems: 'center', justifyContent: 'center', width: KIND, height: KIND, borderRadius: radius.full },
});
