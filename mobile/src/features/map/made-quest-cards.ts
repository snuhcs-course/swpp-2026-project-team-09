/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MadeQuestView } from '@/features/assistant/use-made-quests';
import { type CardView, cardId } from './adapter';
import { shortTitle } from './short-name';

// The flag of each Quest made from a Plan, at its destination, apart from the place groups: its card is the one after
// inviting.
export function madeQuestCards(made: readonly MadeQuestView[]): CardView[] {
  return made.map(({ quest, destination, words }) => ({
    id: cardId.madeQuest(quest.id),
    kind: 'made-quest',
    mark: { type: 'place', place: 'party' },
    marker: { name: words, short: shortTitle(quest.title), count: 0, minutesOld: null },
    subLabel: '비공개 파티',
    title: quest.title,
    lines: [],
    primary: null,
    secondary: null,
    position: destination.at,
  }));
}

// The map's cards apart from the Quests' own cards that a flag of `made` stands for. Those stay cards, out of the place
// groups, so that an address or a row of the Quest list opens them as before, but within their flag, which is drawn in
// place of their marker.
export function besideFlags(
  cards: readonly CardView[],
  made: readonly MadeQuestView[],
): { rest: readonly CardView[]; flagged: readonly CardView[] } {
  if (made.length === 0) {
    return { rest: cards, flagged: [] };
  }
  const flags = new Map(made.map(({ quest }) => [cardId.quest(quest.id), cardId.madeQuest(quest.id)]));
  return {
    rest: cards.filter(({ id }) => !flags.has(id)),
    flagged: cards.flatMap((card) => {
      const flag = flags.get(card.id);
      return flag === undefined ? [] : [{ ...card, within: flag }];
    }),
  };
}
