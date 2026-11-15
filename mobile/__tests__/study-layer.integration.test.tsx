/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { StudyBuilding } from '@/api/study-types';
import { GRADUATE_SECTOR, KWANJEONG_SECTORS, STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { PLACES, TODAY_MENUS } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { startLibraryChat } from './support/library-chat';
import { findButton, LAYERS } from './support/lists';
import { openMain } from './support/main';
import { lookOf, press, zoomIn } from './support/markers';

// The 공부공간 layer of the `Main` frame and its cards, against the fake main server and the fake library, on Monday
// 2026-11-02 at 16:00 in Korea, while 관정관's reading rooms are open.

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
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));

const CENTRAL = '공부공간 · 중앙도서관';
const KWANJEONG = '공부공간 · 관정관';
const BUSINESS = '공부공간 · 경영학도서관';
const ENGINEERING = '공부공간 · 제1공학관 · 사용할 수 없어요';
const HUMANITIES = '공부공간 · 인문대 신양학술정보관';
const CLUSTER = '공부공간 2곳 묶음 · 눌러서 확대';
const LOG_IN = '로그인하면 좌석 현황을 볼 수 있어요';

let server: FakeServer;
let library: FakeLibrary;

function answerStudy(body: readonly StudyBuilding[] = STUDY_BUILDINGS): void {
  server.on('GET /study-spaces', { status: 200, body });
}

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  answerStudy();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function toggleStudy(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^공부공간/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

// A building of the mock's, by its pin's name.
function building(name: string): StudyBuilding {
  const found = STUDY_BUILDINGS.find((one) => one.name === name);
  if (found === undefined) {
    throw new Error(`No building ${name}`);
  }
  return found;
}

function pin(name: string): ReturnType<typeof screen.queryByRole> {
  return screen.queryByRole('button', { name });
}

// The layer on, at the "pins" level, where no study pin is merged.
async function openLayer(): Promise<User> {
  const user = await openMain();
  await toggleStudy(user);
  await zoomIn(user, 2);
  return user;
}

async function openCard(name: string): Promise<{ user: User; card: ReturnType<typeof within> }> {
  const user = await openLayer();
  await press(user, name);
  await pass(500);
  return { user, card: within(screen.getByTestId('map-card')) };
}

describe('the 공부공간 layer', () => {
  it('asks for the buildings when it is turned on, and takes its pins away when it is turned off', async () => {
    const user = await openLayer();
    expect(server.received('GET /study-spaces')).toHaveLength(1);
    expect(pin(CENTRAL)).toBeVisible();

    await toggleStudy(user);

    expect(pin(CENTRAL)).toBeNull();
  });

  it('puts one rounded-square pin on each building, a building with no usable space in grey', async () => {
    await openLayer();

    for (const name of [CENTRAL, KWANJEONG, BUSINESS, ENGINEERING, HUMANITIES]) {
      expect(pin(name)).toBeVisible();
    }
    expect(lookOf(CENTRAL)).toBe('library:pin');
    expect(lookOf(BUSINESS)).toBe('library:pin');
    expect(lookOf(ENGINEERING)).toBe('library:pin:muted');
  });

  it('merges the pins that overlap while the whole campus is in view, and zooms in on them when pressed', async () => {
    const user = await openMain();
    await toggleStudy(user);

    expect(pin(CLUSTER)).toBeVisible();
    expect(lookOf(CLUSTER)).toBe('study-cluster:2');
    expect(pin(CENTRAL)).toBeNull();
    expect(pin(KWANJEONG)).toBeNull();
    expect(pin(HUMANITIES)).toBeVisible();

    await press(user, CLUSTER);
    await pass(500);

    expect(pin(CLUSTER)).toBeNull();
    expect(pin(CENTRAL)).toBeVisible();
    expect(pin(KWANJEONG)).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe('a building where other things stand', () => {
  it('shares one marker with them, whose card opens the building', async () => {
    const at302 = PLACES.find(({ id }) => id === 'p302');
    expect(at302).toBeDefined();
    answerStudy([{ ...building('제1공학관'), place: at302 ?? PLACES[0], name: '제2공학관' }]);
    server.on('GET /menus', { status: 200, body: TODAY_MENUS });
    const user = await openMain();
    await toggleStudy(user);
    await press(user, LAYERS);
    await user.press(screen.getByRole('togglebutton', { name: /^식당/u }));
    await press(user, '편의기능 레이어 닫기');
    await pass(500);
    await zoomIn(user, 2);

    expect(pin('공부공간 · 제2공학관 · 사용할 수 없어요')).toBeNull();
    await press(user, '식당 1개 · 공부 1개 · 302동');
    await pass(500);
    await user.press(within(screen.getByTestId('map-card')).getByText('공부 1'));
    await user.press(within(screen.getByTestId('map-card')).getByRole('button', { name: '제2공학관' }));
    await pass(500);

    expect(within(screen.getByTestId('map-card')).getByText('해동학술정보실')).toBeVisible();
  });
});

describe("a building's card", () => {
  it('names the building and its 동, each space with its hours, and offers 길찾기', async () => {
    const { card } = await openCard(BUSINESS);

    expect(card.getByRole('header', { name: '경영학도서관' })).toBeVisible();
    expect(card.getByText('58동')).toBeVisible();
    expect(card.getByText('자유열람석')).toBeVisible();
    expect(card.getAllByText('07:00–23:00')).toHaveLength(2);
    expect(card.getByText('운영 시간 확인 필요')).toBeVisible();
    expect(card.getByRole('link', { name: '자유열람석 안내 페이지 열기' })).toBeVisible();
    expect(card.getByRole('button', { name: '길찾기' })).toBeVisible();
    expect(card.queryByRole('button', { name: '좌석 현황' })).toBeNull();
  });

  it('greys a space the User may not use, and says who may when it is pressed', async () => {
    const { user, card } = await openCard(BUSINESS);

    expect(screen.getByTestId('study-row-business-reading-room')).toHaveStyle({ opacity: 0.55 });
    expect(screen.getByTestId('study-row-business-free-seats')).not.toHaveStyle({ opacity: 0.55 });

    await user.press(card.getByRole('button', { name: '열람실 · 07:00–23:00 · 경영대학 학생만 사용할 수 있어요' }));

    expect(within(screen.getByTestId('toast-layer')).getByText('경영대학 학생만 사용할 수 있어요')).toBeVisible();
  });

  it('greys every row of a grey building', async () => {
    await openCard(ENGINEERING);

    expect(screen.getByTestId('study-row-ece-haedong')).toHaveStyle({ opacity: 0.55 });
    expect(screen.getByTestId('study-row-me-haedong-study-hall')).toHaveStyle({ opacity: 0.55 });
  });

  it('says "대학원생만" for a space open to graduate students only', async () => {
    const lounge = building('인문대 신양학술정보관');
    const graduateOnly: StudyBuilding = {
      ...lounge,
      usable: false,
      spaces: lounge.spaces.map((space) => Object.assign({}, space, { usable: false, restrictedTo: '대학원' })),
    };
    answerStudy([graduateOnly]);
    const { user, card } = await openCard('공부공간 · 인문대 신양학술정보관 · 사용할 수 없어요');

    await user.press(card.getByRole('button', { name: /대학원생만 사용할 수 있어요$/u }));

    expect(within(screen.getByTestId('toast-layer')).getByText('대학원생만 사용할 수 있어요')).toBeVisible();
  });
});

describe("관정관's card", () => {
  it('shows the free and the total seats of the sectors bookable now, read from the library, and none reaches the server', async () => {
    await markLibraryLoggedIn();
    const { card } = await openCard(KWANJEONG);
    await pass(500);

    // Of the seven sectors' recorded lists: STATUS 1 and USECNT 0 free, STATUS 9 not counted.
    expect(card.getByText('남은 좌석 1729 / 전체 1848')).toBeVisible();
    expect(
      library
        .requestsTo('getSeatBookingList')
        .map(({ body }) => body.sectorNo)
        .toSorted(),
    ).toEqual(KWANJEONG_SECTORS.map(({ sectorNo }) => String(sectorNo)).toSorted());
    expect(JSON.stringify(server.received().map(({ body, query }) => ({ body, query })))).not.toMatch(/1729|1848/u);
    expect(card.getByRole('button', { name: '좌석 현황' })).toBeVisible();
  });

  it('counts the 대학원 열람실 when the server lists it, for a 대학원생', async () => {
    answerStudy(
      STUDY_BUILDINGS.map((one) =>
        one.liveSeats === null
          ? one
          : Object.assign({}, one, { liveSeats: { sectors: [...KWANJEONG_SECTORS, GRADUATE_SECTOR] } }),
      ),
    );
    await markLibraryLoggedIn();
    const { card } = await openCard(KWANJEONG);
    await pass(500);

    expect(card.getByText('남은 좌석 1920 / 전체 2042')).toBeVisible();
  });
});

describe("관정관's card without a Library Session, and after a failed read", () => {
  it('asks the user to log in without a Library Session, and asks nothing of the library', async () => {
    const { card } = await openCard(KWANJEONG);
    await pass(500);

    expect(card.getByText(LOG_IN)).toBeVisible();
    expect(library.requests).toEqual([]);
    expect(screen.queryByText(/남은 좌석/u)).toBeNull();
  });

  it('shows the hours alone when the library cannot be read', async () => {
    await markLibraryLoggedIn();
    library.answerNext('network');
    const { card } = await openCard(KWANJEONG);
    await pass(500);

    expect(card.queryByText(/남은 좌석/u)).toBeNull();
    expect(card.queryByText(LOG_IN)).toBeNull();
    expect(card.getByText(/^7A·7B·8A열람실 07:00–23:00/u)).toBeVisible();
  });

  it('opens the chat on 좌석 현황 and asks the Assistant for the seats', async () => {
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '좌석 현황이에요.', mapButtons: [], cards: [], proposal: null },
    });
    const { user, card } = await openCard(KWANJEONG);

    await user.press(card.getByRole('button', { name: '좌석 현황' }));
    await pass(500);

    expect(JSON.stringify(server.received('POST /assistant/messages')[0]?.body)).toContain(
      '관정도서관 좌석 현황 보여줘',
    );
    expect(screen.getByText('좌석 현황이에요.')).toBeVisible();
    expect(findButton(LAYERS)).toBeNull();
  });
});
