/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest, QuestRoomRequest } from '@/api/types';
import { type CardView, toCards } from '@/features/map/adapter';
import { groupedByPlace } from '@/features/map/place-groups';
import { toMineCards } from '@/features/party/mine';
import { toQuestRows } from '@/features/quests/adapter';
import { requestLook } from '@/features/quests/room-request-flag';
import { GATE, ME, NOW, quest, sources } from '../support/map-sources';

// A booking party's room request of studying together while it is out, where the Quest is shown (P10 ticket 13; design
// group-study-resume 3): the map's flag of two lines, as a Quest made from a Plan has, and the lists' line. Today is
// Tuesday 6 October 2026 at 13:00 in Korea.

const STEP = {
  id: 'b1-1',
  attending: false,
  title: '관정 그룹스터디룸 6인실 예약',
  startsAt: '2026-10-07T15:00:00+09:00',
  endsAt: '2026-10-07T17:00:00+09:00',
  place: GATE,
  completion: 'by_hand' as const,
  cancelled: false,
  done: false,
  ended: false,
};

function bookingParty(roomRequest: QuestRoomRequest | null, startsAt = STEP.startsAt): Quest {
  return quest('b1', { title: '관정 그룹스터디룸 6인실 예약', subQuests: [{ ...STEP, startsAt }], roomRequest });
}

const GATHERING: QuestRoomRequest = { id: 'r1', status: 'gathering', consented: 1, asked: 3 };

function cardOf(party: Quest, others: readonly Quest[] = []): CardView {
  const card = toCards(sources({ quests: [party, ...others] })).find(({ id }) => id === `party:${party.id}`);
  if (card === undefined) {
    throw new Error('No card of the party');
  }
  return card;
}

// Partitions: gathering, ready, booked, ended and no request. Expected values: the design and the server's statuses.
describe("A booking party's card on the map", () => {
  it('is a flag of the room and its time over the consents while gathering', () => {
    const card = cardOf(bookingParty(GATHERING));

    expect(card.request).toEqual({
      title: '관정 그룹스터디룸',
      time: '15:00',
      day: '내일',
      state: '동의 1/3 · 기다리는 중',
      fact: '동의 1/3',
    });
    expect(card.marker.name).toBe('관정 그룹스터디룸 내일 15:00 · 동의 1/3 · 기다리는 중');
  });

  it('says 모두 동의 · 예약하기 once every Friend has consented', () => {
    const card = cardOf(bookingParty({ ...GATHERING, status: 'ready', consented: 3 }));

    expect(card.request?.state).toBe('모두 동의 · 예약하기');
  });

  it.each(['booked', 'cancelled', 'expired'] as const)('is an ordinary Quest mark once %s', (status) => {
    const card = cardOf(bookingParty({ ...GATHERING, status }));

    expect(card.request).toBeUndefined();
    expect(card.marker).toEqual(cardOf(bookingParty(null)).marker);
  });

  it('says 오늘 for a request of today', () => {
    const card = cardOf(bookingParty(GATHERING, '2026-10-06T15:00:00+09:00'));

    expect(card.request?.day).toBe('오늘');
    expect(card.marker.name).toBe('관정 그룹스터디룸 오늘 15:00 · 동의 1/3 · 기다리는 중');
  });

  it('is an ordinary Quest mark without a request', () => {
    expect(cardOf(bookingParty(null)).request).toBeUndefined();
  });

  it('is an ordinary Quest mark with a status this app does not know', () => {
    expect(cardOf(bookingParty({ ...GATHERING, status: 'waiting' })).request).toBeUndefined();
  });

  it('stands apart from a place it shares with another Quest, as a flag does', () => {
    const party = bookingParty(GATHERING);
    const cards = groupedByPlace(toCards(sources({ quests: [party, quest('q2', { holders: [ME] })] })));

    expect(cards.find(({ id }) => id === 'party:b1')?.within).toBeUndefined();
  });
});

