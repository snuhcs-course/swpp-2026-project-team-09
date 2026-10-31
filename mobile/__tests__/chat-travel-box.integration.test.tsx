/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, MAJOR, SEO_YEON_GOING } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// The 이동 시간 box of the cards of a 공강 파티 answer, against the fake main server.

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

const QUEST = SEO_YEON_GOING;
const BOX = '이동 시간';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  server.on('GET /quest-join-requests', { status: 200, body: [] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Opens the chat and lets the Assistant answer with these cards.
async function answered(cards: object[]): Promise<void> {
  const body = { text: '갈 수 있는 파티예요.', mapButtons: [], cards, proposal: null };
  server.on('POST /assistant/messages', { status: 200, body });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '갈 수 있는 파티 있어?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

// The box of the Quest's card, as a screen shows it.
async function boxOfQuest(fields: object): Promise<ReturnType<typeof within>> {
  await answered([{ kind: 'quest', quest: QUEST, ...fields }]);
  return within(within(screen.getByTestId(`post-${QUEST.id}`)).getByLabelText(BOX));
}

describe('the 이동 시간 box', () => {
  it.each([
    [{ travel: { mode: 'walk', minutes: 4 } }, ['가는 길 도보 4분']],
    [
      { travel: { mode: 'shuttle', minutes: 11 }, next: { minutes: 13, isClass: true } },
      ['가는 길 셔틀 11분 · 다음 수업까지 13분'],
    ],
    [
      { travel: { mode: 'walk', minutes: 0 }, next: { minutes: 5, isClass: false } },
      ['가는 길 도보 0분 · 다음 일정까지 5분'],
    ],
    [
      { travel: { mode: 'walk', minutes: 12 }, leaveBy: '15:45', endUnknown: true },
      ['가는 길 도보 12분', '끝 시간이 없어요 · 15:45엔 나서야 해요'],
    ],
    [{ travel: { mode: 'shuttle', minutes: 9 }, leaveBy: '15:44' }, ['가는 길 셔틀 9분', '15:44엔 나서야 해요']],
    [{ next: { minutes: 3, isClass: true } }, ['다음 수업까지 3분']],
    [{ leaveBy: '10:50', endUnknown: true }, ['끝 시간이 없어요 · 10:50엔 나서야 해요']],
  ])('shows %j as its lines', async (fields, lines) => {
    const box = await boxOfQuest(fields);

    for (const line of lines) {
      expect(box.getByText(line)).toBeVisible();
    }
    expect(box.getAllByText(/./u)).toHaveLength(lines.length);
  });

});

describe('the 이동 시간 box on a card', () => {
  it("stays beside a Quest card's join button and the places it shows", async () => {
    await answered([{ kind: 'quest', quest: QUEST, travel: { mode: 'walk', minutes: 4 } }]);

    const card = within(screen.getByTestId(`post-${QUEST.id}`));
    expect(card.getByLabelText(BOX)).toBeVisible();
    expect(card.getByText('2/4명')).toBeVisible();
    expect(card.getByRole('button', { name: '참여하기' })).toBeVisible();
  });

  it("stands on a Global Event's card beside its buttons", async () => {
    const fields = { travel: { mode: 'shuttle', minutes: 9 }, leaveBy: '15:44', endUnknown: true };

    await answered([{ kind: 'globalEvent', globalEvent: MAJOR, ...fields }]);

    const card = within(screen.getByTestId(`event-${MAJOR.id}`));
    expect(card.getByText('가는 길 셔틀 9분')).toBeVisible();
    expect(card.getByText('끝 시간이 없어요 · 15:44엔 나서야 해요')).toBeVisible();
    expect(card.getByRole('button', { name: 'AI 매칭' })).toBeVisible();
  });

  it('is not drawn on a card without its fields', async () => {
    await answered([
      { kind: 'quest', quest: QUEST },
      { kind: 'globalEvent', globalEvent: MAJOR },
    ]);

    expect(screen.queryByLabelText(BOX)).toBeNull();
  });
});
