import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { pass, screen } from './support/app';
import { answerDining, BUFFET, HOURS, NO_PRICE, STEW } from './support/dining';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The menu panel, against the fake main server. Its days are 6 October 2026, a Tuesday, and the six after.

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

const TUESDAY = '10월 6일 화요일';
const WEDNESDAY = '10월 7일 수요일';
const THURSDAY = '10월 8일 목요일';

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

// From the 메뉴 tile of the 편의기능 stack.
async function openFromStack(): Promise<User> {
  const user = await openMain();
  await press(user, LAYERS);
  await press(user, '메뉴 보기');
  await pass(500);
  return user;
}

async function openAt(address: string): Promise<User> {
  const user = await openMain();
  await act(() => {
    router.push(address);
  });
  await pass(500);
  return user;
}

describe('the meal the panel opens on', () => {
  it.each([
    ['09:59', TUESDAY, '아침'],
    ['10:00', TUESDAY, '점심'],
    ['14:59', TUESDAY, '점심'],
    ['15:00', TUESDAY, '저녁'],
    ['19:59', TUESDAY, '저녁'],
    ['20:00', WEDNESDAY, '아침'],
  ] as const)('is chosen by the time of day: at %s, %s and %s', async (clock, day, meal) => {
    jest.setSystemTime(new Date(`2026-10-06T${clock}:00+09:00`));

    await openFromStack();

    expect(screen.getByRole('button', { name: day })).toBeSelected();
    expect(screen.getByRole('tab', { name: meal })).toBeSelected();
  });
});

describe('the days and the meals of the panel', () => {
  it('offers 7 days from today, 오늘 and 내일 first', async () => {
    await openFromStack();

    expect(screen.getByRole('button', { name: TUESDAY })).toHaveTextContent('오늘6');
    expect(screen.getByRole('button', { name: WEDNESDAY })).toHaveTextContent('내일7');
    expect(screen.getByRole('button', { name: THURSDAY })).toHaveTextContent('목8');
    expect(screen.getByRole('button', { name: '10월 11일 일요일' })).toHaveTextContent('일11');
    expect(screen.queryByRole('button', { name: '10월 13일 화요일' })).toBeNull();
  });

  it('asks for a day once when it is chosen, and for nothing when a meal is', async () => {
    const user = await openFromStack();
    expect(server.received('GET /menus').map(({ query }) => query.date)).toEqual(['2026-10-06']);

    await user.press(screen.getByRole('button', { name: WEDNESDAY }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: TUESDAY }));
    await user.press(screen.getByRole('button', { name: WEDNESDAY }));
    await user.press(screen.getByRole('tab', { name: '저녁' }));
    await pass(500);

    expect(server.received('GET /menus').map(({ query }) => query.date)).toEqual(['2026-10-06', '2026-10-07']);
  });
});

describe('the restaurants of a day', () => {
  it('shows a dish with its price, a heading with its set price, a note and a line without a kind', async () => {
    await openFromStack();

    expect(screen.getByText('눈꽃치즈닭갈비')).toBeVisible();
    expect(screen.getAllByText('6,000원')[0]).toHaveStyle({ fontSize: 15, fontFamily: 'Pretendard-SemiBold' });
    expect(screen.getByText(BUFFET.text)).toHaveStyle({ fontSize: 14, fontFamily: 'Pretendard-Bold' });
    expect(screen.getByText(HOURS.text)).toHaveStyle({ fontSize: 13, color: '#555C74' });
    expect(screen.getByText(STEW.text)).toHaveStyle({ fontSize: 15 });
  });

  it('shows a dish without a price as it was written, with no price of its own', async () => {
    await openFromStack();

    expect(screen.getByText(NO_PRICE.text)).toBeVisible();
    expect(screen.queryByText('9,900원')).toBeNull();
  });

  it('lists the restaurants in the order of the server, with their Place where the table has one', async () => {
    await openFromStack();

    const order = [
      '302동식당',
      '교수회관식당',
      '수의대식당',
      '예술계식당',
      '자하연식당 2층',
      '자하연식당 3층',
      '학생회관식당',
    ];
    const cards = screen.getAllByTestId('menu-restaurant');
    expect(cards).toHaveLength(order.length);
    for (const [index, name] of order.entries()) {
      expect(cards[index]).toHaveTextContent(new RegExp(`^${name}`, 'u'));
    }
    expect(screen.getByRole('header', { name: '302동식당  302동' })).toBeVisible();
    expect(screen.getByRole('header', { name: '교수회관식당' })).toBeVisible();
  });
});

describe('the restaurants of a day, as the server lists them', () => {
  it('says that a restaurant does not serve the chosen meal', async () => {
    await openFromStack();

    // 예술계식당 has no meal today, and 자하연식당 3층 only a dinner.
    expect(screen.getAllByText('운영하지 않아요')).toHaveLength(2);
  });

  it('says when the oldest of the day was collected', async () => {
    await openFromStack();

    expect(screen.getByText('10월 5일 20:00에 가져온 메뉴예요')).toHaveStyle({ fontSize: 12, color: '#555C74' });
  });

  it('says that a day has no menu', async () => {
    const user = await openFromStack();

    await user.press(screen.getByRole('button', { name: THURSDAY }));
    await pass(500);

    expect(screen.getByText('이날 올라온 메뉴가 없어요')).toBeVisible();
  });

  it('says that the menus could not be fetched, and asks again on 다시 시도', async () => {
    server.on('GET /menus', refusal(500));
    const user = await openFromStack();
    await pass(1500);
    expect(screen.getByText('불러오지 못했어요')).toBeVisible();

    answerDining(server);
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    await pass(500);

    expect(screen.getByText('눈꽃치즈닭갈비')).toBeVisible();
  });
});

describe('the panel at a restaurant', () => {
  it('opens at the day and the meal of its address, with the restaurant at the top', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await openAt('/menus?date=2026-10-06&meal=dinner&restaurant=학생회관식당');

    expect(screen.getByRole('tab', { name: '저녁' })).toBeSelected();
    const section = screen.getAllByTestId('menu-restaurant').at(-1);
    if (section === undefined) {
      throw new Error('No restaurant');
    }
    await fireEvent(section, 'layout', { nativeEvent: { layout: { x: 16, y: 916, width: 358, height: 120 } } });

    expect(scrollTo).toHaveBeenCalledWith({ y: 900, animated: false });
  });
});
