/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { card, mapThings, timeBar } from './support/answer-map';
import { layStage } from './support/lists';
import { recalculations } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRecalculations, ASKER, chats, EVENTS_REPLY, JOB_FAIR, sayOnMap } from './support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// An events answer in the answer frame (P02 ticket 30, board Alone 1), over the fake main server, which answers
// "오늘 볼 만한 거 있어?" with the stored real answer of row 4: the job fair, the concert, and the company session that
// clashes with the 15:30 Class, and its buttons down to their requests. Expected values: the ticket's inputs, and the
// stored answer's words.

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
      expect.objectContaining({
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      }),
    ]);
  });

  it('draws the job fair first with the three buttons, and no "＋ 같이"', async () => {
    await sayOnMap(server, ASKED, EVENTS_REPLY);

    expect(mapThings()).toContain('채용박람회 · 13:54 채용박람회');
    expect(timeBar().getByText('13:54–15:12 · 78분')).toBeVisible();
    for (const label of ['여기로', '같이 갈 파티', '새로 모집']) {
      expect(card().getByRole('button', { name: label })).toBeEnabled();
    }
    expect(card().queryByRole('button', { name: /친구 추가/u })).toBeNull();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
  });

  it('marks the company session, last, as clashing with the 15:30 Class', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);

    await user.press(card().getByRole('button', { name: '이전 후보' }));

    // The Plan's place is the map's pick and its clash is the time bar's words; the card says no line of it.
    expect(card().getByTestId('plan-count')).toHaveTextContent('3/3');
    expect(mapThings()).toContain('기업 설명회 · 16:00 기업 설명회');
    expect(timeBar().getByText('16:00–17:00 · 수업과 겹쳐요')).toBeVisible();
    expect(card().queryByText('기업 설명회 · 16:00 문화관')).toBeNull();
  });
});

// Ticket decision 4: the main server plans these answers by their own start, so the band is read-only. Partitions: the
// handles, and the User's start, which took the where-from chip's press.
describe('the band of an events answer', () => {
  it("draws no handles, and its start's card offers no other building", async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);
    await layStage(390, 760);

    expect(timeBar().getByText('13:54–15:12 · 78분')).toBeVisible();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(screen.queryByLabelText('끝 시각')).toBeNull();
    await user.press(within(screen.getByTestId('main-map-touches')).getByRole('button', { name: /^나 · /u }));
    const start = within(screen.getByTestId('mark-card'));
    expect(start.getByText('출발 · 24동에서')).toBeVisible();
    expect(start.queryByRole('button', { name: '다른 건물에서 출발', disabled: false })).toBeNull();
  });
});

// Partitions: each of the three buttons of the first Plan, and of the second.
describe('the buttons of an events Plan', () => {
  it('"같이 갈 파티" recalculates the parties of its event, with no model, and draws them', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);

    await user.press(card().getByRole('button', { name: '같이 갈 파티' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { kind: 'quests', globalEventId: JOB_FAIR, questIds: null },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
    expect(chats(server)).toHaveLength(1);
    expect(mapThings()).toContain('배드민턴 한 게임 · 18:00 배드민턴 한 게임');
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
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
    expect(mapThings()).toContain('배드민턴 · 17:10 배드민턴');
    expect(card().getByRole('button', { name: '만들고 모집하기' })).toBeEnabled();
  });
});

// Partitions: the second Plan's parties.
describe('the buttons of another events Plan', () => {
  it('"같이 갈 파티" of the second Plan asks for the parties of the concert', async () => {
    const user = await sayOnMap(server, ASKED, EVENTS_REPLY);
    await user.press(card().getByRole('button', { name: '다음 후보' }));

    await user.press(card().getByRole('button', { name: '같이 갈 파티' }));
    await pass(500);

    expect(recalculations(server)).toEqual([
      {
        input: { kind: 'quests', globalEventId: '06b0d7bf-98aa-4d49-a22c-4c06d135891c', questIds: null },
        location: ON_CAMPUS,
        clientCapabilities: ['library', 'answer', 'area', 'meet', 'events', 'plan-set', 'quest-cancel'],
      },
    ]);
  });
});
