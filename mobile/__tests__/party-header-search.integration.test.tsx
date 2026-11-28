/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { FLOATING_ACTION_ROOM } from '@/design-system';
import { color, font } from '@/design-system/tokens';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty, CODING, openAt, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// The 파티 tab's app bar and 파티 만들기 (P06 ticket 52): the search in the bar as 행사 has it, narrowing 찾기 within
// the board chosen, and 파티 만들기 floating over all three tabs, with room under every list.

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

function shownTitles(): string[] {
  return screen.getAllByText(/^(버들골 저녁|알고리즘|재즈 동아리)/u).map(({ props }) => String(props.children));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  answerParty(await askMainServer({ signedIn: true }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the 파티 header and 파티 만들기', () => {
  it('has the magnifier at the top right and no 만들기; 파티 만들기 floats over 찾기, 내 파티 and 초대', async () => {
    const user = await openAt('/party');

    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
    expect(screen.getByRole('button', { name: '파티 검색' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '만들기' })).toBeNull();
    expect(screen.getByRole('button', { name: '파티 만들기' })).toHaveStyle({
      position: 'absolute',
      right: 16,
      bottom: 12,
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: color.snuBlue,
    });

    await user.press(screen.getByRole('tab', { name: /^내 파티/u }));
    expect(screen.getByRole('button', { name: '파티 만들기' })).toBeVisible();
    await user.press(screen.getByRole('tab', { name: /^초대/u }));
    expect(screen.getByRole('button', { name: '파티 만들기' })).toBeVisible();
  });
});

describe('the room under 파티 만들기', () => {
  // The user's worry: "가장 밑에 있는 것을 가릴 수도 있겠다". Each list ends with the room the button takes, so that
  // its last card, its buttons included, scrolls wholly above the button.
  it('leaves every list under it the room it takes at its end', async () => {
    const user = await openAt('/party');
    const room = { paddingBottom: FLOATING_ACTION_ROOM };
    expect(FLOATING_ACTION_ROOM).toBe(56 + 12 + 16);

    expect(screen.getByTestId('find-list')).toHaveProp('contentContainerStyle', expect.arrayContaining([room]));
    await user.press(screen.getByRole('tab', { name: /^내 파티/u }));
    expect(screen.getByTestId('mine-list')).toHaveStyle(room);
    await user.press(screen.getByRole('tab', { name: /^초대/u }));
    expect(screen.getByTestId('invites-list')).toHaveProp('contentContainerStyle', expect.arrayContaining([room]));
  });

  it('gives way while the keyboard is up, so that it covers neither the field nor what the search found', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '파티 검색' }));

    await showKeyboard(KEYBOARD);
    expect(screen.queryByRole('button', { name: '파티 만들기' })).toBeNull();
    await hideKeyboard();
    expect(screen.getByRole('button', { name: '파티 만들기' })).toBeVisible();
  });

  it('opens the 파티 form from 파티 만들기', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '파티 만들기' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });
});

describe('the search', () => {
  it('opens in the app bar, focused, and searches within the board chosen; ✕ closes it and keeps the board', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '취미' }));

    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(screen.queryByRole('header', { name: '파티' })).toBeNull();
    expect(screen.getByLabelText('파티 검색어')).toHaveProp('autoFocus', true);
    expect(screen.getByRole('button', { name: '취미' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '찾기' })).toBeVisible();
    await user.type(screen.getByLabelText('파티 검색어'), '코드 리뷰');
    expect(screen.getByText('결과 없음')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '전체' }));
    expect(shownTitles()).toEqual([CODING.title]);
    await user.press(screen.getByRole('button', { name: '취미' }));

    await user.press(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.queryByLabelText('파티 검색어')).toBeNull();
    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
    expect(screen.getByRole('button', { name: '취미' })).toBeSelected();
    expect(shownTitles()).toEqual([RUN.title]);
  });

  it('opened from 내 파티, goes to 찾기 with the field open; leaving 찾기 closes it', async () => {
    const user = await openAt('/party?tab=mine');

    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    expect(screen.getByLabelText('파티 검색어')).toBeVisible();

    await user.press(screen.getByRole('tab', { name: /^초대/u }));
    expect(screen.queryByLabelText('파티 검색어')).toBeNull();
  });

  // The user's choice of the header search's look, 나 (2026-11-28): no box, the words in the title's place on the
  // header's white, the magnifier before them, and one ✕, the app's, that closes the search.
  it('is words in the title’s place with no box, and one ✕ that closes it, on 파티 and on 행사 alike', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    await user.type(screen.getByLabelText('파티 검색어'), '점심');

    const field = screen.getByTestId('header-search');
    expect(field).not.toHaveStyle({ backgroundColor: color.surfaceSubtle });
    expect(screen.getByLabelText('파티 검색어')).toHaveStyle({ fontSize: 18, fontFamily: font.semiBold });
    expect(screen.queryByRole('button', { name: '지우기' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '검색 닫기' })).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.queryByTestId('header-search')).toBeNull();
    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(screen.getByLabelText('파티 검색어')).toHaveDisplayValue('');

    await act(() => {
      router.navigate('/events');
    });
    await pass(500);
    await user.press(screen.getByRole('button', { name: '행사 검색' }));
    expect(screen.getByTestId('header-search')).toBeVisible();
    expect(screen.getByLabelText('행사 검색어')).toHaveStyle({ fontSize: 18 });
  });

  it("closes with Android's back before the back leaves the tab", async () => {
    const pressBack = holdBackButton();
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '파티 검색' }));

    expect(await pressBack()).toBe(true);
    expect(screen.queryByLabelText('파티 검색어')).toBeNull();
    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
  });
});
