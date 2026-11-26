/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { color } from '@/design-system/tokens';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { socketServer, theSocket } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer } from './support/room';
import { answerParty, cardName, CODING, invitationTo, JAZZ, openAt, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// 찾기: the board filters, the search at their end and the plain cards, against the fake main server (P06 ticket 12).
// The 모집글 a card opens is in `party-find-sheet`.

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

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

const BOARDS = ['전체', '식사', '진로', '취미', '공연'];

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(cardName(title)));
}

// The scrolls 찾기's list was given, leaving out the other scroll views', such as the filter row.
type Scrolled = jest.SpyInstance<void, Parameters<ScrollView['scrollTo']>, ScrollView>;

function listScrolls(scrolled: Scrolled): Parameters<ScrollView['scrollTo']>[0][] {
  return scrolled.mock.contexts.flatMap((view, at) =>
    view.props.testID === 'find-list' ? [scrolled.mock.calls[at]?.[0]] : [],
  );
}

function shownTitles(): string[] {
  return screen.getAllByText(/^(버들골 저녁|알고리즘|재즈 동아리)/u).map(({ props }) => String(props.children));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the 파티 header', () => {
  it('stands + 만들기 in the middle of the bar', async () => {
    await openAt('/party');

    expect(screen.getByRole('button', { name: '만들기' })).toHaveStyle({ alignSelf: 'center' });
  });
});

describe('what 찾기 no longer has', () => {
  it('has no search field in the list, no 모집 중인 파티 heading and no 전체 게시판', async () => {
    await openAt('/party');

    expect(await screen.findByText(RUN.title)).toBeVisible();
    expect(screen.queryByPlaceholderText('파티 검색')).toBeNull();
    expect(screen.queryByRole('header', { name: '모집 중인 파티' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^전체 게시판/u })).toBeNull();
  });

  it('says nothing of the hidden posts', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByLabelText(cardName(RUN.title)));
    await user.press(within(screen.getByLabelText('파티 모집글')).getByRole('button', { name: '관심 없음' }));
    await answer(user, '숨기기');

    expect(screen.queryByText(RUN.title)).toBeNull();
    expect(screen.queryByText(/^숨긴 파티/u)).toBeNull();
  });
});

describe('the board filters', () => {
  it('shows 전체 식사 진로 취미 공연 without counts, at 전체, outside the list that scrolls', async () => {
    await openAt('/party');

    for (const name of BOARDS) {
      expect(screen.getByRole('button', { name })).toBeVisible();
      expect(within(screen.getByTestId('find-list')).queryByRole('button', { name })).toBeNull();
    }
    expect(screen.getByRole('button', { name: '전체' })).toBeSelected();
    expect(within(screen.getByTestId('find-list')).getByLabelText(cardName(RUN.title))).toBeVisible();
  });

  it('shows a board’s posts alone, in the same order, and says when a board has none', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '취미' }));
    expect(screen.getByRole('button', { name: '취미' })).toBeSelected();
    expect(shownTitles()).toEqual([RUN.title]);

    await user.press(screen.getByRole('button', { name: '식사' }));
    expect(screen.queryByLabelText(cardName(RUN.title))).toBeNull();
    expect(screen.getByText('식사 게시판에 모집 중인 파티가 없어요')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '전체' }));
    expect(shownTitles()).toEqual([RUN.title, CODING.title, JAZZ.title]);
  });

  it('fades the row’s end before the magnifier, over the chips that scroll under it, taking no press', async () => {
    const user = await openAt('/party');

    const fade = screen.getByTestId('find-filters-fade');
    expect(fade).toBeOnTheScreen();
    expect(fade).toHaveProp('pointerEvents', 'none');
    expect(within(screen.getByTestId('find-list')).queryByTestId('find-filters-fade')).toBeNull();

    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(screen.queryByTestId('find-filters-fade')).toBeNull();
  });

  it('keeps today’s empty state for 전체 with no post', async () => {
    setAnswers({ recruiting: [] });
    await openAt('/party');

    expect(screen.getByText('결과 없음')).toBeVisible();
  });
});

describe('the search', () => {
  it('turns the filters into the field, finds across boards, and ✕ brings the filters back at 전체', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '취미' }));

    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(screen.queryByRole('button', { name: '취미' })).toBeNull();
    expect(screen.getByPlaceholderText('파티 검색')).toBeVisible();
    await user.type(screen.getByLabelText('파티 검색어'), '코드 리뷰');
    expect(shownTitles()).toEqual([CODING.title]);

    await user.clear(screen.getByLabelText('파티 검색어'));
    await user.type(screen.getByLabelText('파티 검색어'), '없는 파티');
    expect(screen.getByText('결과 없음')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.queryByLabelText('파티 검색어')).toBeNull();
    expect(screen.getByRole('button', { name: '전체' })).toBeSelected();
    expect(shownTitles()).toEqual([RUN.title, CODING.title, JAZZ.title]);
  });

  it('is on 찾기 alone', async () => {
    await openAt('/party?tab=mine');

    expect(screen.queryByRole('button', { name: '파티 검색' })).toBeNull();
  });
});

