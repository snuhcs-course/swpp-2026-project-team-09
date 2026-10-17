/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { BOOK_TALK, CAREER, MAJOR } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { MY_HIKE, openAt } from './support/party';
import { answerForm, FESTIVAL, fillPublic, permission, PHOTO_URI, submit } from './support/party-form';
import { toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';
import { readQuestEntries } from '@/storage/quest-entries';

// 파티 만들기's 사진, the event picker's tabs, 태그 and the board sheet, against the fake main server.

jest.mock('expo-location');
jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
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
    expect(screen.getByTestId('photo-preview')).toHaveProp('source', { uri: PHOTO_URI });
    expect(screen.queryByRole('button', { name: '앨범' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '사진 빼기' }));
    expect(screen.queryByTestId('photo-preview')).toBeNull();
    expect(screen.getByRole('button', { name: '카메라' })).toBeVisible();
  });

  it('keeps the album’s photo on the phone with the Quest, and sends the main server none', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '앨범' }));
    await pass(0);
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    await fillPublic(user);

    await user.press(submit('파티 올리기'));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).not.toHaveProperty('photo');
    expect((await readQuestEntries())[MY_HIKE.id]?.photo).toEqual({
      kind: 'picked',
      uri: PHOTO_URI,
      caption: '내가 첨부한 사진',
    });
  });

  it('says what to allow when the album is refused, and opens nothing', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(false));
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('button', { name: '앨범' }));
    await pass(0);

    expect(toast()).toHaveTextContent('사진 보관함을 볼 수 있게 해 주세요');
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId('photo-preview')).toBeNull();
  });
});

describe('the event picker', () => {
  it('has the tabs 진로, 이벤트 and 축제, and a search over all of them', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));

    expect(screen.getByRole('tab', { name: '진로' })).toBeSelected();
    expect(shownEvents()).toEqual([`행사 · ${CAREER.title}`, `행사 · ${MAJOR.title}`]);
    await user.press(screen.getByRole('tab', { name: '이벤트' }));
    expect(shownEvents()).toEqual([`행사 · ${BOOK_TALK.title}`]);
    await user.press(screen.getByRole('tab', { name: '축제' }));
    expect(shownEvents()).toEqual([`행사 · ${FESTIVAL.title}`]);

    await user.type(screen.getByLabelText('행사 검색'), '설명회');
    expect(shownEvents()).toEqual([`행사 · ${CAREER.title}`, `행사 · ${MAJOR.title}`]);
  });

  it('fills the title, the place, the time and the tags from a festival', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '관련 행사 선택' }));
    await user.press(screen.getByRole('tab', { name: '축제' }));
    await user.press(screen.getByRole('button', { name: `행사 · ${FESTIVAL.title}` }));

    expect(screen.getByTestId('chosen-event')).toHaveTextContent('축제', { exact: false });
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('가을 축제 개막 공연 같이 가요');
    expect(screen.getByLabelText('어디서')).toHaveDisplayValue('버들골 풍산마당');
    expect(screen.getByRole('button', { name: /^언제 10월 9일/u })).toBeVisible();
    expect(screen.getByRole('button', { name: '#축제' })).toBeSelected();
    expect(screen.getByRole('button', { name: '#공연' })).toBeSelected();
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
