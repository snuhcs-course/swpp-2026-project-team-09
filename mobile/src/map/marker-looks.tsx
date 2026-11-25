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
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
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
  MapMarkBadge,
  MapPerson,
  MapPin,
  type MapPlaceKind,
  MapRestaurant,
  MapStudyCluster,
  MapTutorialPin,
  MapTutorialStep,
  type PersonTone,
  type TutorialStepShape,
} from '@/design-system';
import type { Size } from './projection';

// How something on the map looks. One picture is made for each look and kept under the look's name, so two things
// that look the same share one, and the number of pictures is the number of names:
// - two for the User's own Avatar;
// - for each person, the two sizes in each tone the person was seen in, with and without a photo, with the green dot
//   of a Friend seen at the exact level or dimmed while the person's position was old, and each of them selected,
//   which only the one selected person ever asks for, or with the "+" of a Friend who can be added to the answer on
//   screen;
// - for each kind of place, the dot and the pin, the pin once for each count it shows, and each of them selected;
//   an official pin also with a Favorite Event's star; from the "names" level, a 행사's, a 파티's and a 퀘스트's pin
//   once for each place, with its short name in its tag;
// - for each set of kinds that stand together at one place, the dot and the pin, and each of them selected; the pin
//   also with the star, and from the "names" level once for each place, with its name;
// - the same places and sets with the "!" of a mark newly posted or faded (`fresh`, `faded`);
// - one for the tutorial's place pin, and one for each shape, colour and number of a guide's places.
// No other look holds a name or a label: a person's name is the map's own text under the marker (`text` of
// `MapMarker`).
//
// A name holds nothing that changes from one answer of the server to the next: a person is named by their id and by
// whether they have a photo, never by the photo's address, which is new with every answer. So a person whose name or
// photo changes keeps the picture made first until the app starts again.
//
// What a release of unused pictures (ticket 07) has to cover, since no picture is released while the app runs: the
// looks of a person who is no longer on the map or no longer a Friend, a person's looks in the tones and at the
// levels they are no longer in, the selected looks once nothing is selected, a pin's looks for the counts it no
// longer shows, and a person's pictures when their name or their photo changed, which are then made again.

// A dot is the look from far away, a pin the look from close.
export type MarkerForm = 'dot' | 'pin';

// An interest mark's: `fresh` carries "!", something newly posted for the User; `faded` is drawn faint, shown for want
// of anything the User watches.
interface InterestLook {
  fresh?: boolean;
  faded?: boolean;
}

export type MarkerLook =
  // The User's own Avatar. `small` is its look while the whole campus is in view: three quarters of its size.
  | { kind: 'me'; small?: boolean }
  // A person: a Friend in the status's colour, or a member of the User's Party in the tone `member`. The frames'
  // teardrop with the person's letters or photo in it. `small` is its look while the whole campus is in view.
  // `id` is the person's own, which names the look; `name` and `photo` are what is drawn. `stale` is dimmed: the
  // position is old. `addable` carries a "+": a press adds the Friend to the answer on screen. `exact` carries a green
  // dot: a Friend seen at the exact level. `faded` is faint: an answer is up that the person is not in.
  | {
      kind: 'person';
      id: string;
      tone: PersonTone;
      small?: boolean;
      selected?: boolean;
      stale?: boolean;
      faded?: boolean;
      addable?: boolean;
      exact?: boolean;
      name: string;
      photo: string | null;
    }
  // A place, of each kind the design system has. `count` is drawn on a pin, never on a dot; 0 or left out, none.
  // `muted` is translucent grey: a study building none of whose spaces the User may use. `starred` draws a pin's
  // icon as the filled star: a Favorite Event, or official events at one place of which one is. `label` is a 행사's,
  // a 파티's or a 퀘스트's short name in its tag. `fresh` and `faded` are an interest mark's (`InterestLook`).
  | ({
      kind: MapPlaceKind;
      form: MarkerForm;
      count?: number;
      selected?: boolean;
      muted?: boolean;
      starred?: boolean;
      label?: string;
    } & InterestLook)
  // Study pins merged while the whole campus is in view, with how many they are.
  | { kind: 'study-cluster'; count: number; selected?: boolean }
  // The Place of restaurants with menus today, at every level of detail.
  | { kind: 'restaurant'; selected?: boolean }
  // Things of several kinds at one place: a small round for each kind, in the order given. `starred` draws the
  // official round's star on a pin: a Favorite Event is among them. `label` is the place's short name in its tag.
  | ({
      kind: 'group';
      kinds: readonly MapPlaceKind[];
      form: MarkerForm;
      selected?: boolean;
      starred?: boolean;
      label?: string;
    } & InterestLook)
  // The place 지도에서 보기 of a tutorial quest shows: a red teardrop with a white circle, at every level of detail.
  | { kind: 'tutorialPlace' }
  // A place of a tutorial quest's guide, in its category's colour `ink`, with its step's number or sign.
  | { kind: 'tutorialStep'; shape: TutorialStepShape; ink: string; words?: string; later?: boolean }
  // A mark of an answer: its symbol and its label, words included, in one picture.
  | { kind: 'answer'; symbol: AnswerSymbol | null; label: AnswerLabel | null };

