/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type { MapProps } from '@/map';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import { answerDining } from './support/dining';
import { answerEvents } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// How far out a native map may go while a Plan is drawn (P02 ticket 02, "The camera"), read off a native map that
// records what the main screen hands it. What Kakao's SDK does with the level is checked on a phone.

let mockShown: MapProps[] = [];

function MockNativeMap(props: MapProps): ReactElement {
  mockShown.push(props);
  return <Text>네이티브 지도</Text>;
}

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => true,
}));
jest.mock('@/map/native-map', (): { __esModule: true; default: (props: MapProps) => ReactElement } => ({
  __esModule: true,
  default: MockNativeMap,
}));
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

beforeEach(async () => {
  mockShown = [];
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerEvents(server);
  answerDining(server);
  answerShuttle(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
});

function level(): number | undefined {
  return mockShown.at(-1)?.nativeMinLevel;
}

// Partitions: the everyday map before the answer, a Plan drawn, the everyday map after ✕, and an answer without a
// Plan. Expected values: Kakao's level 15 of every campus map, and one level further out for a Plan.
describe("the lowest level of Kakao's map", () => {
  it('is 15 on the everyday map, 14 while a Plan is drawn, and 15 again after ✕', async () => {
    const before: (number | undefined)[] = [];
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, () => {
      before.push(level());
      return Promise.resolve();
    });

    expect(before).toEqual([15]);
    expect(level()).toBe(14);

    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    expect(level()).toBe(15);
  });

  it('stays 15 for an answer without a Plan', async () => {
    // The stored answer with this one field changed: no Plan, and the lines of a day without a menu.
    const answer = {
      ...MEAL_ANSWER_REPLY.answer,
      plans: [],
      noPlan: { reason: 'no-menu', lines: [[{ text: '오늘은 여는 식당이 없어요', strong: false }]] },
    };

    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer });

    expect(level()).toBe(15);
  });
});
