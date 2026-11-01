/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { roomRequests } from '@/api/room-requests';

// The phone's map from a room booking's BSEQNO to the room request it was booked for. It stays on the phone: the
// server is told only that the booking of a request was cancelled, never its number.

const KEY = 'snunow.room-bookings';

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
