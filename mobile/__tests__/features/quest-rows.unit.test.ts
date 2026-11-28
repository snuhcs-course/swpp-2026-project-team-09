/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { JoinPolicy, MyParty, Party, Person, Quest, SubQuest } from '@/api/types';
import { type QuestRowView, toQuestGroups, toQuestRows } from '@/features/quests/adapter';

// The rows of the Quest list on the map and on `MainQuests`, by the `Main` frame: each Quest looks public or private
// by its own Join Policy, keeps its own title, and goes last under 시간 미정 without a time (P06 ticket 42).

// 13:00 in Korea on a Tuesday.
const NOW = new Date('2026-10-06T13:00:00+09:00');
const PLACE = { placeId: null, label: '301동 앞', latitude: 37.45016, longitude: 126.95259 };

const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '경영학과' };
const SEO_YEON: Person = { id: 'seo-yeon', name: '이서연', department: '경영학과' };
const TAE_O: Person = { id: 'tae-o', name: '윤태오', department: '물리천문학부' };

interface Shape {
  joinPolicy?: JoinPolicy;
  holders?: Person[];
  startsAt?: string | null;
  classQuest?: boolean;
  createdAt?: string;
}

function quest(
  id: string,
  {
    joinPolicy = 'open',
    holders = [ME],
    startsAt = '2026-10-06T17:40:00+09:00',
    classQuest = false,
    createdAt = '2026-10-05T09:00:00.000Z',
  }: Shape = {},
): Quest {
  return {
    id,
    title: `${id} 퀘스트`,
    globalEvent: null,
    leader: classQuest ? null : ME,
    capacity: 8,
    joinPolicy,
    holders,
    subQuests: [
      {
        id: `${id}-1`,
        attending: true,
        title: id,
        startsAt,
        endsAt: null,
        place: PLACE,
        completion: 'by_time',
        cancelled: false,
        done: false,
        ended: false,
      },
    ],
    classQuest,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: classQuest ? null : createdAt,
  };
}

// The Party switched on for a Quest, under a title of its own and a Join Policy unlike the Quest's.
function partyFor(id: string, joinPolicy: JoinPolicy): Party {
  return {
    id: `${id}-party`,
    title: `${id} 파티`,
    memberCount: 5,
    capacity: 8,
    joinPolicy,
    quest: { id, title: `${id} 퀘스트`, globalEvent: null },
    holdsQuest: true,
    friends: [],
  };
}

function rowsOf(quests: Quest[], parties: Party[] = [], myParty: MyParty | null = null): QuestRowView[] {
  return toQuestRows({ quests, myParty, parties, meId: ME.id, now: NOW });
}

function only(quests: Quest[], parties: Party[] = [], myParty: MyParty | null = null): QuestRowView {
  const [row] = rowsOf(quests, parties, myParty);
  if (row === undefined) {
    throw new Error('No row');
  }
  return row;
}

describe('a row of the Quest list', () => {
  it('draws a class with the clock and the class kicker', () => {
    const row = only([quest('자료구조', { classQuest: true, startsAt: '2026-10-06T14:00:00+09:00' })]);
    expect(row).toMatchObject({ kind: 'class', tone: 'class', joinPolicy: null, label: '강의' });
    expect(row.kicker).toBe('다음 강의 · 1시간 후');
  });

  it.each<JoinPolicy>(['open', 'approval'])('draws an %s Quest as public, counting its Holders', (joinPolicy) => {
    const row = only([quest('러닝', { joinPolicy, holders: [ME, MIN_JUN, SEO_YEON, TAE_O] })]);
    expect(row).toMatchObject({ tone: 'open', joinPolicy, label: '공개 파티', title: '러닝 퀘스트' });
    expect(row.kicker).toBe('공개 파티 · 4명');
  });

  it('draws a Closed Quest as private, with the other Holder or the first and how many more', () => {
    const alone = only([quest('혼자', { joinPolicy: 'closed' })]);
    const two = only([quest('저녁', { joinPolicy: 'closed', holders: [ME, MIN_JUN] })]);
    const four = only([quest('MT', { joinPolicy: 'closed', holders: [ME, MIN_JUN, SEO_YEON, TAE_O] })]);
    expect(two).toMatchObject({ tone: 'closed', joinPolicy: 'closed', title: '저녁 퀘스트' });
    expect([alone.kicker, two.kicker, four.kicker]).toEqual([
      '비공개 파티',
      '비공개 파티 · 김민준',
      '비공개 파티 · 김민준 외 2명',
    ]);
    expect(four.label).toBe('비공개 파티 · 김민준, 이서연, 윤태오');
  });

  it("says 활성화 중 while the Quest's Party is switched on, and keeps the Quest's look and title", () => {
    const open = quest('러닝', { holders: [ME, MIN_JUN] });
    const closed = quest('저녁', { joinPolicy: 'closed', holders: [ME, MIN_JUN] });
    const rows = rowsOf([open, closed], [partyFor('러닝', 'closed'), partyFor('저녁', 'open')]);
    expect(rows.map(({ kicker, tone, title }) => ({ kicker, tone, title }))).toEqual([
      { kicker: '공개 파티 · 활성화 중', tone: 'open', title: '러닝 퀘스트' },
      { kicker: '비공개 파티 · 활성화 중', tone: 'closed', title: '저녁 퀘스트' },
    ]);
  });

  it("says 활성화 중 for the User's own Party too", () => {
    const myParty: MyParty = {
      id: 'mine',
      title: '내 파티',
      capacity: 8,
      joinPolicy: 'open',
      quest: { id: '저녁', title: '저녁 퀘스트', globalEvent: null },
      sharing: true,
      members: [],
    };
    const row = only([quest('저녁', { joinPolicy: 'closed', holders: [ME, MIN_JUN] })], [], myParty);
    expect(row).toMatchObject({ kicker: '비공개 파티 · 활성화 중', tone: 'closed', title: '저녁 퀘스트' });
  });
});

