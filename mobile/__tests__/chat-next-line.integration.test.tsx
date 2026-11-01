/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen } from './support/app';
import { AI_INPUT, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { MOCK_NEXT_LINE, MOCK_NEXT_LINE_ID } from '@/api/mock/assistant';
import { forgetMockSuggestionOutcomes, mockSuggestionOutcomes } from '@/api/mock/suggestion';
import type { ShownAssistantReply } from '@/api/quest-parts-types';

// The next line of an answer in the AI input, against the mock client, whose menus answer leaves one.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const PLACEHOLDER = '무엇이든 부탁해 보세요';
const FILL = '제안 채우기';
const MENUS = '오늘 학식 뭐 나와?';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  forgetMockSuggestionOutcomes();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function input(): ReturnType<typeof screen.getByLabelText> {
  return screen.getByLabelText(AI_INPUT);
}

async function say(user: User, words: string): Promise<void> {
  await user.type(input(), words);
  await user.press(screen.getByRole('button', { name: SEND }));
  await pass(500);
}

// The chat open on the mock's answer about the menus.
async function afterMenus(): Promise<User> {
  const user = await openMain();
  await user.press(input());
  await pass(500);
  await say(user, MENUS);
  return user;
}

describe('An answer that leaves a next line', () => {
  it("shows it as the input's placeholder, with 채우기", async () => {
    await afterMenus();

    expect(input()).toHaveProp('placeholder', MOCK_NEXT_LINE);
    expect(screen.getByRole('button', { name: FILL })).toBeVisible();
  });

  it('is put in the input by 채우기, which says it was taken and goes', async () => {
    const user = await afterMenus();

    await user.press(screen.getByRole('button', { name: FILL }));
    await pass(500);

    expect(input()).toHaveDisplayValue(MOCK_NEXT_LINE);
    expect(screen.queryByRole('button', { name: FILL })).toBeNull();
    expect(mockSuggestionOutcomes()).toEqual([{ suggestionId: MOCK_NEXT_LINE_ID, outcome: 'accepted' }]);
  });

  it('gives way once the User types, and comes back when the input is empty again', async () => {
    const user = await afterMenus();

    await user.type(input(), '내');

    expect(screen.queryByRole('button', { name: FILL })).toBeNull();

    await user.clear(input());

    expect(screen.getByRole('button', { name: FILL })).toBeVisible();
    expect(mockSuggestionOutcomes()).toEqual([]);
  });
});

describe('The next line, as the chat goes on', () => {
  it('goes when the sheet closes, and when the chat starts over', async () => {
    const user = await afterMenus();

    await user.press(screen.getByRole('button', { name: '대화 닫기' }));

    expect(input()).toHaveProp('placeholder', PLACEHOLDER);
    expect(screen.queryByRole('button', { name: FILL })).toBeNull();

    await user.press(input());
    await pass(500);

    expect(input()).toHaveProp('placeholder', MOCK_NEXT_LINE);

    await user.press(screen.getByRole('button', { name: '새 대화' }));
    await pass(500);

    expect(screen.queryByRole('button', { name: FILL })).toBeNull();
  });
});

const EVENT_LINE = {
  id: 'n1',
  text: '이 행사 같이 갈 사람 모집해줘',
  chosen: { kind: 'globalEvent' as const, id: 'e1', words: '이 행사' },
};

function reply(nextLine: ShownAssistantReply['nextLine']): ShownAssistantReply {
  return { text: '행사가 있어요.', mapButtons: [], cards: [], proposal: null, choices: [], resolvedBy: [], nextLine };
}

type Asked = jest.SpiedFunction<typeof apiClient.askAssistant>;

// The chat open on an answer that leaves a line about an event, the next answers leaving none.
async function withEventLine(): Promise<{ user: User; asked: Asked }> {
  const asked = jest.spyOn(apiClient, 'askAssistant').mockResolvedValue(reply(EVENT_LINE));
  const user = await openMain();
  await user.press(input());
  await pass(500);
  await say(user, '이번 주 행사 있어?');
  asked.mockResolvedValue(reply(null));
  return { user, asked };
}

describe('The next message', () => {
  it('goes with the line’s candidate when it is the line, unchanged', async () => {
    const { user, asked } = await withEventLine();

    await user.press(screen.getByRole('button', { name: FILL }));
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(asked.mock.lastCall?.[0].at(-1)).toEqual({ role: 'user', text: EVENT_LINE.text, chosen: EVENT_LINE.chosen });
  });

  it('goes with no candidate when the User changed it', async () => {
    const { user, asked } = await withEventLine();

    await user.press(screen.getByRole('button', { name: FILL }));
    await user.type(input(), ' 내일');
    await user.press(screen.getByRole('button', { name: SEND }));
    await pass(500);

    expect(asked.mock.lastCall?.[0].at(-1)).toEqual({ role: 'user', text: `${EVENT_LINE.text} 내일` });
  });

  it('takes the line away once the answer leaves none', async () => {
    const { user } = await withEventLine();

    await say(user, '고마워');

    expect(input()).toHaveProp('placeholder', PLACEHOLDER);
    expect(screen.queryByRole('button', { name: FILL })).toBeNull();
  });
});
