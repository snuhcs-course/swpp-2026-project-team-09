/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask } from './assistant.js';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';

// A space asked for today after its closing gets no card and says when it opens next (P05 ticket 57). On the user's
// phone (2026-11-26, 23:37), "관정 열람실 자리 있어?" was answered "…좌석 현황 카드를 보여 드렸어요. 빈 좌석은 카드에서
// 확인하실 수 있어요…" while 7층 열람실 had closed at 23:00 and no card could be seen. The clock stands at 23:37 on
// the stage's Wednesday 2026-11-04.

const LATE = new Date('2026-11-04T23:37:00+09:00');
const SEAT = '7F-7A-zone2';
const ANSWER = { clientCapabilities: ['library', 'answer'] };
const CLOSED = {
  result: 'refused',
  refusals: [{ field: 'date', reason: '열람실은 오늘 23:00에 닫았어요' }],
  closedToday: { closedAt: '23:00', opens: '내일 07:00' },
};
const GREY_MARK = {
  lookup: {
    kind: 'place',
    fact: true,
    actions: [],
    scene: { places: [{ role: 'dropped', tag: '관정도서관 · 오늘 23:00 닫음 · 내일 07:00부터' }] },
  },
};
const BOOK_TODAY = { tool: 'proposeLibraryBooking', input: { spaceId: SEAT, date: '2026-11-04' } };

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
    // 관정 drawn as a place with why, a grey mark with no main button (the user's choice, 2026-11-26).
    expect(response.body).toMatchObject(GREY_MARK);
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

// A free-seats question from an app that draws answers goes to proposeLibraryBooking (P05 ticket 61), which says the
// same as showLibrarySeats after the closing. Before, it was refused by the hours alone, with nothing drawn.
describe('A seat asked for today after its closing, from an app that draws answers', () => {
  it('is refused by proposeLibraryBooking as closed today, with 관정 drawn grey and no card', async () => {
    const response = await stage.send(
      user,
      [find([SEAT]), BOOK_TODAY, { text: '…' }],
      ANSWER,
      ask('관정 7층 자리 있어?'),
    );

    expect(stage.model.toolResults()[1]).toMatchObject(CLOSED);
    expect(libraryCards(response.body)).toEqual([]);
    expect(response.body).toMatchObject(GREY_MARK);
  });

  it('is refused as before in the text chat, with no closedToday and nothing drawn', async () => {
    const response = await stage.send(user, [find([SEAT]), BOOK_TODAY, { text: '…' }]);

    expect(stage.model.toolResults()[1]).not.toHaveProperty('closedToday');
    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'refused' });
    expect(response.body).toMatchObject({ lookup: null });
  });
});
