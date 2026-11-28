/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { AssistantReply } from '@/api/assistant-types';
import type { Place } from '@/api/types';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { space } from '@/design-system';
import { markLibraryLoggedIn } from '@/library/flag';
import { pass, screen } from './app';
import { PLACES } from './dining';
import type { FakeServer } from './fake-server';
import { hideKeyboard } from './keyboard';
import { sendFromBar } from './library-chat';
import { layStage } from './lists';
import { openMain } from './main';
import { layFolded } from './time-card';

// Reading the top of an answer as it folds in stops (P01 ticket 22): where its views rest, and the sheet's high.

export type Found = ReturnType<typeof screen.getByTestId>;

export function styleOf(element: Found): ViewStyle {
  const style: unknown = element.props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// Where a view rests, as React holds it: its translation.
export function shiftOf(element: Found | undefined): number {
  if (element === undefined) {
    return Number.NaN;
  }
  const shift: unknown = styleOf(element).transform?.[0];
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
}

// A slow drag by `dy` on the gesture named `drag`, let go with no speed.
export async function pull(drag: string, dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(drag), [
      { translationY: 0, velocityY: 0 },
      { translationY: dy / 2, velocityY: 0 },
      { translationY: dy, velocityY: 0 },
    ]);
  });
  await pass(50);
}

// High's height: the sheet's scrolling part is laid out at it.
export function highHeight(): number {
  return Number(styleOf(screen.getByTestId('answer-card-content')).height);
}

// The top of "17시 반에 관정 갔다가 19시쯤 저녁 먹을래" (① a seat, ② a dinner Plan) as laid out: the steps card 120 high,
// the time card 100 folded, its strip 20; so behind the steps card the time card goes up the gap and 100 − 20.
export const STEPS = 120;
export const FOLDED = 100;
export const STRIP = 20;
export const BEHIND = space[2] + FOLDED - STRIP;

export async function layStepsCard(): Promise<void> {
  await fireEvent(stepsCard(), 'layout', { nativeEvent: { layout: { x: 16, y: 8, width: 358, height: STEPS } } });
  await pass(50);
}

// The cards at the top, both named `time-bar`: the steps card first, the time card after it.
export function stepsCard(): Found {
  const [steps] = screen.getAllByTestId('time-bar');
  if (steps === undefined) {
    throw new Error('no steps card');
  }
  return steps;
}

export function timeCard(): Found | undefined {
  return screen.queryAllByTestId('time-bar')[1];
}

export const frame = (): Found => screen.getByTestId('time-card-frame');

// The steps card's bottom edge from the stage's top, where stop 0 takes it up to.
export const stepsBottom = (): number => Number(styleOf(stepsCard()).top) + STEPS;

export async function pressGrip(testID = 'time-card-grip'): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
  await pass(50);
}

type User = Awaited<ReturnType<typeof openMain>>;

// The reply to several requests on screen, its step `number` shown and its cards laid out: the time card when the step
// has one.
export async function atStep(
  server: FakeServer,
  number: number,
  reply: AssistantReply = stepsReplyOn('2026-11-02'),
): Promise<User> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: reply });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await user.press(screen.getByRole('button', { name: new RegExp(`^${String(number)}번`, 'u') }));
  await pass(50);
  await layStepsCard();
  if (screen.queryByTestId('time-card-head') !== null) {
    await layFolded(FOLDED);
    await pass(50);
  }
  return user;
}

// 관정관 among the Places, so that a seat card's booking is drawn on the map and its time card stands at the top.
const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};

export function serveKwanjeong(server: FakeServer): void {
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
}