describe('the list’s place', () => {
  it('goes back to the top when the board changes and when the search opens or closes, not as the words change', async () => {
    const user = await openAt('/party');
    // The React Native mock's `scrollTo` is one mock for every scroll view, which keeps the earlier tests' calls.
    const scrolled = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await user.scrollTo(screen.getByTestId('find-list'), { y: 600 });
    scrolled.mockClear();
    const top = { y: 0, animated: false };

    await user.press(screen.getByRole('button', { name: '진로' }));
    expect(listScrolls(scrolled)).toEqual([top]);

    await user.press(screen.getByRole('button', { name: '파티 검색' }));
    expect(listScrolls(scrolled)).toEqual([top, top]);
    await user.type(screen.getByLabelText('파티 검색어'), '코드 리뷰');
    expect(listScrolls(scrolled)).toEqual([top, top]);

    await user.press(screen.getByRole('button', { name: '검색 닫기' }));
    expect(listScrolls(scrolled)).toEqual([top, top, top]);
  });
});

describe('a card', () => {
  it('shows the board, the fill, the title, and the time and the place each on a line', async () => {
    await openAt('/party');

    const run = card(RUN.title);
    expect(run.getByText('취미 게시판')).toBeVisible();
    expect(run.getByText('3/8명')).toBeVisible();
    expect(run.getByText(RUN.title)).toBeVisible();
    expect(run.getByText('오늘 19:30')).toBeVisible();
    expect(run.getByText('버들골 (100동) 입구')).toHaveProp('numberOfLines', 2);
    expect(run.queryByText('·')).toBeNull();
    expect(run.queryByText(RUN.description)).toBeNull();
    expect(card(CODING.title).getByText('진로 게시판')).toBeVisible();
    expect(card(CODING.title).getByText('장소 미정')).toBeVisible();
  });

  it('speaks its title, time, place and fill, and the event after the place', async () => {
    await openAt('/party');

    expect(screen.getByLabelText(`${RUN.title}, 오늘 19:30, 버들골 (100동) 입구, 3/8명`)).toBeVisible();
    expect(screen.getByLabelText(`${JAZZ.title}, 시간 미정, 장소 미정, 재즈 정기공연, 5/6명`)).toBeVisible();
  });

  it('has no photo, no faces, no members line and no buttons', async () => {
    await openAt('/party');

    const run = card(RUN.title);
    expect(run.queryAllByRole('image')).toEqual([]);
    expect(run.queryByText('최유나 외 2명 · 친구 1명 포함')).toBeNull();
    expect(screen.queryByRole('button', { name: '참여하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '참여 신청' })).toBeNull();
    expect(screen.queryByRole('button', { name: `${RUN.title} 관심 없음` })).toBeNull();
  });

  it('shows the event of a 파티 for one in blue under the place, on one line', async () => {
    await openAt('/party');

    const event = card(JAZZ.title).getByText('재즈 정기공연');
    expect(event).toHaveStyle({ color: color.blue600 });
    expect(event).toHaveProp('numberOfLines', 1);
    expect(card(RUN.title).queryByTestId('event-line')).toBeNull();
  });
});

describe('the mocked parts in the build that asks the main server', () => {
  it('hides official recruiting and the people looking for company in 찾기', async () => {
    await openAt('/party');

    expect(screen.queryByLabelText('공식 모집')).toBeNull();
    expect(screen.queryByText(/^공식 · /u)).toBeNull();
    expect(screen.queryByText('같이 할 사람을 찾는 중')).toBeNull();
  });
});

describe('quests-changed', () => {
  it('fetches 찾기, 내 파티 and 초대 again', async () => {
    await openAt('/party');
    await socketServer((socket) => {
      socket.accept();
    });

    setAnswers({ recruiting: [CODING], quests: [], invitations: [invitationTo(RUN, 'qi9')] });
    await act(() => {
      theSocket().send('quests-changed');
    });
    await pass(500);

    expect(screen.queryByText(RUN.title)).toBeNull();
    expect(screen.getByText(CODING.title)).toBeVisible();
    expect(screen.getByRole('tab', { name: /^초대/u })).toHaveTextContent('초대1');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toHaveTextContent('내 파티');
    expect(screen.getByRole('tab', { name: /^내 파티/u })).not.toHaveTextContent('1');
  });
});
