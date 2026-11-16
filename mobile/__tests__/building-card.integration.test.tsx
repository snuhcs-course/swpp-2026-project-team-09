/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { type StyleProp, StyleSheet, type TextStyle } from 'react-native';
import { TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import type { Friend } from '@/api/types';
import { color, font } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import {
  answerBuilding,
  buildingCard,
  CULTURE_HALL,
  ENGINEERING_2,
  factLines,
  GRADUATE_HALL,
  pressBuilding,
  STUDENT_HALL,
  tapGround,
} from './support/building';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, LIBRARY_POSITION, MIN_JUN, PHONE_NOW } from './support/server';

// The card of a pressed building (P02 ticket 22, boards a1, a3, a14, and a2), over the fake main server: the main
// server's card of the Place, read while it is asked, after a failure, and once it came.

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

// a14's Friend in 302동, by the id of the stored card's line: the fake main server's 김민준 renamed.
const MIN_SU: Friend = { ...MIN_JUN, id: '35976b5c-4daf-454f-b10e-c8b09a33ca37', name: '김민수' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function isStyle(style: unknown): style is StyleProp<TextStyle> {
  return typeof style === 'object' && style !== null;
}

function styleOf(words: string): TextStyle {
  const style: unknown = buildingCard().getByText(words).props.style;
  return StyleSheet.flatten<TextStyle>(isStyle(style) ? style : {});
}

// The card's buttons in order, by the name a screen reader says: their label, or their words.
function buttonNames(): unknown[] {
  return buildingCard()
    .getAllByRole('button')
    .map(
      (button): unknown =>
        button.props.accessibilityLabel ??
        within(button)
          .queryAllByText(/./u)
          .map(({ props }): unknown => props.children)
          .join(''),
    );
}

// Partitions: a card with a meal and the note (a1); the basis closed and opened.
describe("the card of a pressed building, as the main server's card reads", () => {
  it('reads a1: the walk in bold, the stay, the meal, the note, the chips, the basis, and two buttons', async () => {
    const user = await openMain();

    await pressBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);

    expect(server.received('POST /assistant/taps')[0]?.body).toEqual({
      tapped: { kind: 'place', placeId: STUDENT_HALL.id },
      location: ON_CAMPUS,
    });
    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
    expect(buildingCard().getByText('학생회관')).toBeVisible();
    expect(factLines()).toEqual([
      '걸어서 15분 · 12:25 도착',
      '13:00 수업 전까지 34분 머물 수 있어요',
      '학생회관식당 · 오늘 순두부찌개',
    ]);
    expect(styleOf('걸어서 15분 · 12:25 도착').fontFamily).toBe(font.bold);
    expect(styleOf('13:00 수업 전까지 34분 머물 수 있어요').fontFamily).not.toBe(font.bold);
    expect(styleOf('점심시간이에요. 여기서 드실래요?').color).toBe(color.quest);
    expect(buildingCard().getByText('301동에서')).toBeVisible();
    expect(buildingCard().getByText('13:00 수업까지')).toBeVisible();
    expect(buildingCard().queryByText('301동에서 63동까지 걸어서 15분')).toBeNull();
    await user.press(buildingCard().getByRole('button', { name: '근거' }));
    expect(buildingCard().getByText('301동에서 63동까지 걸어서 15분')).toBeVisible();
    expect(
      buildingCard().getByText('셔틀은 기다림 없이도 15분(정류장 2 · 타기 4 · 내려서 9)이라 걸어요'),
    ).toBeVisible();
    expect(buttonNames()).toEqual(['닫기', '근거 접기', '여기서 먹기', '가는 길']);
  });
});

