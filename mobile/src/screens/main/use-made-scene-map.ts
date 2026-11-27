/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useMemo } from 'react';
import type { LibrarySpace, MapScene, ReplyStep } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOfScene, type SceneSetting } from '@/features/assistant/answer-marks';
import { BOOKING_SETTING, bookingScene, studyLine, studySetting } from '@/features/assistant/booking-scene';
import { cardDrafts, cardNumberOf, type ShownCards } from '@/features/assistant/cards-scene';
import { meAndWalk, proposalScene, proposalSetting } from '@/features/assistant/proposal-scene';
import {
  type ShownSteps,
  stepDrafts,
  stepLine,
  stepNumberOf,
  stepsScene,
  stepTitle,
} from '@/features/assistant/steps-scene';
import type { MapAvatar, MapMarker, MarkerLook } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { useFadedFaces } from './use-answer-faces';
import { bookingKept } from './library/booking-kept';
import {
  ANSWER_LIMITS,
  type AnswerMap,
  type EverydayAvatars,
  othersOf,
  useBase,
  useDrawnMap,
  useFraming,
} from './use-answer-map';
import type { MainMap } from './use-main-map';

const NO_LOOKS: readonly MarkerLook[] = [];
const NO_AVATARS: readonly MapAvatar[] = [];
export const MADE_FLAG_ID = 'answer:pick';

// The positions of the everyday map's Friends, by user id.
function friendPositions({ avatars, cards }: EverydayAvatars): Map<string, LatLng> {
  const positions = new Map<string, LatLng>();
  for (const { id, mark } of cards) {
    const avatar = mark.type === 'person' ? avatars.find((one) => one.id === id) : undefined;
    if (avatar !== undefined && mark.type === 'person') {
      positions.set(mark.id, avatar.position);
    }
  }
  return positions;
}

type Me = { position: LatLng | null; avatars: readonly MapAvatar[] };

// A scene the app made, with its setting, and the point of its flag, which a press opens the card of.
interface Made {
  // The reply drawn, which the camera follows.
  source: object;
  scene: MapScene;
  setting: SceneSetting;
  flag: LatLng;
}

function isPick(id: string): boolean {
  return id.startsWith(MADE_FLAG_ID) || stepNumberOf(id) !== null || cardNumberOf(id) !== null;
}

// The flag's mark carries its words in its id, so that a change of its words (a time dragged on the bar) is a new mark
// the map draws at once: a mark that keeps its id keeps its old picture until the new one is made (P01 ticket 03, as
// PR 491 found for a meal's legs).
function withWordsInId(markers: readonly MapMarker[]): MapMarker[] {
  return markers.map((marker) =>
    marker.id === MADE_FLAG_ID ? { ...marker, id: `${MADE_FLAG_ID}:${marker.name}` } : marker,
  );
}

// A scene the app made drawn on the map as a Plan is: its flag, which opens its card with `onFlag`, the User's walk,
// and the faces it draws. The everyday Avatars of other people stay, faint as behind a Plan (`useFadedFaces`), and the
// User's own when the User has no position.
function useSceneMap(
  made: Made | null,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  me: Me,
  onFlag: (id: string, position: LatLng) => void,
): AnswerMap | null {
  const draw = useMemo(
    () =>
      made === null ? null : (view: LabelView | null): AnswerDrawing => drawingOfScene(made.scene, view, made.setting),
    [made],
  );
  const framing = useFraming(map, room, true);
  const base = useBase(draw);
  const others = base === null ? NO_AVATARS : othersOf(everyday.avatars, everyday.cards, base);
  const faces = useFadedFaces(others);
  const drawn = useDrawnMap(draw, base, made?.source ?? null, NO_LOOKS, map, framing, made?.scene.routes, isPick);
  if (drawn === null || made === null) {
    return null;
  }
  const markers = withWordsInId(drawn.markers);
  const { lines } = drawn;
  const avatars = me.position === null ? [...faces, ...me.avatars] : faces;
  const onPress = (id: string): void => {
    if (isPick(id)) {
      onFlag(id, markers.find((marker) => marker.id === id)?.position ?? made.flag);
    }
  };
  return { contents: { markers, lines, avatars }, onPress, ...ANSWER_LIMITS };
}

// Whether a step is the booking whose card is on screen, by the card the step shows: a refused booking beside it keeps
// its own title (PR 462's review).
function isCardStep(step: ReplyStep, key: string | null): boolean {
  return key !== null && step.shows?.kind === 'card' && step.shows.key === key;
}

