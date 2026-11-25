/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { color, radius, space } from '@/design-system';
import { CHIP_HEIGHT } from '@/screens/main/answer/card-header';
import { BAR_ADD_HEIGHT } from '@/screens/main/answer/condition-chips';
import { AI_FIELD } from '@/screens/main/ai-input';
import { AI_INPUT } from '@/screens/main/layout';
import { raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// The footer and the bar's head from the user's phone (P04 tickets 45, 50, and 61): the main button is the input's
// height, on its own full-width row above the input, whose placeholder stays on one line; a long sentence stands whole
// in the sheet; "＋ 같이" is a chip of the header chips' look and of the head row's height, clear of the track.

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

// Three sentences, longer than the low sheet's two lines.
const LONG =
  '12:15에 302동식당에서 민수와 만나 먹어요. 301동식당은 뚝배기불고기가 5,000원이고 걸음 15분이에요. 학생회관식당은 떡볶이가 있어요.';

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

// Partitions: the meal answer's main button beside the input.
describe('the main button above the input', () => {
  it('is the input’s height, fully rounded, on its own full-width row above the input', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    const button = within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      height: AI_INPUT.height,
      borderRadius: radius.full,
    });
    // Its own full-width row above the input (P04 ticket 50), which keeps the whole width.
    expect(screen.getByTestId('ai-input-beside')).toHaveStyle({
      bottom: AI_INPUT.bottom + AI_INPUT.height + space[2],
      left: AI_INPUT.side,
      right: AI_INPUT.side,
    });
    expect(screen.getByTestId('ai-input')).toHaveStyle({ right: AI_INPUT.side, left: AI_INPUT.side });
  });

  it('holds the empty input one line high with its own placeholder, and never limits its lines', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    const field = screen.getByLabelText('AI에게 메시지');
    expect(field).toHaveProp('placeholder', '이어서 말하기');
    expect(field).toHaveStyle({ maxHeight: AI_FIELD });
    expect(screen.queryByTestId('ai-input-placeholder', { includeHiddenElements: true })).toBeNull();
    // An unset `numberOfLines` is `setLines(1)` on Android: the field never passes one, empty or not (PR 514's review).
    expect(field.props.numberOfLines).toBeUndefined();

    await user.type(field, '더 싼 데');
    const typed = screen.getByLabelText('AI에게 메시지');
    expect(typed.props.numberOfLines).toBeUndefined();
    expect(typed).not.toHaveStyle({ maxHeight: AI_FIELD });
  });
});

// Partitions: a long sentence (P04 ticket 61: no "더 보기"; the sheet holds the whole words, which a drag brings up).
describe('a long sentence', () => {
  it('stands whole over the list, with no "더 보기"', async () => {
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, text: LONG });

    expect(screen.getByTestId('meal-words')).toHaveTextContent(LONG);
    expect(screen.queryByText('더 보기')).toBeNull();
    expect(screen.getByTestId('meal-list')).toBeOnTheScreen();
  });
});

// Partitions: a meal answer whose Plan can take a Friend: "＋ 같이" in the bar's head.
describe('"＋ 같이" in the bar’s head', () => {
  it('is the header chips’ filled chip of the head row’s height, its top at the row’s, so the track starts below it', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    const chip = within(screen.getByTestId('time-bar-add')).getByRole('button');
    expect(StyleSheet.flatten(chip.props.style)).toMatchObject({
      height: BAR_ADD_HEIGHT,
      backgroundColor: color.surfaceSunken,
    });
    expect(StyleSheet.flatten(chip.props.style)).not.toHaveProperty('borderWidth');
    expect(BAR_ADD_HEIGHT).toBe(CHIP_HEIGHT);
    expect(chip).toHaveTextContent(/^같이( \d ›)?$/u);
    expect(screen.getByTestId('time-bar')).toHaveStyle({ paddingTop: space[3] });
    expect(screen.getByTestId('time-bar-add')).toHaveStyle({ top: space[3] });
    expect(screen.getByTestId('time-band-head')).toHaveStyle({ minHeight: BAR_ADD_HEIGHT });
  });
});

// Partitions: the list raised with every kind; one kind chosen (P04 ticket 50, the user's phone).
describe('the raised list’s first line', () => {
  it('says how many places it shows and how they are ordered, the kind on screen’s count once one is chosen', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raiseCard();

    const total = MEAL_ANSWER_MENUS_REPLY.answer.plans.length;
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent(`${String(total)}곳 · 걸음이 적은 순`);
    expect(screen.getByTestId('meal-list-order').props.numberOfLines).toBe(1);

    await user.press(screen.getByRole('button', { name: '한식 4곳' }));
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent('4곳 · 걸음이 적은 순');
  });
});
