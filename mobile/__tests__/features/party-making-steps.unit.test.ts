/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a step without an end before and after a later start; a Holder's mark of done; the event's own step
// alone ahead and with another; every step grey. Expected values: P06 ticket 19's rule for the 파티 form's step.

import type { Quest, SubQuest } from '@/api/types';
import { editedSubQuest, shownSubQuest } from '@/features/party/making';

function step(id: string, startsAt: string | null, more: Partial<SubQuest> = {}): SubQuest {
  return {
    id,
    attending: false,
    title: id,
    startsAt,
    endsAt: null,
    place: null,
    completion: 'by_hand',
    cancelled: false,
    done: false,
    ended: false,
    ...more,
  };
}

function quest(subQuests: SubQuest[]): Quest {
  return {
    id: 'q1',
    title: '설명회 같이 가요',
    globalEvent: null,
    leader: { id: 'me', name: '홍길동', department: '컴퓨터공학부' },
    capacity: 4,
    joinPolicy: 'open',
    holders: [],
    subQuests,
    classQuest: false,
    waitingJoinRequests: 0,
    board: 'career',
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
  };
}

const MEET = step('모이기', '2026-10-06T09:30:00+09:00');
const EVENT = step('설명회', '2026-10-06T10:00:00+09:00', { attending: true, endsAt: '2026-10-06T12:00:00+09:00' });
const LUNCH = step('점심', '2026-10-06T12:30:00+09:00');

const BEFORE = new Date('2026-10-06T09:00:00+09:00');
const DURING_EVENT = new Date('2026-10-06T10:30:00+09:00');

describe('editedSubQuest', () => {
  it('before the meeting → the meeting, the event being the main server’s', () => {
    expect(editedSubQuest(quest([LUNCH, EVENT, MEET]), BEFORE)?.id).toBe('모이기');
  });

  it('a meeting without an end, once the event started → the step after the event', () => {
    expect(editedSubQuest(quest([MEET, EVENT, LUNCH]), DURING_EVENT)?.id).toBe('점심');
  });

  it('a meeting the User marked done → still the meeting', () => {
    expect(editedSubQuest(quest([{ ...MEET, done: true }, EVENT]), BEFORE)?.id).toBe('모이기');
  });

  it('only the event ahead → none', () => {
    expect(editedSubQuest(quest([MEET, EVENT]), DURING_EVENT)).toBeNull();
  });
});

describe('shownSubQuest', () => {
  it('only the event ahead → the event', () => {
    expect(shownSubQuest(quest([MEET, EVENT]), DURING_EVENT)?.id).toBe('설명회');
  });

  it('every step grey → none', () => {
    expect(shownSubQuest(quest([{ ...MEET, cancelled: true }]), BEFORE)).toBeNull();
  });
});
