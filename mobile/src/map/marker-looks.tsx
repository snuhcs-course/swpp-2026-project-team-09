/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import {
  ANSWER_SYMBOL_BOX,
  type AnswerLabel,
  type AnswerSymbol,
  type LabelSide,
  MapAnswerMark,
  MapDot,
  MapGroupDot,
  MapGroupPin,
  MapPerson,
  MapPin,
  type MapPlaceKind,
  MapRestaurant,
  MapStudyCluster,
  MapTutorialPin,
  type PersonTone,
} from '@/design-system';
import type { Size } from './projection';

// How something on the map looks. One picture is made for each look and kept under the look's name, so two things
// that look the same share one, and the number of pictures is the number of names:
// - two for the User's own Avatar;
// - for each person, the two sizes in each tone the person was seen in, with and without a photo, dimmed while the
//   person's position was old, and each of them selected, which only the one selected person ever asks for;
// - for each kind of place, the dot and the pin, the pin once for each count it shows, and each of them selected;
// - for each set of kinds that stand together at one place, the dot and the pin, and each of them selected;
// - one for the tutorial's place pin.
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
  // `muted` is translucent grey: a study building none of whose spaces the User may use.
  | { kind: MapPlaceKind; form: MarkerForm; count?: number; selected?: boolean; muted?: boolean }
  // Study pins merged while the whole campus is in view, with how many they are.
  | { kind: 'study-cluster'; count: number; selected?: boolean }
  // The Place of restaurants with menus today, at every level of detail.
  | { kind: 'restaurant'; selected?: boolean }
  // Things of several kinds at one place: a small round for each kind, in the order given.
  | { kind: 'group'; kinds: readonly MapPlaceKind[]; form: MarkerForm; selected?: boolean }
  // The place 지도에서 보기 of a tutorial quest shows: a red teardrop with a white circle, at every level of detail.
  | { kind: 'tutorialPlace' }
  // A mark of an answer: its symbol and its label, words included, in one picture.
  | { kind: 'answer'; symbol: AnswerSymbol | null; label: AnswerLabel | null };

function parts(...names: (string | false)[]): string {
  return names.filter((name) => name !== false).join(':');
}

// Words may hold the separator of `parts`, so an answer's look is named by a list of what it draws, in a fixed order.
function answerName(symbol: AnswerSymbol | null, label: AnswerLabel | null): string {
  const drawn = [
    symbol?.type ?? null,
    symbol?.type === 'face' ? [symbol.name, symbol.dashed] : null,
    symbol?.type === 'dot' ? [symbol.role, symbol.number] : null,
    label === null ? null : [label.side, label.tone, label.title, label.line, label.number],
  ];
  return `answer:${JSON.stringify(drawn)}`;
}

// The look's name: the key its picture is kept under. Two looks that draw the same picture have the same name.
export function lookName(look: MarkerLook): string {
  if (look.kind === 'me') {
    return look.small === true ? 'me:small' : 'me';
  }
  if (look.kind === 'tutorialPlace') {
    return 'tutorialPlace';
  }
  if (look.kind === 'answer') {
    return answerName(look.symbol, look.label);
  }
  const selected = look.selected === true && 'selected';
  if (look.kind === 'restaurant') {
    return parts('restaurant', selected);
  }
  if (look.kind === 'group') {
    return parts('group', look.kinds.join('+'), look.form, selected);
  }
  if (look.kind === 'study-cluster') {
    return parts('study-cluster', String(look.count), selected);
  }
  if (look.kind === 'person') {
    const photo = look.photo !== null && 'photo';
    const stale = look.stale === true && 'stale';
    return parts('person', look.small === true ? 'small' : 'full', look.tone, look.id, photo, stale, selected);
  }
  const count = look.form === 'pin' && (look.count ?? 0) > 0 && String(look.count);
  return parts(look.kind, look.form, count, look.muted === true && 'muted', selected);
}

export function hasPhoto(look: MarkerLook): boolean {
  return look.kind === 'person' && look.photo !== null;
}

// A pin and a person's marker stand on their tip, the bottom of their view. Everything else, a round thing, sits on
// its middle.
export function standsOnTip(look: MarkerLook): boolean {
  if (look.kind === 'me' || look.kind === 'study-cluster' || look.kind === 'answer') {
    return false;
  }
  return look.kind === 'person' || look.kind === 'restaurant' || look.kind === 'tutorialPlace' || look.form === 'pin';
}

// The point of a look's box that stands on its position, as shares of the box's width and height: the tip, the
// middle, or for an answer's look the centre of its symbol box. A box not laid out yet stands on its middle.
export function anchorShare(look: MarkerLook, { width, height }: Size): { x: number; y: number } {
  if (look.kind !== 'answer' || look.label === null) {
    return { x: 0.5, y: standsOnTip(look) ? 1 : 0.5 };
  }
  if (width <= 0 || height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const centre = ANSWER_SYMBOL_BOX / 2;
  const shares: Record<LabelSide, { x: number; y: number }> = {
    right: { x: centre / width, y: 0.5 },
    left: { x: 1 - centre / width, y: 0.5 },
    below: { x: 0.5, y: centre / height },
    above: { x: 0.5, y: 1 - centre / height },
  };
  return shares[look.label.side];
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
  if (look.kind === 'tutorialPlace') {
    return <MapTutorialPin />;
  }
  if (look.kind === 'answer') {
    return <MapAnswerMark label={look.label} symbol={look.symbol} />;
  }
  if (look.kind === 'group') {
    return look.form === 'dot' ? (
      <MapGroupDot kinds={look.kinds} selected={look.selected} />
    ) : (
      <MapGroupPin kinds={look.kinds} selected={look.selected} />
    );
  }
  if (look.kind === 'study-cluster') {
    return <MapStudyCluster count={look.count} selected={look.selected} />;
  }
  return look.form === 'dot' ? (
    <MapDot kind={look.kind} selected={look.selected} />
  ) : (
    <MapPin count={look.count} kind={look.kind} muted={look.muted} selected={look.selected} />
  );
}
