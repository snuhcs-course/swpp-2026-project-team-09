/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import { recalculations, step } from './support/answer-correct';
import { pass, screen, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { pressMarker } from './support/made-quest';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { NO_LOCATION_ANSWER, NO_LOCATION_REPLY, NO_TIMETABLE_REPLY } from '@/api/mock/data/missing-inputs';
import { LEAVE_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';

// Without a location or a Timetable (P02-13), in the answer frame against the fake main server: the card says what
// the answer assumed, on the User's start and in the pick's card, draws its note above the buttons, and its offers
// beside them, each opening its screen.

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

const EXPLANATION = '지도에 내 아바타를 보여 주려면 위치 권한이 필요해요.';
const N14_NOTE = '캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요';
const START = '나';
const PICK = '301동식당 · 11:50 점심';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
});

function markCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('mark-card'));
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the request without the permission; an answer with an offer and no note (n13), with a note and an
// offer (n15), and a Lookup with a note and no action (n14). Expected values: the stored copies of the main server's
// answers, and board n14's words.
describe('board n13: no location permission', () => {
  it('is asked with no position and the reason, the permission missing', async () => {
    givePhone({ permission: 'refused' });
    await askOnMap(server, NO_LOCATION_REPLY);

    const [sent] = server.received('POST /assistant/messages');
    expect(sent?.body).toMatchObject({ context: { location: null, locationMissing: 'permission' } });
  });

  it("says where the answer took the User to set out from, on the User's start", async () => {
    givePhone({ permission: 'refused' });
    const user = await askOnMap(server, NO_LOCATION_REPLY, () => layStage(390, 760));

    await pressMarker(user, START);

    expect(markCard().getByText('출발 · 301동에서')).toBeVisible();
  });

  it('offers 위치 켜기, which opens the explanation of the location', async () => {
    givePhone({ permission: 'refused' });
    const user = await askOnMap(server, NO_LOCATION_REPLY);
    const steps = within(card().getByTestId('plan-steps'));

    await user.press(steps.getByRole('button', { name: '위치 켜기' }));

    expect(screen.getByText(EXPLANATION)).toBeVisible();
  });
});

describe('a correction of board n13', () => {
  it('asks for the recalculation with no position and the reason, the permission missing', async () => {
    givePhone({ permission: 'refused' });
    server.on('POST /assistant/answers', { status: 200, body: NO_LOCATION_ANSWER });
    await askOnMap(server, NO_LOCATION_REPLY);

    await step('from', 'increment');

    const [sent] = recalculations(server);
    expect(sent).toMatchObject({ location: null, locationMissing: 'permission' });
  });
});

describe('board n15: no Timetable', () => {
  it('says the first is the nearest, and notes what a Timetable would add above the buttons', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await askOnMap(server, NO_TIMETABLE_REPLY, () => layStage(390, 760));

    expect(card().getByText('시간표를 넣으면 나설 시각까지 알려 드려요')).toBeVisible();
    await pressMarker(user, PICK);
    expect(markCard().getByText('시간표가 없어 가까운 순서로 넘겨 봐요')).toBeVisible();
  });

  it('opens the Timetable with 시간표 넣기', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await askOnMap(server, NO_TIMETABLE_REPLY);

    await user.press(card().getByRole('button', { name: '시간표 넣기' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/timetable');
  });
});

// A way with no button docks with its first line and the note as a chip (P04 ticket 05); raised, 닫기 stands alone.
describe('board n14: off campus', () => {
  it('notes that Friends do not see the User, with 닫기 alone', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const lookup = { ...LEAVE_LOOKUP_REPLY.lookup, note: N14_NOTE, actions: [] };
    const user = await askOnMap(server, { ...LEAVE_LOOKUP_REPLY, lookup });

    expect(card().getByRole('button', { name: N14_NOTE })).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();

    await user.press(card().getByText('24동까지 걸어서 15분'));

    expect(card().getByText(N14_NOTE)).toBeVisible();
    expect(card().getByRole('button', { name: '닫기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
  });
});
