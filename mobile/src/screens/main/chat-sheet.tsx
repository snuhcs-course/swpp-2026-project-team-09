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
 ******************************************************************************/

// The conversation's control: the conversation with the Assistant, which the main screen holds, and what the answer
// frame and the map draw of it. The chat sheet this file is named after is gone; the answer frame is the only screen.

import { router } from 'expo-router';
import { type RefObject, useEffect, useRef } from 'react';
import type { MapLayer, QuestProposal } from '@/api/assistant-types';
import type { Tapped } from '@/api/lookup-types';
import { useToast } from '@/design-system';
import type { Viewport } from '@/features/assistant/study-area';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';
import { type PlanInvitation, usePlanInvitation } from '@/features/assistant/use-plan-invitation';
import { type ShownAnswer, useShownAnswer } from '@/features/assistant/use-shown-answer';
import { type ShownLookup, type StartGuidance, useShownLookup } from '@/features/assistant/use-shown-lookup';
import { openPost } from '../party/post-card';
import type { CardLeaving } from './chat-card-actions';
import { useContextChat, type Where } from './use-context-chat';
import { openProposalForm, useProposalMaking } from './use-proposal-making';

export interface ChatSheetControl {
  chat: Chat;
  // The answer frame is shown: the conversation holds something.
  framed: boolean;
  // Where the answer frame's cards lead, and its map buttons.
  leaving: CardLeaving & { showLayer: (layer: MapLayer) => void };
  // The answer on screen and its Plan, which the map and the frame's card draw.
  answer: ShownAnswer;
  // The Quest "이대로 초대" made from the Plan on screen, and how each invited Friend stands.
  invitation: PlanInvitation;
  // The Lookup on screen, which the map and the frame's card draw.
  lookup: ShownLookup;
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

// A map button of the answer frame: forgets the conversation and turns its layer on.
function forgettingFor(reset: () => void, turnOn: (layer: MapLayer) => void): (layer: MapLayer) => void {
  return (layer) => {
    reset();
    turnOn(layer);
  };
}

const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

// The answer on screen, kept in `shownNow` for the context of the next request, and the Quest made from its Plan.
function useAnswerOnScreen(
  bubbles: readonly ChatBubble[],
  { position, locationMissing }: Where,
  shownNow: RefObject<ShownAnswer | null>,
): { answer: ShownAnswer; invitation: PlanInvitation } {
  const showToast = useToast();
  const shown = useShownAnswer(bubbles, {
    location: position,
    locationMissing,
    onFailed: () => {
      showToast(NOT_RECALCULATED);
    },
  });
  const invitation = usePlanInvitation(shown, { location: position, locationMissing, say: showToast });
  useEffect(() => {
    shownNow.current = shown;
  });
  return { answer: shown, invitation };
}

// The conversation, every request of which carries the context at `where` the User is, and what the answer frame
// draws of it. A card that leads elsewhere leaves the frame as it is: an event card opens the 행사 tab at the event, as
// the room's event does; a Quest card opens the post, as 찾기's card does; a Proposal, once made, shows 내 파티, as the
// party form does, and its 수정, like a Restaurant card's 파티 만들기, opens that form. A map button forgets the
// conversation and turns its layer on with `turnOn`, the map's own layers. A Lookup's "길 안내" starts the route
// guidance with `start` and forgets the conversation once it started.
export function useChatSheet(turnOn: (layer: MapLayer) => void, where: Where, start: StartGuidance): ChatSheetControl {
  const shownNow = useRef<ShownAnswer | null>(null);
  const { chat, ...pressing } = useContextChat(where, shownNow);
  const proposals = useProposalMaking();
  return {
    chat,
    framed: chat.bubbles.length > 0 || chat.waiting,
    leaving: {
      showLayer: forgettingFor(chat.reset, turnOn),
      openEvent,
      openQuestPost: openPost,
      openPartyForm,
      proposals,
    },
    ...useAnswerOnScreen(chat.bubbles, where, shownNow),
    lookup: useShownLookup(chat.bubbles, start, chat.reset),
    ...pressing,
  };
}
