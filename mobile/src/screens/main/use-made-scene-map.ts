/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { FrameKey } from './framed-camera';
import { useEffect, useMemo } from 'react';
import type { MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { Draft } from '@/features/assistant/answer-groups';
import { type AnswerDrawing, drawingOfScene, type SceneSetting } from '@/features/assistant/answer-marks';
import { BOOKING_SETTING, bookingScene, studyLine, studySetting } from '@/features/assistant/booking-scene';
import { cardDrafts, cardNumberOf, type ShownCards } from '@/features/assistant/cards-scene';
import { meAndWalk, proposalScene, proposalSetting } from '@/features/assistant/proposal-scene';
import { type ShownSteps, stepNumberOf } from '@/features/assistant/steps-scene';
import { lookupTakesTheMap } from '@/features/assistant/step-choice';
import type { MapAvatar, MapMarker, MarkerLook } from '@/map';
import type { ChatSheetControl } from './chat-sheet';
import type { Room } from './layout';
import { answerStepDrawn, isCardStep, stepPressOf } from './step-press';
import { type StepBooking, stepMarks, stepsAlone, stepsFrame } from './steps-made';
import { useFadedFaces } from './use-answer-faces';
import { bookingKept } from './library/booking-kept';
import {
  ANSWER_LIMITS,
  type AnswerMap,
  type Beside,
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
  // The reply drawn.
  source: object;
  // What the camera frames (`FrameKey`): the reply's scene, and what is chosen in it. The phone's position, the free
  // seats, and the time on the bar frame nothing.
  frame: FrameKey;
  scene: MapScene;
  setting: SceneSetting;
  flag: LatLng;
}

const NOTHING_MADE: FrameKey = { reply: null, chosen: [] };

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
  const frame = { key: made?.frame ?? NOTHING_MADE, from: made?.source ?? null };
  const drawn = useDrawnMap(draw, base, frame, NO_LOOKS, map, framing, made?.scene.routes, isPick);
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

// What the map draws of a reply the app made, and the steps' marks to stand beside an answer step drawn as its answer
// alone (`Beside`); null when there are none.
interface MadeNow {
  made: Made | null;
  beside: readonly Draft[] | null;
}

// Several requests (P04 ticket 09): the step shown drawn as its answer or booking alone, the other steps beside it as
// their kinds' marks (P03 ticket 26). An answer step with a Plan is the answer's own map's (`answerStepDrawn`); the
// booking on screen is its scene alone (`alone`); a step with no drawing of its own leaves the steps alone.
function stepsMade(
  shown: ShownSteps,
  active: number,
  booking: StepBooking,
  { answerDrawn, alone, position }: { answerDrawn: boolean; alone: Made | null; position: LatLng | null },
): MadeNow {
  const step = shown.steps[active];
  const frame = stepsFrame(shown, active);
  if (answerDrawn) {
    return { made: null, beside: stepMarks(shown, active, booking, active) };
  }
  if (alone !== null && step !== undefined && isCardStep(step, booking.key)) {
    const drafts = stepMarks(shown, active, booking, active);
    return { made: { ...alone, source: shown.steps, frame, setting: { ...alone.setting, drafts } }, beside: null };
  }
  const steps = stepsAlone(shown, active, booking, position);
  const setting = { ...BOOKING_SETTING, drafts: steps?.drafts ?? [] };
  return {
    made: steps === null ? null : { source: shown.steps, frame, scene: steps.scene, setting, flag: steps.flag },
    beside: null,
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
  const frame = { reply: `cards:${String(shown.bubbleId)}`, chosen: [] };
  return {
    source: shown,
    frame,
    scene,
    setting: { ...BOOKING_SETTING, drafts: cardDrafts(shown) },
    flag: first.position,
  };
}

// The booking on the map (ticket 07): its scene alone, with the room, the seat, and the time its card holds now, as a
// seat card alone draws it; and what a seat's step of several requests says of it. No scene with no booking.
function useBookingNow(chat: ChatSheetControl, position: LatLng | null): { alone: Made | null; step: StepBooking } {
  const { booking, bookingStage, chat: said } = chat;
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
  return useMemo(() => {
    const booked = done !== undefined;
    const step = { key: booking?.card.key ?? null, seat: booked ? (done.seatLabel ?? null) : seat, space, booked };
    if (booking === null || start === null || space === null) {
      return { alone: null, step };
    }
    const alone = {
      source: booking,
      frame: { reply: `booking:${booking.place}`, chosen: [] },
      scene: bookingScene(booking.point, space, line, position),
      setting: studySetting(start),
      flag: { latitude: booking.point.latitude, longitude: booking.point.longitude },
    };
    return { alone, step };
  }, [booking, done, seat, space, start, line, position]);
}

// The scene of several requests (ticket 09), of the Proposal on screen (P04 ticket 06), or of the seat card's booking
// (ticket 07), and the steps' marks beside an answer step shown as its answer alone (P03 ticket 26).
function useMade(chat: ChatSheetControl, everyday: EverydayAvatars, position: LatLng | null): MadeNow {
  const friends = useMemo(() => friendPositions(everyday), [everyday]);
  const { proposal, chat: said, steps, activeStep, cards } = chat;
  const { alone, step } = useBookingNow(chat, position);
  // A Lookup the steps' reply gave takes the map for its turn (P03 ticket 23, rule 7).
  const lookupTurn = lookupTakesTheMap(said.bubbles.find(({ id }) => id === steps?.bubbleId));
  const answerDrawn = answerStepDrawn(chat);
  return useMemo((): MadeNow => {
    if (steps !== null && !lookupTurn) {
      return stepsMade(steps, activeStep, step, { answerDrawn, alone, position });
    }
    if (proposal !== null) {
      const { latitude, longitude } = proposal.place;
      const scene = proposalScene(proposal, position, friends);
      const setting = proposalSetting(proposal.proposal, now());
      const frame = { reply: `proposal:${String(proposal.bubbleId)}`, chosen: [] };
      return { made: { source: proposal, frame, scene, setting, flag: { latitude, longitude } }, beside: null };
    }
    return { made: cards === null ? alone : cardsMade(cards, position), beside: null };
  }, [steps, lookupTurn, answerDrawn, activeStep, step, alone, proposal, cards, position, friends]);
}

// What the map draws of a reply the app makes the scene of: a Proposal (P04 ticket 06), a seat card (ticket 07), or
// several requests, and the steps' marks to stand beside an answer step's own map (`Beside`, P03 ticket 26). Null
// while none is shown.
export function useMadeSceneMap(
  chat: ChatSheetControl,
  map: MainMap,
  room: Room,
  everyday: EverydayAvatars,
  me: Me,
  onFlag: (id: string, position: LatLng) => void,
): { map: AnswerMap | null; beside: Beside | null } {
  const { made, beside } = useMade(chat, everyday, me.position);
  // The walk's minutes, which the seat card's sentence and its done message say (P01 ticket 06).
  const point = chat.booking?.point ?? null;
  const walk = point === null || me.position === null ? null : (meAndWalk(me.position, point).walk[0]?.minutes ?? null);
  const { tellWalk } = chat.bookingStage;
  useEffect(() => {
    tellWalk(walk);
  }, [walk, tellWalk]);
  const onMark = markPress(chat, onFlag);
  const drawn = useSceneMap(made, map, room, everyday, me, onMark);
  return { map: drawn, beside: besideOf(beside, chat) };
}

// A press on a step's flag does what its "›" says (`stepPressOf`): another step's makes it the step shown; the step
// shown opens its card when it is the booking on screen with no drawing of its own. A booking alone, or as the step
// shown, takes a press as a meal's chosen place does: it raises the answer's card, and no card of its own opens over
// the map (P01 ticket 10, the user's words).
function markPress(
  chat: ChatSheetControl,
  onFlag: (id: string, position: LatLng) => void,
): (id: string, position: LatLng) => void {
  return (id, position) => {
    const number = stepNumberOf(id);
    const step = number === null ? undefined : chat.steps?.steps[number - 1];
    if (number === null && bookingAlone(chat)) {
      chat.card.raise(false);
    } else if (number === null || step === undefined) {
      onFlag(id, position);
    } else {
      const key = chat.booking?.card.key ?? null;
      const press = stepPressOf(step, number - 1, { active: chat.activeStep, key });
      if (press === 'choose') {
        chat.setActiveStep(number - 1);
      } else if (press === 'card') {
        onFlag(id, position);
      }
    }
  };
}

// The steps' marks beside an answer step's own map (`Beside`): a press on one makes it the step shown.
function besideOf(drafts: readonly Draft[] | null, chat: ChatSheetControl): Beside | null {
  if (drafts === null || chat.steps === null) {
    return null;
  }
  return {
    drafts,
    press: (id) => {
      const number = stepNumberOf(id);
      if (number !== null) {
        chat.setActiveStep(number - 1);
      }
    },
  };
}

// Whether the booking on screen is drawn as alone: the seat card the reply gave alone, or the booking step shown.
function bookingAlone({ booking, proposal, cards, steps, activeStep }: ChatSheetControl): boolean {
  if (booking === null || proposal !== null || cards !== null) {
    return false;
  }
  const step = steps?.steps[activeStep];
  return steps === null || (step !== undefined && isCardStep(step, booking.card.key));
}
