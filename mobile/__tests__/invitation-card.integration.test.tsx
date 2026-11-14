/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { InvitationCard } from '@/api/invitation-card-types';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { mapLines, mapThings } from './support/answer-map';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { answerInvitation, CARD_ROUTE, invitationCard, openInvitation, OWN_WAY_MARKS } from './support/invitation';
import { AI_INPUT, FRIEND_PILL } from './support/lists';
import { givePhone, OFF_CAMPUS, ON_CAMPUS, openMain } from './support/main';
import { DINNER } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A received invitation opened by its address on the main screen (P02 ticket 06), against the fake main server: the
// list of received invitations holds the stored card's invitation, and GET /quest-invitations/:id answers with the
// stored card of 민수, whose way goes from 302동 by the Merging Point at 301동 to 63동.

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

// The stored card as the main server words it off campus (main-server `plans/own-way.ts`): no origin, no times, its
// line, and a scene of the destination alone. Changed from the stored copy for the boundary.
const OFF_CAMPUS_CARD: InvitationCard = {
  ...INVITATION_CARD,
  way: {
    status: 'off-campus',
    origin: null,
    leaveAt: null,
    walkMinutes: null,
    arriveAt: null,
    meeting: null,
    leaveBy: null,
    next: null,
    lines: [[{ text: '캠퍼스 밖이라 길은 그리지 못해요.', strong: false }]],
    scene: {
      people: [],
      places: INVITATION_CARD.way?.scene.places.filter(({ role }) => role === 'pick') ?? [],
      routes: [],
      flags: INVITATION_CARD.way?.scene.flags.filter(({ role }) => role === 'place') ?? [],
    },
  },
};

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

// Partitions: the card's words, the map's marks and lines, and what gives way.
describe('the address of a received invitation, with the switch on', () => {
  it('opens its card: whose, when and where, with whom, the way, the steps, and the buttons', async () => {
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(invitationCard().getByText('유상의 파티 초대')).toBeVisible();
    expect(invitationCard().getByTestId('invitation-title')).toHaveTextContent('12:33 학생회관식당에서 식사');
    expect(invitationCard().getByText('유상과 함께')).toBeVisible();
    expect(invitationCard().getByText('12:15에 수업이 끝나면 바로 나서면 돼요.')).toBeVisible();
    expect(invitationCard().getByText('12:18 유상, 민수: 301동 앞에서 만나기')).toBeVisible();
    expect(invitationCard().getByRole('button', { name: '수락' })).toBeEnabled();
    expect(invitationCard().getByRole('button', { name: '거절' })).toBeEnabled();
  });

  it("draws 민수's own way in place of the everyday map's markers", async () => {
    await openMain({ answerOnMap: true });
    expect(mapThings()).toContain(DINNER);

    await openInvitation();

    expect(mapThings()).toEqual(expect.arrayContaining(OWN_WAY_MARKS));
    expect(mapThings()).not.toContain(DINNER);
    expect(mapThings()).not.toContain('내 위치');
    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
  });

  it('hides the lists, the AI input, and the tab bar, and shows no pill', async () => {
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(screen.queryByRole('button', { name: FRIEND_PILL })).toBeNull();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: the phone on campus, and off campus.
describe("the phone's position in the read", () => {
  it('goes with the read while the User is on campus', async () => {
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(server.received(CARD_ROUTE).map(({ query }) => query)).toEqual([
      { latitude: String(ON_CAMPUS.latitude), longitude: String(ON_CAMPUS.longitude) },
    ]);
  });

  it('does not go with it off campus', async () => {
    givePhone({ permission: 'granted', position: OFF_CAMPUS });
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(server.received(CARD_ROUTE).map(({ query }) => query)).toEqual([{}]);
  });
});

// Partitions: ✕, and Android's back button.
describe('closing the card', () => {
  it('✕ brings the everyday map back', async () => {
    const user = await openMain({ answerOnMap: true });
    await openInvitation();

    await user.press(invitationCard().getByRole('button', { name: '초대 닫기' }));

    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
    expect(mapThings()).not.toContain('나 · 18분');
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });

  it("Android's back button closes it as ✕ does", async () => {
    const back = holdBackButton();
    await openMain({ answerOnMap: true });
    await openInvitation();

    await expect(back()).resolves.toBe(true);

    expect(screen.queryByTestId('invitation-card')).toBeNull();
    expect(mapThings()).toContain(DINNER);
  });
});

// Partitions: the switch off.
describe('the address of a received invitation, with the switch off', () => {
  it("opens the 파티 tab's invitations, and reads no card", async () => {
    await openMain();

    await openInvitation();

    expect(shownAddress()).toBe('/party?tab=invites');
    expect(server.received(CARD_ROUTE)).toEqual([]);
  });
});

// Partitions: a way off campus, whose scene holds the destination alone; no way at all.
describe('a way that cannot be drawn', () => {
  it("draws the destination alone, and the card says the server's line", async () => {
    answerInvitation(server, { status: 200, body: OFF_CAMPUS_CARD });
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(invitationCard().getByText('캠퍼스 밖이라 길은 그리지 못해요.')).toBeVisible();
    expect(mapThings()).toContain('63동 · 12:33 학생회관식당에서 식사');
    expect(mapThings()).not.toContain('나 · 18분');
    expect(mapThings()).not.toContain(DINNER);
    expect(mapLines()).toEqual([]);
  });

  it('leaves the everyday map without a way, and the card has no line of one', async () => {
    // Changed for the boundary: no gathering, and so no way, as the contract has it.
    answerInvitation(server, { status: 200, body: { ...INVITATION_CARD, gathering: null, way: null } });
    await openMain({ answerOnMap: true });

    await openInvitation();

    expect(invitationCard().getByTestId('invitation-title')).toHaveTextContent('점심', { exact: true });
    expect(invitationCard().queryByTestId('answer-lines')).toBeNull();
    expect(mapThings()).toContain(DINNER);
  });
});
