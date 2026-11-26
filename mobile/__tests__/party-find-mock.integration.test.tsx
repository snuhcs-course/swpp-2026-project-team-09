/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { cardName, openAt } from './support/party';
import { answer, toast } from './support/room';

// 찾기 and 파티 모집글 against the mocks, which show every mocked part: official recruiting, tags, hiding a post and
// the people looking for company (P06 ticket 03). The stand-in photos, tags and faces stay off the cards and the 모집글
// (ticket 12). The mock's clock stands at the frame's Thursday, 1 October 2026, 13:37.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const RUN = '버들골 저녁 러닝 크루';
const CODING = '알고리즘 코테 스터디';
const DINNER = '샤로수길 저녁 같이 먹어요';

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(cardName(title)));
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the banner of official recruiting', () => {
  it('shows one at a time and turns every 4 seconds until paused', async () => {
    const user = await openAt('/party');
    const banner = within(screen.getByLabelText('공식 모집'));

    expect(banner.getByText('공식 · 서울대 중앙 러닝 동아리')).toBeVisible();
    expect(banner.getByText('서울대 중앙 러닝 동아리\n경찰과 도둑 파티 모집!')).toBeVisible();
    expect(banner.getByText('[일시] · 행정관 앞 잔디광장 · 선착순 [N]명')).toBeVisible();
    expect(banner.getByLabelText('사진 · [잔디광장 사진]')).toBeVisible();
    expect(banner.getByLabelText('1 / 2')).toBeVisible();

    await pass(4000);
    expect(banner.getByText('공식 · 총학생회')).toBeVisible();
    expect(banner.getByLabelText('2 / 2')).toBeVisible();

    await user.press(banner.getByRole('button', { name: '자동 넘김 멈춤' }));
    await pass(8000);
    expect(banner.getByLabelText('2 / 2')).toBeVisible();

    await user.press(banner.getByRole('button', { name: '이전 배너' }));
    expect(banner.getByLabelText('1 / 2')).toBeVisible();
    await user.press(banner.getByRole('button', { name: '다음 배너' }));
    expect(banner.getByLabelText('2 / 2')).toBeVisible();

    await user.press(banner.getByRole('button', { name: '자동 넘김 재생' }));
    await pass(4000);
    expect(banner.getByLabelText('1 / 2')).toBeVisible();
  });

  it('opens the join sheet with a press, and keeps the joining on the phone', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: /^서울대 중앙 러닝 동아리 · /u }));
    expect(screen.getByText('‘서울대 중앙 러닝 동아리 경찰과 도둑 파티 모집!’에 참여할까요?')).toBeVisible();
    expect(screen.getByText('러닝 동아리 주최 ([N]명 모집)')).toBeVisible();
    await answer(user, '참여하기');

    expect(toast()).toHaveTextContent('서울대 중앙 러닝 동아리 경찰과 도둑 파티 모집! 참여 완료');
    expect(await AsyncStorage.getItem('snunow.joined-official:me')).toBe('["official-running"]');
  });
});

describe('the banner’s controls', () => {
  it('have no way to a list of all official recruiting', async () => {
    await openAt('/party');

    expect(screen.queryByRole('button', { name: '공식 모집 전체 보기' })).toBeNull();
  });
});

describe('the banner where nobody sees it', () => {
  it('stops turning while another screen stands above 찾기', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '만들기' }));
    await pass(4500);
    await act(() => {
      router.back();
    });
    await pass(500);

    expect(within(screen.getByLabelText('공식 모집')).getByLabelText('1 / 2')).toBeVisible();
  });

  it('stops turning while the app is in the background', async () => {
    const phone = givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openAt('/party');
    const banner = within(screen.getByLabelText('공식 모집'));

    await phone.goToBackground();
    await pass(4500);
    expect(banner.getByLabelText('1 / 2')).toBeVisible();

    await phone.comeToFront();
    await pass(4000);
    expect(banner.getByLabelText('2 / 2')).toBeVisible();
  });
});

