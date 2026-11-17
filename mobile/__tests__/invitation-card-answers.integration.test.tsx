/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { mapThings } from './support/answer-map';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import {
  ACCEPT_ROUTE,
  answerInvitation,
  answerTwoInvitations,
  CARD_ROUTE,
  DECLINE_ROUTE,
  invitationCard,
  openInvitation,
  SECOND_CARD_ROUTE,
  SECOND_RECEIVED,
} from './support/invitation';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, DINNER as DINNER_QUEST, PHONE_NOW } from './support/server';

// 수락, 거절, and the reads of a received invitation's card (P02 ticket 06), against the fake main server: the list of
// received invitations holds the stored card's invitation, and its card is the stored card of 민수. 수락 and 거절 use the
// endpoints of the 파티 tab, whose words for an acceptance and a failure the card keeps.

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

const HELD_MS = 3000;
const GONE = '이미 끝난 초대예요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerInvitation(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The list of received invitations is empty once the invitation was answered.
function answered(): void {
  server.on('GET /quest-invitations', { status: 200, body: [] });
}

// Partitions: an acceptance, and a decline.
describe('수락 and 거절', () => {
  it('수락 accepts, says so, and closes the card to the everyday map, the Quests read again', async () => {
    server.on(ACCEPT_ROUTE, { status: 201, body: DINNER_QUEST });
    const user = await openMain();
    await openInvitation();
    const questsBefore = server.received('GET /quests').length;
    answered();

    await user.press(invitationCard().getByRole('button', { name: '수락' }));
    await pass(500);

    expect(server.received(ACCEPT_ROUTE)).toHaveLength(1);
    expect(screen.getByText('파티에 참여했어요')).toBeVisible();
    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
    expect(mapThings()).not.toContain('나 · 18분');
    expect(server.received('GET /quests').length).toBeGreaterThan(questsBefore);
  });

  it('거절 declines, says so, and closes the card', async () => {
    server.on(DECLINE_ROUTE, { status: 204 });
    const user = await openMain();
    await openInvitation();
    answered();

    await user.press(invitationCard().getByRole('button', { name: '거절' }));
    await pass(500);

    expect(server.received(DECLINE_ROUTE)).toHaveLength(1);
    expect(screen.getByText('초대를 거절했어요')).toBeVisible();
    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
  });
});

// Partitions: a failure, and a second press while the first is on its way.
describe('수락 and 거절 that do not go through', () => {
  it('a failure says so and leaves the card', async () => {
    server.on(ACCEPT_ROUTE, { status: 500, body: { statusCode: 500 } });
    const user = await openMain();
    await openInvitation();

    await user.press(invitationCard().getByRole('button', { name: '수락' }));
    await pass(500);

    expect(screen.getByText('요청하지 못했어요. 다시 시도해 주세요')).toBeVisible();
    expect(invitationCard().getByRole('button', { name: '수락' })).toBeEnabled();
    expect(mapThings()).toContain('나 · 18분');
  });

  it('takes one press while its request is on its way', async () => {
    server.on(DECLINE_ROUTE, { status: 204, afterMs: HELD_MS });
    const user = await openMain();
    await openInvitation();

    await user.press(invitationCard().getByRole('button', { name: '거절' }));
    await pass(500);
    expect(invitationCard().getByRole('button', { name: '수락' })).toBeDisabled();
    await user.press(invitationCard().getByRole('button', { name: '거절' }));
    await pass(HELD_MS);

    expect(server.received(DECLINE_ROUTE)).toHaveLength(1);
    expect(server.received(ACCEPT_ROUTE)).toHaveLength(0);
  });
});

// Partitions: a reply that comes after its card was closed and another invitation's card opened.
describe('수락 of one invitation while another is shown', () => {
  it("closes only its own card, says it accepted, and leaves the other's buttons free", async () => {
    answerTwoInvitations(server);
    server.on(ACCEPT_ROUTE, { status: 201, body: DINNER_QUEST, afterMs: HELD_MS });
    const user = await openMain();
    await openInvitation();
    await user.press(invitationCard().getByRole('button', { name: '수락' }));
    server.on('GET /quest-invitations', { status: 200, body: [SECOND_RECEIVED] });
    await user.press(invitationCard().getByRole('button', { name: '초대 닫기' }));

    await openInvitation(SECOND_RECEIVED.id);
    expect(invitationCard().getByRole('button', { name: '수락' })).toBeEnabled();
    await pass(HELD_MS);

    expect(screen.getByText('파티에 참여했어요')).toBeVisible();
    expect(screen.queryByText(GONE)).toBeNull();
    expect(invitationCard().getByRole('button', { name: '거절' })).toBeEnabled();
    expect(server.received(SECOND_CARD_ROUTE).length).toBeGreaterThan(0);
  });
});

// Partitions of the read: on its way, an invitation that waits no more (404), and another failure.
describe('the read of the card', () => {
  it('says the invitation is being read while the reply is held back', async () => {
    answerInvitation(server, { status: 200, body: INVITATION_CARD, afterMs: HELD_MS });
    await openMain();

    await openInvitation();

    expect(invitationCard().getByText('초대를 불러오는 중이에요')).toBeVisible();
    await pass(HELD_MS);
    expect(invitationCard().getByText('유상의 파티 초대')).toBeVisible();
  });

  it('says an invitation that waits no more is over, closes the card, and reads the list again', async () => {
    answerInvitation(server, refusal(404, 'QUEST_INVITATION_NOT_FOUND'));
    await openMain();
    const listsBefore = server.received('GET /quest-invitations').length;

    await openInvitation();

    expect(screen.getByText(GONE)).toBeVisible();
    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
    expect(server.received('GET /quest-invitations').length).toBeGreaterThan(listsBefore);
  });

  it('says another failure, and 다시 시도 reads the card again', async () => {
    answerInvitation(server, { status: 500, body: { statusCode: 500 } });
    const user = await openMain();
    await openInvitation();
    // A failure of the main server's own is asked once more before the screen is told.
    await pass(2000);
    expect(invitationCard().getByText('초대를 불러오지 못했어요')).toBeVisible();
    server.on(CARD_ROUTE, { status: 200, body: INVITATION_CARD });

    await user.press(invitationCard().getByRole('button', { name: '다시 시도' }));
    await pass(500);

    expect(invitationCard().getByText('유상의 파티 초대')).toBeVisible();
    expect(mapThings()).toContain('나 · 18분');
  });
});
