/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { days, DAYS, evening, parties, type Question } from './question-builders.ts';

// The questions of subset C of the large world (P05 ticket 02b): what a post means only by what people know of it. Their
// posts are in context-posts.ts. A 보드게임 is 게임 here, as the P05 owner ruled on 2026-11-01, and so is a 피시방.

const GAMES = ['lol', 'valorant', 'overwatch', 'pubg', 'maple', 'tft', 'pcroom', 'mariokart', 'boardgame'];
const GAME_WORDS = ['게임', '롤', '발로란트', '배그', '피시방'];

export const CONTEXT_QUESTIONS: readonly Question[] = [
  parties(
    'large-c-01',
    'C',
    '토요일 저녁에 게임 파티 있어?',
    evening(DAYS.토),
    { activities: GAMES, words: GAME_WORDS },
    { holds: ['c-lol-sat-2', 'c-pcroom'], lacks: ['c-roller-sat'] },
  ),
  parties(
    'large-c-02',
    'C',
    '목요일 저녁에 게임 파티 있어?',
    evening(DAYS.목),
    { activities: GAMES, words: GAME_WORDS },
    { holds: ['c-overwatch', 'c-tft'], lacks: ['c-maple-syrup-thu'] },
  ),
  parties(
    'large-c-03',
    'C',
    '수요일에 롤 하는 파티 있어?',
    days(DAYS.수),
    { activities: ['lol'], words: ['롤', '리그 오브 레전드', '칼바람', '증바람', '내전'] },
    {
      holds: ['c-lol-wed-1', 'c-lol-wed-2', 'c-lol-wed-3'],
      lacks: ['c-rollcake-wed', 'c-roller-wed', 'c-cold-run'],
    },
  ),
  // 스쿼시 한 게임 해요 holds the word.
  parties(
    'large-c-04',
    'C',
    '수요일 저녁에 게임 파티 있어?',
    evening(DAYS.수),
    { activities: GAMES, words: GAME_WORDS },
    { holds: ['c-lol-wed-1'], lacks: ['t-one-left'] },
  ),
  parties(
    'large-c-05',
    'C',
    '금요일에 디저트 파티 있어?',
    days(DAYS.금),
    { activities: ['dessert'], words: ['디저트', '카페', '커피', '케이크', '쿠키'] },
    { holds: ['c-dujjonku', 'c-iced'], lacks: ['c-board-cafe'] },
  ),
  parties(
    'large-c-06',
    'C',
    '토요일에 단 거 먹으러 갈 파티 있어?',
    days(DAYS.토),
    { activities: ['dessert'], words: ['디저트', '빙수', '마카롱', '케이크', '와플'] },
    { holds: ['c-yoajung'] },
  ),
  parties('large-c-07', 'C', '금요일에 술 마시는 파티 있어?', days(DAYS.금), {
    activities: ['drink'],
    words: ['술', '맥주', '치맥', '막걸리', '소주'],
  }),
  parties('large-c-08', 'C', '화요일 저녁에 분식 먹는 파티 있어?', evening(DAYS.화), {
    activities: ['snack'],
    words: ['분식', '떡볶이', '엽떡', '순대', '튀김'],
  }),
  parties('large-c-09', 'C', '일요일에 노래방 파티 있어?', days(DAYS.일), {
    activities: ['karaoke'],
    words: ['노래방', '코노', '코인노래방'],
  }),
  parties('large-c-10', 'C', '목요일에 클라이밍 파티 있어?', days(DAYS.목), {
    activities: ['climbing'],
    words: ['클라이밍', '클밍', '볼더링'],
  }),
  parties('large-c-11', 'C', '토요일에 뭐 만드는 모임 있어?', days(DAYS.토), {
    activities: ['knitting', 'perfume'],
    words: ['만들기', '공방', '원데이클래스', '뜨개', '클래스'],
  }),
  parties('large-c-12', 'C', '오늘 저녁에 독서 모임 있어?', evening(DAYS.오늘), {
    activities: ['bookclub'],
    words: ['독서', '책', '북클럽'],
  }),
  parties('large-c-13', 'C', '일요일에 사진 찍으러 가는 파티 있어?', days(DAYS.일), {
    activities: ['photobooth'],
    words: ['사진', '네컷', '포토'],
  }),
  parties('large-c-14', 'C', '일요일에 방탈출 파티 있어?', days(DAYS.일), {
    activities: ['escaperoom'],
    words: ['방탈출'],
  }),
];
