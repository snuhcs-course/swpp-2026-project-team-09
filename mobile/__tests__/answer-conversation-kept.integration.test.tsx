/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines } from './support/answer-map';
import { holdBackButton } from './support/back';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';
import { CONTINUE, reopenAnswer } from './support/questions';

// P02 ticket 32 against the fake main server: leaving the answer frame hides it and keeps the conversation, the map
// screen's chip "이어서 · …" shows it again (P04 tickets 11 and 33), a message from the everyday map starts a new
// conversation and keeps the old one aside (P04 ticket 33), and "새 대화" keeps it aside in the list of questions (P04
// ticket 10).

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

const ASKED = '배고파, 민수랑 같이';
const REPLY = '셔틀 두 대가 정문과 자연대에 있어요.';
const TEXT_REPLY = { text: REPLY, mapButtons: ['shuttle'], cards: [], proposal: null };
// A mark of the first Plan on the map.
const PLAN_MARK = '302동식당 · 12:15 점심';
// The map screen's chip of the conversation kept (P04 ticket 11), in place of "이전 답".
const EARLIER = CONTINUE;

let server: FakeServer;
let back: () => Promise<boolean>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  back = holdBackButton();
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function answerWith(body: object, afterMs = 500): void {
  server.on('POST /assistant/messages', { status: 200, body, afterMs });
}

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

// Opens the main screen and asks; the main server answers with `body`.
async function asked(body: object, words = ASKED): Promise<User> {
  answerWith(body);
  const user = await openMain();
  await send(user, words);
  await pass(500);
  return user;
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function lastSent(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

function sentWith(messages: object[]): unknown {
  return expect.objectContaining({ messages });
}

// The Plan's turn on screen: its mark on the map and its main button beside the input (P04 ticket 04).
function expectPlanShown(): void {
  expect(screen.getByLabelText(PLAN_MARK)).toBeOnTheScreen();
  expect(
    within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }),
  ).toBeVisible();
}

function expectHidden(): void {
  expect(screen.queryByTestId('answer-pill')).toBeNull();
  expect(screen.queryByTestId('answer-card')).toBeNull();
  expect(screen.getByRole('button', { name: EARLIER })).toBeVisible();
}

// Partitions: the four ways to leave, ✕, back, a layer, and route guidance; each shown again by the chip "이어서".
describe('leaving the frame', () => {
  it('hides it with ✕, and the chip "이어서" shows the same turn again', async () => {
    const user = await asked(MEAL_ANSWER_REPLY);

    await user.press(pill().getByRole('button', { name: '답 닫기' }));

    expectHidden();
    await reopenAnswer(user);
    expect(pill().getByText(ASKED)).toBeVisible();
    expectPlanShown();
    expect(screen.queryByRole('button', { name: EARLIER })).toBeNull();
  });

  it("hides it with Android's back button, which goes no further", async () => {
    const user = await asked(MEAL_ANSWER_REPLY);

    await expect(back()).resolves.toBe(true);

    expectHidden();
    await reopenAnswer(user);
    expectPlanShown();
  });

  it('hides it with a map button, which turns its layer on', async () => {
    const user = await asked(TEXT_REPLY, '셔틀 어디 있어?');

    await user.press(card().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expectHidden();
    expect(server.received('GET /shuttle')).toHaveLength(1);
    await reopenAnswer(user);
    expect(card().getByText(REPLY)).toBeVisible();
  });

  it('hides it once "길 안내" starts the route guidance', async () => {
    const user = await asked(WAY_LOOKUP_REPLY, '문화관이 어디야?');

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '길 안내' }));
    await pass(500);

    // To 문화관, where the Lookup's "길 안내" leads.
    expect(server.received('GET /walking-route').at(-1)?.query).toEqual(
      expect.objectContaining({ endLatitude: '37.46159', endLongitude: '126.95104' }),
    );
    expectHidden();
    await reopenAnswer(user);
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '길 안내' })).toBeVisible();
  });
});

describe('a reply on its way when the frame is left', () => {
  it('is kept, and the chip "이어서" shows it', async () => {
    answerWith(TEXT_REPLY, 1000);
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');

    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    await pass(1000);

    expectHidden();
    await reopenAnswer(user);
    expect(card().getByText(REPLY)).toBeVisible();
  });
});

// Partitions: the map while the frame is hidden, and once it is shown again.
describe('the map while the frame is hidden', () => {
  it('draws no answer mark, and a press on a marker opens its card', async () => {
    const user = await asked(MEAL_ANSWER_REPLY);
    await user.press(pill().getByRole('button', { name: '답 닫기' }));

    expect(screen.queryByLabelText(PLAN_MARK)).toBeNull();
    expect(mapLines()).not.toContain('answer:route:0');
    await press(user, DINNER);
    expect(screen.getByTestId('map-card')).toBeVisible();
  });

  it('draws the answer and fits the camera to it again once the chip "이어서" shows the frame', async () => {
    const fit = jest.spyOn(projection, 'fit');
    const user = await asked(MEAL_ANSWER_REPLY);
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    const hidden = fit.mock.calls.length;

    await reopenAnswer(user);

    expect(screen.getByLabelText(PLAN_MARK)).toBeOnTheScreen();
    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
    expect(fit.mock.calls.length).toBeGreaterThan(hidden);
  });
});

// Partitions: a message from the everyday map, and one from the answer's own input.
describe('a message after a reply', () => {
  it('starts a new conversation from the everyday map: only its own message goes, and the frame shows', async () => {
    const user = await asked(TEXT_REPLY, '셔틀 어디 있어?');
    await user.press(pill().getByRole('button', { name: '답 닫기' }));

    await send(user, '정문 셔틀은?');
    await pass(500);

    expect(lastSent()).toEqual(sentWith([{ role: 'user', text: '정문 셔틀은?' }]));
    expect(pill().getByText('정문 셔틀은?')).toBeVisible();
  });

  it("goes on with the conversation from the answer's own input, with the earlier turns", async () => {
    const user = await asked(TEXT_REPLY, '셔틀 어디 있어?');

    await send(user, '정문 셔틀은?');
    await pass(500);

    expect(lastSent()).toEqual(
      sentWith([
        { role: 'user', text: '셔틀 어디 있어?' },
        { role: 'assistant', text: REPLY, cards: [] },
        { role: 'user', text: '정문 셔틀은?' },
      ]),
    );
  });
});

// Partitions: "새 대화" after a reply, and while a question is on its way.
describe('starting over', () => {
  it('keeps the conversation aside with "새 대화": no "이어서", and the next request carries only its own message', async () => {
    const user = await asked(TEXT_REPLY, '셔틀 어디 있어?');

    await user.press(screen.getByRole('button', { name: '새 대화' }));

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.queryByRole('button', { name: EARLIER })).toBeNull();
    expect(screen.getByRole('button', { name: '지난 대화 1개' })).toBeVisible();
    await send(user, '정문 셔틀은?');
    await pass(500);
    expect(lastSent()).toEqual(sentWith([{ role: 'user', text: '정문 셔틀은?' }]));
  });

  it('drops a question still on its way with "새 대화", which keeps nothing then (P04 ticket 10)', async () => {
    answerWith(TEXT_REPLY, 1000);
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');

    await user.press(screen.getByRole('button', { name: '새 대화' }));
    await pass(1000);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.queryByRole('button', { name: EARLIER })).toBeNull();
    expect(screen.queryByRole('button', { name: /^지난 대화/u })).toBeNull();
  });
});
