import type { Friend, FriendStatus, Position } from '@/api/types';
import { FRAME_NOW } from './frame';

// The twelve Friends of the `Main` frame, in the order of their names as the main server lists them. Two have their
// location off: the User cannot see them, and no position exists for them.
interface MockFriend extends Friend {
  latitude: number | null;
  longitude: number | null;
  status: Omit<FriendStatus, 'userId'>;
}

function friend(
  id: string,
  name: string,
  department: string,
  at: readonly [number, number] | null,
  status: Omit<FriendStatus, 'userId' | 'photo'>,
): MockFriend {
  return {
    id,
    name,
    department,
    sharing: true,
    visible: at !== null,
    latitude: at?.[0] ?? null,
    longitude: at?.[1] ?? null,
    // The frame shows a photo for two Friends. The app has no pictures of people yet, so every Friend shows letters.
    status: { ...status, photo: null },
  };
}

const MOCK_FRIENDS: readonly MockFriend[] = [
  friend('f6', '강도윤', '수리과학부', [37.45532, 126.95206], {
    presence: 'class',
    where: '44-1동',
    detail: '수업 중 · 44-1동 · 14:45에 끝나요',
    walk: '도보 9분',
  }),
  friend('f1', '김민준', '컴퓨터공학부', [37.45952, 126.95209], {
    presence: 'free',
    where: '중앙도서관',
    detail: '공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
    walk: '도보 4분',
  }),
  friend('f3', '박지호', '전기정보공학부', [37.46108, 126.9527], {
    presence: 'free',
    where: '자하연',
    detail: '공강 · 자하연 근처 · 14:30까지 비어 있어요',
    walk: '도보 5분',
  }),
  friend('f11', '서지우', '심리학과', null, {
    presence: 'off',
    where: '',
    detail: '위치 꺼짐 · 마지막 활동 2시간 전',
    walk: '',
  }),
  friend('f12', '신예린', '건축학과', null, {
    presence: 'off',
    where: '',
    detail: '위치 꺼짐 · 마지막 활동 어제',
    walk: '',
  }),
  friend('f8', '윤태오', '물리천문학부', [37.45478, 126.95062], {
    presence: 'class',
    where: '38동',
    detail: '수업 중 · 38동 · 15:00에 끝나요',
    walk: '도보 9분',
  }),
  friend('f2', '이서연', '경영학과', [37.45942, 126.95038], {
    presence: 'free',
    where: '학생회관',
    detail: '공강 · 학생회관 · 14:00까지 비어 있어요',
    walk: '도보 3분',
  }),
  friend('f10', '임채원', '화학생물공학부', [37.45799, 126.94868], {
    presence: 'moving',
    where: '셔틀',
    detail: '이동 중 · 교내 순환 셔틀 · 302동 방향',
    walk: '',
  }),
  friend('f5', '정하은', '컴퓨터공학부', [37.45026, 126.95234], {
    presence: 'class',
    where: '301동',
    detail: '수업 중 · 301동 · 13:50에 끝나요',
    walk: '도보 17분',
  }),
  friend('f7', '조수아', '사회학과', [37.46271, 126.951], {
    presence: 'class',
    where: '16동',
    detail: '수업 중 · 16동 · 14:15에 끝나요',
    walk: '도보 7분',
  }),
  friend('f4', '최유나', '디자인학부', [37.45848, 126.95523], {
    presence: 'free',
    where: '버들골',
    detail: '공강 · 버들골 · 15:30까지 비어 있어요',
    walk: '도보 9분',
  }),
  friend('f9', '한지민', '영어영문학과', [37.46097, 126.95338], {
    presence: 'class',
    where: '4동',
    detail: '수업 중 · 4동 · 13:50에 끝나요',
    walk: '도보 5분',
  }),
];

// The member of the User's Party who is not a Friend. A Party's members see each other while the Party shares.
export const PARTY_MEMBER = { id: 'pm1', name: '오현우', department: '산업공학과' } as const;

const PARTY_MEMBER_POSITION: Position = {
  userId: PARTY_MEMBER.id,
  latitude: 37.45519,
  longitude: 126.95325,
  measuredAt: FRAME_NOW,
};

export const FRIENDS: Friend[] = MOCK_FRIENDS.map(({ id, name, department, sharing, visible }) => ({
  id,
  name,
  department,
  sharing,
  visible,
}));

export const POSITIONS: Position[] = [
  ...MOCK_FRIENDS.flatMap(({ id, latitude, longitude }) =>
    latitude === null || longitude === null ? [] : [{ userId: id, latitude, longitude, measuredAt: FRAME_NOW }],
  ),
  PARTY_MEMBER_POSITION,
];

export const FRIEND_STATUSES: FriendStatus[] = MOCK_FRIENDS.map(
  ({ id, status: { presence, where, detail, walk, photo } }) => ({
    userId: id,
    presence,
    where,
    detail,
    walk,
    photo,
  }),
);
