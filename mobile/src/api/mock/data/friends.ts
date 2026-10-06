import type { Friend, FriendStatus, Position } from '@/api/types';
import { FRAME_NOW, frameTime } from './frame';

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

// The User's own Friend ID, as the Lobby gives it.
export const MY_FRIEND_ID = '7KX2M9QD';

// Each Friend's Friend ID, by their id.
export const FRIEND_IDS: Readonly<Record<string, string>> = {
  f1: 'KM4J8QZA',
  f2: 'YS3N7WEB',
  f3: 'PJ5H2RXC',
  f4: 'CY6N9TUD',
  f5: 'JH7E3VKF',
  f6: 'KD8Y4MPG',
  f7: 'JS9A5NRH',
  f8: 'YT2E6QWJ',
  f9: 'HJ3M7XSK',
  f10: 'YC4W8ZTM',
  f11: 'SJ5U9BVN',
  f12: 'SY6R2CXP',
};

// Users of the `Friends` frame who are no Friend, each with a Friend ID. The first three sent the User a Friend
// Request, as in the frame's 친구 요청; the User sent one to 백승호; 유지안 sent the User an Invite Link.
export const OTHER_USERS = [
  { id: 'u1', name: '한도경', department: '산업공학과', friendId: 'HD3K8P2R' },
  { id: 'u2', name: '김하늘', department: '컴퓨터공학부', friendId: 'KH4N9S3T' },
  { id: 'u3', name: '박서준', department: '기계공학부', friendId: 'PS5J2U4V' },
  { id: 'u4', name: '백승호', department: '작곡과', friendId: 'BS6H3W5X' },
  { id: 'u5', name: '유지안', department: '경제학부', friendId: 'YJ7A4Y6Z' },
] as const;

// The Friend Requests waiting when the app starts: from whom, to whom (`me` is the User) and when, the newest first.
export const FRIEND_REQUESTS = [
  { id: 'r1', from: 'u1', to: 'me', sentAt: frameTime('13:20') },
  { id: 'r2', from: 'u2', to: 'me', sentAt: frameTime('12:05') },
  { id: 'r3', from: 'u3', to: 'me', sentAt: frameTime('09:40') },
  { id: 'r4', from: 'me', to: 'u4', sentAt: frameTime('11:00') },
] as const;

// An Invite Link from 유지안 that the User can accept: the app opens it at `/invite/from-yujian`.
export const INVITE_LINK_FROM_YUJIAN = 'from-yujian';
