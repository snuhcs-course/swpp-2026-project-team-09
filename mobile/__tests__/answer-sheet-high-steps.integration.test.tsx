/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { space } from '@/design-system';
import { markLibraryLoggedIn } from '@/library/flag';
import { foldedTimeCardOf } from '@/screens/main/answer/card-caps';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';
import { openMain } from './support/main';

// P04 ticket 63, PR 553's review: high's top edge is one line under the folded time card's place, but a reply to
// several requests draws its bar of steps at the top and, while the step shown is a Plan, that Plan's bar under it,
// lower than the folded time card alone. High stands under that bar where it reaches lower than the line. Its words
// wrap, so its height is measured. Expected values: the steps' bar laid out with its words on two lines, 120 high
// (padding 12, two lines of 20, gap 8, track 24, gap 8, the day 16, padding 12) and the Plan's bar under it 8 below,
// not laid out here: what the bar of steps tells is 128, and high stands that much under the lists' top, with its gap.

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

const STEPS_BAR = 120;

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// High's height: the sheet's scrolling part is laid out at it.
function highHeight(): number {
  const style: unknown = screen.getByTestId('answer-card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

// Partitions: the reply to several requests with its Plan's step shown, before and after its bar of steps is laid out.
describe('high under the bar of several requests', () => {
  it('stands under the bar of steps and the Plan’s bar where they reach lower than the folded time card', async () => {
    await markLibraryLoggedIn();
    server.on('POST /assistant/messages', { status: 200, body: stepsReplyOn('2026-11-02') });
    const user = await openMain();
    await layStage(390, 760);
    await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
    await user.press(screen.getByRole('button', { name: /^2번/u }));
    await pass(50);
    const underTheLine = highHeight();
    const [steps] = screen.getAllByTestId('time-bar');

    await fireEvent(steps, 'layout', { nativeEvent: { layout: { x: 16, y: 8, width: 358, height: STEPS_BAR } } });
    await pass(50);

    expect(highHeight()).toBe(underTheLine - (STEPS_BAR + space[2] - foldedTimeCardOf(1)));
  });
});
