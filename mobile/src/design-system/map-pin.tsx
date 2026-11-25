/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Avatar, type PresenceStatus } from './avatar';
import { Glass } from './glass';
import { Icon, type IconName } from './icon';
import { type MapPlaceKind, placeKindLook } from './map-kinds';
import { MapRestaurant, MapStudyPin } from './map-service-pin';
import { MapCount, MapTag } from './map-tag';
import { color, halo, radius, shadow, text } from './tokens';

export { type MapPlaceKind, placeKindLook } from './map-kinds';
export type MapPinKind = MapPlaceKind | 'me' | 'friend';

interface MePinProps {
  kind: 'me';
  // At three quarters of its size, as the `Main` frame draws it while the whole campus is in view.
  small?: boolean;
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
  // Short, 8 characters at most: a tag's name beside its icon, from the map's "names" level.
  label?: string;
  // People who joined, or events clustered here.
  count?: number;
  selected?: boolean;
  // Another icon than the kind's own, filled where `filled` is set: a Favorite Event's star.
  icon?: IconName;
  filled?: boolean;
  // Translucent grey: a place the User may not use, such as a study building none of whose spaces is open to them.
  muted?: boolean;
}

type MapPinProps = MePinProps | FriendPinProps | CategoryPinProps;

// The name under a Friend's pin, on glass.
function Label({ children }: { children: string }): ReactElement {
  return (
    <Glass level="mapChip" style={styles.label}>
      <Text style={styles.labelText}>{children}</Text>
    </Glass>
  );
}

// The shuttle's pin, a vehicle: a rounded square in its colour, with its icon in white and a white border.
function ShuttlePin({ count = 0, selected = false, label }: Omit<CategoryPinProps, 'kind'>): ReactElement {
  const { fill, icon, name } = placeKindLook('shuttle');
  return (
    <View
      accessibilityLabel={label ?? name}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={styles.pin}
    >
      <View style={[styles.head, { backgroundColor: fill }, selected && styles.selectedHead]}>
        <Icon color={color.onPrimary} name={icon} size={18} />
        <MapCount count={count} />
      </View>
      <View style={[styles.tail, { backgroundColor: fill }]} />
    </View>
  );
}

function CategoryPin({ muted, ...props }: CategoryPinProps): ReactElement {
  const { kind, selected, label } = props;
  if (kind === 'dining') {
    return <MapRestaurant selected={selected} />;
  }
  if (kind === 'library') {
    return <MapStudyPin muted={muted} name={label ?? placeKindLook(kind).name} selected={selected} />;
  }
  if (kind === 'shuttle') {
    return <ShuttlePin {...props} />;
  }
  return <MapTag {...props} />;
}

// A marker over the map. `me` is the only use of the `me` colour. A Friend is an Avatar with the friend ring. A 행사,
// a 파티 and a 퀘스트 are light tags (`MapTag`); a 식당 and a 공부공간 are small rounds with a tail; the shuttle is a
// rounded square.
export function MapPin(props: MapPinProps): ReactElement {
  if (props.kind === 'me') {
    return (
      <View
        accessibilityLabel="내 위치"
        accessibilityRole="image"
        accessible
        style={[styles.me, props.small === true && styles.smallMe]}
      >
        <View style={[styles.meDot, props.small === true && styles.smallMeDot]} />
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

// A place from far away, when the whole campus is in view. A 행사, a 파티 and a 퀘스트 are the tag's smaller round. A
// campus service's is a small square in its colour; a selected one is 4 larger, inside a ring of the key colour.
export function MapDot({ kind, selected = false }: { kind: MapPlaceKind; selected?: boolean }): ReactElement {
  const { fill, service, name } = placeKindLook(kind);
  if (!service) {
    return <MapTag far kind={kind} selected={selected} />;
  }
  return (
    <View
      accessibilityLabel={name}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={[styles.dot, { backgroundColor: fill }, selected && styles.selectedDot]}
    />
  );
}

const ME_HALO = 48;
const ME_DOT = 16;
const ME_BORDER = 3;
const ME_SMALL = 0.75;
// The design system's sizes are the inside of a head; its white border of 2 is added around it.
const HEAD_BORDER = 2;
const SERVICE_HEAD = 30 + HEAD_BORDER * 2;
// 9 of colour inside a white border of 2.
const SERVICE_DOT = 9 + HEAD_BORDER * 2;
const SELECTED_DOT_MORE = 4;

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SERVICE_HEAD,
    height: SERVICE_HEAD,
    borderRadius: radius.md,
    borderWidth: HEAD_BORDER,
    borderColor: color.surface,
    boxShadow: shadow.float,
  },
  selectedHead: {
    transform: [{ scale: 1.18 }],
    boxShadow: `0 0 0 4px ${halo.selected}, ${shadow.float}`,
  },
  dot: {
    alignSelf: 'flex-start',
    width: SERVICE_DOT,
    height: SERVICE_DOT,
    borderRadius: 3,
    borderWidth: HEAD_BORDER,
    borderColor: color.surface,
    boxShadow: shadow.dot,
  },
  // The frame's ring reaches 6 from the colour: 4 beyond the white border of 2.
  selectedDot: {
    width: SERVICE_DOT + SELECTED_DOT_MORE,
    height: SERVICE_DOT + SELECTED_DOT_MORE,
    boxShadow: `0 0 0 4px ${halo.selectedDot}, ${shadow.dot}`,
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
  },
  labelText: { ...text.micro, color: color.ink },
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
    borderWidth: ME_BORDER,
    borderColor: color.surface,
    backgroundColor: color.me,
    boxShadow: shadow.float,
  },
  smallMe: { width: ME_HALO * ME_SMALL, height: ME_HALO * ME_SMALL },
  smallMeDot: { width: ME_DOT * ME_SMALL, height: ME_DOT * ME_SMALL, borderWidth: ME_BORDER * ME_SMALL },
});
