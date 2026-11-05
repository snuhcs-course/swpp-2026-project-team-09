/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { type Hit } from '../../common/search-sql.js';
import { type RecruitingQuestDto } from '../../quests/dto/quest.dto.js';
import { PlacesService } from '../../places/places.service.js';
import { RecruitingService } from '../../quests/recruiting.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { CANDIDATES_MAX, DESCRIPTION_MAX, narrowing, placeNote, whyFound, wordsInput } from './search-candidates.js';
import { daysTogether, inOrder, WINDOW_INPUT, windowOf, windowWords } from './search-window.js';

// How near a Place a 파티 counts as being there, when the model names no other radius.
const RADIUS_METRES = 300;

// The widest search near a Place: a huge radius would turn the Place filter off without any sign.
const RADIUS_MAX_METRES = 3000;

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
      .describe(
        'Only the 파티 going to this Global Event, as searchGlobalEvents or resolveGlobalEvent returned it, or from [Cards shown: …].',
      ),
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
    words: wordsInput('파티'),
    placeId: z
      .uuid()
      .optional()
      .describe(
        'Only the 파티 at or near this Place, as resolvePlace returned it: a 파티 whose place is only words is left out. Leave it out unless the User named a place.',
      ),
    radius: z
      .number()
      .positive()
      .max(RADIUS_MAX_METRES)
      .optional()
      .describe(
        `How near placeId, in metres, this distance included, up to ${RADIUS_MAX_METRES}. Leave it out for ${RADIUS_METRES}.`,
      ),
  })
  .refine(daysTogether, { message: 'Give both from and to, or neither', path: ['to'] })
  .refine(inOrder, { message: 'The window must not end before it starts', path: ['to'] })
  .refine(({ placeId, radius }) => placeId !== undefined || radius === undefined, {
    message: 'Give placeId with radius',
    path: ['placeId'],
  });

type Conditions = z.output<typeof input>;

function reasonForNone(conditions: Conditions): string {
  const { board, globalEventId, minPlacesLeft, capacity, placeId, radius = RADIUS_METRES } = conditions;
  const onBoard = board === undefined ? '' : ` on the Board ${board}`;
  const forEvent = globalEventId === undefined ? '' : ' going to that Global Event';
  const ofCapacity = capacity === undefined ? '' : ` for ${capacity} people`;
  const withPlaces = minPlacesLeft === undefined ? '' : ` with ${minPlacesLeft} or more places left`;
  const nearPlace = placeId === undefined ? '' : ` within ${radius} m of that Place`;
  return `No 파티 that the User can join${onBoard}${forEvent}${ofCapacity}${withPlaces}${nearPlace} is found${windowWords(conditions)}.`;
}

// What the model reads of a Quest. Its text reaches the model inside delimiters.
function candidateOf({ quest, ...why }: Omit<Hit, 'id'> & { quest: RecruitingQuestDto }, words?: string[]): object {
  const { startsAt, endsAt, place } = quest.nextSubQuest;
  return {
    id: quest.id,
    title: othersText('quest.title', quest.title),
    board: quest.board,
    globalEvent: quest.globalEvent === null ? null : othersText('globalEvent.title', quest.globalEvent.title),
    // open: the User joins at once; approval: the Leader accepts each User who asks.
    joinPolicy: quest.joinPolicy,
    join: quest.joinPolicy === 'approval' ? 'askToJoin' : 'open',
    placesLeft: quest.capacity - quest.holderCount,
    holderCount: quest.holderCount,
    next: {
      startsAt: startsAt === null ? null : koreaTime(new Date(startsAt)),
      endsAt: endsAt === null ? null : koreaTime(new Date(endsAt)),
      place: place === null ? null : othersText('quest.place', place.label),
    },
    description: othersText('quest.description', quest.description.slice(0, DESCRIPTION_MAX)),
    ...whyFound(why, words),
  };
}

// A lookup: the recruiting Quests that the User could enter now, as compact candidates from which the model picks those
// that fit what the User meant, those holding more of the words first and then the soonest to start, or "none" with the
// reason. Their text was written by other Users, so it reaches the model inside delimiters. showQuests accepts the ids it
// returned.
export function searchRecruitingQuests(recruiting: RecruitingService, places: PlacesService): Tool {
  return defineTool({
    description:
      "Searches the recruiting 파티 (Quests) on the Boards that the User can enter, optionally of one Board, in a time window, whether it is whole days (from, to) or times (after, before), going to a Global Event, or at or near a Place. The server already leaves out 파티 that are full, already started (a 파티 for a Global Event stays until the event ends), or that the User already asked to join or cannot enter. A 파티 for a Global Event is in the window while the event overlaps it; any other 파티 when it starts in it. Answers candidates, those holding more of the words first, then the soonest to start, with the time in Korean time and place, the Join Policy, the places left and the number of Holders, or result 'none' with the reason. Words only rank, so a candidate may hold none of them and still fit, and may be something else: read each one. Each candidate gives matched, the words it holds, and window: starts if it starts in the window, underWay if it began before it and is still on. With more: true, total and narrowBy count every 파티 found by Board, day and word, to search again by one of them. Pick those that fit what the User asked for, then show them with showQuests.",
    input,
    run: async (conditions, { userId, found }) => {
      const { board, globalEventId, minPlacesLeft, capacity, words, placeId, radius = RADIUS_METRES } = conditions;
      const note = placeNote(
        found,
        placeId !== undefined,
        (named) =>
          `placeId was not given, so these 파티 are from any place, though resolvePlace returned a Place in this message: ${named}. To search near it, call again with its placeId.`,
      );
      const search = {
        window: windowOf(conditions),
        board,
        globalEventId,
        minPlacesLeft,
        capacity,
        words,
        near: placeId === undefined ? undefined : { placeId, metres: radius },
      };
      const quests = await recruiting.search(userId, { ...search, take: CANDIDATES_MAX + 1 });
      if (quests.length === 0) {
        const noSuchPlace = placeId !== undefined && !(await places.exists(placeId));
        return { ...noneFound(noSuchPlace ? 'There is no such Place.' : reasonForNone(conditions)), ...note };
      }
      const candidates = quests.slice(0, CANDIDATES_MAX);
      found.add(
        'quest',
        candidates.map(({ quest }) => quest.id),
      );
      // More Quests match than were given: a Board, a day or a word narrows them.
      const more = quests.length > CANDIDATES_MAX;
      return {
        result: 'found',
        more,
        ...(more ? narrowing(await recruiting.searchCounts(userId, search)) : {}),
        quests: candidates.map((candidate) => candidateOf(candidate, words)),
        ...note,
      };
    },
  });
}
