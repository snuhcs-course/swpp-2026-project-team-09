/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { within } from '@testing-library/react-native';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { answer, toast } from './support/room';

// 찾기, 전체 파티 and 파티 모집글 against the mocks, which show every mocked part: official recruiting, photos, tags,
// faces, hiding a post and the people looking for company (P06 ticket 03). The mock's clock stands at the frame's
// Thursday, 1 October 2026, 13:37.

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
  return within(screen.getByLabelText(title));
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
    expect(await AsyncStorage.getItem('snunow.joined-official')).toBe('["official-running"]');
  });
});

describe('+ on the banner', () => {
  it('opens 전체 파티 at 공식', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '공식 모집 전체 보기' }));
    await pass(500);

    expect(shownAddress()).toBe('/boards?tab=official');
    expect(screen.getByRole('tab', { name: '공식' })).toBeSelected();
    const list = within(screen.getByLabelText('공식 모집'));
    expect(list.getByText('[N]명 모집')).toBeVisible();
    expect(list.getByText('2인 1팀')).toBeVisible();
    expect(list.getByText('[일시] · 행정관 (60동) 앞 잔디광장')).toBeVisible();
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

  it('shows a card’s photo, up to three faces, and how many of them are Friends', async () => {
    await openAt('/party');

    const run = card(RUN);
    expect(run.getByLabelText('사진 · 지난주 버들골 러닝')).toBeVisible();
    expect(run.getAllByRole('image', { name: /^(최유나|서하린|강민재)$/u })).toHaveLength(3);
    expect(run.getByText('최유나 외 2명 · 친구 1명 포함')).toBeVisible();
    expect(card(DINNER).queryByLabelText(/^사진/u)).toBeNull();
    expect(card(DINNER).getByText('백서윤 외 1명')).toBeVisible();
  });

  it('searches the place and the tags as well as the title and the text', async () => {
    const user = await openAt('/party');

    await user.type(screen.getByLabelText('파티 검색'), '관정관');
    expect(screen.getByText(CODING)).toBeVisible();
    expect(screen.queryByText(RUN)).toBeNull();

    await user.clear(screen.getByLabelText('파티 검색'));
    await user.type(screen.getByLabelText('파티 검색'), '#보드게임');
    expect(screen.getByText('보드게임 카페 가실 분')).toBeVisible();
    expect(screen.queryByText(CODING)).toBeNull();
  });

  it('hides a post with 관심 없음, counts the hidden, and keeps them on the phone', async () => {
    const user = await openAt('/party');
    expect(screen.queryByText(/^숨긴 파티/u)).toBeNull();

    await user.press(card(RUN).getByRole('button', { name: '관심 없음' }));
    await pass(500);

    expect(screen.queryByText(RUN)).toBeNull();
    expect(screen.getByText('숨긴 파티 1개 · 다음 추천에 반영할게요')).toBeVisible();
    expect(await AsyncStorage.getItem('snunow.hidden-posts')).toBe('["post-0"]');
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

describe('전체 파티', () => {
  it('opens at 일반, the boards, beside 공식', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('button', { name: '전체 보기' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: '일반' })).toBeSelected();
    expect(screen.getByRole('button', { name: /^취미 게시판 · 모집글/u })).toBeVisible();
    await user.press(screen.getByRole('tab', { name: '공식' }));
    expect(screen.getByRole('button', { name: "가을 축제 2:2 미팅 '만나샤'에서 인연 찾기!" })).toBeVisible();
  });
});

describe('파티 모집글', () => {
  it('shows the photo, the tags, the faces and 추천 이유', async () => {
    await openAt('/post/post-0');

    expect(screen.getByLabelText('사진 · 지난주 버들골 러닝')).toBeVisible();
    expect(screen.getByText('지난주 버들골 러닝')).toBeVisible();
    expect(screen.getAllByText('#러닝')).toHaveLength(2);
    expect(screen.getByText('#운동')).toBeVisible();
    expect(screen.getAllByRole('image', { name: /^(서하린|강민재)$/u })).toHaveLength(2);
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
    // 관악산 아침 등산 is on Sunday at 07:30, a day without classes.
    await openAt('/post/post-24');

    expect(screen.getByText('일요일은 07:30까지 수업이 없어서 비어 있어요.')).toBeVisible();
  });

  it('hides another’s post with 관심 없음 beside 참여하기, and goes back', async () => {
    const user = await openAt('/party');
    await user.press(screen.getByRole('button', { name: `${RUN} 모집글 자세히 보기` }));
    await pass(500);

    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '관심 없음' }));
    await pass(500);

    expect(shownAddress()).toBe('/party');
    expect(screen.queryByText(RUN)).toBeNull();
    expect(screen.getByText('숨긴 파티 1개 · 다음 추천에 반영할게요')).toBeVisible();
  });
});
