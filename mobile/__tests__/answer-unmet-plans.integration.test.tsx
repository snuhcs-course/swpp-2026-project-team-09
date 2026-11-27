/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card, mapThings } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import type { AnswerReply } from '@/api/assistant-types';
import { EASED_ANSWER, NOT_NOW_ANSWER, NOT_NOW_REPLY } from '@/api/mock/data/unmet-plans';

// Conditions that cannot be met (P02-14), in the answer frame against the fake main server, over its real answers of
// board n11 (nothing fits 지금) and n11b (eased to 13:00): the buttons and chips that ease a condition or go back ask
// for a recalculation without the model, and the pick's card holds the basis (n23). The time chips are gone (P04
// ticket 04): the relax buttons stand in for them, and a Plan eased from 지금 has no button back (P04 ticket 86).

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

const NOW_INPUT = NOT_NOW_ANSWER.input;
const EASED_INPUT = { ...NOW_INPUT, window: { from: '13:00', until: null, now: true } };
const EASED_REPLY = { ...NOT_NOW_REPLY, answer: EASED_ANSWER };
const EASED_PICK = '학생회관식당 · 13:00 점심';

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

// The conditions of each recalculation asked for.
const sentInputs = (): unknown[] =>
  recalculations(server).map((body) =>
    typeof body === 'object' && body !== null && 'input' in body ? body.input : null,
  );

// Partitions: each relax button; the 지금 chip.
describe('board n11: nothing fits 지금', () => {
  it('says so, names who has a Class again, and offers to ease one condition each, with no basis', async () => {
    await askOnMap(server, NOT_NOW_REPLY);

    expect(card().getByText('지금은 셋이 먹을 때가 없어요')).toBeVisible();
    expect(card().getByText('지은이 12:00에 다시 수업이에요')).toBeVisible();
    expect(card().getByRole('button', { name: '지은 빼고 보기' })).toBeVisible();
    expect(card().getByRole('button', { name: '13:00 이후' })).toBeVisible();
    expect(card().queryByRole('button', { name: '근거' })).toBeNull();
  });

  it('asks without 지은, keeping 지금, with 지은 빼고 보기', async () => {
    server.on('POST /assistant/answers', { status: 200, body: NOT_NOW_ANSWER });
    const user = await askOnMap(server, NOT_NOW_REPLY);

    await user.press(card().getByRole('button', { name: '지은 빼고 보기' }));
    await pass(500);

    expect(sentInputs()).toEqual([{ ...NOW_INPUT, people: NOW_INPUT.people.slice(0, 2) }]);
  });

  it('asks from 13:00 with 13:00 이후, and draws the eased plan (board n11b)', async () => {
    server.on('POST /assistant/answers', { status: 200, body: EASED_ANSWER });
    const user = await askOnMap(server, NOT_NOW_REPLY);

    await user.press(card().getByRole('button', { name: '13:00 이후' }));
    await pass(500);

    expect(sentInputs()).toEqual([EASED_INPUT]);
    expect(mapThings()).toContain(EASED_PICK);
  });
});

// Partitions: the eased Plan's card. Going back would only show again that nothing fits 지금 (P04 ticket 86).
describe('board n11b: eased to 13:00', () => {
  it('has no 처음으로 and no row of buttons, with "만들고 초대 보내기" beside the input', async () => {
    await askOnMap(server, EASED_REPLY);

    expect(
      within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }),
    ).toBeVisible();
    expect(card().queryByRole('button', { name: '처음으로' })).toBeNull();
    expect(card().queryByTestId('plan-steps')).toBeNull();
  });
});

describe('board n23: a Friend whose position is unknown', () => {
  it("shows the basis in the pick's card", async () => {
    const [plan, ...rest] = EASED_ANSWER.plans;
    const unknown =
      plan === undefined
        ? []
        : [{ ...plan, parts: plan.parts.map((part) => (part.me ? part : { ...part, origin: null })) }];
    const answer: AnswerReply = { ...EASED_ANSWER, plans: [...unknown, ...rest] };
    const user = await askOnMap(server, { ...NOT_NOW_REPLY, answer }, () => layStage(390, 760));

    await pressMarker(user, EASED_PICK);

    expect(within(screen.getByTestId('mark-card')).getByText(plan?.basis[0] ?? '')).toBeVisible();
  });
});
