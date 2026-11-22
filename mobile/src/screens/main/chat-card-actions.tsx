/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import type { QuestProposal } from '@/api/assistant-types';
import { questsQuery } from '@/api/queries';
import type { Chat } from '@/features/assistant/use-chat';
import type { PostView } from '@/features/party/posts';
import { EventSheets, useEventSheets } from '../events/event-sheets';
import { JoinSheet } from '../party/join-sheet';
import { usePartyActions } from '../party/use-party-actions';
import type { CardActions, ProposalActions } from './chat-cards';
import type { Tell } from './library/booking-stage';
import type { EventCardActions } from './chat-event-cards';
import type { QuestCardActions } from './chat-quest-cards';

// What the cards of the chat's answers do, for the chat's sheet and the answer frame alike.

// What the event cards of the answers do. Their 파티 찾기/모집 opens the 행사 tab's own sheet over the chat,
// which stays open under it, and what that sheet opens next lies over the main screen as it does over the tab.
function useEventCards(onOpenEvent: (globalEventId: string) => void): {
  actions: EventCardActions;
  sheets: ReactElement;
} {
  const sheets = useEventSheets();
  const quests = useQuery(questsQuery).data ?? [];
  const { setRecruitEvent } = sheets;
  const actions = useMemo(() => ({ open: onOpenEvent, recruit: setRecruitEvent }), [onOpenEvent, setRecruitEvent]);
  return { actions, sheets: <EventSheets quests={quests} sheets={sheets} /> };
}

// What the Quest cards of the answers do. Their join button opens 찾기's join confirmation over the chat, which stays
// open under it, and joining an Open Quest shows 내 파티 over the main screen, as it does from 찾기.
function useQuestCards(onOpenPost: (questId: string) => void): {
  actions: QuestCardActions;
  sheet: ReactElement;
} {
  const [joining, setJoining] = useState<PostView | null>(null);
  const partyActions = usePartyActions();
  const actions = useMemo(() => ({ open: onOpenPost, join: setJoining }), [onOpenPost]);
  const sheet = (
    <JoinSheet
      onClose={() => {
        setJoining(null);
      }}
      onJoin={(chosen) => void partyActions.join(chosen)}
      post={joining}
    />
  );
  return { actions, sheet };
}

// Where the cards of an answer lead, and the Proposal card's 만들기 and 수정.
export interface CardLeaving {
  openEvent: (globalEventId: string) => void;
  openQuestPost: (questId: string) => void;
  openPartyForm: (proposal: QuestProposal) => void;
  proposals: ProposalActions;
  // The seat card whose booking the map draws, by its place, and how it tells what it offers (P04 ticket 07).
  booking?: { place: string | null; tell: Tell };
}

// What the cards of the conversation's answers do, and the sheets their buttons open over the chat.
export function useCardActions(chat: Chat, leaving: CardLeaving): { actions: CardActions; sheets: ReactElement } {
  const { openEvent, openQuestPost, openPartyForm, proposals, booking } = leaving;
  const eventCards = useEventCards(openEvent);
  const questCards = useQuestCards(openQuestPost);
  const { addOwn, outcomes, finish, unfinish, rooms, showRoom, bubbles } = chat;
  const actions: CardActions = useMemo(
    () => ({
      events: eventCards.actions,
      quests: questCards.actions,
      proposals,
      openPartyForm,
      library: {
        addOwn,
        outcomeOf: (card: string) => outcomes.get(card) ?? null,
        finish,
        unfinish,
        roomOf: (card: string) => rooms.get(card) ?? null,
        showRoom,
        askedBefore: (bubbleId: number) =>
          bubbles.findLast(({ id, role }) => role === 'user' && id < bubbleId)?.text ?? '',
        onMap: (card: string) => (booking !== undefined && booking.place === card ? booking.tell : null),
      },
    }),
    [
      eventCards.actions,
      questCards.actions,
      proposals,
      openPartyForm,
      addOwn,
      outcomes,
      finish,
      unfinish,
      rooms,
      showRoom,
      bubbles,
      booking,
    ],
  );
  return {
    actions,
    sheets: (
      <>
        {eventCards.sheets}
        {questCards.sheet}
      </>
    ),
  };
}
