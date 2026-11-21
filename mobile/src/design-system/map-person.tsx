/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Avatar } from './avatar';
import { color, mapText, presence, radius, shadow, text } from './tokens';

// What fills a person's marker: a Friend's status, or `member` for a member of the User's Party who is no Friend.
export type PersonTone = keyof typeof presence;

interface MapPersonProps {
  // Whose it is: the letters in it, and what a screen reader says.
  name: string;
  // A photo. Without one the letters are shown.
  source?: ImageSourcePropType;
  tone: PersonTone;
  // The look while the whole campus is in view: a side of 24 where it is 36 otherwise.
  small?: boolean;
  selected?: boolean;
  // Dimmed: the position it stands on is old.
  stale?: boolean;
  // Faint: an answer is up that the person is not in.
  faded?: boolean;
  // A "+" at the drop's upper right, outside the Avatar, as an answer's face carries "?" and "✓": a press adds the
  // person.
  addable?: boolean;
  // A green dot at the face's lower right, outside the Avatar, on the drop's rim: a Friend seen at the exact level.
  exact?: boolean;
  // Called once the photo is shown or has failed, for a caller that waits for the finished look.
  onPhotoSettled?: () => void;
  testID?: string;
}

const SIDE = 36;
const SMALL_SIDE = 24;
// The face is the small Avatar, drawn smaller still in the small marker.
const SMALL_FACE = 0.68;
const SELECTED = 1.18;
const BADGE = 14;
const DOT = 11;
// How far the green dot reaches inside the drop's rim: it sits on the rim, and at no size reaches the Avatar.
const DOT_ON_RIM = 1.5;
// While the "+" or the green dot is carried the box grows this much at both sides and at the top, so that the badge in
// its upper right corner and the dot at the lower right lie outside the Avatar, on the drop's rim, and whole inside the
// box the picture is made from. The drop and its tip keep their place in the box, so the face stands where it stood.
const BADGE_ROOM = 6;
// A square turned by 45° reaches (√2 − 1) / 2 of its side below its own box: the marker's tip.
const TIP = (Math.SQRT2 - 1) / 2;

// The frame's `50% 50% 50% 0`: round but for the corner that the turn brings to the bottom, the tip. Each corner is
// named, because a `borderRadius` beside one corner's own rounds that corner too on the web.
function roundBut(round: number): ViewStyle {
  return {
    borderTopLeftRadius: round,
    borderTopRightRadius: round,
    borderBottomRightRadius: round,
    borderBottomLeftRadius: 0,
  };
}

// The dot's box, its centre at 45° below the drop's centre, as far out as puts its inner edge `DOT_ON_RIM` inside.
function dotOf(side: number, room: number): number {
  return room + side / 2 + (side / 2 + DOT / 2 - DOT_ON_RIM) / Math.SQRT2 - DOT / 2;
}

// The whole picture's box: the drop and its tip, with room for a badge.
function frameOf(side: number, room: number): ViewStyle {
  return { width: side + room * 2, height: side * (1 + TIP) + room };
}

// A person on the map, as the `Main` frame draws one: a teardrop filled with the tone's colour, with the person's
// small Avatar in it. Its box ends at its tip, which stands on the person's position. A selected one is 1.18 times
// as large, inside a white ring and a ring of the key colour.
export function MapPerson({
  name,
  source,
  tone,
  small = false,
  selected = false,
  stale = false,
  faded = false,
  addable = false,
  exact = false,
  onPhotoSettled,
  testID,
}: MapPersonProps): ReactElement {
  const grown = selected ? SELECTED : 1;
  const side = (small ? SMALL_SIDE : SIDE) * grown;
  const room = addable || exact ? BADGE_ROOM : 0;
  const dotAt = dotOf(side, room);
  return (
    <View style={[frameOf(side, room), stale && styles.stale, faded && styles.faded]} testID={testID}>
      <View
        style={[
          styles.drop,
          { width: side, height: side, marginTop: room, marginLeft: room, backgroundColor: presence[tone] },
          roundBut(side / 2),
          selected && styles.selected,
        ]}
        testID={testID === undefined ? undefined : `${testID}:drop`}
      >
        <View style={[styles.face, { transform: [{ rotate: '45deg' }, { scale: (small ? SMALL_FACE : 1) * grown }] }]}>
          <Avatar name={name} onPhotoSettled={onPhotoSettled} size="sm" source={source} />
        </View>
      </View>
      {addable ? (
        <View style={styles.badge} testID={testID === undefined ? undefined : `${testID}:badge`}>
          <Text style={styles.plus}>+</Text>
        </View>
      ) : null}
      {exact ? (
        <View
          style={[styles.exact, { left: dotAt, top: dotAt }]}
          testID={testID === undefined ? undefined : `${testID}:exact`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stale: { opacity: 0.45 },
  faded: { opacity: 0.55 },
  // The shadow is turned with the fill, so it is given against the turn to fall straight down.
  drop: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    boxShadow: shadow.markerTurned,
  },
  selected: {
    boxShadow: `0 0 0 3px ${color.surface}, 0 0 0 6px ${color.snuBlue}, ${shadow.markerTurned}`,
  },
  face: {
    borderRadius: radius.full,
    boxShadow: `0 0 0 2px ${color.surface}`,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  plus: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
  exact: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.surface,
    backgroundColor: color.live,
  },
});
