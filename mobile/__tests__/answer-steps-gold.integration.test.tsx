/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { color } from '@/design-system';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sendFromBar, startLibraryChat } from './support/library-chat';
import { hideKeyboard } from './support/keyboard';
import { layStage } from './support/lists';
import { openMain } from './support/main';
import { pressMarker } from './support/made-quest';

// The chosen step on the bar of several requests is drawn in the time card's gold, and the time card carries a caret
// on its top edge under that step's span (P01 ticket 23, choice 다-1 of the approved page). The fault it removes: the
// chosen span in blue over a gold band, nothing saying the time card is that span made large. The reply is "17시 반에
// 관정 갔다가 19시쯤 저녁 먹을래": ① a seat 17:30–19:00, ② dinner 19:04–19:30, on a bar from 17:00 to 20:00.

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

// ②'s middle, 19:17, is 137 of the bar's 180 minutes in.
const DINNER_MIDDLE = (137 / 180) * 100;

const GOLD = { borderColor: color.quest, backgroundColor: color.questSoft };

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The reply to several requests on screen, the seat (①) shown first as the step due first.
async function ask(): Promise<User> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: stepsReplyOn('2026-11-02') });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await pass(50);
  return user;
}

async function pressFlag(user: User, number: number): Promise<void> {
  const flag = mapThings().find((thing) => thing.startsWith(`${String(number)} `));
  await pressMarker(user, flag ?? '');
  await pass(100);
}

function wordsOf(number: number): ReturnType<typeof screen.getByText> {
  return within(screen.getByRole('button', { name: new RegExp(`^${String(number)}번`, 'u') })).getByText(/./u);
}

// The caret's place across the track, in percent.
function caretAt(): number {
  const style: unknown = screen.getByTestId('time-card-caret').props.style;
  const { left } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  return typeof left === 'string' ? Number(left.replace('%', '')) : Number.NaN;
}

// Partitions: the step chosen by its words, by its flag; a step with a time card (②), one without (①, the seat).
describe('the chosen step on the bar of several requests', () => {
  it('stands in gold, its words and its span, and the other step not', async () => {
    const user = await ask();
    await user.press(screen.getByRole('button', { name: /^2번/u }));
    await pass(50);

    expect(screen.getByTestId('step-span-2')).toHaveStyle(GOLD);
    expect(screen.getByTestId('step-span-1')).not.toHaveStyle({ borderColor: color.quest });
    expect(wordsOf(2)).toHaveStyle({ color: color.quest });
    expect(wordsOf(1)).not.toHaveStyle({ color: color.quest });
  });

  it('is pointed at by a caret on the time card, under the middle of its span', async () => {
    const user = await ask();
    await user.press(screen.getByRole('button', { name: /^2번/u }));
    await pass(50);

    expect(screen.getAllByTestId('time-card-caret')).toHaveLength(1);
    expect(caretAt()).toBeCloseTo(DINNER_MIDDLE, 6);
  });

  it('moves with a press on a flag: the seat in gold with no caret, as it has no time card, and back', async () => {
    const user = await ask();
    await pressFlag(user, 2);
    expect(caretAt()).toBeCloseTo(DINNER_MIDDLE, 6);

    await pressFlag(user, 1);

    expect(screen.getByTestId('step-span-1')).toHaveStyle(GOLD);
    expect(screen.getByTestId('step-span-2')).not.toHaveStyle({ borderColor: color.quest });
    expect(screen.queryByTestId('time-card-caret')).toBeNull();

    await pressFlag(user, 2);

    expect(screen.getByTestId('step-span-2')).toHaveStyle(GOLD);
    expect(caretAt()).toBeCloseTo(DINNER_MIDDLE, 6);
  });
});
