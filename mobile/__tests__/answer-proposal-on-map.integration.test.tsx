/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { pressMarker } from './support/made-quest';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE } from './support/party';
import { askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// P04 ticket 06: a Proposal with a Place stands on the map as a Plan does, with a flag that opens its rows and the
// button beside the input. The phone's clock stands on Tuesday 2026-10-06 at 13:00 in Korea; the Proposal is for
// tomorrow at 14:00 at 학생회관, inviting 김민준, whose position the everyday map shows.

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

const ASKED = '민준이랑 내일 2시 학생회관에서 볼 사람 모집해줘';
const REPLY = '이렇게 만들까요? 만들기를 누르기 전에는 아무것도 만들지 않아요.';

const AT_THE_UNION: QuestProposal = {
  title: '학생회관에서 만나요',
  description: '내일 2시에 학생회관에서 만나요',
  joinPolicy: 'open',
  board: 'hobby',
  capacity: 4,
  startsAt: '2026-10-07T14:00:00+09:00',
  place: { id: 'p63', name: '학생회관' },
  globalEvent: null,
  invitees: [{ id: MIN_JUN.id, name: MIN_JUN.name }],
};

const FLAG = '학생회관에서 만나요 › · 내일(수) 14:00 · 공개';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  server.on('GET /places', { status: 200, body: PLACES });
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function proposed(proposal: QuestProposal = AT_THE_UNION): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: { text: REPLY, mapButtons: [], cards: [], proposal } });
  const user = await openMain();
  await layStage(390, 760);
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function frame(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

describe('a Proposal with a Place', () => {
  it('stands as a flag with its title and start, a walk from the User, and the button beside the input', async () => {
    await proposed();

    expect(mapThings()).toContain(FLAG);
    expect(mapThings()).toContain(MIN_JUN.name);
    expect(mapLines()).toHaveLength(1);
    expect(screen.getByRole('button', { name: '만들고 초대 보내기' })).toBeEnabled();
    // The sheet's content is the raised card's at every step (P04 ticket 61): the reply's words over the Proposal's
    // card, which no dock now stands in place of at rest.
    expect(frame().getByText(REPLY)).toBeOnTheScreen();
    expect(frame().getByTestId('proposal-card')).toBeOnTheScreen();
  });

  it('opens its rows at a press on its flag, and the party form from 제목', async () => {
    const user = await proposed();

    await pressMarker(user, FLAG);

    const rows = within(screen.getByTestId('mark-card'));
    for (const row of [
      '제목 학생회관에서 만나요',
      '공개 범위 공개 · 바로 참여',
      '게시판 취미 게시판',
      '정원 4명',
      '초대 김민준 1명',
    ]) {
      expect(rows.getByRole('button', { name: row })).toBeVisible();
    }

    await user.press(rows.getByRole('button', { name: '제목 학생회관에서 만나요' }));
    await pass(500);

    expect(shownAddress()).toBe('/party-form?fromProposal=1');
    expect(screen.getByLabelText('제목')).toHaveDisplayValue(AT_THE_UNION.title);
  });
});

describe("a Proposal's button", () => {
  it('makes the Quest as 만들기 made it, inviting the Friend', async () => {
    const user = await proposed();

    await user.press(screen.getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(500);

    expect(server.received('POST /quests/own')[0]?.body).toMatchObject({
      title: AT_THE_UNION.title,
      capacity: 4,
      joinPolicy: 'open',
      board: 'hobby',
      subQuest: { title: AT_THE_UNION.title, startsAt: AT_THE_UNION.startsAt, place: { placeId: 'p63' } },
    });
    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toEqual([
      expect.objectContaining({ body: { userId: MIN_JUN.id } }),
    ]);
  });

  it('reads "만들기" when it invites nobody', async () => {
    await proposed({ ...AT_THE_UNION, invitees: [] });

    // The main button and the Proposal's card in the sheet's content (P04 ticket 61).
    const make = screen.getAllByRole('button', { name: '만들기' });
    expect(make).toHaveLength(2);
    for (const button of make) {
      expect(button).toBeEnabled();
    }
  });
});

describe('a Proposal without a Place', () => {
  it('keeps its card, with nothing on the map and no button beside the input', async () => {
    await proposed({ ...AT_THE_UNION, place: null });

    expect(frame().getByTestId('proposal-card')).toBeVisible();
    expect(mapThings()).not.toContain(expect.stringContaining('학생회관에서 만나요 ›'));
    expect(screen.queryByRole('button', { name: '만들고 초대 보내기' })).toBeNull();
  });
});
