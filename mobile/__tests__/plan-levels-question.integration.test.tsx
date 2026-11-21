/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, within } from '@testing-library/react-native';
import { type FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { AskLevel } from '@/api/plan-quest-types';

// The question after a Plan of the User's became a Quest with Friends not yet asked about, against the fake main
// server: asked about the Friends the reply of POST /plans names, whatever screen made the Quest, each name removable,
// and recorded whether the User answers or skips.

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

const ASKED = 'POST /friends/asked';
const MIN_JUN_LEVEL = `PUT /friends/${MIN_JUN.id}/level`;
const JI_WOO_LEVEL = `PUT /friends/${JI_WOO.id}/level`;
const BOTH = '김민준, 서지우에게 평소에 어디까지 보일까요?';
const SKIP_LINE = '넘기면 지금처럼 둬요. 친구에게 알림은 가지 않아요';

const AT_TIMETABLE: AskLevel[] = [
  { userId: MIN_JUN.id, name: '김민준', level: 'timetable' },
  { userId: JI_WOO.id, name: '서지우', level: 'timetable' },
];

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  for (const route of [ASKED, MIN_JUN_LEVEL, JI_WOO_LEVEL]) {
    server.on(route, { status: 204 });
  }
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const bodies = (route: string): unknown[] => server.received(route).map(({ body }) => body);

// A Plan made into a Quest from wherever the app makes one, with the reply naming those Friends.
async function makeQuest(askLevels: AskLevel[]): Promise<void> {
  server.on('POST /plans', { status: 201, body: { ...PLAN_QUEST, askLevels } });
  const making = { input: MEAL_ANSWER.input, planId: MEAL_PLAN_1.id, startAt: MEAL_PLAN_1.startAt, location: null };
  await act(async () => {
    await apiClient.makePlanQuest(making, 'plan-key');
  });
  await pass(500);
}

function level(words: string): ReturnType<typeof screen.getByRole> {
  return within(screen.getByLabelText('평소에 보일 위치')).getByRole('radio', { name: words });
}

describe('After a Plan became a Quest', () => {
  it('asks about the Friends named with the design words, the current level chosen', async () => {
    await openMain();

    await makeQuest(AT_TIMETABLE);

    expect(screen.getByRole('header', { name: BOTH })).toBeVisible();
    expect(screen.getByText('지금은 둘에게 시간표만 보여요. 뺀 친구는 그대로 둬요.')).toBeVisible();
    // The Friends were only invited: "내 파티에 처음 들어왔어요" said they had joined.
    expect(screen.getByText('처음 초대한 친구예요')).toBeVisible();
    expect(level('시간표만')).toBeChecked();
    expect(level('지금 있는 건물')).not.toBeChecked();
    expect(level('정확한 위치')).not.toBeChecked();
    expect(screen.getByText(SKIP_LINE)).toBeVisible();
    expect(bodies(ASKED)).toEqual([]);
  });

  it('says what each Friend sees when their levels differ, and chooses none', async () => {
    await openMain();

    await makeQuest([
      { userId: MIN_JUN.id, name: '김민준', level: 'timetable' },
      { userId: JI_WOO.id, name: '서지우', level: 'exact' },
    ]);

    expect(
      screen.getByText('지금은 김민준에게 시간표만, 서지우에게 정확한 위치까지 보여요. 뺀 친구는 그대로 둬요.'),
    ).toBeVisible();
    expect(level('시간표만')).not.toBeChecked();
    expect(level('정확한 위치')).not.toBeChecked();
  });

  it('asks nothing when the reply names nobody', async () => {
    await openMain();

    await makeQuest([]);

    expect(screen.queryByText(SKIP_LINE)).toBeNull();
    expect(bodies(ASKED)).toEqual([]);
  });
});

describe('The answer to the question after a Plan', () => {
  it('sets the level chosen for the Friends left after one is removed, and records the question for both', async () => {
    const user = await openMain();
    await makeQuest(AT_TIMETABLE);

    await user.press(screen.getByRole('button', { name: '서지우 삭제' }));
    expect(screen.getByRole('header', { name: '김민준에게 평소에 어디까지 보일까요?' })).toBeVisible();
    await user.press(level('지금 있는 건물'));
    await pass(500);

    expect(screen.queryByRole('header', { name: '김민준에게 평소에 어디까지 보일까요?' })).toBeNull();
    expect(bodies(MIN_JUN_LEVEL)).toEqual([{ level: 'building' }]);
    expect(bodies(JI_WOO_LEVEL)).toEqual([]);
    expect(bodies(ASKED)).toEqual([{ userIds: [MIN_JUN.id, JI_WOO.id], moment: 'plan' }]);
    expect(screen.getByTestId('toast-layer')).toHaveTextContent('김민준에게 지금 있는 건물까지 보여요');
  });

  it('records a skip and changes no level', async () => {
    const user = await openMain();
    await makeQuest(AT_TIMETABLE);

    await user.press(screen.getByRole('button', { name: '넘기기' }));
    await pass(500);

    expect(screen.queryByRole('header', { name: BOTH })).toBeNull();
    expect(bodies(MIN_JUN_LEVEL)).toEqual([]);
    expect(bodies(JI_WOO_LEVEL)).toEqual([]);
    expect(bodies(ASKED)).toEqual([{ userIds: [MIN_JUN.id, JI_WOO.id], moment: 'plan' }]);
  });
});
