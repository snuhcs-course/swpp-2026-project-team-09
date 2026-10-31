/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type QuestProposal, referenceOf } from '@/api/assistant-types';
import type { ShownChatCard } from '@/api/quest-parts-types';
import { ChatEventCards, type EventCardActions } from './chat-event-cards';
import type { ProposalMaking } from './chat-proposal-card';
import { ChatQuestCards, type QuestCardActions } from './chat-quest-cards';
import { ChatRestaurantCards } from './chat-restaurant-cards';

// What the Proposal card of an answer does, by the answer's bubble: how its making stands, 만들기 and 수정.
export interface ProposalActions {
  makingOf: (bubbleId: number) => ProposalMaking;
  make: (bubbleId: number, proposal: QuestProposal) => void;
  edit: (bubbleId: number, proposal: QuestProposal) => void;
}

// What the cards of the answers do.
export interface CardActions {
  events: EventCardActions;
  quests: QuestCardActions;
  proposals: ProposalActions;
  // A Restaurant card's 파티 만들기.
  openPartyForm: (proposal: QuestProposal) => void;
}

// The cards of an answer in the order the Assistant showed them, the cards of one kind next to each other together.
function runsOf(cards: readonly ShownChatCard[]): ShownChatCard[][] {
  const runs: ShownChatCard[][] = [];
  for (const card of cards) {
    const last = runs.at(-1);
    if (last?.[0]?.kind === card.kind) {
      last.push(card);
    } else {
      runs.push([card]);
    }
  }
  return runs;
}

function Run({ run, actions }: { run: readonly ShownChatCard[]; actions: CardActions }): ReactElement | null {
  const events = run.filter((card) => card.kind === 'globalEvent');
  const quests = run.filter((card) => card.kind === 'quest');
  const restaurants = run.filter((card) => card.kind === 'restaurant');
  if (events.length > 0) {
    return <ChatEventCards actions={actions.events} cards={events} />;
  }
  if (quests.length > 0) {
    return <ChatQuestCards actions={actions.quests} cards={quests} />;
  }
  return <ChatRestaurantCards cards={restaurants} onMakeParty={actions.openPartyForm} />;
}

function keyOf(run: readonly ShownChatCard[]): string {
  const [first] = run;
  return first === undefined ? '' : `${first.kind}-${referenceOf(first).id}`;
}

export function Cards({ cards, actions }: { cards: readonly ShownChatCard[]; actions: CardActions }): ReactElement {
  return (
    <>
      {runsOf(cards).map((run) => (
        <Run actions={actions} key={keyOf(run)} run={run} />
      ))}
    </>
  );
}
