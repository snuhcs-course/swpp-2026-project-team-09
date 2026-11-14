/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import { type MapLine, NATIVE_MIN_LEVEL } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { type MapContents, useAnswerMap } from './use-answer-map';
import { pressOnMap } from './use-main-layers';
import type { MainMap } from './use-main-map';
import type { Me } from './use-me';
import type { Selection } from './use-selection';
import type { Things } from './use-things';
import { TUTORIAL_PIN_ID, type TutorialPin } from './tutorial/use-tutorial-pin';

function ignorePress(): void {
  // While the answer frame is shown, a marker opens no card.
}

// A press on the map: the tutorial place pin takes its own first; any other goes to the map's things, where merged
// study pins zoom in.
function pressWithPin(pin: TutorialPin, onThing: (id: string) => void): (id: string) => void {
  return (id) => {
    if (id === TUTORIAL_PIN_ID) {
      pin.press(id);
    } else {
      onThing(id);
    }
  };
}

export interface Everyday {
  things: Things;
  me: Me;
  pin: TutorialPin;
  lines: readonly MapLine[];
  cards: readonly CardView[];
  selection: Selection;
}

// What the map draws and what a press on it does. The everyday map: the things of the cards, the tutorial place pin
// over them, the User's own Avatar, and the lines. While a Plan of an answer is shown, the Plan is drawn in their
// place, and a press on a candidate shows its Plan.
export function useMapView(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  { things, me, pin, lines, cards, selection }: Everyday,
): { contents: MapContents; onPress: (id: string) => void; nativeMinLevel: number } {
  const answer = useAnswerMap(chat.answer, map, room, { avatars: things.avatars, cards });
  if (answer !== null) {
    return answer;
  }
  return {
    contents: { markers: [...things.markers, ...pin.markers], avatars: [...things.avatars, ...me.avatars], lines },
    onPress: chat.framed ? ignorePress : pressWithPin(pin, pressOnMap(cards, map, selection)),
    nativeMinLevel: NATIVE_MIN_LEVEL,
  };
}
