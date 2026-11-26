/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { font } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { BOOK_TALK, CAREER, MAJOR, pickEvent } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MY_HIKE, openAt } from './support/party';
import { answerForm, FESTIVAL, fillPublic, permission, PHOTO_URI, submit } from './support/party-form';
import { toast, toastIcon } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';
import { readQuestEntries } from '@/storage/quest-entries';

// 파티 만들기's 사진, the event picker's list, 태그 and the board sheet, against the fake main server.

jest.mock('expo-location');
jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
// The app keeps a picked photo in its documents, here under its own name.
jest.mock('@/storage/kept-photo', () => ({
  keepPhoto: jest.fn((uri: string) => Promise.resolve(uri.replace('/photos/', '/documents/quest-photos/'))),
}));
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

const KEPT_URI = PHOTO_URI.replace('/photos/', '/documents/quest-photos/');
const HIDDEN = { includeHiddenElements: true };
const LONG_TITLE = '제147회 규장각 콜로키엄 | 147th Kyujanggak Colloquium';
const LONG_PLACE = '서울대학교 규장각한국학연구원(103동) 1-44호 & Zoom 온라인 회의실(전날 이메일로 접속 안내 예정)';

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerForm(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// The words of an event's row in the picker: the title and the time and place lines.
function rowWords(event: { title: string }): ReturnType<typeof screen.getByTestId> {
  return within(screen.getByRole('button', { name: `행사 · ${event.title}` })).getByTestId('picker-words');
}

function shownEvents(): string[] {
  return screen.getAllByRole('button', { name: /^행사 · /u }).map(({ props }) => String(props.accessibilityLabel));
}

describe('사진', () => {
  it('asks for the camera only when 카메라 is pressed, shows the photo, and 사진 빼기 takes it away', async () => {
    const user = await openAt('/party-form');
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: '카메라' }));
    await pass(0);

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('photo-preview')).toHaveProp('source', { uri: KEPT_URI });
    expect(screen.queryByRole('button', { name: '앨범' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '사진 빼기' }));
    expect(screen.queryByTestId('photo-preview')).toBeNull();
    expect(screen.getByRole('button', { name: '카메라' })).toBeVisible();
  });

  it('keeps the album’s photo on the phone with the Quest, asking for no permission, and sends the main server none', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '앨범' }));
    await pass(0);
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    await fillPublic(user);

    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).not.toHaveProperty('photo');
    expect((await readQuestEntries())[MY_HIKE.id]?.photo).toEqual({
      kind: 'picked',
      uri: KEPT_URI,
      caption: '내가 첨부한 사진',
    });
  });
});

describe('사진 not taken', () => {
  it('says what to allow when the camera is refused, and opens nothing', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue(permission(false));
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '카메라' }));
    await pass(0);

    expect(toast()).toHaveTextContent('카메라를 쓸 수 있게 해 주세요');
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId('photo-preview')).toBeNull();
  });

  it('says so when the photo cannot be taken from the album', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockRejectedValue(new Error('No picker'));
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '앨범' }));
    await pass(0);

    expect(toast()).toHaveTextContent('사진을 가져오지 못했어요. 다시 시도해 주세요');
    expect(toastIcon()).toBe('alert');
    expect(screen.queryByTestId('photo-preview')).toBeNull();
  });
});

describe('the event picker', () => {
  // The main server lists them by their start, which the 행사 tab keeps.
  it('lists every event in one list, as the 행사 tab orders them, without tabs, and the search finds across them', async () => {
    server.on('GET /global-events', { status: 200, body: [CAREER, MAJOR, FESTIVAL, BOOK_TALK] });
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));

    for (const name of ['진로', '이벤트', '축제']) {
      expect(screen.queryByRole('tab', { name })).toBeNull();
    }
    expect(shownEvents()).toEqual([CAREER, MAJOR, FESTIVAL, BOOK_TALK].map(({ title }) => `행사 · ${title}`));

    await user.type(screen.getByLabelText('행사 검색'), '설명회');
    expect(shownEvents()).toEqual([`행사 · ${CAREER.title}`, `행사 · ${MAJOR.title}`]);
    await user.clear(screen.getByLabelText('행사 검색'));
    await user.type(screen.getByLabelText('행사 검색'), '공연');
    expect(shownEvents()).toEqual([`행사 · ${FESTIVAL.title}`]);
  });

  it('fills the title, the place and the time from a festival, adds no tags, and shows no kind over the title', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await pickEvent(user, FESTIVAL);

    const chosen = within(screen.getByTestId('chosen-event'));
    expect(chosen.getByText(FESTIVAL.title)).toBeVisible();
    expect(chosen.queryByText('축제')).toBeNull();
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('가을 축제 개막 공연 같이 가요');
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('버들골 풍산마당');
    expect(screen.getByRole('button', { name: /^언제 10월 9일/u })).toBeVisible();
    expect(screen.queryByRole('button', { name: '#축제', selected: true })).toBeNull();
    expect(screen.queryByRole('button', { name: '#공연', selected: true })).toBeNull();
  });
});

