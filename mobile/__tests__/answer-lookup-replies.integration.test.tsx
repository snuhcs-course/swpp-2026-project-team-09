/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
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

// Several replies in one test.
jest.setTimeout(150000);

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

// A meal's Plan docks with its main button above the input (P04 tickets 32 and 50) and its pick on the map.
function showsPlan(): boolean {
  const beside = screen.queryByTestId('ai-input-beside');
  const main =
    beside === null ? null : within(beside).queryByRole('button', { name: /만들고 초대 보내기|일정에 넣기/u });
  return main !== null && mapThings().includes(PLAN_PICK);
}

// A way docks with its "길 안내" beside the input (P04 ticket 05).
function showsLookup(): boolean {
  return screen.queryByRole('button', { name: '길 안내' }) !== null && mapThings().includes(LOOKUP_PICK);
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
