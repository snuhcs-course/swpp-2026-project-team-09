/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
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
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

// Board a6 (P02 ticket 25): a5's band let go at 14:00, over the fake main server, which answers the meet with 민수 with
// the stored real answer of a5 (`meet-answer.json`) and the meet asked again from 14:00 with the stored real answer of
// a6 (`meet-answer-a6.json`). Expected values: the stored a6 answer, whose first Plan is 302동 앞 for 83 minutes where
// the board drew 신양학술정보관 앞 for 80. The Plan's place and people are on the map, its time on the time bar, and
// its basis in the card of its flag (P04 tickets 01 to 04).

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

const PICK = '302동 앞 · 14:07 만남';

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
  await layStage(390, 760);
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(390);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER_FROM_14 });
  await dragBody(105);
  return user;
}

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

// Partitions: the first Plan; its basis and the next Plan; the map.
describe('the band of a5 let go at 14:00 (board a6)', () => {
  it("asks from 14:00, and draws a6's first Plan, its people, its band, and the outline of a5's", async () => {
    const user = await letGoAt14();

    expect(recalculations(server).at(-1)).toEqual({
      input: MEET_ANSWER_FROM_14.input,
      location: ON_CAMPUS,
      clientCapabilities: SENT_CAPABILITIES,
    });
    expect(mapThings()).toEqual(expect.arrayContaining([PICK, '민수']));
    expect(timeBar().getByText('14:07–15:30 · 함께 83분')).toBeVisible();
    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ left: `${(15 / 390) * 100}%` });
    expect(card().getByRole('button', { name: '되돌리기' })).toBeVisible();
    await pressMarker(user, '나 · 17분');
    expect(markCard().getByText('출발 · 24동에서')).toBeVisible();
  });

  it("opens the basis the main server wrote on the pick's flag, and shows 유회진 학술정보관 앞 for 82 minutes", async () => {
    const user = await letGoAt14();

    await pressMarker(user, PICK);
    expect(markCard().getByText('민수 12:15 302동 수업 끝 · 15:30에 나서요')).toBeVisible();
    expect(markCard().getByText('24동 → 302동 앞 걸어서 17분')).toBeVisible();
    expect(markCard().getByText('302동 앞 → 58동 걸어서 27분, 그래서 16:33에 나서요')).toBeVisible();
    await press(user, '카드 닫기');

    await pressMarker(user, '후보 2 · 유회진 학술정보관 앞 · 14:04');
    expect(mapThings()).toContain('유회진 학술정보관 앞 · 14:04 만남');
    expect(timeBar().getByText('14:04–15:26 · 함께 82분')).toBeVisible();
  });

  it('draws 민수 with the dashed ring of a position from the Timetable, at 302동 앞, where they meet at 14:07', async () => {
    await letGoAt14();

    expect(mapThings()).toEqual(expect.arrayContaining(['302동 앞 · 14:07 만남', '나 · 17분', '민수']));
    const face = within(screen.getByTestId('main-map-touches')).getByLabelText('민수');
    // A face's look is named by what it draws: its name, then whether its ring is dashed.
    expect(face.props.testID).toMatch(/^answer:\["face",\["민수",true\]/u);
  });
});
