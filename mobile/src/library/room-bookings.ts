/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnswerReply, LibraryCardData } from '@/api/assistant-types';
import { ApiError } from '@/api/errors';
import { roomRequests } from '@/api/room-requests';
import { field, isText } from '@/api/server/answers';
import { isLibraryCardData } from '@/api/server/library-card-answers';
import { isAnswerReply } from '@/api/server/plan-answers';
import { leavingOnPurpose } from '@/features/quests/leaving';

// The phone's map from a room booking's BSEQNO to the room request it was booked for. It stays on the phone: the
// server is told only that the booking of a request was cancelled, never its number.

const KEY = 'snunow.room-bookings';

// The room requests whose booking was made but not yet reported, retried on the next start and the next poll.
const RESULTS = 'snunow.room-results';

// The requests made from a card that waits for the booking window, by their Quest, with that card: the room-window
// Notification opens the Quest's card, and the phone shows the booking card again from this.
const WAITING = 'snunow.waiting-rooms';

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
  const cancel = async (): Promise<boolean> => {
    try {
      await roomRequests.cancelled(requestId);
      return true;
    } catch {
      return false;
    }
  };
  // A booking party goes with the cancel. It leaves the User's list by their own doing, and is not told as a removal.
  const request = await roomRequests.get(requestId).catch(() => null);
  const reported = request?.madeForBooking === true ? await leavingOnPurpose(request.questId, cancel) : await cancel();
  if (!reported) {
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

export interface WaitingRoom {
  requestId: string;
  card: LibraryCardData;
}

function isWaitingRoom(value: unknown): value is WaitingRoom {
  return isText(field(value, 'requestId')) && isLibraryCardData(field(value, 'card'));
}

async function readWaiting(): Promise<Record<string, WaitingRoom>> {
  try {
    const value = await AsyncStorage.getItem(WAITING);
    const parsed: unknown = value === null ? {} : JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, WaitingRoom] => isWaitingRoom(entry[1])),
    );
  } catch {
    return {};
  }
}

export async function keepWaitingRoom(questId: string, room: WaitingRoom): Promise<void> {
  const waiting = await readWaiting();
  await AsyncStorage.setItem(WAITING, JSON.stringify({ ...waiting, [questId]: room }));
}

export async function waitingRoomOf(questId: string): Promise<WaitingRoom | null> {
  return (await readWaiting())[questId] ?? null;
}

// Once the room is booked.
export async function forgetWaitingRoom(questId: string): Promise<void> {
  const { [questId]: _gone, ...rest } = await readWaiting();
  await AsyncStorage.setItem(WAITING, JSON.stringify(rest));
}

// The study answers together the requests were sent from, by their booking party (P10 ticket 13): the sending phone
// shows one again from here when the main server cannot rebuild it (GET …/:id/answer is newer). The last few only.
const ANSWERS = 'snunow.request-answers';
const ANSWERS_KEPT = 8;

export interface RequestAnswer {
  requestId: string;
  answer: AnswerReply;
}

function isRequestAnswer(value: unknown): value is RequestAnswer {
  return isText(field(value, 'requestId')) && isAnswerReply(field(value, 'answer'));
}

async function readAnswers(): Promise<[string, RequestAnswer][]> {
  try {
    const value = await AsyncStorage.getItem(ANSWERS);
    const parsed: unknown = value === null ? [] : JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry: unknown): entry is [string, RequestAnswer] =>
            Array.isArray(entry) && isText(entry[0]) && isRequestAnswer(entry[1]),
        )
      : [];
  } catch {
    return [];
  }
}

export async function keepRequestAnswer(questId: string, kept: RequestAnswer): Promise<void> {
  const others = (await readAnswers()).filter(([id]) => id !== questId);
  await AsyncStorage.setItem(ANSWERS, JSON.stringify([...others, [questId, kept]].slice(-ANSWERS_KEPT)));
}

export async function requestAnswerOf(questId: string): Promise<RequestAnswer | null> {
  return (await readAnswers()).find(([id]) => id === questId)?.[1] ?? null;
}

// For the end of the library session: nothing of this person's room bookings stays on the phone.
export async function forgetRoomBookings(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, RESULTS, WAITING, ANSWERS]);
}
