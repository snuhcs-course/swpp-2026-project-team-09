/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { answerEvents } from './support/events';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// The user (2026-11-28): "파티 만들기에서 비공개를 누르면 스크롤이 초기화되면서 화면을 다시 그리는 듯 하네." Under 비공개
// 참여 방식 and 게시판 leave, the page grew shorter than the screen and the scroll had to go back to its top; and 관련 행사
// 고르기 took the page's place, so that coming back drew the page anew at its top.

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

const PAGE = 'party-form-page';

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  const server = await askMainServer({ signedIn: true });
  answerEvents(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function laidOut(height: number): Promise<void> {
  await fireEvent(screen.getByTestId(PAGE), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 411, height } } });
}

// The picker's ‹, above the page's.
function last<T>(items: readonly T[]): T {
  const item = items.at(-1);
  if (item === undefined) {
    throw new Error('Nothing is there');
  }
  return item;
}

describe('파티 만들기 as 공개 범위 changes', () => {
  it('keeps the height the page had, so that the scroll stays where it was while only the rows that differ go', async () => {
    const user = await openAt('/party-form');
    await laidOut(1400);

    await user.press(screen.getByRole('radio', { name: '비공개' }));
    await laidOut(1060);

    expect(screen.queryByText('참여 방식')).toBeNull();
    expect(screen.getByTestId(PAGE)).toHaveStyle({ minHeight: 1400 });

    await user.press(screen.getByRole('radio', { name: '공개' }));
    await laidOut(1400);
    expect(screen.getByText('참여 방식')).toBeVisible();
    expect(screen.getByTestId(PAGE)).toHaveStyle({ minHeight: 1400 });
  });
});

describe('파티 만들기 after 관련 행사 고르기', () => {
  it('is the same page, not one drawn anew at its top, both by the ‹ and by Android’s back', async () => {
    const pressBack = holdBackButton();
    const user = await openAt('/party-form');
    const page = screen.getByTestId(PAGE);

    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));
    await pressBack();
    await pass(500);
    expect(screen.getByTestId(PAGE)).toBe(page);

    await user.press(screen.getByRole('button', { name: '관련 행사 고르기' }));
    await user.press(last(screen.getAllByRole('button', { name: '뒤로' })));
    await pass(500);
    expect(screen.getByTestId(PAGE)).toBe(page);
  });
});
