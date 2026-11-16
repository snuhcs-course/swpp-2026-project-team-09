/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { awayPlaceOf } from '@/features/assistant/study-area';
import { useAskingShown } from '@/features/assistant/use-how-about';
import type { CardView } from '@/features/map/adapter';
import { useMarkPresses } from '@/features/map/use-interest-marks';
import type { MapAvatar, MapLine } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { useAwaySeats } from './library/use-away-seats';
import { type AnswerMap, ignorePress, useAnswerMap, useEverydayLimits, useInvitationMap } from './use-answer-map';
import { useLookupMap } from './use-lookup-map';
import { pressOnMap } from './use-main-layers';
import type { MainMap } from './use-main-map';
import type { MadeQuestCard } from './use-made-quest-card';
import { type Me, pressableMe } from './use-me';
import type { ReceivedInvitation } from './use-received-invitation';
import { bothTouches, type MapTouches, type PressedPlace, usePressedPlace } from './use-pressed-place';
import type { Selection } from './use-selection';
import { useThings } from './use-things';
import { useViewport } from './use-viewport';
import { TUTORIAL_PIN_ID, type TutorialPin } from './tutorial/use-tutorial-pin';

// A press on the map, which keeps a tap on the ground from being a press on a building: the tutorial place pin takes
// its own first; any other goes to the map's things, where merged study pins zoom in.
function pressWithPin(pin: TutorialPin, onThing: (id: string) => void, keep: () => void): (id: string) => void {
  return (id) => {
    keep();
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

// What the map draws, what a press on it does, and what watches the touches around it.
export type MapView = AnswerMap & { around: MapTouches };

// A meal's Plan on screen whose buildings take a press ("여기면 어때?", P02 ticket 26): a press on a mark keeps its tap
// from asking about a building and, while a building is asked about, does nothing else; the pressed building is
// marked as on the everyday map.
function withBuildingPress(answer: AnswerMap, pressed: PressedPlace, asked: boolean, around: MapTouches): MapView {
  return {
    ...answer,
    contents: { ...answer.contents, markers: [...answer.contents.markers, ...pressed.markers] },
    onPress: (id) => {
      pressed.keep();
      if (!asked) {
        answer.onPress(id);
      }
    },
    around,
  };
}

// What the map draws and what a press on it does. The everyday map: the things of the cards, the selected one drawn
// selected, the tutorial place pin over them, the User's own Avatar, which takes a press while the switch is on, and
// the lines. While the switch is on, a tap on a building opens its card and the Place is marked, and a press on an
// interest mark opens its answer instead of a card. While a Plan of an answer is shown, the Plan is drawn in their
// place, and a press on a candidate shows its Plan; while a received invitation's card is, its own way is; while a made
// Quest's card is, its Places and the User are. A Lookup on screen is drawn as a Plan is, and takes no press
// (`useLookupMap`). Once any of them closes, a camera left further out than the everyday map allows glides back in.
// While a meal's Plan is on screen, a press on a building asks about it and the map draws that ("여기면 어때?"). Every
// request carries the map's visible area at rest (`useViewport`).
export function useMapView(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  { me, pin, lines, cards, selection }: Everyday,
  { invitation, made }: UnaskedCards,
): MapView {
  const marks = useMarkPresses(chat.chat, me, cards);
  const things = useThings(cards, map.detail, selection.selected?.id ?? null, chat.onMap, marks.byId);
  useViewport(chat, map, room);
  const seats = useAwaySeats(awayPlaceOf(chat.lookup.lookup));
  const lookup = useLookupMap(chat.lookup, map, room, { avatars: things.avatars, cards }, me.avatars, seats);
  const { howAbout } = chat;
  const shown = useAskingShown(chat.answer, howAbout.point);
  const plan = useAnswerMap(shown, map, room, { avatars: things.avatars, cards }, chat.invitation);
  const answer = plan ?? lookup;
  const unasked = invitation.shown || made.shown !== null;
  const way = useInvitationMap(invitation.shown ? invitation.scene : made.scene, map, room);
  const limits = useEverydayLimits(map, answer !== null || way !== null);
  const everyday = answer === null && way === null && !chat.framed && !unasked;
  const asking = chat.onMap && howAbout.pressable && plan !== null && !unasked;
  const target = asking ? howAbout.target : selection;
  const pressed = usePressedPlace(map.camera, target, chat.setTapped, chat.onMap && (everyday || asking));
  const around = bothTouches(pin.touches, pressed);
  if (answer !== null) {
    return asking ? withBuildingPress(answer, pressed, howAbout.place !== null, around) : { ...answer, around };
  }
  if (way !== null) {
    return { ...way, around };
  }
  const avatars = unasked ? withoutPeople(things.avatars, cards) : things.avatars;
  const mine = chat.onMap ? pressableMe(me.avatars) : me.avatars;
  const markers = [...things.markers, ...pressed.markers, ...pin.markers];
  return {
    contents: { markers, avatars: [...avatars, ...mine], lines },
    onPress:
      chat.framed || unasked
        ? ignorePress
        : pressWithPin(pin, marks.pressing(pressOnMap(cards, map, selection)), pressed.keep),
    around,
    ...limits,
  };
}
