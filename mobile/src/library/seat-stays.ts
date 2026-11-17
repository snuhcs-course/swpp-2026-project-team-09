/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';

// The phone's map from a seat booking's BSEQNO to the Quest of its stay (P05-14). It stays on the phone: the server is
// told only that the Quest ends, never the booking's number.

const KEY = 'snunow.seat-stays';

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

export async function keepSeatStay(bseqno: string, questId: string): Promise<void> {
  const map = await readMap();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...map, [bseqno]: questId }));
}

// After setCancelBooking succeeded for the BSEQNO, a cancel or a return: the stay's Quest ends with its leave-by, for a
// User at a seat they gave back is not there. A Quest already gone counts as ended; a report that fails is kept for the
// next cancel of the same booking. A seat the phone never reports, such as one the kiosk returned, ends at its time.
export async function endSeatStay(bseqno: number | string): Promise<void> {
  const key = String(bseqno);
  const map = await readMap();
  const questId = map[key];
  if (questId === undefined) {
    return;
  }
  try {
    await apiClient.dropQuest(questId);
  } catch (error: unknown) {
    if (!(error instanceof ApiError && error.status === 404)) {
      return;
    }
  }
  const { [key]: _ended, ...rest } = map;
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
}