// Several requests as numbered flags (P04 ticket 09): the step due, or pressed, carries the seat its card offers; a
// booking made carries its seat and "예약됨" whichever step is shown (P10 ticket 29).
function stepsMade(
  { steps }: ShownSteps,
  active: number,
  booking: { key: string | null; seat: string | null; space: LibrarySpace | null; booked: boolean },
  position: LatLng | null,
): Made | null {
  const { key, seat, space, booked } = booking;
  const first = steps.find(({ place }) => place !== null)?.place;
  if (first === undefined || first === null) {
    return null;
  }
  const at = now();
  const lines = steps.map((step, index) => {
    const card = isCardStep(step, key);
    return stepLine(step, card && (booked || index === active) ? seat : null, at, card && booked);
  });
  const titles = steps.map((step) => stepTitle(step, isCardStep(step, key) ? space : null));
  // The step shown opens a card only when it is the booking on screen; another step's flag makes it the step shown.
  const opens = steps.map((step, index) => index !== active || isCardStep(step, key));
  const setting = { ...BOOKING_SETTING, drafts: stepDrafts(steps, lines, titles, opens) };
  return {
    source: steps,
    scene: stepsScene(steps, position),
    setting,
    flag: { latitude: first.latitude, longitude: first.longitude },
  };
}

// Restaurant or event cards as flags (P04 ticket 08): the User's walk to the first.
function cardsMade(shown: ShownCards, position: LatLng | null): Made | null {
  const [first] = shown.cards;
  if (first === undefined) {
    return null;
  }
  const { mine, walk } = meAndWalk(position, first.position);
  const scene = { people: mine, places: [], routes: walk, flags: [] };
  return { source: shown, scene, setting: { ...BOOKING_SETTING, drafts: cardDrafts(shown) }, flag: first.position };
}

// The scene of several requests (ticket 09), of the Proposal on screen (P04 ticket 06), or of the seat card's booking (ticket 07) with the room, the
// seat, and the time the card holds now.
function useMade(chat: ChatSheetControl, everyday: EverydayAvatars, position: LatLng | null): Made | null {
  const friends = useMemo(() => friendPositions(everyday), [everyday]);
  const { proposal, booking, bookingStage, chat: said, steps, activeStep, cards } = chat;
  const told = bookingStage.seen?.place === booking?.place ? bookingStage.seen : null;
  const seat = told?.seat ?? null;
  const kept = booking === null ? null : bookingKept(booking, said);
  const done =
    booking?.booked === true ? said.bubbles.findLast((bubble) => bubble.done !== undefined)?.done : undefined;
  // The pick's second line (P01 ticket 10): what is known of the seat and the free seats, or the seat booked. The walk
  // there carries its own minutes on its line, as a meal Plan's way there, and the label none.
  const line =
    kept === null
      ? null
      : done === undefined
        ? studyLine(seat ?? kept.kept.seat, told?.free ?? null, false)
        : studyLine(done.seatLabel ?? null, null, true);
  const space = kept?.kept.space ?? null;
  const start = kept?.kept.slot.start ?? null;
  return useMemo((): Made | null => {
    if (steps !== null) {
      const booked = done !== undefined;
      const stepSeat = booked ? (done.seatLabel ?? null) : seat;
      return stepsMade(steps, activeStep, { key: booking?.card.key ?? null, seat: stepSeat, space, booked }, position);
    }
    if (proposal !== null) {
      const { latitude, longitude } = proposal.place;
      const scene = proposalScene(proposal, position, friends);
      const setting = proposalSetting(proposal.proposal, now());
      return { source: proposal, scene, setting, flag: { latitude, longitude } };
    }
    if (cards !== null) {
      return cardsMade(cards, position);
    }
    if (booking === null || start === null || space === null) {
      return null;
    }
    const { latitude, longitude } = booking.point;
    const scene = bookingScene(booking.point, space, line, position);
    return { source: booking, scene, setting: studySetting(start), flag: { latitude, longitude } };
  }, [steps, activeStep, seat, done, proposal, cards, booking, line, space, start, position, friends]);
}

// What the map draws of a reply the app makes the scene of: a Proposal (P04 ticket 06) or a seat card (ticket 07).
// Null while neither is shown.
export function useMadeSceneMap(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  me: Me,
  onFlag: (id: string, position: LatLng) => void,
): AnswerMap | null {
  const made = useMade(chat, everyday, me.position);
  // The walk's minutes, which the seat card's sentence and its done message say (P01 ticket 06).
  const point = chat.booking?.point ?? null;
  const walk = point === null || me.position === null ? null : (meAndWalk(me.position, point).walk[0]?.minutes ?? null);
  const { tellWalk } = chat.bookingStage;
  useEffect(() => {
    tellWalk(walk);
  }, [walk, tellWalk]);
  // A press on another step's flag makes it the step shown; one on the step shown opens its card when it is a booking.
  // A booking alone takes a press as a meal's chosen place does: it raises the answer's card, and no card of its own
  // opens over the map (P01 ticket 10, the user's words).
  const onMark = (id: string, position: LatLng): void => {
    const number = stepNumberOf(id);
    const step = number === null ? undefined : chat.steps?.steps[number - 1];
    if (
      number === null &&
      chat.booking !== null &&
      chat.steps === null &&
      chat.proposal === null &&
      chat.cards === null
    ) {
      chat.card.raise(false);
    } else if (number === null || step === undefined) {
      onFlag(id, position);
    } else if (number - 1 !== chat.activeStep) {
      chat.setActiveStep(number - 1);
    } else if (isCardStep(step, chat.booking?.card.key ?? null)) {
      onFlag(id, position);
    }
  };
  return useSceneMap(made, map, room, everyday, me, onMark);
}
