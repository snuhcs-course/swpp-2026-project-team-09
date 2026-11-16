/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-07  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import { withClusterMarks } from '@/features/map/event-merges';
import { type InterestMark, markedLook } from '@/features/map/interest-marks';
import { type MapAvatar, type MapMarker, type MarkerLook, useMarkerImages, type ZoomDetail } from '@/map';
import { POSITION_EVERY_MS } from '@/position';

// What `<Map>` shows of the cards: the people and the shuttle's vehicles as Avatars, which glide, and the places as
// markers. Each has its card's id, so a press on it gives the id of the card to open.
export interface Things {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
}

// Above the others of its list. The User's own Avatar is 1, so a selected person is above it too, as in the frames.
export const SELECTED_ORDER = 2;

const DETAILS: readonly ZoomDetail[] = ['overview', 'pins', 'names'];

// A card's look at a level of detail. A person is the frames' teardrop at every level, small while the whole campus
// is in view, dimmed while their position is old, and, while the switch of the answer on the map is on (`onMap`),
// with a green dot for a Friend seen at the exact level. A place is a dot there, and a pin with its count closer; a
// restaurant, a study building and the shuttle's stops and vehicles look the same at every level: a stop a dot and a
// vehicle a pin, so that a vehicle standing at its stop is seen, and stops at one place stay a dot. A study building
// none of whose spaces the User may use is grey, and study pins merged at the overview level are their cluster.
// Things of several kinds at one place are a group's dot or pin. A Favorite Event, and a place one of whose events is
// one, is a pin with the star at every level, so that the star is seen with the whole campus in view. Events' pins
// merged at the overview level are an official pin with how many they are, and the star when one is. A Quest made
// from a Plan is its flag at every level: the dot in the Quest colour with its two lines above it, as an answer draws
// its pick.
function lookOf(
  { kind, mark, marker, muted, flag }: CardView,
  detail: ZoomDetail,
  selected: boolean,
  onMap: boolean,
): MarkerLook {
  const far = detail === 'overview';
  if (kind === 'made-quest') {
    const { title, line } = flag ?? { title: marker.name, line: null };
    const label = { side: 'above', tone: 'pick', title, line, number: null } as const;
    return { kind: 'answer', symbol: { type: 'dot', role: 'pick', number: null }, label };
  }
  if (kind === 'study-cluster') {
    return { kind: 'study-cluster', count: marker.count, selected };
  }
  if (mark.type === 'person') {
    const { id, name, photo, presence, stale } = mark;
    const dot = onMap && mark.exact === true ? { exact: true } : {};
    return { kind: 'person', id, tone: presence ?? 'member', small: far, selected, stale, ...dot, name, photo };
  }
  const starred = mark.starred === true;
  if (mark.type === 'group') {
    return starred
      ? { kind: 'group', kinds: mark.kinds, form: 'pin', selected, starred }
      : { kind: 'group', kinds: mark.kinds, form: far ? 'dot' : 'pin', selected };
  }
  if (kind === 'event-cluster') {
    return { kind: mark.place, form: 'pin', count: marker.count, selected, ...(starred ? { starred } : {}) };
  }
  if (mark.place === 'dining') {
    return { kind: 'restaurant', selected };
  }
  if (mark.place === 'library') {
    return { kind: 'library', form: 'pin', selected, ...(muted === true ? { muted } : {}) };
  }
  if (mark.place === 'shuttle') {
    return { kind: 'shuttle', form: kind === 'shuttle-vehicle' ? 'pin' : 'dot', selected };
  }
  if (starred) {
    return { kind: mark.place, form: 'pin', count: marker.count, selected, starred };
  }
  return far
    ? { kind: mark.place, form: 'dot', selected }
    : { kind: mark.place, form: 'pin', count: marker.count, selected };
}

// Every look the cards have at any level, unselected: asked for when the cards come, so that a change of level
// never hands a native map an image whose picture is still to be made. A selected look is made when it is asked.
function everyLook(cards: readonly CardView[], onMap: boolean, marks: Marks): MarkerLook[] {
  return cards.flatMap((card) =>
    DETAILS.map((detail) => markedLook(lookOf(card, detail, false, onMap), marks.get(card.id))),
  );
}

type Marks = ReadonlyMap<string, InterestMark>;
const NO_MARKS: Marks = new Map();

// The words under a person's Avatar from the "names" level of detail: the given name, or the full name with
// `fullNames`, and for an old position its age, "민준 · 3분 전". A place has none: words of places side by side
// overlap, and its card says what it is.
function wordsOf({ mark, marker }: CardView, detail: ZoomDetail, fullNames: boolean): string | undefined {
  if (detail !== 'names' || mark.type !== 'person') {
    return undefined;
  }
  const name = fullNames ? mark.name : marker.short;
  return marker.minutesOld === null ? name : `${name} · ${marker.minutesOld}분 전`;
}

// Turns the cards into what the map shows at a level of detail. While the switch of the answer on the map is on
// (`onMap`), a person has their full name under them from the "names" level, in the map's own text, and a Friend seen
// at the exact level a green dot; else the given name and no dot. The selected one is drawn selected and above the
// others. A thing within a place has no marker: the place's stands for it, and is selected while the thing is, as a
// made Quest's flag for its Quest. A received invitation has none. A card that stands for an interest mark (`marks`,
// by card id, only while the switch is on) has the mark's name and its "!" or fade.
export function useThings(
  all: readonly CardView[],
  detail: ZoomDetail,
  selectedId: string | null,
  onMap: boolean,
  given: Marks = NO_MARKS,
): Things {
  const cards = all.filter(({ kind }) => kind !== 'invitation');
  const marks = withClusterMarks(cards, given);
  const selectedWithin = cards.find(({ id }) => id === selectedId)?.within ?? selectedId;
  const isSelected = (card: CardView): boolean => card.id === selectedId || card.id === selectedWithin;
  const shown = cards.map((card) => markedLook(lookOf(card, detail, isSelected(card), onMap), marks.get(card.id)));
  const images = useMarkerImages([...shown, ...everyLook(cards, onMap, marks)]);
  const markers: MapMarker[] = [];
  const avatars: MapAvatar[] = [];
  for (const [index, card] of cards.entries()) {
    const image = images[index];
    if (image !== undefined && card.within === undefined) {
      const thing: MapMarker = {
        id: card.id,
        name: marks.get(card.id)?.name ?? card.marker.name,
        position: card.position,
        image,
        text: wordsOf(card, detail, onMap),
        order: isSelected(card) ? SELECTED_ORDER : 0,
      };
      if (card.mark.type === 'person' || card.glideMs !== undefined) {
        avatars.push({ ...thing, glideMs: card.glideMs ?? POSITION_EVERY_MS });
      } else {
        markers.push(thing);
      }
    }
  }
  return { markers, avatars };
}
