/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { DimensionValue } from 'react-native';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import { card } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { body, holdBody, layTrack } from './support/band-move';
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
// Plan runs from 12:15 to 12:43 in a range of 12:00 to 18:30; 나 is busy 13:00–13:50 ("24동 수업") and 17:00–18:15
// ("58동 수업"), 민수 15:30–16:45 ("302동 수업"). The track is laid 390 wide, a point a minute, so that a drag of 185 is
// board a12's band at 15:20. Expected values: board a12 and the ticket.

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

// Where a time lies on the track, as the share of a5's range of 390 minutes from 12:00.
const left = (minutes: number): DimensionValue => `${(minutes / 390) * 100}%`;

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
  const user = await openMain({ answerOnMap: true });
  await press(user, row(MIN_SU));
  await meetFromCard(user);
  await layTrack(390);
}

// Partitions: the band dragged over 민수's class (board a12), with its lane, its words, the card's lines, the outline,
// the time chip, and the input.
describe("the band dragged over 민수's class to 15:20 (board a12)", () => {
  it("draws 민수's class red on his lane where the band covers it, from 15:30 to the band's end at 15:48", async () => {
    await meetMinSu();

    await holdBody(185);

    const clash = within(screen.getByTestId(`time-band-lane-${MIN_SU.id}`)).getByTestId('time-band-clash');
    expect(clash).toHaveStyle({ backgroundColor: color.warning, left: left(210) });
    expect(screen.getAllByTestId('time-band-clash')).toHaveLength(1);
    expect(body()).toHaveAccessibilityValue({ text: '15:20–15:48' });
  });

  it('says who cannot come under the band, and why in the lines', async () => {
    await meetMinSu();

    await holdBody(185);

    expect(card().getByText('15:20–15:48 · 민수가 안 돼요')).toBeVisible();
    const lines = within(card().getByTestId('answer-lines'));
    expect(lines.getByText('민수')).toBeVisible();
    expect(lines.getByText('는 15:30부터 302동 수업이라')).toBeVisible();
    expect(lines.getByText('이때는 만날 수 없어요')).toBeVisible();
    expect(card().queryByText('12:15 302동 앞')).toBeNull();
  });

  it('keeps the place before as a dashed outline at 12:15, marks the time chip 15:20, and gives the input way', async () => {
    await meetMinSu();

    await holdBody(185);

    expect(screen.getByTestId('time-band-ghost')).toHaveStyle({ borderStyle: 'dashed', left: left(15) });
    expect(card().getByRole('button', { name: '15:20' })).toHaveStyle({ borderColor: color.quest });
    expect(card().queryByRole('button', { name: '13:00 수업까지' })).toBeNull();
    expect(card().getByRole('button', { name: '301동에서' })).toBeVisible();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(recalculations(server)).toHaveLength(1);
  });
});

// Partitions: the band over nobody's stretch; over the User's own class, past the range's end; less than half a step.
describe('the band dragged elsewhere and held', () => {
  it("shows the band's own words and the Plan's lines over nobody's stretch at 14:00", async () => {
    await meetMinSu();

    await holdBody(105);

    expect(body()).toHaveAccessibilityValue({ text: '14:00–14:28' });
    expect(screen.queryByTestId('time-band-clash')).toBeNull();
    expect(card().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
    expect(card().getByText('12:15 302동 앞')).toBeVisible();
    expect(card().getByRole('button', { name: '14:00' })).toHaveStyle({ borderColor: color.quest });
  });

  it("stops at the range's end, 18:02 to 18:30, where 나 cannot come for the 17:00 class", async () => {
    await meetMinSu();

    await holdBody(400);

    expect(body()).toHaveAccessibilityValue({ text: '18:02–18:30' });
    expect(card().getByText('18:02–18:30 · 내가 안 돼요')).toBeVisible();
    expect(within(card().getByTestId('answer-lines')).getByText('는 17:00부터 58동 수업이라')).toBeVisible();
  });

  it('stays where it is for a drag of less than half a step', async () => {
    await meetMinSu();

    await holdBody(2);

    expect(body()).toHaveAccessibilityValue({ text: '12:15–12:43' });
    expect(card().getByText('12:15–12:43 · 함께 28분')).toBeVisible();
  });
});
