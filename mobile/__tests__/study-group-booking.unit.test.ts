/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_GROUP_READY } from '@/api/mock/data/study-group-answers';
import type { RoomRequest } from '@/api/room-requests';
import type { StudyGroup } from '@/api/study-plan-types';
import type { LibraryRoomTimes } from '@/library/replies';
import type { PartyRequest } from '@/screens/main/library/room-party';
import { mainOf } from '@/screens/main/answer/study-group-act';
import { noRoomOf, readyLineOf, roomOnReady, waitWords } from '@/screens/main/answer/study-group-booking';
import roomList from './support/kwanjeong/getRoomList_14103_20261105.json';

// Booking the room once everyone has consented (P10 ticket 14; design group-study-design 다 라,
// group-study-resume 5 and 3 나 다 라): what the card says and its main button, by the room read again, the library
// session and the booking window.

const GROUP = STUDY_GROUP_READY.plans[0]?.study?.group as StudyGroup;
const ROOMS: LibraryRoomTimes[] = roomList.BookingTimeList;
const SLOT = { date: '2026-11-05', start: '15:00', minutes: 120 };

const free = (...names: string[]): LibraryRoomTimes[] => ROOMS.filter(({ NAME }) => names.includes(NAME));

const ready = { status: 'ready', moreNeeded: 0 } as RoomRequest;
const party = (request: RoomRequest | null): PartyRequest => ({
  request,
  send: null,
  sending: false,
  failed: false,
  ready: request?.status === 'ready',
  update: () => undefined,
  cancel: null,
});

// Partitions: the room sent still free, taken meanwhile, and none of the kind free. Expected values: the design.
describe('The room once everyone has consented', () => {
  it('stays the one sent while it is free', () => {
    expect(roomOnReady('G406', free('G405', 'G406'))).toEqual({ room: 'G406', switched: null });
  });

  it('is the kind’s first free room when the one sent was taken, and says so', () => {
    expect(roomOnReady('G412', free('G405', 'G406'))).toEqual({
      room: 'G405',
      switched: 'G412가 그 사이 차서 G405로 바꿨어요',
    });
  });

  it('says when the kind is free next, for none free at the time', () => {
    expect(noRoomOf(GROUP, ROOMS, SLOT)).toMatchObject({
      words: expect.stringMatching(/^그 시간에는 빈 방이 없어요\. \d\d:\d\d부터는 6인실이 비어 있어요\.$/u) as unknown,
      again: expect.stringMatching(/^\d\d:\d\d$/u) as unknown,
    });
  });
});

// Partitions: logged in, logged out, and past the booking window. Expected values: the design.
describe('The main button once everyone has consented', () => {
  it('is 예약하기, and "로그인하고 예약" logged out, with the line saying the login ended', () => {
    expect(mainOf(GROUP, true, party(ready))).toMatchObject({ main: 'ready', words: '예약하기', disabled: false });
    expect(mainOf(GROUP, false, party(ready))).toMatchObject({ main: 'logInBook', words: '로그인하고 예약' });
    expect(readyLineOf(false, null)).toBe('모두 동의했어요 · 관정 로그인이 풀렸어요');
    expect(readyLineOf(true, 'G412가 그 사이 차서 G405로 바꿨어요')).toBe('G412가 그 사이 차서 G405로 바꿨어요');
  });

  it('waits for the booking window, which it says, past it', () => {
    const waiting = { ...GROUP, key: `${GROUP.key ?? ''}:wait`, opens: '11월 2일 09:00' };
    expect(mainOf(waiting, true, party(ready))).toMatchObject({
      words: '예약 창이 열리면 알려 드려요',
      disabled: true,
    });
    expect(waitWords(waiting, SLOT, new Date('2026-11-01T10:00:00+09:00'))).toBe(
      '11월 5일 (목) 방은 11월 2일 09:00부터 예약할 수 있어요.',
    );
  });
});
