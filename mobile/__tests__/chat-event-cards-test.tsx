/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, CAREER, MAJOR, SEO_YEON_GOING } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';

// The Global Events of the Assistant's answers, drawn as the 행사 tab's cards, against the fake main server.

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

const REPLY = '이번 주 설명회 두 개가 있어요.';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the chat, sends a question and lets the Assistant answer with the cards of MAJOR, then CAREER.
async function answered(): Promise<User> {
  const cards = [MAJOR, CAREER].map((globalEvent) => ({ kind: 'globalEvent', globalEvent }));
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards, proposal: null } });
  const user = await openMain();
  await user.press(screen.getByLabelText(AI_INPUT));
  await user.type(screen.getByLabelText(AI_INPUT), '이번 주에 설명회 있어?');
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function chatCard(id: string): ReturnType<typeof within> {
  return within(within(screen.getByTestId('chat-sheet')).getByTestId(`event-${id}`));
}

describe('the event cards of an answer', () => {
  it("shows them in the answer's bubble, in the order given, as the 행사 tab draws them", async () => {
    await answered();

    const bubble = within(screen.getByTestId('assistant-bubble'));
    expect(bubble.getByText(REPLY)).toBeVisible();
    expect(bubble.getAllByRole('link')).toEqual([
      bubble.getByRole('link', { name: MAJOR.title }),
      bubble.getByRole('link', { name: CAREER.title }),
    ]);
    expect(chatCard(CAREER.id).getByText('오늘 18:00–20:00')).toBeVisible();
    expect(chatCard(CAREER.id).getByText('같이 갈 파티 2개')).toBeVisible();
    expect(chatCard(CAREER.id).getByRole('button', { name: '파티 찾기/모집' })).toBeVisible();
    expect(chatCard(CAREER.id).queryByRole('button', { name: 'AI 매칭' })).toBeNull();
  });

  it('are sent back as their references only', async () => {
    const user = await answered();

    await user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await user.press(screen.getByRole('button', { name: '보내기' }));

    expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual({
      messages: [
        { role: 'user', text: '이번 주에 설명회 있어?' },
        {
          role: 'assistant',
          text: REPLY,
          cards: [
            { kind: 'globalEvent', id: MAJOR.id },
            { kind: 'globalEvent', id: CAREER.id },
          ],
        },
        { role: 'user', text: '고마워' },
      ],
    });
  });
});

describe('an event card pressed', () => {
  it('closes the sheet and opens the 행사 tab marked at that event', async () => {
    const user = await answered();

    await user.press(screen.getByRole('link', { name: MAJOR.title }));
    await pass(500);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(screen.getByRole('tab', { name: '행사' })).toBeSelected();
    expect(screen.getByTestId(`event-${MAJOR.id}`)).toHaveStyle({ borderWidth: 2 });
    expect(screen.getByTestId(`event-${CAREER.id}`)).toHaveStyle({ borderWidth: 1 });
  });
});

describe("an event card's 파티 찾기/모집", () => {
  it("opens the tab's sheet over the chat, whose rows open the recruiting posts", async () => {
    server.on('GET /quest-join-requests', { status: 200, body: [] });
    const user = await answered();

    await user.press(chatCard(CAREER.id).getByRole('button', { name: '파티 찾기/모집' }));
    await pass(500);

    expect(server.received('GET /quests/recruiting').at(-1)?.query).toEqual({ globalEventId: CAREER.id });
    expect(screen.getByRole('header', { name: '모집 중인 파티 2' })).toBeVisible();
    expect(screen.getByTestId('chat-sheet')).toBeVisible();

    await user.press(screen.getByRole('button', { name: /^이서연/u }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${SEO_YEON_GOING.id}`);
  });
});
