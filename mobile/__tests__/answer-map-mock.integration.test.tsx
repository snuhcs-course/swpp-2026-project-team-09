/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
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
  const user = await openMain();
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
    const user = await openMain();
    await pass(500);
    expect(mapLines()).toContain('walking-route');
    await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(3000);
    // The walk's path comes after the reply, and no line is drawn while it is on its way (P04 ticket 75).
    await pass(500);

    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);

    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    expect(mapLines()).toContain('walking-route');
  });

  // The mock's walking route is a curve of 12 strokes, where the straight line is one (P15 ticket 56).
  it("draws each of the Plan's walks along the mock's walking route", async () => {
    await ask();
    await pass(1000);

    for (const id of ['answer:route:0', 'answer:route:1']) {
      expect(within(screen.getByTestId(`line:${id}`)).getAllByTestId('route-stroke')).toHaveLength(12);
    }
  });

  it("keeps the Avatar of a person of the User's Party who is no Friend", async () => {
    await ask();

    expect(screen.getByLabelText('나 · 3분')).toBeOnTheScreen();
    expect(screen.getByLabelText(MEMBER)).toBeOnTheScreen();
  });
});
