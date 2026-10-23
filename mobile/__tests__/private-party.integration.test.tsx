/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass, screen, shownAddress } from './support/app';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { answer, toast } from './support/room';

// A plan with a Friend is a 비공개 파티: the `PartyAppt` frame, 파티 만들기 opened from a Friend's card or panel, against
// the mocks. The Meetup it replaces was retired in Iteration 2, and nothing of it is shown.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openFromPanel(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
  await user.press(screen.getByRole('button', { name: '김민준님과 파티 만들기' }));
  await pass(500);
  return user;
}

// 파티 만들기 as 비공개, with 김민준 chosen under 친구 초대.
function expectPresetToMinJun(): void {
  expect(shownAddress()).toBe('/party-form?friendId=f1');
  expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '비공개' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: '김민준' })).toBeChecked();
  expect(screen.getByText('1명에게 요청')).toBeVisible();
}

describe('파티 만들기 from a Friend', () => {
  it("opens from 파티 만들기 on a Friend's card as 비공개 with the Friend invited", async () => {
    const user = await openMain();
    await press(user, FRIEND);

    await press(user, '파티 만들기');
    await pass(500);

    expectPresetToMinJun();
  });

  it("opens from the Friend panel's button, which closes the panel, as 비공개 with the Friend invited", async () => {
    await openFromPanel();

    expectPresetToMinJun();
    expect(screen.queryByRole('header', { name: /^친구/u })).toBeNull();
  });

  it('makes the 비공개 파티 once it has a title, and invites the Friend', async () => {
    const user = await openFromPanel();
    expect(screen.getAllByRole('button', { name: '파티 만들기' }).at(-1)).toBeDisabled();

    await user.type(screen.getByLabelText('제목'), '저녁 같이');
    await answer(user, '파티 만들기');
    // The mock answers the making, then the invitation.
    await pass(1000);

    expect(toast()).toHaveTextContent('비공개 파티를 만들었어요 · 1명에게 초대 요청');
  });
});

describe('what waits for the User', () => {
  it('lists under 초대 the invitations into Quests only', async () => {
    await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 1')).toBeVisible();
    expect(screen.getByText('물리 실험 보고서')).toBeVisible();
    // The mocked time and place, as `PartyInvites` draws them; the frame's invitation names no companion.
    expect(screen.getByText('10월 3일 (토) 14:00 · 중앙도서관 (62동)')).toBeVisible();
    expect(screen.queryByText('학관 점심')).toBeNull();
    expect(screen.queryByText(/보낸 초대/u)).toBeNull();
  });

  it('shows in 알림 no invitation but the Quest invitation', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
    await user.press(screen.getByRole('button', { name: /^알림/u }));
    await pass(500);

    const invitations = screen.getAllByRole('button', { name: /파티 초대/u });
    expect(invitations.map((row) => String(row.props.accessibilityLabel))).toEqual([
      '윤태오님의 파티 초대 · 물리 실험 보고서',
    ]);
  });
});

describe("the mock's 비공개 파티 with 김민준", () => {
  it('still opens its room', async () => {
    await openAt('/room/q-dinner');

    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
  });
});
