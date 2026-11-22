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
 ******************************************************************************/

// The conversation's control: the conversation with the Assistant, which the main screen holds, and what the answer
// frame and the map draw of it. The chat sheet this file is named after is gone; the answer frame is the only screen.

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import { placesQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { useToast } from '@/design-system';
import { type ShownProposal, shownProposalOf } from '@/features/assistant/proposal-scene';
import type { Viewport } from '@/features/assistant/study-area';
import type { PlanOutcomes } from '@/features/assistant/turn-outcome';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';
import { type HowAbout, useHowAbout } from '@/features/assistant/use-how-about';
import { type PlanInvitation, usePlanInvitation } from '@/features/assistant/use-plan-invitation';
import { type QuestLeaving, useQuestLeaving } from '@/features/assistant/use-quest-leaving';
import { type ShownAnswer, useShownAnswer } from '@/features/assistant/use-shown-answer';
import { type ShownLookup, type StartGuidance, useShownLookup } from '@/features/assistant/use-shown-lookup';
import { openPost } from '../party/post-card';
import { type CardRaise, useCardRaise } from './answer/card-raise';
import { type MarkOpening, useOpenedMark } from './answer/opened-mark';
import type { CardLeaving } from './chat-card-actions';
import { useContextChat, type Where } from './use-context-chat';
import { type KeptConversation, useKeptConversation } from './use-kept-conversation';
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
  // A building pressed while a meal's Plan is on screen, and its answer ("여기면 어때?").
  howAbout: HowAbout;
  // The Lookup on screen, which the map and the frame's card draw.
  lookup: ShownLookup;
  // The Proposal of the turn on screen with a place to stand at, which the map draws as a flag (P04 ticket 06).
  proposal: ShownProposal | null;
  // What became of each reply's Plan, for the list of questions.
  outcomes: PlanOutcomes;
  // A reply's 취소하기 or 나가기, which cancels a Quest asked by words (P04 ticket 24).
  leave: QuestLeaving;
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

// The Proposal of the turn on screen that the map draws, while the frame is shown.
function useShownProposal(bubbles: readonly ChatBubble[], framed: boolean): ShownProposal | null {
  const places = useQuery(placesQuery).data ?? NO_PLACES;
  return useMemo(() => (framed ? shownProposalOf(bubbles, places) : null), [bubbles, places, framed]);
}

const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

// The answer on screen, kept in `shownNow` for the context of the next request, the Quest made from its Plan, and a
// building asked about over it.
function useAnswerOnScreen(
  bubbles: readonly ChatBubble[],
  { position, locationMissing }: Where,
  shownNow: RefObject<ShownAnswer | null>,
): Pick<ChatSheetControl, 'answer' | 'invitation' | 'howAbout'> {
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
  useEffect(() => {
    shownNow.current = shown;
  });
  return { answer: shown, invitation, howAbout: useHowAbout(shown, invitation, recalculation) };
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
  const proposals = useProposalMaking(said.proposalMade);
  const onScreen = useAnswerOnScreen(chat.bubbles, where, shownNow);
  const outcomes = usePlanOutcomes(kept.said, onScreen.answer, onScreen.invitation);
  return {
    chat,
    ...kept,
    outcomes,
    leaving: {
      showLayer: hidingFor(kept.hide, turnOn),
      openEvent,
      openQuestPost: openPost,
      openPartyForm,
      proposals,
    },
    ...onScreen,
    lookup: useShownLookup(chat.bubbles, start, kept.hide),
    proposal: useShownProposal(chat.bubbles, kept.framed),
    leave: useQuestLeaving(),
    card: useCardRaise(kept.framed),
    ...useOpenedMark(chat.bubbles, kept.framed),
    ...pressing,
  };
}
