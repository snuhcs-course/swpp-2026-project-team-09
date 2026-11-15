/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { REFUSAL_RULES } from '../src/assistant/refusals/refusal-tools.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser } from './friends.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// What cannot be answered (P02 ticket 10) at the Assistant's endpoint with the scripted model: the model only names
// the case with refuse, and the server writes the board's lines and offers, a Friend's name and their "now" line from
// the Friend view. Boards n1–n9, n19, n22, and n22b of row 8, on a Tuesday at 11:50 with 민수 in a Class in 302동 until
// 12:15.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const DATE = '2096-02-07';

const replySchema = z.object({
  text: z.string(),
  answer: z.unknown(),
  lookup: z.unknown(),
  refusal: z.unknown(),
});

type Reply = z.infer<typeof replySchema>;

const refuse = (input: object): Step => ({ tool: 'refuse', input });

// The model writes nothing after the call, as its rules say.
const SILENT: Step = { text: '' };

const line = (text: string): { text: string; strong: boolean }[] => [{ text, strong: false }];

const askOffer = (label: string, text = label): object => ({ kind: 'ask', label, text });

const openOffer = (label: string, screen: string): object => ({ kind: 'open', label, screen });

async function replyTo(steps: Step[], words: string, more: object = {}): Promise<Reply> {
  const response = await stage.send(steps, more, words);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

function expectRefusal(reply: Reply, kind: string, lines: string[], offers: object[]): void {
  expect(reply.refusal).toEqual({ kind, lines: lines.map((text) => line(text)), offers });
  expect(reply.answer).toBeNull();
  expect(reply.lookup).toBeNull();
  expect(reply.text).toBe(lines.join('\n'));
}

const [HUNGRY, STUDY, TODAY] = [askOffer('배고파'), askOffer('공부할 자리'), askOffer('오늘 볼 만한 거 있어?')];
const HELPS = [HUNGRY, STUDY, TODAY];

const NOT_A_FRIEND = ['친구로 맺은 사람만 볼 수 있어요.', '친구가 되면 서로 시간표의 건물과 끝나는 시각이 보여요.'];

const WATCHED = '지켜봐 드리는 것은 행사와 모집뿐이에요.';

// The board, what was asked, the kind, its lines, and its offers.
const PLAIN_BOARDS: [string, string, string, string[], object[]][] = [
  ['n1', '강남역 맛집 추천해 줘', 'off-campus', ['캠퍼스 안의 일만 도와 드려요.'], [HUNGRY, TODAY]],
  [
    'n2',
    '자료구조 과제 풀어 줘',
    'general-work',
    ['과제는 도와 드릴 수 없어요.', '캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요.'],
    HELPS,
  ],
  [
    'n3',
    '심심해',
    'vague',
    ['무엇을 해 볼까요?'],
    [askOffer('지금 비는 친구'), askOffer('같이 놀 파티'), askOffer('오늘 볼 만한 행사')],
  ],
  ['n5', '우리 과 조교님 어디 계셔?', 'not-a-friend', NOT_A_FRIEND, [openOffer('친구 추가', 'friend-add')]],
  [
    'n7',
    '누가 내 위치 찾아봤어?',
    'who-looked',
    ['누가 찾았는지는 기록하지 않아요.', '후보로 검토된 것은 누구에게도 알리지 않아요.'],
    [openOffer('위치 공유 보기', 'location-sharing')],
  ],
  ['n19', 'ㅂㄱㅍ', 'not-understood', ['잘 못 알아들었어요.', '이렇게 말해 보세요.'], HELPS],
  [
    'n22b',
    '셔틀 오면 알려 줘',
    'not-watched-shuttle',
    [WATCHED, '지금 물으면 셔틀이 언제 올지 어림해 드려요.'],
    [askOffer('셔틀 언제 와?')],
  ],
];

describe('A case that names no Friend', () => {
  beforeAll(() => stage.asking(DATE, '11:50'));

  it.each(PLAIN_BOARDS)(
    '%s, "%s", answers %s with the board\'s lines and offers, and no answer or Lookup',
    async (_, words, kind, lines, offers) => {
      const reply = await replyTo([refuse({ kind }), SILENT], words);

      expectRefusal(reply, kind, lines, offers);
    },
  );
});

// A new asker at 11:50 with the Friend 민수 in a Class in 302동 from 11:00 to 12:15.
async function withMinsu(): Promise<Named> {
  await stage.asking(DATE, '11:50');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  return minsu;
}

describe('A case that names 민수', () => {
  let minsu: Named;

  beforeAll(async () => {
    minsu = await withMinsu();
  });

  it('n6 says that past positions are not kept, and where 민수 is now from the Timetable the view shows', async () => {
    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'past-location', userId: minsu.id }), SILENT],
      '민수 어제 어디 있었어?',
    );

    expectRefusal(
      reply,
      'past-location',
      ['지난 위치는 저장하지 않아요. 지금과 시간표만 알아요.', '민수는 지금 302동에서 수업 중이에요 · 12:15까지'],
      [askOffer('만나고 싶다', '민수랑 만나고 싶어')],
    );
  });

  it("n9 says that 민수's sharing is 민수's to set", async () => {
    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'others-sharing', userId: minsu.id }), SILENT],
      '민수 위치 켜 줘',
    );

    expectRefusal(
      reply,
      'others-sharing',
      ['민수가 정하는 일이에요.', '내가 민수에게 보일 단계는 바꿀 수 있어요.'],
      [openOffer('위치 공유 보기', 'location-sharing')],
    );
  });

  it('n22 says what is watched, and offers to meet 민수 or to leave an interest', async () => {
    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'not-watched-friend', userId: minsu.id }), SILENT],
      '민수랑 마주칠 때 알려 줘',
    );

    expectRefusal(
      reply,
      'not-watched-friend',
      [WATCHED, '민수와 만나려면 함께 비는 때를 찾아 드려요.'],
      [askOffer('만나고 싶다', '민수랑 만나고 싶어'), openOffer('관심 맡겨 두기', 'interests')],
    );
  });
});