describe('모집 중인 파티', () => {
  it('puts the posts that share the User’s tags first', async () => {
    await openAt('/party');

    const titles = screen
      .getAllByText(new RegExp(`^(${RUN}|${DINNER})$`, 'u'))
      .map(({ props }) => String(props.children));
    // 샤로수길 was posted after 버들골, and shares no tag with the User.
    expect(titles).toEqual([RUN, DINNER]);
  });

  it('shows no photo, faces or tags on a card', async () => {
    await openAt('/party');

    const run = card(RUN);
    expect(run.queryByLabelText(/^사진/u)).toBeNull();
    expect(run.queryAllByRole('image')).toEqual([]);
    expect(run.queryByText('최유나 외 2명 · 친구 1명 포함')).toBeNull();
    expect(run.queryByText('#러닝')).toBeNull();
  });

  it('searches the place and the tags as well as the title and the text', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: '파티 검색' }));

    await user.type(screen.getByLabelText('파티 검색어'), '관정관');
    expect(screen.getByText(CODING)).toBeVisible();
    expect(screen.queryByText(RUN)).toBeNull();

    await user.clear(screen.getByLabelText('파티 검색어'));
    await user.type(screen.getByLabelText('파티 검색어'), '#보드게임');
    expect(screen.getByText('보드게임 카페 가실 분')).toBeVisible();
    expect(screen.queryByText(CODING)).toBeNull();
  });

  it('hides a post with 관심 없음 once asked, and keeps it on the phone', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByLabelText(cardName(RUN)));
    await pass(500);
    await user.press(within(screen.getByLabelText('파티 모집글')).getByRole('button', { name: '관심 없음' }));
    await answer(user, '숨기기');

    expect(screen.queryByText(RUN)).toBeNull();
    expect(screen.queryByText(/^숨긴 파티/u)).toBeNull();
    expect(await AsyncStorage.getItem('snunow.hidden-posts:me')).toBe('["post-0"]');
  });
});

describe('같이 할 사람을 찾는 중', () => {
  it('shows who looks for company, and asks one with 같이 하자고 하기', async () => {
    const user = await openAt('/party');

    const seeker = within(screen.getByLabelText('한도경 · 산업공학과 23'));
    expect(seeker.getByText('산업공학과 23')).toBeVisible();
    expect(seeker.getByText('“이번 주에 볼더링 처음 가보고 싶어요”')).toBeVisible();
    expect(seeker.getByText('#클라이밍')).toBeVisible();
    expect(seeker.getByText('겹치는 빈 시간 · 수 16:00 이후')).toBeVisible();

    await user.press(seeker.getByRole('button', { name: '같이 하자고 하기' }));
    await pass(500);

    expect(toast()).toHaveTextContent('한도경님에게 같이 하자고 했어요');
    expect(
      within(screen.getByLabelText('한도경 · 산업공학과 23')).getByRole('button', { name: '같이 하자고 했어요' }),
    ).toBeDisabled();
  });
});

describe('파티 모집글', () => {
  it('shows 추천 이유, without the stand-in photo, tag badges and faces', async () => {
    await openAt('/post/post-0');

    expect(screen.queryByLabelText(/^사진/u)).toBeNull();
    expect(screen.queryByText('지난주 버들골 러닝')).toBeNull();
    expect(screen.queryByText('#운동')).toBeNull();
    expect(screen.queryAllByRole('image', { name: /^(서하린|강민재)$/u })).toEqual([]);
    const reasons = within(screen.getByLabelText('추천 이유'));
    expect(reasons.getByText('#러닝가 내 관심사와 겹쳐요')).toBeVisible();
    expect(reasons.getByText('오늘 수업이 11:00에 끝나서 19:30에 비어 있어요.')).toBeVisible();
    expect(reasons.getByText('친구 최유나님이 모집했어요.')).toBeVisible();
  });

  it('says when no interest is shared, and leaves out 친구 without a Friend', async () => {
    await openAt('/post/post-3');

    const reasons = within(screen.getByLabelText('추천 이유'));
    expect(reasons.getByText('겹치는 관심사 없음')).toBeVisible();
    expect(reasons.getByText('오늘 수업이 11:00에 끝나서 18:30에 비어 있어요.')).toBeVisible();
    expect(reasons.queryByText('친구')).toBeNull();
  });

  it('names the day when it is neither today nor tomorrow', async () => {
    // 관악산 아침 등산 is on Sunday at 07:30, a day without classes: free all day, not "until" 07:30.
    await openAt('/post/post-24');

    expect(screen.getByText('일요일은 수업이 없는 날이에요.')).toBeVisible();
  });

  it('hides another’s post with 관심 없음 beside 참여하기 once asked, and goes back', async () => {
    const user = await openAt('/party');
    await act(() => {
      router.push('/post/post-0');
    });
    await pass(500);

    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '관심 없음' }));
    await answer(user, '숨기기');

    expect(shownAddress()).toBe('/party');
    expect(screen.queryByText(RUN)).toBeNull();
  });
});
