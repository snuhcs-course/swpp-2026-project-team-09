/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-07  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import { type MapAvatar, type MapMarker, type MarkerLook, useMarkerImages, type ZoomDetail } from '@/map';
import { POSITION_EVERY_MS } from '@/position';

// What `<Map>` shows of the cards: the people and the shuttle's vehicles as Avatars, which glide, and the places as
// markers. Each has its card's id, so a press on it gives the id of the card to open.
export interface Things {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
}

// Above the others of its list. The User's own Avatar is 1, so a selected person is above it too, as in the frames.
const SELECTED_ORDER = 2;

const DETAILS: readonly ZoomDetail[] = ['overview', 'pins', 'names'];

// A card's look at a level of detail. A person is the frames' teardrop at every level, small while the whole campus
// is in view, and dimmed while their position is old. A place is a dot there, and a pin with its count closer; a
// restaurant and the shuttle's stops and vehicles look the same at every level: a stop a dot and a vehicle a pin, so
// that a vehicle standing at its stop is seen.
function lookOf({ kind, mark, marker }: CardView, detail: ZoomDetail, selected: boolean): MarkerLook {
  const far = detail === 'overview';
  if (mark.type === 'person') {
    const { id, name, photo, presence, stale } = mark;
    return { kind: 'person', id, tone: presence ?? 'member', small: far, selected, stale, name, photo };
  }
  if (mark.place === 'dining') {
    return { kind: 'restaurant', selected };
  }
  if (mark.place === 'shuttle') {
    return { kind: 'shuttle', form: kind === 'shuttle-stop' ? 'dot' : 'pin', selected };
  }
  return far
    ? { kind: mark.place, form: 'dot', selected }
    : { kind: mark.place, form: 'pin', count: marker.count, selected };
}

// Every look the cards have at any level, unselected: asked for when the cards come, so that a change of level
// never hands a native map an image whose picture is still to be made. A selected look is made when it is asked.
function everyLook(cards: readonly CardView[]): MarkerLook[] {
  return cards.flatMap((card) => DETAILS.map((detail) => lookOf(card, detail, false)));
}

// The words under a person's Avatar from the "names" level of detail: the given name, and for an old position its
// age, "민준 · 3분 전". A place has none: words of places side by side overlap, and its card says what it is.
function wordsOf({ mark, marker }: CardView, detail: ZoomDetail): string | undefined {
  if (detail !== 'names' || mark.type !== 'person') {
    return undefined;
  }
  return marker.minutesOld === null ? marker.short : `${marker.short} · ${marker.minutesOld}분 전`;
}

// Turns the cards into what the map shows at a level of detail. From the "names" level a person has their given name
// under them, in the map's own text. The selected one is drawn selected and above the others. A Global Event within a
// point has no marker: the point's stands for it, and is selected while the event is.
export function useThings(cards: readonly CardView[], detail: ZoomDetail, selectedId: string | null): Things {
  const selectedWithin = cards.find(({ id }) => id === selectedId)?.within ?? selectedId;
  const isSelected = (card: CardView): boolean => card.id === selectedId || card.id === selectedWithin;
  const shown = cards.map((card) => lookOf(card, detail, isSelected(card)));
  const images = useMarkerImages([...shown, ...everyLook(cards)]);
  const markers: MapMarker[] = [];
  const avatars: MapAvatar[] = [];
  for (const [index, card] of cards.entries()) {
    const image = images[index];
    if (image !== undefined && card.within === undefined) {
      const thing: MapMarker = {
        id: card.id,
        name: card.marker.name,
        position: card.position,
        image,
        text: wordsOf(card, detail),
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
