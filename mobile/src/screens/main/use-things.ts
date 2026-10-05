import type { CardView } from '@/features/map/adapter';
import { type MapAvatar, type MapMarker, type MarkerLook, useMarkerImages, type ZoomDetail } from '@/map';
import { POSITION_EVERY_MS } from '@/position';

// What `<Map>` shows of the cards: the people as Avatars, which glide, and the places as markers. Each has its
// card's id, so a press on it gives the id of the card to open.
export interface Things {
  markers: readonly MapMarker[];
  avatars: readonly MapAvatar[];
}

// Above the others of its list. The User's own Avatar is 1, so a selected person is above it too, as in the frames.
const SELECTED_ORDER = 2;

const DETAILS: readonly ZoomDetail[] = ['overview', 'pins', 'names'];

// A card's look at a level of detail. A person is the frames' teardrop at every level, small while the whole campus
// is in view. A place is a dot there, and a pin with its count closer.
function lookOf({ mark, marker }: CardView, detail: ZoomDetail, selected: boolean): MarkerLook {
  const far = detail === 'overview';
  if (mark.type === 'person') {
    const { name, photo, presence } = mark;
    return { kind: 'person', tone: presence ?? 'member', small: far, selected, name, photo };
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

// Turns the cards into what the map shows at a level of detail. From the "names" level each has its short name
// under it, in the map's own text. The selected one is drawn selected and above the others.
export function useThings(cards: readonly CardView[], detail: ZoomDetail, selectedId: string | null): Things {
  const shown = cards.map((card) => lookOf(card, detail, card.id === selectedId));
  const images = useMarkerImages([...shown, ...everyLook(cards)]);
  const markers: MapMarker[] = [];
  const avatars: MapAvatar[] = [];
  for (const [index, card] of cards.entries()) {
    const image = images[index];
    if (image !== undefined) {
      const thing: MapMarker = {
        id: card.id,
        name: card.marker.name,
        position: card.position,
        image,
        text: detail === 'names' ? card.marker.short : undefined,
        order: card.id === selectedId ? SELECTED_ORDER : 0,
      };
      if (card.mark.type === 'person') {
        avatars.push({ ...thing, glideMs: POSITION_EVERY_MS });
      } else {
        markers.push(thing);
      }
    }
  }
  return { markers, avatars };
}
