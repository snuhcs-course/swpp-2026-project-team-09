import type { ReactElement } from 'react';
import { MapDot, MapPerson, MapPin, type MapPlaceKind, type PersonTone } from '@/design-system';

// How something on the map looks. One picture is made for each look and kept under the look's name, so two things
// that look the same share one, and the number of pictures is the number of names:
// - two for the User's own Avatar;
// - for each person, the two sizes, and each of them selected, which only the one selected person ever asks for;
// - for each kind of place, the dot and the pin, the pin once for each count it shows, and each of them selected.
// No look holds a name or a label: that is the map's own text under the marker (`text` of `MapMarker`).

// A dot is the look from far away, a pin the look from close.
export type MarkerForm = 'dot' | 'pin';

export type MarkerLook =
  // The User's own Avatar. `small` is its look while the whole campus is in view: three quarters of its size.
  | { kind: 'me'; small?: boolean }
  // A person: a Friend in the status's colour, or a member of the User's Party in the tone `member`. The frames'
  // teardrop with the person's letters or photo in it. `small` is its look while the whole campus is in view.
  | { kind: 'person'; tone: PersonTone; small?: boolean; selected?: boolean; name: string; photo: string | null }
  // A place, of each kind the design system has. `count` is drawn on a pin, never on a dot; 0 or left out, none.
  | { kind: MapPlaceKind; form: MarkerForm; count?: number; selected?: boolean };

function parts(...names: (string | false)[]): string {
  return names.filter((name) => name !== false).join(':');
}

// The look's name: the key its picture is kept under. Two looks that draw the same picture have the same name.
export function lookName(look: MarkerLook): string {
  if (look.kind === 'me') {
    return look.small === true ? 'me:small' : 'me';
  }
  const selected = look.selected === true && 'selected';
  if (look.kind === 'person') {
    return parts('person', look.small === true ? 'small' : 'full', look.tone, look.name, look.photo ?? '', selected);
  }
  const count = look.form === 'pin' && (look.count ?? 0) > 0 && String(look.count);
  return parts(look.kind, look.form, count, selected);
}

export function hasPhoto(look: MarkerLook): boolean {
  return look.kind === 'person' && look.photo !== null;
}

// A pin and a person's marker stand on their tip, the bottom of their view. Everything else, a round thing, sits on
// its middle.
export function standsOnTip(look: MarkerLook): boolean {
  return look.kind === 'person' || (look.kind !== 'me' && look.form === 'pin');
}

// The design system's view of a look.
export function LookView({ look, onPhotoSettled }: { look: MarkerLook; onPhotoSettled?: () => void }): ReactElement {
  if (look.kind === 'me') {
    return <MapPin kind="me" small={look.small} />;
  }
  if (look.kind === 'person') {
    return (
      <MapPerson
        name={look.name}
        onPhotoSettled={onPhotoSettled}
        selected={look.selected}
        small={look.small}
        source={look.photo === null ? undefined : { uri: look.photo }}
        tone={look.tone}
      />
    );
  }
  return look.form === 'dot' ? (
    <MapDot kind={look.kind} selected={look.selected} />
  ) : (
    <MapPin count={look.count} kind={look.kind} selected={look.selected} />
  );
}
