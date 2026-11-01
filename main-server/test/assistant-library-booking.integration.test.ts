/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';
import { patchProfile } from './profile.js';

// proposeLibraryBooking at the Assistant's endpoint, with the scripted model in the model's place: the refusals with
// their reasons, and the book card filled from the catalogue and the checked request. The library is never called.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

const seatBooking = { spaceId: '7F-7A-zone2', date: '2026-11-04', start: '17:00', minutes: 60 };

const SEAT_CARD = {
  key: 'book:7F-7A-zone2:2026-11-04:1700:60:s=7193',
  action: 'book',
  space: {
    id: '7F-7A-zone2',
    name: '7A 열람실 2 구역',
    floor: 7,
    placeNumber: '62-1',
    unit: 'seat',
    roomNo: 172,
    sectorNo: 17202,
    seatNos: [],
    mapImage: { width: 2529, height: 1198 },
    hours: { open: '07:00', close: '23:00' },
    minMinutes: 30,
    maxMinutes: 360,
    stepMinutes: 30,
  },
  date: '2026-11-04',
  start: '17:00',
  minutes: 60,
  seat: '7193',
  useDesc: null,
  useDescOptions: null,
  pledge: null,
  companions: [],
  questId: null,
  notes: expect.arrayContaining([expect.stringContaining('30분 안에 좌석배정기')]) as unknown,
  until: null,
  target: null,
};

describe('A book card', () => {
  it('is filled from the catalogue and the checked request, and the model gets a summary', async () => {
    const booking = { tool: 'proposeLibraryBooking', input: { ...seatBooking, seat: '7193번' } };
    const response = await stage.send(user, [find(['7F-7A-zone2']), booking, { text: '카드를 보여 드렸어요.' }]);

    expect(response.status).toBe(200);
    expect(stage.model.toolResults()[1]).toEqual({
      result: 'shown',
      summary: '7층 7A 열람실 2 구역 7193, 오늘 17:00–18:00 예약 카드를 보여 줬어요. 예약하기를 눌러야 예약돼요.',
    });
    expect(libraryCards(response.body)).toEqual([SEAT_CARD]);
  });

  it('takes an end for the duration, and is shown once for the same request', async () => {
    const step = { tool: 'proposeLibraryBooking', input: { ...seatBooking, minutes: undefined, end: '19:00' } };
    const response = await stage.send(user, [find(['7F-7A-zone2']), step, step, { text: '…' }]);

    expect(libraryCards(response.body).map(({ key }) => key)).toEqual(['book:7F-7A-zone2:2026-11-04:1700:120']);
  });

  it('for a media room carries its 서약서 and the 사용용도 to choose', async () => {
    const studio = { spaceId: '6F-studio', date: '2026-11-05', start: '10:00', minutes: 60, seat: 'STUDIO A' };
    const response = await stage.send(user, [
      find(['6F-studio']),
      { tool: 'proposeLibraryBooking', input: studio },
      { text: '…' },
    ]);

    expect(libraryCards(response.body)).toMatchObject([
      {
        key: 'book:6F-studio:2026-11-05:1000:60:s=STUDIO A',
        space: { unit: 'room', seatNos: [16201001], mapImage: null },
        useDesc: null,
        useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '콘텐츠제작', '녹음', '기타'],
        pledge: expect.stringContaining('변상') as unknown,
      },
    ]);
    expect(stage.model.toolResults()[1]).toMatchObject({
      summary: expect.stringContaining('사용 용도는 카드에서 골라요') as unknown,
    });

    const stated = await stage.send(user, [
      find(['6F-studio']),
      { tool: 'proposeLibraryBooking', input: { ...studio, useDesc: '콘텐츠제작' } },
      { text: '…' },
    ]);

    expect(libraryCards(stated.body)).toMatchObject([{ useDesc: '콘텐츠제작', useDescOptions: null }]);
  });
});

describe('A refused booking', () => {
  it('lists every missing and wrong field at once, each with its reason, and shows no card', async () => {
    const asked = { spaceId: '7F-7A-zone2', date: '2026-11-05', seat: '1' };
    const response = await stage.send(user, [
      find(['7F-7A-zone2']),
      { tool: 'proposeLibraryBooking', input: asked },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[1]).toEqual({
      result: 'refused',
      refusals: [
        { field: 'date', reason: '열람실은 당일만 예약할 수 있어요', bound: '2026-11-04' },
        { field: 'start', reason: '몇 시부터 예약할지 알려 주세요' },
        { field: 'minutes', reason: '몇 시간 또는 몇 시까지 예약할지 알려 주세요' },
        { field: 'seat', reason: '1은 7A 열람실 2 구역의 자리가 아니에요', bound: '7193–7670' },
      ],
    });
    expect(libraryCards(response.body)).toEqual([]);
  });

  it('takes only a space findLibrarySpace returned in this message', async () => {
    const response = await stage.send(user, [{ tool: 'proposeLibraryBooking', input: seatBooking }, { text: '…' }]);

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(libraryCards(response.body)).toEqual([]);
  });
});

describe('A booking the catalogue refuses', () => {
  it('answers a space used on site, and 대학원 열람실 for a User whose 소속 is not 대학원, with its reason', async () => {
    await stage.send(user, [
      find(['6F-multimedia-viewing']),
      { tool: 'proposeLibraryBooking', input: { ...seatBooking, spaceId: '6F-multimedia-viewing' } },
      find(['8F-grad-reading-room']),
      { tool: 'proposeLibraryBooking', input: { ...seatBooking, spaceId: '8F-grad-reading-room' } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[1]).toMatchObject({
      result: 'notOnline',
      reason: expect.stringContaining('현장') as unknown,
    });
    expect(stage.model.toolResults()[3]).toMatchObject({ result: 'notEligible' });
  });

  it('refuses G201 for any number, with the party limit', async () => {
    const asked = { spaceId: '2F-group-20', date: '2026-11-05', start: '15:00', minutes: 60 };
    await stage.send(user, [find(['2F-group-20']), { tool: 'proposeLibraryBooking', input: asked }, { text: '…' }]);

    expect(stage.model.toolResults()[1]).toEqual({
      result: 'refused',
      refusals: [
        {
          field: 'friendIds',
          reason: '파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요',
          bound: 8,
        },
      ],
    });
  });
});

describe('대학원 열람실', () => {
  it('is booked by a User whose 소속 in 내 정보 is 대학원', async () => {
    const graduate = await stage.user('관정대학원생');
    await patchProfile(stage.app, graduate.accessToken, { affiliation: 'graduate' }).expect(200);
    const response = await stage.send(graduate, [
      find(['8F-grad-reading-room']),
      { tool: 'proposeLibraryBooking', input: { ...seatBooking, spaceId: '8F-grad-reading-room', seat: 'S001' } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[0]).toMatchObject({ spaces: [{ status: 'implemented' }] });
    expect(libraryCards(response.body)).toMatchObject([{ key: 'book:8F-grad-reading-room:2026-11-04:1700:60:s=S001' }]);
  });
});
