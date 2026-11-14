/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { type Way } from './way.js';
import { type WayService } from './way.service.js';

// A way drawn on the map, for an app that draws answers: the server finds where the User sets out from and the minutes
// on foot, the model passes the Places and writes one sentence. Coordinates and ids of Places stay here.

const NO_START =
  'Where the User is now is not known: the app sent no location, and no item of theirs has ended earlier today.';

const STARTS: Record<Way['start']['basis'], string> = {
  location: 'where the User is now',
  chosen: 'the Place the User named',
  timetable: "the Place of the User's last item today",
};

const input = z.object({
  to: z
    .uuid()
    .describe('The Place to go to, as resolvePlace returned it in this message, or as [Tapped: place …] gives it.'),
  from: z
    .uuid()
    .optional()
    .describe(
      'The Place the User sets out from, when they named one, as resolvePlace returned it in this message. Left out to set out from where they are.',
    ),
});

export function findWay(ways: WayService): Tool {
  return defineTool({
    description:
      "Finds the way on foot from where the User is to a Place, and the app draws it on the map. Answers result 'found' with where the User sets out from, the Place, and the minutes on foot, or result 'none' with the reason.",
    input,
    run: async ({ to, from }, { userId, now, context, found, presented }) => {
      const tapped = context.tapped?.kind === 'place' ? context.tapped.placeId : null;
      found.refuseUnfound(
        'place',
        [to, ...(from === undefined ? [] : [from])].filter((placeId) => placeId !== tapped),
      );
      const answer = await ways.find(
        userId,
        { fromPlaceId: from ?? null, toPlaceId: to },
        { now, location: context.location },
      );
      if (answer.result === 'none') {
        return noneFound(NO_START);
      }
      const { way, lookup, labels } = answer;
      presented.lookup = lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', ...labels, fromIs: STARTS[way.start.basis], walkMinutes: way.walkMinutes };
    },
  });
}

// The rules of a way drawn on the map, a fragment of the chat's system prompt for an app that draws answers.
export const WAY_RULES = `A way is drawn on the map: the server finds where the User sets out from, the way to a Place, and the minutes on foot, and the app draws them.

- When the User asks where a Place is (문화관이 어디야?, 24동 어떻게 가?), find the Place with resolvePlace first, then call findWay with it as to. When they name where they set out from (301동에서), find that Place with resolvePlace too and give it as from.
- A line [Tapped: place …] gives the Place the User tapped (여기): give it as to.
- The app draws the way and writes its minutes itself. Your reply is one sentence, such as "문화관은 지금 있는 301동에서 걸어서 18분이에요." Do not call showOnMap for a way: the app already draws it.
- When findWay answers none, say that you need the User's location to find the way, or ask where they set out from.`;
