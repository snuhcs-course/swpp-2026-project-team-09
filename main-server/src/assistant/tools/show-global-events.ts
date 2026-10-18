/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { CARDS_MAX, defineTool, type Tool } from '../feature.js';

const input = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(CARDS_MAX)
    .describe('The ids of the Global Events to show, in the order to show them, as searchGlobalEvents returned them.'),
});

// A presenter: it adds Global Events to the reply as the 행사 tab's cards, in the order given, filled from the database
// in the shape of the tab's published list. Only ids that a search returned in this message are accepted; any other
// is refused back to the model, and nothing is shown. A card shown twice is shown once.
export function showGlobalEvents(globalEvents: GlobalEventsService): Tool {
  return defineTool({
    description:
      "Shows Global Events under your reply as the cards of the app's 행사 tab, in the order given; the User presses a card to open it, recruit a 파티 or ask for AI 매칭. Give only ids that searchGlobalEvents returned in this message. Do not repeat the cards' details in your text.",
    input,
    run: async ({ ids }, { found, presented }) => {
      found.refuseUnfound('globalEvent', ids);
      const shown = new Set(presented.cards.map(({ globalEvent }) => globalEvent.id));
      const fresh = [...new Set(ids)].filter((id) => !shown.has(id));
      if (presented.cards.length + fresh.length > CARDS_MAX) {
        throw new Error(`A reply shows at most ${CARDS_MAX} cards, and nothing was shown.`);
      }
      const events = await globalEvents.publishedAmong(fresh);
      presented.cards.push(...events.map((globalEvent) => ({ kind: 'globalEvent' as const, globalEvent })));
      return { result: 'shown', ids: events.map(({ id }) => id) };
    },
  });
}
