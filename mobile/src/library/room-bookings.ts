/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@/api/errors';
import { roomRequests } from '@/api/room-requests';

// The phone's map from a room booking's BSEQNO to the room request it was booked for. It stays on the phone: the
// server is told only that the booking of a request was cancelled, never its number.

const KEY = 'snunow.room-bookings';

// The room requests whose booking was made but not yet reported, retried on the next start and the next poll.
const RESULTS = 'snunow.room-results';

async function readMap(): Promise<Record<string, string>> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    const parsed: unknown = value === null ? {} : JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

export async function keepRoomBooking(bseqno: number, requestId: string): Promise<void> {
  const map = await readMap();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...map, [String(bseqno)]: requestId }));
}

// After setCancelBooking succeeded for the BSEQNO: tells the server, with no body, when it was a request's booking.
// A report that fails is kept for the next cancel of the same booking, which the server takes as a repeat.
export async function reportRoomCancelled(bseqno: number): Promise<void> {
  const map = await readMap();
  const requestId = map[String(bseqno)];
  if (requestId === undefined) {
    return;
  }
  try {
    await roomRequests.cancelled(requestId);
  } catch {
    return;
  }
  const { [String(bseqno)]: _gone, ...rest } = map;
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
}

async function readQueue(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(RESULTS);
    const parsed: unknown = value === null ? [] : JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function writeQueue(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(RESULTS, JSON.stringify(ids));
}

// What reporting a booking made came to: told, kept to retry, or refused because the request had ended meanwhile
// (a companion left, say), when the room is booked all the same.
export type BookedReport = 'reported' | 'queued' | 'ended';

// The server refuses a report of a request no longer ready, or gone.
function ended(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.status === 404);
}

async function report(requestId: string): Promise<BookedReport> {
  try {
    await roomRequests.result(requestId, { ok: true });
    return 'reported';
  } catch (error) {
    return ended(error) ? 'ended' : 'queued';
  }
}

// Tells the server the booking of the request was made. A report that does not get through is kept and retried.
export async function reportRoomBooked(requestId: string): Promise<BookedReport> {
  const reported = await report(requestId);
  if (reported === 'queued') {
    const queue = await readQueue();
    await writeQueue([...queue.filter((id) => id !== requestId), requestId]);
  }
  return reported;
}

// Sends the kept reports again; each that gets through, or that the server refuses as ended, leaves the queue.
export async function retryRoomReports(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) {
    return;
  }
  const left: string[] = [];
  for (const requestId of queue) {
    // oxlint-disable-next-line no-await-in-loop -- one report at a time
    if ((await report(requestId)) === 'queued') {
      left.push(requestId);
    }
  }
  await writeQueue(left);
}

// For the end of the library session: nothing of this person's room bookings stays on the phone.
export async function forgetRoomBookings(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, RESULTS]);
}
