/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The conversation's control: the conversation with the Assistant, which the main screen holds, and what the answer
// frame and the map draw of it. The chat sheet this file is named after is gone; the answer frame is the only screen.

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import { placesQuery } from '@/api/queries';
import { now } from '@/clock';
import type { Place } from '@/api/types';
import { useToast } from '@/design-system';
import { type ShownBooking, shownBookingOf, studyBookingOf } from '@/features/assistant/booking-scene';
import { type ShownCards, shownCardsOf } from '@/features/assistant/cards-scene';
import { type ShownProposal, shownProposalOf } from '@/features/assistant/proposal-scene';
import type { StepsKept } from '@/features/assistant/conversation-answers';
import { mayChooseStep, stepShowsCard } from '@/features/assistant/step-choice';
import { liveStepsOf, type ShownSteps, shownStepsOf, type StepsNow } from '@/features/assistant/steps-scene';
import type { Viewport } from '@/features/assistant/study-area';
import type { PlanOutcomes } from '@/features/assistant/turn-outcome';
import type { CardOutcome, Chat, ChatBubble } from '@/features/assistant/use-chat';
import { useAskedAgain } from '@/features/assistant/use-asked-again';
import { type PlanInvitation, usePlanInvitation } from '@/features/assistant/use-plan-invitation';
import { type Picking, usePicking } from '@/features/assistant/use-picking';
import { type QuestLeaving, useQuestLeaving } from '@/features/assistant/use-quest-leaving';
import { type ShownAnswer, useShownAnswer } from '@/features/assistant/use-shown-answer';
import { type ShownLookup, type StartGuidance, useShownLookup } from '@/features/assistant/use-shown-lookup';
import { openPost } from '../party/post-card';
import { type CardRaise, useCardRaise } from './answer/card-raise';
import { type MarkOpening, useOpenedMark } from './answer/opened-mark';
import type { CardLeaving } from './chat-card-actions';
import { useContextChat, type Where } from './use-context-chat';
import { type StepAnswer, useStepAnswerOf, useStepsNow, useStepsOfReply } from './use-step-answer';
import { sceneBubblesOf, withdrawnAfter } from '@/features/assistant/scene-bubbles';
import type { LocationMissing } from '@/api/refusal-types';
import { type KeptConversation, useKeptConversation } from './use-kept-conversation';
import { type ActStage, useActStage } from './library/act-stage';
import { bookingKept } from './library/booking-kept';
import { type BookingStage, useBookingStage } from './library/booking-stage';
import { useMenuRaising } from './answer/meal-card';
import { usePlanOutcomes } from './use-plan-outcomes';
import { openProposalForm, useProposalMaking } from './use-proposal-making';

export interface ChatSheetControl extends Omit<KeptConversation, 'chat'>, MarkOpening {
  chat: Chat;
  // Where the answer frame's cards lead, and its map buttons.
  leaving: CardLeaving & { showLayer: (layer: MapLayer) => void };
  // The answer on screen and its Plan, which the map and the frame's card draw.
  answer: ShownAnswer;
  // The Quest "이대로 초대" made from the Plan on screen, and how each invited Friend stands.
  invitation: PlanInvitation;
  // The Lookup on screen, which the map and the frame's card draw.
  lookup: ShownLookup;
  // The Proposal of the turn on screen with a place to stand at, which the map draws as a flag (P04 ticket 06).
  proposal: ShownProposal | null;
  // The seat card of the turn on screen whose building is known, which the map draws as a flag and the time bar holds
  // the time of (P04 ticket 07), and what the card tells of its seat and main action.
  booking: ShownBooking | null;
  bookingStage: BookingStage;
  // What a booking's ticket offers beside the input: 가는 길, 반납하기, or 예약 취소 (P01 ticket 15).
  libraryAct: ActStage;
  // The requests of the turn on screen when it answered several, drawn as numbered flags, and the index of the one
  // whose detail and action are shown: the step due first until a press on another's flag (P04 ticket 09).
  steps: ShownSteps | null;
  // The restaurant or event cards of the turn on screen, drawn as flags whose cards hold the facts asked (P04 ticket 08).
  cards: ShownCards | null;
  activeStep: number;
  setActiveStep: (index: number) => void;
  // What became of each reply's Plan, for the list of questions.
  outcomes: PlanOutcomes;
  // A reply's 취소하기 or 나가기, which cancels a Quest asked by words (P04 ticket 24).
  leave: QuestLeaving;
  // A Place picked on the map, or a time on the wheel, that a reply asked for (P04 ticket 26).
  pick: Picking;
  // Why the Assistant is sent no position, which also keeps "길 안내" from starting: null while one is known.
  locationMissing: LocationMissing;
  // Whether the frame's card is raised, which a press on a Lookup's mark on the map does too.
  card: CardRaise;
  // What was pressed on the map and is open in its card, which every request carries from then on; null for nothing.
  setTapped: (tapped: Tapped | null) => void;
  // The map's visible area at rest, which every request carries as `viewport`; null before the map is ready.
  setViewport: (viewport: Viewport | null) => void;
}

