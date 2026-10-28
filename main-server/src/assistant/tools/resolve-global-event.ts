/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { defineTool, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { resolved, settle } from './resolved.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// The most events read: more than a resolver gives, so that it knows there are more.
const READ_MAX = 50;

const input = z
  .object({
    words: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .describe("The User's words for the event, exactly as written, such as 축제 or 재즈 공연."),
    from: z.iso.date().optional().describe('The first day of the period the User meant, YYYY-MM-DD in Korea, if any.'),
    to: z.iso.date().optional().describe('The last day of that period, given with from.'),
  })
  .refine(({ from, to }) => (from === undefined) === (to === undefined), {
    message: 'Give from and to together, or neither',
    path: ['to'],
  })
  .refine(({ from, to }) => from === undefined || to === undefined || from <= to, {
    message: 'to must not be before from',
    path: ['to'],
  });

// A resolver: the published Global Events that have not ended whose title holds the words, in the period when one is
// given, as candidates, the earliest first. Their text reaches the model inside delimiters. proposeQuest accepts the
// ids it returned.
export function resolveGlobalEvent(globalEvents: GlobalEventsService): Tool {
  return defineTool({
    description:
      "Finds the published Global Event (campus event) the User's words refer to, as the event a 파티 goes to, optionally within a period. Answers result 'one' with the event, 'several' with the candidates, or 'none' with the reason. On 'several', ask the User which one, listing the titles; on 'none', say there is no such event.",
    input,
    run: async ({ words, from, to }, context) => {
      const { now } = context;
      const period =
        from === undefined || to === undefined
          ? undefined
          : {
              from: new Date(`${from}T00:00:00+09:00`),
              to: new Date(new Date(`${to}T00:00:00+09:00`).getTime() + DAY_MS),
            };
      const events = await globalEvents.searchPublished({ period, title: words, take: READ_MAX }, now);
      const answer = resolved(
        events.map((event) => ({
          id: event.id,
          title: othersText('globalEvent.title', event.title),
          startsAt: event.startsAt === null ? null : koreaTime(new Date(event.startsAt)),
          place: event.place === null ? null : othersText('globalEvent.place', event.place),
        })),
        `No published Global Event still to come has a title holding ${words}${period === undefined ? '' : ` from ${from} to ${to}`}.`,
      );
      const labels = new Map(events.map(({ id, title }) => [id, title]));
      await settle(context, { kind: 'globalEvent', words, answer, labels });
      return answer;
    },
  });
}