// Two Quests whose time is not set, the later made first, between two with a time.
const WITH_UNTIMED = [
  quest('보드게임', { startsAt: null, createdAt: '2026-10-05T10:00:00.000Z' }),
  quest('러닝'),
  quest('저녁', { joinPolicy: 'closed', startsAt: null, createdAt: '2026-10-05T08:00:00.000Z' }),
  quest('배드민턴', { startsAt: '2026-10-20T18:00:00+09:00' }),
];

// The Quest with its one step changed.
function withStep(of: Quest, change: Partial<SubQuest>): Quest {
  const [step] = of.subQuests;
  if (step === undefined) {
    throw new Error(`${of.id} has no step`);
  }
  return { ...of, subQuests: [{ ...step, ...change }] };
}

describe('a Quest whose time is not set (P06 ticket 42)', () => {
  it('comes after every Quest with a time, the first made first', () => {
    expect(rowsOf(WITH_UNTIMED).map(({ id }) => id)).toEqual(['러닝', '배드민턴', '저녁', '보드게임']);
  });

  it('says 시간 미정 for its time and in its line', () => {
    const row = rowsOf(WITH_UNTIMED).find(({ id }) => id === '저녁');

    expect(row).toMatchObject({ time: '시간 미정', meta: '시간 미정 · 301동 앞', daysAway: null, ended: false });
  });

  it('is under 시간 미정, the last group of the whole screen', () => {
    const groups = toQuestGroups(rowsOf(WITH_UNTIMED), NOW);

    expect(groups.map(({ title }) => title)).toEqual(['오늘 · 10월 6일 (화)', '그 이후', '시간 미정']);
    expect(groups.at(-1)?.rows.map(({ id }) => id)).toEqual(['저녁', '보드게임']);
  });

  it('is on the list with no step at all, and left out once every step of it ended', () => {
    const noStep = { ...quest('모임', { startsAt: null }), subQuests: [] };
    const ended = withStep(quest('산책', { startsAt: null }), { ended: true });

    expect(rowsOf([noStep, ended, quest('러닝')]).map(({ id }) => id)).toEqual(['러닝', '모임']);
  });

  it('comes after an ended Quest that had a time, even one made later', () => {
    const untimed = quest('보드게임', { startsAt: null, createdAt: '2026-10-05T08:00:00.000Z' });
    const over = withStep(quest('러닝', { createdAt: '2026-10-05T10:00:00.000Z' }), { ended: true });

    expect(rowsOf([untimed, over]).map(({ id, ended }) => [id, ended])).toEqual([
      ['러닝', true],
      ['보드게임', false],
    ]);
  });
});

describe('a Quest without a time on its first step', () => {
  it('takes its time and place from a later step that has one, and is no untimed Quest', () => {
    const gathering = quest('저녁', { startsAt: null });
    const dinner = {
      ...gathering.subQuests[0],
      id: '저녁-2',
      attending: false,
      title: '저녁',
      startsAt: '2026-10-06T19:00:00+09:00',
      place: { ...PLACE, label: '녹두 식당' },
    };
    const rows = rowsOf([
      { ...gathering, subQuests: [{ ...gathering.subQuests[0], title: '모이기' }, dinner] },
      quest('러닝'),
    ]);
    expect(rows.map(({ id }) => id)).toEqual(['러닝', '저녁']);
    expect(rows[1]).toMatchObject({ time: '19:00', place: '녹두 식당', meta: '19:00 · 녹두 식당' });
  });
});

// The main screen's list has no day headers: in the usage test of 2026-11-21 its 09:00, 14:00 and 12:21 were three days.
describe("a Quest's meta on another day", () => {
  it('carries its day, and one of today none', () => {
    const rows = rowsOf([
      quest('러닝'),
      quest('배드민턴', { startsAt: '2026-10-07T18:00:00+09:00' }),
      quest('스터디', { startsAt: '2026-10-09T12:21:00+09:00' }),
    ]);

    expect(rows.map(({ meta }) => meta.split(' · ')[0])).toEqual(['17:40', '내일 18:00', '10/9(금) 12:21']);
  });
});

// A04 ticket 10: 오늘 folds the rows over by now.
describe("a row's being over", () => {
  it('is over once the end of the step it shows has passed, or every step ended', () => {
    const morning = withStep(quest('아침', { startsAt: '2026-10-06T09:00:00+09:00' }), {
      endsAt: '2026-10-06T10:00:00+09:00',
    });
    const later = withStep(quest('저녁', { startsAt: '2026-10-06T18:00:00+09:00' }), {
      endsAt: '2026-10-06T19:00:00+09:00',
    });
    const open = quest('열린', { startsAt: '2026-10-06T09:00:00+09:00' });
    const ended = withStep(quest('끝난', { startsAt: '2026-10-06T09:00:00+09:00' }), { ended: true });

    expect(rowsOf([morning, later, open, ended]).map(({ title, over }) => [title, over])).toEqual([
      ['아침 퀘스트', true],
      ['열린 퀘스트', false],
      ['저녁 퀘스트', false],
      ['끝난 퀘스트', true],
    ]);
  });
});
