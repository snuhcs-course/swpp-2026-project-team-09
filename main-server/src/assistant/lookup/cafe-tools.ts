/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { type CafeAnswer } from './cafe-way.js';
import { type CafeLookupService } from './cafe.service.js';
import { STARTS } from './way-tools.js';

// A café on the way, drawn on the map, for an app that draws answers (P01-15, board q9).

const NONE_REASONS: Record<Extract<CafeAnswer, { result: 'none' }>['reason'], string> = {
  'no-start':
    'Where the User sets out from is not known: where they are could not be matched to a Place, and no item of theirs has ended earlier today.',
  'no-next': 'The User has no item with a Place later today, and named no Place to go to.',
  'no-cafe': 'No café on the campus is known.',
  'no-time': 'No café can be stopped at before the User must set out for their next item.',
};

const input = z.object({
  to: z
    .uuid()
    .optional()
    .describe(
      "The Place the User is going to, as resolvePlace returned it in this message, or as [Tapped: place …] gives it. Left out for the Place of the User's next item today.",
    ),
  from: z
    .uuid()
    .optional()
    .describe(
      'The Place the User sets out from, when they named one, as resolvePlace returned it in this message. Left out to set out from where they are.',
    ),
});

export function findCafeOnWay(cafes: CafeLookupService): Tool {
  return defineTool({
    description:
      "Finds the campus cafés on the User's way to a Place, or to the Place of their next item today, each with the extra minutes on foot against going straight there, and the app draws the one with the fewest on the map, with the next two beside it. Answers result 'found' with where the User sets out from, where they go, the minutes straight there, and the cafés with their extra minutes, arrival, and until when they can stay, or result 'none' with the reason.",
    input,
    run: async ({ to, from }, { userId, now, context, found, presented }) => {
      const tapped = context.tapped?.kind === 'place' ? context.tapped.placeId : null;
      found.refuseUnfound(
        'place',
        [to, from].flatMap((placeId) => (placeId === undefined || placeId === tapped ? [] : [placeId])),
      );
      const answer = await cafes.find(
        userId,
        { fromPlaceId: from ?? null, toPlaceId: to ?? null },
        { now, location: context.location, locationMissing: context.locationMissing },
      );
      if (answer.result === 'none') {
        return noneFound(NONE_REASONS[answer.reason]);
      }
      presented.lookup = answer.lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', fromIs: STARTS[answer.way.start.basis], ...answer.words };
    },
  });
}

// The rules of a café on the way, a fragment of the chat's system prompt for an app that draws answers.
export const CAFE_RULES = `A café on the way is drawn on the map: the server finds the campus cafés, the extra minutes of each against going straight, and the app draws them.

- When the User asks for a café on their way (가는 길에 카페, 수업 가기 전에 커피 한잔), call findCafeOnWay. The server takes the Place of their next item today; when they name where they are going (24동 가는 길에 카페), find it with resolvePlace first and give it as to.
- Your reply is one sentence, such as "카페그랑에 들르면 1분 더 걸려요." Name only the cafés findCafeOnWay gave; never one from elsewhere.
- When it answers none because no café fits before the next item, say so. When it does not know where the User sets out from, ask.`;
