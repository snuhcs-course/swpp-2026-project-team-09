/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { type RecruitingQuestDto } from '../../quests/dto/quest.dto.js';
import { RecruitingService } from '../../quests/recruiting.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';

// The most candidates one search gives, the soonest first.
const CANDIDATES_MAX = 20;
// The characters of a description a candidate carries: enough to tell what the 파티 is for.
const DESCRIPTION_MAX = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

const input = z
  .object({
    board: z
      .enum(QuestBoard)
      .optional()
      .describe(
        'Only the 파티 of one Board: meal (식사), career (커리어), hobby (취미, 운동 among them) or show (공연·전시). Leave it out for every Board.',
      ),
    from: z.iso
      .date()
      .optional()
      .describe(
        'The first day of the period, a calendar day in Korea as YYYY-MM-DD. Leave out from and to for any time.',
      ),
    to: z.iso.date().optional().describe('The last day of the period, the same as from for one day.'),
    globalEventId: z
      .uuid()
      .optional()
      .describe('Only the 파티 going to this Global Event, as searchGlobalEvents returned it.'),
  })
  .refine(({ from, to }) => (from === undefined) === (to === undefined), {
    message: 'Give both from and to, or neither',
    path: ['to'],
  })
  .refine(({ from, to }) => from === undefined || to === undefined || from <= to, {
    message: 'to must not be before from',
    path: ['to'],
  });

type Conditions = z.output<typeof input>;

function reasonForNone({ board, from, to, globalEventId }: Conditions): string {
  const onBoard = board === undefined ? '' : ` on the Board ${board}`;
  const forEvent = globalEventId === undefined ? '' : ' going to that Global Event';
  const period = from === undefined ? '' : from === to ? ` on ${from}` : ` from ${from} to ${to}`;
  return `No 파티 that the User can join${onBoard}${forEvent} meets next${period}.`;
}

// When the next Sub Quest starts, or never for one without a start.
function startOf({ nextSubQuest }: RecruitingQuestDto): number {
  return nextSubQuest.startsAt === null ? Number.POSITIVE_INFINITY : new Date(nextSubQuest.startsAt).getTime();
}

// Whether the next Sub Quest takes place in the period: it overlaps it, and one without an end falls on its start.
// One without a start falls in no period.
function meetsWithin({ nextSubQuest }: RecruitingQuestDto, from: string, to: string): boolean {
  const { startsAt, endsAt } = nextSubQuest;
  if (startsAt === null) {
    return false;
  }
  const start = new Date(`${from}T00:00:00+09:00`).getTime();
  const end = new Date(`${to}T00:00:00+09:00`).getTime() + DAY_MS;
  return new Date(startsAt).getTime() < end && new Date(endsAt ?? startsAt).getTime() >= start;
}

// A lookup: the recruiting Quests that the User could join from the Boards, as compact candidates from which the model
// picks those that fit what the User meant, the soonest to meet first, or "none" with the reason. Their text was
// written by other Users, so it reaches the model inside delimiters. showQuests accepts the ids it returned.
export function searchRecruitingQuests(recruiting: RecruitingService): Tool {
  return defineTool({
    description:
      "Searches the recruiting 파티 (Quests) on the Boards that the User can join, optionally of one Board, whose next meeting falls in a period, or going to a Global Event. Answers candidates, the soonest to meet first, with the next meeting's time in Korean time and place, and the places left, or result 'none' with the reason. Pick those that fit what the User asked for, then show them with showQuests.",
    input,
    run: async (conditions, { userId, found }) => {
      const { board, from, to, globalEventId } = conditions;
      const listed = await recruiting.list(userId, globalEventId, board);
      const quests = listed
        .filter((quest) => from === undefined || to === undefined || meetsWithin(quest, from, to))
        .toSorted((a, b) => startOf(a) - startOf(b));
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
        // More Quests match than were given: a Board or a shorter period narrows them.
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
            placesLeft: Math.max(quest.capacity - quest.holderCount, 0),
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
