/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen } from './support/app';
import { card, mapThings } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// One reply replacing another in the answer frame (P01 ticket 11) over the mocks, whose Assistant answers "배고파" with
// the stored answer to "배고파, 민수랑 같이", "문화관이 어디야?" with the Lookup of board q1, and the ways to 24동 with
// those of boards q2 and q3.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// A mark of the first Plan, and one of the Lookup of q1.
const PLAN_PICK = '302동식당 · 12:15 점심';
const LOOKUP_PICK = '문화관(73동) · 걸어서 18분';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function open(): Promise<User> {
  const user = await openMain();
  await pass(500);
  return user;
}

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
}

function showsPlan(): boolean {
  return screen.queryByTestId('condition-chips') !== null && mapThings().includes(PLAN_PICK);
}

function showsLookup(): boolean {
  return screen.queryByTestId('lookup-card') !== null && mapThings().includes(LOOKUP_PICK);
}

// Partitions: a Plan, then a Lookup, then a Plan again, in one conversation. Expected values: the stored answer and the
// copy of board q1.
describe('a reply that replaces another', () => {
  it('turns the card and the map from a Plan to a Lookup, and back', async () => {
    const user = await open();

    await ask(user, '배고파');
    expect([showsPlan(), showsLookup()]).toEqual([true, false]);

    await ask(user, '문화관이 어디야?');
    expect([showsPlan(), showsLookup()]).toEqual([false, true]);
    expect(mapThings()).not.toContain(PLAN_PICK);

    await ask(user, '배고파');
    expect([showsPlan(), showsLookup()]).toEqual([true, false]);
    expect(mapThings()).not.toContain(LOOKUP_PICK);
  });
});

// Partitions: a late way, whose basis opened on its own, and then a way on time. Expected values: the copies of boards
// q3 and q2, and decision 6.
describe('the basis of a new reply', () => {
  it('opens as the new reply says, whatever the last one showed', async () => {
    const user = await open();

    await ask(user, '24동까지 몇 분? 늦나');
    expect(card().getByText('걸어서 15분 · 지금 12:50')).toBeVisible();

    await ask(user, '24동까지 몇 분?');

    expect(card().queryByText('301동 → 24동 걸어서 15분')).toBeNull();
    expect(card().getByRole('button', { name: '근거' })).toBeVisible();
  });
});
