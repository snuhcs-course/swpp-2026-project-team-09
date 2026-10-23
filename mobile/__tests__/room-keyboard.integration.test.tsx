/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, openRoom } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// The room while the User types in 파티 채팅: the input stands right above the phone's keyboard, the footer giving way.

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

// The footer's danger button: 나가기, or 파티 없애기 for the Leader.
const FOOTER = /^(나가기|파티 없애기)$/u;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  answerRoom(await askMainServer({ signedIn: true }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('파티 채팅 with the keyboard up', () => {
  it('stands right above the keyboard, the footer giving way, and comes back down with it', async () => {
    await openRoom();
    expect(screen.getByRole('button', { name: FOOTER })).toBeVisible();

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('full-screen-panel')).toHaveStyle({ paddingBottom: KEYBOARD });
    expect(screen.queryByRole('button', { name: FOOTER })).toBeNull();
    expect(within(screen.getByLabelText('파티 채팅')).getByPlaceholderText('파티에 메시지 보내기')).toBeVisible();

    await hideKeyboard();
    expect(screen.getByTestId('full-screen-panel')).toHaveStyle({ paddingBottom: 0 });
    expect(screen.getByRole('button', { name: FOOTER })).toBeVisible();
  });
});
