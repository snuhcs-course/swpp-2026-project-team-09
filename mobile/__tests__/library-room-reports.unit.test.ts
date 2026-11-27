/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { roomRequests } from '@/api/room-requests';
import { reportRoomBooked, retryRoomReports } from '@/library/room-bookings';

// The report of a party's booking names the room the library booked (P05 ticket 68), kept with the report when it does
// not get through, and a queue kept before the room was reported is still sent.

jest.mock('@/api/room-requests', () => ({ roomRequests: { result: jest.fn() } }));

const result = jest.mocked(roomRequests.result);
const QUEUE = 'snunow.room-results';

beforeEach(async () => {
  await AsyncStorage.clear();
  result.mockReset();
});

// Partitions: reported at once, kept and sent again, a queue of the old shape. Expected values: P05 ticket 68's body.
describe("The report of a party's booking", () => {
  it('names the room the library booked', async () => {
    result.mockResolvedValue();

    await expect(reportRoomBooked('r1', 'G412')).resolves.toBe('reported');

    expect(result.mock.calls).toEqual([['r1', { ok: true, room: 'G412' }]]);
  });

  it('keeps the room with a report that did not get through, and sends both again', async () => {
    result.mockRejectedValueOnce(new Error('offline')).mockResolvedValue();

    await expect(reportRoomBooked('r1', 'G412')).resolves.toBe('queued');
    await retryRoomReports();

    expect(result.mock.calls).toEqual([
      ['r1', { ok: true, room: 'G412' }],
      ['r1', { ok: true, room: 'G412' }],
    ]);
    await expect(AsyncStorage.getItem(QUEUE)).resolves.toBe('[]');
  });

  it('sends a report kept before the room was reported, without a room', async () => {
    await AsyncStorage.setItem(QUEUE, JSON.stringify(['r-old']));
    result.mockResolvedValue();

    await retryRoomReports();

    expect(result.mock.calls).toEqual([['r-old', { ok: true }]]);
  });
});
