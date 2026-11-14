/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { z } from 'zod';
import { type LibraryCardBody } from './library.js';
import { companionsOf, friendIdsOf, type Group, SITE_NOTES, StudyStage } from './study-groups.js';

// A study on a day after the booking window, on the stage's example week (test/study-groups.ts): the card makes a room
// request that waits for the window, and the booker is told at 09:00 on the day the window opens, Friday 2026-11-20
// for Monday 2026-11-23.

// Each group signs in four Users and befriends them over HTTP before it starts.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

const stage = new StudyStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

const madeSchema = z.object({ id: z.string(), questId: z.string() });

let people: Group;
let card: LibraryCardBody | undefined;
let result: unknown;

beforeAll(async () => {
  people = await stage.group();
  const shown = await stage.study(people, { date: '2026-11-23' });
  [card] = shown.cards;
  ({ result } = shown);
});

describe('A study on Monday, after the booking window', () => {
  it("shows a card whose request waits for the window, with the day it opens and each one's note", () => {
    expect(card).toMatchObject({
      key: 'book:4F-group-6:2026-11-23:0900:180:wait',
      date: '2026-11-23',
      start: '09:00',
      minutes: 180,
      companions: companionsOf(people),
      notes: [
        '예약 창이 열리는 11월 20일 09:00에 알려 드려요. 동의는 먼저 받아 둬요',
        '나 09:00부터',
        '민수 09:00부터',
        '지은 09:00부터',
        '서준 09:00부터',
        ...SITE_NOTES,
      ],
    });
    expect(result).toMatchObject({
      result: 'shown',
      summary:
        '2026-11-23(월) 09:00–12:00 관정 4층 6인실, 4명 예약 카드를 보여 줬어요. 예약 창은 11월 20일 09:00에 열려요. 동의를 먼저 받아 두고, 그때 알려 드려요.',
      windowOpens: '2026-11-20',
    });
  });
});

describe("The card's room request", () => {
  it("is made without the window's refusal, which the same key not waiting has", async () => {
    const friendIds = friendIdsOf(people);
    const refused = await stage.makeRequest(people.me, { key: 'book:4F-group-6:2026-11-23:0900:180', friendIds });

    expect(refused.status).toBe(400);
    expect(refused.body).toMatchObject({ message: '그룹스터디룸은 3일 뒤까지만 예약할 수 있어요' });

    const made = await stage.makeRequest(people.me, { key: card?.key, friendIds });

    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ status: 'gathering', date: '2026-11-23', start: '09:00', minutes: 180 });

    const { questId } = madeSchema.parse(made.body);
    const kept = await vi.waitFor(async () => {
      const found = (await stage.notifications(people.me)).filter(({ kind }) => kind === 'room-window');
      expect(found).toHaveLength(1);
      return found;
    });

    expect(kept).toEqual([
      {
        kind: 'room-window',
        title: '예약 창이 열렸어요',
        ahead: '11월 20일 09:00 예약 창 열림',
        line: '월 09:00–12:00 스터디',
        at: '2026-11-20T09:00:00+09:00',
        url: `/main?card=party:${questId}`,
      },
    ]);
    for (const friend of [people.minsu, people.jieun, people.seojun]) {
      // oxlint-disable-next-line no-await-in-loop -- one User at a time
      expect(await stage.kinds(friend)).not.toContain('room-window');
    }
  });
});

describe('A waiting request that ends before the window opens', () => {
  it('takes back "예약 창이 열렸어요"', async () => {
    const group = await stage.group();
    const { cards } = await stage.study(group, { date: '2026-11-24' });
    const made = await stage.makeRequest(group.me, { key: cards[0]?.key, friendIds: friendIdsOf(group) });
    expect(made.status).toBe(201);
    const { id } = madeSchema.parse(made.body);
    await vi.waitFor(async () => {
      expect(await stage.kinds(group.me)).toContain('room-window');
    });

    for (const friend of [group.minsu, group.jieun, group.seojun]) {
      // oxlint-disable-next-line no-await-in-loop -- one answer at a time
      await stage.roomRequest(friend, `${id}/decline`, 'post').expect(204);
    }

    await vi.waitFor(async () => {
      expect(await stage.kinds(group.me)).not.toContain('room-window');
    });
    expect((await stage.roomRequest(group.me, id)).body).toMatchObject({ status: 'dissolved' });
  });
});
