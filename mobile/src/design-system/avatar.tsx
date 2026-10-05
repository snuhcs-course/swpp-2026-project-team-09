import type { ReactElement } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { color, font, presence, radius, size as sizes } from './tokens';

export type PresenceStatus = 'free' | 'class' | 'moving' | 'off';

const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  free: '공강',
  class: '수업 중',
  moving: '이동 중',
  off: '위치 꺼짐',
};

const DIAMETER = { sm: 28, md: sizes.avatar, lg: 56 } as const;
// 12 of colour inside a 2 border.
const STATUS_DOT = 16;
const INITIALS_SIZE = { sm: 11, md: 14, lg: 18 } as const;

// The last two syllables of a Korean name, or the first letters of the first two words of another.
function initials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') {
    return '?';
  }
  if (/[가-힣]/u.test(trimmed)) {
    return trimmed.slice(-2);
  }
  return trimmed
    .split(/\s+/u)
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AvatarProps {
  // Also the accessible name.
  name: string;
  // A photo. Without one the initials are shown.
  source?: ImageSourcePropType;
  size?: 'sm' | 'md' | 'lg';
  // A dot at the corner. Where the status matters, show its word next to the Avatar too: the dot alone is a hint.
  status?: PresenceStatus;
  // The ring that marks a Friend.
  ring?: 'friend';
  // Called once the photo is shown or has failed, for a caller that waits for the finished look.
  onPhotoSettled?: () => void;
}

// A person, as initials or a photo.
export function Avatar({ name, source, size = 'md', status, ring, onPhotoSettled }: AvatarProps): ReactElement {
  const diameter = DIAMETER[size];
  return (
    <View
      accessibilityLabel={status === undefined ? name : `${name} · ${PRESENCE_LABEL[status]}`}
      accessibilityRole="image"
      accessible
      style={[styles.avatar, { width: diameter, height: diameter }, ring === 'friend' && styles.friendRing]}
    >
      {source === undefined ? (
        <Text style={[styles.initials, { fontSize: INITIALS_SIZE[size], lineHeight: INITIALS_SIZE[size] }]}>
          {initials(name)}
        </Text>
      ) : (
        <Image onError={onPhotoSettled} onLoad={onPhotoSettled} source={source} style={styles.photo} />
      )}
      {status === undefined ? null : <View style={[styles.status, { backgroundColor: presence[status] }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: color.blue100,
  },
  friendRing: {
    boxShadow: `0 0 0 2px ${color.surface}, 0 0 0 4px ${color.friend}`,
  },
  initials: {
    fontFamily: font.semiBold,
    color: color.snuBlue,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  status: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: STATUS_DOT,
    height: STATUS_DOT,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.surface,
  },
});
