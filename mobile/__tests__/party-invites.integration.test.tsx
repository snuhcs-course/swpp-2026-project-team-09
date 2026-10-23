/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal, type Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { toast } from './support/room';
import { answerParty, openAt } from './support/party';
import { askMainServer, DINNER, INVITATION, PHONE_NOW } from './support/server';

// 초대, against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea. Moved out of
// `party-mine.integration.test.tsx`.

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

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { invitations: [INVITATION] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('초대', () => {
  it('shows an invitation, which 수락 accepts', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/accept`, { status: 201, body: DINNER });
    const user = await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 1')).toBeVisible();
    expect(screen.queryByText(/보낸 초대/u)).toBeNull();
    const invitation = within(screen.getByLabelText(INVITATION.quest.title));
    expect(invitation.getByText('윤태오님이 비공개 파티에 초대했어요')).toBeVisible();
    expect(invitation.getByText('30분 전')).toBeVisible();
    expect(invitation.getByText(INVITATION.quest.description)).toBeVisible();
    expect(invitation.getByText('1명 참여 중')).toBeVisible();
    await user.press(invitation.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/accept`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('파티에 참여했어요');
  });

  it('declines with 거절, which removes the card', async () => {
    server.on(`POST /quest-invitations/${INVITATION.id}/decline`, { status: 204 });
    const user = await openAt('/party?tab=invites');

    setAnswers({ invitations: [] });
    await user.press(screen.getByRole('button', { name: '거절' }));
    await pass(500);

    expect(server.received(`POST /quest-invitations/${INVITATION.id}/decline`)).toHaveLength(1);
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
  });
});

describe('a refused acceptance', () => {
  it.each([
    [refusal(404, 'QUEST_INVITATION_NOT_FOUND'), '이미 끝난 초대예요'],
    [refusal(409, 'QUEST_FULL'), '자리가 다 찼어요'],
    [refusal(409, 'QUEST_ENDED'), '이미 끝난 파티예요'],
    [refusal(409, 'SHARED_QUEST_HELD'), '이 행사에 함께 가는 파티가 이미 있어요'],
  ] as [Reply, string][])('says why an acceptance was refused and keeps the invitation: %j', async (reply, words) => {
    server.on(`POST /quest-invitations/${INVITATION.id}/accept`, reply);
    const user = await openAt('/party?tab=invites');

    await user.press(screen.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(toast()).toHaveTextContent(words);
    expect(screen.getByText(INVITATION.quest.title)).toBeVisible();
  });
});

describe('an invitation in the build that asks the main server', () => {
  it('leaves out the mocked time, place and companions, and counts the Holders', async () => {
    setAnswers({ invitations: [{ ...INVITATION, quest: { ...INVITATION.quest, holderCount: 3 } }] });
    await openAt('/party?tab=invites');

    const invitation = within(screen.getByLabelText(INVITATION.quest.title));
    expect(invitation.getByText('3명 참여 중')).toBeVisible();
    expect(invitation.queryByText(/함께|·/u)).toBeNull();
  });
});

describe('초대 without an invitation', () => {
  it('says when no invitation waits', async () => {
    setAnswers({ invitations: [] });
    await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 0')).toBeVisible();
    expect(screen.getByText('받은 초대가 없어요')).toBeVisible();
  });
});
