import type { ReactElement } from 'react';
import { Avatar, MapDot, MapPin, type MapPlaceKind, type PresenceStatus } from '@/design-system';

// How something on the map looks. One picture is made for each look, so two Friends who look the same share one.
// A dot is the look from far away, a pin the look from close.
export type MarkerForm = 'dot' | 'pin';

export type MarkerLook =
  // The User's own Avatar. `small` is its look while the whole campus is in view: three quarters of its size.
  | { kind: 'me'; small?: boolean }
  // A Friend's Avatar: the letters of the name or the photo, and the status colour.
  | { kind: 'friend'; form: MarkerForm; name: string; photo: string | null; status: PresenceStatus }
  // A marker of each kind the design system has.
  | { kind: MapPlaceKind; form: MarkerForm };

// The look's name: the key its picture is kept under.
export function lookName(look: MarkerLook): string {
  if (look.kind === 'me') {
    return look.small === true ? 'me:small' : 'me';
  }
  if (look.kind === 'friend') {
    return ['friend', look.form, look.status, look.name, look.photo ?? ''].join(':');
  }
  return `${look.kind}:${look.form}`;
}

export function hasPhoto(look: MarkerLook): boolean {
  return look.kind === 'friend' && look.photo !== null;
}

// A pin stands on its tip. Everything else, a round thing, sits on its middle.
export function standsOnTip(look: MarkerLook): boolean {
  return look.kind !== 'me' && look.kind !== 'friend' && look.form === 'pin';
}

// The design system's view of a look. A name under it is the map's own text, so no view has a label.
export function LookView({ look, onPhotoSettled }: { look: MarkerLook; onPhotoSettled?: () => void }): ReactElement {
  if (look.kind === 'me') {
    return <MapPin kind="me" small={look.small} />;
  }
  if (look.kind === 'friend') {
    return (
      <Avatar
        name={look.name}
        onPhotoSettled={onPhotoSettled}
        ring="friend"
        size={look.form === 'dot' ? 'sm' : 'md'}
        source={look.photo === null ? undefined : { uri: look.photo }}
        status={look.status}
      />
    );
  }
  return look.form === 'dot' ? <MapDot kind={look.kind} /> : <MapPin kind={look.kind} />;
}
