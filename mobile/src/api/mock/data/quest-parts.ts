/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MemberFace, QuestPhoto } from '@/api/quest-parts-types';

// The app's own: the photos, tags and members of the `Party` frame's posts, which no answer of the main server holds.
// `../../quest-parts/` adds them to the client's answers.

// The frame's two photos. The first is a picture in the frame; the app draws it as the frame draws the second.
const RUNNING: QuestPhoto = { kind: 'drawn', tint: '#177A4B', icon: 'flag', caption: '지난주 버들골 러닝' };
const JAZZ: QuestPhoto = { kind: 'drawn', tint: '#6B46C1', icon: 'users', caption: '작년 정기공연' };

// The tags of the posts of `./boards.ts`, in its order, one post to a line.
const POST_TAGS = [
  '러닝 운동',
  '알고리즘 코딩테스트',
  '재즈 공연',
  '저녁 샤로수길',
  '점심 학식',
  '저녁 공대',
  '아침 천원의아침밥',
  '마라탕 저녁',
  '치맥 번개',
  '기숙사 저녁',
  '채식 맛집',
  '점심',
  '고기 회식',
  '코딩테스트 취업',
  '대학원',
  '자소서 취업',
  '로스쿨 면접',
  '채용 취업',
  'CPA',
  '영어 면접',
  '공모전 데이터',
  '교환학생',
  '보드게임',
  '사진 산책',
  '등산',
  '풋살 운동',
  '뜨개질',
  '배드민턴',
  '독서',
  '게임',
  '자전거',
  '축제 공연',
  '클래식',
  '연극',
  '밴드',
  '힙합',
  '국악',
  '댄스',
  '뮤지컬',
  '전시',
].map((line) => line.split(' '));

// The sets a Quest's photo and tags are picked from. One Quest in three has no photo, as most of the frame's posts.
export const PHOTO_SET: readonly (QuestPhoto | null)[] = [RUNNING, JAZZ, null];
export const TAG_SET: readonly string[][] = POST_TAGS;

// The frame's names for the members a post's summary does not name, after its Leader.
export const NAME_POOL = [
  '서하린',
  '강민재',
  '이도현',
  '박소율',
  '정우진',
  '류시우',
  '진아영',
  '모수빈',
  '채이든',
  '함지율',
];

function face(name: string): MemberFace {
  return { name, photo: null };
}

// What the frame draws for one Quest of the mock's, by its id: the posts of `./boards.ts`, the User's Quests of
// `./quests.ts`, and the invitation of `./waiting.ts`. `companions` follow the Leader among the faces.
export interface FramedParts {
  photo: QuestPhoto | null;
  tags: string[];
  companions?: MemberFace[];
}

export const FRAMED_PARTS: Readonly<Record<string, FramedParts>> = {
  ...Object.fromEntries(POST_TAGS.map((tags, index) => [`post-${String(index)}`, { photo: null, tags }])),
  'post-0': { photo: RUNNING, tags: ['러닝', '운동'], companions: [face('서하린'), face('강민재')] },
  'post-1': { photo: null, tags: ['알고리즘', '코딩테스트'], companions: [face('이도현')] },
  'post-2': { photo: JAZZ, tags: ['재즈', '공연'], companions: [face('박소율'), face('정우진')] },
  'q-ai': { photo: null, tags: ['AI커리어', '취업'] },
  'q-ai-seo-yeon': { photo: null, tags: ['AI커리어', '채용'] },
  'q-dinner': { photo: null, tags: [] },
  'q-report': { photo: null, tags: [], companions: [] },
};

// The frame's tags for the User, when the mock's profile has none.
export const MY_FRAME_TAGS = ['AI커리어', '러닝', '알고리즘', '재즈', '보드게임', '사진'];
