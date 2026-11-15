/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import type { MapAvatar, MapLine } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { type AnswerMap, ignorePress, useAnswerMap, useEverydayLimits, useInvitationMap } from './use-answer-map';
import { pressOnMap } from './use-main-layers';
import type { MainMap } from './use-main-map';
import type { MadeQuestCard } from './use-made-quest-card';
import { type Me, pressableMe } from './use-me';
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

// The cards nobody asked for: a received invitation's, and a made Quest's card after inviting.
export interface UnaskedCards {
  invitation: ReceivedInvitation;
  made: MadeQuestCard;
}

// What the map draws and what a press on it does. The everyday map: the things of the cards, the selected one drawn
// selected, the tutorial place pin over them, the User's own Avatar, which takes a press while the switch is on, and
// the lines. While a Plan of an answer is shown, the Plan is drawn in their place, and a press on a candidate shows its
// Plan; while a received invitation's card is, its own way is; while a made Quest's card is, its Places and the User
// are. Once any of them closes, a camera left further out than the everyday map allows glides back in.
export function useMapView(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  { me, pin, lines, cards, selection }: Everyday,
  { invitation, made }: UnaskedCards,
): AnswerMap {
  const things = useThings(cards, map.detail, selection.selected?.id ?? null, chat.onMap);
  const answer = useAnswerMap(chat.answer, map, room, { avatars: things.avatars, cards }, chat.invitation);
  const unasked = invitation.shown || made.shown !== null;
  const way = useInvitationMap(invitation.shown ? invitation.scene : made.scene, map, room);
  const limits = useEverydayLimits(map, answer !== null || way !== null);
  if (answer !== null) {
    return answer;
  }
  if (way !== null) {
    return way;
  }
  const avatars = unasked ? withoutPeople(things.avatars, cards) : things.avatars;
  const mine = chat.onMap ? pressableMe(me.avatars) : me.avatars;
  return {
    contents: { markers: [...things.markers, ...pin.markers], avatars: [...avatars, ...mine], lines },
    onPress: chat.framed || unasked ? ignorePress : pressWithPin(pin, pressOnMap(cards, map, selection)),
    ...limits,
  };
}
