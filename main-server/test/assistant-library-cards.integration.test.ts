/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { find, libraryCards, LibraryStage } from './library.js';

// The library cards other than book at the Assistant's endpoint, with the scripted model in the model's place: cancel,
// return, seats and myBookings, by their keys, and an app that cannot show any of them.

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start(inject('settings'));
  user = await stage.user();
});

afterAll(() => stage.stop());

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
    expect(stage.model.toolResults()[1]).toEqual({
      result: 'shown',
      summary: '예약 취소 카드를 보여 줬어요. 취소하기를 눌러야 취소돼요.',
    });
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
