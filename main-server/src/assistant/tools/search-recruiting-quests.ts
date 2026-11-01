/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { RecruitingService } from '../../quests/recruiting.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { daysTogether, inOrder, WINDOW_INPUT, windowOf, windowWords } from './search-window.js';

// The most candidates one search gives, the soonest first.
const CANDIDATES_MAX = 20;
// The characters of a description a candidate carries: enough to tell what the 파티 is for.
const DESCRIPTION_MAX = 300;

const input = z
  .object({
    board: z
      .enum(QuestBoard)
      .optional()
      .describe(
        'Only the 파티 of one Board: meal (식사), career (커리어), hobby (취미, 운동 among them) or show (공연·전시). Leave it out for every Board.',
      ),
    ...WINDOW_INPUT,
    globalEventId: z
      .uuid()
      .optional()
      .describe('Only the 파티 going to this Global Event, as searchGlobalEvents returned it.'),
    minPlacesLeft: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Only the 파티 with at least this many places left, such as 2 for "2자리 이상". Leave it out for any with room.',
      ),
    capacity: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Only the 파티 of exactly this many people in total, the User included. Leave it out for any size.'),
  })
  .refine(daysTogether, { message: 'Give both from and to, or neither', path: ['to'] })
  .refine(inOrder, { message: 'The window must not end before it starts', path: ['to'] });

type Conditions = z.output<typeof input>;

function reasonForNone(conditions: Conditions): string {
  const { board, globalEventId, minPlacesLeft, capacity } = conditions;
  const onBoard = board === undefined ? '' : ` on the Board ${board}`;
  const forEvent = globalEventId === undefined ? '' : ' going to that Global Event';
  const ofCapacity = capacity === undefined ? '' : ` for ${capacity} people`;
  const withPlaces = minPlacesLeft === undefined ? '' : ` with ${minPlacesLeft} or more places left`;
  return `No 파티 that the User can join${onBoard}${forEvent}${ofCapacity}${withPlaces} is found${windowWords(conditions)}.`;
}

// A lookup: the recruiting Quests that the User could enter now, as compact candidates from which the model picks those
// that fit what the User meant, the soonest to start first, or "none" with the reason. Their text was
// written by other Users, so it reaches the model inside delimiters. showQuests accepts the ids it returned.
export function searchRecruitingQuests(recruiting: RecruitingService): Tool {
  return defineTool({
    description:
      "Searches the recruiting 파티 (Quests) on the Boards that the User can enter, optionally of one Board, in a time window, whether it is whole days (from, to) or times (after, before), or going to a Global Event. The server already leaves out 파티 that are full, already started (a 파티 for a Global Event stays until the event ends), or that the User already asked to join or cannot enter. A 파티 for a Global Event is in the window while the event overlaps it; any other 파티 when it starts in it. Answers candidates, the soonest to start first, with the time in Korean time and place, the Join Policy, the places left and the number of Holders, or result 'none' with the reason. Pick those that fit what the User asked for, then show them with showQuests.",
    input,
    run: async (conditions, { userId, found }) => {
      const { board, globalEventId, minPlacesLeft, capacity } = conditions;
      const quests = await recruiting.search(userId, {
        window: windowOf(conditions),
        board,
        globalEventId,
        minPlacesLeft,
        capacity,
        take: CANDIDATES_MAX + 1,
      });
      if (quests.length === 0) {
        return noneFound(reasonForNone(conditions));
      }
      const candidates = quests.slice(0, CANDIDATES_MAX);
      found.add(
        'quest',
        candidates.map(({ id }) => id),
      );
      return {
        result: 'found',
        // More Quests match than were given: a Board or a shorter window narrows them.
        more: quests.length > CANDIDATES_MAX,
        quests: candidates.map((quest) => {
          const { startsAt, endsAt, place } = quest.nextSubQuest;
          return {
            id: quest.id,
            title: othersText('quest.title', quest.title),
            board: quest.board,
            globalEvent: quest.globalEvent === null ? null : othersText('globalEvent.title', quest.globalEvent.title),
            // open: the User joins at once; approval: the Leader accepts each User who asks.
            joinPolicy: quest.joinPolicy,
            placesLeft: quest.capacity - quest.holderCount,
            holderCount: quest.holderCount,
            next: {
              startsAt: startsAt === null ? null : koreaTime(new Date(startsAt)),
              endsAt: endsAt === null ? null : koreaTime(new Date(endsAt)),
              place: place === null ? null : othersText('quest.place', place.label),
            },
            description: othersText('quest.description', quest.description.slice(0, DESCRIPTION_MAX)),
          };
        }),
      };
    },
  });
}
