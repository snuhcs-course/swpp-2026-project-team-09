/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card } from './support/answer-map';
import { drag, handle, layBand, recalculations, step } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The time band of the card (P02 ticket 03, "A drag" and "After a drag"), over the stored answer to "배고파, 민수랑
// 같이", whose first Plan runs from 12:15 to 12:43, and the stored answer with the start fixed at 12:40, whose first
// Plan is "12:40 학생회관식당" from 12:40 to 12:59. The band's track is laid 240 wide, two points a minute.

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

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_START });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function windowed(from: string | null, until: string | null): object {
  return { input: { ...MEAL_ANSWER.input, window: { from, until } }, location: ON_CAMPUS };
}

// Partitions: the start handle stepped and dragged; the end handle stepped, with no start fixed and with one.
describe('a handle let go', () => {
  it('sends the start stepped up once from 12:15 as the window from 12:20', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    await step('from', 'increment');

    expect(recalculations(server)).toEqual([windowed('12:20', null)]);
  });

  it('sends the start dragged ten minutes on as the window from 12:25', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layBand();

    await drag('from', 20);

    expect(recalculations(server)).toEqual([windowed('12:25', null)]);
  });

  it('sends the end stepped up from 12:43 as the window until 12:45', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    await step('until', 'increment');

    expect(recalculations(server)).toEqual([windowed(null, '12:45')]);
  });

  it('keeps the fixed start when the end is let go after it', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await step('from', 'increment');

    // The fixed start's first Plan ends at 12:59: a step up is 13:00.
    await step('until', 'increment');

    expect(recalculations(server).at(-1)).toEqual({
      input: { ...MEAL_ANSWER_FIXED_START.input, window: { from: '12:40', until: '13:00' } },
      location: ON_CAMPUS,
    });
  });
});

// Partitions: the answer after a drag; "되돌리기".
describe('after a drag', () => {
  it("draws the new answer's first Plan, and the band before the drag as a dashed outline", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    await step('from', 'increment');

    expect(card().getByText('12:40 학생회관식당')).toBeVisible();
    expect(card().getByText('1/2')).toBeVisible();
    // 302동식당 is no candidate of the fixed start's answer: it does not fit, with its reason.
    expect(screen.queryByRole('button', { name: /302동식당/u })).toBeNull();
    expect(screen.getByLabelText('302동식당 · 3분밖에 못 있어요')).toBeOnTheScreen();
    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('brings back the answer before the drag with "되돌리기", without a request, and no outline', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await step('from', 'increment');

    await user.press(card().getByRole('button', { name: '되돌리기' }));
    await pass(500);

    expect(card().getByText('12:15 302동식당')).toBeVisible();
    expect(card().getByText('1/5')).toBeVisible();
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
    expect(card().queryByRole('button', { name: '되돌리기' })).toBeNull();
    expect(recalculations(server)).toHaveLength(1);
  });
});

// Partitions: the time chip pressed, and the while after it.
describe('the time chip', () => {
  it('puts the focus on the end handle for a while and sends nothing', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '13:00 수업까지' }));

    expect(handle('until')).toHaveStyle({ borderColor: color.focusRing });
    expect(handle('from')).not.toHaveStyle({ borderColor: color.focusRing });
    expect(recalculations(server)).toEqual([]);
    await pass(2500);
    expect(handle('until')).not.toHaveStyle({ borderColor: color.focusRing });
  });
});
