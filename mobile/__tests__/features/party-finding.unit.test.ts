/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TimetableClass } from '@/api/types';
import { findPosts, timeReason } from '@/features/party/finding';
import type { PostView } from '@/features/party/posts';

// 찾기's order and search, and 추천 이유's 시간대, from the User's timetable.

// Thursday, 1 October 2026, 13:37 in Korea.
const TODAY = new Date('2026-10-01T04:37:00.000Z');

const CLASSES: TimetableClass[] = [
  {
    id: 'c1',
    courseName: '알고리즘',
    times: [
      { id: 't1', weekday: 'thursday', startTime: '09:30', endTime: '11:00', placeId: null, room: null },
      { id: 't2', weekday: 'thursday', startTime: '15:30', endTime: '17:00', placeId: null, room: null },
    ],
    overlaps: [],
  },
];

function post(questId: string, tags: string[], place = '자하연'): PostView {
  return {
    questId,
    title: `제목 ${questId}`,
    description: '',
    leader: { id: 'l', name: '최유나', department: '디자인학부' },
    event: null,
    board: 'hobby',
    joinPolicy: 'open',
    fill: '1/4명',
    holders: 1,
    capacity: 4,
    startsAt: null,
    time: '시간 미정',
    place,
    members: '최유나',
    createdAt: '2026-10-01T00:00:00.000Z',
    role: { kind: 'open' },
    photo: null,
    tags,
    faces: [],
    friends: [],
  };
}

describe('시간대', () => {
  it('names the class at the post’s time', () => {
    expect(timeReason('2026-10-01T07:00:00.000Z', CLASSES, TODAY)).toBe('오늘 16:00에는 알고리즘 수업이 있어요.');
  });

  it('says when the last class before it ends', () => {
    expect(timeReason('2026-10-01T10:30:00.000Z', CLASSES, TODAY)).toBe(
      '오늘 수업이 17:00에 끝나서 19:30에 비어 있어요.',
    );
  });

  it('says there is no class before it, tomorrow or on a named day', () => {
    expect(timeReason('2026-10-02T10:00:00.000Z', CLASSES, TODAY)).toBe('내일은 19:00까지 수업이 없어서 비어 있어요.');
    expect(timeReason('2026-10-08T00:00:00.000Z', CLASSES, TODAY)).toBe(
      '목요일은 09:00까지 수업이 없어서 비어 있어요.',
    );
  });

  it('says when the post has no time', () => {
    expect(timeReason(null, CLASSES, TODAY)).toBe('아직 시간이 정해지지 않았어요.');
  });
});

describe('찾기’s order', () => {
  const posts = [post('a', ['저녁']), post('b', ['러닝', '운동']), post('c', ['러닝', '재즈']), post('d', [])];

  it('puts more shared tags first and keeps the given order otherwise', () => {
    const found = findPosts(posts, { search: '', myTags: ['러닝', '재즈'], hidden: [] });

    expect(found.map(({ questId }) => questId)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('leaves out the hidden posts and those the search misses', () => {
    expect(findPosts(posts, { search: '', myTags: [], hidden: ['a', 'c'] }).map(({ questId }) => questId)).toEqual([
      'b',
      'd',
    ]);
    expect(findPosts(posts, { search: '#재즈', myTags: [], hidden: [] }).map(({ questId }) => questId)).toEqual(['c']);
    expect(
      findPosts([post('e', [], '버들골 (100동) 입구')], { search: '버들 골', myTags: [], hidden: [] }),
    ).toHaveLength(1);
  });
});
