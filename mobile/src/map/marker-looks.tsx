// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46
import type { ReactElement } from 'react';
import { MapDot, MapPerson, MapPin, type MapPlaceKind, MapRestaurant, type PersonTone } from '@/design-system';

// How something on the map looks. One picture is made for each look and kept under the look's name, so two things
// that look the same share one, and the number of pictures is the number of names:
// - two for the User's own Avatar;
// - for each person, the two sizes in each tone the person was seen in, with and without a photo, dimmed while the
//   person's position was old, and each of them selected, which only the one selected person ever asks for;
// - for each kind of place, the dot and the pin, the pin once for each count it shows, and each of them selected.
// No look holds a name or a label: that is the map's own text under the marker (`text` of `MapMarker`).
//
// A name holds nothing that changes from one answer of the server to the next: a person is named by their id and by
// whether they have a photo, never by the photo's address, which is new with every answer. So a person whose name or
// photo changes keeps the picture made first until the app starts again.
//
// What a release of unused pictures (ticket 07) has to cover, since no picture is released while the app runs: the
// looks of a person who is no longer on the map or no longer a Friend, a person's looks in the tones they are no
// longer in, the selected looks once nothing is selected, a pin's looks for the counts it no longer shows, and a
// person's pictures when their name or their photo changed, which are then made again.

// A dot is the look from far away, a pin the look from close.
export type MarkerForm = 'dot' | 'pin';

export type MarkerLook =
  // The User's own Avatar. `small` is its look while the whole campus is in view: three quarters of its size.
  | { kind: 'me'; small?: boolean }
  // A person: a Friend in the status's colour, or a member of the User's Party in the tone `member`. The frames'
  // teardrop with the person's letters or photo in it. `small` is its look while the whole campus is in view.
  // `id` is the person's own, which names the look; `name` and `photo` are what is drawn. `stale` is dimmed: the
  // position is old.
  | {
      kind: 'person';
      id: string;
      tone: PersonTone;
      small?: boolean;
      selected?: boolean;
      stale?: boolean;
      name: string;
      photo: string | null;
    }
  // A place, of each kind the design system has. `count` is drawn on a pin, never on a dot; 0 or left out, none.
  | { kind: MapPlaceKind; form: MarkerForm; count?: number; selected?: boolean }
  // The Place of restaurants with menus today, at every level of detail.
  | { kind: 'restaurant'; selected?: boolean };

function parts(...names: (string | false)[]): string {
  return names.filter((name) => name !== false).join(':');
}

// The look's name: the key its picture is kept under. Two looks that draw the same picture have the same name.
export function lookName(look: MarkerLook): string {
  if (look.kind === 'me') {
    return look.small === true ? 'me:small' : 'me';
  }
  const selected = look.selected === true && 'selected';
  if (look.kind === 'restaurant') {
    return parts('restaurant', selected);
  }
  if (look.kind === 'person') {
    const photo = look.photo !== null && 'photo';
    const stale = look.stale === true && 'stale';
    return parts('person', look.small === true ? 'small' : 'full', look.tone, look.id, photo, stale, selected);
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
  if (look.kind === 'me') {
    return false;
  }
  return look.kind === 'person' || look.kind === 'restaurant' || look.form === 'pin';
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
        stale={look.stale}
        tone={look.tone}
      />
    );
  }
  if (look.kind === 'restaurant') {
    return <MapRestaurant selected={look.selected} />;
  }
  return look.form === 'dot' ? (
    <MapDot kind={look.kind} selected={look.selected} />
  ) : (
    <MapPin count={look.count} kind={look.kind} selected={look.selected} />
  );
}