function openEvent(globalEventId: string): void {
  router.navigate({ pathname: '/events', params: { focus: globalEventId } });
}

function ignoreMade(): void {
  // A Restaurant card says nothing of what its form made.
}

function openPartyForm(proposal: QuestProposal): void {
  openProposalForm(proposal, ignoreMade);
}

// A map button of the answer frame: leaves the frame and turns its layer on.
function hidingFor(hide: () => void, turnOn: (layer: MapLayer) => void): (layer: MapLayer) => void {
  return (layer) => {
    hide();
    turnOn(layer);
  };
}

const NO_PLACES: readonly Place[] = [];

// The Proposal and the seat card of the turn on screen that the map draws, while the frame is shown.
function useShownOnMap(
  chat: Chat,
  framed: boolean,
): Pick<ChatSheetControl, 'proposal' | 'booking' | 'steps' | 'cards'> {
  const places = useQuery(placesQuery).data ?? NO_PLACES;
  const { bubbles, outcomes } = chat;
  return useMemo(
    () => ({
      proposal: framed ? shownProposalOf(bubbles, places) : null,
      booking: framed ? shownBookingOf(bubbles, places, (place) => outcomes.get(place) ?? null) : null,
      steps: framed ? shownStepsOf(bubbles) : null,
      cards: framed ? shownCardsOf(bubbles, places, now()) : null,
    }),
    [bubbles, places, outcomes, framed],
  );
}

// What the map draws of the turn on screen, the steps as their answers' keys now name them, and the answers the steps
// show (P03 ticket 21).
function useOnMap(
  chat: Chat,
  { bubbles, framed }: { bubbles: readonly ChatBubble[]; framed: boolean },
): ReturnType<typeof useStepsOfReply<ReturnType<typeof useShownOnMap>>> {
  const withdrawn = useMemo(() => withdrawnAfter(chat.bubbles, bubbles), [chat.bubbles, bubbles]);
  return useStepsOfReply(useShownOnMap({ ...chat, bubbles }, framed), bubbles, withdrawn);
}

// The steps as they stand now (P10 ticket 29): the answer's step at the Plan on screen, and the booking's at the time
// its card holds, over the reply's steps.
function useLiveSteps(
  { steps, booking }: Pick<ChatSheetControl, 'steps' | 'booking'>,
  shown: ShownAnswer,
  chat: Chat,
  { bubbles, answerOf }: { bubbles: readonly ChatBubble[]; answerOf: StepsNow['answerOf'] },
): ShownSteps | null {
  const reply = steps === null ? null : (bubbles.find(({ id }) => id === steps.bubbleId)?.answer ?? null);
  const slot = booking === null ? null : bookingKept(booking, chat).kept.slot;
  const key = booking?.card.key ?? null;
  const [date, start, minutes] = [slot?.date ?? null, slot?.start ?? null, slot?.minutes ?? null];
  const { answer, plan, index } = shown;
  return useMemo(() => {
    if (steps === null) {
      return null;
    }
    const card =
      key === null || date === null || start === null || minutes === null
        ? null
        : { key, slot: { date, start, minutes } };
    return liveStepsOf(steps, { reply, answer, plan, index, card, answerOf });
  }, [steps, reply, answer, plan, index, key, date, start, minutes, answerOf]);
}

// The steps as they stand, each drawn at its own answer when they name them by key (P03 ticket 21), kept in `stepsNow`
// for the next request, and the step chosen, which no press changes while Friends are being picked (rule 6).
function useStepsShown(
  onMap: Pick<ChatSheetControl, 'steps' | 'booking'>,
  {
    stepAnswer,
    shown,
    stepsNow,
  }: { stepAnswer: StepAnswer; shown: ShownAnswer; stepsNow: RefObject<StepsKept | null> },
  chat: Chat,
  bubbles: readonly ChatBubble[],
): Pick<ChatSheetControl, 'steps' | 'activeStep' | 'setActiveStep'> {
  const answerOf = useStepAnswerOf(stepAnswer, shown);
  const steps = useLiveSteps(onMap, shown, chat, { bubbles, answerOf });
  useStepsNow(stepsNow, stepAnswer, steps, bubbles[0]?.id ?? null);
  return {
    steps,
    activeStep: stepAnswer.activeStep,
    setActiveStep: (index) => {
      if (mayChooseStep(shown)) {
        stepAnswer.setActiveStep(index);
      }
    },
  };
}

const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

// The answer on screen, kept in `shownNow` for the context of the next request, and the Quest made from its Plan.
function useAnswerOnScreen(
  bubbles: readonly ChatBubble[],
  { position, locationMissing }: Where,
  shownNow: RefObject<ShownAnswer | null>,
  { leftOut, putBack }: Pick<Chat, 'leftOut' | 'putBack'>,
  step: StepAnswer,
): Pick<ChatSheetControl, 'answer' | 'invitation'> {
  const showToast = useToast();
  const recalculation = {
    location: position,
    locationMissing,
    onFailed: (): void => {
      showToast(NOT_RECALCULATED);
    },
    // The conversation's Classes left out, read when the recalculation is sent, and one put back (P01 ticket 40).
    skipped: leftOut,
    putBack,
  };
  const shown = useShownAnswer(bubbles, recalculation, step.chosen);
  const invitation = usePlanInvitation(shown, { location: position, locationMissing, say: showToast });
  useAskedAgain(shown, position, invitation);
  const { keep } = step;
  useEffect(() => {
    shownNow.current = shown;
    keep(shown);
  });
  return { answer: shown, invitation };
}

