/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type SentMessage } from './assistant.js';
import { type TestUser } from './friends.js';
import { find, LIBRARY, LibraryStage } from './library.js';
import { addClass } from './timetable.js';

// The library in the chat: findLibraryFreeSlots against a seeded Timetable, a library card sent back in the history
// by its key, and the chat's prompt.

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

function shown(id: string): SentMessage {
  return { role: 'assistant', text: '카드를 보여 드렸어요.', cards: [{ kind: 'library', id }] };
}

describe("A library card in the conversation's history", () => {
  const asked: SentMessage = { role: 'user', text: '7층 열람실 5시부터 한 시간' };
  const changed: SentMessage = { role: 'user', text: '6시로 바꿔줘' };

  it('goes back to the model by its key', async () => {
    const key = 'book:7F-7A-zone2:2026-11-04:1700:60';
    const response = await stage.send(user, [{ text: '…' }], LIBRARY, [asked, shown(key), changed]);

    expect(response.status).toBe(200);
    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain(`[Cards shown: library ${key}]`);
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
