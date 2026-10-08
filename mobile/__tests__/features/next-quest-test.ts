import type { Quest } from '@/api/types';
import { toNextQuest } from '@/features/quests/adapter';

// 13:37 in Korea on a Tuesday.
const NOW = new Date('2026-10-06T13:37:00+09:00');
const PLACE = { placeId: null, label: '301동 118호', latitude: 37.45016, longitude: 126.95259 };

function quest(id: string, startsAt: string | null, endsAt: string | null, classQuest = false): Quest {
  return {
    id,
    title: id,
    globalEvent: null,
    leader: null,
    capacity: 1,
    joinPolicy: 'closed',
    holders: [],
    subQuests: [
      {
        id: `${id}-1`,
        attending: true,
        title: id,
        startsAt,
        endsAt,
        place: PLACE,
        completion: 'by_time',
        cancelled: false,
        done: false,
        ended: false,
      },
    ],
    classQuest,
    board: null,
    description: '',
    createdAt: null,
  };
}

function nextOf(...quests: Quest[]): string | undefined {
  return toNextQuest(quests, NOW)?.id;
}

describe("the User's next Quest", () => {
  it('is the first of today that has not ended', () => {
    const dinner = quest('dinner', '2026-10-06T18:30:00+09:00', null);
    const lecture = quest('lecture', '2026-10-06T14:00:00+09:00', '2026-10-06T15:15:00+09:00', true);

    expect(nextOf(dinner, lecture)).toBe('lecture');
  });

  it('is a class in progress until it ends', () => {
    const going = quest('going', '2026-10-06T13:00:00+09:00', '2026-10-06T13:50:00+09:00', true);
    const over = quest('over', '2026-10-06T12:00:00+09:00', '2026-10-06T13:37:00+09:00', true);
    const later = quest('later', '2026-10-06T14:00:00+09:00', '2026-10-06T15:15:00+09:00', true);

    expect(nextOf(over, later, going)).toBe('going');
    expect(nextOf(over, later)).toBe('later');
  });

  it('is never a Quest of another day in Korea, nor one that began without an end', () => {
    // 00:30 in Korea on the next day is still the 6th in UTC.
    const tomorrow = quest('tomorrow', '2026-10-07T00:30:00+09:00', null);
    const yesterday = quest('yesterday', '2026-10-05T23:00:00+09:00', '2026-10-06T23:00:00+09:00');
    const began = quest('began', '2026-10-06T13:00:00+09:00', null);
    const timeless = quest('timeless', null, null);

    expect(nextOf(tomorrow, yesterday, began, timeless)).toBeUndefined();
    // 08:00 in Korea today is still the 5th in UTC, and counts as today.
    const morning = new Date('2026-10-06T07:00:00+09:00');
    expect(toNextQuest([quest('early', '2026-10-06T08:00:00+09:00', null)], morning)?.id).toBe('early');
  });
});
