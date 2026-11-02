/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { GROUP_ROOM, libraryCard, ROOM_NOTES } from '@/api/mock/data/library';
import type { RoomRequest } from '@/api/room-requests';
import { SEND_ASK } from '@/screens/main/library/room-party';
import { pass } from './app';
import type { FakeServer } from './fake-server';
import type { FakeLibrary } from './kwanjeong/fake-library';
import { askForCards, card, inCard, pressIn } from './library-chat';

// What the room request tests share: a room card with two Friends, the request in each status, the companions reply,
// and the card brought to "모두 동의했어요".

export const REQUEST_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
export const MIN_JUN = { friendId: 'bbbbbbbb-0000-4000-8000-000000000002', name: '김민준' };
export const JI_WOO = { friendId: 'bbbbbbbb-0000-4000-8000-000000000003', name: '서지우' };

export const PARTY_CARD = card(
  libraryCard('book:4F-group-6:2026-11-02:1700:60', 'book', {
    space: GROUP_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
    notes: ROOM_NOTES,
    companions: [MIN_JUN, JI_WOO],
  }),
);

export function requestOf(status: RoomRequest['status'], more: Partial<RoomRequest> = {}): RoomRequest {
  return {
    id: REQUEST_ID,
    status,
    questId: 'cccccccc-0000-4000-8000-000000000004',
    madeForBooking: true,
    requester: { userId: 'me', name: '홍길동' },
    space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDesc: null,
    reason: null,
    failed: null,
    consents: [MIN_JUN, JI_WOO].map(({ friendId, name }) => ({
      userId: friendId,
      name,
      consented: status === 'ready',
    })),
    ...more,
  };
}

export const COMPANIONS = [
  { userId: MIN_JUN.friendId, registeredName: '김민준', studentNumber: '2026-00002' },
  { userId: JI_WOO.friendId, registeredName: '서지우', studentNumber: '202600003' },
];

// The card with its request sent and every companion consenting by the next poll.
export async function readyCard({
  server,
  library,
}: {
  server: FakeServer;
  library: FakeLibrary;
}): Promise<ReturnType<typeof inCard>> {
  server.on('POST /library/room-requests', { status: 201, body: requestOf('gathering') });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('gathering') });
  await askForCards({ server, library }, [PARTY_CARD], { words: '민준, 지우랑 4층 스터디룸' });
  const shown = inCard(`library-book-${PARTY_CARD.library.key}`);
  await pressIn(shown, '과제');
  await pressIn(shown, SEND_ASK);
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('ready') });
  await pass(3500);
  return inCard(`library-book-${PARTY_CARD.library.key}`);
}
