/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { answerInvitation, invitationCard, openInvitation } from './support/invitation';
import { button, findButton } from './support/lists';
import { openLive, socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMyParty, DINNER_PARTY_MINE } from './support/room';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The map's credit as the User joins and leaves a Party while the map is shown, and as the AI input comes back after
// a card that hid it (P15 ticket 07), against the fake main server and socket server. Kakao's logo takes the same
// inset, which only the native map draws.

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

const CREDIT = '지도 데이터 출처 보기';
const ACTIVE_PARTY = `활성 파티 ${DINNER_PARTY_MINE.title} 열기`;

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

// The main server tells of a change to the User's Party, which the app fetches again.
async function partyChanged(): Promise<void> {
  await socketServer((socket) => {
    socket.send('party-changed');
  });
  await pass(500);
}

// Partitions: joining from no Party, leaving back to none.
describe("the map's credit as the User joins and leaves a Party", () => {
  it('rises over the row of buttons when the User joins, and comes back to the AI input when they leave', async () => {
    const party = answerMyParty(server, null);
    await openLive();
    // The input's top is 62 above the navigation, which is 80 high, and the map's own margin of 8 is over it.
    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 70 });

    party.set(DINNER_PARTY_MINE);
    await partyChanged();
    // The row ends 126 above the navigation.
    expect(button(ACTIVE_PARTY)).toBeVisible();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 134 });

    party.set(null);
    await partyChanged();
    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 70 });
  });
});

// The AI input as it lays itself out.
async function layInput(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('ai-input'), 'layout', { nativeEvent: { layout: { height } } });
}

// Partitions: a received invitation's card, which hides the input and loses a draft of more than a line.
describe("the map's credit as the AI input comes back", () => {
  it('comes back down when the input returns at one line after a card that hid it', async () => {
    answerInvitation(server);
    const user = await openMain();
    await layInput(90);
    // The input's top is 12 and 90 above the navigation.
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 110 });

    await openInvitation();
    await user.press(invitationCard().getByRole('button', { name: '초대 닫기' }));
    await layInput(50);

    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 80 + 70 });
  });
});
