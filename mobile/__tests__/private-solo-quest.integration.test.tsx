/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { answer, toast } from './support/room';

// The user (2026-11-28): "왜 비공개로 하면 반드시 친구를 추가해야해? 비공개 솔로 퀘스트를 만들고 싶을 수도 있잖아." and
// "결국 퀘스트인데 혼자 하는 todo처럼 쓸 수도 있으니". Under 비공개 친구 초대 is not asked for; with nobody invited the
// form makes a Quest taken alone (P06 ticket 67), against the mocks.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('파티 만들기 under 비공개 with nobody invited', () => {
  it('asks for no Friend and no 인원, and its button is 퀘스트 만들기', async () => {
    const user = await openAt('/party-form');

    await user.press(screen.getByRole('radio', { name: '비공개' }));

    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '인원 늘리기' })).toBeNull();
    expect(screen.getByRole('button', { name: '친구 초대 고르기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '퀘스트 만들기' })).toBeVisible();
  });

  it('makes a Quest taken alone, Closed and for one, says so, and shows the Quest list', async () => {
    const making = jest.spyOn(apiClient, 'makeQuest');
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('radio', { name: '비공개' }));
    await user.type(screen.getByLabelText('제목'), '혼자 시험 공부');

    await answer(user, '퀘스트 만들기');
    await pass(1000);

    expect(screen.queryByText('초대할 친구를 골라 주세요')).toBeNull();
    expect(making).toHaveBeenCalledWith(
      expect.objectContaining({ title: '혼자 시험 공부', takenAlone: true, capacity: 1, joinPolicy: 'closed' }),
      expect.any(String),
    );
    expect(toast()).toHaveTextContent('퀘스트를 만들었어요');
    expect(shownAddress()).toBe('/quests');
  });
});

describe('파티 만들기 under 비공개 with a Friend chosen', () => {
  it('is a 비공개 파티 as before: 인원 and 파티 만들기, and nothing taken alone', async () => {
    const making = jest.spyOn(apiClient, 'makeQuest');
    const user = await openAt('/party-form?friendId=f1');

    expect(screen.getByRole('button', { name: '인원 늘리기' })).toBeVisible();
    await user.type(screen.getByLabelText('제목'), '저녁 같이');
    await answer(user, '파티 만들기');
    await pass(1000);

    expect(making).toHaveBeenCalledWith(expect.not.objectContaining({ takenAlone: true }), expect.any(String));
    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 1명에게 초대 요청');
  });
});
