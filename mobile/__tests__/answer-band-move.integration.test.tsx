/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { type DimensionValue, StyleSheet, type ViewStyle } from 'react-native';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import { card, mapThings, timeBar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { body, holdBody, holdLanes, layTrack } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The band of a meet dragged whole and held, the finger still down (P02 ticket 25, "While it moves"), over the fake
// main server, which answers the meet with 민수 with the stored real answer of board a5 (`meet-answer.json`): its first
// Plan runs from 12:15 to 12:43; 민수 is busy until 12:15 and 나 from 13:00 ("24동 수업"). The time card's track runs
// over the free time around the span, 12:00 to 13:15, open or not (P04 ticket 61), and is laid 300 wide, four points a
// minute, so that a drag of 120 is the band at 12:45, over 나's class. Expected values: the ticket and board a12's
// layout, on a stretch inside the track.

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

// Where a time lies on the track, as the share of its 75 minutes from 12:00.
const left = (minutes: number): DimensionValue => `${(minutes / 75) * 100}%`;
// 나's lane.
const ME_LANE = MEET_ANSWER.plans[0]?.band.lanes[0]?.userId;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Asks "만나고 싶다" from 민수's card and lays the band's track out.
async function meetMinSu(): Promise<void> {
  const user = await openMain();
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(300);
}

// The card's room under its content, kept for the input.
// Where the time bar stands under the pill, which holds the lanes the finger drags (P04 ticket 01).
function barTop(): ViewStyle['top'] {
  const style: unknown = screen.getByTestId('time-bar').props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).top;
}

// Partitions: the band dragged over 나's class, with its lane, its words, the card's lines, the outline, and the input
// (board a12's layout). The band is 112 points here, and its two handles, 16 wide each, stand at its ends.
describe("the band dragged over 나's class to 12:45", () => {
  it("draws 나's class red on the lane where the band covers it, from 13:00 to 13:13, over the band and its handles", async () => {
    await meetMinSu();

    await holdBody(120);

    const track = screen.getByTestId('time-band-track');
    const red = screen.getByTestId('time-band-red');
    expect(track.children.at(-1)).toBe(red);
    expect(red).toHaveStyle({ pointerEvents: 'none' });
    const clash = within(within(red).getByTestId(`time-band-red-${ME_LANE}`)).getByTestId('time-band-clash');
    expect(clash).toHaveStyle({ backgroundColor: color.warning, left: left(60) });
    expect(screen.getAllByTestId('time-band-clash')).toHaveLength(1);
    expect(body()).toHaveAccessibilityValue({ text: '12:45–13:13' });
  });

  it('says who cannot come under the band, and why in the lines', async () => {
    await meetMinSu();

    await holdBody(120);

    expect(timeBar().getByText('12:45–13:13 · 내가 안 돼요')).toBeVisible();
    const lines = within(card().getByTestId('answer-lines'));
    expect(lines.getByText('는 13:00부터 24동 수업이라')).toBeVisible();
    expect(lines.getByText('이때는 만날 수 없어요')).toBeVisible();
    expect(card().queryByText('12:15 302동 앞')).toBeNull();
  });

  it('keeps the place before as a dashed outline at 12:15, shows no chips, and gives the input way', async () => {
    await meetMinSu();

    await holdBody(120);

    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ borderStyle: 'dashed', left: left(15) });
    expect(card().queryByRole('button', { name: '12:45' })).toBeNull();
    expect(card().queryByRole('button', { name: '301동에서' })).toBeNull();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(recalculations(server)).toHaveLength(1);
  });
});

// Partitions: the time bar before the band moves and while it is held at 12:45. The lanes are the bar's,
// under the pill, so the card below may change while the input gives way.
describe('the bar while the band moves', () => {
  it('stays where it is while the input gives way, so that the lanes stay under the finger', async () => {
    await meetMinSu();
    const top = barTop();

    await holdBody(120);

    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(top).toEqual(expect.any(Number));
    expect(barTop()).toBe(top);
  });
});

// Partitions: the band over nobody's stretch; past the track's end; less than half a step.
describe('the band dragged elsewhere and held', () => {
  it("shows the band's own words and no lines over nobody's stretch at 12:25, the Plan's place on the map", async () => {
    await meetMinSu();

    await holdBody(40);

    expect(body()).toHaveAccessibilityValue({ text: '12:25–12:53' });
    expect(screen.queryByTestId('time-band-clash')).toBeNull();
    expect(timeBar().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
    expect(card().queryByTestId('answer-lines')).toBeNull();
    expect(mapThings()).toContain('302동 앞 · 12:15 만남');
  });

  it("stops at the track's end, 12:47 to 13:15, where 나 cannot come for the 13:00 class", async () => {
    await meetMinSu();

    await holdBody(400);

    expect(body()).toHaveAccessibilityValue({ text: '12:47–13:15' });
    expect(timeBar().getByText('12:47–13:15 · 내가 안 돼요')).toBeVisible();
    expect(within(card().getByTestId('answer-lines')).getByText('는 13:00부터 24동 수업이라')).toBeVisible();
  });

  it('stays where it is for a drag of less than half a step', async () => {
    await meetMinSu();

    await holdBody(2);

    expect(body()).toHaveAccessibilityValue({ text: '12:15–12:43' });
    expect(timeBar().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
  });
});

// Partitions: a drag that starts on the lanes beside the band, outside the handles' touch areas, which stand 44 points
// wide around 60 and 172.
describe('the band dragged from its lanes beside it', () => {
  it("moves whole by the finger's distance from 13:02's place, to 12:45, not to the finger", async () => {
    await meetMinSu();

    await holdLanes(250, 120);

    expect(body()).toHaveAccessibilityValue({ text: '12:45–13:13' });
    expect(timeBar().getByText('12:45–13:13 · 내가 안 돼요')).toBeVisible();
  });
});
