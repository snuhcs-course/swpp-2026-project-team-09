/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Placement's assign: Quests by age and a tie on age, a Holder's own request, free places as the cap, pools by Global
// Event and size. Expected placements from match-server's README (Rounds, step 3) and P09-08.

import { type MatchingRequest } from '../src/generated/prisma/client.js';
import { assign } from '../src/matching/placement.service.js';

const CONCERT = 'global-event-concert';

// A standing request of a User of its own. assign takes the requests in the order they arrived.
function request(id: string, { globalEventId = CONCERT, size = 3 } = {}): MatchingRequest {
  return {
    id,
    userId: `user-${id}`,
    globalEventId,
    size,
    hashtags: [],
    state: 'waiting',
    arrivedAt: new Date(Date.UTC(2026, 9, 22, 8, 0)),
    matchId: null,
    questId: null,
  };
}

type EligibleQuest = Parameters<typeof assign>[1][number];

// An eligible Quest as the main server answers it, made `minute` minutes after 08:00 (UTC).
function quest(
  id: string,
  minute: number,
  { freePlaces = 1, holderIds = ['holder'] }: { freePlaces?: number; holderIds?: string[] } = {},
): EligibleQuest {
  const createdAt = new Date(Date.UTC(2026, 9, 22, 8, minute)).toISOString();
  return { id, globalEventId: CONCERT, capacity: 3, freePlaces, holderIds, createdAt };
}

// Each placement as the request's id and the Quest's id.
function placed(requests: MatchingRequest[], quests: EligibleQuest[]): string[][] {
  return assign(requests, quests).map((placement) => [placement.request.id, placement.quest.id]);
}

describe('The order in which eligible Quests take standing requests', () => {
  it('two Quests of a pool, answered newest first → the oldest takes the earliest requests first', () => {
    const [older, newer] = [quest('q-older', 1), quest('q-newer', 2, { freePlaces: 2 })];

    expect(placed([request('r1'), request('r2'), request('r3')], [newer, older])).toEqual([
      ['r1', 'q-older'],
      ['r2', 'q-newer'],
      ['r3', 'q-newer'],
    ]);
  });

  it('two Quests made at the same moment → the one whose id sorts first fills first', () => {
    const [b, a] = [quest('q-b', 1), quest('q-a', 1)];

    expect(placed([request('r1'), request('r2')], [b, a])).toEqual([
      ['r1', 'q-a'],
      ['r2', 'q-b'],
    ]);
  });
});

describe('The standing requests an eligible Quest takes', () => {
  it('a request whose User holds the Quest → skipped for it, and placed into the next Quest', () => {
    const holding = request('r1');
    const own = quest('q-own', 1, { freePlaces: 2, holderIds: [holding.userId] });

    expect(placed([holding, request('r2')], [own, quest('q-next', 2)])).toEqual([
      ['r2', 'q-own'],
      ['r1', 'q-next'],
    ]);
  });

  it.each([
    [0, []],
    [1, ['r1']],
    [2, ['r1', 'r2']],
    [3, ['r1', 'r2', 'r3']],
    [4, ['r1', 'r2', 'r3']],
  ])('three requests, free places %i → the earliest, as many as the free places', (freePlaces, expected) => {
    const requests = [request('r1'), request('r2'), request('r3')];

    expect(placed(requests, [quest('q', 1, { freePlaces })]).map(([id]) => id)).toEqual(expected);
  });

  it.each([
    ['another Global Event', { globalEventId: 'global-event-lecture' }],
    ['another size', { size: 2 }],
  ])('a request for %s than the Quest → not placed into it', (_, pool) => {
    expect(placed([request('r1', pool), request('r2')], [quest('q', 1)])).toEqual([['r2', 'q']]);
  });
});
