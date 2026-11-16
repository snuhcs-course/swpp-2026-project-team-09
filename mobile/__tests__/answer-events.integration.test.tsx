/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, ASKER, chats, EVENTS_REPLY, JOB_FAIR, sayOnMap } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// An events answer in the answer frame (P02 ticket 30, board Alone 1), over the fake main server, which answers
// "오늘 볼 만한 거 있어?" with the stored real answer of row 4: the job fair, the concert, and the company session that
// clashes with the 15:30 Class. Its buttons down to their requests, and the switch off. Expected values: the ticket's
// inputs, and the stored answer's words.

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

const ASKED = '오늘 볼 만한 거 있어?';
const CULTURE_HALL = { latitude: 37.46159, longitude: 126.95104 };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerRecalculations(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the request; the first Plan; the third, which clashes.
describe('an events answer (board Alone 1)', () => {
  it('is asked of an app that says it draws events', async () => {
    await sayOnMap(server, ASKED, EVENTS_REPLY);

    expect(chats(server)).toEqual([
      expect.objectContaining({ clientCapabilities: ['library', 'answer', 'area', 'meet', 'events'] }),
    ]);
  });

  it('draws the job fair first with the arrows and the three buttons, and no "＋ 같이"', async () => {
    await sayOnMap(server, ASKED, EVENTS_REPLY);

    expect(card().getByText('13:54 도착 · 78분 볼 수 있어요')).toBeVisible();
    expect(card().getByText('15:30 수업이라 15:12엔 나서요')).toBeVisible();
    expect(card().getByTestId('plan-count')).toHaveTextContent('1/3');
    expect(card().getByRole('button', { name: '다음 후보' })).toBeVisible();
    for (const label of ['같이 갈 파티', '새로 모집', '길 안내']) {
      expect(card().getByRole('button', { name: label })).toBeEnabled();
    }
    expect(card().queryByRole('button', { name: /친구 추가/u })).toBeNull();
    expect(card().queryByRole('button', { name: '이대로 초대' })).toBeNull();
  });

  it('marks the company session, last, as clashing with the 15:30 Class', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);

    await user.press(card().getByRole('button', { name: '이전 후보' }));

    expect(card().getByText('기업 설명회 · 16:00 문화관')).toBeVisible();
    expect(card().getByText('15:30 수업과 겹쳐요')).toBeVisible();
    expect(card().getByText('16:00–17:00 · 수업과 겹쳐요')).toBeVisible();
  });
});

// Ticket decision 4: the main server plans these answers by their own start, so the band is read-only. Partitions: the
// handles, and the chips of where from and until.
describe('the band of an events answer', () => {
  it('draws no handles, and its where-from and until chips take no press', async () => {
    await sayOnMap(server, ASKED, EVENTS_REPLY);

    expect(card().getByText('13:54 도착 · 78분 볼 수 있어요')).toBeVisible();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(screen.queryByLabelText('끝 시각')).toBeNull();
    expect(card().getByRole('button', { name: '15:30 수업까지' })).toBeDisabled();
    expect(card().getByRole('button', { name: '24동에서' })).toBeDisabled();
  });
});

// Partitions: each of the three buttons of the first Plan, and of the second.
describe('the buttons of an events Plan', () => {
  it('"같이 갈 파티" recalculates the parties of its event, with no model, and draws them', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);

    await user.press(card().getByRole('button', { name: '같이 갈 파티' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      { input: { kind: 'quests', globalEventId: JOB_FAIR, questIds: null }, location: ON_CAMPUS },
    ]);
    expect(chats(server)).toHaveLength(1);
    expect(card().getByText('18:00 체육관 · 17:43에 나서요')).toBeVisible();
    expect(card().getByRole('button', { name: '참여하기' })).toBeEnabled();
  });

  it('"새로 모집" recalculates a new party for its event with the User alone, and draws it', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);

    await user.press(card().getByRole('button', { name: '새로 모집' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: {
          kind: 'new-quest',
          date: '2026-11-20',
          globalEventId: JOB_FAIR,
          title: null,
          placeId: null,
          time: null,
          people: [{ userId: ASKER, constraints: [] }],
        },
        location: ON_CAMPUS,
      },
    ]);
    expect(card().getByText('17:10 체육관 · 4명 공개 모집')).toBeVisible();
    expect(card().getByRole('button', { name: '이대로 모집' })).toBeEnabled();
  });
});

// Partitions: the second Plan's parties; the way to the first Plan's Place.
describe('the buttons of another events Plan, and "길 안내"', () => {
  it('"같이 갈 파티" of the second Plan asks for the parties of the concert', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);
    await user.press(card().getByRole('button', { name: '다음 후보' }));

    await user.press(card().getByRole('button', { name: '같이 갈 파티' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { kind: 'quests', globalEventId: '06b0d7bf-98aa-4d49-a22c-4c06d135891c', questIds: null },
        location: ON_CAMPUS,
      },
    ]);
  });

  it('"길 안내" starts the route guidance to the event\'s Place and returns to the everyday map', async () => {
    // A way found, so that no "길을 찾지 못했어요" takes the guidance's words' place.
    server.on('GET /walking-route', {
      status: 200,
      body: { status: 'OK', route: { line: [ON_CAMPUS, CULTURE_HALL], distance: 400, duration: 300 } },
    });
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);
    const before = server.received('GET /walking-route').length;

    await user.press(card().getByRole('button', { name: '길 안내' }));
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
        endLatitude: String(CULTURE_HALL.latitude),
        endLongitude: String(CULTURE_HALL.longitude),
      },
    ]);
    expect(screen.getByText('문화관까지 길 안내')).toBeVisible();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
  });
});

describe('with the switch off', () => {
  it('sends the chat request without the capability of events', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '네', mapButtons: [], cards: [], proposal: null },
    });
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));

    await user.type(screen.getByLabelText(AI_INPUT), ASKED);
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(chats(server)).toEqual([{ messages: [{ role: 'user', text: ASKED }], clientCapabilities: ['library'] }]);
  });
});
