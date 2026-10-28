/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen } from './support/app';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// The mock's taught words: the mock Assistant reads 중도 through the User's alias, and 내가 가르친 말 lists it with
// 민준 for 김민준.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const LINE = '중도 → 중앙도서관으로 찾았어요';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function say(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

describe('the mock Assistant asked about 중도', () => {
  it('reads it through the alias, and reads it so no more after 아니에요', async () => {
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));

    await say(user, '중도에서 내일 점심 모집해줘');
    expect(screen.getByText(LINE)).toBeVisible();

    await user.press(screen.getByRole('button', { name: '중도 → 중앙도서관 아니에요' }));
    await pass(500);
    expect(screen.queryByText(LINE)).toBeNull();

    await say(user, '중도 말고 다른 데서도 모집해줘');
    expect(screen.getAllByTestId('assistant-bubble')).toHaveLength(2);
    expect(screen.queryByText(LINE)).toBeNull();
  });
});

describe('내가 가르친 말 in the mock', () => {
  it('lists the two words, the latest used first, and deletes one', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '내가 가르친 말' }));
    await pass(500);

    expect(screen.getAllByText(/ → /u).map((row) => String(row.props.children))).toEqual([
      '중도 → 중앙도서관',
      '민준 → 김민준',
    ]);

    await user.press(screen.getByRole('button', { name: '민준 → 김민준 지우기' }));
    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(1000);

    expect(screen.getAllByText(/ → /u).map((row) => String(row.props.children))).toEqual(['중도 → 중앙도서관']);
  });
});
