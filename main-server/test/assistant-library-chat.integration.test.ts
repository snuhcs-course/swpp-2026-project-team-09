/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { type SentMessage } from './assistant.js';
import { type TestUser } from './friends.js';
import { find, LIBRARY, LibraryStage } from './library.js';
import { addClass } from './timetable.js';

// The library in the chat: findLibraryFreeSlots against a seeded Timetable, a library card sent back in the history,
// and the chat's prompt.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

const around = expect.stringContaining('관정자료구조') as unknown;

describe('findLibraryFreeSlots', () => {
  it("answers the User's Free Time within the hours, aligned to 30 minutes and cut to the longest booking", async () => {
    const student = await stage.user('공강학생');
    const times = [
      { weekday: 'wednesday', startTime: '09:00', endTime: '10:20', placeId: null, room: '301호' },
      { weekday: 'wednesday', startTime: '12:10', endTime: '13:00', placeId: null, room: '301호' },
    ];
    await addClass(stage.app, student.accessToken, { courseName: '관정자료구조', times });
    const slots = { tool: 'findLibraryFreeSlots', input: { spaceId: '7F-7A-zone2', date: '2026-11-04', minutes: 60 } };
    const response = await stage.send(student, [find(['7F-7A-zone2']), slots, { text: '…' }]);

    expect(response.status).toBe(200);
    expect(stage.model.toolResults()[1]).toEqual({
      result: 'found',
      date: '2026-11-04',
      slots: [
        { start: '10:30', end: '12:00', before: around, after: around },
        { start: '13:00', end: '19:00', freeUntil: '23:00', before: around, after: null },
      ],
    });
    expect(JSON.stringify(stage.model.received())).not.toContain('301호');
  });

  it('refuses a day outside the window', async () => {
    const slots = { tool: 'findLibraryFreeSlots', input: { spaceId: '7F-7A-zone2', date: '2026-11-05' } };
    await stage.send(user, [find(['7F-7A-zone2']), slots, { text: '…' }]);

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'refused', refusals: [{ field: 'date' }] });
  });
});

function shown(...ids: string[]): SentMessage {
  return { role: 'assistant', text: '카드를 보여 드렸어요.', cards: ids.map((id) => ({ kind: 'library', id })) };
}

describe("A library card in the conversation's history", () => {
  const asked: SentMessage = { role: 'user', text: '7층 열람실 5시부터 한 시간' };
  const changed: SentMessage = { role: 'user', text: '6시로 바꿔줘' };

  it('goes back to the model as the User left it: a book card in words, any other by its key', async () => {
    const book = 'book:7F-7A-zone2:2026-11-04:1700:60:s=7300';
    const seats = 'seats:7F-7A-zone2:2026-11-04';
    const response = await stage.send(user, [{ text: '…' }], LIBRARY, [asked, shown(book, seats), changed]);

    expect(response.status).toBe(200);
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain(
      `[Cards shown: library card for 관정 7층 열람실, seat 7300, 11/04 17:00–18:00, as the User left it, library ${seats}]`,
    );
  });

  // On the phone (2026-11-27) the User switched the card proposed for 7층 7A to 8층 and booked it. The model read its
  // own 7A words beside the bare 8층 key and called its words wrong ("…라고 한 건 잘못이었어요").
  it('names the room the User switched to on the phone, beside earlier words that named another', async () => {
    const proposed: SentMessage = {
      role: 'assistant',
      text: '관정도서관 7층 7A 열람실 2 구역에 14:00부터 17:00까지 자리를 골라 뒀어요. 예약하기를 눌러야 예약돼요.',
      cards: [{ kind: 'library', id: 'book:8F-8A-zone1-quiet:2026-11-04:1400:180' }],
    };
    const thanks: SentMessage = { role: 'user', text: '고마워, 거기 몇 시까지야?' };
    const response = await stage.send(user, [{ text: '…' }], LIBRARY, [asked, proposed, thanks]);

    expect(response.status).toBe(200);
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain(
      '[Cards shown: library card for 관정 8층 정숙 열람실, 11/04 14:00–17:00, as the User left it]',
    );
  });

  it('is refused when its key does not follow the grammar', async () => {
    const messages = [asked, shown('book:7F-7A-zone2:tomorrow'), changed];

    expect(await stage.send(user, [{ text: '…' }], LIBRARY, messages)).toHaveProperty('status', 400);
  });
});

describe("The chat's prompt", () => {
  it('no longer says that study spaces are not supported', async () => {
    await stage.send(user, [{ text: '…' }]);

    expect(stage.model.system()).not.toContain('Study spaces');
  });
});
