import type { ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native';
import { Avatar } from './avatar';
import { color, presence, radius, shadow } from './tokens';

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
  // Called once the photo is shown or has failed, for a caller that waits for the finished look.
  onPhotoSettled?: () => void;
  testID?: string;
}

const SIDE = 36;
const SMALL_SIDE = 24;
// The face is the small Avatar, drawn smaller still in the small marker.
const SMALL_FACE = 0.68;
const SELECTED = 1.18;
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

// A person on the map, as the `Main` frame draws one: a teardrop filled with the tone's colour, with the person's
// small Avatar in it. Its box ends at its tip, which stands on the person's position. A selected one is 1.18 times
// as large, inside a white ring and a ring of the key colour.
export function MapPerson({
  name,
  source,
  tone,
  small = false,
  selected = false,
  onPhotoSettled,
  testID,
}: MapPersonProps): ReactElement {
  const grown = selected ? SELECTED : 1;
  const side = (small ? SMALL_SIDE : SIDE) * grown;
  return (
    <View style={{ width: side, height: side * (1 + TIP) }} testID={testID}>
      <View
        style={[
          styles.drop,
          { width: side, height: side, backgroundColor: presence[tone] },
          roundBut(side / 2),
          selected && styles.selected,
        ]}
        testID={testID === undefined ? undefined : `${testID}:drop`}
      >
        <View style={[styles.face, { transform: [{ rotate: '45deg' }, { scale: (small ? SMALL_FACE : 1) * grown }] }]}>
          <Avatar name={name} onPhotoSettled={onPhotoSettled} size="sm" source={source} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
