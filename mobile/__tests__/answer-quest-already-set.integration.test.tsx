/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { ANSWER_CAPABILITIES, type AssistantReply, type KeptQuest, type MealSet } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap, mapThings } from './support/answer-map';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 17: an answer beside a Quest the User already holds. The main server sets the held lunch aside, plans as
// if it were not there, and names it (`mealSet`); its line stands in the dock with 그대로 두기, and the button beside
// the input changes it (바꾸기), or, for one shared with others, opens its 파티 (파티 보기). Over the stored answer to
// "배고파" for the User alone, with the main server's line of P05 ticket 16. Expected values: that line and the
// buttons as the ticket and its review agreed them.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const LINE = '이미 12:16 302동식당 점심이 있어요. 바꿀까요?';
const OWN: MealSet = {
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-10-01T12:16:00+09:00',
  place: '302동식당',
  friendNames: [],
  shared: false,
};
const SHARED: MealSet = { ...OWN, questId: 'q-shared', friendNames: ['민수'], shared: true };
const SHARED_LINE = '이미 민수와 12:16 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔 주세요.';

function replyWith(mealSet: MealSet, text = LINE): AssistantReply {
  return { ...MEAL_ANSWER_REPLY, text, answer: { ...MEAL_ANSWER_ALONE, mealSet } };
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

// Partitions: the line and its buttons; 바꾸기 pressed, answered and refused; 그대로 두기 pressed.
describe('an answer beside a lunch the User holds alone', () => {
  it('says so in the dock with 그대로 두기, and 바꾸기 stands beside the input', async () => {
    await askOnMap(server, replyWith(OWN));

    expect(dock().getByText(LINE)).toBeVisible();
    expect(dock().getByRole('button', { name: '그대로 두기' })).toBeVisible();
    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '일정에 넣기' })).toBeNull();
  });

  it('makes the new Plan from 바꾸기, which the main server puts in place of the held one', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received('POST /plans')).toHaveLength(1);
  });

  it('says to change it in its 파티 when the lunch became shared, and makes nothing', async () => {
    server.on('POST /plans', refusal(409, 'MEAL_ALREADY_SET', { questId: OWN.questId }));
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(screen.getByText('같이 정한 약속이라 그 파티에서 바꿔 주세요')).toBeVisible();
    expect(server.received('POST /plans')).toHaveLength(1);
  });

  it('closes the answer from 그대로 두기 and sends nothing', async () => {
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(dock().getByRole('button', { name: '그대로 두기' }));
    await pass(300);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(server.received('POST /plans')).toHaveLength(0);
  });
});

// Partitions: the buttons; 파티 보기 pressed.
describe('an answer beside a lunch shared with a Friend', () => {
  it('has no 바꾸기, and 파티 보기 beside the input', async () => {
    await askOnMap(server, replyWith(SHARED, SHARED_LINE));

    expect(dock().getByText(SHARED_LINE)).toBeVisible();
    expect(dock().getByRole('button', { name: '그대로 두기' })).toBeVisible();
    expect(beside().getByRole('button', { name: '파티 보기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
  });

  it('opens that 파티 from 파티 보기', async () => {
    const user = await askOnMap(server, replyWith(SHARED, SHARED_LINE));

    await user.press(beside().getByRole('button', { name: '파티 보기' }));
    await pass(300);

    expect(shownAddress()).toBe(`/room/${SHARED.questId}`);
  });
});

// The meeting with 민수 the User leads, which a meet answer sets aside (P05 ticket 17's `planSet`).
const MEETING: KeptQuest = {
  kind: 'meet',
  questId: 'q-meeting',
  title: '민수와 만나기',
  startAt: '2026-10-01T15:00:00+09:00',
  endAt: null,
  place: '302동 앞',
  people: [{ name: '민수', answer: 'accepted' }],
  mine: true,
  changeable: true,
};
const MEET_LINE = '이미 15:00 302동 앞에서 민수와 약속이 있어요. 바꿀까요?';
const MEET_REPLY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  text: MEET_LINE,
  answer: { ...MEET_ANSWER, planSet: MEETING },
};

// Partitions: 바꾸기 of a meeting, answered; a meal's `planSet` read before its `mealSet`.
describe("the main server's planSet", () => {
  it('changes the meeting in place from 바꾸기, and the answer stays and says so, with no button left', async () => {
    server.on(`PUT /plans/${MEETING.questId}`, { status: 200, body: PLAN_QUEST.quest });
    const user = await askOnMap(server, MEET_REPLY);

    expect(dock().getByText(MEET_LINE)).toBeVisible();
    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received(`PUT /plans/${MEETING.questId}`)).toHaveLength(1);
    expect(server.received('POST /plans')).toHaveLength(0);
    // The stored meet answer's first Plan is at 12:15, with 민수.
    expect(dock().getByText('약속을 12:15으로 바꿨어요. 민수에게 알렸어요')).toBeVisible();
    expect(screen.getByTestId('answer-card')).toBeVisible();
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '그대로 두기' })).toBeNull();
    // Only the meeting as it now stands: no other candidate, no handle on the bar.
    expect(mapThings()).not.toContain('후보 2 · 301동 앞');
    expect(screen.queryByRole('adjustable', { name: '시작 시각' })).toBeNull();
  });

  it("is read before a meal's mealSet, so that a shared one shows 파티 보기", async () => {
    const shared: KeptQuest = { ...MEETING, kind: 'meal-lunch', changeable: false };
    await askOnMap(server, { ...replyWith(OWN), answer: { ...MEAL_ANSWER_ALONE, mealSet: OWN, planSet: shared } });

    expect(beside().getByRole('button', { name: '파티 보기' })).toBeEnabled();
  });
});

// Partitions: the chat request, and the make request.
describe('what the app says it can draw', () => {
  it('sends plan-set with the chat request and with POST /plans', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, replyWith(OWN));
    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(ANSWER_CAPABILITIES).toContain('plan-set');
    expect(server.received('POST /assistant/messages').at(-1)?.body).toMatchObject({
      clientCapabilities: ANSWER_CAPABILITIES,
    });
    expect(server.received('POST /plans').at(-1)?.body).toMatchObject({ clientCapabilities: ANSWER_CAPABILITIES });
  });
});

// Partitions: the two refusals of a second meeting, which arrive even though the answer named none.
describe('a second meeting refused', () => {
  it.each([
    ['PLAN_ALREADY_SET', '이미 정한 약속이 있어요. 그 파티에서 확인해 주세요'],
    ['PLAN_SET_BY_FRIEND', '친구가 이미 정한 약속이 있어요. 그 파티에서 확인해 주세요'],
  ])('says what %s is, not to try again', async (code, words) => {
    server.on('POST /plans', refusal(409, code, { questId: MEETING.questId }));
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEET_ANSWER });

    await user.press(beside().getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(500);

    expect(screen.getByText(words)).toBeVisible();
    expect(screen.queryByText('초대하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeNull();
  });
});
