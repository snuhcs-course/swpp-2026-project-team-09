/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type ViewStyle } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { color } from '@/design-system';
import * as answerCamera from '@/features/assistant/answer-camera';
import * as projection from '@/map/projection';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, distinct, FIRST_PLAN_MARKS, layAnswerCard, mapLines, mapThings } from './support/answer-map';
import { answerDining, ENGINEERING } from './support/dining';
import { answerEvents } from './support/events';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, LAYERS, layStage } from './support/lists';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { askMainServer, MIN_JUN, PHONE_NOW } from './support/server';
import { answerShuttle, GATE, stopMarker, vehicleMarker } from './support/shuttle';

// The answer drawn on the map (P02 ticket 02, "The answer on the map"): the marks and the lines of the Plan on screen,
// what gives way to them, and the camera, over the stored answer to "배고파, 민수랑 같이".

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

const CLOSE = '답 닫기';
// 김민준's Avatar, as the fake server's Friend without a status.
const FRIEND = '김민준';
const EVENT = '공식 행사 · AI 커리어 설명회';
// The dinner Quest and 학생회관식당 at one Place.
const QUEST_AND_RESTAURANT = '파티 1개 · 식당 1개 · 63동';

let server: FakeServer;

beforeEach(async () => {
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
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Turns the 식당 and 셔틀버스 layers on, so that their markers are on the map before the User asks.
async function turnLayersOn(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^식당/u }));
  await user.press(screen.getByRole('togglebutton', { name: /^셔틀버스/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

// The style of each stroke of a line on the plain ground.
function strokesOf(id: string): ViewStyle[] {
  return within(screen.getByTestId(`line:${id}`))
    .getAllByTestId('route-stroke')
    .map((stroke) => {
      const style: unknown = stroke.props.style;
      return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
    });
}

// Partitions: the first Plan's marks, which take a press or not; its lines.
describe('the Plan on screen', () => {
  it('draws the marks of the first Plan, by the names a screen reader says', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    for (const name of FIRST_PLAN_MARKS) {
      expect(screen.getByLabelText(name)).toBeOnTheScreen();
    }
  });

  it('lets the candidates take a press, and not the people, the pick, or the next Class', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(screen.getByRole('button', { name: '후보 3 · 학생회관식당' })).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: '302동식당 · 12:15 점심' })).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: '나 · 3분' })).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: '13:00 수업 · 24동' })).toBeOnTheScreen();
  });

  it("draws one solid line for each route: the User's navy, 5 wide, and the way to the next Class fainter", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
    expect(strokesOf('answer:route:0')).toEqual([
      expect.objectContaining({ height: 5, backgroundColor: color.snuBlue }),
    ]);
    expect(strokesOf('answer:route:1')).toEqual([
      expect.objectContaining({ height: 3, backgroundColor: color.borderStrong }),
    ]);
  });
});

// Partitions: before the answer, while the Plan is drawn, and after ✕; a Friend not in the Plan and one in it.
describe('what gives way to the Plan', () => {
  it("leaves only the Plan's marks and the Friend who is not in it, and no line of the shuttle", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY, turnLayersOn);

    expect(mapThings()).toEqual([...FIRST_PLAN_MARKS, FRIEND].toSorted());
    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
  });

  it('brings back the events, the Quests, the Restaurants, the shuttle, and the User after ✕', async () => {
    const before: string[] = [];
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, async (opened) => {
      await turnLayersOn(opened);
      before.push(...mapThings());
    });
    expect(before).toEqual(
      expect.arrayContaining([EVENT, QUEST_AND_RESTAURANT, ENGINEERING, stopMarker(GATE), vehicleMarker(GATE), ME]),
    );

    await user.press(screen.getByRole('button', { name: CLOSE }));

    expect(mapThings()).toEqual(before);
    expect(mapLines()).toContain('shuttle');
  });

  it("hides the Avatar of a Friend whom the Plan draws, by the Friend's user id", async () => {
    // The stored answer with one field changed: its Friend's user id is 김민준's, a Friend of the fake server.
    const [first, ...rest] = MEAL_ANSWER_REPLY.answer.plans;
    if (first === undefined) {
      throw new Error('The stored answer has no Plan');
    }
    const [me, minsu] = first.scene.people;
    if (me === undefined || minsu === undefined) {
      throw new Error('The stored Plan has no two people');
    }
    const people = [me, { ...minsu, userId: MIN_JUN.id }];
    const plans = [{ ...first, scene: { ...first.scene, people } }, ...rest];

    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER_REPLY.answer, plans } });

    expect(mapThings()).not.toContain(FRIEND);
    expect(screen.getByLabelText('민수')).toBeOnTheScreen();
  });
});

