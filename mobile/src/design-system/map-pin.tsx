import type { ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Avatar, type PresenceStatus } from './avatar';
import { Icon, type IconName } from './icon';
import { color, halo, radius, shadow, size as sizes, text } from './tokens';

export type MapPlaceKind = 'official' | 'private' | 'party' | 'quest' | 'dining' | 'library' | 'shuttle';
export type MapPinKind = MapPlaceKind | 'me' | 'friend';

// The kind decides the colour and the icon, so that pins stay apart without colour. `name` is what a screen reader
// says for a pin without a label.
const CATEGORIES: Record<MapPlaceKind, { fill: string; icon: IconName; service: boolean; name: string }> = {
  official: { fill: color.snuBlue, icon: 'calendar', service: false, name: '공식 행사' },
  private: { fill: color.private, icon: 'lock', service: false, name: '내 일정' },
  party: { fill: color.party, icon: 'users', service: false, name: '파티' },
  quest: { fill: color.quest, icon: 'flag', service: false, name: '퀘스트' },
  dining: { fill: color.svcDining, icon: 'meal', service: true, name: '식당' },
  library: { fill: color.svcStudy, icon: 'book', service: true, name: '공부공간' },
  shuttle: { fill: color.svcShuttle, icon: 'bus', service: true, name: '셔틀버스' },
};

interface MePinProps {
  kind: 'me';
}

interface FriendPinProps {
  kind: 'friend';
  // The Friend's name, photo and status, as on an Avatar.
  name: string;
  source?: ImageSourcePropType;
  status?: PresenceStatus;
  label?: string;
}

interface CategoryPinProps {
  kind: MapPlaceKind;
  // Short, 8 characters at most, shown in a white pill under the pin.
  label?: string;
  // People who joined, or events clustered here.
  count?: number;
  selected?: boolean;
  // Another icon than the kind's own.
  icon?: IconName;
}

type MapPinProps = MePinProps | FriendPinProps | CategoryPinProps;

function Label({ children }: { children: string }): ReactElement {
  return (
    <View style={styles.label}>
      <Text style={styles.labelText}>{children}</Text>
    </View>
  );
}

function CategoryPin({ kind, label, count = 0, selected = false, icon }: CategoryPinProps): ReactElement {
  const { fill, icon: kindIcon, service, name } = CATEGORIES[kind];
  const spoken = count > 0 ? `${label ?? name} ${count}` : (label ?? name);
  return (
    <View
      accessibilityLabel={spoken}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View
        style={[styles.head, service && styles.serviceHead, { backgroundColor: fill }, selected && styles.selectedHead]}
      >
        <Icon color={color.onPrimary} name={icon ?? kindIcon} size={18} />
        {count > 0 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.tail, { backgroundColor: fill }]} />
      {label === undefined ? null : <Label>{label}</Label>}
    </View>
  );
}

// A marker over the map. `me` is the only use of the `me` colour. A Friend is an Avatar with the friend ring. A
// campus service's pin is a smaller rounded square, so that the round social pins stay dominant.
export function MapPin(props: MapPinProps): ReactElement {
  if (props.kind === 'me') {
    return (
      <View accessibilityLabel="내 위치" accessibilityRole="image" accessible style={styles.me}>
        <View style={styles.meDot} />
      </View>
    );
  }
  if (props.kind === 'friend') {
    return (
      <View style={styles.pin}>
        <Avatar name={props.name} ring="friend" source={props.source} status={props.status} />
        {props.label === undefined ? null : <Label>{props.label}</Label>}
      </View>
    );
  }
  return <CategoryPin {...props} />;
}

// A pin from far away, when the whole campus is in view: the kind's colour alone. A campus service's is a smaller
// square.
export function MapDot({ kind }: { kind: MapPlaceKind }): ReactElement {
  const { fill, service, name } = CATEGORIES[kind];
  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="image"
      accessible
      style={[styles.dot, service && styles.serviceDot, { backgroundColor: fill }]}
    />
  );
}

const ME_HALO = 48;
const ME_DOT = 16;
// The design system's sizes are the inside of a head; its white border of 2 is added around it.
const HEAD_BORDER = 2;
const HEAD = sizes.pin + HEAD_BORDER * 2;
const SERVICE_HEAD = 30 + HEAD_BORDER * 2;
// 12 of colour, or 9 for a campus service, inside a white border of 2.
const DOT = 12 + HEAD_BORDER * 2;
const SERVICE_DOT = 9 + HEAD_BORDER * 2;
const COUNT = 18;
const COUNT_PADDING = 4;

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    width: HEAD,
    height: HEAD,
    borderRadius: radius.full,
    borderWidth: HEAD_BORDER,
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
    boxShadow: `0 0 0 4px ${halo.selected}, ${shadow.float}`,
  },
  dot: {
    alignSelf: 'flex-start',
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    borderWidth: HEAD_BORDER,
    borderColor: color.surface,
    boxShadow: shadow.card,
  },
  serviceDot: {
    width: SERVICE_DOT,
    height: SERVICE_DOT,
    borderRadius: 3,
  },
  tail: {
    width: 2,
    height: 8,
    marginTop: -1,
  },
  label: {
    marginTop: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.card,
  },
  labelText: { ...text.micro, color: color.ink },
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
  me: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ME_HALO,
    height: ME_HALO,
    borderRadius: radius.full,
    backgroundColor: halo.me,
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
