/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { ACCOUNTS, HeStage } from './he-seed.js';

// The HE seed's recruiting Quests as the evaluators' apps read them when the evaluation starts.

const stage = new HeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const inKorea = (time: string): string => new Date(`${time}:00+09:00`).toISOString();

type QuestRow = [string, string, string, string, number, string, string, string];

// The spec's recruiting Quests (The recruiting Quests), each with its one Sub Quest's time and Place, the campus map's
// number or the label a Global Event gives it.
const QUESTS = (
  [
    ['중도에서 같이 과제해요', 'hobby', 'open', '오세린', 6, '2026-11-04T15:30', '2026-11-04T17:30', '62'],
    ['학관에서 저녁 같이 먹어요', 'meal', 'open', '이도현', 6, '2026-11-04T18:00', '2026-11-04T19:00', '63'],
    ['302동 식당 저녁', 'meal', 'approval', '최유나', 4, '2026-11-04T17:30', '2026-11-04T18:30', '302'],
    ['자하연에서 점심', 'meal', 'open', '오세린', 4, '2026-11-05T12:00', '2026-11-05T13:00', '109'],
    ['마케팅 공모전 팀원 구해요', 'career', 'approval', '정민재', 5, '2026-11-05T19:00', '2026-11-05T21:00', '58'],
    // The demo's band show after the refresh of 11-04, at 학생회관.
    ['밴드 공연 같이 가요', 'show', 'open', '이도현', 6, '2026-11-05T19:00', '2026-11-05T21:00', '학생회관'],
    ['토요일 아침 러닝', 'hobby', 'open', '박서진', 8, '2026-11-07T08:00', '2026-11-07T09:00', '71'],
    ['면접 스터디', 'career', 'open', '박서진', 6, '2026-11-06T16:00', '2026-11-06T18:00', '83'],
  ] satisfies QuestRow[]
).map(([title, board, joinPolicy, leader, capacity, start, end, place]: QuestRow) => ({
  title,
  board,
  joinPolicy,
  leader,
  capacity,
  holderCount: 1,
  startsAt: inKorea(start),
  endsAt: inKorea(end),
  place,
}));

const recruitingSchema = z.array(
  z.object({
    title: z.string(),
    globalEvent: z.object({ title: z.string() }).nullable(),
    leader: z.object({ name: z.string() }),
    holderCount: z.number(),
    capacity: z.number(),
    joinPolicy: z.string(),
    board: z.string(),
    description: z.string(),
    nextSubQuest: z.object({
      attending: z.boolean(),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      place: z.object({ placeId: z.string().nullable(), label: z.string() }),
    }),
  }),
);

const ownQuestsSchema = z.array(
  z.object({ title: z.string(), classQuest: z.boolean(), holders: z.array(z.object({ name: z.string() })) }),
);

const HE_NAMES = new Set(ACCOUNTS.map(({ name }) => name));

const byTitle = (a: { title: string }, b: { title: string }): number => a.title.localeCompare(b.title);

// The HE accounts' Quests in the list, as 김하늘 reads it: she holds none of them, so the list leaves none out.
async function listed(): Promise<z.infer<typeof recruitingSchema>> {
  const quests = recruitingSchema.parse(await stage.bodyOf('/quests/recruiting', '김하늘'));
  return quests.filter(({ leader }) => HE_NAMES.has(leader.name));
}

// A Quest of the list as QUESTS writes it.
function shown(
  { title, board, joinPolicy, leader, capacity, holderCount, nextSubQuest }: z.infer<typeof recruitingSchema>[number],
  numbers: Map<string, string | null>,
): (typeof QUESTS)[number] {
  return {
    title,
    board,
    joinPolicy,
    leader: leader.name,
    capacity,
    holderCount,
    startsAt: nextSubQuest.startsAt ?? '',
    endsAt: nextSubQuest.endsAt ?? '',
    place: numbers.get(nextSubQuest.place.placeId ?? '') ?? nextSubQuest.place.label,
  };
}

describe('The recruiting Quests', () => {
  it('lists the eight on their Boards, recruiting, each held by its Leader alone at its time and Place', async () => {
    const numbers = await stage.placeNumbers();

    const quests = await listed();

    expect(quests.map((quest) => shown(quest, numbers)).toSorted(byTitle)).toStrictEqual(QUESTS.toSorted(byTitle));
    // A short recruiting post in Korean.
    for (const { description } of quests) {
      expect(description).toMatch(/^(?=.*[가-힣]).{10,200}$/su);
    }
  });

  it("goes to the demo's band show through its attending Sub Quest", async () => {
    const forEvents = (await listed()).filter(({ globalEvent }) => globalEvent !== null);

    expect(forEvents).toMatchObject([
      {
        title: '밴드 공연 같이 가요',
        globalEvent: { title: '밴드 동아리 정기공연' },
        nextSubQuest: { attending: true },
      },
    ]);
  });

  it.each([
    ['김하늘', []],
    ['최유나', ['302동 식당 저녁']],
    ['한지우', []],
    ['정민재', ['마케팅 공모전 팀원 구해요']],
    ['이도현', ['밴드 공연 같이 가요', '학관에서 저녁 같이 먹어요']],
    ['박서진', ['면접 스터디', '토요일 아침 러닝']],
    ['오세린', ['자하연에서 점심', '중도에서 같이 과제해요']],
  ])("lists %s's own Quests as %j, which they hold alone", async (name, titles) => {
    const own = ownQuestsSchema.parse(await stage.bodyOf('/quests', name)).filter(({ classQuest }) => !classQuest);

    expect(own.map(({ title }) => title).toSorted()).toStrictEqual(titles);
    expect(own.every(({ holders }) => holders.length === 1 && holders[0]?.name === name)).toBe(true);
  });
});
