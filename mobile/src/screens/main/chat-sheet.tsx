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
 ******************************************************************************/

// The conversation's control: the conversation with the Assistant, which the main screen holds, and what the answer
// frame and the map draw of it. The chat sheet this file is named after is gone; the answer frame is the only screen.

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import { placesQuery } from '@/api/queries';
import { now } from '@/clock';
import type { Place } from '@/api/types';
import { useToast } from '@/design-system';
import { type ShownBooking, shownBookingOf } from '@/features/assistant/booking-scene';
import { type ShownCards, shownCardsOf } from '@/features/assistant/cards-scene';
import { type ShownProposal, shownProposalOf } from '@/features/assistant/proposal-scene';
import { dueStepOf, type ShownSteps, shownStepsOf } from '@/features/assistant/steps-scene';
import type { Viewport } from '@/features/assistant/study-area';
import type { PlanOutcomes } from '@/features/assistant/turn-outcome';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';
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
import { sceneBubblesOf } from '@/features/assistant/scene-bubbles';
import type { LocationMissing } from '@/api/refusal-types';
import { type KeptConversation, useKeptConversation } from './use-kept-conversation';
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
// The step whose detail and action are shown: the one pressed on the map for this reply, else the one due first.
function useActiveStep(steps: ShownSteps | null): Pick<ChatSheetControl, 'activeStep' | 'setActiveStep'> {
  const [pressed, setPressed] = useState<{ bubbleId: number; index: number } | null>(null);
  const bubbleId = steps?.bubbleId ?? null;
  const due = steps === null ? 0 : dueStepOf(steps.steps, now());
  return {
    activeStep: pressed !== null && pressed.bubbleId === bubbleId ? pressed.index : due,
    setActiveStep: (index) => {
      if (bubbleId !== null) {
        setPressed({ bubbleId, index });
      }
    },
  };
}

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

const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

// The answer on screen, kept in `shownNow` for the context of the next request, and the Quest made from its Plan.
function useAnswerOnScreen(
  bubbles: readonly ChatBubble[],
  { position, locationMissing }: Where,
  shownNow: RefObject<ShownAnswer | null>,
): Pick<ChatSheetControl, 'answer' | 'invitation'> {
  const showToast = useToast();
  const recalculation = {
    location: position,
    locationMissing,
    onFailed: (): void => {
      showToast(NOT_RECALCULATED);
    },
  };
  const shown = useShownAnswer(bubbles, recalculation);
  const invitation = usePlanInvitation(shown, { location: position, locationMissing, say: showToast });
  useAskedAgain(shown, position, invitation);
  useEffect(() => {
    shownNow.current = shown;
  });
  return { answer: shown, invitation };
}

// The conversation, every request of which carries the context at `where` the User is, and what the answer frame
// draws of it. A card that leads elsewhere leaves the frame as it is: an event card opens the 행사 tab at the event, as
// the room's event does; a Quest card opens the post, as 찾기's card does; a Proposal, once made, shows 내 파티, as the
// party form does, and its 수정, like a Restaurant card's 파티 만들기, opens that form. A map button leaves the frame
// and turns its layer on with `turnOn`, the map's own layers. A Lookup's "길 안내" starts the route guidance with
// `start` and leaves the frame once it started. Leaving keeps the conversation (`useKeptConversation`).
export function useChatSheet(turnOn: (layer: MapLayer) => void, where: Where, start: StartGuidance): ChatSheetControl {
  const shownNow = useRef<ShownAnswer | null>(null);
  const { chat: said, ...pressing } = useContextChat(where, shownNow);
  const { chat, ...kept } = useKeptConversation(said);
  const proposals = useProposalMaking(said.proposalMade, { latest: kept.latest, bubbles: said.bubbles });
  // The map's scene reads the latest turn that draws one: a follow-up answered with words alone keeps the answer
  // before it on the map, its bar, marks, and main button, while the card says the new words (P04 ticket 46).
  const sceneBubbles = useMemo(() => sceneBubblesOf(chat.bubbles), [chat.bubbles]);
  const onMap = useShownOnMap({ ...chat, bubbles: sceneBubbles }, kept.framed);
  const bookingStage = useBookingStage();
  const place = onMap.booking?.place ?? null;
  const steps = onMap.steps !== null;
  const card = useCardRaise(kept.framed);
  const point = onMap.booking?.point ?? null;
  const { walk } = bookingStage;
  const booking = useMemo(
    () => ({ place, tell: bookingStage.tell, steps, point, walk }),
    [place, bookingStage.tell, steps, point, walk],
  );
  const onScreen = useAnswerOnScreen(sceneBubbles, where, shownNow);
  const outcomes = usePlanOutcomes(kept.said, onScreen.answer, onScreen.invitation, chat.earlier);
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
    },
    ...onScreen,
    answer: useMenuRaising(onScreen.answer, card.setRaised, chat.bubbles),
    lookup: useShownLookup(sceneBubbles, start, kept.hide),
    ...onMap,
    ...useActiveStep(onMap.steps),
    bookingStage,
    leave: useQuestLeaving(),
    pick,
    locationMissing: where.locationMissing,
    card,
    ...useOpenedMark(chat.bubbles, kept.framed),
    ...pressing,
  };
}
