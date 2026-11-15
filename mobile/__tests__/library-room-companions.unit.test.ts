/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type { RoomRequest, RoomRequestCompanion } from '@/api/room-requests';
import {
  ASK_FAILED,
  askableFriends,
  askRefusalWords,
  companionLines,
  companionsView,
} from '@/library/cards/room-companions';

// The booker's card's view of a room request's companions: a line for each state, how many more the room needs, the
// Friends that may be asked, and the words of a refused ask.

const MIN_JUN: RoomRequestCompanion = { userId: 'u-min-jun', name: '김민준', state: 'consented' };
const JI_WOO: RoomRequestCompanion = { userId: 'u-ji-woo', name: '서지우', state: 'declined' };
const SEO_JUN: RoomRequestCompanion = { userId: 'u-seo-jun', name: '이서준', state: 'asked' };
const HA_EUN: RoomRequestCompanion = { userId: 'u-ha-eun', name: '박하은', state: 'unanswered' };

function request(more: Partial<RoomRequest> = {}): RoomRequest {
  return {
    id: 'r-1',
    status: 'gathering',
    questId: 'q-1',
    madeForBooking: true,
    requester: { userId: 'me', name: '홍길동' },
    space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDesc: null,
    reason: null,
    failed: null,
    consents: [],
    companions: [MIN_JUN, JI_WOO, SEO_JUN],
    moreNeeded: 1,
    ...more,
  };
}

describe('companionLines', () => {
  it('says each state once, consented, asked, declined, then unanswered', () => {
    expect(companionLines([HA_EUN, JI_WOO, SEO_JUN, MIN_JUN])).toEqual([
      '김민준님이 동의했어요',
      '이서준님의 답을 기다리고 있어요',
      '서지우님은 못 와요',
      '박하은님은 답이 없어요',
    ]);
  });

  it('names everyone in a state on one line', () => {
    expect(companionLines([MIN_JUN, { ...SEO_JUN, state: 'consented' }])).toEqual(['김민준님, 이서준님이 동의했어요']);
  });

  it('says nothing without companions', () => {
    expect(companionLines([])).toEqual([]);
  });
});

describe('companionsView', () => {
  it('is null for a server that sends no companions, which the card shows as before', () => {
    const { companions: _none, moreNeeded: _neither, ...old } = request();

    expect(companionsView(old)).toBeNull();
  });

  it('counts the companions still in, and says how many more a gathering request needs', () => {
    expect(companionsView(request())).toEqual({
      consented: 1,
      inRequest: 2,
      lines: ['김민준님이 동의했어요', '이서준님의 답을 기다리고 있어요', '서지우님은 못 와요', '1명 더 필요해요'],
      canAskOneMore: true,
    });
  });

  it('says no count when the minimum is met or the count is missing', () => {
    expect(companionsView(request({ moreNeeded: 0 }))?.lines).not.toContain('0명 더 필요해요');
    expect(companionsView(request({ moreNeeded: undefined }))?.lines).toEqual([
      '김민준님이 동의했어요',
      '이서준님의 답을 기다리고 있어요',
      '서지우님은 못 와요',
    ]);
  });

  it('keeps the companions of a ready request but asks no one more', () => {
    const view = companionsView(request({ status: 'ready', companions: [MIN_JUN, JI_WOO], moreNeeded: 0 }));

    expect(view?.lines).toEqual(['김민준님이 동의했어요', '서지우님은 못 와요']);
    expect(view?.canAskOneMore).toBe(false);
  });

  it('shows no companions once the request is over', () => {
    for (const status of ['booked', 'cancelled', 'dissolved', 'expired'] as const) {
      expect(companionsView(request({ status, moreNeeded: 0 }))).toMatchObject({ lines: [], canAskOneMore: false });
    }
  });

  it('asks no one more into a request made with an existing Quest', () => {
    expect(companionsView(request({ madeForBooking: false }))?.canAskOneMore).toBe(false);
  });
});

describe('askableFriends', () => {
  const friends = [
    { id: MIN_JUN.userId, name: MIN_JUN.name },
    { id: JI_WOO.userId, name: JI_WOO.name },
    { id: SEO_JUN.userId, name: SEO_JUN.name },
    { id: 'u-yu-na', name: '최유나' },
  ];

  it('leaves out the companions still in, and keeps those who went out', () => {
    expect(askableFriends(friends, request()).map(({ name }) => name)).toEqual(['서지우', '최유나']);
  });
});

describe('askRefusalWords', () => {
  it("says the server's words for a refused Friend", () => {
    const refused = new ApiError(400, 'ROOM_REQUEST_REFUSED', {
      code: 'ROOM_REQUEST_REFUSED',
      message: '이미 함께 가자고 한 친구예요',
    });

    expect(askRefusalWords(refused)).toBe('이미 함께 가자고 한 친구예요');
  });

  it('says the card failed for any other answer', () => {
    expect(askRefusalWords(new ApiError(409, 'ROOM_REQUEST_STATUS', { message: 'The room request is ready.' }))).toBe(
      ASK_FAILED,
    );
    expect(askRefusalWords(new ApiError(400, null, { message: ['friendId must be a UUID'] }))).toBe(ASK_FAILED);
    expect(askRefusalWords(new TypeError('Network request failed'))).toBe(ASK_FAILED);
  });
});