// Partitions: an answer without a Plan, and an answer with the switch off.
describe('an answer that draws nothing', () => {
  it('keeps the everyday map when the answer has no Plan', async () => {
    // The stored answer with this one field changed: no Plan, and the lines of a day without a menu.
    const answer = {
      ...MEAL_ANSWER_REPLY.answer,
      plans: [],
      noPlan: { reason: 'no-menu', lines: [[{ text: '오늘은 여는 식당이 없어요', strong: false }]] },
    };

    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer });

    expect(screen.queryByLabelText('나 · 3분')).toBeNull();
    expect(mapThings()).toContain(ME);
    expect(mapThings()).toContain(EVENT);
  });

  it("draws nothing with the switch off, and the chat is today's", async () => {
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });
    const user = await openMain();

    await user.press(screen.getByLabelText(AI_INPUT));
    await user.type(screen.getByLabelText(AI_INPUT), '배고파, 민수랑 같이');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(screen.queryByLabelText('나 · 3분')).toBeNull();
    expect(mapThings()).toContain(ME);
  });
});

// The points of the first Plan: its marks and the ends of its routes, from the stored answer.
const FIRST_PLAN_POINTS = distinct([
  { latitude: 37.45016, longitude: 126.95259 },
  { latitude: 37.44887, longitude: 126.95265 },
  { latitude: 37.45932, longitude: 126.95058 },
  { latitude: 37.45647, longitude: 126.94851 },
  { latitude: 37.46098, longitude: 126.95252 },
  { latitude: 37.45942, longitude: 126.94989 },
]);

// The test's phone has no status bar: the pill's 52 from the top and its 48, and room of 56 for a label above a point;
// below, the card and room of 56 for a label under a point; 64 at each side.
function padding(cardHeight: number): object {
  return { top: 52 + 48 + 56, right: 64, bottom: cardHeight + 56, left: 64 };
}

// Partitions: the answer comes before the card is laid out, and the card is laid out.
describe('the camera', () => {
  it("fits the first Plan's points into what the pill leaves, when the answer comes", async () => {
    const fit = jest.spyOn(projection, 'fit');

    await askOnMap(server, MEAL_ANSWER_REPLY);

    const [points, options] = fit.mock.lastCall ?? [];
    expect(distinct(points ?? [])).toEqual(FIRST_PLAN_POINTS);
    expect(options).toEqual(expect.objectContaining({ padding: padding(0) }));
  });

  it('fits again into what the card leaves once the card is laid out', async () => {
    const fit = jest.spyOn(projection, 'fit');
    await askOnMap(server, MEAL_ANSWER_REPLY);

    await layAnswerCard(240);

    expect(fit.mock.lastCall?.[1]).toEqual(expect.objectContaining({ padding: padding(240) }));
  });
});

// Partitions: the Plan on screen changes, the basis opens, and the camera rests on a map that shows every point.
describe('the camera after the answer came', () => {
  it('fits again after "다음 후보" into what the card then leaves, and moves nothing when the answer is closed', async () => {
    const fit = jest.spyOn(projection, 'fit');
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layAnswerCard(240);
    const before = fit.mock.calls.length;

    await user.press(screen.getByRole('button', { name: '다음 후보' }));
    // The Plans of the stored answer stand at the same points (their people at 301동 and 302동, and the same
    // Restaurants), so what can differ is that a fit is asked again, and with the card as it then is.
    expect(fit.mock.calls).toHaveLength(before + 1);
    expect(fit.mock.lastCall?.[1]).toEqual(expect.objectContaining({ padding: padding(240) }));

    await user.press(screen.getByRole('button', { name: CLOSE }));

    expect(fit.mock.calls).toHaveLength(before + 1);
  });

  it('fits again when the opened basis makes the card taller, by what the card grew', async () => {
    const fit = jest.spyOn(projection, 'fit');
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layAnswerCard(240);

    await user.press(screen.getByRole('button', { name: '근거' }));
    // The plain ground lays nothing out: the card is laid out 96 taller, as the phone lays it out with the basis.
    await layAnswerCard(336);

    expect(fit.mock.lastCall?.[1]).toEqual(expect.objectContaining({ padding: padding(336) }));
  });

  it('moves no further on the plain map, which has no floor that keeps a point out of view', async () => {
    const fit = jest.spyOn(projection, 'fit');
    const corrected = jest.spyOn(answerCamera, 'correctedCentre');
    const { width, height } = Dimensions.get('window');

    await askOnMap(server, MEAL_ANSWER_REPLY, async () => {
      await layStage(width, height);
    });

    expect(fit).toHaveBeenCalledTimes(1);
    expect(corrected).toHaveBeenCalledTimes(1);
    expect(corrected).toHaveLastReturnedWith(null);
  });
});
