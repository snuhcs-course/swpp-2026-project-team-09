/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { daysTogether, hasWindow, inOrder, WINDOW_INPUT, windowOf, windowWords } from './search-window.js';

// The most candidates one search gives, the earliest first.
const CANDIDATES_MAX = 20;
// The characters of a description a candidate carries: enough to tell what kind of event it is.
const DESCRIPTION_MAX = 300;

const input = z
  .object({
    ...WINDOW_INPUT,
    place: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Only the events whose place holds these words, such as 301동. Leave it out for any place.'),
    words: z
      .array(z.string().trim().min(1))
      .max(5)
      .optional()
      .describe(
        'Only the events whose title or description holds any of these words, such as 공연 or 콘서트. Leave it out for every kind of event.',
      ),
  })
  .refine(daysTogether, { message: 'Give both from and to, or neither', path: ['to'] })
  .refine(hasWindow, { message: 'Give from and to, or after or before', path: ['from'] })
  .refine(inOrder, { message: 'The window must not end before it starts', path: ['to'] });

type Conditions = z.output<typeof input>;

function reasonForNone(conditions: Conditions): string {
  const { place, words } = conditions;
  const where = place === undefined ? '' : ` at a place holding ${place}`;
  const what = words === undefined || words.length === 0 ? '' : ` holding ${words.join(' or ')}`;
  return `No published Global Event${what}${where} takes place${windowWords(conditions)}.`;
}

// A lookup: the published Global Events of a window that have not ended, as compact candidates from which the model
// picks those that fit what the User meant, or "none" with the reason. Their text was collected from Sources or
// written by organizers, so it reaches the model inside delimiters. showGlobalEvents accepts the ids it returned.
export function searchGlobalEvents(globalEvents: GlobalEventsService): Tool {
  return defineTool({
    description:
      "Searches the published Global Events (campus events: concerts, talks, exhibitions, festivals, …) whose span overlaps a time window, whether it is whole days (from, to) or times (after, before), optionally at a place and holding some words. Answers candidates, the earliest first, with their start and end in Korean time, or result 'none' with the reason. Pick those that fit what the User asked for, then show them with showGlobalEvents.",
    input,
    run: async (conditions, { now, found }) => {
      const { place, words } = conditions;
      const events = await globalEvents.searchPublished(
        { period: windowOf(conditions), place, words, take: CANDIDATES_MAX + 1 },
        now,
      );
      if (events.length === 0) {
        return noneFound(reasonForNone(conditions));
      }
      const candidates = events.slice(0, CANDIDATES_MAX);
      found.add(
        'globalEvent',
        candidates.map(({ id }) => id),
      );
      return {
        result: 'found',
        // More events match than were given: a shorter window or more words narrows them.
        more: events.length > CANDIDATES_MAX,
        events: candidates.map((event) => ({
          id: event.id,
          title: othersText('globalEvent.title', event.title),
          // A published event has a start, and the search leaves out any without one.
          startsAt: event.startsAt === null ? null : koreaTime(new Date(event.startsAt)),
          endsAt: event.endsAt === null ? null : koreaTime(new Date(event.endsAt)),
          place: event.place === null ? null : othersText('globalEvent.place', event.place),
          description: othersText('globalEvent.description', event.description.slice(0, DESCRIPTION_MAX)),
        })),
      };
    },
  });
}