describe('a row of the event picker', () => {
  // As the 행사 tab's row (P06 ticket 15), its day and its 56-wide date column included.
  it("sets a row as the 행사 tab's: a long title on two lines, then the time and the place on lines of their own after their icons", async () => {
    server.on('GET /global-events', {
      status: 200,
      body: [
        { ...CAREER, title: LONG_TITLE, place: LONG_PLACE },
        { ...MAJOR, place: null },
      ],
    });
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));

    const career = screen.getByRole('button', { name: `행사 · ${LONG_TITLE}` });
    const row = within(career);
    expect(career).toHaveStyle({ paddingVertical: 12 });
    expect(row.getByTestId('picker-date')).toHaveStyle({ width: 56 });
    expect(row.getByText('6')).toHaveStyle({ fontFamily: font.bold, fontSize: 22, lineHeight: 28 });
    expect(row.getByText('10월 · 오늘')).toHaveStyle({ fontSize: 12, lineHeight: 16 });
    expect(row.getByText(LONG_TITLE)).toHaveStyle({ fontFamily: font.bold, fontSize: 16, lineHeight: 23 });
    expect(row.getByText(LONG_TITLE)).toHaveProp('numberOfLines', 2);
    expect(row.getByTestId('event-icon-clock', HIDDEN)).toBeOnTheScreen();
    expect(row.getByText('18:00–20:00')).toHaveStyle({ fontSize: 13, lineHeight: 18 });
    expect(row.getByText('18:00–20:00')).toHaveProp('numberOfLines', 1);
    expect(row.getByTestId('event-icon-pin', HIDDEN)).toBeOnTheScreen();
    expect(row.getByText(LONG_PLACE)).toHaveProp('numberOfLines', 2);
    expect(row.queryByText('컴퓨터공학부 공지')).toBeNull();
    const major = within(screen.getByRole('button', { name: `행사 · ${MAJOR.title}` }));
    expect(major.getByText('17:00')).toBeVisible();
    expect(major.queryByTestId('event-icon-pin', HIDDEN)).toBeNull();
  });

  // The picker has no ☆: only the chosen row keeps its words clear of its check.
  it("keeps room on the right only for the chosen row's check", async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await pickEvent(user, CAREER);

    await user.press(screen.getByRole('button', { name: /^관련 행사 AI 커리어 설명회/u }));

    expect(rowWords(CAREER)).toHaveStyle({ paddingRight: 32 });
    expect(rowWords(MAJOR)).not.toHaveStyle({ paddingRight: 32 });
  });
});

describe('태그', () => {
  it('offers the User’s tags, takes one typed after #, and keeps the chosen ones on the phone', async () => {
    const user = await openAt('/party-form');
    expect(screen.getByRole('button', { name: '#러닝' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: '#재즈' })).not.toBeSelected();

    await user.press(screen.getByRole('button', { name: '#러닝' }));
    await user.press(screen.getByRole('button', { name: '직접 입력' }));
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();
    await user.type(screen.getByLabelText('태그 직접 입력'), '#보드 게임');
    await user.press(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByRole('button', { name: '#러닝' })).toBeSelected();
    expect(screen.getByRole('button', { name: '#보드게임' })).toBeSelected();
    expect(screen.getByLabelText('태그 직접 입력')).toHaveDisplayValue('');

    await fillPublic(user);
    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).not.toHaveProperty('tags');
    expect((await readQuestEntries())[MY_HIKE.id]?.tags).toEqual(['러닝', '보드게임']);
  });
});

describe('the board sheet', () => {
  it('counts each board’s posts and finds a board by its name', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));

    expect(within(screen.getByRole('radio', { name: '식사 게시판' })).getByText('모집글 0')).toBeVisible();
    expect(within(screen.getByRole('radio', { name: '진로 게시판' })).getByText('모집글 1')).toBeVisible();
    expect(within(screen.getByRole('radio', { name: '취미 게시판' })).getByText('모집글 1')).toBeVisible();
    expect(within(screen.getByRole('radio', { name: '공연 게시판' })).getByText('모집글 1')).toBeVisible();

    await user.type(screen.getByLabelText('게시판 검색'), '취미');
    expect(screen.getByRole('radio', { name: '취미 게시판' })).toBeVisible();
    expect(screen.queryByRole('radio', { name: '식사 게시판' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '진로 게시판' })).toBeNull();
  });
});