function parts(...names: (string | false)[]): string {
  return names.filter((name) => name !== false).join(':');
}

// Words may hold the separator of `parts`, so an answer's look is named by a list of what it draws, in a fixed order.
// Every field that changes the picture is part of the name, so that a look never takes another's kept picture.
function answerName(symbol: AnswerSymbol | null, label: AnswerLabel | null): string {
  const drawn = [
    symbol?.type ?? null,
    symbol?.type === 'face'
      ? [
          symbol.name,
          symbol.dashed,
          ...(symbol.badge === undefined ? [] : [symbol.badge]),
          ...(symbol.exact === true ? ['exact'] : []),
        ]
      : null,
    symbol?.type === 'dot'
      ? [
          symbol.role,
          symbol.number,
          ...(symbol.faded === true ? ['faded'] : []),
          ...(symbol.ring === undefined ? [] : [{ ring: symbol.ring }]),
          ...(symbol.pop === true ? ['pop'] : []),
        ]
      : null,
    label === null
      ? null
      : [
          label.side,
          label.tone,
          label.title,
          label.line,
          label.number,
          ...(label.shift === undefined ? [] : [label.shift]),
          ...(label.sub === undefined || label.sub === null ? [] : [{ sub: label.sub }]),
          ...(label.note === undefined || label.note === null ? [] : [{ note: label.note }]),
          ...(label.action === undefined || label.action === null ? [] : [{ action: label.action }]),
          ...(label.faded === true ? ['faded'] : []),
        ],
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
  if (look.kind === 'tutorialStep') {
    return `tutorialStep:${JSON.stringify([look.shape, look.ink, look.words ?? '', look.later === true])}`;
  }
  if (look.kind === 'answer') {
    return answerName(look.symbol, look.label);
  }
  const selected = look.selected === true && 'selected';
  if (look.kind === 'restaurant') {
    return parts('restaurant', selected);
  }
  if (look.kind === 'group') {
    return parts(
      'group',
      look.kinds.join('+'),
      look.form,
      look.starred === true && 'starred',
      selected,
      ...interestParts(look),
      labelPart(look.label),
    );
  }
  if (look.kind === 'study-cluster') {
    return parts('study-cluster', String(look.count), selected);
  }
  if (look.kind === 'person') {
    const photo = look.photo !== null && 'photo';
    const exact = look.exact === true && 'exact';
    const stale = look.stale === true && 'stale';
    const faded = look.faded === true && 'faded';
    const addable = look.addable === true && 'addable';
    const size = look.small === true ? 'small' : 'full';
    return parts('person', size, look.tone, look.id, photo, exact, stale, faded, selected, addable);
  }
  return placeName(look, selected);
}

// The name of a single place's look.
function placeName(look: Extract<MarkerLook, { kind: MapPlaceKind }>, selected: string | false): string {
  const count = look.form === 'pin' && (look.count ?? 0) > 0 && String(look.count);
  return parts(
    look.kind,
    look.form,
    count,
    look.muted === true && 'muted',
    look.starred === true && 'starred',
    selected,
    ...interestParts(look),
    labelPart(look.label),
  );
}

// A tag's words, last and quoted, since they may hold the separator of `parts`.
function labelPart(label: string | undefined): string | false {
  return label !== undefined && `label=${JSON.stringify(label)}`;
}

// Named only when set, so that every name without a mark stays as it was.
function interestParts({ fresh, faded }: InterestLook): (string | false)[] {
  return [fresh === true && 'fresh', faded === true && 'faded'];
}

// A mark's "!" and fade around a place's or a group's view, which grows to hold the "!": below too for a look that sits
// on its middle, so that its middle stays the box's.
function withInterest(look: Extract<MarkerLook, { form: MarkerForm }>, view: ReactElement): ReactElement {
  if (look.fresh !== true && look.faded !== true) {
    return view;
  }
  return (
    <MapMarkBadge faded={look.faded} form={standsOnTip(look) ? 'pin' : 'dot'} fresh={look.fresh}>
      {view}
    </MapMarkBadge>
  );
}

export function hasPhoto(look: MarkerLook): boolean {
  return look.kind === 'person' && look.photo !== null;
}

// The pins with a tail stand on their tip, the bottom of their view: a person's marker, a restaurant's, the tutorial's
// place, and a 공부공간's and the shuttle's pin. Everything else sits on its middle: a round thing, and the tags of a
// 행사, a 파티, a 퀘스트 and a group.
export function standsOnTip(look: MarkerLook): boolean {
  if (look.kind === 'person' || look.kind === 'restaurant' || look.kind === 'tutorialPlace') {
    return true;
  }
  return (look.kind === 'library' || look.kind === 'shuttle') && look.form === 'pin';
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

interface LookViewProps {
  look: MarkerLook;
  onPhotoSettled?: () => void;
  // Names the parts of a person's look and of an answer's.
  testID?: string;
}

// The design system's view of a look.
function PlainLookView({ look, onPhotoSettled, testID }: LookViewProps): ReactElement {
  if (look.kind === 'me') {
    return <MapPin kind="me" small={look.small} />;
  }
  if (look.kind === 'person') {
    return (
      <MapPerson
        addable={look.addable}
        exact={look.exact}
        name={look.name}
        onPhotoSettled={onPhotoSettled}
        selected={look.selected}
        small={look.small}
        source={look.photo === null ? undefined : { uri: look.photo }}
        faded={look.faded}
        stale={look.stale}
        testID={testID}
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
  if (look.kind === 'tutorialStep') {
    return <MapTutorialStep ink={look.ink} later={look.later} shape={look.shape} words={look.words} />;
  }
  if (look.kind === 'answer') {
    return <MapAnswerMark label={look.label} symbol={look.symbol} testID={testID} />;
  }
  if (look.kind === 'group') {
    return look.form === 'dot' ? (
      <MapGroupDot kinds={look.kinds} selected={look.selected} />
    ) : (
      <MapGroupPin kinds={look.kinds} label={look.label} selected={look.selected} starred={look.starred} />
    );
  }
  if (look.kind === 'study-cluster') {
    return <MapStudyCluster count={look.count} selected={look.selected} />;
  }
  return look.form === 'dot' ? <MapDot kind={look.kind} selected={look.selected} /> : <PlacePin look={look} />;
}

// A place's pin, whose icon is the filled star for a Favorite Event.
function PlacePin({ look }: { look: Extract<MarkerLook, { kind: MapPlaceKind }> }): ReactElement {
  const { count, kind, label, muted, selected, starred } = look;
  const star = starred === true;
  return (
    <MapPin
      count={count}
      filled={star}
      icon={star ? 'star' : undefined}
      kind={kind}
      label={label}
      muted={muted}
      selected={selected}
    />
  );
}

// The design system's view of a look, with an interest mark's "!" or fade around a place's or a group's.
export function LookView(props: LookViewProps): ReactElement {
  const { look } = props;
  return 'form' in look ? withInterest(look, <PlainLookView {...props} />) : <PlainLookView {...props} />;
}
