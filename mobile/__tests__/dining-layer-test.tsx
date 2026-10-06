import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerDining, ENGINEERING, JAHAYEON, STUDENT_CENTRE } from './support/dining';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { button, findButton, FRIEND_PILL, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press, wordsUnder } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The 식당 layer of the `MapDining` frame and its card, against the fake main server, on 6 October 2026 at 13:00.

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

const FAILED = '식당 정보를 불러오지 못했어요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function toggleDining(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^식당/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

function pin(name: string): ReturnType<typeof screen.queryByRole> {
  return screen.queryByRole('button', { name });
}

describe('the 식당 layer', () => {
  it("asks for today's menus and the Places when it is turned on, and again when it is turned on again", async () => {
    const user = await openMain();
    expect(server.received('GET /menus')).toHaveLength(0);

    await toggleDining(user);
    expect(server.received('GET /menus').map(({ query }) => query.date)).toEqual(['2026-10-06']);
    expect(server.received('GET /places')).toHaveLength(1);

    await toggleDining(user);
    await toggleDining(user);
    expect(server.received('GET /menus')).toHaveLength(2);
    expect(server.received('GET /places')).toHaveLength(2);
  });

  it('puts a pin on the Place of each restaurant with menus today, one for two restaurants that share it', async () => {
    const user = await openMain();

    await toggleDining(user);

    expect(screen.getAllByTestId('restaurant')).toHaveLength(3);
    expect(pin(STUDENT_CENTRE)).toBeVisible();
    expect(pin(JAHAYEON)).toBeVisible();
    expect(pin(ENGINEERING)).toBeVisible();
    // Listed without meals, outside the table, and without a Place.
    expect(pin('식당 · 예술계식당')).toBeNull();
    expect(pin('식당 · 교수회관식당')).toBeNull();
    expect(pin('식당 · 수의대식당')).toBeNull();
  });

  it('writes the restaurant under its pin from the "names" level', async () => {
    const user = await openMain();
    await toggleDining(user);
    expect(wordsUnder(STUDENT_CENTRE, '학생회관식당')).toBeNull();

    // A Friend's row brings the map to the "close" level, by the library.
    await press(user, '김민준 지도에서 보기');

    expect(wordsUnder(STUDENT_CENTRE, '학생회관식당')).toBeVisible();
    expect(wordsUnder(JAHAYEON, '자하연식당 2층 외 1곳')).toBeVisible();
  });
});

describe('the 식당 layer without an answer, and turned off', () => {
  it('shows no pins and says so when the menus cannot be fetched', async () => {
    server.on('GET /menus', refusal(500));
    const user = await openMain();

    await toggleDining(user);
    await pass(1500);

    expect(screen.getByText(FAILED)).toBeVisible();
    expect(screen.queryAllByTestId('restaurant')).toHaveLength(0);
  });

  it('shows no pins and says so when the Places cannot be fetched', async () => {
    server.on('GET /places', 'no-answer');
    const user = await openMain();

    await toggleDining(user);
    await pass(1500);

    expect(screen.getByText(FAILED)).toBeVisible();
    expect(screen.queryAllByTestId('restaurant')).toHaveLength(0);
  });

  it('takes the pins away and closes a 식당 card when it is turned off', async () => {
    const user = await openMain();
    await toggleDining(user);
    await press(user, STUDENT_CENTRE);
    expect(screen.getByTestId('map-card')).toBeVisible();

    await toggleDining(user);

    expect(pin(STUDENT_CENTRE)).toBeNull();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe("a 식당's card", () => {
  it('names one restaurant, its Place and the meals it serves today, at the top of the map', async () => {
    const user = await openMain();
    await toggleDining(user);

    await press(user, STUDENT_CENTRE);

    const card = screen.getByTestId('map-card');
    expect(card).toHaveTextContent('식당 · 학식 · 63동학생회관식당63동오늘 점심 · 저녁메뉴 보기');
    expect(card).toHaveStyle({ top: 52 });
    expect(screen.getByText('식당 · 학식 · 63동')).toHaveStyle({ color: '#B8336A' });
    expect(findButton('가까이 보기')).toBeNull();
  });

  it('names the Place and each restaurant when two share it', async () => {
    const user = await openMain();
    await toggleDining(user);

    await press(user, JAHAYEON);

    expect(screen.getByTestId('map-card')).toHaveTextContent(
      '식당 · 학식 · 109동자하연식당109동자하연식당 2층 · 오늘 점심자하연식당 3층 · 오늘 저녁메뉴 보기',
    );
  });

  it('hides the two lists and keeps the zoom control and the 편의기능 button', async () => {
    const user = await openMain();
    await toggleDining(user);

    await press(user, STUDENT_CENTRE);

    expect(findButton(FRIEND_PILL)).toBeNull();
    expect(button('확대')).toBeVisible();
    expect(button(LAYERS)).toBeVisible();
  });

  it("opens the menu panel at today's next meal, at the first restaurant of its Place", async () => {
    const user = await openMain();
    await toggleDining(user);
    await press(user, JAHAYEON);

    await press(user, '메뉴 보기');
    await pass(500);

    expect(shownAddress()).toBe(
      '/menus?date=2026-10-06&meal=lunch&restaurant=%EC%9E%90%ED%95%98%EC%97%B0%EC%8B%9D%EB%8B%B9+2%EC%B8%B5',
    );
    expect(screen.getByRole('header', { name: '자하연식당 2층  109동' })).toBeVisible();
  });
});
