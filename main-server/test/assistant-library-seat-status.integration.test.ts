/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { ask } from './assistant.js';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';

// A question about free seats in a reading room, from an app that draws answers, is asked as a request for a seat
// (P05 ticket 61): findLibrarySpace, then proposeLibraryBooking, whose book card the app draws as the seat ticket
// with its free seats. Until then it went to showLibrarySeats, whose seats card the reply pointed at in two sentences.
// The clock stands at 10:05 on the stage's Wednesday 2026-11-04.

const ANSWER = { clientCapabilities: ['library', 'answer'] };
const SEVENTH_FLOOR = ['7F-7A-zone1-notebook', '7F-7A-zone2', '7F-notebook-171', '7F-7B-notebook'];
const RULE = 'such as "관정 열람실 자리 있어?" or "7층 자리 얼마나 남았어?", and a request for its 좌석 현황';

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

describe('"관정 7층 자리 있어?" from an app that draws answers', () => {
  it('is told to the model as a request for that seat, and shows the book card, not the seats card', async () => {
    const response = await stage.send(
      user,
      [
        find(SEVENTH_FLOOR, '관정 7층 자리'),
        { tool: 'proposeLibraryBooking', input: { spaceId: '7F-7A-zone2', date: '2026-11-04' } },
        { text: '…' },
      ],
      ANSWER,
      ask('관정 7층 자리 있어?'),
    );

    expect(response.status).toBe(200);
    expect(stage.model.system()).toContain(RULE);
    expect(stage.model.system()).toContain('then proposeLibraryBooking as for any seat, and never showLibrarySeats');
    const cards = libraryCards(response.body);
    expect(cards.map(({ key }) => key)).toEqual(['book:7F-7A-zone2:2026-11-04:1030:360']);
    expect(cards.filter(({ action }) => action === 'seats')).toEqual([]);
  });

  it('is still sent to showLibrarySeats by the text chat', async () => {
    await stage.send(user, [{ text: '…' }], undefined, ask('7A 열람실 2 구역 자리 있어?')).expect(200);

    expect(stage.model.system()).toContain(
      'To see free seats or rooms of one space (좌석 현황), call findLibrarySpace, then showLibrarySeats.',
    );
    expect(stage.model.system()).not.toContain(RULE);
  });
});
