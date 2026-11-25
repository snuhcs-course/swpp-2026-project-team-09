/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Glass } from './glass';
import { Icon } from './icon';
import { type MapPlaceKind, placeKindLook } from './map-kinds';
import { seeThrough } from './see-through';
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

// Several kinds of things at one place, as a light tag like a single kind's (`MapPin`): a round for each kind, its
// line icon in its colour on that colour at 14%, side by side on glass, and the place's name after them from the
// "names" level. A chosen one has a navy border and ring. It sits on its middle. A screen reader says the kinds' names.
function GroupTag({ kinds, selected = false, starred = false, label, far = false }: GroupTagProps): ReactElement {
  const size = far ? TAG.far : TAG.near;
  const named = label !== undefined && !far;
  return (
    <View
      accessibilityLabel={kindNames(kinds)}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View style={[styles.frame, { height: size.box }, selected && styles.selectedFrame]}>
        <Glass level="inner" style={[styles.fill, named && styles.namedTag]}>
          {kinds.map((kind) => {
            const { fill, icon } = placeKindLook(kind);
            const star = starred && kind === 'official';
            return (
              <View
                key={kind}
                style={[
                  styles.round,
                  { width: size.round, height: size.round, backgroundColor: seeThrough(fill, TAG.tint) },
                ]}
              >
                <Icon color={fill} filled={star} name={star ? 'star' : icon} size={size.icon} />
              </View>
            );
          })}
          {named ? (
            <Text numberOfLines={1} style={styles.name}>
              {label}
            </Text>
          ) : null}
        </Glass>
      </View>
    </View>
  );
}

// From close: the tag of 26, with the place's name where `label` is given. `starred` draws the official round's star.
export function MapGroupPin(props: Omit<GroupTagProps, 'far'>): ReactElement {
  return <GroupTag {...props} />;
}

// From far away, when the whole campus is in view: the tag of 20.
export function MapGroupDot({ kinds, selected = false }: GroupProps): ReactElement {
  return <GroupTag far kinds={kinds} selected={selected} />;
}

const KIND = 16;
const KIND_ICON = 10;
const GAP = 2;

const styles = StyleSheet.create({
  ...tagStyles,
  pin: { alignItems: 'center', alignSelf: 'flex-start' },
  frame: { ...tagStyles.frame, borderColor: color.border },
  fill: { ...tagStyles.fill, gap: GAP, paddingHorizontal: GAP },
  namedTag: { paddingRight: 9 },
  name: { ...tagStyles.name, marginLeft: 3 },
  kind: { alignItems: 'center', justifyContent: 'center', width: KIND, height: KIND, borderRadius: radius.full },
});
