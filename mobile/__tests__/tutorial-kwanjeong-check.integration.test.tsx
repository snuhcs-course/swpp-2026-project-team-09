/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { type FakeLibrary, fakeTransport } from './support/kwanjeong/fake-library';
import { answerFromFakeLibrary } from './support/library-session';
import { button, findButton } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { answered, startFresh } from './support/mocks';
import { KWANJEONG_ROW, openSheet, pressAndWait, SHEET } from './support/tutorial';
import { forgetWebViews } from './support/web-view';
import { apiClient } from '@/api/client';
import { isLibraryLoggedIn, markLibraryLoggedIn } from '@/library/flag';
import { hiddenTransport } from '@/library/library';
import { isLibraryWrite } from '@/library/site';
import { TUTORIAL_SHEET_FLAGS } from '@/screens/main/tutorial/tutorial-sheet';

// The 관정 quest's 완료했어요 on the main screen (MainTutorialOk and MainTutorialFail): the phone asks the fake
// 관정도서관 for the User's bookings through the library client and completes the quest by what it finds, against the
// main server's mock. The check only reads, and nothing of the library reaches the main server.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// 2026-10-04 12:00 in Korea: the days asked are 2026-09-04 to 2026-10-07, which hold the recorded bookings of
// 2026-10-01 (STATUS 4, 5 and 4) and 2026-10-03 (6, 7 and 7).
const TODAY = new Date('2026-10-04T03:00:00.000Z');
// 2026-11-02 in Korea: the days asked start on 2026-10-03, which holds only a no-show and cancels.
const A_MONTH_LATER = new Date('2026-11-02T03:00:00.000Z');

const CHECKING = '관정도서관 예약 내역을 확인하고 있어요 ···';
const NOT_FOUND = '아직 관정도서관 예약 기록이 없어요.\n예약하고 이용한 뒤 다시 확인해 주세요.';
const FAILED = '도서관 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요.';
const MESSAGE = '관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!';
// The most recent of the recorded bookings that count: STATUS 5, returned.
const FOUND_TITLE = '그룹스터디룸 · G420번';
const FOUND_WHEN = '10월 1일 20:00–23:00 · 예약·이용 기록';

let library: FakeLibrary;

async function setUp(now: Date, loggedIn = true): Promise<void> {
  jest.useFakeTimers({ now });
  await startFresh();
  forgetWebViews();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  library = answerFromFakeLibrary();
  if (loggedIn) {
    await markLibraryLoggedIn();
  }
}

afterEach(() => {
  // The check only reads: no test sends the library a booking, a cancel or a return.
  expect(library.requests.filter(({ endpoint }) => isLibraryWrite(endpoint))).toEqual([]);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// The 관정 quest's status, as the main server's mock holds it.
async function status(): Promise<string | undefined> {
  const { quests } = await answered(apiClient.getTutorial());
  return quests.find(({ key }) => key === 'kwanjeong')?.status;
}

describe('완료했어요 with a booking that counts', () => {
  it('asks for the bookings of the 30 days before to the 3 after, and shows the most recent with 확인됨', async () => {
    await setUp(TODAY);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');

    expect(library.requestsTo('getMyBookingList').map(({ body }) => body)).toEqual([
      { start: '20260904', end: '20261007' },
    ]);
    expect(screen.getByText(FOUND_TITLE)).toBeVisible();
    expect(screen.getByText(FOUND_WHEN)).toBeVisible();
    expect(screen.getByText('확인됨')).toBeVisible();
    expect(screen.getByText(MESSAGE)).toBeVisible();
    expect(await status()).toBe('started');
  });

  it('completes the quest as checked with 퀘스트 완료 and opens the next quest', async () => {
    await setUp(TODAY);
    const complete = jest.spyOn(apiClient, 'completeTutorialQuest');
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');
    await pressAndWait(user, '퀘스트 완료');

    expect(complete.mock.calls).toEqual([['kwanjeong', 'checked']]);
    expect(await status()).toBe('completed');
    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(screen.getByText('퀘스트 완료! 다음 퀘스트 · 4/5')).toBeVisible();
  });
});

describe('while the check runs', () => {
  it('says it is checking until the library answers', async () => {
    await setUp(TODAY);
    const slow = fakeTransport(library);
    jest.spyOn(hiddenTransport, 'call').mockImplementation(
      (endpoint, body) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(slow.call(endpoint, body));
          }, 3000);
        }),
    );
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await user.press(button('완료했어요'));
    await pass(100);

    expect(screen.getByText(CHECKING)).toBeVisible();
    expect(findButton('완료했어요')).toBeNull();
    expect(findButton('나중에')).toBeNull();
    await pass(3000);
    expect(screen.queryByText(CHECKING)).toBeNull();
    expect(screen.getByText('확인됨')).toBeVisible();
  });
});

// What the recorded booking found holds, none of which may reach the main server.
const LIBRARY_DATA = ['G420', '그룹스터디룸', '1000002', 'BSEQNO', 'USESTART', 'ROOM_NAME', '20260904', '20261007'];

// Every call the app makes to the main server's client, by method, from now on.
function recordApiClient(): () => { method: string; args: unknown[] }[] {
  const methods = Object.keys(apiClient).filter((name): name is keyof typeof apiClient => name in apiClient);
  const spies = methods.map((method) => ({ method, spy: jest.spyOn(apiClient, method) }));
  return () => spies.flatMap(({ method, spy }) => spy.mock.calls.map((args: unknown[]) => ({ method, args })));
}

