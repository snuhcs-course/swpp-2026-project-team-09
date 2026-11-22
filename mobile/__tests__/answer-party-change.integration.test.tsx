/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { color } from '@/design-system';
import { ANSWER_CAPABILITIES, type QuestProposal } from '@/api/assistant-types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap } from './support/answer-map';
import { PLACES } from './support/dining';
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

  // From the screens: only what a change moves, and the title, so that its buttons stay in view.
  it('shows only its title, time, and place', async () => {
    await askOnMap(server, { ...REPLY, proposal: { ...CHANGED, description: '학생회관에서 저녁 같이 먹어요' } });

    expect(card().getByLabelText('제목 학식 같이 먹어요')).toBeVisible();
    expect(card().getByLabelText(/^언제 /u)).toBeVisible();
    expect(card().getByLabelText('어디서 없음')).toBeVisible();
    expect(card().queryByLabelText('인원 4명')).toBeNull();
    expect(card().queryByText('학생회관에서 저녁 같이 먹어요')).toBeNull();
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

function questAt(startsAt: string): object {
  const [step] = MY_CAREER.subQuests;
  return { ...MY_CAREER, id: QUEST_ID, subQuests: [{ ...step, id: STEP_ID, startsAt, place: null }] };
}

// P04 ticket 27, from PR 456's review: the step is read when the change comes and again on 바꾸기, which sends
// nothing once the step changed in between. Partitions: changed in the room meanwhile; unchanged.
describe('a step changed since the change came', () => {
  it('sends nothing, says the 파티 changed, and keeps 바꾸기 from a second press', async () => {
    server.on(`GET /quests/${QUEST_ID}`, { status: 200, body: questAt('2026-10-07T12:00:00+09:00') });
    server.on(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`, { status: 200, body: MY_CAREER.subQuests[0] });
    const user = await askOnMap(server, REPLY);
    server.on(`GET /quests/${QUEST_ID}`, { status: 200, body: questAt('2026-10-07T12:30:00+09:00') });

    await user.press(card().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`)).toHaveLength(0);
    expect(toast()).toHaveTextContent('파티가 그사이 바뀌었어요. 다시 물어봐 주세요');
    expect(card().getByRole('button', { name: '바꾸기' })).toBeDisabled();
  });

  // From the screens: the row the change moves stands out, the others plain.
  it('marks the time it moves, and not the place it keeps', async () => {
    server.on(`GET /quests/${QUEST_ID}`, { status: 200, body: questAt('2026-10-07T12:00:00+09:00') });
    await askOnMap(server, REPLY);
    await pass(500);

    const when = within(card().getByLabelText(/^언제 /u)).getByText(/19:00/u);
    expect(StyleSheet.flatten(when.props.style)).toMatchObject({ color: color.party });
    const where = within(card().getByLabelText('어디서 없음')).getByText('없음');
    expect(StyleSheet.flatten(where.props.style)).not.toMatchObject({ color: color.party });
  });

  it('sends the change when the step still stands as it did', async () => {
    server.on(`GET /quests/${QUEST_ID}`, { status: 200, body: questAt('2026-10-07T12:00:00+09:00') });
    server.on(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`, { status: 200, body: MY_CAREER.subQuests[0] });
    const user = await askOnMap(server, REPLY);

    await user.press(card().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received(`PUT /quests/${QUEST_ID}/sub-quests/${STEP_ID}`)).toHaveLength(1);
  });
});

// With #459, a Proposal with a Place stands on the map with its button beside the input: for a change, 바꾸기.
it('says 바꾸기 beside the input for a change with a Place on the map', async () => {
  server.on('GET /places', { status: 200, body: PLACES });
  await askOnMap(server, { ...REPLY, proposal: { ...CHANGED, place: { id: 'p63', name: '학생회관' } } });

  expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '바꾸기' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: '만들기' })).toBeNull();
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
