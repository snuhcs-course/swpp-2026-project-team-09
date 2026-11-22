/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { LibrarySpace, MapScene, ReplyStep } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';
import type { LabelView } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOfScene, type SceneSetting } from '@/features/assistant/answer-marks';
import { BOOKING_SETTING, bookingLine, bookingScene } from '@/features/assistant/booking-scene';
import { proposalScene, proposalSetting } from '@/features/assistant/proposal-scene';
import {
  type ShownSteps,
  stepDrafts,
  stepLine,
  stepNumberOf,
  stepsScene,
  stepTitle,
} from '@/features/assistant/steps-scene';
import type { MapAvatar, MarkerLook } from '@/map';
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
  return id === MADE_FLAG_ID || stepNumberOf(id) !== null;
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
  const { markers, lines } = drawn;
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

// Several requests as numbered flags (P04 ticket 09): the step due, or pressed, carries the seat its card offers.
function stepsMade(
  { steps }: ShownSteps,
  active: number,
  booking: { key: string | null; seat: string | null; space: LibrarySpace | null },
  position: LatLng | null,
): Made | null {
  const { key, seat, space } = booking;
  const first = steps.find(({ place }) => place !== null)?.place;
  if (first === undefined || first === null) {
    return null;
  }
  const at = now();
  const lines = steps.map((step, index) => stepLine(step, index === active && isCardStep(step, key) ? seat : null, at));
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

// The scene of several requests (ticket 09), of the Proposal on screen (P04 ticket 06), or of the seat card's booking (ticket 07) with the room, the
// seat, and the time the card holds now.
function useMade(chat: ChatSheetControl, everyday: EverydayAvatars, position: LatLng | null): Made | null {
  const friends = useMemo(() => friendPositions(everyday), [everyday]);
  const { proposal, booking, bookingStage, chat: said, steps, activeStep } = chat;
  const seat = bookingStage.seen?.place === booking?.place ? (bookingStage.seen?.seat ?? null) : null;
  const kept = booking === null ? null : bookingKept(booking, said);
  const line = kept === null ? null : bookingLine(seat ?? kept.kept.seat, kept.kept.slot, now());
  const space = kept?.kept.space ?? null;
  return useMemo((): Made | null => {
    if (steps !== null) {
      return stepsMade(steps, activeStep, { key: booking?.card.key ?? null, seat, space }, position);
    }
    if (proposal !== null) {
      const { latitude, longitude } = proposal.place;
      const scene = proposalScene(proposal, position, friends);
      const setting = proposalSetting(proposal.proposal, now());
      return { source: proposal, scene, setting, flag: { latitude, longitude } };
    }
    if (booking === null || line === null || space === null) {
      return null;
    }
    const { latitude, longitude } = booking.point;
    const scene = bookingScene(booking.point, space, line, position);
    return { source: booking, scene, setting: BOOKING_SETTING, flag: { latitude, longitude } };
  }, [steps, activeStep, seat, proposal, booking, line, space, position, friends]);
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
  // A press on another step's flag makes it the step shown; one on the step shown opens its card when it is a booking.
  const onMark = (id: string, position: LatLng): void => {
    const number = stepNumberOf(id);
    const step = number === null ? undefined : chat.steps?.steps[number - 1];
    if (number === null || step === undefined) {
      onFlag(id, position);
    } else if (number - 1 !== chat.activeStep) {
      chat.setActiveStep(number - 1);
    } else if (isCardStep(step, chat.booking?.card.key ?? null)) {
      onFlag(id, position);
    }
  };
  return useSceneMap(made, map, room, everyday, me, onMark);
}
