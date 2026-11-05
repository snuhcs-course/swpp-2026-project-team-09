/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { EVENT, press } from './support/markers';
import { startFresh } from './support/mocks';
import { toast } from './support/room';
import { apiClient } from '@/api/client';
import { forgetMockSuggestionOutcomes, MOCK_SUGGESTION_ID, mockSuggestionOutcomes } from '@/api/mock/suggestion';

// The grey suggestion of the empty chat, against the mock client, which suggests lunch with 김민준.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const TEXT = '민준이랑 점심 어때요?';
const REASON = '공강 시작 · 민준이도 공강';
const PLACEHOLDER = '무엇이든 부탁해 보세요';
const DISMISS = '제안 닫기';
// 제1공학관 in the mocks' list of Places.
const PLACE_301 = { latitude: 37.45016, longitude: 126.95259 };

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

async function openChat(user?: User): Promise<User> {
  const opened = user ?? (await openMain());
  await opened.press(screen.getByLabelText(AI_INPUT));
  await pass(500);
  return opened;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('proposal-card'));
}

describe('the grey suggestion of the empty chat', () => {
  it('shows the request over the examples, with its reason', async () => {
    await openChat();

    expect(screen.getByRole('button', { name: TEXT })).toBeVisible();
    expect(screen.getByText(REASON)).toBeVisible();
    expect(screen.getByRole('button', { name: DISMISS })).toBeVisible();
    expect(screen.getByRole('button', { name: '식사 메뉴 추천' })).toBeVisible();
  });

  it("shows its text as the input's placeholder while it is held, and not once the chat closes", async () => {
    const user = await openChat();

    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', TEXT);

    await user.press(screen.getByRole('button', { name: '대화 닫기' }));

    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', PLACEHOLDER);
  });
});

describe('asking for the grey suggestion', () => {
  it('is done once each time the sheet opens, from the main screen', async () => {
    const asked = jest.spyOn(apiClient, 'getChatSuggestion');
    const user = await openChat();
    await openChat(user);

    expect(asked.mock.calls).toEqual([[{ screen: 'main', openEventId: null }]]);

    await user.press(screen.getByRole('button', { name: '대화 닫기' }));
    await openChat(user);

    expect(asked).toHaveBeenCalledTimes(2);
  });

  it('names the Global Event whose card is open', async () => {
    const asked = jest.spyOn(apiClient, 'getChatSuggestion');
    const user = await openMain();
    await press(user, EVENT);

    await openChat(user);

    expect(asked).toHaveBeenCalledWith({ screen: 'main', openEventId: 'e1' });
  });

  it('is not done when the chat opens on a conversation', async () => {
    const asked = jest.spyOn(apiClient, 'getChatSuggestion');
    const user = await openChat();
    await user.press(screen.getByRole('button', { name: '식사 메뉴 추천' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '대화 닫기' }));

    await openChat(user);

    expect(asked).toHaveBeenCalledTimes(1);
  });
});

describe('× on the grey suggestion', () => {
  it('hides it, gives the placeholder back and says it was dismissed', async () => {
    const user = await openChat();

    await user.press(screen.getByRole('button', { name: DISMISS }));
    await pass(500);

    expect(screen.queryByTestId('chat-suggestion')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', PLACEHOLDER);
    expect(mockSuggestionOutcomes()).toEqual([{ suggestionId: MOCK_SUGGESTION_ID, outcome: 'dismissed' }]);
  });
});

describe('a tap on a suggested Proposal', () => {
  it("shows the Proposal as the Assistant's without asking the model, and says it was accepted", async () => {
    const askAssistant = jest.spyOn(apiClient, 'askAssistant');
    const user = await openChat();

    await user.press(screen.getByRole('button', { name: TEXT }));
    await pass(500);

    expect(within(screen.getByTestId('assistant-bubble')).getByTestId('proposal-card')).toBeVisible();
    for (const row of ['제목 민준이랑 점심', '공개 범위 비공개', '언제 오늘 14:00', '친구 초대 김민준', '인원 2명']) {
      expect(card().getByLabelText(row)).toBeVisible();
    }
    expect(card().getByRole('button', { name: '만들기' })).toBeEnabled();
    expect(screen.queryByTestId('user-bubble')).toBeNull();
    expect(askAssistant).not.toHaveBeenCalled();
    expect(mockSuggestionOutcomes()).toEqual([{ suggestionId: MOCK_SUGGESTION_ID, outcome: 'accepted' }]);
  });

  it('says it was confirmed, with the Quest, once 만들기 made it', async () => {
    const user = await openChat();
    await user.press(screen.getByRole('button', { name: TEXT }));
    await pass(500);

    await user.press(card().getByRole('button', { name: '만들기' }));
    await pass(1000);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(mockSuggestionOutcomes().at(-1)).toEqual({
      suggestionId: MOCK_SUGGESTION_ID,
      outcome: 'confirmed',
      questId: 'made-민준이랑 점심',
    });
  });
});

describe('a tap on a suggested route', () => {
  it('closes the chat and draws the walking route to the Place', async () => {
    jest.spyOn(apiClient, 'getChatSuggestion').mockResolvedValue({
      id: 'route-1',
      text: '다음 수업 가는 길',
      reason: '14:00 자료구조 · 제1공학관',
      action: { type: 'route', placeId: 'place-301', name: '제1공학관' },
    });
    const walk = jest.spyOn(apiClient, 'findWalkingRoute');
    const user = await openChat();

    await user.press(screen.getByRole('button', { name: '다음 수업 가는 길' }));
    await pass(500);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(toast()).toHaveTextContent('제1공학관까지 길 안내');
    expect(walk).toHaveBeenLastCalledWith(ON_CAMPUS, PLACE_301);
    expect(mockSuggestionOutcomes()).toEqual([{ suggestionId: 'route-1', outcome: 'accepted' }]);
  });
});

describe('no grey suggestion', () => {
  it.each([
    ['when the main server has none', 'EXPO_PUBLIC_MOCK_EMPTY'],
    ['when it cannot be had', 'EXPO_PUBLIC_MOCK_FAIL'],
  ] as const)('is shown %s, and the chat is as it was', async (_case, setting) => {
    process.env[setting] = 'getChatSuggestion';

    await openChat();

    expect(screen.queryByTestId('chat-suggestion')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', PLACEHOLDER);
    expect(screen.getByRole('button', { name: '식사 메뉴 추천' })).toBeVisible();
  });
});
