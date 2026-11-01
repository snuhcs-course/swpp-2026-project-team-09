/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { quest } from './traps.ts';
import { type LargeQuest } from './world-data.ts';

// The posts that only context tells apart (P05 ticket 02b, subset C): titles without the word a person would ask by, as
// 증바람 for 게임, and titles that hold that word and mean something else, as 롤케이크 for 롤. The P05 owner confirmed
// them by hand, so they stand outside the wordings and their sample. No generated Quest has these activities.

interface Written {
  capacity?: number;
  holders?: number;
  board?: LargeQuest['board'];
}

const post = (
  key: string,
  title: string,
  activity: string,
  starts: string,
  place: string,
  { capacity = 4, holders = 2, board = 'hobby' }: Written = {},
): LargeQuest =>
  quest(`c-${key}`, title, activity, starts, 'known by context', {
    capacity,
    holders,
    board,
    place: { label: place },
  });

const MEAL: Written = { board: 'meal' };

// 게임. A 롤체 is its own game, so it counts under 게임 and not under 롤.
const GAMES = [
  post('lol-sat-1', '롤 5대5하실 분 구함', 'lol', '2026-11-07T19:10', '녹두 피시방', { capacity: 5, holders: 3 }),
  post('lol-sat-2', '증바람 5인 너만 오면 고', 'lol', '2026-11-07T20:10', '녹두 피시방', { capacity: 5, holders: 4 }),
  post('lol-sat-3', '칼바람 한 판 하실 분', 'lol', '2026-11-07T17:40', '녹두 피시방'),
  post('valorant', '발로 듀오 구해요', 'valorant', '2026-11-07T18:20', '서울대입구역 피시방', {
    capacity: 2,
    holders: 1,
  }),
  post('pcroom', '피시방 같이 가실 분', 'pcroom', '2026-11-07T21:10', '서울대입구역 피시방'),
  post('overwatch', '옵치 빠대 2명', 'overwatch', '2026-11-05T18:10', '녹두 피시방', { capacity: 5, holders: 3 }),
  post('pubg', '배그 스쿼드 한 자리', 'pubg', '2026-11-05T19:10', '녹두 피시방', { capacity: 4, holders: 3 }),
  post('maple', '메이플 보스팟 구함', 'maple', '2026-11-05T20:10', '녹두 피시방', { capacity: 6, holders: 4 }),
  post('mariokart', '마리오카트 대결하실 분', 'mariokart', '2026-11-05T20:40', '기숙사 앞'),
  post('tft', '롤체 같이 돌려요', 'tft', '2026-11-05T21:10', '녹두 피시방'),
  post('lol-wed-1', '증바람 5인 너만 오면 고', 'lol', '2026-11-04T18:10', '녹두 피시방', { capacity: 5, holders: 4 }),
  post('lol-wed-2', '롤 내전 2명 구함', 'lol', '2026-11-04T20:40', '녹두 피시방', { capacity: 8, holders: 6 }),
  post('lol-wed-3', '칼바람 한 판 하실 분', 'lol', '2026-11-04T21:10', '녹두 피시방'),
];

// 디저트, with 커피 under it: who goes for a coffee may buy something more (P05 owner, 2026-11-01).
const DESSERTS = [
  post('dujjonku', '두쫀쿠 사러 가실 분', 'dessert', '2026-11-06T14:10', '샤로수길', MEAL),
  post('eggtart', '에그타르트 먹으러 가실 분', 'dessert', '2026-11-06T15:20', '샤로수길', MEAL),
  post('buttertteok', '버터떡 웨이팅 같이 해요', 'dessert', '2026-11-06T11:20', '샤로수길', MEAL),
  post('croffle', '크로플 먹으러 가요', 'dessert', '2026-11-06T16:20', '정문 앞 카페', MEAL),
  post('coffee', '커피 한잔하실 분', 'dessert', '2026-11-06T13:40', '정문 앞 카페', MEAL),
  post('iced', '아아 마시러 가요', 'dessert', '2026-11-06T17:10', '정문 앞 카페', MEAL),
  post('yoajung', '요아정 같이 드실 분', 'dessert', '2026-11-07T14:10', '녹두거리', MEAL),
  post('bingsu', '빙수 나눠 드실 분', 'dessert', '2026-11-07T15:10', '녹두거리', MEAL),
  post('macaron', '마카롱 투어 가요', 'dessert', '2026-11-07T16:10', '샤로수길', MEAL),
  post('rollcake-sat', '롤케이크 먹으러 가요', 'dessert', '2026-11-07T13:40', '샤로수길', MEAL),
  post('maple-syrup-sat', '메이플 시럽 와플 드실 분', 'dessert', '2026-11-07T14:40', '샤로수길', MEAL),
];

const OTHERS = [
  post('chimaek', '치맥 하실 분', 'drink', '2026-11-06T19:10', '녹두거리', MEAL),
  post('pimaek', '피맥 한잔해요', 'drink', '2026-11-06T20:10', '녹두거리', MEAL),
  post('makgeolli', '막걸리 한잔하실 분', 'drink', '2026-11-06T20:40', '녹두거리', MEAL),
  post('yeopddeok', '엽떡 같이 드실 분', 'snack', '2026-11-03T18:10', '기숙사 앞', MEAL),
  post('tteoktwisun', '떡튀순 먹으러 가요', 'snack', '2026-11-03T19:10', '녹두거리', MEAL),
  post('cono', '코노 갈 사람', 'karaoke', '2026-11-08T20:10', '녹두거리'),
  post('coin-karaoke', '코인노래방 1시간만', 'karaoke', '2026-11-08T19:10', '서울대입구역'),
  post('climbing', '클밍 같이 가요', 'climbing', '2026-11-05T13:10', '낙성대역 근처'),
  post('bouldering', '볼더링 처음인데 가실 분', 'climbing', '2026-11-05T15:10', '낙성대역 근처'),
  post('knitting', '뜨개 모임 하실 분', 'knitting', '2026-11-07T11:10', '동아리방'),
  post('perfume', '향수 공방 원데이클래스', 'perfume', '2026-11-07T13:10', '샤로수길'),
  post('escape-room', '방탈출 3인 구해요', 'escaperoom', '2026-11-08T15:10', '서울대입구역', {
    capacity: 3,
    holders: 1,
  }),
  post('photobooth', '인생네컷 찍으러 가요', 'photobooth', '2026-11-08T14:10', '샤로수길'),
  post('book', '책 모임 하실 분', 'bookclub', '2026-11-02T18:10', '동아리방'),
];

// What holds the word asked and means something else.
const LOOK_ALIKES = [
  post('rollcake-wed', '롤케이크 먹으러 가요', 'dessert', '2026-11-04T15:10', '샤로수길', MEAL),
  post('roller-wed', '롤러장 가실 분', 'rollerrink', '2026-11-04T19:20', '서울대입구역'),
  post('roller-sat', '롤러장 가실 분', 'rollerrink', '2026-11-07T19:30', '서울대입구역'),
  post('cold-run', '칼바람 맞으며 러닝해요', 'running', '2026-11-04T20:10', '정문 앞 카페'),
  post('maple-syrup-thu', '메이플 시럽 와플 드실 분', 'dessert', '2026-11-05T17:30', '샤로수길', MEAL),
  post('board-cafe', '보드게임 카페 갈붕', 'boardgame', '2026-11-06T15:40', '정문 앞 카페'),
];

export const contextPosts = (): LargeQuest[] => [...GAMES, ...DESSERTS, ...OTHERS, ...LOOK_ALIKES];
