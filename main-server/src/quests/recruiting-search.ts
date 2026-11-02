/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { METRES_PER_DEGREE } from '../common/geometry.js';
import { eventLastsUntil, eventOverlaps, moreWordsFirst, timestamp } from '../common/search-sql.js';
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
  // Rank the Quests and drop none.
  words?: readonly string[];
  // Only the Quests with a position within these metres of the Place, both ends included.
  near?: { placeId: string; metres: number };
  // The most Quests answered.
  take: number;
}

const HOLDERS = Prisma.sql`(SELECT count(*) FROM quest_holders h WHERE h.quest_id = q.id)`;

// A Quest's position is its first Sub Quest's: its Global Event's, its Place's or its point. With none, it has words only.
const QUEST_LATITUDE = Prisma.sql`COALESCE(e.latitude, p.latitude, first_sub.latitude)`;
const QUEST_LONGITUDE = Prisma.sql`COALESCE(e.longitude, p.longitude, first_sub.longitude)`;

// geometry.ts's metresBetween(the Quest's position, the Place near), written the same way so that both give one answer:
// the east metres read the Quest's latitude.
const METRES_FROM_NEAR = Prisma.sql`sqrt(
  power((${QUEST_LONGITUDE} - near.longitude) * (${METRES_PER_DEGREE}::float8 * cos(${QUEST_LATITUDE} * pi() / 180)), 2)
  + power((${QUEST_LATITUDE} - near.latitude) * ${METRES_PER_DEGREE}::float8, 2)
)`;

// A Quest for a Global Event counts as its event: it stays until the event ends, and it is in a window while the event's
// span overlaps it.
function asItsEvent(now: Date, window: RecruitingSearch['window']): Prisma.Sql {
  return Prisma.sql`e.state = 'published' AND ${eventLastsUntil(now)}${
    window === undefined ? Prisma.empty : Prisma.sql` AND ${eventOverlaps(window)}`
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
  const { window, board, globalEventId, minPlacesLeft = 1, capacity, near } = search;
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
    ...(near === undefined ? [] : [Prisma.sql`${METRES_FROM_NEAR} <= ${near.metres}::float8`]),
  ];
}

// The ids of the Quests found: those holding more of the words first, then in start order, those without a start last.
// Every filter is here, before the list is cut, so that a search stays quick however many Quests there are. The first
// Sub Quest is in the order that QUEST_INCLUDE reads them, and the attending one takes its time and position from the
// Global Event as it is now. Ties go by title in code points, which keeps Hangul in 가나다 order, so that every database
// gives the same list.
export async function recruitingSearchIds(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  readerId: string,
  search: RecruitingSearch,
  now: Date,
): Promise<string[]> {
  const { words = [], near } = search;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT q.id
    FROM quests q
    JOIN LATERAL (
      SELECT s.attending, s.starts_at, s.ends_at, s.place_id, s.latitude, s.longitude FROM sub_quests s
      WHERE s.quest_id = q.id
      ORDER BY s.attending DESC, s.created_at ASC, s.id ASC
      LIMIT 1
    ) first_sub ON true
    LEFT JOIN global_events e ON first_sub.attending AND e.id = q.global_event_id
    LEFT JOIN places p ON p.id = first_sub.place_id
    ${near === undefined ? Prisma.empty : Prisma.sql`JOIN places near ON near.id = ${near.placeId}::uuid`}
    WHERE ${Prisma.join(conditionsOf(readerId, search, now), ' AND ')}
    ORDER BY ${moreWordsFirst(words, Prisma.sql`q.title`, Prisma.sql`q.description`)}
      COALESCE(e.starts_at, first_sub.starts_at) ASC NULLS LAST, q.title COLLATE "C" ASC, q.id ASC
    LIMIT ${search.take}`;
  return rows.map(({ id }) => id);
}
