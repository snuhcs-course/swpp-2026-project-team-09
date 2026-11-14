/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import { type MapAvatar, type MapLine, NATIVE_MIN_LEVEL } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { type AnswerMap, ignorePress, useAnswerMap, useInvitationMap } from './use-answer-map';
import { pressOnMap } from './use-main-layers';
import type { MainMap } from './use-main-map';
import type { Me } from './use-me';
import type { ReceivedInvitation } from './use-received-invitation';
import type { Selection } from './use-selection';
import { useThings } from './use-things';
import { TUTORIAL_PIN_ID, type TutorialPin } from './tutorial/use-tutorial-pin';

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

// The everyday map's Avatars but those of people, Friends and the other people of the User's Party: under a received
// invitation's card nobody else is drawn, also when its way has nothing to draw.
function withoutPeople(avatars: readonly MapAvatar[], cards: readonly CardView[]): MapAvatar[] {
  const people = new Set(cards.flatMap(({ id, mark }) => (mark.type === 'person' ? [id] : [])));
  return avatars.filter(({ id }) => !people.has(id));
}

export interface Everyday {
  me: Me;
  pin: TutorialPin;
  lines: readonly MapLine[];
  cards: readonly CardView[];
  selection: Selection;
}

// What the map draws and what a press on it does. The everyday map: the things of the cards, the selected one drawn
// selected, the tutorial place pin over them, the User's own Avatar, and the lines. While a Plan of an answer is
// shown, the Plan is drawn in their place, and a press on a candidate shows its Plan; while a received invitation's
// card is, its own way is.
export function useMapView(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  { me, pin, lines, cards, selection }: Everyday,
  invitation: ReceivedInvitation,
): AnswerMap {
  const things = useThings(cards, map.detail, selection.selected?.id ?? null);
  const answer = useAnswerMap(chat.answer, map, room, { avatars: things.avatars, cards }, chat.invitation);
  const way = useInvitationMap(invitation.shown ? invitation.scene : null, map, room);
  if (answer !== null) {
    return answer;
  }
  if (way !== null) {
    return way;
  }
  const avatars = invitation.shown ? withoutPeople(things.avatars, cards) : things.avatars;
  return {
    contents: { markers: [...things.markers, ...pin.markers], avatars: [...avatars, ...me.avatars], lines },
    onPress: chat.framed || invitation.shown ? ignorePress : pressWithPin(pin, pressOnMap(cards, map, selection)),
    nativeMinLevel: NATIVE_MIN_LEVEL,
  };
}
