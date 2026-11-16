/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, within } from '@testing-library/react-native';
import { openBrowserAsync } from 'expo-web-browser';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { PLACES } from './support/dining';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty } from './support/party';
import { askMainServer } from './support/server';

// The answer frame's card renders the markdown the model writes, against the fake main server; its pill shows what the
// User asked as typed.

jest.mock('expo-location');
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));
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

const REPLY = '관정관은 **09:00**부터 열어요.\n- 7층 열람실\n- [이용 안내](https://lib.snu.ac.kr/hours)';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-02T07:00:00.000Z') });
  jest.mocked(openBrowserAsync).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

async function ask(words: string, reply: string): Promise<void> {
  await startFresh();
  sockets.length = 0;
  const server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: reply, mapButtons: [], cards: [], proposal: null },
  });
  const user = await openMain();
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

describe("the frame's card", () => {
  it('shows bold without its asterisks, a list item with its bullet, and opens an https link', async () => {
    await ask('관정 몇 시에 열어?', REPLY);
    const card = within(screen.getByTestId('answer-card'));

    expect(card.getByText('09:00')).toBeVisible();
    expect(card.queryByText(/\*\*/u)).toBeNull();
    expect(card.getByText('7층 열람실')).toBeVisible();
    expect(card.getAllByText('•')).toHaveLength(2);
    expect(card.getByLabelText('관정관은 09:00부터 열어요.\n7층 열람실\n이용 안내')).toBeVisible();

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await fireEvent.press(card.getByText('이용 안내'));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://lib.snu.ac.kr/hours');
  });

  it('shows a javascript: link as its words, with no press', async () => {
    await ask('링크', '[눌러 보세요](javascript:alert(1))');
    const card = within(screen.getByTestId('answer-card'));

    expect(card.getByText('눌러 보세요').props.onPress).toBeUndefined();
    expect(card.queryByRole('link')).toBeNull();
  });
});

describe("the frame's pill", () => {
  it('shows the same text as typed, markers included', async () => {
    await ask('**굵게** 그리고 [링크](https://lib.snu.ac.kr)', '네.');

    expect(
      within(screen.getByTestId('answer-pill')).getByText('**굵게** 그리고 [링크](https://lib.snu.ac.kr)'),
    ).toBeVisible();
  });
});
