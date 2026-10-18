/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { CompanionSeeker, OfficialRecruiting } from '@/api/quest-parts-types';

// The app's own: the `Party` frame's official recruiting and the people it shows looking for company, which no answer
// of the main server holds. `../../quest-parts/` adds them to the client.

export const OFFICIAL_RECRUITING: readonly Omit<OfficialRecruiting, 'joined'>[] = [
  {
    id: 'official-running',
    org: '서울대 중앙 러닝 동아리',
    title: '서울대 중앙 러닝 동아리\n경찰과 도둑 파티 모집!',
    subtitle: '[일시] · 행정관 앞 잔디광장 · 선착순 [N]명',
    photo: { kind: 'drawn', tint: '#8CC06A', icon: 'flag', caption: '[잔디광장 사진]' },
    time: '[일시]',
    place: '행정관 (60동) 앞 잔디광장',
    fill: '[N]명 모집',
    host: '러닝 동아리 주최',
  },
  {
    id: 'official-meeting',
    org: '총학생회',
    title: "가을 축제 2:2 미팅\n'만나샤'에서 인연 찾기!",
    subtitle: '총학생회 주관 · 2인 1팀 신청 · [신청 기간]',
    photo: { kind: 'drawn', tint: '#6B7FC1', icon: 'users', caption: '[축제 사진]' },
    time: '[축제 기간 중 일시]',
    place: '[장소]',
    fill: '2인 1팀',
    host: '총학생회 주관',
  },
];

export const COMPANION_SEEKERS: readonly Omit<CompanionSeeker, 'asked'>[] = [
  {
    id: 'seeker-climbing',
    name: '한도경',
    department: '산업공학과 23',
    want: '이번 주에 볼더링 처음 가보고 싶어요',
    tags: ['클라이밍', '운동'],
    freeTogether: '수 16:00 이후',
  },
  {
    id: 'seeker-career',
    name: '유지안',
    department: '경제학부 22',
    want: 'AI 커리어 설명회 혼자 가기 어색해요',
    tags: ['AI커리어', '취업'],
    freeTogether: '오늘 17:00 이후',
  },
  {
    id: 'seeker-jazz',
    name: '백승호',
    department: '작곡과 24',
    want: '재즈 합주할 사람 구해요',
    tags: ['재즈', '밴드'],
    freeTogether: '금 18:00 이후',
  },
];
