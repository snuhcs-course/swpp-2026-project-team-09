/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { JoinPolicy, MyParty, Party, Person, Quest } from '@/api/types';
import { type QuestRowView, toQuestGroups, toQuestRows } from '@/features/quests/adapter';

// The rows of the Quest list on the map and on `MainQuests`, by the `Main` frame: each Quest looks public or private
// by its own Join Policy, keeps its own title, and is left out without a time.

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
}

function quest(
  id: string,
  { joinPolicy = 'open', holders = [ME], startsAt = '2026-10-06T17:40:00+09:00', classQuest = false }: Shape = {},
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
    createdAt: classQuest ? null : '2026-10-05T09:00:00.000Z',
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
    expect(row).toMatchObject({ kind: 'class', tone: 'class', icon: 'clock', joinPolicy: null, label: '강의' });
    expect(row.kicker).toBe('다음 강의 · 1시간 후');
  });

  it.each<JoinPolicy>(['open', 'approval'])('draws an %s Quest as public, counting its Holders', (joinPolicy) => {
    const row = only([quest('러닝', { joinPolicy, holders: [ME, MIN_JUN, SEO_YEON, TAE_O] })]);
    expect(row).toMatchObject({ tone: 'open', icon: 'users', joinPolicy, label: '공개 파티', title: '러닝 퀘스트' });
    expect(row.kicker).toBe('공개 파티 · 4명');
  });

  it('draws a Closed Quest as private, with the other Holder or the first and how many more', () => {
    const alone = only([quest('혼자', { joinPolicy: 'closed' })]);
    const two = only([quest('저녁', { joinPolicy: 'closed', holders: [ME, MIN_JUN] })]);
    const four = only([quest('MT', { joinPolicy: 'closed', holders: [ME, MIN_JUN, SEO_YEON, TAE_O] })]);
    expect(two).toMatchObject({ tone: 'closed', icon: 'lock', joinPolicy: 'closed', title: '저녁 퀘스트' });
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
    expect(rows.map(({ kicker, tone, icon, title }) => ({ kicker, tone, icon, title }))).toEqual([
      { kicker: '공개 파티 · 활성화 중', tone: 'open', icon: 'users', title: '러닝 퀘스트' },
      { kicker: '비공개 파티 · 활성화 중', tone: 'closed', icon: 'lock', title: '저녁 퀘스트' },
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

describe('a Quest without a time', () => {
  it('is left out of the rows, and so of the groups and every count', () => {
    const rows = rowsOf([
      quest('보드게임', { startsAt: null }),
      quest('저녁', { joinPolicy: 'closed', startsAt: null }),
      quest('러닝'),
    ]);
    expect(rows.map(({ id }) => id)).toEqual(['러닝']);
    expect(toQuestGroups(rows, NOW).map(({ title }) => title)).toEqual(['오늘 · 10월 6일 (화)']);
  });
});