// The booking on the map: the seat card the reply gave alone, else a study answer's 관정관 opened (P10 ticket 27). None
// while the answer is hidden, as every part of the scene (`useShownOnMap`), though the opened place stays open.
function useStudyBooking(
  replied: ShownBooking | null,
  shown: ShownAnswer,
  { bubbles, framed }: { bubbles: readonly ChatBubble[]; framed: boolean },
  { outcomes }: Pick<Chat, 'outcomes'>,
): ShownBooking | null {
  const places = useQuery(placesQuery).data ?? NO_PLACES;
  const { plan, menuFor, source } = shown;
  return useMemo(() => {
    const outcomeOf = (place: string): CardOutcome | null => outcomes.get(place) ?? null;
    return framed ? (replied ?? studyBookingOf({ plan, menuFor, source }, bubbles, places, outcomeOf)) : null;
  }, [framed, replied, plan, menuFor, source, bubbles, places, outcomes]);
}

// What the seat card whose booking the map draws learns of it: its place, how it tells what it offers, whether it is
// one of several requests, its building, and the walk there (P04 ticket 07; P01 ticket 06).
function useBookingLeaving(
  onMap: Pick<ChatSheetControl, 'booking' | 'steps'>,
  { tell, walk }: BookingStage,
  active: number,
): NonNullable<CardLeaving['booking']> {
  const place = onMap.booking?.place ?? null;
  const alone = onMap.booking !== null && stepShowsCard(onMap.steps, active, onMap.booking.card.key);
  const point = onMap.booking?.point ?? null;
  return useMemo(() => ({ place, tell, alone, point, walk }), [place, tell, alone, point, walk]);
}

// The conversation, every request of which carries the context at `where` the User is, and what the answer frame
// draws of it. A card that leads elsewhere leaves the frame as it is: an event card opens the 행사 tab at the event, as
// the room's event does; a Quest card opens the post, as 찾기's card does; a Proposal, once made, shows 내 파티, as the
// party form does, and its 수정, like a Restaurant card's 파티 만들기, opens that form. A map button leaves the frame
// and turns its layer on with `turnOn`, the map's own layers. A Lookup's "길 안내" starts the route guidance with
// `start` and leaves the frame once it started. Leaving keeps the conversation (`useKeptConversation`).
export function useChatSheet(turnOn: (layer: MapLayer) => void, where: Where, start: StartGuidance): ChatSheetControl {
  const shownNow = useRef<ShownAnswer | null>(null);
  const { chat: said, stepsNow, ...pressing } = useContextChat(where, shownNow);
  const { chat, ...kept } = useKeptConversation(said);
  const proposals = useProposalMaking(said.proposalMade, { latest: kept.latest, bubbles: said.bubbles });
  // The map's scene reads the latest turn that draws one: a follow-up answered with words alone keeps the answer
  // before it on the map, its bar, marks, and main button, while the card says the new words (P04 ticket 46).
  const sceneBubbles = useMemo(() => sceneBubblesOf(chat.bubbles), [chat.bubbles]);
  const scene = { bubbles: sceneBubbles, framed: kept.framed };
  const { onMap, stepAnswer } = useOnMap(chat, scene);
  const bookingStage = useBookingStage();
  const libraryAct = useActStage();
  const card = useCardRaise(kept.framed);
  const onScreen = useAnswerOnScreen(sceneBubbles, where, shownNow, chat, stepAnswer);
  const shown = { ...onMap, booking: useStudyBooking(onMap.booking, onScreen.answer, scene, chat) };
  const booking = useBookingLeaving(shown, bookingStage, stepAnswer.activeStep);
  const outcomes = usePlanOutcomes(kept.said, onScreen.answer, onScreen.invitation, chat.earlier);
  const steps = useStepsShown(shown, { stepAnswer, shown: onScreen.answer, stepsNow }, chat, sceneBubbles);
  const pick = usePicking(chat);
  return {
    chat,
    ...kept,
    // ✕ and back end a Place's picking before they close the answer (P04 ticket 26).
    hide: pick.place === null ? kept.hide : pick.stop,
    outcomes,
    leaving: {
      showLayer: hidingFor(kept.hide, turnOn),
      openEvent,
      openQuestPost: openPost,
      openPartyForm,
      proposals,
      booking,
      act: libraryAct.tell,
    },
    ...onScreen,
    answer: useMenuRaising(onScreen.answer, card.setRaised, chat.bubbles),
    lookup: useShownLookup(sceneBubbles, start, kept.hide),
    ...shown,
    ...steps,
    bookingStage,
    libraryAct,
    leave: useQuestLeaving(),
    pick,
    locationMissing: where.locationMissing,
    card,
    ...useOpenedMark(chat.bubbles, kept.framed),
    ...pressing,
  };
}