// Partitions: a card with the walk and the stay alone (a3), and one with events whose buttons have no screen yet (a2).
describe("the card of a pressed building with fewer lines, as the main server's card reads", () => {
  it('reads a3: the walk and the stay, and "가는 길" alone', async () => {
    await openMain();

    await pressBuilding(server, GRADUATE_HALL, TAP_LOOKUPS.a3);

    expect(buildingCard().getByRole('header', { name: '39동' })).toBeVisible();
    expect(buildingCard().getByText('대학원연구동(1단계)')).toBeVisible();
    expect(factLines()).toEqual(['걸어서 8분 · 12:18 도착', '13:00 수업 전까지 33분 머물 수 있어요']);
    expect(buildingCard().queryByText(/드실래요/u)).toBeNull();
    expect(buildingCard().queryByRole('button', { name: '여기서 먹기' })).toBeNull();
    expect(buildingCard().getByRole('button', { name: '가는 길' })).toBeVisible();
  });

  it('reads a2: the events, with "가는 길" alone while row 4\'s answers have no screen', async () => {
    await openMain();

    await pressBuilding(server, CULTURE_HALL, TAP_LOOKUPS.a2);

    expect(factLines()).toEqual([
      '걸어서 4분 · 13:54 도착',
      '15:30 수업 전까지 78분 머물 수 있어요',
      '채용박람회 · 17:00까지 열려요',
      '기업 설명회 · 16:00–17:00',
    ]);
    expect(buildingCard().queryByRole('button', { name: '행사 보기' })).toBeNull();
    expect(buildingCard().queryByRole('button', { name: '같이 갈 파티' })).toBeNull();
    expect(buildingCard().getByRole('button', { name: '가는 길' })).toBeVisible();
  });
});

// Partitions: a Friend's line, and its press with the Friend on the map.
describe("a14's Friend line", () => {
  beforeEach(() => {
    server.on('GET /friends', { status: 200, body: [MIN_SU, JI_WOO] });
    server.on('GET /positions', { status: 200, body: [{ ...LIBRARY_POSITION, userId: MIN_SU.id }] });
  });

  it('ends with "›" and opens the Friend\'s card', async () => {
    const user = await openMain();
    answerBuilding(server, ENGINEERING_2, TAP_LOOKUPS.a14);
    server.on('POST /assistant/taps', ({ body }) =>
      JSON.stringify(body).includes('"friend"') ? refusal(404) : { status: 200, body: TAP_LOOKUPS.a14 },
    );
    await tapGround();
    expect(factLines()).toEqual([
      '걸어서 3분 · 12:13 도착',
      '13:00 수업 전까지 30분 머물 수 있어요',
      '302동식당 · 오늘 돈까스',
      '김민수가 여기 있어요 · 수업 중 12:15까지',
    ]);
    const line = buildingCard().getByRole('button', { name: '김민수가 여기 있어요 · 수업 중 12:15까지' });
    expect(within(line).getByText('›')).toBeVisible();

    await user.press(line);

    expect(buildingCard().getByRole('header', { name: '김민수' })).toBeVisible();
  });
});

// Partitions: the card while it is asked, after a failure, and "다시 시도".
describe("a building's card before its answer", () => {
  it('says "보는 중이에요" under the Place\'s name while it is asked', async () => {
    answerBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
    server.on('POST /assistant/taps', { status: 200, body: TAP_LOOKUPS.a1, afterMs: 2000 });
    await openMain();

    await tapGround();

    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
    expect(buildingCard().getByText('보는 중이에요')).toBeVisible();
    await pass(2000);
    expect(buildingCard().queryByText('보는 중이에요')).toBeNull();
    expect(factLines()).toHaveLength(3);
  });

  it('says that it failed, and "다시 시도" asks again', async () => {
    answerBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
    server.on('POST /assistant/taps', 'no-answer');
    const user = await openMain();
    await tapGround();
    await pass(3000);

    expect(buildingCard().getByText('답을 가져오지 못했어요')).toBeVisible();
    server.on('POST /assistant/taps', { status: 200, body: TAP_LOOKUPS.a1 });
    await user.press(buildingCard().getByRole('button', { name: '다시 시도' }));
    await pass(500);

    expect(buildingCard().queryByText('답을 가져오지 못했어요')).toBeNull();
    expect(factLines()).toHaveLength(3);
  });
});
