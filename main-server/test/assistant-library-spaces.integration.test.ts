/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';

// findLibrarySpace at the Assistant's endpoint, with the scripted model in the model's place: each id the model read
// the User's words as is answered with its status and catalogue facts, or 'several' when more than one can be booked.
// For an app that draws answers, several seat spaces give the first of them instead.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

describe('findLibrarySpace asking', () => {
  it('asks when several bookable spaces fit, naming them', async () => {
    const ids = ['7F-7A-zone1-notebook', '7F-notebook-171', '7F-7B-notebook'];

    expect(await stage.result(user, find(ids, '7층 노트북존'))).toEqual({
      result: 'several',
      candidates: [
        expect.objectContaining({ id: '7F-7A-zone1-notebook', name: '7층 7A 노트북존', floor: 7 }),
        expect.objectContaining({ id: '7F-notebook-171', floor: 7 }),
        expect.objectContaining({ id: '7F-7B-notebook', floor: 7 }),
      ],
    });
  });

  it('answers unsupported with what is supported when no id fits', async () => {
    expect(await stage.result(user, find([], '본관 3층'))).toMatchObject({
      result: 'unsupported',
      reason: '아직 미구현이에요.',
      supported: expect.stringContaining('열람실') as unknown,
    });
  });
});

describe('findLibrarySpace answering', () => {
  it('answers a bookable space with its facts', async () => {
    expect(await stage.result(user, find(['7F-7A-zone2']))).toEqual({
      result: 'found',
      spaces: [
        expect.objectContaining({
          id: '7F-7A-zone2',
          status: 'implemented',
          unit: 'seat',
          hours: { open: '07:00', close: '23:00' },
          durations: { min: 30, max: 360, step: 30 },
          window: '당일만',
          capacity: null,
          useDescOptions: null,
        }),
      ],
    });
  });

  it('answers the spaces that cannot be booked here with their reasons', async () => {
    const ids = ['6F-multimedia-viewing', 'main-library', 'nowhere', '8F-grad-reading-room'];

    expect(await stage.result(user, find(ids))).toEqual({
      result: 'found',
      spaces: [
        expect.objectContaining({ status: 'notOnline', reason: expect.stringContaining('현장 이용') as unknown }),
        expect.objectContaining({ id: 'main-library', status: 'unsupported', reason: '아직 미구현이에요.' }),
        expect.objectContaining({ id: 'nowhere', status: 'unsupported', name: null }),
        expect.objectContaining({ status: 'notEligible', reason: expect.stringContaining('대학원생') as unknown }),
      ],
    });
  });
});

describe('findLibrarySpace on rooms', () => {
  it("answers a room's window and G201's party limit", async () => {
    expect(await stage.result(user, find(['2F-group-20']))).toMatchObject({
      result: 'found',
      spaces: [
        {
          capacity: { min: 11, max: 20 },
          window: '오늘부터 3일 뒤(2026-11-07)까지',
          useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
          note: '파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요',
        },
      ],
    });
  });

  it("answers a sector's equipment groups", async () => {
    expect(await stage.result(user, find(['4F-group-6']))).toMatchObject({
      spaces: [{ equipment: [{ id: 'with-monitor', rooms: ['G405', 'G407', 'G411', 'G413'] }, {}, {}] }],
    });
  });
});

const ANSWER = { clientCapabilities: ['library', 'answer'] };

describe('findLibrarySpace for an app that draws answers', () => {
  it.each([
    ['7층 열람실', ['7F-7A-zone1-notebook', '7F-notebook-171', '7F-7B-notebook', '7F-7A-zone2'], '7F-7A-zone2'],
    ['노트북존', ['8F-8A-zone2-notebook', '7F-notebook-171', '7F-7A-zone1-notebook'], '7F-7A-zone1-notebook'],
    ['8층 노트북존', ['8F-notebook-181', '8F-8A-zone2-notebook'], '8F-8A-zone2-notebook'],
  ])('fills the first seat space "%s" fits, in catalogue order with 7F-7A-zone2 first', async (words, ids, first) => {
    expect(await stage.result(user, find(ids, words), ANSWER)).toEqual({
      result: 'found',
      spaces: [expect.objectContaining({ id: first, status: 'implemented', unit: 'seat' })],
    });
  });

  it('still asks when several rooms fit', async () => {
    expect(await stage.result(user, find(['6F-studio', '6F-creative-media-studio'], '스튜디오'), ANSWER)).toEqual({
      result: 'several',
      candidates: [
        expect.objectContaining({ id: '6F-studio' }),
        expect.objectContaining({ id: '6F-creative-media-studio' }),
      ],
    });
  });
});

describe('The card of a seat space filled for an app that draws answers', () => {
  it("shows the filled space's card with its kind, saying that it took the first of those that fit", async () => {
    const seat = { spaceId: '7F-7A-zone1-notebook', date: '2026-11-04', start: '11:00', minutes: 60 };
    const ids = ['7F-notebook-171', '7F-7A-zone1-notebook'];
    const response = await stage.send(
      user,
      [find(ids, '노트북존'), { tool: 'proposeLibraryBooking', input: seat }, { text: '…' }],
      ANSWER,
    );

    const cards = libraryCards(response.body);
    expect(cards).toMatchObject([
      { key: 'book:7F-7A-zone1-notebook:2026-11-04:1100:60', space: { kind: 'notebook-zone', floor: 7 } },
    ]);
    expect(cards[0]?.notes[0]).toBe('맞는 곳이 2곳이라 첫 곳으로 채웠어요');
  });

  it('says nothing of several for one space that fits', async () => {
    const seat = { spaceId: '7F-7B-notebook', date: '2026-11-04', start: '11:00', minutes: 60 };
    const response = await stage.send(
      user,
      [find(['7F-7B-notebook'], '7B 노트북존'), { tool: 'proposeLibraryBooking', input: seat }, { text: '…' }],
      ANSWER,
    );

    expect(libraryCards(response.body)[0]?.notes.some((note) => note.includes('첫 곳'))).toBe(false);
  });
});
