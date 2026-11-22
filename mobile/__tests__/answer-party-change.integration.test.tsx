/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { ANSWER_CAPABILITIES, type QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap } from './support/answer-map';
import { MY_CAREER } from './support/events';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerParty } from './support/party';
import { toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 25: "방금 만든 파티 19시로" answers with the made 파티 changed, whose 바꾸기 sends the main server's step to the
// room's 일정 수정 (PR 446). Changed, the card says so, the toast says whom it told, and the Proposal goes back as that
// 파티, without its change. A change the Assistant cannot make has 파티 수정하기 beside the input, which opens the room.
// Expected values: PR 446's shapes and the ticket's words.

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

const QUEST_ID = '0b9a7c1e-1111-4a5b-8c9d-00000000aa01';
const STEP_ID = '0b9a7c1e-1111-4a5b-8c9d-00000000aa02';
const STEP = { title: '학식 같이 먹어요', startsAt: '2026-10-07T19:00:00+09:00' };

// Tomorrow's lunch made before, moved to 19:00.
const CHANGED: QuestProposal = {
  title: '학식 같이 먹어요',
  description: '',
  joinPolicy: 'closed',
  board: null,
  capacity: 4,
  startsAt: '2026-10-07T19:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
  change: { questId: QUEST_ID, subQuestId: STEP_ID, step: STEP, told: 2 },
};
const REPLY = {
  text: '19:00로 바꿀까요? 바꾸면 참여한 2명에게 알림이 가요.',
  mapButtons: [],
  cards: [],
  proposal: CHANGED,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerParty(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('proposal-card'));
}

it('says party-change to the main server', () => {
  expect(ANSWER_CAPABILITIES).toContain('party-change');
});

// Partitions: the card; 파티 보기.
describe('a made 파티 changed in place', () => {
  it('shows the 파티 to change with 파티 보기 and 바꾸기', async () => {
    await askOnMap(server, REPLY);

    expect(card().getByText('파티 바꾸기')).toBeVisible();
    expect(card().getByRole('button', { name: '바꾸기' })).toBeEnabled();
    expect(card().getByRole('button', { name: '파티 보기' })).toBeEnabled();
  });

  it('opens the room from 파티 보기', async () => {
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByRole('button', { name: '파티 보기' }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${QUEST_ID}`);
  });
});

// Partitions: 바꾸기 taken and refused; the change sent back before and after it.
describe('its 바꾸기', () => {
  it('sends the step to 일정 수정, says whom it told, and sends the 파티 back without its change', async () => {
    server.on(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`, { status: 200, body: MY_CAREER.subQuests[0] });
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`).map(({ body }) => body)).toEqual([STEP]);
    expect(toast()).toHaveTextContent('파티를 바꿨어요. 참여한 2명에게 알렸어요');
    expect(card().getByRole('button', { name: '바꿨어요' })).toBeDisabled();

    await user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    const sent = server.received('POST /assistant/messages').at(-1)?.body;
    expect(sent).toMatchObject({ messages: [{}, { proposal: { madeQuestId: QUEST_ID } }, {}] });
    expect(JSON.stringify(sent)).not.toContain('"change"');
  });

  it('keeps 바꾸기 when the room refuses, and sends the change back as shown', async () => {
    server.on(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`, refusal(409, 'QUEST_STARTED'));
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(card().getByRole('button', { name: '바꾸기' })).toBeEnabled();
    await user.type(screen.getByLabelText(AI_INPUT), '그럼 20시');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    expect(server.received('POST /assistant/messages').at(-1)?.body).toMatchObject({
      messages: [{}, { proposal: { change: { questId: QUEST_ID, told: 2 } } }, {}],
    });
  });
});

describe('a change the Assistant cannot make', () => {
  it('has 파티 수정하기 beside the input, which opens the room', async () => {
    const offer = { kind: 'quest', label: '파티 수정하기', questId: QUEST_ID };
    const user = await askOnMap(server, {
      text: '제목은 파티에서 바꿀 수 있어요.',
      mapButtons: [],
      cards: [],
      proposal: null,
      offers: [offer],
    });

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '파티 수정하기' }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${QUEST_ID}`);
  });
});
