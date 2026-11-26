/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';

// A space asked for today after its closing gets no card and says when it opens next (P05 ticket 57). On the user's
// phone (2026-11-26, 23:37), "관정 열람실 자리 있어?" was answered "…좌석 현황 카드를 보여 드렸어요. 빈 좌석은 카드에서
// 확인하실 수 있어요…" while 7층 열람실 had closed at 23:00 and no card could be seen. The clock stands at 23:37 on
// the stage's Wednesday 2026-11-04.

const LATE = new Date('2026-11-04T23:37:00+09:00');
const SEAT = '7F-7A-zone2';
const CLOSED = {
  result: 'refused',
  refusals: [{ field: 'date', reason: '열람실은 오늘 23:00에 닫았어요' }],
  closedToday: { closedAt: '23:00', opens: '내일 07:00' },
};

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  vi.spyOn(stage.app.get<Clock>(CLOCK), 'now').mockReturnValue(LATE);
  user = await stage.user();
});

afterAll(() => stage.stop());

describe('A reading room asked for after its closing', () => {
  it('shows no seats card, and says it closed and when it opens', async () => {
    const response = await stage.send(user, [
      find([SEAT]),
      { tool: 'showLibrarySeats', input: { spaceId: SEAT } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[1]).toMatchObject(CLOSED);
    expect(libraryCards(response.body)).toEqual([]);
  });

  it('is said closed by findLibrarySpace, and refused by findLibraryFreeSlots rather than as no 공강', async () => {
    await stage.send(user, [
      find([SEAT]),
      { tool: 'findLibraryFreeSlots', input: { spaceId: SEAT, date: '2026-11-04' } },
      { text: '…' },
    ]);

    const [found, slots] = stage.model.toolResults();
    expect(found).toMatchObject({ result: 'found', spaces: [{ id: SEAT, closedToday: CLOSED.closedToday }] });
    expect(slots).toMatchObject(CLOSED);
  });
});