describe('the library data and the main server', () => {
  it('sends the main server only how the quest was completed', async () => {
    await setUp(TODAY);
    const asked = recordApiClient();
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');
    await pressAndWait(user, '퀘스트 완료');

    expect(library.requestsTo('getMyBookingList')).toHaveLength(1);
    expect(asked().filter(({ method }) => method === 'completeTutorialQuest')).toEqual([
      { method: 'completeTutorialQuest', args: ['kwanjeong', 'checked'] },
    ]);
    const sent = JSON.stringify(asked());
    for (const libraryData of LIBRARY_DATA) {
      expect(sent).not.toContain(libraryData);
    }
  });
});

describe('완료했어요 without a booking that counts', () => {
  it('says there is none and offers 다시 확인 and 그냥 완료하기', async () => {
    await setUp(A_MONTH_LATER);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');

    expect(library.requestsTo('getMyBookingList').map(({ body }) => body)).toEqual([
      { start: '20261003', end: '20261105' },
    ]);
    expect(screen.getByText(NOT_FOUND)).toBeVisible();
    expect(screen.queryByText('확인됨')).toBeNull();
    expect(button('다시 확인')).toBeVisible();
    expect(button('그냥 완료하기')).toBeVisible();
    expect(findButton('퀘스트 완료')).toBeNull();
    expect(findButton('어시스턴트에게 예약 부탁하기')).toBeNull();
    expect(await status()).toBe('started');
  });

  it('completes the quest as forced with 그냥 완료하기 and opens the next quest', async () => {
    await setUp(A_MONTH_LATER);
    const complete = jest.spyOn(apiClient, 'completeTutorialQuest');
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');
    await pressAndWait(user, '그냥 완료하기');

    expect(complete.mock.calls).toEqual([['kwanjeong', 'forced']]);
    expect(await status()).toBe('completed');
    expect(screen.getByText('퀘스트 완료! 다음 퀘스트 · 4/5')).toBeVisible();
  });
});

describe('완료했어요 when the library cannot be reached', () => {
  it.each(['network', 'sessionEnded'] as const)('says so after a %s read, and 다시 확인 asks again', async (error) => {
    await setUp(TODAY);
    library.answerNext(error);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');

    expect(screen.getByText(FAILED)).toBeVisible();
    expect(button('그냥 완료하기')).toBeVisible();
    expect(await status()).toBe('started');
    expect(screen.queryByTestId('library-login-view')).toBeNull();

    if (error === 'sessionEnded') {
      // The session that ended clears the flag, so asking again opens the login.
      await expect(isLibraryLoggedIn()).resolves.toBe(false);
      return;
    }
    await pressAndWait(user, '다시 확인');
    expect(library.requestsTo('getMyBookingList')).toHaveLength(2);
    expect(screen.getByText('확인됨')).toBeVisible();
  });
});

describe('완료했어요 without a library session', () => {
  it('opens the login first, and a login that works goes on to the check', async () => {
    await setUp(TODAY, false);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');

    expect(screen.getByTestId('library-login-view')).toBeVisible();
    expect(library.requestsTo('getMyBookingList')).toEqual([]);
    await fireEvent(screen.getByTestId('library-login-view'), 'navigationStateChange', {
      url: 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main',
      loading: false,
    });
    await pass(500);

    // The login's own check, then the quest's.
    expect(library.requestsTo('getMyBookingList')).toHaveLength(2);
    expect(screen.queryByTestId('library-login-view')).toBeNull();
    expect(screen.getByText('확인됨')).toBeVisible();
  });

  it('counts a cancelled login as not found', async () => {
    await setUp(TODAY, false);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');
    await user.press(button('닫기'));
    await pass(500);

    expect(screen.queryByTestId('library-login-view')).toBeNull();
    expect(library.requestsTo('getMyBookingList')).toEqual([]);
    expect(screen.getByText(NOT_FOUND)).toBeVisible();
    expect(button('다시 확인')).toBeVisible();
  });
});

describe('the skip', () => {
  it('completes the quest as skipped without asking the library', async () => {
    await setUp(TODAY);
    const complete = jest.spyOn(apiClient, 'completeTutorialQuest');
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '이미 예약 및 이용해본 적이 있어요');

    expect(complete.mock.calls).toEqual([['kwanjeong', 'skipped']]);
    expect(screen.getByText(MESSAGE)).toBeVisible();
    expect(screen.queryByText('확인됨')).toBeNull();
    expect(library.requests).toEqual([]);
  });
});

describe('어시스턴트에게 예약 부탁하기, once ticket 07 turns it on', () => {
  it('is offered after a check that found nothing, and opens the chat with the request', async () => {
    await setUp(A_MONTH_LATER);
    jest.replaceProperty(TUTORIAL_SHEET_FLAGS, 'askAssistantToBook', true);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '완료했어요');
    await user.press(button('어시스턴트에게 예약 부탁하기'));
    await pass(1000);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(screen.getByText('관정도서관 7층 열람실에 한 자리 예약해줘')).toBeVisible();
    expect(await status()).toBe('started');
  });

  it('stays hidden while the switch is off', async () => {
    await setUp(A_MONTH_LATER);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    expect(findButton('어시스턴트에게 예약 부탁하기')).toBeNull();
    await pressAndWait(user, '완료했어요');
    expect(findButton('어시스턴트에게 예약 부탁하기')).toBeNull();
  });
});
