/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { buildingCard, CULTURE_HALL, pressBuilding, STUDENT_HALL } from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, JOB_FAIR } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { SENT_CAPABILITIES } from './support/capabilities';

const TALK = 'c750f9a0-887e-4dc1-99d1-34b065ff6257';

// What the card of a pressed building leads to (P02 ticket 22), over the fake main server: "여기서
// 먹기" asks the recalculation and opens its answer in the answer frame, "가는 길" starts the route guidance, and words
// typed under the card go to the Assistant with the Place in the request context.

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

// a1's "여기서 먹기": lunch for the User alone at 63동.
const EAT_HERE = TAP_LOOKUPS.a1.actions[0];

// No stored answer is of a lunch fixed at 63동: the stored answer of the User alone stands in, its input that of the
// button, as the main server's answer holds the input it was asked.
const EATEN_HERE = { ...MEAL_ANSWER_ALONE, input: EAT_HERE?.kind === 'plan' ? EAT_HERE.input : null };

const STUDENT_POINT = { latitude: STUDENT_HALL.latitude, longitude: STUDENT_HALL.longitude };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /assistant/answers', { status: 200, body: EATEN_HERE });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the answer that comes, and a request that fails.
describe('"여기서 먹기" on the card of a pressed building', () => {
  it('asks the recalculation for its lunch and opens the answer in the frame, the pill saying where and what', async () => {
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);

    await user.press(buildingCard().getByRole('button', { name: '여기서 먹기' }));
    await pass(500);

    expect(server.received('POST /assistant/answers').map(({ body }) => body)).toEqual([
      {
        input: EAT_HERE?.kind === 'plan' ? EAT_HERE.input : null,
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(server.received('POST /assistant/messages')).toEqual([]);
    expect(screen.getByTestId('answer-caption')).toHaveTextContent('63동 · 여기서 먹기', { exact: false });
    // The answer is on the map and the bar, its button beside the input (P04 ticket 04).
    expect(screen.getByTestId('time-bar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it("comes back to the building's card when the frame is closed", async () => {
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
    await user.press(buildingCard().getByRole('button', { name: '여기서 먹기' }));
    await pass(500);

    await user.press(screen.getByRole('button', { name: '뒤로' }));

    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
  });

  it('says that it failed and keeps the card when the recalculation fails', async () => {
    server.on('POST /assistant/answers', { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);

    await user.press(buildingCard().getByRole('button', { name: '여기서 먹기' }));
    await pass(500);

    expect(screen.getByText('답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요')).toBeVisible();
    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
  });
});

describe('"여기서 먹기" while its answer is on its way', () => {
  it('shows the dots in the pressed button while its answer is on its way', async () => {
    server.on('POST /assistant/answers', { status: 200, body: EATEN_HERE, afterMs: 1000 });
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);

    await user.press(buildingCard().getByRole('button', { name: '여기서 먹기' }));

    expect(buildingCard().getByLabelText('여기서 먹기 · 보는 중')).toBeVisible();
    expect(buildingCard().queryByText('여기서 먹기')).toBeNull();
    await pass(1000);
    // The answer is on the map and the bar, its button beside the input (P04 ticket 04).
    expect(screen.getByTestId('time-bar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
  });
});

describe('"가는 길" on the card of a pressed building', () => {
  it('starts the route guidance from the User to the Place and closes the card', async () => {
    // A way found, so that no "길을 찾지 못했어요" takes the guidance's words' place.
    server.on('GET /walking-route', {
      status: 200,
      body: { status: 'OK', route: { line: [ON_CAMPUS, STUDENT_POINT], distance: 900, duration: 900 } },
    });
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
    const before = server.received('GET /walking-route').length;

    await user.press(buildingCard().getByRole('button', { name: '가는 길' }));
    await pass(500);

    expect(
      server
        .received('GET /walking-route')
        .slice(before)
        .map(({ query }) => query),
    ).toEqual([
      {
        startLatitude: String(ON_CAMPUS.latitude),
        startLongitude: String(ON_CAMPUS.longitude),
        endLatitude: String(STUDENT_HALL.latitude),
        endLongitude: String(STUDENT_HALL.longitude),
      },
    ]);
    expect(screen.getByText('63동까지 길 안내')).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: a2's two `plan` buttons, events and parties (P02 ticket 30). Expected values: the stored card's inputs.
describe("a2's buttons on the card of 문화관", () => {
  beforeEach(() => {
    answerRecalculations(server);
  });

  it('"행사 보기" asks the recalculation for the events of the card and opens their answer', async () => {
    const user = await openMain();
    await pressBuilding(server, CULTURE_HALL, TAP_LOOKUPS.a2);

    await user.press(buildingCard().getByRole('button', { name: '행사 보기' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { kind: 'events', date: '2026-11-20', eventIds: [JOB_FAIR, TALK] },
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(screen.getByTestId('answer-caption')).toHaveTextContent('73동 · 행사 보기', { exact: false });
    expect(screen.getByTestId('time-bar')).toBeOnTheScreen();
    expect(card().getByRole('button', { name: '같이 갈 파티' })).toBeEnabled();
  });

  it('"같이 갈 파티" asks the recalculation for the job fair\'s parties and opens their answer', async () => {
    const user = await openMain();
    await pressBuilding(server, CULTURE_HALL, TAP_LOOKUPS.a2);

    await user.press(buildingCard().getByRole('button', { name: '같이 갈 파티' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { kind: 'quests', globalEventId: JOB_FAIR, questIds: null },
        location: ON_CAMPUS,
        clientCapabilities: SENT_CAPABILITIES,
      },
    ]);
    expect(screen.getByTestId('answer-caption')).toHaveTextContent('73동 · 같이 갈 파티', { exact: false });
    expect(screen.getByTestId('time-bar')).toBeOnTheScreen();
  });
});

function lastContext(): unknown {
  const body = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

// Partitions: words sent while the card is open, and after it was closed.
describe('words typed under the card of a pressed building', () => {
  it('carry the Place as what was tapped, and the reply opens in the frame', async () => {
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);

    await user.type(screen.getByLabelText(AI_INPUT), '민수도 같이');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(lastContext()).toMatchObject({ tapped: { kind: 'place', placeId: STUDENT_HALL.id } });
    expect(screen.queryByTestId('map-card')).toBeNull();
    // The first Plan of the stored answer: its pick on the map, its button beside the input (P04 ticket 04).
    expect(
      within(screen.getByTestId('main-map-touches')).getByRole('button', { name: '302동식당 · 12:15 점심' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '만들고 초대 보내기' })).toBeVisible();
  });

  it('carry nothing tapped once the card is closed', async () => {
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });
    const user = await openMain();
    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
    await user.press(buildingCard().getByRole('button', { name: '닫기' }));

    await user.type(screen.getByLabelText(AI_INPUT), '배고파');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(lastContext()).toMatchObject({ tapped: null });
  });
});
