/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen } from './support/app';
import { mapLines } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { MEMBER } from './support/markers';
import { startFresh } from './support/mocks';

// The answer drawn on the map (P02 ticket 02, "What gives way") over the mocks, which draw a walking route to the
// next Quest and put a person of the User's Party who is no Friend on the map. The mock Assistant answers "배고파"
// with the stored answer to "배고파, 민수랑 같이".

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

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

async function ask(): Promise<User> {
  const user = await openMain({ answerOnMap: true });
  await pass(500);
  await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
  return user;
}

// Partitions: before the answer, while the Plan is drawn, and after ✕; a walking route, and the Avatar of a person of
// the User's Party who is no Friend and not in the Plan.
describe('what gives way to the Plan over the mocks', () => {
  it('takes the walking route away while the Plan is drawn, and brings it back after ✕', async () => {
    const user = await openMain({ answerOnMap: true });
    await pass(500);
    expect(mapLines()).toContain('walking-route');
    await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(3000);

    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);

    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    expect(mapLines()).toContain('walking-route');
  });

  it("keeps the Avatar of a person of the User's Party who is no Friend", async () => {
    await ask();

    expect(screen.getByLabelText('나 · 3분')).toBeOnTheScreen();
    expect(screen.getByLabelText(MEMBER)).toBeOnTheScreen();
  });
});
