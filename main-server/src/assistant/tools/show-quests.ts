/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { RecruitingService } from '../../quests/recruiting.service.js';
import { CARDS_MAX, defineTool, type Tool } from '../feature.js';
import { freshIds } from './fresh-ids.js';

const input = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(CARDS_MAX)
    .describe('The ids of the 파티 to show, in the order to show them, as searchRecruitingQuests returned them.'),
});

// A presenter: it adds recruiting Quests to the reply as the Boards' cards, in the order given, filled from the
// database in the shape of the Boards' recruiting list. Only ids that a search returned in this message are accepted;
// any other is refused back to the model, and nothing is shown. A card shown twice is shown once, and a Quest that
// stopped recruiting since the search is left out.
export function showQuests(recruiting: RecruitingService): Tool {
  return defineTool({
    description:
      "Shows recruiting 파티 under your reply as the cards of the app's Boards, in the order given; the User presses a card to open its post, or joins from it. Give only ids that searchRecruitingQuests returned in this message. Do not repeat the cards' details in your text.",
    input,
    run: async ({ ids }, { userId, found, presented }) => {
      found.refuseUnfound('quest', ids);
      const fresh = freshIds(presented, 'quest', ids);
      const quests = await recruiting.listedAmong(userId, fresh);
      presented.cards.push(...quests.map((quest) => ({ kind: 'quest' as const, quest })));
      return { result: 'shown', ids: quests.map(({ id }) => id) };
    },
  });
}
