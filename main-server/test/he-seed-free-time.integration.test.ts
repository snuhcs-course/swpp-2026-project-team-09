/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { ask, postAssistantMessages } from './assistant.js';
import { ACCOUNTS, HeStage } from './he-seed.js';
import { type Step } from './scripted-model.js';

// The effects the spec lists under The Timetables, read through the 공강 tools of the Assistant
// (src/assistant/free-time/) with the scripted model, with the Leaders' own Quests counted as busy as Free Time counts
// them. The clock stands at the evaluation's start, Wednesday 2026-11-04 15:30 in Korea.

const stage = new HeStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const WEDNESDAY = '2026-11-04';
const THURSDAY = '2026-11-05';

type Stretch = [string, string];

// What the tool returned, others' text taken out of its delimiters.
function unwrapped(value: unknown): unknown {
  if (typeof value === 'string') {
    return /^<data label="[^"]*">(.*)<\/data>$/su.exec(value)?.[1] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => unwrapped(entry));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([field, entry]) => [field, unwrapped(entry)]));
  }
  return value;
}

// Sends one message of the account's to the Assistant, for the model to call these tools, and answers what they
// returned. One at a time, as the model follows one script.
async function toolResultsFor(name: string, ...steps: Step[]): Promise<unknown[]> {
  stage.model.script(...steps, { text: '…' });
  const response = await postAssistantMessages(stage.app, stage.tokenOf(name), ask('…'));
  expect(response.status).toBe(200);
  return stage.model.toolResults().map((result) => unwrapped(result));
}

const stretchesSchema = z.array(z.object({ start: z.string(), end: z.string() }));

const toStretches = (stretches: z.infer<typeof stretchesSchema>): Stretch[] =>
  stretches.map(({ start, end }) => [start, end]);

const freeFriendsSchema = z.object({
  result: z.literal('found'),
  freeTime: stretchesSchema,
  friends: z.array(z.object({ name: z.string(), overlap: stretchesSchema })),
});

// The account's Free Time in the window and the Friends free with them, as findFreeFriends answers.
async function freeFriends(
  name: string,
  input: object,
): Promise<{ freeTime: Stretch[]; friends: Record<string, Stretch[]> }> {
  const [found] = await toolResultsFor(name, { tool: 'findFreeFriends', input });
  const { freeTime, friends } = freeFriendsSchema.parse(found);
  return {
    freeTime: toStretches(freeTime),
    friends: Object.fromEntries(friends.map((friend) => [friend.name, toStretches(friend.overlap)])),
  };
}

const myDaySchema = z.object({
  result: z.literal('found'),
  items: z.array(z.object({ name: z.string(), start: z.string(), end: z.string() })),
});

const gapsSchema = z.object({
  result: z.literal('found'),
  gaps: z.array(
    z.object({ start: z.string(), end: z.string(), before: z.string().nullable(), after: z.string().nullable() }),
  ),
});

// The round accounts' Wednesday: their items, and the gaps from now as `start–end before→after`.
const EVALUATION: [string, string[], string[]][] = [
  [
    '김하늘',
    ['11:00–12:15 알고리즘', '16:00–16:50 공학수학2'],
    ['15:30–16:00 알고리즘→공학수학2', '16:50–24:00 공학수학2→'],
  ],
  [
    '최유나',
    ['11:00–12:15 심리학개론', '17:30–18:30 302동 식당 저녁'],
    ['15:30–17:30 심리학개론→302동 식당 저녁', '18:30–24:00 302동 식당 저녁→'],
  ],
  [
    '한지우',
    ['14:00–15:15 확률모형', '17:00–18:15 생산관리'],
    ['15:30–17:00 확률모형→생산관리', '18:15–24:00 생산관리→'],
  ],
  ['정민재', ['12:30–13:45 미시경제이론'], ['15:30–24:00 미시경제이론→']],
];

describe('Free Time during the evaluation, Wednesday from 15:30', () => {
  it.each(EVALUATION)('gives %s the day %j and from now the gaps %j', async (name, items, gaps) => {
    const [day, found] = await toolResultsFor(
      name,
      { tool: 'getMyDay', input: { date: WEDNESDAY } },
      { tool: 'findFreeTimeEvents', input: { date: WEDNESDAY, from: 'now', to: 'end' } },
    );

    expect(myDaySchema.parse(day).items.map(({ start, end, name: item }) => `${start}–${end} ${item}`)).toStrictEqual(
      items,
    );
    expect(
      gapsSchema
        .parse(found)
        .gaps.map(({ start, end, before, after }) => `${start}–${end} ${before ?? ''}→${after ?? ''}`),
    ).toStrictEqual(gaps);
  });
});

