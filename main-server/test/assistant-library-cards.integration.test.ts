/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';
import { withAccessToken } from './sign-in.js';

// The library cards other than book at the Assistant's endpoint, with the scripted model in the model's place: cancel,
// return, seats and myBookings, by their keys, and an app that cannot show any of them.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

// A seat booked through the app's card today, as the app tells the main server after 예약하기.
async function bookedSeat(owner: TestUser, start: string): Promise<void> {
  await withAccessToken(request(stage.app.getHttpServer()).post('/library/seat-stays'), owner.accessToken)
    .set('Idempotency-Key', randomUUID())
    .send({ spaceId: '7F-7A-zone2', date: '2026-11-04', start, minutes: 120 })
    .expect(201);
}

describe('Cancel and return cards', () => {
  it('carry the target the User named, or none', async () => {
    const response = await stage.send(user, [
      find(['4F-group-6']),
      { tool: 'proposeLibraryCancel', input: { date: '2026-11-05', spaceId: '4F-group-6', start: '15:00' } },
      { tool: 'proposeLibraryCancel', input: {} },
      { tool: 'proposeLibraryReturn', input: {} },
      { text: '…' },
    ]);

    expect(libraryCards(response.body)).toMatchObject([
      {
        key: 'cancel:4F-group-6:2026-11-05:1500',
        action: 'cancel',
        target: { date: '2026-11-05', spaceId: '4F-group-6', start: '15:00' },
        space: { id: '4F-group-6' },
      },
      { key: 'cancel:-:-:-', action: 'cancel', target: {}, space: null },
      { key: 'return:-', action: 'return', target: {}, space: null },
    ]);
    expect(stage.model.toolResults()[1]).toEqual({ result: 'shown', summary: '예약 취소를 눌러야 취소돼요.' });
    expect(stage.model.toolResults()[3]).toEqual({ result: 'shown', summary: '반납하기를 눌러야 반납돼요.' });
  });
});

// On the user's phone (2026-11-27), "반납해줘" for a seat booked but not yet in use was answered "반납 카드를 보여
// 드렸어요…", and the return card said "지금 사용 중인 좌석이 없어요": a seat is returned only once confirmed at the
// 좌석배정기, so one not yet started is cancelled.
describe('A return asked for a seat booked through the app', () => {
  it('shows the cancel card of that booking while its time has not started, and says notInUse', async () => {
    const owner = await stage.user('예약만한학생');
    await bookedSeat(owner, '14:00');

    const response = await stage.send(owner, [{ tool: 'proposeLibraryReturn', input: {} }, { text: '…' }]);

    expect(libraryCards(response.body)).toMatchObject([
      {
        key: 'cancel:-:2026-11-04:1400',
        action: 'cancel',
        target: { date: '2026-11-04', start: '14:00' },
        space: null,
      },
    ]);
    expect(stage.model.toolResults()).toEqual([
      {
        result: 'shown',
        notInUse: true,
        summary: '14:00부터 예약한 자리는 아직 사용 전이라 반납이 아니라 취소해요. 예약 취소를 눌러야 취소돼요.',
      },
    ]);
  });

  it('shows the return card once its time has started', async () => {
    const owner = await stage.user('앉아있는학생');
    await bookedSeat(owner, '10:00');

    const response = await stage.send(owner, [{ tool: 'proposeLibraryReturn', input: {} }, { text: '…' }]);

    expect(libraryCards(response.body)).toMatchObject([{ key: 'return:-', action: 'return', target: {} }]);
    expect(stage.model.toolResults()).toEqual([{ result: 'shown', summary: '반납하기를 눌러야 반납돼요.' }]);
  });

  it('shows the return card for a room named, whatever the seat', async () => {
    const owner = await stage.user('방쓰는학생');
    await bookedSeat(owner, '14:00');

    const response = await stage.send(owner, [
      find(['4F-group-6']),
      { tool: 'proposeLibraryReturn', input: { spaceId: '4F-group-6' } },
      { text: '…' },
    ]);

    expect(libraryCards(response.body)).toMatchObject([{ key: 'return:4F-group-6', action: 'return' }]);
  });
});

describe('Seats and myBookings cards', () => {
  it('show a seat map today, a room sector at a time, and the bookings of a period', async () => {
    const response = await stage.send(user, [
      find(['8F-8A-zone1-quiet']),
      { tool: 'showLibrarySeats', input: { spaceId: '8F-8A-zone1-quiet' } },
      find(['4F-group-6']),
      { tool: 'showLibrarySeats', input: { spaceId: '4F-group-6', date: '2026-11-06', start: '15:00' } },
      { tool: 'showMyLibraryBookings', input: {} },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[1]).toEqual({
      result: 'shown',
      summary: '8층 8A 열람실 1 구역(QUIET ZONE)의 오늘 좌석 현황이 아래에 나와요.',
    });
    expect(stage.model.toolResults()[4]).toEqual({
      result: 'shown',
      summary: '관정도서관 예약마다 지금 상태가 아래에 나와요.',
    });
    expect(libraryCards(response.body)).toMatchObject([
      {
        key: 'seats:8F-8A-zone1-quiet:2026-11-04',
        space: { mapImage: { width: 1190, height: 1198 } },
        date: '2026-11-04',
        start: null,
      },
      { key: 'seats:4F-group-6:2026-11-06:1500:120', start: '15:00', minutes: 120 },
      { key: 'myBookings:2026-10-28:2026-11-07', action: 'myBookings', date: '2026-10-28', until: '2026-11-07' },
    ]);
  });

  it('refuse the seats of a reading room for another day', async () => {
    const response = await stage.send(user, [
      find(['8F-8A-zone1-quiet']),
      { tool: 'showLibrarySeats', input: { spaceId: '8F-8A-zone1-quiet', date: '2026-11-05' } },
      { text: '…' },
    ]);

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'refused', refusals: [{ field: 'date' }] });
    expect(libraryCards(response.body)).toEqual([]);
  });
});

describe('An app that cannot show library cards', () => {
  it('gets the update reason from every library tool, and no card', async () => {
    const booking = { spaceId: '7F-7A-zone2', date: '2026-11-04', start: '17:00', minutes: 60 };
    const steps = [
      find(['7F-7A-zone2']),
      { tool: 'proposeLibraryBooking', input: booking },
      { tool: 'showMyLibraryBookings', input: {} },
      { text: '…' },
    ];
    const response = await stage.send(user, steps, {});
    const reason = { result: 'none', reason: '이 앱 버전에서는 도서관 예약을 할 수 없어요. 앱을 업데이트해 주세요.' };

    expect(stage.model.toolResults()).toEqual([reason, reason, reason]);
    expect(libraryCards(response.body)).toEqual([]);
  });

  it('is refused a capability the server does not know', async () => {
    expect(await stage.send(user, [{ text: '…' }], { clientCapabilities: ['teleport'] })).toHaveProperty('status', 400);
  });
});
