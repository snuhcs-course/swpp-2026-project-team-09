/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { waitingRoomOf } from '@/library/room-bookings';
import type { ChatSheetControl } from '../chat-sheet';
import { bindPartyRequest } from './room-party';

// The room-window Notification opens `/main?card=party:<questId>`. When this phone made the Quest's room request from a
// card that waited for the window, the answer frame shows that card again in the app's own bubble, bound to the
// request: once the window holds the date it reads the rooms and offers 예약하기 when everyone agreed. The server keeps no
// way to find a requester's request by its Quest, so a request made on another phone is not found here.

export const WINDOW_OPENED = '예약 창이 열렸어요';

export async function showWaitingRoom(questId: string, chat: ChatSheetControl): Promise<void> {
  const room = await waitingRoomOf(questId).catch(() => null);
  if (room === null) {
    return;
  }
  bindPartyRequest(room.card.key, room.requestId);
  chat.chat.addOwn({ text: WINDOW_OPENED, cards: [{ kind: 'library', library: room.card }] });
}
