/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEET_ANSWER, MEET_ANSWER_FROM_14 } from '@/api/mock/data/meet-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import { card, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { dragBody, layTrack } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Board a6 (P02 ticket 25): a5's band let go at 14:00, over the fake main server, which answers the meet with 민수 with
// the stored real answer of a5 (`meet-answer.json`) and the meet asked again from 14:00 with the stored real answer of
// a6 (`meet-answer-a6.json`). Expected values: the stored a6 answer, whose first Plan is 302동 앞 for 83 minutes where
// the board drew 신양학술정보관 앞 for 80.

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
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Asks "만나고 싶다" from 민수's card, then drags the band's body from 12:15 to 14:00 on a track laid a point a minute,
// and lets it go; the main server answers the second request with a6.
async function letGoAt14(): Promise<User> {
  const user = await openMain();
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(390);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER_FROM_14 });
  await dragBody(105);
  return user;
}

// Partitions: the card of the first Plan; its basis and the next Plan; the map.
describe('the band of a5 let go at 14:00 (board a6)', () => {
  it("asks from 14:00, and draws a6's first Plan, its chips, its band, and the outline of a5's", async () => {
    await letGoAt14();

    expect(recalculations(server).at(-1)).toEqual({ input: MEET_ANSWER_FROM_14.input, location: ON_CAMPUS });
    expect(card().getByText('14:07 302동 앞')).toBeVisible();
    expect(card().getByText('15:30까지 함께 83분이에요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('1/5');
    expect(card().getByRole('button', { name: '24동에서' })).toBeVisible();
    expect(card().getByRole('button', { name: '14:00부터' })).toBeVisible();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(timeBar().getByText('14:07–15:30 · 함께 83분')).toBeVisible();
    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ left: `${(15 / 390) * 100}%` });
    expect(card().getByRole('button', { name: '되돌리기' })).toBeVisible();
  });

  it('opens the basis the main server wrote, and shows 유회진 학술정보관 앞 for 82 minutes with "›"', async () => {
    const user = await letGoAt14();

    await user.press(card().getByRole('button', { name: '근거' }));
    expect(card().getByText('민수 12:15 302동 수업 끝 · 15:30에 나서요')).toBeVisible();
    expect(card().getByText('24동 → 302동 앞 걸어서 17분')).toBeVisible();
    expect(card().getByText('302동 앞 → 58동 걸어서 27분, 그래서 16:33에 나서요')).toBeVisible();

    await user.press(card().getByRole('button', { name: '다음 후보' }));
    expect(card().getByText('14:04 유회진 학술정보관 앞')).toBeVisible();
    expect(card().getByText('15:26까지 함께 82분이에요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('2/5');
  });

  it('draws 민수 with the dashed ring of a position from the Timetable, at 302동 앞, where they meet at 14:07', async () => {
    await letGoAt14();

    expect(mapThings()).toEqual(expect.arrayContaining(['302동 앞 · 14:07 만남', '나 · 17분', '민수']));
    const face = within(screen.getByTestId('main-map-touches')).getByLabelText('민수');
    // A face's look is named by what it draws: its name, then whether its ring is dashed.
    expect(face.props.testID).toMatch(/^answer:\["face",\["민수",true\]/u);
  });
});
