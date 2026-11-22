/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { ANSWER_CAPABILITIES, type AssistantReply } from '@/api/assistant-types';
import type { LeaveQuestOffer } from '@/api/leave-quest-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 24: "저녁 약속 취소해 줘" answers with one button beside the input, 취소하기 or 나가기 over the Quest's title
// and start, which sends DELETE /quests/{questId} as the room's 나가기 does. Taken, the dock's line says so and the
// button goes; refused, the line says so and the button stays. Expected values: the main server's offer of PR 447
// and the words of the ticket. The phone's clock is Tuesday 2026-10-06 13:00 in Korea.

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

const QUESTION = '오늘 18:00 저녁 약속을 취소할까요?';
const DINNER: LeaveQuestOffer = {
  kind: 'leave-quest',
  label: '취소하기',
  title: '저녁 약속',
  startsAt: '2026-10-06T18:00:00+09:00',
  questId: 'q-dinner',
};

function replyWith(offer: LeaveQuestOffer, text = QUESTION): AssistantReply {
  return { text, mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, offers: [offer] };
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

it('says quest-cancel to the main server', () => {
  expect(ANSWER_CAPABILITIES).toContain('quest-cancel');
});

// Partitions: 취소하기 and 나가기; today and tomorrow.
describe('a Quest asked to be cancelled', () => {
  it('stands as one button beside the input with the Quest it cancels, under the question', async () => {
    await askOnMap(server, replyWith(DINNER));

    expect(dock().getByText(QUESTION)).toBeVisible();
    const button = beside().getByRole('button', { name: '취소하기, 저녁 약속 · 오늘(화) 18:00' });
    expect(button).toBeEnabled();
    expect(within(button).getByText('저녁 약속 · 오늘(화) 18:00')).toBeVisible();
  });

  it('says 나가기 and the day of a Quest tomorrow that others hold', async () => {
    const lunch: LeaveQuestOffer = {
      ...DINNER,
      label: '나가기',
      title: '민수와 점심',
      startsAt: '2026-10-07T12:30:00+09:00',
    };
    await askOnMap(server, replyWith(lunch, '민수와의 점심에서 나갈까요?'));

    expect(beside().getByRole('button', { name: '나가기, 민수와 점심 · 내일(수) 12:30' })).toBeEnabled();
  });
});

// Partitions: the press taken, already gone (404), and refused.
describe('its button pressed', () => {
  it('cancels it with DELETE, says so in the line, and the button goes', async () => {
    server.on('DELETE /quests/q-dinner', { status: 204 });
    const user = await askOnMap(server, replyWith(DINNER));

    await user.press(beside().getByRole('button', { name: /^취소하기/u }));
    await pass(500);

    expect(server.received('DELETE /quests/q-dinner')).toHaveLength(1);
    expect(dock().getByText('‘저녁 약속’ 취소했어요.')).toBeVisible();
    expect(screen.queryByTestId('leave-quest')).toBeNull();
  });

  it('takes a Quest already gone as cancelled', async () => {
    server.on('DELETE /quests/q-dinner', refusal(404, 'QUEST_NOT_FOUND'));
    const user = await askOnMap(server, replyWith(DINNER));

    await user.press(beside().getByRole('button', { name: /^취소하기/u }));
    await pass(500);

    expect(dock().getByText('‘저녁 약속’ 취소했어요.')).toBeVisible();
    expect(screen.queryByTestId('leave-quest')).toBeNull();
  });

  it('says it failed and keeps the button when the main server refuses', async () => {
    server.on('DELETE /quests/q-dinner', { status: 500, body: {} });
    const user = await askOnMap(server, replyWith(DINNER));

    await user.press(beside().getByRole('button', { name: /^취소하기/u }));
    await pass(500);

    expect(dock().getByText('취소하지 못했어요. 다시 눌러 주세요.')).toBeVisible();
    expect(beside().getByRole('button', { name: /^취소하기/u })).toBeEnabled();
  });
});