describe("A request's look on the map", () => {
  it('is the flag of a Quest made from a Plan: its room and time in the time colour over its day and state', () => {
    const flag = {
      title: '관정 그룹스터디룸',
      time: '15:00',
      day: '내일',
      state: '모두 동의 · 예약하기',
      fact: '모두 동의',
    };
    expect(requestLook(flag)).toEqual({
      kind: 'answer',
      symbol: { type: 'dot', role: 'pick', number: null },
      label: {
        side: 'above',
        tone: 'pick',
        title: '관정 그룹스터디룸',
        note: '15:00',
        line: '내일 · 모두 동의 · 예약하기',
        study: true,
        number: null,
      },
    });
  });
});

// Partitions: the 파티 tab's row and the map's Quest list's row, gathering and booked.
function mine(party: Quest): ReturnType<typeof toMineCards>[number] | undefined {
  return toMineCards({ quests: [party], myParty: null, parties: [], declined: [], past: [], meId: ME.id, now: NOW })[0];
}

// Partitions, from #662's emulator pictures: under a heading that says the day (오늘, 내일) or one that does not
// (이번 주); a list that says no day. Expected values: no day word where the list already says the day.
describe("A booking party's card on the 파티 tab", () => {
  it("says the time and the consents under the 파티 tab's 내일 heading, with no day word, and opens the answer again", () => {
    const row = mine(bookingParty(GATHERING));

    expect(row?.group).toBe('내일');
    expect(row?.time).toBe('15:00 · 동의 1/3 · 기다리는 중');
    expect(row?.reopens).toBe(true);
  });

  it("says no day word under the 파티 tab's 오늘 heading either", () => {
    const row = mine(bookingParty(GATHERING, '2026-10-06T15:00:00+09:00'));

    expect(row?.group).toBe('오늘');
    expect(row?.time).toBe('15:00 · 동의 1/3 · 기다리는 중');
  });

  it('keeps the day under a heading that does not say it', () => {
    const row = mine(bookingParty(GATHERING, '2026-10-09T15:00:00+09:00'));

    expect(row?.group).toBe('이번 주');
    expect(row?.time).toBe('10월 9일 (금) 15:00 · 동의 1/3 · 기다리는 중');
  });

  it('says when and where once booked, and opens its room', () => {
    const row = mine(bookingParty({ ...GATHERING, status: 'booked', consented: 3 }));

    expect(row?.time).not.toContain('동의');
    expect(row?.reopens).toBeUndefined();
  });
});

describe("A booking party's row in the Quest lists", () => {
  // From #662's pictures: the map's list row is narrow, so it keeps the fact and drops the state word, which the flag
  // beside it says.
  it("says the time and the consents with no day or state word in the map's Quest list today, and opens the answer again", () => {
    const [row] = rows(bookingParty(GATHERING, '2026-10-06T15:00:00+09:00'));

    expect(row?.meta).toBe('15:00 · 동의 1/3');
    expect(row?.reopens).toBe(true);
  });

  it("says its day in the map's Quest list on another day, as the list's other rows do", () => {
    const [row] = rows(bookingParty(GATHERING));

    expect(row?.meta).toBe('내일 15:00 · 동의 1/3');
  });

  it("says 모두 동의 in the map's Quest list once every Friend has consented", () => {
    const [row] = rows(bookingParty({ ...GATHERING, status: 'ready', consented: 3 }, '2026-10-06T15:00:00+09:00'));

    expect(row?.meta).toBe('15:00 · 모두 동의');
  });

  it('gives the Quest list screen, whose rows sit under day headings, its line with no day word', () => {
    const [row] = rows(bookingParty(GATHERING));

    expect(row?.requestLine).toBe('15:00 · 동의 1/3 · 기다리는 중');
  });
});

function rows(party: Quest): ReturnType<typeof toQuestRows> {
  return toQuestRows({ quests: [party], myParty: null, parties: [], meId: ME.id, now: NOW });
}
