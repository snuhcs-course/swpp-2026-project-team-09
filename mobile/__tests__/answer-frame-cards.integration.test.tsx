/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { QuestProposal } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, MAJOR } from './support/events';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { DINNER as DINNER_MARKER, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerParty, MY_HIKE } from './support/party';
import { toast } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';
import { answerShuttle } from './support/shuttle';

// What the answer frame's card holds (P02 ticket 01, "Today's answers inside the card" and "A reply that carries a
// Plan"), against the fake main server, with the switch on: the chat's own parts without a bubble around them.

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

const ASKED = '배고파, 민수랑 같이';

// The Proposal of `chat-proposal-card.integration.test.tsx`: tomorrow's lunch on the meal Board, the phone's clock
// standing on 2026-10-06 at 13:00 in Korea.
const LUNCH: QuestProposal = {
  title: '학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2026-10-07T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

const PROPOSED = { text: '이렇게 만들까요?', mapButtons: [], cards: [], proposal: LUNCH };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// Starts the app with the switch on, and asks; the main server answers with `reply`.
async function askFramed(reply: object): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  const user = await openMain({ answerOnMap: true });
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

async function backToMap(user: User): Promise<void> {
  await user.press(screen.getByRole('tab', { name: '지도' }));
  await pass(500);
}

// Partitions: a reply with a Plan, with an answer and no Plan; an event card, a Proposal, and a map button, each with
// where its press leads.
describe('a reply that carries an answer', () => {
  beforeEach(() => {
    answerParty(server);
  });

  it("shows the first Plan's two lines in place of the model's sentence, the strong part in the key colour", async () => {
    await askFramed(MEAL_ANSWER_REPLY);

    // MEAL_PLAN_1's lines.
    expect(card().getByText('12:15 302동식당')).toHaveStyle({ color: color.snuBlue });
    expect(card().getByText('같이 먹으면 식사가 27분 줄어요')).toBeVisible();
    expect(card().queryByText(MEAL_ANSWER_REPLY.text)).toBeNull();
  });

  it('shows the lines that say why when the answer has no Plan', async () => {
    // The stored answer with this one field changed: no Plan, and the lines of a day without a menu.
    const answer = {
      ...MEAL_ANSWER_REPLY.answer,
      plans: [],
      noPlan: { reason: 'no-menu', lines: [[{ text: '오늘은 여는 식당이 없어요', strong: false }]] },
    };

    await askFramed({ ...MEAL_ANSWER_REPLY, answer });

    expect(card().getByText('오늘은 여는 식당이 없어요')).toBeVisible();
    expect(card().queryByText(MEAL_ANSWER_REPLY.text)).toBeNull();
  });
});

describe('an event card in the frame', () => {
  it('opens the 행사 tab at the event, and the frame is still there on 지도', async () => {
    answerEvents(server);
    const user = await askFramed({
      text: '설명회가 있어요.',
      mapButtons: [],
      cards: [{ kind: 'globalEvent', globalEvent: MAJOR }],
      proposal: null,
    });

    await user.press(card().getByRole('link', { name: MAJOR.title }));
    await pass(500);

    expect(screen.getByRole('tab', { name: '행사' })).toBeSelected();
    await backToMap(user);
    expect(screen.getByTestId('answer-pill')).toBeVisible();
  });
});

describe('a Proposal in the frame', () => {
  beforeEach(() => {
    answerParty(server);
  });

  it('makes the Quest with 만들기 and shows 내 파티, and the frame is still there on 지도', async () => {
    server.on('POST /quests/own', { status: 201, body: MY_HIKE });
    const user = await askFramed({ text: '이렇게 만들까요?', mapButtons: [], cards: [], proposal: LUNCH });

    await user.press(within(card().getByTestId('proposal-card')).getByRole('button', { name: '만들기' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    await backToMap(user);
    expect(screen.getByTestId('answer-pill')).toBeVisible();
  });

  it("shows a refusal's toast above the card", async () => {
    server.on('POST /quests/own', refusal(409, 'BOARD_REQUIRED'));
    const user = await askFramed({ text: '이렇게 만들까요?', mapButtons: [], cards: [], proposal: LUNCH });
    await fireEvent(screen.getByTestId('answer-card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 400, width: 390, height: 300 } },
    });

    await user.press(within(card().getByTestId('proposal-card')).getByRole('button', { name: '만들기' }));
    await pass(500);

    expect(toast()).toHaveTextContent('게시판을 골라 주세요');
    // The card's 300 from the screen's bottom, and 8 of clear room.
    expect(toast()).toHaveStyle({ bottom: 308 });
  });
});

// Partitions: the frame's card not laid out yet after another card was; laid out; closed with a selected card back.
describe('a toast while the frame is shown', () => {
  beforeEach(() => {
    answerParty(server);
    server.on('POST /assistant/messages', { status: 200, body: PROPOSED });
    server.on('POST /quests/own', refusal(409, 'BOARD_REQUIRED'));
  });

  // Opens the main screen with the switch on, opens a Quest's card 180 high, and asks.
  async function askOverCard(): Promise<User> {
    const user = await openMain({ answerOnMap: true });
    await press(user, DINNER_MARKER);
    await fireEvent(screen.getByTestId('map-card'), 'layout', {
      nativeEvent: { layout: { x: 16, y: 300, width: 358, height: 180 } },
    });
    await user.type(screen.getByLabelText(AI_INPUT), ASKED);
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    return user;
  }

  it("sits where it sits without a card until the frame's card is laid out", async () => {
    const user = await askOverCard();

    await user.press(within(card().getByTestId('proposal-card')).getByRole('button', { name: '만들기' }));
    await pass(500);

    // Where a toast sits with no card open, as main-card.integration.test.tsx has it.
    expect(toast()).toHaveStyle({ bottom: 158 });
  });

  it("sits above the selected thing's card again, by that card's height, once the frame is closed", async () => {
    const user = await askOverCard();
    expect(screen.queryByTestId('map-card')).toBeNull();
    await fireEvent(screen.getByTestId('answer-card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 400, width: 390, height: 300 } },
    });

    await user.press(within(screen.getByTestId('answer-pill')).getByRole('button', { name: '답 닫기' }));
    expect(screen.getByTestId('map-card')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '올리기' }));

    // The navigation's 80, the card's bottom 72 above it, its 180, and 8 of clear room.
    expect(toast()).toHaveStyle({ bottom: 340 });
  });
});

describe('a map button in the frame', () => {
  it('forgets the conversation and turns its layer on', async () => {
    answerParty(server);
    answerShuttle(server);
    const user = await askFramed({ text: '셔틀 두 대가 있어요.', mapButtons: ['shuttle'], cards: [], proposal: null });

    await user.press(card().getByRole('button', { name: '지도에서 셔틀 보기' }));
    await pass(500);

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    await press(user, LAYERS);
    expect(screen.getByRole('togglebutton', { name: '셔틀버스 끄기' })).toBeVisible();
  });
});
