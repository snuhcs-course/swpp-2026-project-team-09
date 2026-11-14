/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_OTHER_ORIGIN } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap, card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Where the User sets out from (P02 ticket 03), over the stored answer to "배고파, 민수랑 같이", whose origin chip reads
// "301동에서", and the stored answer from another starting Place, 학생회관 (63동), whose chip reads "63동에서".

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

// 학생회관 as the main server's Place under a point, with the id the stored answers give it.
const STUDENT_HALL = {
  id: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
  number: '63',
  name: '학생회관',
  latitude: 37.45932,
  longitude: 126.95058,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_OTHER_ORIGIN });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof askOnMap>>;

async function chooseOnMap(user: User): Promise<void> {
  await user.press(card().getByRole('button', { name: '301동에서' }));
  await pass(500);
  expect(shownAddress()).toBe('/place-map');
  await user.press(screen.getByRole('button', { name: '이 위치로 정하기' }));
  await pass(500);
}

// Partitions: a Place chosen; a point that is no Place.
describe('the origin chip', () => {
  it("sends the Place chosen in 장소 선택's map view as the User's own start, and draws the answer", async () => {
    server.on('GET /places/at', { status: 200, body: { place: STUDENT_HALL, relation: 'inside' } });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await chooseOnMap(user);

    const [asker, ...others] = MEAL_ANSWER.input.people;
    expect(recalculations(server)).toEqual([
      {
        input: {
          ...MEAL_ANSWER.input,
          people: [{ ...asker, constraints: [{ kind: 'from', placeId: STUDENT_HALL.id, source: 'asker' }] }, ...others],
        },
        location: ON_CAMPUS,
      },
    ]);
    expect(card().getByRole('button', { name: '63동에서' })).toBeVisible();
  });

  it('sends nothing for a point that is no Place, and says to choose a building', async () => {
    server.on('GET /places/at', { status: 200, body: { place: STUDENT_HALL, relation: 'near' } });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await chooseOnMap(user);

    expect(recalculations(server)).toEqual([]);
    expect(within(screen.getByTestId('toast-layer')).getByText('건물을 골라 주세요')).toBeVisible();
    expect(card().getByRole('button', { name: '301동에서' })).toBeVisible();
  });
});