// Each account's Free Time at dinner, and the overlap with each of its starting Friends who is free.
const DINNER: [string, Stretch[], Record<string, Stretch[]>][] = [
  ['김하늘', [['17:00', '19:30']], { 오세린: [['17:30', '19:30']] }],
  [
    '최유나',
    [
      ['17:00', '17:30'],
      ['18:30', '19:30'],
    ],
    { 오세린: [['18:30', '19:30']] },
  ],
  ['한지우', [['18:15', '19:30']], { 오세린: [['18:15', '19:30']] }],
  [
    '정민재',
    [['17:00', '19:30']],
    {
      오세린: [['17:30', '19:30']],
      이도현: [
        ['17:00', '18:00'],
        ['19:00', '19:30'],
      ],
    },
  ],
  ['박서진', [], {}],
];

describe('Free Time at Wednesday dinner, 17:00 to 19:30', () => {
  it.each(DINNER)('frees %s for %j, with the starting Friends %j', async (name, freeTime, friends) => {
    const starting = ACCOUNTS.find((account) => account.name === name)?.friends ?? [];

    const found = await freeFriends(name, { date: WEDNESDAY, meal: 'dinner' });

    expect(found.freeTime).toStrictEqual(freeTime);
    expect(
      Object.fromEntries(Object.entries(found.friends).filter(([friend]) => starting.includes(friend))),
    ).toStrictEqual(friends);
  });
});

const LUNCH: [string, Stretch[]][] = [
  ['김하늘', [['11:00', '14:00']]],
  ['정민재', [['11:00', '14:00']]],
  ['한지우', [['12:15', '14:30']]],
  [
    '최유나',
    [
      ['11:00', '12:30'],
      ['13:45', '14:30'],
    ],
  ],
  [
    '이도현',
    [
      ['11:00', '12:30'],
      ['13:45', '14:30'],
    ],
  ],
  [
    '오세린',
    [
      ['11:00', '12:00'],
      ['13:00', '14:00'],
    ],
  ],
  [
    '박서진',
    [
      ['12:15', '12:30'],
      ['13:45', '14:30'],
    ],
  ],
];

describe('Free Time at Thursday lunch, 11:00 to 14:30', () => {
  it.each(LUNCH)('frees %s for %j', async (name, freeTime) => {
    const found = await freeFriends(name, { date: THURSDAY, meal: 'lunch' });

    expect(found.freeTime).toStrictEqual(freeTime);
  });

  it("counts 박서진's 15-minute break as free for a meal with him", async () => {
    const found = await freeFriends('김하늘', {
      date: THURSDAY,
      meal: 'lunch',
      window: { from: '12:00', to: '13:00' },
    });

    expect(found.friends['박서진']).toStrictEqual([['12:15', '12:30']]);
    expect(found.friends['오세린']).toBeUndefined();
  });
});

const receivedSchema = z.object({ received: z.array(z.object({ id: z.string() })) });

// As the two evaluators of a round do on their phones: one sends a Friend Request by the other's Friend ID, and the
// other accepts it.
async function befriendByFriendId(sender: string, receiver: string): Promise<void> {
  const friendId = ACCOUNTS.find(({ name }) => name === receiver)?.friendId;
  expect((await stage.post('/friend-requests', sender).send({ friendId })).status).toBe(201);
  const [received] = receivedSchema.parse(await stage.bodyOf('/friend-requests', receiver)).received;
  expect((await stage.post(`/friend-requests/${received?.id ?? ''}/accept`, receiver)).status).toBe(204);
}

const PARTNERS: [string, string, Stretch[]][] = [
  [
    '김하늘',
    '최유나',
    [
      ['17:00', '17:30'],
      ['18:30', '19:30'],
    ],
  ],
  ['한지우', '정민재', [['18:15', '19:30']]],
];

describe('The round partners at Wednesday dinner, once they are Friends', () => {
  it.each(PARTNERS)('frees %s and %s together for %j', async (one, other, overlap) => {
    await befriendByFriendId(one, other);

    const ones = await freeFriends(one, { date: WEDNESDAY, meal: 'dinner' });
    const others = await freeFriends(other, { date: WEDNESDAY, meal: 'dinner' });

    expect(ones.friends[other]).toStrictEqual(overlap);
    expect(others.friends[one]).toStrictEqual(overlap);
  });
});