describe("A Friend's name", () => {
  it("is the view's, never the model's words", async () => {
    const minsu = await withMinsu();

    const reply = await replyTo(
      [refuse({ kind: 'others-sharing', userId: minsu.id, name: '가짜 이름' }), SILENT],
      '민수 위치 켜 줘',
    );

    expect(JSON.stringify(reply.refusal)).not.toContain('가짜');
    expect(JSON.stringify(reply.refusal)).toContain('민수가 정하는 일이에요.');
  });

  it('takes 이, 과, and 이랑 after a final consonant', async () => {
    await withMinsu();
    const jieun = await stage.friend('지은');

    const sharing = await replyTo([refuse({ kind: 'others-sharing', userId: jieun.id }), SILENT], '지은 위치 켜 줘');
    const watched = await replyTo(
      [refuse({ kind: 'not-watched-friend', userId: jieun.id }), SILENT],
      '지은이랑 마주칠 때 알려 줘',
    );

    expect(sharing.refusal).toMatchObject({
      lines: [line('지은이 정하는 일이에요.'), line('내가 지은에게 보일 단계는 바꿀 수 있어요.')],
    });
    expect(watched.refusal).toMatchObject({
      lines: [line(WATCHED), line('지은과 만나려면 함께 비는 때를 찾아 드려요.')],
      offers: [askOffer('만나고 싶다', '지은이랑 만나고 싶어'), openOffer('관심 맡겨 두기', 'interests')],
    });
  });
});

describe('Someone who is not a Friend', () => {
  beforeAll(() => stage.asking(DATE, '11:50'));

  it.each([
    ['a User who is no Friend of the asker', 'stranger'],
    ['an id of nobody', 'nobody'],
  ])('answers not-a-friend for %s', async (_, who) => {
    const stranger = await signInUser(stage.app, { name: '조교', department: '컴퓨터공학부' });
    const userId = who === 'stranger' ? stranger.id : randomUUID();

    const reply = await replyTo([refuse({ kind: 'past-location', userId }), SILENT], '조교님 어제 어디 있었어?');

    expectRefusal(reply, 'not-a-friend', NOT_A_FRIEND, [openOffer('친구 추가', 'friend-add')]);
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'shown', kind: 'not-a-friend' });
  });

  it('is not assumed for a case that names a Friend without one: the model is told to resolve them', async () => {
    const reply = await replyTo([refuse({ kind: 'past-location' }), { text: '…' }], '민수 어제 어디 있었어?');

    expect(reply.refusal).toBeNull();
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
  });
});

describe("The reply's text", () => {
  beforeAll(() => stage.asking(DATE, '11:50'));

  it("keeps the model's sentence for an app that does not know the refusal", async () => {
    const sentence = '캠퍼스 밖의 일은 도와 드릴 수 없어요.';

    const reply = await replyTo([refuse({ kind: 'off-campus' }), { text: sentence }], '강남역 맛집 추천해 줘');

    expect(reply.text).toBe(sentence);
    expect(reply.refusal).toMatchObject({ kind: 'off-campus' });
  });

  it('comes with refusal null when there is none', async () => {
    const reply = await replyTo([{ text: '안녕하세요.' }], '안녕');

    expect(reply.refusal).toBeNull();
  });
});

async function at301(): Promise<{ context: { location: { latitude: number; longitude: number } } }> {
  const { latitude, longitude } = await stage.numbered('301');
  return { context: { location: { latitude, longitude } } };
}

const findCultureHall = async (): Promise<Step[]> => [
  { tool: 'resolvePlace', input: { words: '문화관' } },
  { tool: 'findWay', input: { to: (await stage.numbered('73')).id } },
];

describe('A refusal and a Lookup in one run', () => {
  beforeAll(() => stage.asking(DATE, '11:50'));

  it('leave the Lookup when a later tool draws it', async () => {
    const steps = [refuse({ kind: 'off-campus' }), ...(await findCultureHall()), { text: '…' }];

    const reply = await replyTo(steps, '문화관 어디야?', await at301());

    expect(reply.refusal).toBeNull();
    expect(reply.lookup).not.toBeNull();
  });

  it('leave the Lookup when the refusal comes after it, which is not shown', async () => {
    const steps = [...(await findCultureHall()), refuse({ kind: 'off-campus' }), { text: '…' }];

    const reply = await replyTo(steps, '문화관 어디야?', await at301());

    expect(reply.refusal).toBeNull();
    expect(reply.lookup).not.toBeNull();
    expect(stage.model.toolResults()[2]).toMatchObject({ result: 'not shown' });
  });
});

const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('The tool', () => {
  beforeAll(() => stage.asking(DATE, '11:50'));

  it('and its rules are given to an app that draws answers', async () => {
    await replyTo([{ text: '…' }], '심심해');

    expect(toolNames()).toContain('refuse');
    expect(stage.model.system()).toContain(REFUSAL_RULES);
  });

  it('is not given to an app that does not draw answers', async () => {
    stage.model.script({ text: '…' });

    const response = await postAssistantMessages(stage.app, stage.asker.accessToken, ask('심심해'), {
      clientCapabilities: ['library'],
    });

    expect(response.status).toBe(200);
    expect(toolNames()).not.toContain('refuse');
    expect(stage.model.system()).not.toContain(REFUSAL_RULES);
    expect(response.body).toMatchObject({ refusal: null });
  });
});
