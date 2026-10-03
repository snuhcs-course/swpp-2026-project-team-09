import type { ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Avatar, type PresenceStatus } from './avatar';
import { Icon, type IconName } from './icon';
import { color, font, radius, shadow, size as sizes, text } from './tokens';

type PlaceKind = 'official' | 'private' | 'party' | 'quest' | 'dining' | 'library' | 'shuttle';
export type MapPinKind = PlaceKind | 'me' | 'friend';

// The kind decides the colour and the icon, so that pins stay apart without colour.
const KINDS: Record<PlaceKind, { fill: string; icon: IconName; service: boolean }> = {
  official: { fill: color.snuBlue, icon: 'calendar', service: false },
  private: { fill: color.private, icon: 'lock', service: false },
  party: { fill: color.party, icon: 'users', service: false },
  quest: { fill: color.quest, icon: 'flag', service: false },
  dining: { fill: color.svcDining, icon: 'meal', service: true },
  library: { fill: color.svcStudy, icon: 'book', service: true },
  shuttle: { fill: color.svcShuttle, icon: 'bus', service: true },
};

interface MapPinProps {
  kind: MapPinKind;
  // Short, 8 characters at most, shown in a white pill under the pin. Also the accessible name.
  label?: string;
  // People who joined, or events clustered here.
  count?: number;
  selected?: boolean;
  // Another icon than the kind's own.
  icon?: IconName;
  // For a Friend: the name, the photo and the status of the Avatar.
  name?: string;
  source?: ImageSourcePropType;
  status?: PresenceStatus;
}

// A marker over the map. `me` is the only use of the `me` colour. A campus service's pin is a smaller rounded square,
// so that the round social pins stay dominant.
export function MapPin({
  kind,
  label,
  count,
  selected = false,
  icon,
  name,
  source,
  status,
}: MapPinProps): ReactElement {
  if (kind === 'me') {
    return (
      <View accessibilityLabel="내 위치" accessibilityRole="image" accessible style={styles.me}>
        <View style={styles.meDot} />
      </View>
    );
  }
  if (kind === 'friend') {
    return (
      <View style={styles.pin}>
        <Avatar name={name ?? label ?? ''} ring="friend" source={source} status={status} />
        {label === undefined ? null : <Text style={styles.label}>{label}</Text>}
      </View>
    );
  }
  const { fill, icon: kindIcon, service } = KINDS[kind];
  return (
    <View accessibilityLabel={label} accessibilityRole="image" accessible style={styles.pin}>
      <View
        style={[styles.head, service && styles.serviceHead, { backgroundColor: fill }, selected && styles.selectedHead]}
      >
        <Icon color={color.onPrimary} name={icon ?? kindIcon} size={18} />
        {count === undefined || count === 0 ? null : (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      <View style={[styles.tail, { backgroundColor: fill }]} />
      {label === undefined ? null : <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const ME_HALO = 48;
const ME_DOT = 16;
const SERVICE_HEAD = 30;

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    width: sizes.pin,
    height: sizes.pin,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.surface,
    boxShadow: shadow.float,
  },
  serviceHead: {
    width: SERVICE_HEAD,
    height: SERVICE_HEAD,
    borderRadius: radius.md,
  },
  selectedHead: {
    transform: [{ scale: 1.18 }],
    boxShadow: `0 0 0 4px rgba(0, 26, 114, 0.18), ${shadow.float}`,
  },
  tail: {
    width: 2,
    height: 8,
    marginTop: -1,
  },
  label: {
    ...text.micro,
    marginTop: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    color: color.ink,
    backgroundColor: color.surface,
    boxShadow: shadow.card,
  },
  count: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.card,
  },
  countText: {
    fontFamily: font.semiBold,
    fontSize: 11,
    lineHeight: 18,
    color: color.ink,
  },
  me: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ME_HALO,
    height: ME_HALO,
    borderRadius: radius.full,
    backgroundColor: 'rgba(47, 107, 255, 0.16)',
  },
  meDot: {
    width: ME_DOT,
    height: ME_DOT,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: color.surface,
    backgroundColor: color.me,
    boxShadow: shadow.float,
  },
});
