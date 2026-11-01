/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { startOfSeoulDay } from '../common/seoul-day.js';
import { Prisma, QuestBoard } from '../generated/prisma/client.js';

// What the Assistant's searchRecruitingQuests asks for: the Quests the reader could enter, in the window [from, to) when
// one is given. Unlike the Boards' list it goes by a Quest's first Sub Quest (P05 spec, "A Quest's time and place").
export interface RecruitingSearch {
  window?: { from: Date; to: Date };
  board?: QuestBoard;
  globalEventId?: string;
  // Left out, one: a Full Quest is never found.
  minPlacesLeft?: number;
  capacity?: number;
  // The most Quests answered.
  take: number;
}

// The stored times have no time zone and are in UTC, which a bare date parameter would leave to the session's.
const timestamp = (at: Date): Prisma.Sql => Prisma.sql`${at.toISOString()}::timestamp`;

const HOLDERS = Prisma.sql`(SELECT count(*) FROM quest_holders h WHERE h.quest_id = q.id)`;

// A Quest for a Global Event counts as its event: it stays until the event ends, and it is in a window while the event's
// span overlaps it. An event without an end lasts until the end of its start's day.
function asItsEvent(now: Date, window: RecruitingSearch['window']): Prisma.Sql {
  const lastsUntil = (at: Date): Prisma.Sql =>
    Prisma.sql`(e.ends_at > ${timestamp(at)} OR (e.ends_at IS NULL AND e.starts_at >= ${timestamp(startOfSeoulDay(at))}))`;
  return Prisma.sql`e.state = 'published' AND ${lastsUntil(now)}${
    window === undefined
      ? Prisma.empty
      : Prisma.sql` AND e.starts_at < ${timestamp(window.to)} AND ${lastsUntil(window.from)}`
  }`;
}

// Any other Quest is in a window when it starts in it, and is gone once its start has passed. One without a start falls
// in no window, and is gone once its end has passed.
function asItsStart(now: Date, window: RecruitingSearch['window']): Prisma.Sql {
  return window === undefined
    ? Prisma.sql`(first_sub.starts_at >= ${timestamp(now)}
        OR (first_sub.starts_at IS NULL AND (first_sub.ends_at IS NULL OR first_sub.ends_at > ${timestamp(now)})))`
    : Prisma.sql`first_sub.starts_at >= ${timestamp(now)} AND first_sub.starts_at >= ${timestamp(window.from)}
        AND first_sub.starts_at < ${timestamp(window.to)}`;
}

function conditionsOf(readerId: string, search: RecruitingSearch, now: Date): Prisma.Sql[] {
  const { window, board, globalEventId, minPlacesLeft = 1, capacity } = search;
  return [
    Prisma.sql`q.join_policy IN ('open', 'approval')`,
    Prisma.sql`NOT EXISTS (SELECT 1 FROM quest_holders h WHERE h.quest_id = q.id AND h.user_id = ${readerId}::uuid)`,
    Prisma.sql`NOT EXISTS (SELECT 1 FROM quest_join_requests r WHERE r.quest_id = q.id AND r.user_id = ${readerId}::uuid)`,
    // The reader holds a Shared Quest for its event: two Holders tell a Shared Quest.
    Prisma.sql`NOT EXISTS (
      SELECT 1 FROM quest_holders mine
      WHERE mine.user_id = ${readerId}::uuid AND mine.global_event_id = q.global_event_id
        AND (SELECT count(*) FROM quest_holders h WHERE h.quest_id = mine.quest_id) > 1
    )`,
    Prisma.sql`q.capacity - ${HOLDERS} >= ${minPlacesLeft}`,
    Prisma.sql`(CASE WHEN first_sub.attending THEN ${asItsEvent(now, window)} ELSE ${asItsStart(now, window)} END)`,
    ...(board === undefined ? [] : [Prisma.sql`q.board::text = ${board}`]),
    ...(globalEventId === undefined ? [] : [Prisma.sql`q.global_event_id = ${globalEventId}::uuid`]),
    ...(capacity === undefined ? [] : [Prisma.sql`q.capacity = ${capacity}`]),
  ];
}

// The ids of the Quests found, in start order, those without a start last. Every filter is here, before the list is cut,
// so that a search stays quick however many Quests there are. The first Sub Quest is in the order that
// QUEST_INCLUDE reads them, and the attending one takes its time from the Global Event as it is now.
// Ties go by title in code points, which keeps Hangul in 가나다 order, so that every database gives the same list.
export async function recruitingSearchIds(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  readerId: string,
  search: RecruitingSearch,
  now: Date,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT q.id
    FROM quests q
    JOIN LATERAL (
      SELECT s.attending, s.starts_at, s.ends_at FROM sub_quests s
      WHERE s.quest_id = q.id
      ORDER BY s.attending DESC, s.created_at ASC, s.id ASC
      LIMIT 1
    ) first_sub ON true
    LEFT JOIN global_events e ON first_sub.attending AND e.id = q.global_event_id
    WHERE ${Prisma.join(conditionsOf(readerId, search, now), ' AND ')}
    ORDER BY COALESCE(e.starts_at, first_sub.starts_at) ASC NULLS LAST, q.title COLLATE "C" ASC, q.id ASC
    LIMIT ${search.take}`;
  return rows.map(({ id }) => id);
}
